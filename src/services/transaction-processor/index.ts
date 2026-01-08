import type { Kysely } from 'kysely';
import {
  type ChainAlias,
  EvmChainAliases,
  SvmChainAliases,
} from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { Database } from '@/src/lib/database/types.js';
import { logger } from '@/utils/powertools.js';
import { ChainFetcherRegistry } from '@/src/services/transaction-processor/chain-fetcher/index.js';
import { ClassifierRegistry } from '@/src/services/transaction-processor/classifier/index.js';
import { TransactionUpserter } from '@/src/services/transaction-processor/upserter.js';
import { TokenMetadataFetcher } from '@/src/services/transaction-processor/token-metadata-fetcher.js';
import type {
  RawTransaction,
  EvmTransactionData,
  SvmTransactionData,
  NormalizedTransaction,
  ProcessResult,
  TokenInfo,
  ClassificationResult,
} from '@/src/services/transaction-processor/types.js';

// Chain type helpers using SDK chain aliases
const evmAliases = Object.values(EvmChainAliases) as string[];
const svmAliases = Object.values(SvmChainAliases) as string[];

function isEvmChain(chainAlias: ChainAlias): boolean {
  return evmAliases.includes(chainAlias);
}

function isSvmChain(chainAlias: ChainAlias): boolean {
  return svmAliases.includes(chainAlias);
}

// Re-export all types
export * from '@/src/services/transaction-processor/types.js';

// Re-export components
export { ChainFetcherRegistry } from '@/src/services/transaction-processor/chain-fetcher/index.js';
export { ClassifierRegistry } from '@/src/services/transaction-processor/classifier/index.js';
export { TransactionUpserter } from '@/src/services/transaction-processor/upserter.js';
export { TokenMetadataFetcher } from '@/src/services/transaction-processor/token-metadata-fetcher.js';

/**
 * Validates an EVM transaction hash format.
 * EVM tx hashes are 66 characters (0x + 64 hex chars).
 */
function isValidEvmTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Validates a Solana transaction signature format.
 * Solana signatures are base58 encoded, typically 87-88 characters.
 */
function isValidSolanaTxSignature(signature: string): boolean {
  // Base58 alphabet: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
  return /^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(signature);
}

/**
 * Validates transaction hash format based on chain type.
 */
function validateTxHashFormat(chain: ChainAlias, txHash: string): void {
  if (isEvmChain(chain)) {
    if (!isValidEvmTxHash(txHash)) {
      throw new Error(`Invalid EVM transaction hash format: ${txHash}`);
    }
  } else if (isSvmChain(chain)) {
    if (!isValidSolanaTxSignature(txHash)) {
      throw new Error(`Invalid Solana transaction signature format: ${txHash}`);
    }
  }
  // For unknown chains, skip validation (handled by fetcher)
}

export interface TransactionProcessorConfig {
  evmRpcUrls: Record<string, string>;
  svmRpcUrls: Record<string, string>;
  novesApiKey?: string;
  db: Kysely<Database>;
}

/**
 * Main orchestrator for processing transactions.
 *
 * Ties together:
 * - ChainFetcherRegistry: Fetches raw transaction data from chain
 * - ClassifierRegistry: Classifies transactions and parses transfers
 * - TokenMetadataFetcher: Fetches token metadata for discovered tokens
 * - TransactionUpserter: Persists normalized transaction to database
 */
export class TransactionProcessor {
  private readonly chainFetcher: ChainFetcherRegistry;
  private readonly classifier: ClassifierRegistry;
  private readonly upserter: TransactionUpserter;
  private readonly tokenFetcher: TokenMetadataFetcher;

  constructor(config: TransactionProcessorConfig) {
    this.chainFetcher = new ChainFetcherRegistry({
      evmRpcUrls: config.evmRpcUrls,
      svmRpcUrls: config.svmRpcUrls,
    });

    this.classifier = new ClassifierRegistry({
      novesApiKey: config.novesApiKey,
    });

    this.upserter = new TransactionUpserter(config.db);

    this.tokenFetcher = new TokenMetadataFetcher({
      rpcUrls: config.evmRpcUrls,
    });
  }

  /**
   * Processes a transaction end-to-end.
   *
   * @param chainAlias - The chain alias (e.g., "ethereum", "polygon", "solana")
   * @param txHash - The transaction hash
   * @param forAddress - Optional address that triggered this processing (for linking in address_transactions)
   * @returns The processing result with transaction ID and classification info
   */
  async process(chainAlias: ChainAlias, txHash: string, forAddress?: string): Promise<ProcessResult> {
    // Validate required parameters
    if (!chainAlias?.trim() || !txHash?.trim()) {
      throw new Error('chainAlias and txHash are required');
    }

    // Validate txHash format for the chain type
    validateTxHashFormat(chainAlias, txHash.trim());

    // 2. Fetch raw transaction from chain
    const rawTx = await this.chainFetcher.fetch(chainAlias, txHash);

    // 3. Classify the transaction
    const defaultPerspective =
      rawTx.type === 'evm' ? rawTx.from : rawTx.instructions[0]?.accounts[0] ?? '';
    const classification = await this.classifier.classify(rawTx, {
      perspectiveAddress: forAddress ?? defaultPerspective,
      chainAlias,
    });

    // 4. Extract token addresses from transfers and fetch metadata
    const tokenAddresses = this.extractTokenAddresses(classification);
    const tokens = await this.fetchTokenMetadata(chainAlias, tokenAddresses);

    // 5. Normalize raw transaction
    const normalized = this.normalizeTransaction(rawTx, chainAlias);

    // 6. Upsert to database (with address linking if provided)
    return this.upserter.upsert(normalized, classification, tokens, { forAddress });
  }

