import { ValueObjectError } from './errors.js';

/**
 * Error for invalid price values
 */
export class InvalidPriceError extends ValueObjectError {
  constructor(price: number, reason: string) {
    super(`Invalid price ${price}: ${reason}`);
    this.name = 'InvalidPriceError';
  }
}

/** Supported currency codes for price data */
export type SupportedCurrency = 'usd' | 'eur' | 'gbp' | 'jpy' | 'btc' | 'eth';

export const SUPPORTED_CURRENCIES = new Set<string>([
  'usd',
  'eur',
  'gbp',
  'jpy',
  'btc',
  'eth',
]);

export interface CreateTokenPriceData {
  coingeckoId: string;
  price: number;
  currency: string;
  priceChange24h?: number | null;
  marketCap?: number | null;
  fetchedAt?: Date;
}

/**
 * Immutable value object representing a token price from pricing services.
 *
 * Encapsulates:
 * - Price staleness calculation
 * - Currency validation
 * - Value calculation for token amounts
 *
 * @example
 * const price = TokenPrice.create({
 *   coingeckoId: 'bitcoin',
 *   price: 50000,
 *   currency: 'usd',
 *   priceChange24h: 2.5,
 *   marketCap: 900000000000,
 * });
 *
 * price.isStale(60000); // false if fetched within 60 seconds
 * price.calculateValue(2); // 100000 (2 BTC * $50000)
 *
 * @example
 * // Create a placeholder for unknown price
 * const unknown = TokenPrice.unknown('unknown-token');
 * unknown.isUnknown; // true
 */
export class TokenPrice {
  private readonly _isUnknown: boolean;

  private constructor(
    public readonly coingeckoId: string,
    public readonly price: number,
    public readonly currency: SupportedCurrency,
    public readonly priceChange24h: number | null,
    public readonly marketCap: number | null,
    public readonly fetchedAt: Date,
    isUnknown: boolean = false
  ) {
    this._isUnknown = isUnknown;
    Object.freeze(this);
  }

  /**
   * Create a TokenPrice with validation
   *
   * @param data - Price data including coingeckoId, price, currency, and optional fields
   * @throws InvalidPriceError if price is not positive
   */
  static create(data: CreateTokenPriceData): TokenPrice {
    if (data.price <= 0) {
      throw new InvalidPriceError(data.price, 'price must be positive');
    }

    const normalizedCurrency = TokenPrice.normalizeCurrency(data.currency) as SupportedCurrency;

    return new TokenPrice(
      data.coingeckoId,
      data.price,
      normalizedCurrency,
      data.priceChange24h ?? null,
      data.marketCap ?? null,
      data.fetchedAt ?? new Date()
    );
  }

  /**
   * Create a placeholder for unknown price.
   * Useful when price data is unavailable but we need a valid object.
   *
   * @param coingeckoId - Token identifier
   */
  static unknown(coingeckoId: string): TokenPrice {
    return new TokenPrice(coingeckoId, 0, 'usd', null, null, new Date(), true);
  }

  /**
   * Check if this is an unknown/placeholder price
   */
  get isUnknown(): boolean {
    return this._isUnknown;
  }

  /**
   * Check if price data is stale (older than the given TTL)
   *
   * @param ttlMs - Time-to-live in milliseconds
   * @returns true if price is older than ttlMs
   */
  isStale(ttlMs: number): boolean {
    const ageMs = Date.now() - this.fetchedAt.getTime();
    return ageMs > ttlMs;
  }

  /**
   * Get age of the price in milliseconds
   */
  get ageMs(): number {
    return Date.now() - this.fetchedAt.getTime();
  }

  /**
   * Calculate the value for a given token amount
   *
   * @param amount - Number of tokens
   * @returns Value in the price's currency
   */
  calculateValue(amount: number): number {
    return this.price * amount;
  }

  /**
   * Check if a currency is supported
   */
  static isSupportedCurrency(currency: string): boolean {
    return SUPPORTED_CURRENCIES.has(currency.toLowerCase().trim());
  }

  /**
   * Normalize currency string, falling back to 'usd' if unsupported
   */
  static normalizeCurrency(currency: string): SupportedCurrency {
    const normalized = currency.toLowerCase().trim();
    return SUPPORTED_CURRENCIES.has(normalized) ? (normalized as SupportedCurrency) : 'usd';
  }

  /**
   * Serialize for API responses
   */
  toJSON(): {
    coingeckoId: string;
    price: number;
    currency: string;
    priceChange24h: number | null;
    marketCap: number | null;
    fetchedAt: string;
  } {
    return {
      coingeckoId: this.coingeckoId,
      price: this.price,
      currency: this.currency,
      priceChange24h: this.priceChange24h,
      marketCap: this.marketCap,
      fetchedAt: this.fetchedAt.toISOString(),
    };
  }

  toString(): string {
    return `${this.coingeckoId}: ${this.price} ${this.currency.toUpperCase()}`;
  }
}
