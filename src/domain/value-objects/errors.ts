/**
 * Base error for value object validation failures.
 * Following the pattern from packages/chains/src/core/errors.ts
 */
export class ValueObjectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValueObjectError';
  }
}

/**
 * Error for invalid amount values
 */
export class InvalidAmountError extends ValueObjectError {
  constructor(
    public readonly value: string,
    reason?: string
  ) {
    super(`Invalid amount: ${value}${reason ? ` (${reason})` : ''}`);
    this.name = 'InvalidAmountError';
  }
}

/**
 * Error for invalid address values
 */
export class InvalidAddressError extends ValueObjectError {
  constructor(
    public readonly address: string,
    public readonly chainAlias?: string
  ) {
    super(`Invalid address: ${address}${chainAlias ? ` on ${chainAlias}` : ''}`);
    this.name = 'InvalidAddressError';
  }
}

/**
 * Error for invalid transaction hash values
 */
export class InvalidTransactionHashError extends ValueObjectError {
  constructor(
    public readonly hash: string,
    reason?: string
  ) {
    super(`Invalid transaction hash: ${hash}${reason ? ` (${reason})` : ''}`);
    this.name = 'InvalidTransactionHashError';
  }
}
