/**
 * Transaction Formatter
 *
 * This module provided DynamoDB-specific formatting for transactions.
 * As part of the PostgreSQL migration, this file has been simplified.
 * The old formatTransactionForDynamoDB function is no longer needed.
 */

import type { Transactions } from '@/src/types/transaction.js';

export type WebhookTransactionInput = Transactions.SupportedTransaction & {
  ingestionType: 'webhook' | 'sync' | 'onPutMetadata';
  direction: Transactions.TransactionDirection | undefined;
};

/**
 * @deprecated This function was used for DynamoDB formatting and is no longer needed.
 * Transaction storage will be handled via PostgreSQL with a different schema.
 */
export const formatTransactionForDynamoDB = (
  _input: WebhookTransactionInput
): Record<string, unknown> => {
  // TODO: Replace with PostgreSQL-compatible transaction formatting
  throw new Error('DynamoDB transaction formatting is deprecated - use PostgreSQL');
};
