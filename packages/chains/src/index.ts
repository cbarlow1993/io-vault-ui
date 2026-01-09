// packages/chains/src/index.ts
// Core exports
export * from './core/index.js';

// EVM exports
export * from './evm/index.js';

// SVM (Solana) exports - excluding formatUnits/parseUnits to avoid conflict with EVM
export {
  SvmChainProvider,
  SVM_CHAIN_CONFIGS,
  getSvmChainConfig,
  type SvmChainConfig,
  SvmBalanceFetcher,
  UnsignedSvmTransaction,
  SYSTEM_PROGRAM_ID,
  SignedSvmTransaction,
  SPL_TOKEN_PROGRAM_ID,
  SPL_TOKEN_2022_PROGRAM_ID,
} from './svm/index.js';

// UTXO (Bitcoin) exports
export {
  UtxoChainProvider,
  UtxoBalanceFetcher,
  BlockbookClient,
  PsbtBuilder,
  SignatureApplier,
  UnsignedUtxoTransaction,
  SignedUtxoTransaction,
  UTXO_CHAIN_CONFIGS,
  getUtxoChainConfig,
  isValidUtxoChainAlias,
  getScriptTypeFromAddress,
  selectUtxos,
  estimateTransactionSize,
  formatSatoshis,
  parseSatoshis,
  // Errors
  UtxoSelectionError,
  SignatureError,
  PsbtError,
  BlockbookError,
  UnsupportedAddressTypeError,
  // Types
  type UtxoChainConfig,
  type UTXO,
  type ScriptType,
  type UtxoNativeTransferParams,
  type UtxoTransactionData,
} from './utxo/index.js';

// TVM (Tron) exports
export * from './tvm/index.js';

// XRP and Substrate modules are excluded from build (see tsconfig.json)
// Do not add exports for './xrp/index.js' or './substrate/index.js' until those modules are complete

// Public API
export {
  configure,
  getChainProvider,
  // Provider type guards
  isEvmProvider,
  isSvmProvider,
  isUtxoProvider,
  isTvmProvider,
  isXrpProvider,
  isSubstrateProvider,
  // Raw transaction type guards
  isEvmTransaction,
  isSolanaTransaction,
  isUtxoTransaction,
  isTronTransaction,
  isXrpTransaction,
  isSubstrateTransaction,
  // Transaction result type guards
  isEvmTransactionResult,
  isSolanaTransactionResult,
  isUtxoTransactionResult,
  isTronTransactionResult,
  isXrpTransactionResult,
  isSubstrateTransactionResult,
  // Types
  type ChainProvider,
  type ChainProviderConfig,
} from './api.js';

export const VERSION = '0.0.1';
