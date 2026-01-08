// packages/chains/src/core/types.ts

// ============ Chain Alias Types ============

export type EvmChainAlias =
  | 'ethereum'
  | 'polygon'
  | 'arbitrum'
  | 'optimism'
  | 'base'
  | 'avalanche'
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

// ============ Chain Config ============

export interface ChainConfig {
  chainAlias: ChainAlias;
  rpcUrl: string;
  nativeCurrency: { symbol: string; decimals: number };
  chainId?: number;
  supportsEip1559?: boolean;
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
  feeRate?: number;
  utxos?: Array<{ txid: string; vout: number; value: number }>;
}

// TVM (Tron) overrides
export interface TvmTransactionOverrides {
  feeLimit?: number;
  permission_id?: number;
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
