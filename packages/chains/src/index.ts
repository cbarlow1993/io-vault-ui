// packages/chains/src/index.ts
// Core exports
export * from './core/index.js';

// EVM exports
export * from './evm/index.js';

// Public API
export {
  configure,
  getChainProvider,
  getNativeBalance,
  getTokenBalance,
  buildNativeTransfer,
  buildTokenTransfer,
  decodeTransaction,
  parseTransaction,
  estimateFee,
  estimateGas,
  getTransactionCount,
  contractRead,
  contractCall,
  contractDeploy,
  isEvmTransaction,
  isSolanaTransaction,
  isUtxoTransaction,
  isTronTransaction,
  isXrpTransaction,
  type ChainProviderConfig,
} from './api.js';

export const VERSION = '0.0.1';
