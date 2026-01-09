import { describe, expect, it } from 'vitest';
import { TransactionHash, InvalidTransactionHashError } from '@/src/domain/value-objects/index.js';
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

describe('TransactionHash', () => {
  const chainAlias = 'ethereum' as ChainAlias;
  const validHash = '0xabc123def456789012345678901234567890123456789012345678901234567890';

  describe('create', () => {
    it('creates a TransactionHash from valid string', () => {
      const hash = TransactionHash.create(validHash, chainAlias);
      expect(hash.value).toBe(validHash);
      expect(hash.chainAlias).toBe('ethereum');
    });

    it('trims whitespace', () => {
      const hash = TransactionHash.create(`  ${validHash}  `, chainAlias);
      expect(hash.value).toBe(validHash);
    });

    it('throws InvalidTransactionHashError for empty string', () => {
      expect(() => TransactionHash.create('', chainAlias)).toThrow(InvalidTransactionHashError);
      expect(() => TransactionHash.create('   ', chainAlias)).toThrow(InvalidTransactionHashError);
    });

    it('throws InvalidTransactionHashError for null/undefined', () => {
      expect(() => TransactionHash.create(null as unknown as string, chainAlias)).toThrow(
        InvalidTransactionHashError
      );
      expect(() => TransactionHash.create(undefined as unknown as string, chainAlias)).toThrow(
        InvalidTransactionHashError
      );
    });
  });

  describe('equals', () => {
    it('returns true for same hash and chain', () => {
      const a = TransactionHash.create(validHash, chainAlias);
      const b = TransactionHash.create(validHash, chainAlias);
      expect(a.equals(b)).toBe(true);
    });

    it('returns false for different hashes', () => {
      const a = TransactionHash.create('0xabc', chainAlias);
      const b = TransactionHash.create('0xdef', chainAlias);
      expect(a.equals(b)).toBe(false);
    });

    it('returns false for same hash on different chains', () => {
      const a = TransactionHash.create(validHash, 'ethereum' as ChainAlias);
      const b = TransactionHash.create(validHash, 'polygon' as ChainAlias);
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('matches', () => {
    it('matches exact string', () => {
      const hash = TransactionHash.create(validHash, chainAlias);
      expect(hash.matches(validHash)).toBe(true);
    });

    it('trims input for matching', () => {
      const hash = TransactionHash.create(validHash, chainAlias);
      expect(hash.matches(`  ${validHash}  `)).toBe(true);
    });

    it('returns false for non-matching hash', () => {
      const hash = TransactionHash.create('0xabc', chainAlias);
      expect(hash.matches('0xdef')).toBe(false);
    });
  });

  describe('toString', () => {
    it('returns the hash value', () => {
      const hash = TransactionHash.create(validHash, chainAlias);
      expect(hash.toString()).toBe(validHash);
    });
  });

  describe('toJSON', () => {
    it('serializes correctly', () => {
      const hash = TransactionHash.create(validHash, chainAlias);
      expect(hash.toJSON()).toEqual({
        hash: validHash,
        chainAlias: 'ethereum',
      });
    });
  });

  describe('immutability', () => {
    it('is frozen', () => {
      const hash = TransactionHash.create(validHash, chainAlias);
      expect(Object.isFrozen(hash)).toBe(true);
    });
  });
});
