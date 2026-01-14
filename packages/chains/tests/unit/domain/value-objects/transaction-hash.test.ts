// packages/chains/tests/unit/domain/value-objects/transaction-hash.test.ts
import { describe, it, expect } from 'vitest';
import {
  TransactionHash,
  type NormalizedTxHash,
} from '../../../../src/domain/value-objects/transaction-hash.js';
import { InvalidTransactionHashError } from '../../../../src/domain/value-objects/errors.js';

describe('TransactionHash', () => {
  describe('create()', () => {
    it('creates a valid transaction hash', () => {
      const hash = TransactionHash.create(
        '0xabc123def456789012345678901234567890123456789012345678901234abcd',
        'ethereum'
      );
      expect(hash).toBeInstanceOf(TransactionHash);
      expect(hash.chainAlias).toBe('ethereum');
    });

    it('throws InvalidTransactionHashError for empty string', () => {
      expect(() => TransactionHash.create('', 'ethereum')).toThrow(
        InvalidTransactionHashError
      );
    });

    it('throws InvalidTransactionHashError for whitespace-only string', () => {
      expect(() => TransactionHash.create('   ', 'ethereum')).toThrow(
        InvalidTransactionHashError
      );
    });

    it('throws InvalidTransactionHashError for null/undefined', () => {
      expect(() =>
        TransactionHash.create(null as unknown as string, 'ethereum')
      ).toThrow(InvalidTransactionHashError);
      expect(() =>
        TransactionHash.create(undefined as unknown as string, 'ethereum')
      ).toThrow(InvalidTransactionHashError);
    });

    it('trims whitespace from hash', () => {
      const hash = TransactionHash.create(
        '  0xABC123  ',
        'ethereum'
      );
      expect(hash.original).toBe('0xABC123');
      expect(hash.normalized).toBe('0xabc123');
    });
  });

  describe('normalization', () => {
    it('normalizes hash to lowercase', () => {
      const hash = TransactionHash.create(
        '0xABCDEF123456789012345678901234567890ABCDEF1234567890123456789012',
        'ethereum'
      );
      expect(hash.normalized).toBe(
        '0xabcdef123456789012345678901234567890abcdef1234567890123456789012'
      );
    });

    it('preserves original case in original property', () => {
      const originalValue =
        '0xABCDEF123456789012345678901234567890ABCDEF1234567890123456789012';
      const hash = TransactionHash.create(originalValue, 'ethereum');
      expect(hash.original).toBe(originalValue);
    });

    it('value property returns original for backwards compatibility', () => {
      const originalValue = '0xABCdef123';
      const hash = TransactionHash.create(originalValue, 'ethereum');
      // value should be same as original for backwards compatibility
      expect(hash.value).toBe(hash.original);
    });

    it('normalized property has NormalizedTxHash type', () => {
      const hash = TransactionHash.create('0xABC123', 'ethereum');
      const normalizedValue: NormalizedTxHash = hash.normalized;
      expect(typeof normalizedValue).toBe('string');
      expect(normalizedValue).toBe('0xabc123');
    });
  });

  describe('equals()', () => {
    it('returns true for same normalized hash and chain', () => {
      const hash1 = TransactionHash.create('0xABC123', 'ethereum');
      const hash2 = TransactionHash.create('0xabc123', 'ethereum');
      expect(hash1.equals(hash2)).toBe(true);
    });

    it('returns false for different hashes', () => {
      const hash1 = TransactionHash.create('0xABC123', 'ethereum');
      const hash2 = TransactionHash.create('0xDEF456', 'ethereum');
      expect(hash1.equals(hash2)).toBe(false);
    });

    it('returns false for same hash on different chains', () => {
      const hash1 = TransactionHash.create('0xABC123', 'ethereum');
      const hash2 = TransactionHash.create('0xABC123', 'polygon');
      expect(hash1.equals(hash2)).toBe(false);
    });

    it('is case-insensitive', () => {
      const hash1 = TransactionHash.create(
        '0xABCDEF123456789012345678901234567890ABCDEF',
        'ethereum'
      );
      const hash2 = TransactionHash.create(
        '0xabcdef123456789012345678901234567890abcdef',
        'ethereum'
      );
      expect(hash1.equals(hash2)).toBe(true);
    });
  });

  describe('matches()', () => {
    it('returns true for matching hash (case-insensitive)', () => {
      const hash = TransactionHash.create('0xABC123', 'ethereum');
      expect(hash.matches('0xabc123')).toBe(true);
      expect(hash.matches('0xABC123')).toBe(true);
      expect(hash.matches('0xAbC123')).toBe(true);
    });

    it('returns false for non-matching hash', () => {
      const hash = TransactionHash.create('0xABC123', 'ethereum');
      expect(hash.matches('0xDEF456')).toBe(false);
    });

    it('handles whitespace in comparison string', () => {
      const hash = TransactionHash.create('0xABC123', 'ethereum');
      expect(hash.matches('  0xabc123  ')).toBe(true);
    });
  });

  describe('forStorage()', () => {
    it('returns normalized value for database storage', () => {
      const hash = TransactionHash.create('0xABCdef123', 'ethereum');
      expect(hash.forStorage()).toBe('0xabcdef123');
    });

    it('returns NormalizedTxHash type', () => {
      const hash = TransactionHash.create('0xABC123', 'ethereum');
      const storageValue: NormalizedTxHash = hash.forStorage();
      expect(storageValue).toBe(hash.normalized);
    });
  });

  describe('fromNormalized()', () => {
    it('creates TransactionHash from already-normalized value', () => {
      const normalized = '0xabc123def456';
      const hash = TransactionHash.fromNormalized(normalized, 'ethereum');
      expect(hash.normalized).toBe(normalized);
      expect(hash.original).toBe(normalized);
      expect(hash.chainAlias).toBe('ethereum');
    });

    it('skips validation for trusted source', () => {
      // fromNormalized should not throw even for potentially invalid formats
      // since it's for trusted sources like database reads
      const hash = TransactionHash.fromNormalized('already-lowercase', 'ethereum');
      expect(hash.normalized).toBe('already-lowercase');
    });
  });

  describe('static normalizeForComparison()', () => {
    it('normalizes hash string to lowercase and trimmed', () => {
      expect(TransactionHash.normalizeForComparison('  0xABC123  ')).toBe('0xabc123');
    });

    it('handles already-lowercase strings', () => {
      expect(TransactionHash.normalizeForComparison('0xabc123')).toBe('0xabc123');
    });

    it('handles mixed case', () => {
      expect(
        TransactionHash.normalizeForComparison('0xAbCdEf')
      ).toBe('0xabcdef');
    });
  });

  describe('static areEqual()', () => {
    it('returns true for same hash with different cases', () => {
      expect(TransactionHash.areEqual('0xABC123', '0xabc123')).toBe(true);
    });

    it('returns false for different hashes', () => {
      expect(TransactionHash.areEqual('0xABC123', '0xDEF456')).toBe(false);
    });

    it('handles whitespace', () => {
      expect(TransactionHash.areEqual('  0xABC123  ', '0xabc123')).toBe(true);
    });
  });

  describe('immutability', () => {
    it('is frozen and cannot be modified', () => {
      const hash = TransactionHash.create('0xABC123', 'ethereum');
      expect(Object.isFrozen(hash)).toBe(true);
    });
  });

  describe('toString()', () => {
    it('returns the normalized value', () => {
      const hash = TransactionHash.create('0xABCdef123', 'ethereum');
      expect(hash.toString()).toBe('0xabcdef123');
    });
  });

  describe('toJSON()', () => {
    it('serializes to object with normalized hash and chainAlias', () => {
      const hash = TransactionHash.create('0xABCdef123', 'ethereum');
      expect(hash.toJSON()).toEqual({
        hash: '0xabcdef123',
        chainAlias: 'ethereum',
      });
    });
  });

  describe('display getter', () => {
    it('returns original value for display purposes', () => {
      const original = '0xABCdef123';
      const hash = TransactionHash.create(original, 'ethereum');
      expect(hash.display).toBe(original);
    });
  });

  describe('cross-chain scenarios', () => {
    it('works with Solana transaction signatures', () => {
      const solanaSignature =
        '5wHu1qwD7q2eTbLKGMGsRPzKQxLCNJUvWNmVvWVCSqz7KtZVEYDMHQeCxPqeMnQKjM2p7QPH6xNMwDKpWNp6PLNT';
      const hash = TransactionHash.create(solanaSignature, 'solana');
      expect(hash.original).toBe(solanaSignature);
      // Solana signatures are base58, case-sensitive in real usage but we normalize for comparison
      expect(hash.normalized).toBe(solanaSignature.toLowerCase());
    });

    it('works with Bitcoin transaction IDs', () => {
      const btcTxid =
        'abc123def456789012345678901234567890abcdef1234567890123456789012ab';
      const hash = TransactionHash.create(btcTxid, 'bitcoin');
      expect(hash.original).toBe(btcTxid);
      expect(hash.normalized).toBe(btcTxid.toLowerCase());
    });

    it('works with Tron transaction IDs', () => {
      const tronTxid =
        'ABC123DEF456789012345678901234567890ABCDEF1234567890123456789012AB';
      const hash = TransactionHash.create(tronTxid, 'tron');
      expect(hash.original).toBe(tronTxid);
      expect(hash.normalized).toBe(tronTxid.toLowerCase());
    });
  });
});
