// packages/chains/src/svm/provider.ts

import type {
  SvmChainAlias,
  NativeBalance,
  TokenBalance,
  FeeEstimate,
  DecodeFormat,
  TransactionResult,
} from '../core/types.js';
import type {
  IChainProvider,
  NativeTransferParams,
  TokenTransferParams,
  ContractReadParams,
  ContractReadResult,
  ContractCallParams,
  ContractDeployParams,
  DeployedContract,
  UnsignedTransaction,
  RawSolanaTransaction,
  NormalisedTransaction,
} from '../core/interfaces.js';
import { RpcError, ChainError, InvalidAddressError } from '../core/errors.js';
import { type SvmChainConfig, getSvmChainConfig } from './config.js';
import { SvmBalanceFetcher } from './balance.js';
import { UnsignedSvmTransaction, type SvmTransactionData, SYSTEM_PROGRAM_ID } from './transaction-builder.js';
import { SvmTransactionFetcher } from './transaction-fetcher.js';
import { formatUnits, SPL_TOKEN_PROGRAM_ID, validateSolanaAddress } from './utils.js';

// ============ Solana RPC Response Types ============

interface GetLatestBlockhashResult {
  context: { slot: number };
  value: {
    blockhash: string;
    lastValidBlockHeight: number;
  };
}

interface GetFeeResult {
  context: { slot: number };
  value: number | null;
}

interface TokenAccountInfo {
  pubkey: string;
  account: {
    data: {
      parsed: {
        info: {
          mint: string;
          owner: string;
          tokenAmount: {
            amount: string;
            decimals: number;
          };
        };
      };
    };
    owner: string;
  };
}

interface GetTokenAccountsResult {
  context: { slot: number };
  value: TokenAccountInfo[];
}

// ============ SVM Chain Provider ============

export class SvmChainProvider implements IChainProvider {
  readonly config: SvmChainConfig;
  readonly chainAlias: SvmChainAlias;
  private readonly balanceFetcher: SvmBalanceFetcher;
  private readonly transactionFetcher: SvmTransactionFetcher;

  constructor(chainAlias: SvmChainAlias, rpcUrl?: string) {
    this.config = getSvmChainConfig(chainAlias, rpcUrl ? { rpcUrl } : undefined);
    this.chainAlias = chainAlias;
    this.balanceFetcher = new SvmBalanceFetcher(this.config);
    this.transactionFetcher = new SvmTransactionFetcher(
      this.config,
      this.chainAlias,
      this.rpcCall.bind(this)
    );
  }

  // ============ IBalanceFetcher Methods ============

  async getNativeBalance(address: string): Promise<NativeBalance> {
    return this.balanceFetcher.getNativeBalance(address);
  }

  async getTokenBalance(address: string, contractAddress: string): Promise<TokenBalance> {
    return this.balanceFetcher.getTokenBalance(address, contractAddress);
  }

  // ============ ITransactionBuilder Methods ============

  async buildNativeTransfer(params: NativeTransferParams): Promise<UnsignedTransaction> {
    const { from, to, value, overrides } = params;

    // Validate addresses
    if (!validateSolanaAddress(from)) {
      throw new InvalidAddressError(this.chainAlias, from);
    }
    if (!validateSolanaAddress(to)) {
      throw new InvalidAddressError(this.chainAlias, to);
    }

    // Get recent blockhash
    const { blockhash } = await this.getRecentBlockhash();

    // Encode System Program transfer instruction
    // Instruction index 2 = Transfer
    // Data: [2 (u32 LE)] + [amount (u64 LE)]
    const amount = BigInt(value);
    const instructionData = this.encodeSystemTransferInstruction(amount);

    const txData: SvmTransactionData = {
      version: 'legacy',
      recentBlockhash: blockhash,
      feePayer: from,
      instructions: [
        {
          programId: SYSTEM_PROGRAM_ID,
          accounts: [
            { pubkey: from, isSigner: true, isWritable: true },
            { pubkey: to, isSigner: false, isWritable: true },
          ],
          data: instructionData,
        },
      ],
      value,
    };

    const tx = new UnsignedSvmTransaction(this.config, txData);
    return overrides ? tx.rebuild(overrides) : tx;
  }

