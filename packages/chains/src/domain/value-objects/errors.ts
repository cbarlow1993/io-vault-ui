/**
 * Base error for value object validation failures.
 */
export class ValueObjectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValueObjectError';
  }
}

/**
 * Error for invalid address values
 */
export class InvalidAddressError extends ValueObjectError {
  constructor(
    public readonly address: string,
    public readonly chainAlias?: string,
    public readonly reason?: string
  ) {
    const chainPart = chainAlias ? ` on ${chainAlias}` : '';
    const reasonPart = reason ? ` (${reason})` : '';
    super(`Invalid address: ${address}${chainPart}${reasonPart}`);
    this.name = 'InvalidAddressError';
  }
}

/**
 * Error for invalid transaction hash values
 */
export class InvalidTransactionHashError extends ValueObjectError {
  constructor(
    public readonly hash: string,
    public readonly chainAlias?: string,
    public readonly reason?: string
  ) {
    const chainPart = chainAlias ? ` on ${chainAlias}` : '';
    const reasonPart = reason ? ` (${reason})` : '';
    super(`Invalid transaction hash: ${hash}${chainPart}${reasonPart}`);
    this.name = 'InvalidTransactionHashError';
  }
}
