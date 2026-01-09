import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { InvalidAddressError } from './errors.js';

/** Constant for native token address representation */
export const NATIVE_TOKEN_ADDRESS = 'native' as const;

/**
 * Immutable value object representing a token contract address.
 * Handles the special case of native tokens (null/undefined -> represented internally as null).
 *
 * This distinguishes between:
 * - Native currency (ETH, SOL, BTC, etc.) - isNative = true, value = null
 * - Token contracts (ERC20, SPL, etc.) - isNative = false, value = normalized address
 *
 * @example
 * const native = TokenAddress.native('ethereum');
 * native.isNative; // true
 * native.value; // null
 * native.display; // 'native'
 *
 * @example
 * const usdc = TokenAddress.create('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum');
 * usdc.isNative; // false
 * usdc.value; // '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
 *
 * @example
 * // Common pattern for token vs native distinction
 * if (tokenAddress.isNative) {
 *   return fetchNativeBalance(address);
 * } else {
 *   return fetchTokenBalance(address, tokenAddress.value!);
 * }
 */
export class TokenAddress {
  public readonly normalized: string | null;

  private constructor(
    private readonly _address: string | null,
    public readonly chainAlias: ChainAlias
  ) {
    this.normalized = _address?.toLowerCase().trim() ?? null;
    Object.freeze(this);
  }

  /**
   * Create a token address (or native if null/undefined/'native')
   *
   * @param address - Contract address string, null, undefined, or 'native'
   * @param chainAlias - The chain this token belongs to
   */
  static create(address: string | null | undefined, chainAlias: ChainAlias): TokenAddress {
    // Explicitly null/undefined or 'native' -> native token
    if (address === null || address === undefined || address === NATIVE_TOKEN_ADDRESS) {
      return new TokenAddress(null, chainAlias);
    }
    // Empty/whitespace-only string is an error (different from intentionally passing null)
    const trimmed = address.trim();
    if (trimmed.length === 0) {
      throw new InvalidAddressError('', chainAlias);
    }
    return new TokenAddress(trimmed, chainAlias);
  }

  /**
   * Explicitly create native token address
   */
  static native(chainAlias: ChainAlias): TokenAddress {
    return new TokenAddress(null, chainAlias);
  }

  /**
   * Whether this represents the native currency (ETH, SOL, BTC, etc.)
   */
  get isNative(): boolean {
    return this._address === null;
  }

  /**
   * The contract address (null for native)
   */
  get value(): string | null {
    return this.normalized;
  }

  /**
   * Display representation ('native' or the address)
   */
  get display(): string {
    return this._address ?? NATIVE_TOKEN_ADDRESS;
  }

  /**
   * Check equality with another TokenAddress
   */
  equals(other: TokenAddress): boolean {
    return this.normalized === other.normalized && this.chainAlias === other.chainAlias;
  }

  /**
   * Check if matches a raw address string
   */
  matches(address: string | null | undefined): boolean {
    if (address === null || address === undefined || address === NATIVE_TOKEN_ADDRESS) {
      return this.isNative;
    }
    return this.normalized === address.toLowerCase().trim();
  }

  /**
   * For database storage
   */
  forStorage(): string | null {
    return this.normalized;
  }

  toJSON(): { address: string | null; isNative: boolean; chainAlias: ChainAlias } {
    return {
      address: this.normalized,
      isNative: this.isNative,
      chainAlias: this.chainAlias,
    };
  }

  toString(): string {
    return this.display;
  }
}
