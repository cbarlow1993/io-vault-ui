import type { ChainAlias } from '../../core/types.js';
import { InvalidTransactionHashError } from './errors.js';

/** Branded type for normalized (lowercase, trimmed) transaction hashes */
declare const NormalizedTxHashBrand: unique symbol;
export type NormalizedTxHash = string & { readonly [NormalizedTxHashBrand]: never };

/** Branded type for validated transaction hash (backwards compatibility) */
declare const ValidatedTxHashBrand: unique symbol;
export type ValidatedTxHash = string & { readonly [ValidatedTxHashBrand]: never };

/**
 * Immutable value object representing a transaction hash on a specific chain.
 *
 * Consolidates transaction hash normalization logic that was previously scattered
 * throughout the codebase with manual `.toLowerCase()` calls for comparisons.
 *
 * Automatically normalizes hashes to lowercase for consistent comparison
 * while preserving original case for display purposes where needed.
 *
 * @example
 * const hash = TransactionHash.create('0xABC123...DEF', 'ethereum');
 * hash.normalized; // "0xabc123...def"
 * hash.original; // "0xABC123...DEF"
 * hash.equals(otherHash); // true if same normalized hash and chain
 *
 * @example
 * // Use in Maps/Sets
 * const txCache = new Map<string, TransactionData>();
 * txCache.set(hash.forStorage(), data);
 *
 * @example
 * // Quick comparison without creating instance
 * if (TransactionHash.areEqual(hash1, hash2)) { ... }
 */
export class TransactionHash {
  /** Normalized (lowercase, trimmed) hash for consistent comparisons and storage */
  public readonly normalized: NormalizedTxHash;

  /**
   * The validated hash value.
   * @deprecated Use `original` for display or `normalized` for comparisons/storage
   */
  public readonly value: ValidatedTxHash;

  private constructor(
    /** Original hash as provided (after trimming) */
    public readonly original: string,
    /** The chain this transaction belongs to */
    public readonly chainAlias: ChainAlias
  ) {
    this.normalized = original.toLowerCase().trim() as NormalizedTxHash;
    // For backwards compatibility, value equals original
    this.value = original as ValidatedTxHash;
    Object.freeze(this);
  }

  /**
   * Create a transaction hash with validation
   *
   * @param hash - The transaction hash string
   * @param chainAlias - The chain this transaction belongs to
   * @throws InvalidTransactionHashError if hash is empty or invalid
   */
  static create(hash: string, chainAlias: ChainAlias): TransactionHash {
    if (!hash || typeof hash !== 'string') {
      throw new InvalidTransactionHashError(hash ?? '', chainAlias);
    }
    const trimmed = hash.trim();
    if (trimmed.length === 0) {
      throw new InvalidTransactionHashError('', chainAlias);
    }

    return new TransactionHash(trimmed, chainAlias);
  }

  /**
   * Create from already-normalized hash (trusted source like database)
   *
   * Skips validation - use only for data from trusted sources.
   */
  static fromNormalized(normalized: string, chainAlias: ChainAlias): TransactionHash {
    return new TransactionHash(normalized, chainAlias);
  }

  /**
   * Check equality with another TransactionHash (same chain and normalized value)
   *
   * Comparison is case-insensitive.
   */
  equals(other: TransactionHash): boolean {
    return this.normalized === other.normalized && this.chainAlias === other.chainAlias;
  }

  /**
   * Check if this hash matches a raw string (case-insensitive)
   */
  matches(hash: string): boolean {
    return this.normalized === hash.toLowerCase().trim();
  }

  /**
   * Get the hash for database storage (normalized)
   */
  forStorage(): NormalizedTxHash {
    return this.normalized;
  }

  /**
   * Get display-friendly representation (original case)
   */
  get display(): string {
    return this.original;
  }

  /**
   * Serialize for API responses
   */
  toJSON(): { hash: string; chainAlias: ChainAlias } {
    return {
      hash: this.normalized,
      chainAlias: this.chainAlias,
    };
  }

  toString(): string {
    return this.normalized;
  }

  /**
   * Normalize any hash string for comparison (without creating a TransactionHash instance).
   * Useful for quick comparisons in services before creating full value objects.
   */
  static normalizeForComparison(hash: string): string {
    return hash.toLowerCase().trim();
  }

  /**
   * Compare two raw hash strings for equality (case-insensitive).
   * Useful for comparing hashes without chain context.
   */
  static areEqual(a: string, b: string): boolean {
    return TransactionHash.normalizeForComparison(a) === TransactionHash.normalizeForComparison(b);
  }
}
