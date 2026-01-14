/**
 * Utility class for token address operations.
 *
 * Provides static helper methods for normalizing and comparing token addresses
 * without requiring a full value object instance. Token addresses can be null
 * for native tokens (ETH, SOL, BTC, etc.).
 *
 * @example
 * // Normalize for comparison
 * const normalized = TokenAddress.normalizeForComparison('0xAbC123');
 * // normalized === '0xabc123'
 *
 * @example
 * // Compare two addresses (case-insensitive, null-safe)
 * TokenAddress.areEqual('0xABC', '0xabc'); // true
 * TokenAddress.areEqual(null, null); // true
 * TokenAddress.areEqual(null, '0xABC'); // false
 */
export class TokenAddress {
  /**
   * Normalize any address string for comparison (without creating a TokenAddress instance).
   * Useful for quick comparisons in services before creating full value objects.
   *
   * @param address - The address to normalize, or null
   * @returns The normalized (lowercase, trimmed) address, or null if input is null
   */
  static normalizeForComparison(address: string | null): string | null {
    if (address === null) {
      return null;
    }
    return address.toLowerCase().trim();
  }

  /**
   * Compare two raw address strings for equality (case-insensitive).
   * Handles null values appropriately for native token comparisons.
   *
   * @param a - First address or null
   * @param b - Second address or null
   * @returns true if both are null, or if both are equal (case-insensitive)
   */
  static areEqual(a: string | null, b: string | null): boolean {
    if (a === null && b === null) {
      return true;
    }
    if (a === null || b === null) {
      return false;
    }
    return TokenAddress.normalizeForComparison(a) === TokenAddress.normalizeForComparison(b);
  }
}