  async buildTokenTransfer(params: TokenTransferParams): Promise<UnsignedTransaction> {
    const { from, to, contractAddress: mintAddress, value, overrides } = params;

    // Validate addresses
    if (!validateSolanaAddress(from)) {
      throw new InvalidAddressError(this.chainAlias, from);
    }
    if (!validateSolanaAddress(to)) {
      throw new InvalidAddressError(this.chainAlias, to);
    }
    if (!validateSolanaAddress(mintAddress)) {
      throw new InvalidAddressError(this.chainAlias, mintAddress);
    }

    // Get recent blockhash and token accounts in parallel
    const [{ blockhash }, sourceAccounts, destAccounts] = await Promise.all([
      this.getRecentBlockhash(),
      this.getTokenAccountsByOwner(from, mintAddress),
      this.getTokenAccountsByOwner(to, mintAddress),
    ]);

    if (sourceAccounts.length === 0) {
      throw new ChainError(`Source wallet has no token account for mint ${mintAddress}`, this.chainAlias);
    }

    const sourceTokenAccount = sourceAccounts[0]!.pubkey;
    let destTokenAccount: string;

    if (destAccounts.length === 0) {
      // In production, would create associated token account
      // For now, throw an error
      throw new ChainError(`Destination wallet has no token account for mint ${mintAddress}`, this.chainAlias);
    } else {
      destTokenAccount = destAccounts[0]!.pubkey;
    }

    // Encode SPL Token transfer instruction
    // Instruction index 3 = Transfer
    const amount = BigInt(value);
    const instructionData = this.encodeTokenTransferInstruction(amount);

    const txData: SvmTransactionData = {
      version: 'legacy',
      recentBlockhash: blockhash,
      feePayer: from,
      instructions: [
        {
          programId: SPL_TOKEN_PROGRAM_ID,
          accounts: [
            { pubkey: sourceTokenAccount, isSigner: false, isWritable: true },
            { pubkey: destTokenAccount, isSigner: false, isWritable: true },
            { pubkey: from, isSigner: true, isWritable: false },
          ],
          data: instructionData,
        },
      ],
      value: '0', // Token transfers don't send SOL
    };

    const tx = new UnsignedSvmTransaction(this.config, txData);
    return overrides ? tx.rebuild(overrides) : tx;
  }

  decode<F extends DecodeFormat>(
    serialized: string,
    format: F
  ): F extends 'raw' ? RawSolanaTransaction : NormalisedTransaction {
    let txData: SvmTransactionData;
    try {
      txData = JSON.parse(serialized) as SvmTransactionData;
    } catch {
      throw new RpcError('Invalid transaction data: malformed JSON', this.chainAlias);
    }
    const tx = new UnsignedSvmTransaction(this.config, txData);

    if (format === 'raw') {
      return tx.toRaw() as F extends 'raw' ? RawSolanaTransaction : NormalisedTransaction;
    }

    return tx.toNormalised() as F extends 'raw' ? RawSolanaTransaction : NormalisedTransaction;
  }

  async estimateFee(): Promise<FeeEstimate> {
    // Solana has a fixed base fee of 5000 lamports per signature
    // Priority fees can be added via compute unit price
    const baseFee = await this.getBaseFee();

    const slowFee = BigInt(baseFee);
    const standardFee = BigInt(baseFee) * 2n; // Add some priority
    const fastFee = BigInt(baseFee) * 5n; // Higher priority

    const decimals = this.config.nativeCurrency.decimals;
    const symbol = this.config.nativeCurrency.symbol;

    return {
      slow: {
        fee: slowFee.toString(),
        formattedFee: `${formatUnits(slowFee, decimals)} ${symbol}`,
      },
      standard: {
        fee: standardFee.toString(),
        formattedFee: `${formatUnits(standardFee, decimals)} ${symbol}`,
      },
      fast: {
        fee: fastFee.toString(),
        formattedFee: `${formatUnits(fastFee, decimals)} ${symbol}`,
      },
    };
  }

