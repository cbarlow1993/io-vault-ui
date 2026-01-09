import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { InvalidTransactionHashError } from './errors.js';

/** Branded type for validated transaction hashes */
declare const TransactionHashBrand: unique symbol;
export type ValidatedTxHash = string & { readonly [TransactionHashBrand]: never };

/**
 * Immutable value object representing a transaction hash on a specific chain.
 *
 * Transaction hashes uniquely identify transactions within their chain.
 * This value object provides type safety and basic validation.
 *
 * @example
 * const txHash = TransactionHash.create('0xabc123...', 'ethereum');
 * txHash.value; // '0xabc123...'
 * txHash.chainAlias; // 'ethereum'
 * txHash.equals(otherHash); // true if same hash and chain
 *
 * @example
 * // Type-safe function signatures
 * function getTransaction(hash: TransactionHash): Promise<Transaction> {
 *   return fetchTx(hash.chainAlias, hash.value);
 * }
 */
export class TransactionHash {
  public readonly value: ValidatedTxHash;

  private constructor(
    hash: string,
    public readonly chainAlias: ChainAlias
  ) {
    this.value = hash as ValidatedTxHash;
    Object.freeze(this);
  }

  /**
   * Create with basic validation
   *
   * @param hash - The transaction hash string
   * @param chainAlias - The chain this transaction belongs to
   * @throws InvalidTransactionHashError if hash is empty or invalid
   */
  static create(hash: string, chainAlias: ChainAlias): TransactionHash {
    if (!hash || typeof hash !== 'string') {
      throw new InvalidTransactionHashError(hash ?? '', 'hash is required');
    }
    const trimmed = hash.trim();
    if (trimmed.length === 0) {
      throw new InvalidTransactionHashError('', 'hash cannot be empty');
    }
    return new TransactionHash(trimmed, chainAlias);
  }

  /**
   * Check equality with another TransactionHash (same hash and chain)
   */
  equals(other: TransactionHash): boolean {
    return this.value === other.value && this.chainAlias === other.chainAlias;
  }

  /**
   * Check if this hash matches a raw string
   */
  matches(hash: string): boolean {
    return this.value === hash.trim();
  }

  /**
   * For database/API usage
   */
  toString(): string {
    return this.value;
  }

  toJSON(): { hash: string; chainAlias: ChainAlias } {
    return {
      hash: this.value,
      chainAlias: this.chainAlias,
    };
  }
}
