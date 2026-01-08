export const VERSION = '0.0.1';

// Re-export all types from core/types
export {
  // Chain Alias Types
  type EvmChainAlias,
  type SvmChainAlias,
  type UtxoChainAlias,
  type TvmChainAlias,
  type XrpChainAlias,
  type SubstrateChainAlias,
  type ChainAlias,
  type Ecosystem,
  // Chain Ecosystem Mapping
  CHAIN_ECOSYSTEM_MAP,
  // Balance Types
  type BalanceInfo,
  type NativeBalance,
  type TokenBalance,
  // Chain Config
  type ChainConfig,
  // Transaction Types
  type DecodeFormat,
  type TransactionType,
  type SigningPayload,
  type BroadcastResult,
  // Fee Estimate Types
  type FeeLevel,
  type FeeEstimate,
} from './core/types.js';
