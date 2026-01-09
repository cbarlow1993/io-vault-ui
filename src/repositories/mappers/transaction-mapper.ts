import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { TransactionHash, TokenAmount } from '@/src/domain/value-objects/index.js';

/**
 * Database representation for token amount data.
 */
export interface AmountRow {
  raw: string;
  decimals: number;
}

/**
 * Mapper for converting between database transaction/amount values and domain objects.
 *
 * This mapper centralizes the conversion logic between the persistence layer
 * (which uses raw primitives) and the domain layer (which uses value objects).
 *
 * @example
 * // Converting hash from database to domain
 * const txHash = TransactionMapper.hashToDomain('0x123...', 'ethereum');
 *
 * @example
 * // Converting hash from domain to database
 * const rawHash = TransactionMapper.hashToDatabase(txHash);
 *
 * @example
 * // Converting amount from database to domain
 * const amount = TransactionMapper.amountToDomain('1000000000000000000', 18);
 *
 * @example
 * // Converting amount from domain to database
 * const { raw, decimals } = TransactionMapper.amountToDatabase(amount);
 */
export class TransactionMapper {
  /**
   * Convert a raw hash string to a TransactionHash domain object.
   *
   * Uses TransactionHash.create() which performs validation.
   *
   * @param hash - The transaction hash string from database
   * @param chainAlias - The chain this transaction belongs to
   * @returns A TransactionHash domain value object
   * @throws InvalidTransactionHashError if the hash is invalid
   */
  static hashToDomain(hash: string, chainAlias: ChainAlias): TransactionHash {
    return TransactionHash.create(hash, chainAlias);
  }

  /**
   * Convert a TransactionHash domain object to database format.
   *
   * Returns the raw hash string value for storage.
   *
   * @param hash - The TransactionHash domain value object
   * @returns The raw hash string ready for persistence
   */
  static hashToDatabase(hash: TransactionHash): string {
    return hash.value;
  }

  /**
   * Convert a raw amount string and decimals to a TokenAmount domain object.
   *
   * Uses TokenAmount.fromRaw() which performs validation.
   *
   * @param rawAmount - The raw amount as a string of digits (e.g., wei, lamports)
   * @param decimals - Number of decimal places for the token
   * @returns A TokenAmount domain value object
   * @throws InvalidAmountError if the amount is invalid
   */
  static amountToDomain(rawAmount: string, decimals: number): TokenAmount {
    return TokenAmount.fromRaw(rawAmount, decimals);
  }

  /**
   * Convert a TokenAmount domain object to database format.
   *
   * Returns an object with raw and decimals properties for storage.
   *
   * @param amount - The TokenAmount domain value object
   * @returns An object with raw and decimals properties ready for persistence
   */
  static amountToDatabase(amount: TokenAmount): AmountRow {
    return {
      raw: amount.raw,
      decimals: amount.decimals,
    };
  }
}
