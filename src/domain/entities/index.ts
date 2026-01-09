/**
 * Domain entities module.
 * Exports all entity aggregates and their supporting value objects.
 */

// Errors
export * from './errors.js';

// Token domain
export {
  TokenClassification,
  type BlockaidResult,
  type CoingeckoResult,
  type HeuristicsResult,
  type RiskLevel,
  type RiskSummary,
  type UserOverride,
  type TokenClassificationData,
} from './token/token-classification.js';

export {
  TokenName,
  type SuspiciousPattern,
} from './token/token-name.js';

export {
  Token,
  type TokenMetadata,
  type CreateTokenData,
  type TokenRow,
} from './token/token.js';

// Balance domain
export {
  SpamAnalysis,
  type SpamAnalysisData,
} from './balance/spam-analysis.js';

export {
  Balance,
  type TokenPrice,
  type NativeAsset,
  type CreateBalanceData,
  type EnrichedBalanceDTO,
} from './balance/balance.js';

// Transaction domain
export {
  TransactionClassification,
  type ClassificationType,
  type ClassificationDirection,
  type ClassificationConfidence,
  type ClassificationSource,
  type ClassificationData,
} from './transaction/classification.js';

export {
  Transfer,
  type TransferType,
  type TransferAsset,
  type CreateTransferData,
} from './transaction/transfer.js';

export {
  Transaction,
  type TransactionStatus,
  type CreateTransactionData,
  type TransactionRow as TransactionEntityRow,
} from './transaction/transaction.js';
