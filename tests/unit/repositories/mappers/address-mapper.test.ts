import { describe, expect, it } from 'vitest';
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { WalletAddress } from '@/src/domain/value-objects/index.js';
import { AddressMapper, type AddressRow } from '@/src/repositories/mappers/address-mapper.js';

describe('AddressMapper', () => {
  const chainAlias = 'ethereum' as ChainAlias;
  // Valid EVM address: 0x + 40 hex characters = 42 chars total
  const validEvmAddress = '0xabcdef1234567890abcdef1234567890abcdef12';

  describe('toDomain', () => {
    it('converts database row to WalletAddress', () => {
      const row: AddressRow = {
        address: validEvmAddress,
        chain_alias: chainAlias,
      };

      const walletAddress = AddressMapper.toDomain(row);

      expect(walletAddress).toBeInstanceOf(WalletAddress);
      expect(walletAddress.normalized).toBe(validEvmAddress);
      expect(walletAddress.chainAlias).toBe(chainAlias);
    });

    it('handles mixed case addresses from database', () => {
      const row: AddressRow = {
        address: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
        chain_alias: chainAlias,
      };

      const walletAddress = AddressMapper.toDomain(row);

      expect(walletAddress.normalized).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
    });

    it('works with Solana addresses', () => {
      const solanaAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
      const row: AddressRow = {
        address: solanaAddress,
        chain_alias: 'solana' as ChainAlias,
      };

      const walletAddress = AddressMapper.toDomain(row);

      expect(walletAddress.original).toBe(solanaAddress);
      expect(walletAddress.chainAlias).toBe('solana');
    });

    it('works with Bitcoin addresses', () => {
      const bitcoinAddress = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
      const row: AddressRow = {
        address: bitcoinAddress,
        chain_alias: 'bitcoin' as ChainAlias,
      };

      const walletAddress = AddressMapper.toDomain(row);

      expect(walletAddress.original).toBe(bitcoinAddress);
      expect(walletAddress.chainAlias).toBe('bitcoin');
    });
  });

  describe('toDatabase', () => {
    it('converts WalletAddress to database format', () => {
      const walletAddress = WalletAddress.create(validEvmAddress, chainAlias);

      const row = AddressMapper.toDatabase(walletAddress);

      expect(row).toEqual({
        address: validEvmAddress,
        chain_alias: chainAlias,
      });
    });

    it('normalizes address to lowercase for storage', () => {
      const walletAddress = WalletAddress.create(
        '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
        chainAlias
      );

      const row = AddressMapper.toDatabase(walletAddress);

      expect(row.address).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
    });

    it('preserves chain alias', () => {
      const walletAddress = WalletAddress.create(validEvmAddress, 'polygon' as ChainAlias);

      const row = AddressMapper.toDatabase(walletAddress);

      expect(row.chain_alias).toBe('polygon');
    });
  });

  describe('round-trip conversion', () => {
    it('maintains data integrity through domain and back', () => {
      const originalRow: AddressRow = {
        address: validEvmAddress,
        chain_alias: chainAlias,
      };

      const walletAddress = AddressMapper.toDomain(originalRow);
      const resultRow = AddressMapper.toDatabase(walletAddress);

      expect(resultRow).toEqual(originalRow);
    });

    it('normalizes address during round-trip', () => {
      const mixedCaseRow: AddressRow = {
        address: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
        chain_alias: chainAlias,
      };

      const walletAddress = AddressMapper.toDomain(mixedCaseRow);
      const resultRow = AddressMapper.toDatabase(walletAddress);

      expect(resultRow.address).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
    });
  });
});
