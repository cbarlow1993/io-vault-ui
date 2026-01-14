// packages/chains/tests/unit/domain/value-objects/token-address.test.ts
import { describe, it, expect } from 'vitest';
import { TokenAddress } from '../../../../src/domain/value-objects/token-address.js';

describe('TokenAddress', () => {
  describe('static normalizeForComparison()', () => {
    it('returns null when input is null', () => {
      expect(TokenAddress.normalizeForComparison(null)).toBeNull();
    });

    it('normalizes address string to lowercase and trimmed', () => {
      expect(TokenAddress.normalizeForComparison('  0xABC123  ')).toBe('0xabc123');
    });

    it('handles already-lowercase strings', () => {
      expect(TokenAddress.normalizeForComparison('0xabc123')).toBe('0xabc123');
    });

    it('handles mixed case', () => {
      expect(TokenAddress.normalizeForComparison('0xAbCdEf')).toBe('0xabcdef');
    });

    it('handles strings with leading/trailing whitespace', () => {
      expect(TokenAddress.normalizeForComparison('   0xABC   ')).toBe('0xabc');
    });
  });

  describe('static areEqual()', () => {
    it('returns true when both inputs are null', () => {
      expect(TokenAddress.areEqual(null, null)).toBe(true);
    });

    it('returns false when first is null and second is not', () => {
      expect(TokenAddress.areEqual(null, '0xABC123')).toBe(false);
    });

    it('returns false when first is not null and second is null', () => {
      expect(TokenAddress.areEqual('0xABC123', null)).toBe(false);
    });

    it('returns true for same address with different cases', () => {
      expect(TokenAddress.areEqual('0xABC123', '0xabc123')).toBe(true);
    });

    it('returns false for different addresses', () => {
      expect(TokenAddress.areEqual('0xABC123', '0xDEF456')).toBe(false);
    });

    it('handles whitespace in both arguments', () => {
      expect(TokenAddress.areEqual('  0xABC123  ', '0xabc123')).toBe(true);
    });

    it('handles mixed case comparisons', () => {
      expect(TokenAddress.areEqual('0xAbCdEf', '0xABCDEF')).toBe(true);
    });
  });
});
