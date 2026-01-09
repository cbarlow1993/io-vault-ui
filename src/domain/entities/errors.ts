/**
 * Base error for entity validation failures.
 */
export class EntityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EntityError';
  }
}

/**
 * Error for invalid token data
 */
export class InvalidTokenError extends EntityError {
  constructor(
    public readonly reason: string,
    public readonly tokenAddress?: string | null
  ) {
    super(`Invalid token${tokenAddress ? ` (${tokenAddress})` : ''}: ${reason}`);
    this.name = 'InvalidTokenError';
  }
}

/**
 * Error for invalid balance data
 */
export class InvalidBalanceError extends EntityError {
  constructor(
    public readonly reason: string,
    public readonly tokenAddress?: string | null
  ) {
    super(`Invalid balance${tokenAddress ? ` for ${tokenAddress}` : ''}: ${reason}`);
    this.name = 'InvalidBalanceError';
  }
}

/**
 * Error for invalid transaction data
 */
export class InvalidTransactionError extends EntityError {
  constructor(
    public readonly reason: string,
    public readonly hash?: string
  ) {
    super(`Invalid transaction${hash ? ` (${hash})` : ''}: ${reason}`);
    this.name = 'InvalidTransactionError';
  }
}

/**
 * Error for invalid transfer data
 */
export class InvalidTransferError extends EntityError {
  constructor(public readonly reason: string) {
    super(`Invalid transfer: ${reason}`);
    this.name = 'InvalidTransferError';
  }
}

/**
 * Error for invalid classification data
 */
export class InvalidClassificationError extends EntityError {
  constructor(public readonly reason: string) {
    super(`Invalid classification: ${reason}`);
    this.name = 'InvalidClassificationError';
  }
}
