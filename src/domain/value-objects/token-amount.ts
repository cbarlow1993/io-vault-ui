import { InvalidAmountError } from './errors.js';

/**
 * Immutable value object representing a token amount with decimals.
 *
 * Consolidates formatting logic from:
 * - src/services/balances/balance-service.ts:371-384 (formatBalance)
 * - src/services/transaction-processor/classifier/label.ts:11-30 (formatAmount)
 *
 * Follows patterns from packages/chains:
 * - Dual representation (raw balance + formatted)
 * - Immutable via readonly properties and Object.freeze
 * - Factory creation with validation
 *
 * @example
 * const amount = TokenAmount.fromRaw('1000000000000000000', 18);
 * amount.formatted; // "1"
 * amount.raw; // "1000000000000000000"
 * amount.asBigInt; // 1000000000000000000n
 *
 * @example
 * const eth = TokenAmount.fromRaw('1500000000000000000', 18, 'ETH');
 * eth.display; // "1.5 ETH"
 * eth.compare(otherAmount); // -1 | 0 | 1
 */
export class TokenAmount {
  private constructor(
    public readonly raw: string,
    public readonly decimals: number,
    public readonly symbol: string = ''
  ) {
    Object.freeze(this);
  }

  /**
   * Create from raw string amount (e.g., wei, lamports, satoshis)
   *
   * @param raw - The raw amount as a string of digits
   * @param decimals - Number of decimal places (0-77)
   * @param symbol - Optional token symbol for display
   * @throws InvalidAmountError if raw is not a valid non-negative integer string
   */
  static fromRaw(raw: string, decimals: number, symbol?: string): TokenAmount {
    if (!raw || !/^\d+$/.test(raw)) {
      throw new InvalidAmountError(raw ?? '', 'must be a non-negative integer string');
    }
    if (decimals < 0 || decimals > 77 || !Number.isInteger(decimals)) {
      throw new InvalidAmountError(raw, `invalid decimals: ${decimals}`);
    }
    return new TokenAmount(raw, decimals, symbol ?? '');
  }

  /**
   * Create from formatted string (e.g., "1.5")
   *
   * @param formatted - Human-readable amount (e.g., "1.5", "100")
   * @param decimals - Number of decimal places
   * @param symbol - Optional token symbol
   */
  static fromFormatted(formatted: string, decimals: number, symbol?: string): TokenAmount {
    const raw = TokenAmount.parseUnits(formatted, decimals);
    return new TokenAmount(raw, decimals, symbol ?? '');
  }

  /**
   * Zero amount for a given decimal precision
   */
  static zero(decimals: number, symbol?: string): TokenAmount {
    return new TokenAmount('0', decimals, symbol ?? '');
  }

  /**
   * Raw value as BigInt for arithmetic operations
   */
  get asBigInt(): bigint {
    return BigInt(this.raw);
  }

  /**
   * Human-readable formatted balance.
   * Removes trailing zeros for clean display.
   *
   * Matches behavior of both formatBalance and formatAmount implementations.
   */
  get formatted(): string {
    return TokenAmount.formatUnits(this.asBigInt, this.decimals);
  }

  /**
   * Formatted with symbol (e.g., "1.5 ETH")
   */
  get display(): string {
    return this.symbol ? `${this.formatted} ${this.symbol}` : this.formatted;
  }

  /**
   * Check if amount is zero
   */
  get isZero(): boolean {
    return this.raw === '0';
  }

  /**
   * Compare with another TokenAmount.
   * Both must have the same decimals.
   *
   * @returns -1 if this < other, 0 if equal, 1 if this > other
   * @throws InvalidAmountError if decimals don't match
   */
  compare(other: TokenAmount): -1 | 0 | 1 {
    if (this.decimals !== other.decimals) {
      throw new InvalidAmountError(
        this.raw,
        `cannot compare amounts with different decimals (${this.decimals} vs ${other.decimals})`
      );
    }
    const a = this.asBigInt;
    const b = other.asBigInt;
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }

  /**
   * Add two amounts (must have same decimals)
   */
  add(other: TokenAmount): TokenAmount {
    if (this.decimals !== other.decimals) {
      throw new InvalidAmountError(
        this.raw,
        `cannot add amounts with different decimals (${this.decimals} vs ${other.decimals})`
      );
    }
    const sum = (this.asBigInt + other.asBigInt).toString();
    return new TokenAmount(sum, this.decimals, this.symbol);
  }

  /**
   * Subtract (must have same decimals, result must be non-negative)
   */
  subtract(other: TokenAmount): TokenAmount {
    if (this.decimals !== other.decimals) {
      throw new InvalidAmountError(
        this.raw,
        `cannot subtract amounts with different decimals (${this.decimals} vs ${other.decimals})`
      );
    }
    const diff = this.asBigInt - other.asBigInt;
    if (diff < 0n) {
      throw new InvalidAmountError(this.raw, 'subtraction would result in negative amount');
    }
    return new TokenAmount(diff.toString(), this.decimals, this.symbol);
  }

  /**
   * Check equality with another TokenAmount
   */
  equals(other: TokenAmount): boolean {
    return this.raw === other.raw && this.decimals === other.decimals;
  }

  /**
   * Serialize for API responses
   */
  toJSON(): { raw: string; formatted: string; decimals: number; symbol: string } {
    return {
      raw: this.raw,
      formatted: this.formatted,
      decimals: this.decimals,
      symbol: this.symbol,
    };
  }

  toString(): string {
    return this.formatted;
  }

  // ===== Private static helpers (consolidates duplicate logic) =====

  /**
   * Format raw BigInt value to human-readable string.
   * Removes trailing zeros for clean display.
   *
   * Consolidates:
   * - balance-service.ts:formatBalance
   * - label.ts:formatAmount
   * - packages/chains evm/utils.ts:formatUnits
   */
  private static formatUnits(value: bigint, decimals: number): string {
    if (decimals === 0) return value.toString();

    const divisor = 10n ** BigInt(decimals);
    const integerPart = value / divisor;
    const remainder = value % divisor;

    if (remainder === 0n) {
      return integerPart.toString();
    }

    // Pad remainder to decimals length, then trim trailing zeros
    const remainderStr = remainder.toString().padStart(decimals, '0');
    const trimmedRemainder = remainderStr.replace(/0+$/, '');

    return `${integerPart}.${trimmedRemainder}`;
  }

  /**
   * Parse formatted string to raw BigInt string.
   * Inverse of formatUnits.
   */
  private static parseUnits(value: string, decimals: number): string {
    if (!value || value === '0') return '0';

    const isNegative = value.startsWith('-');
    const absValue = isNegative ? value.slice(1) : value;
    const [integerPart = '0', fractionalPart = ''] = absValue.split('.');
    const normalizedInteger = integerPart === '' ? '0' : integerPart;

    // Truncate or pad fractional part to match decimals
    const paddedFraction = fractionalPart.slice(0, decimals).padEnd(decimals, '0');
    const result = BigInt(normalizedInteger + paddedFraction);

    if (isNegative) {
      throw new InvalidAmountError(value, 'negative amounts not supported');
    }

    return result.toString();
  }
}
