// packages/chains/src/svm/transaction-fetcher.ts

import type { SvmChainAlias } from '../core/types.js';
import type {
  TransactionResult,
  TransactionStatus,
  NormalizedTransactionResult,
  RawSolanaTransactionResult,
  TokenTransferEvent,
  InternalTransaction,
} from '../core/types.js';
import {
  TransactionNotFoundError,
  InvalidTransactionHashError,
} from '../core/errors.js';
import type { SvmChainConfig } from './config.js';
import { validateSolanaAddress, SPL_TOKEN_PROGRAM_ID, SYSTEM_PROGRAM_ID } from './utils.js';

// Base58 alphabet for validation
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

interface SolanaTransactionResponse {
  slot: number;
  blockTime: number | null;
  meta: {
    err: unknown | null;
    fee: number;
    preBalances: number[];
    postBalances: number[];
    innerInstructions: Array<{
      index: number;
      instructions: Array<{
        programIdIndex: number;
        accounts: number[];
        data: string;
      }>;
    }>;
    logMessages: string[];
    preTokenBalances: Array<{
      accountIndex: number;
      mint: string;
      owner: string;
      uiTokenAmount: { amount: string; decimals: number };
    }>;
    postTokenBalances: Array<{
      accountIndex: number;
      mint: string;
      owner: string;
      uiTokenAmount: { amount: string; decimals: number };
    }>;
  };
  transaction: {
    message: {
      accountKeys: string[];
      instructions: Array<{
        programIdIndex: number;
        accounts: number[];
        data: string;
      }>;
      recentBlockhash: string;
    };
    signatures: string[];
  };
}

export class SvmTransactionFetcher {
  constructor(
    private readonly config: SvmChainConfig,
    private readonly chainAlias: SvmChainAlias,
    private readonly rpcCall: <T>(method: string, params: unknown[]) => Promise<T>
  ) {}

  async getTransaction(hash: string): Promise<TransactionResult> {
    // Validate hash format
    this.validateTransactionHash(hash);

    // Fetch transaction
    const transaction = await this.rpcCall<SolanaTransactionResponse | null>(
      'getTransaction',
      [
        hash,
        {
          encoding: 'json',
          maxSupportedTransactionVersion: 0,
        },
      ]
    );

    if (!transaction) {
      throw new TransactionNotFoundError(this.chainAlias, hash);
    }

    // Build raw result
    const raw: RawSolanaTransactionResult = {
      _chain: 'svm',
      slot: transaction.slot,
      blockTime: transaction.blockTime,
      meta: transaction.meta,
      transaction: transaction.transaction,
    };

    // Parse token transfers from balance changes
    const tokenTransfers = this.parseTokenTransfers(transaction);

    // Parse internal transactions from inner instructions
    const internalTransactions = this.parseInternalTransactions(transaction);

    // Build normalized result
    const normalized = this.buildNormalizedResult(
      hash,
      transaction,
      tokenTransfers,
      internalTransactions
    );

    return {
      chainAlias: this.chainAlias,
      raw,
      normalized,
    };
  }

  private validateTransactionHash(hash: string): void {
    // Solana signatures are base58-encoded 64-byte values
    // Typically 87-88 characters
    if (hash.length < 80 || hash.length > 90) {
      throw new InvalidTransactionHashError(
        this.chainAlias,
        hash,
        'must be 87-88 characters'
      );
    }

    // Check for valid base58 characters
    for (const char of hash) {
      if (!BASE58_ALPHABET.includes(char)) {
        throw new InvalidTransactionHashError(
          this.chainAlias,
          hash,
          'must be valid base58'
        );
      }
    }
  }

  private parseTokenTransfers(tx: SolanaTransactionResponse): TokenTransferEvent[] {
    const transfers: TokenTransferEvent[] = [];
    const preBalances = tx.meta.preTokenBalances;
    const postBalances = tx.meta.postTokenBalances;

    // Create a map of account index -> pre balance
    const preBalanceMap = new Map<number, { owner: string; mint: string; amount: string; decimals: number }>();
    for (const balance of preBalances) {
      preBalanceMap.set(balance.accountIndex, {
        owner: balance.owner,
        mint: balance.mint,
        amount: balance.uiTokenAmount.amount,
        decimals: balance.uiTokenAmount.decimals,
      });
    }

    // Compare with post balances to find transfers
    let logIndex = 0;
    for (const postBalance of postBalances) {
      const preBalance = preBalanceMap.get(postBalance.accountIndex);
      const preAmount = BigInt(preBalance?.amount ?? '0');
      const postAmount = BigInt(postBalance.uiTokenAmount.amount);

      if (preAmount !== postAmount) {
        const diff = postAmount - preAmount;

        if (diff > 0n) {
          // This account received tokens
          // Try to find the sender from accounts that lost tokens
          const sender = this.findTokenSender(
            postBalance.mint,
            preBalances,
            postBalances,
            tx.transaction.message.accountKeys
          );

          transfers.push({
            contractAddress: postBalance.mint,
            from: sender || 'unknown',
            to: postBalance.owner,
            value: diff.toString(),
            tokenType: 'spl',
            decimals: postBalance.uiTokenAmount.decimals,
            logIndex: logIndex++,
          });
        }
      }
    }

    return transfers;
  }

