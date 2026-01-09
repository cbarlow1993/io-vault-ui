import type { ChainAlias } from '../../core/types.js';
import { WalletAddress, InvalidAddressError } from '../../domain/value-objects/index.js';

export type ValidationResult<T> =
  | { isValid: true; value: T }
  | { isValid: false; error: string };

export class AddressValidator {
  validate(address: string, chainAlias: ChainAlias): ValidationResult<WalletAddress> {
    try {
      const walletAddress = WalletAddress.create(address, chainAlias);
      return { isValid: true, value: walletAddress };
    } catch (error) {
      if (error instanceof InvalidAddressError) {
        return { isValid: false, error: error.message };
      }
      throw error;
    }
  }
}