  /**
   * Extracts unique token addresses from classification transfers.
   */
  private extractTokenAddresses(classification: ClassificationResult): string[] {
    const addresses = new Set<string>();

    for (const transfer of classification.transfers) {
      if (transfer.type === 'token' && transfer.token?.address) {
        addresses.add(transfer.token.address.toLowerCase());
      }
    }

    return Array.from(addresses);
  }

  /**
   * Fetches token metadata for the given addresses.
   * Continues processing even if individual token fetches fail.
   *
   * @param chainAlias - The chain alias (e.g., 'ethereum', 'polygon')
   * @param addresses - The token contract addresses
   */
  private async fetchTokenMetadata(
    chainAlias: ChainAlias,
    addresses: string[]
  ): Promise<TokenInfo[]> {
    const tokens: TokenInfo[] = [];

    for (const address of addresses) {
      try {
        const metadata = await this.tokenFetcher.fetch(chainAlias, address);
        tokens.push({
          address: metadata.address,
          name: metadata.name,
          symbol: metadata.symbol,
          decimals: metadata.decimals,
        });
      } catch (error) {
        // Soft fail - continue processing without this token's metadata
        logger.warn('Failed to fetch token metadata', { address, error });
      }
    }

    return tokens;
  }

  /**
   * Normalizes a raw transaction to the standard format.
   */
  private normalizeTransaction(
    rawTx: RawTransaction,
    chainAlias: ChainAlias
  ): NormalizedTransaction {
    if (rawTx.type === 'evm') {
      return this.normalizeEvmTransaction(rawTx, chainAlias);
    } else if (rawTx.type === 'svm') {
      return this.normalizeSvmTransaction(rawTx, chainAlias);
    }

    throw new Error(`Unsupported transaction type: ${(rawTx as any).type}`);
  }

  /**
   * Normalizes an EVM transaction.
   */
  private normalizeEvmTransaction(
    rawTx: EvmTransactionData,
    chainAlias: ChainAlias
  ): NormalizedTransaction {
    // Calculate fee: gasUsed * gasPrice
    const gasUsed = BigInt(rawTx.gasUsed);
    const gasPrice = BigInt(rawTx.gasPrice);
    const fee = (gasUsed * gasPrice).toString();

    return {
      chainAlias,
      txHash: rawTx.hash,
      blockNumber: rawTx.blockNumber.toString(),
      blockHash: rawTx.blockHash,
      timestamp: rawTx.timestamp,
      from: rawTx.from,
      to: rawTx.to,
      value: rawTx.value,
      fee,
      status: rawTx.status,
    };
  }

  /**
   * Normalizes an SVM (Solana) transaction.
   */
  private normalizeSvmTransaction(
    rawTx: SvmTransactionData,
    chainAlias: ChainAlias
  ): NormalizedTransaction {
    // Validate that transaction has instructions
    if (!rawTx.instructions || rawTx.instructions.length === 0) {
      throw new Error('Invalid SVM transaction: no instructions found');
    }

    // For Solana, there's no single from/to - use first accounts from instructions
    const firstInstruction = rawTx.instructions[0];
    const from = firstInstruction?.accounts[0] ?? '';
    const to = firstInstruction?.accounts[1] ?? null;

    // Calculate native value transfer from balance changes
    const value = this.calculateSvmValueTransfer(rawTx);

    return {
      chainAlias,
      txHash: rawTx.signature,
      blockNumber: rawTx.slot.toString(),
      blockHash: '', // Solana doesn't have block hash in the same way
      timestamp: new Date(rawTx.blockTime * 1000),
      from,
      to,
      value,
      fee: rawTx.fee.toString(),
      status: rawTx.status,
    };
  }

  /**
   * Calculates the native value transfer for an SVM transaction.
   * Uses BigInt to avoid precision loss with large Solana balances.
   */
  private calculateSvmValueTransfer(rawTx: SvmTransactionData): string {
    if (rawTx.preBalances.length === 0 || rawTx.postBalances.length === 0) {
      return '0';
    }

    // Calculate net balance change using BigInt to avoid precision loss
    // Solana balances can exceed Number.MAX_SAFE_INTEGER
    const preTotal = rawTx.preBalances.reduce((sum, bal) => sum + BigInt(bal), 0n);
    const postTotal = rawTx.postBalances.reduce((sum, bal) => sum + BigInt(bal), 0n);
    const fee = BigInt(rawTx.fee);

    // The difference minus fee is the value transfer
    const diff = preTotal - postTotal - fee;
    const change = diff < 0n ? -diff : diff;
    return change.toString();
  }
}
