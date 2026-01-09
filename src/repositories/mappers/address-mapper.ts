import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { WalletAddress } from '@/src/domain/value-objects/index.js';

/**
 * Database row representation for address data.
 * Uses snake_case to match database column naming conventions.
 */
export interface AddressRow {
  address: string;
  chain_alias: ChainAlias;
}

/**
 * Mapper for converting between database address rows and WalletAddress domain objects.
 *
 * This mapper centralizes the conversion logic between the persistence layer
 * (which uses raw primitives) and the domain layer (which uses value objects).
 *
 * @example
 * // Converting from database to domain
 * const row = { address: '0x...', chain_alias: 'ethereum' };
 * const walletAddress = AddressMapper.toDomain(row);
 *
 * @example
 * // Converting from domain to database
 * const walletAddress = WalletAddress.create('0x...', 'ethereum');
 * const row = AddressMapper.toDatabase(walletAddress);
 */
export class AddressMapper {
  /**
   * Convert a database row to a WalletAddress domain object.
   *
   * Uses WalletAddress.create() which performs validation and normalization.
   *
   * @param row - The database row containing address and chain_alias
   * @returns A WalletAddress domain value object
   * @throws InvalidAddressError if the address is invalid for the chain
   */
  static toDomain(row: AddressRow): WalletAddress {
    return WalletAddress.create(row.address, row.chain_alias);
  }

  /**
   * Convert a WalletAddress domain object to database format.
   *
   * The address is stored in normalized (lowercase) form for consistent querying.
   *
   * @param walletAddress - The WalletAddress domain value object
   * @returns A database row object ready for persistence
   */
  static toDatabase(walletAddress: WalletAddress): AddressRow {
    return {
      address: walletAddress.normalized,
      chain_alias: walletAddress.chainAlias,
    };
  }
}
