import { ValueObjectError } from './errors.js';

/**
 * Error for invalid cursor values
 */
export class InvalidCursorError extends ValueObjectError {
  constructor(
    public readonly cursor: string,
    reason?: string
  ) {
    super(`Invalid cursor: ${cursor}${reason ? ` (${reason})` : ''}`);
    this.name = 'InvalidCursorError';
  }
}

/**
 * Internal cursor data structure for JSON serialization
 */
interface CursorData {
  ts: number; // Unix timestamp in ms
  id: string; // Transaction UUID
}

/**
 * Immutable value object representing a pagination cursor for transactions.
 *
 * Encapsulates the encoding/decoding logic for keyset pagination cursors
 * that contain a timestamp and transaction ID for stable ordering.
 *
 * @example
 * // Create a cursor
 * const cursor = TransactionCursor.create(new Date(), 'tx-uuid-123');
 *
 * // Encode for API response
 * const encoded = cursor.encode(); // base64url string
 *
 * // Decode from API request
 * const decoded = TransactionCursor.decode(encoded);
 *
 * // Compare cursors for ordering
 * if (cursor1.compare(cursor2) < 0) {
 *   console.log('cursor1 comes before cursor2');
 * }
 */
export class TransactionCursor {
  public readonly timestamp: Date;
  public readonly transactionId: string;

  private constructor(timestamp: Date, transactionId: string) {
    // Create defensive copy of the Date
    this.timestamp = new Date(timestamp.getTime());
    this.transactionId = transactionId;
    Object.freeze(this);
  }

  /**
   * Create a TransactionCursor from timestamp and transaction ID.
   *
   * @param timestamp - The transaction timestamp
   * @param transactionId - The transaction's unique identifier
   * @throws InvalidCursorError if timestamp is invalid or transactionId is empty
   */
  static create(timestamp: Date, transactionId: string): TransactionCursor {
    // Validate timestamp
    if (!(timestamp instanceof Date) || isNaN(timestamp.getTime())) {
      throw new InvalidCursorError('', 'invalid timestamp');
    }

    // Validate transaction ID
    if (!transactionId || typeof transactionId !== 'string') {
      throw new InvalidCursorError('', 'transaction ID is required');
    }

    const trimmedId = transactionId.trim();
    if (trimmedId.length === 0) {
      throw new InvalidCursorError('', 'transaction ID cannot be empty');
    }

    return new TransactionCursor(timestamp, trimmedId);
  }

  /**
   * Decode a base64url-encoded cursor string.
   *
   * @param cursor - The base64url-encoded cursor string
   * @throws InvalidCursorError if the cursor is invalid
   */
  static decode(cursor: string): TransactionCursor {
    if (!cursor || typeof cursor !== 'string' || cursor.trim().length === 0) {
      throw new InvalidCursorError(cursor ?? '', 'cursor is required');
    }

    try {
      const jsonString = Buffer.from(cursor, 'base64url').toString();
      const data: CursorData = JSON.parse(jsonString);

      // Validate required fields and types
      if (typeof data.ts !== 'number') {
        throw new InvalidCursorError(cursor, 'invalid cursor format: missing or invalid timestamp');
      }

      if (typeof data.id !== 'string') {
        throw new InvalidCursorError(cursor, 'invalid cursor format: missing or invalid transaction ID');
      }

      return new TransactionCursor(new Date(data.ts), data.id);
    } catch (error) {
      if (error instanceof InvalidCursorError) {
        throw error;
      }
      throw new InvalidCursorError(cursor, 'invalid cursor format');
    }
  }

  /**
   * Encode this cursor to a base64url string.
   *
   * @returns base64url-encoded string representation
   */
  encode(): string {
    const data: CursorData = {
      ts: this.timestamp.getTime(),
      id: this.transactionId,
    };
    return Buffer.from(JSON.stringify(data)).toString('base64url');
  }

  /**
   * Compare this cursor with another for ordering.
   *
   * Cursors are ordered by timestamp first, then by transaction ID
   * for tie-breaking when timestamps are equal.
   *
   * @param other - The cursor to compare against
   * @returns -1 if this cursor comes before other, 1 if after, 0 if equal
   */
  compare(other: TransactionCursor): -1 | 0 | 1 {
    const timeDiff = this.timestamp.getTime() - other.timestamp.getTime();

    if (timeDiff < 0) return -1;
    if (timeDiff > 0) return 1;

    // Timestamps are equal, compare by transaction ID
    if (this.transactionId < other.transactionId) return -1;
    if (this.transactionId > other.transactionId) return 1;

    return 0;
  }

  /**
   * Check equality with another TransactionCursor.
   *
   * @param other - The cursor to compare
   * @returns true if both timestamp and transactionId are equal
   */
  equals(other: TransactionCursor): boolean {
    return (
      this.timestamp.getTime() === other.timestamp.getTime() &&
      this.transactionId === other.transactionId
    );
  }

  /**
   * For debugging and logging.
   */
  toString(): string {
    return `TransactionCursor(${this.timestamp.toISOString()}, ${this.transactionId})`;
  }

  /**
   * For JSON serialization - returns the encoded cursor.
   */
  toJSON(): string {
    return this.encode();
  }
}
