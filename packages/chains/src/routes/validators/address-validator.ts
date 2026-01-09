import type { ChainAlias } from '../../core/types.js';
import { WalletAddress, InvalidAddressError } from '../../domain/value-objects/index.js';

/**
 * Result type for validation operations.
 * Provides a discriminated union for type-safe handling of validation results
 * without throwing exceptions.
 */
export type ValidationResult<T> =
  | { isValid: true; value: T }
  | { isValid: false; error: string };

/**
 * Validator for wallet addresses at the route layer.
 *
 * Wraps domain value object creation and converts exceptions to result types.
 * This allows the route layer to handle validation errors gracefully without
 * catching exceptions everywhere.
 *
 * @example
 * ```typescript
 * const validator = new AddressValidator();
 * const result = validator.validate(req.params.address, 'ethereum');
 *
 * if (!result.isValid) {
 *   return reply.status(400).send({ error: result.error });
 * }
 *
 * // result.value is now a validated WalletAddress
 * const address = result.value;
 * ```
 */
export class AddressValidator {
  /**
   * Validate an address string for a specific chain.
   *
   * @param address - The raw address string to validate
   * @param chainAlias - The chain this address should be valid for
   * @returns ValidationResult with either the WalletAddress or an error message
   */
  validate(address: string, chainAlias: ChainAlias): ValidationResult<WalletAddress> {
    try {
      const walletAddress = WalletAddress.create(address, chainAlias);
      return { isValid: true, value: walletAddress };
    } catch (error) {
      if (error instanceof InvalidAddressError) {
        return { isValid: false, error: error.message };
      }
      // Rethrow unexpected errors
      throw error;
    }
  }
}