  async estimateGas(_params: ContractCallParams): Promise<string> {
    // Solana doesn't have gas in the same way as EVM
    // Return compute units estimate
    return '200000'; // Default compute unit limit
  }

  // ============ IContractInteraction Methods ============

  async contractRead(_params: ContractReadParams): Promise<ContractReadResult> {
    // Solana programs are invoked differently than EVM contracts
    // This would need to simulate a transaction
    throw new ChainError('contractRead not supported for Solana - use account data fetching instead', this.chainAlias);
  }

  async contractCall(params: ContractCallParams): Promise<UnsignedTransaction> {
    const { from, contractAddress: programId, data, overrides } = params;

    // Validate addresses
    if (!validateSolanaAddress(from)) {
      throw new InvalidAddressError(this.chainAlias, from);
    }
    if (!validateSolanaAddress(programId)) {
      throw new InvalidAddressError(this.chainAlias, programId);
    }

    const { blockhash } = await this.getRecentBlockhash();

    const txData: SvmTransactionData = {
      version: 'legacy',
      recentBlockhash: blockhash,
      feePayer: from,
      instructions: [
        {
          programId,
          accounts: [], // Would need to be provided in params
          data, // Base64 encoded instruction data
        },
      ],
      value: '0',
    };

    const tx = new UnsignedSvmTransaction(this.config, txData);
    return overrides ? tx.rebuild(overrides) : tx;
  }

  async contractDeploy(_params: ContractDeployParams): Promise<DeployedContract> {
    // Solana program deployment is more complex and requires multiple transactions
    throw new ChainError('contractDeploy not supported - use Solana CLI or Anchor for program deployment', this.chainAlias);
  }

  // ============ ITransactionFetcher Methods ============

  async getTransaction(hash: string): Promise<TransactionResult> {
    return this.transactionFetcher.getTransaction(hash);
  }

  // ============ Helper Methods ============

  async getRecentBlockhash(): Promise<{ blockhash: string; lastValidBlockHeight: number }> {
    const result = await this.rpcCall<GetLatestBlockhashResult>('getLatestBlockhash', []);
    return {
      blockhash: result.value.blockhash,
      lastValidBlockHeight: result.value.lastValidBlockHeight,
    };
  }

  private async getBaseFee(): Promise<number> {
    const result = await this.rpcCall<GetFeeResult>('getFeeForMessage', [
      // Minimal encoded message for fee estimation
      'AQABAgIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      { commitment: 'confirmed' },
    ]);
    return result.value ?? 5000; // Default to 5000 lamports
  }

  private async getTokenAccountsByOwner(owner: string, mint: string): Promise<TokenAccountInfo[]> {
    const result = await this.rpcCall<GetTokenAccountsResult>('getTokenAccountsByOwner', [
      owner,
      { mint },
      { encoding: 'jsonParsed' },
    ]);
    return result.value;
  }

  private async rpcCall<T>(method: string, params: unknown[]): Promise<T> {
    const response = await fetch(this.config.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      }),
    });

    if (!response.ok) {
      throw new RpcError(`RPC request failed: ${response.statusText}`, this.chainAlias);
    }

    const json = await response.json();

    if (json.error) {
      throw new RpcError(json.error.message, this.chainAlias, json.error.code);
    }

    return json.result;
  }

  // ============ Instruction Encoding ============

  private encodeSystemTransferInstruction(amount: bigint): string {
    // System Program Transfer instruction:
    // - Instruction index: 2 (u32 LE)
    // - Amount: u64 LE
    const buffer = new ArrayBuffer(12);
    const view = new DataView(buffer);
    view.setUint32(0, 2, true); // instruction index
    view.setBigUint64(4, amount, true); // amount
    return Buffer.from(buffer).toString('base64');
  }

  private encodeTokenTransferInstruction(amount: bigint): string {
    // SPL Token Transfer instruction:
    // - Instruction index: 3 (u8)
    // - Amount: u64 LE
    const buffer = new ArrayBuffer(9);
    const view = new DataView(buffer);
    view.setUint8(0, 3); // instruction index
    view.setBigUint64(1, amount, true); // amount
    return Buffer.from(buffer).toString('base64');
  }
}