  private findTokenSender(
    mint: string,
    preBalances: SolanaTransactionResponse['meta']['preTokenBalances'],
    postBalances: SolanaTransactionResponse['meta']['postTokenBalances'],
    _accountKeys: string[]
  ): string | undefined {
    // Find an account that lost tokens of this mint
    const preBalanceMap = new Map<number, { owner: string; amount: string }>();
    for (const balance of preBalances) {
      if (balance.mint === mint) {
        preBalanceMap.set(balance.accountIndex, {
          owner: balance.owner,
          amount: balance.uiTokenAmount.amount,
        });
      }
    }

    for (const postBalance of postBalances) {
      if (postBalance.mint === mint) {
        const preBalance = preBalanceMap.get(postBalance.accountIndex);
        if (preBalance) {
          const preAmount = BigInt(preBalance.amount);
          const postAmount = BigInt(postBalance.uiTokenAmount.amount);
          if (postAmount < preAmount) {
            return preBalance.owner;
          }
        }
      }
    }

    // Check pre balances that don't appear in post (fully spent)
    for (const [accountIndex, preBalance] of preBalanceMap) {
      const hasPost = postBalances.some(
        (pb) => pb.accountIndex === accountIndex && pb.mint === mint
      );
      if (!hasPost && BigInt(preBalance.amount) > 0n) {
        return preBalance.owner;
      }
    }

    return undefined;
  }

  private parseInternalTransactions(
    tx: SolanaTransactionResponse
  ): InternalTransaction[] {
    const internalTxs: InternalTransaction[] = [];
    const accountKeys = tx.transaction.message.accountKeys;

    let traceIndex = 0;

    // Parse inner instructions
    for (const innerIx of tx.meta.innerInstructions) {
      for (const ix of innerIx.instructions) {
        const programId = accountKeys[ix.programIdIndex];

        // Determine type based on program
        let type: InternalTransaction['type'] = 'call';
        if (programId === SYSTEM_PROGRAM_ID) {
          type = 'call';
        } else if (programId === SPL_TOKEN_PROGRAM_ID) {
          type = 'call';
        }

        // Get from/to from accounts if possible
        const from = ix.accounts.length > 0 ? accountKeys[ix.accounts[0]!] : programId;
        const to = ix.accounts.length > 1 ? accountKeys[ix.accounts[1]!] : null;

        internalTxs.push({
          from: from || 'unknown',
          to: to || null,
          value: '0', // Would need to decode instruction data for actual value
          type,
          input: ix.data,
          traceIndex: traceIndex++,
        });
      }
    }

    return internalTxs;
  }

  private buildNormalizedResult(
    hash: string,
    tx: SolanaTransactionResponse,
    tokenTransfers: TokenTransferEvent[],
    internalTransactions: InternalTransaction[]
  ): NormalizedTransactionResult {
    const accountKeys = tx.transaction.message.accountKeys;

    // Determine status
    const status: TransactionStatus = tx.meta.err ? 'failed' : 'confirmed';

    // Fee payer is first account
    const from = accountKeys[0] || 'unknown';

    // Determine "to" - this is tricky for Solana
    // For simple transfers, it's typically the second writable account
    let to: string | null = null;
    let value = '0';

    // Check for SOL transfers by comparing native balances
    const preBalances = tx.meta.preBalances;
    const postBalances = tx.meta.postBalances;

    for (let i = 1; i < accountKeys.length; i++) {
      const preBalance = preBalances[i] || 0;
      const postBalance = postBalances[i] || 0;
      const diff = postBalance - preBalance;

      if (diff > 0) {
        to = accountKeys[i] || null;
        value = diff.toString();
        break;
      }
    }

    // Calculate fee
    const fee = tx.meta.fee.toString();

    // Timestamp
    const timestamp = tx.blockTime;

    return {
      hash,
      status,
      blockNumber: tx.slot,
      blockHash: null, // Solana uses slots, not block hashes for this purpose
      timestamp,
      from,
      to,
      value,
      fee,
      confirmations: status === 'confirmed' ? 1 : 0,
      finalized: status === 'confirmed',
      tokenTransfers,
      internalTransactions,
      hasFullTokenData: true,
      hasFullInternalData: true, // Solana includes inner instructions
    };
  }
}
