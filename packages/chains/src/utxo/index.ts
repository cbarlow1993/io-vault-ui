// packages/chains/src/utxo/index.ts

// Provider
export { UtxoChainProvider, type UtxoNativeTransferParams } from './provider.js';

// Config
export {
  UTXO_CHAIN_CONFIGS,
  getUtxoChainConfig,
  isValidUtxoChainAlias,
  type UtxoChainConfig,
} from './config.js';

// Balance
export { UtxoBalanceFetcher } from './balance.js';

// Blockbook Client
export {
  BlockbookClient,
  type UTXO,
  type BlockbookUtxo,
  type BlockbookAddressInfo,
} from './blockbook-client.js';

// PSBT Builder
export {
  PsbtBuilder,
  getScriptTypeFromAddress,
  addressToScriptPubKey,
  type ScriptType,
  type InputMetadata,
  type SighashData,
} from './psbt-builder.js';

// Signature Applier
export {
  SignatureApplier,
  validateSignature,
  fromDER,
} from './signature-applier.js';

// Transaction
export {
  UnsignedUtxoTransaction,
  selectUtxos,
  estimateTransactionSize,
  type UtxoTransactionData,
  type UtxoSelectionResult,
} from './transaction-builder.js';

export {
  SignedUtxoTransaction,
  fromFinalizedPsbtHex,
  fromFinalizedPsbtBase64,
} from './signed-transaction.js';

export { UtxoTransactionFetcher } from './transaction-fetcher.js';

// Errors
export {
  UtxoSelectionError,
  SignatureError,
  PsbtError,
  BlockbookError,
  UnsupportedAddressTypeError,
} from './errors.js';

// Utils
export {
  formatSatoshis,
  parseSatoshis,
} from './utils.js';
