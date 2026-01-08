// packages/chains/src/core/interfaces.ts

import type {
  ChainAlias,
  ChainConfig,
  NativeBalance,
  TokenBalance,
  SigningPayload,
  BroadcastResult,
  TransactionOverrides,
  TransactionType,
  DecodeFormat,
  FeeEstimate,
} from './types.js';

// ============ Normalised Transaction ============

export interface NormalisedTransaction {
  readonly chainAlias: ChainAlias;
  readonly to?: string;
  readonly from?: string;
  readonly value: string;
  readonly formattedValue: string;
  readonly symbol: string;
  readonly type: TransactionType;
  readonly contractAddress?: string;
  readonly tokenId?: string;
  readonly data?: string;
  readonly metadata: {
    readonly isContractDeployment: boolean;
    readonly methodName?: string;
    readonly methodSignature?: string;
    readonly decodedArgs?: Record<string, unknown>;
  };
}

// ============ Signed Transaction ============

export interface SignedTransaction {
  readonly chainAlias: ChainAlias;
  readonly serialized: string;
  readonly hash: string;
  broadcast(rpcUrl?: string): Promise<BroadcastResult>;
}

// ============ Unsigned Transaction ============

export interface UnsignedTransaction {
  readonly chainAlias: ChainAlias;
  readonly raw: unknown;
  readonly serialized: string;
  rebuild(overrides: TransactionOverrides): UnsignedTransaction;
  getSigningPayload(): SigningPayload;
  applySignature(signatures: string[]): SignedTransaction;
  toNormalised(): NormalisedTransaction;
}

// ============ Transfer Parameters ============

export interface NativeTransferParams {
  readonly from: string;
  readonly to: string;
  readonly value: string;
  readonly memo?: string;
}

export interface TokenTransferParams extends NativeTransferParams {
  readonly contractAddress: string;
  readonly decimals?: number;
}

// ============ Contract Interaction Parameters ============

export interface ContractReadParams {
  readonly contractAddress: string;
  readonly abi: readonly unknown[];
  readonly functionName: string;
  readonly args?: readonly unknown[];
}

export interface ContractReadResult<T = unknown> {
  readonly result: T;
  readonly raw: unknown;
}

export interface ContractCallParams extends ContractReadParams {
  readonly from: string;
  readonly value?: string;
}

export interface ContractDeployParams {
  readonly from: string;
  readonly abi: readonly unknown[];
  readonly bytecode: string;
  readonly args?: readonly unknown[];
  readonly value?: string;
}

export interface DeployedContract {
  readonly address: string;
  readonly deploymentTransaction: UnsignedTransaction;
}

// ============ Raw Transaction Types ============

export interface RawEvmTransaction {
  readonly _chain: 'evm';
  readonly to?: string;
  readonly from?: string;
  readonly value?: bigint;
  readonly data?: `0x${string}`;
  readonly nonce?: number;
  readonly gasLimit?: bigint;
  readonly gasPrice?: bigint;
  readonly maxFeePerGas?: bigint;
  readonly maxPriorityFeePerGas?: bigint;
  readonly chainId?: number;
  readonly type?: 0 | 2;
}

export interface RawSolanaTransaction {
  readonly _chain: 'solana';
  readonly recentBlockhash: string;
  readonly feePayer: string;
  readonly instructions: readonly {
    readonly programId: string;
    readonly keys: readonly {
      readonly pubkey: string;
      readonly isSigner: boolean;
      readonly isWritable: boolean;
    }[];
    readonly data: Uint8Array;
  }[];
  readonly nonceInfo?: {
    readonly nonce: string;
    readonly nonceInstruction: unknown;
  };
}

export interface RawUtxoTransaction {
  readonly _chain: 'utxo';
  readonly inputs: readonly {
    readonly txid: string;
    readonly vout: number;
    readonly value: number;
    readonly scriptPubKey?: string;
    readonly sequence?: number;
  }[];
  readonly outputs: readonly {
    readonly address: string;
    readonly value: number;
    readonly script?: string;
  }[];
  readonly locktime?: number;
  readonly version?: number;
}

export interface RawTronTransaction {
  readonly _chain: 'tron';
  readonly txID: string;
  readonly rawData: {
    readonly contract: readonly {
      readonly parameter: {
        readonly value: Record<string, unknown>;
        readonly type_url: string;
      };
      readonly type: string;
    }[];
    readonly ref_block_bytes: string;
    readonly ref_block_hash: string;
    readonly expiration: number;
    readonly timestamp: number;
    readonly fee_limit?: number;
  };
  readonly rawDataHex: string;
}

export interface RawXrpTransaction {
  readonly _chain: 'xrp';
  readonly TransactionType: string;
  readonly Account: string;
  readonly Destination?: string;
  readonly Amount?: string | { currency: string; issuer: string; value: string };
  readonly Fee?: string;
  readonly Sequence?: number;
  readonly LastLedgerSequence?: number;
  readonly SigningPubKey?: string;
  readonly Memos?: readonly {
    readonly Memo: {
      readonly MemoType?: string;
      readonly MemoData?: string;
    };
  }[];
}

export interface RawSubstrateTransaction {
  readonly _chain: 'substrate';
  readonly method: {
    readonly pallet: string;
    readonly name: string;
    readonly args: Record<string, unknown>;
  };
  readonly era?: {
    readonly period: number;
    readonly phase: number;
  };
  readonly nonce?: number;
  readonly tip?: bigint;
  readonly specVersion?: number;
  readonly transactionVersion?: number;
  readonly genesisHash?: string;
  readonly blockHash?: string;
}

// Union of all raw transaction types
export type RawTransaction =
  | RawEvmTransaction
  | RawSolanaTransaction
  | RawUtxoTransaction
  | RawTronTransaction
  | RawXrpTransaction
  | RawSubstrateTransaction;

// ============ Provider Interfaces ============

export interface IBalanceFetcher {
  getNativeBalance(address: string): Promise<NativeBalance>;
  getTokenBalance(address: string, contractAddress: string): Promise<TokenBalance>;
  getTokenBalances(address: string): Promise<TokenBalance[]>;
}

export interface ITransactionBuilder {
  buildNativeTransfer(params: NativeTransferParams): Promise<UnsignedTransaction>;
  buildTokenTransfer(params: TokenTransferParams): Promise<UnsignedTransaction>;
  estimateFee(tx: UnsignedTransaction): Promise<FeeEstimate>;
  decodeTransaction(serialized: string, format?: DecodeFormat): Promise<NormalisedTransaction>;
}

export interface IContractInteraction {
  readContract<T = unknown>(params: ContractReadParams): Promise<ContractReadResult<T>>;
  buildContractCall(params: ContractCallParams): Promise<UnsignedTransaction>;
  buildContractDeploy(params: ContractDeployParams): Promise<DeployedContract>;
}

export interface IChainProvider extends IBalanceFetcher, ITransactionBuilder, IContractInteraction {
  readonly config: ChainConfig;
  readonly chainAlias: ChainAlias;
}
