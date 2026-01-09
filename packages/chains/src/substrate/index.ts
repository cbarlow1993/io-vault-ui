// packages/chains/src/substrate/index.ts

// Configuration
export { getSubstrateChainConfig, isSubstrateChainAlias, getSubstrateChainAliases } from './config.js';
export type { SubstrateChainConfig } from './config.js';

// Balance fetching
export { SubstrateBalanceFetcher } from './balance.js';
export type { SubstrateAccountInfo, SubstrateBalance } from './balance.js';

// Transaction building
export {
  SubstrateTransactionBuilder,
  SignedSubstrateTransaction,
  buildSubstrateTransfer,
  buildSubstrateTransferAllowDeath,
} from './transaction-builder.js';
export type { SubstrateTransaction } from './transaction-builder.js';

// Provider
export { SubstrateChainProvider, createSubstrateProvider } from './provider.js';

// Utilities
export {
  encodeAddress,
  decodeAddress,
  isValidSubstrateAddress,
  formatPlanck,
  parsePlanck,
  encodeCompact,
  decodeCompact,
  hexToBytes,
  bytesToHex,
  encodeBase58,
  decodeBase58,
  SS58_PREFIX,
  SUBSTRATE_DECIMALS,
  SUBSTRATE_TRANSACTION_TYPES,
  BITTENSOR_METHOD_IDS,
} from './utils.js';
