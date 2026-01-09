// packages/chains/src/core/types.ts

// ============ Chain Alias Types ============

export type EvmChainAlias =
  | 'ethereum'
  | 'polygon'
  | 'arbitrum'
  | 'optimism'
  | 'base'
  | 'avalanche'
  | 'fantom'
  | 'bsc';

export type SvmChainAlias = 'solana' | 'solana-devnet';

export type UtxoChainAlias = 'bitcoin' | 'bitcoin-testnet' | 'mnee';

export type TvmChainAlias = 'tron' | 'tron-testnet';

export type XrpChainAlias = 'xrp' | 'xrp-testnet';

export type SubstrateChainAlias = 'bittensor' | 'bittensor-testnet';

export type ChainAlias =
  | EvmChainAlias
  | SvmChainAlias
  | UtxoChainAlias
  | TvmChainAlias
  | XrpChainAlias
  | SubstrateChainAlias;

export type Ecosystem = 'evm' | 'svm' | 'utxo' | 'tvm' | 'xrp' | 'substrate';

// ============ Chain Ecosystem Mapping ============

export const CHAIN_ECOSYSTEM_MAP: Record<ChainAlias, Ecosystem> = {
  ethereum: 'evm',
  polygon: 'evm',
  arbitrum: 'evm',
  optimism: 'evm',
  base: 'evm',
  avalanche: 'evm',
  fantom: 'evm',
  bsc: 'evm',
  solana: 'svm',
  'solana-devnet': 'svm',
  bitcoin: 'utxo',
  'bitcoin-testnet': 'utxo',
  mnee: 'utxo',
  tron: 'tvm',
  'tron-testnet': 'tvm',
  xrp: 'xrp',
  'xrp-testnet': 'xrp',
  bittensor: 'substrate',
  'bittensor-testnet': 'substrate',
} as const;

// ============ Balance Types ============

export interface BalanceInfo {
  balance: string;
  formattedBalance: string;
  symbol: string;
  decimals: number;
}

export interface NativeBalance extends BalanceInfo {
  isNative: true;
}

export interface TokenBalance extends BalanceInfo {
  isNative?: false;
  contractAddress: string;
  name?: string;
  logoUri?: string;
}

// ============ RPC Authentication ============

/**
 * RPC authentication configuration
 * Supports various auth methods used by different RPC providers
 */
export interface RpcAuth {
  /** API key passed in a custom header (e.g., TronGrid, Alchemy) */
  apiKey?: string;
  /** Custom header name for API key (default varies by chain) */
  apiKeyHeader?: string;
  /** Bearer token for Authorization header */
  bearerToken?: string;
  /** Basic auth credentials */
  basicAuth?: { username: string; password: string };
  /** Custom headers to include in all RPC requests */
  headers?: Record<string, string>;
}

// ============ Chain Config ============

export interface ChainConfig {
  chainAlias: ChainAlias;
  rpcUrl: string;
  nativeCurrency: { symbol: string; decimals: number };
  chainId?: number;
  supportsEip1559?: boolean;
  /** RPC authentication configuration */
  auth?: RpcAuth;
}

// ============ Transaction Types ============

export type DecodeFormat = 'raw' | 'normalised';

export type TransactionType =
  | 'native-transfer'
  | 'token-transfer'
  | 'nft-transfer'
  | 'contract-call'
  | 'contract-deployment'
  | 'approval'
  | 'unknown';

export interface SigningPayload {
  chainAlias: ChainAlias;
  data: string[];
  algorithm: 'secp256k1' | 'ed25519';
}

export interface BroadcastResult {
  hash: string;
  success: boolean;
  error?: string;
}

// ============ Fee Estimate Types ============

export interface FeeLevel {
  fee: string;
  formattedFee: string;
}

export interface FeeEstimate {
  slow: FeeLevel;
  standard: FeeLevel;
  fast: FeeLevel;
}

// ============ Transaction Override Types ============

// EVM overrides
export interface EvmTransactionOverrides {
  gasPrice?: bigint;
  gasLimit?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  nonce?: number;
  type?: 0 | 2;
  data?: `0x${string}`;
}

// SVM (Solana) overrides
export interface SvmTransactionOverrides {
  computeUnitPrice?: number;
  computeUnitLimit?: number;
  skipPreflight?: boolean;
  nonceAccount?: string;
}

// UTXO overrides
export interface UtxoTransactionOverrides {
  feeRate?: number; // sat/vB - overrides auto-fetched rate
  absoluteFee?: bigint; // Exact fee in satoshis (takes precedence over feeRate)
  rbf?: boolean; // Enable/disable Replace-By-Fee (BIP125), default: true
  changeAddress?: string; // Custom change address (default: from address)
  utxos?: Array<{
    txid: string;
    vout: number;
    value: bigint;
    scriptPubKey: string;
    address: string;
    confirmations: number;
  }>;
}

// TVM (Tron) overrides
export interface TvmTransactionOverrides {
  feeLimit?: number;
  permissionId?: number;
}

// XRP overrides
export interface XrpTransactionOverrides {
  fee?: string;
  sequence?: number;
  maxLedgerVersionOffset?: number;
}

// Substrate overrides
export interface SubstrateTransactionOverrides {
  tip?: bigint;
  nonce?: number;
  era?: number;
}

