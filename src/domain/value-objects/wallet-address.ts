import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { InvalidAddressError } from './errors.js';

/** Branded type for normalized (lowercase, trimmed) addresses */
declare const NormalizedAddressBrand: unique symbol;
export type NormalizedAddress = string & { readonly [NormalizedAddressBrand]: never };

/**
 * Immutable value object representing a wallet address on a specific chain.
 *
 * Consolidates address normalization logic from:
 * - src/lib/lowercase.ts:1 (lowercase utility)
 * - src/repositories/address.repository.ts:73 (LOWER(address))
 * - src/services/transactions/transfer-enricher.ts:39 (perspectiveAddress.toLowerCase())
 * - src/services/spam/spam-classification-service.ts:34 (token.address.toLowerCase())
 *
 * Automatically normalizes addresses to lowercase for consistent comparison
 * while preserving original case for display purposes where needed.
 *
 * @example
 * const addr = WalletAddress.create('0xAbC123...def', 'ethereum');
 * addr.normalized; // "0xabc123...def"
 * addr.original; // "0xAbC123...def"
 * addr.equals(otherAddr); // true if same normalized address and chain
 *
 * @example
 * // Use in Maps/Sets
 * const balances = new Map<string, Balance>();
 * balances.set(addr.normalized, balance);
 */
export class WalletAddress {
  public readonly normalized: NormalizedAddress;

  private constructor(
    public readonly original: string,
    public readonly chainAlias: ChainAlias
  ) {
    this.normalized = original.toLowerCase().trim() as NormalizedAddress;
    Object.freeze(this);
  }

  /**
   * Create a wallet address with validation
   *
   * @param address - The wallet address string
   * @param chainAlias - The chain this address belongs to
   * @throws InvalidAddressError if address is empty or invalid
   */
  static create(address: string, chainAlias: ChainAlias): WalletAddress {
    if (!address || typeof address !== 'string') {
      throw new InvalidAddressError(address ?? '', chainAlias);
    }
    const trimmed = address.trim();
    if (trimmed.length === 0) {
      throw new InvalidAddressError('', chainAlias);
    }
    return new WalletAddress(trimmed, chainAlias);
  }

  /**
   * Create from already-normalized address (trusted source like database)
   */
  static fromNormalized(normalized: string, chainAlias: ChainAlias): WalletAddress {
    return new WalletAddress(normalized, chainAlias);
  }

  /**
   * Check equality with another WalletAddress (same chain and normalized value)
   */
  equals(other: WalletAddress): boolean {
    return this.normalized === other.normalized && this.chainAlias === other.chainAlias;
  }

  /**
   * Check if this address matches a raw string (case-insensitive)
   */
  matches(address: string): boolean {
    return this.normalized === address.toLowerCase().trim();
  }

  /**
   * Get the address for database storage (normalized)
   */
  forStorage(): NormalizedAddress {
    return this.normalized;
  }

  /**
   * Get display-friendly representation
   */
  get display(): string {
    return this.original;
  }

  /**
   * Serialize for API responses
   */
  toJSON(): { address: string; chainAlias: ChainAlias } {
    return {
      address: this.normalized,
      chainAlias: this.chainAlias,
    };
  }

  toString(): string {
    return this.normalized;
  }
}
