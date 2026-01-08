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
  chainAlias: ChainAlias;
  hash?: string;
  from?: string;
  to: string | null;
  value: string;
  formattedValue: string;
  symbol: string;
  fee?: {
    value: string;
    formattedValue: string;
    symbol: string;
  };
  type: TransactionType;
  tokenTransfer?: {
    contractAddress: string;
    from: string;
    to: string;
    value: string;
    formattedValue: string;
    symbol: string;
    decimals: number;
    tokenId?: string;
  };
  contractCall?: {
    contractAddress: string;
    method?: string;
    selector?: string;
  };
  data?: string;
  metadata: {
    nonce?: number;
    sequence?: number;
    memo?: string;
    isContractDeployment: boolean;
    inputCount?: number;
    outputCount?: number;
  };
  outputs?: Array<{
    address: string | null;
    value: string;
    formattedValue: string;
  }>;
}

// ============ Transaction Interfaces ============

export interface UnsignedTransaction {
  readonly chainAlias: ChainAlias;
  readonly raw: unknown;
  readonly serialized: string;

  rebuild(overrides: TransactionOverrides): UnsignedTransaction;
  getSigningPayload(): SigningPayload;
  applySignature(signatures: string[]): SignedTransaction;
  toNormalised(): NormalisedTransaction;
}

export interface SignedTransaction {
  readonly chainAlias: ChainAlias;
  readonly serialized: string;
  readonly hash: string;

  broadcast(rpcUrl?: string): Promise<BroadcastResult>;
}

// ============ Transfer Params ============

export interface NativeTransferParams {
  from: string;
  to: string;
  value: string;
  overrides?: TransactionOverrides;
}

export interface TokenTransferParams {
  from: string;
  to: string;
  contractAddress: string;
  value: string;
  overrides?: TransactionOverrides;
}

// ============ Contract Params ============

export interface ContractReadParams {
  contractAddress: string;
  data: string;
  from?: string;
}

export interface ContractReadResult {
  data: string;
}

export interface ContractCallParams {
  from: string;
  contractAddress: string;
  data: string;
  value?: string;
  overrides?: TransactionOverrides;
}

export interface ContractDeployParams {
  from: string;
  bytecode: string;
  constructorArgs?: string;
  value?: string;
  overrides?: TransactionOverrides;
}

export interface DeployedContract {
  transaction: UnsignedTransaction;
  expectedAddress: string;
}

// ============ Raw Transaction Types ============

export interface RawEvmTransaction {
  _chain: 'evm';
  type: 0 | 1 | 2;
  chainId: number;
  nonce: number;
  to: string | null;
  value: string;
  data: string;
  gasLimit: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  accessList?: Array<{ address: string; storageKeys: string[] }>;
  v?: number;
  r?: string;
  s?: string;
}

export interface RawSolanaTransaction {
  _chain: 'svm';
  version: 'legacy' | 0;
  recentBlockhash: string;
  feePayer: string;
  instructions: Array<{
    programId: string;
    accounts: Array<{
      pubkey: string;
      isSigner: boolean;
      isWritable: boolean;
    }>;
    data: string;
  }>;
  signatures?: string[];
}

export interface RawUtxoTransaction {
  _chain: 'utxo';
  version: number;
  locktime: number;
  isSegwit: boolean;
  inputs: Array<{
    txid: string;
    vout: number;
    scriptSig: string;
    sequence: number;
    witness?: string[];
  }>;
  outputs: Array<{
    value: string;
    scriptPubKey: string;
    address?: string;
  }>;
}

export interface RawTronTransaction {
  _chain: 'tvm';
  txID: string;
  rawData: {
    contract: Array<{
      type: string;
      parameter: {
        value: Record<string, unknown>;
        type_url: string;
      };
    }>;
    refBlockBytes: string;
    refBlockHash: string;
    expiration: number;
    timestamp: number;
    feeLimit?: number;
  };
  signature?: string[];
}

export interface RawXrpTransaction {
  _chain: 'xrp';
  TransactionType: string;
  Account: string;
  Destination?: string;
  Amount?: string | { currency: string; issuer: string; value: string };
  Fee: string;
  Sequence: number;
  SigningPubKey?: string;
  TxnSignature?: string;
  Memos?: Array<{ Memo: { MemoType?: string; MemoData?: string } }>;
  DestinationTag?: number;
}

export type RawTransaction =
  | RawEvmTransaction
  | RawSolanaTransaction
  | RawUtxoTransaction
  | RawTronTransaction
  | RawXrpTransaction;

// ============ Provider Interfaces ============

export interface IBalanceFetcher {
  getNativeBalance(address: string): Promise<NativeBalance>;
  getTokenBalance(address: string, contractAddress: string): Promise<TokenBalance>;
}

export interface ITransactionBuilder {
  buildNativeTransfer(params: NativeTransferParams): Promise<UnsignedTransaction>;
  buildTokenTransfer(params: TokenTransferParams): Promise<UnsignedTransaction>;
  decode<F extends DecodeFormat>(
    serialized: string,
    format: F
  ): F extends 'raw' ? RawTransaction : NormalisedTransaction;
  estimateFee(): Promise<FeeEstimate>;
  estimateGas(params: ContractCallParams): Promise<string>;
}

export interface IContractInteraction {
  contractRead(params: ContractReadParams): Promise<ContractReadResult>;
  contractCall(params: ContractCallParams): Promise<UnsignedTransaction>;
  contractDeploy(params: ContractDeployParams): Promise<DeployedContract>;
}

export interface IChainProvider extends IBalanceFetcher, ITransactionBuilder, IContractInteraction {
  readonly config: ChainConfig;
  readonly chainAlias: ChainAlias;
}