// Map ecosystem to its override type
export type EcosystemOverridesMap = {
  evm: EvmTransactionOverrides;
  svm: SvmTransactionOverrides;
  utxo: UtxoTransactionOverrides;
  tvm: TvmTransactionOverrides;
  xrp: XrpTransactionOverrides;
  substrate: SubstrateTransactionOverrides;
};

// Union type for any ecosystem override
export type TransactionOverrides = EcosystemOverridesMap[keyof EcosystemOverridesMap];

// ============ Transaction Result Types (getTransaction) ============

/** Unified transaction status across all chains */
export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

/** Token type identifiers for parsed token transfers */
export type TokenType = 'erc20' | 'erc721' | 'erc1155' | 'spl' | 'trc20' | 'trc721';

/** Token transfer event parsed from transaction logs/data */
export interface TokenTransferEvent {
  contractAddress: string;
  from: string;
  to: string;
  value: string;
  tokenType: TokenType;
  tokenId?: string;
  decimals?: number;
  symbol?: string;
  logIndex: number;
}

/** Internal transaction type */
export type InternalTransactionType =
  | 'call'
  | 'create'
  | 'delegatecall'
  | 'staticcall'
  | 'selfdestruct'
  | 'utxo-input'
  | 'utxo-output';

/** Internal transaction or UTXO input/output */
export interface InternalTransaction {
  from: string;
  to: string | null;
  value: string;
  type: InternalTransactionType;
  input?: string;
  output?: string;
  error?: string;
  traceIndex: number;
}

/** Normalized transaction result - unified format across all chains */
export interface NormalizedTransactionResult {
  hash: string;
  status: TransactionStatus;
  blockNumber: number | null;
  blockHash: string | null;
  timestamp: number | null;
  from: string;
  to: string | null;
  value: string;
  fee: string;
  confirmations: number;
  finalized: boolean;
  tokenTransfers: TokenTransferEvent[];
  internalTransactions: InternalTransaction[];
  hasFullTokenData: boolean;
  hasFullInternalData: boolean;
}

// ============ Raw Transaction Result Types ============

export interface RawEvmTransactionResult {
  _chain: 'evm';
  transaction: {
    hash: string;
    nonce: string;
    blockHash: string | null;
    blockNumber: string | null;
    transactionIndex: string | null;
    from: string;
    to: string | null;
    value: string;
    gasPrice: string;
    gas: string;
    input: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    type: string;
  };
  receipt: {
    transactionHash: string;
    blockHash: string;
    blockNumber: string;
    gasUsed: string;
    effectiveGasPrice: string;
    status: string;
    logs: Array<{
      address: string;
      topics: string[];
      data: string;
      logIndex: string;
    }>;
    contractAddress: string | null;
  };
  trace?: {
    calls?: Array<{
      from: string;
      to: string;
      value: string;
      type: string;
      input: string;
      output?: string;
      error?: string;
    }>;
  };
}

export interface RawSolanaTransactionResult {
  _chain: 'svm';
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

export interface RawUtxoTransactionResult {
  _chain: 'utxo';
  txid: string;
  version: number;
  vin: Array<{
    txid: string;
    vout: number;
    sequence: number;
    addresses: string[];
    value: string;
  }>;
  vout: Array<{
    value: string;
    n: number;
    addresses: string[];
    isAddress: boolean;
  }>;
  blockHash?: string;
  blockHeight?: number;
  confirmations: number;
  blockTime?: number;
  fees: string;
  size: number;
  vsize: number;
}

export interface RawTronTransactionResult {
  _chain: 'tvm';
  transaction: {
    txID: string;
    raw_data: {
      contract: Array<{
        parameter: {
          value: {
            owner_address: string;
            to_address?: string;
            amount?: number;
            contract_address?: string;
            data?: string;
          };
          type_url: string;
        };
        type: string;
      }>;
      ref_block_bytes: string;
      ref_block_hash: string;
      expiration: number;
      timestamp: number;
    };
    raw_data_hex: string;
    signature: string[];
    ret?: Array<{ contractRet: string }>;
  };
  info: {
    id: string;
    blockNumber: number;
    blockTimeStamp: number;
    contractResult: string[];
    receipt: {
      net_fee?: number;
      energy_fee?: number;
      energy_usage_total?: number;
      result?: string;
    };
    log?: Array<{
      address: string;
      topics: string[];
      data: string;
    }>;
    internal_transactions?: Array<{
      caller_address: string;
      transferTo_address: string;
      callValueInfo: Array<{ callValue: number }>;
    }>;
  };
}

export interface RawXrpTransactionResult {
  _chain: 'xrp';
  // TODO: Define XRP transaction result structure
  hash: string;
  result: unknown;
}

export interface RawSubstrateTransactionResult {
  _chain: 'substrate';
  // TODO: Define Substrate transaction result structure
  hash: string;
  result: unknown;
}

export type RawTransactionResult =
  | RawEvmTransactionResult
  | RawSolanaTransactionResult
  | RawUtxoTransactionResult
  | RawTronTransactionResult
  | RawXrpTransactionResult
  | RawSubstrateTransactionResult;

/** Complete transaction result with both raw and normalized formats */
export interface TransactionResult {
  chainAlias: ChainAlias;
  raw: RawTransactionResult;
  normalized: NormalizedTransactionResult;
}
