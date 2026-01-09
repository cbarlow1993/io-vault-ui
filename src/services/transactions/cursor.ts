import { TransactionCursor } from '@/src/domain/value-objects/index.js';

/**
 * Encode a timestamp and transaction ID into a pagination cursor.
 *
 * @deprecated Use TransactionCursor.create().encode() directly
 * @param timestamp - The transaction timestamp
 * @param txId - The transaction UUID
 * @returns base64url-encoded cursor string
 */
export function encodeCursor(timestamp: Date, txId: string): string {
  return TransactionCursor.create(timestamp, txId).encode();
}

/**
 * Decode a pagination cursor back to timestamp and transaction ID.
 *
 * @deprecated Use TransactionCursor.decode() directly
 * @param cursor - The base64url-encoded cursor string
 * @returns Object with timestamp and txId
 * @throws Error if cursor is invalid
 */
export function decodeCursor(cursor: string): { timestamp: Date; txId: string } {
  const decoded = TransactionCursor.decode(cursor);
  return { timestamp: decoded.timestamp, txId: decoded.transactionId };
}
