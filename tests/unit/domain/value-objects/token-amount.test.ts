import { describe, expect, it } from 'vitest';
import { TokenAmount, InvalidAmountError } from '@/src/domain/value-objects/index.js';

describe('TokenAmount', () => {
  describe('fromRaw', () => {
    it('creates a TokenAmount from raw string', () => {
      const amount = TokenAmount.fromRaw('1000000000000000000', 18);
      expect(amount.raw).toBe('1000000000000000000');
      expect(amount.decimals).toBe(18);
    });

    it('creates a TokenAmount with symbol', () => {
      const amount = TokenAmount.fromRaw('1000000000000000000', 18, 'ETH');
      expect(amount.symbol).toBe('ETH');
      expect(amount.display).toBe('1 ETH');
    });

    it('throws InvalidAmountError for invalid raw string', () => {
      expect(() => TokenAmount.fromRaw('abc', 18)).toThrow(InvalidAmountError);
      expect(() => TokenAmount.fromRaw('', 18)).toThrow(InvalidAmountError);
      expect(() => TokenAmount.fromRaw('-100', 18)).toThrow(InvalidAmountError);
      expect(() => TokenAmount.fromRaw('1.5', 18)).toThrow(InvalidAmountError);
    });

    it('throws InvalidAmountError for invalid decimals', () => {
      expect(() => TokenAmount.fromRaw('100', -1)).toThrow(InvalidAmountError);
      expect(() => TokenAmount.fromRaw('100', 78)).toThrow(InvalidAmountError);
      expect(() => TokenAmount.fromRaw('100', 1.5)).toThrow(InvalidAmountError);
    });
  });

  describe('fromFormatted', () => {
    it('creates a TokenAmount from formatted string', () => {
      const amount = TokenAmount.fromFormatted('1.5', 18);
      expect(amount.raw).toBe('1500000000000000000');
      expect(amount.formatted).toBe('1.5');
    });

    it('handles whole numbers', () => {
      const amount = TokenAmount.fromFormatted('100', 6);
      expect(amount.raw).toBe('100000000');
      expect(amount.formatted).toBe('100');
    });

    it('handles zero', () => {
      const amount = TokenAmount.fromFormatted('0', 18);
      expect(amount.raw).toBe('0');
      expect(amount.isZero).toBe(true);
    });
  });

  describe('zero', () => {
    it('creates a zero amount', () => {
      const amount = TokenAmount.zero(18);
      expect(amount.raw).toBe('0');
      expect(amount.isZero).toBe(true);
      expect(amount.formatted).toBe('0');
    });

    it('creates a zero amount with symbol', () => {
      const amount = TokenAmount.zero(18, 'ETH');
      expect(amount.display).toBe('0 ETH');
    });
  });

  describe('formatted', () => {
    it('formats 1 ETH correctly (18 decimals)', () => {
      const amount = TokenAmount.fromRaw('1000000000000000000', 18);
      expect(amount.formatted).toBe('1');
    });

    it('formats 1.5 ETH correctly', () => {
      const amount = TokenAmount.fromRaw('1500000000000000000', 18);
      expect(amount.formatted).toBe('1.5');
    });

    it('formats small amounts correctly', () => {
      const amount = TokenAmount.fromRaw('800000000000000', 18);
      expect(amount.formatted).toBe('0.0008');
    });

    it('formats USDC correctly (6 decimals)', () => {
      const amount = TokenAmount.fromRaw('1500000', 6);
      expect(amount.formatted).toBe('1.5');
    });

    it('removes trailing zeros', () => {
      const amount = TokenAmount.fromRaw('1000000', 6);
      expect(amount.formatted).toBe('1');
    });

    it('handles zero decimals', () => {
      const amount = TokenAmount.fromRaw('100', 0);
      expect(amount.formatted).toBe('100');
    });

    it('handles very small amounts', () => {
      const amount = TokenAmount.fromRaw('1', 18);
      expect(amount.formatted).toBe('0.000000000000000001');
    });
  });

  describe('asBigInt', () => {
    it('returns raw as BigInt', () => {
      const amount = TokenAmount.fromRaw('1000000000000000000', 18);
      expect(amount.asBigInt).toBe(1000000000000000000n);
    });
  });

  describe('compare', () => {
    it('returns -1 when this < other', () => {
      const a = TokenAmount.fromRaw('100', 18);
      const b = TokenAmount.fromRaw('200', 18);
      expect(a.compare(b)).toBe(-1);
    });

    it('returns 0 when equal', () => {
      const a = TokenAmount.fromRaw('100', 18);
      const b = TokenAmount.fromRaw('100', 18);
      expect(a.compare(b)).toBe(0);
    });

    it('returns 1 when this > other', () => {
      const a = TokenAmount.fromRaw('200', 18);
      const b = TokenAmount.fromRaw('100', 18);
      expect(a.compare(b)).toBe(1);
    });

    it('throws when decimals differ', () => {
      const a = TokenAmount.fromRaw('100', 18);
      const b = TokenAmount.fromRaw('100', 6);
      expect(() => a.compare(b)).toThrow(InvalidAmountError);
    });
  });

  describe('add', () => {
    it('adds two amounts', () => {
      const a = TokenAmount.fromRaw('100', 18);
      const b = TokenAmount.fromRaw('200', 18);
      const sum = a.add(b);
      expect(sum.raw).toBe('300');
    });

    it('preserves symbol', () => {
      const a = TokenAmount.fromRaw('100', 18, 'ETH');
      const b = TokenAmount.fromRaw('200', 18);
      expect(a.add(b).symbol).toBe('ETH');
    });

    it('throws when decimals differ', () => {
      const a = TokenAmount.fromRaw('100', 18);
      const b = TokenAmount.fromRaw('100', 6);
      expect(() => a.add(b)).toThrow(InvalidAmountError);
    });
  });

  describe('subtract', () => {
    it('subtracts two amounts', () => {
      const a = TokenAmount.fromRaw('300', 18);
      const b = TokenAmount.fromRaw('100', 18);
      expect(a.subtract(b).raw).toBe('200');
    });

    it('throws when result would be negative', () => {
      const a = TokenAmount.fromRaw('100', 18);
      const b = TokenAmount.fromRaw('200', 18);
      expect(() => a.subtract(b)).toThrow(InvalidAmountError);
    });
  });

  describe('equals', () => {
    it('returns true for equal amounts', () => {
      const a = TokenAmount.fromRaw('100', 18);
      const b = TokenAmount.fromRaw('100', 18);
      expect(a.equals(b)).toBe(true);
    });

    it('returns false for different raw values', () => {
      const a = TokenAmount.fromRaw('100', 18);
      const b = TokenAmount.fromRaw('200', 18);
      expect(a.equals(b)).toBe(false);
    });

    it('returns false for different decimals', () => {
      const a = TokenAmount.fromRaw('100', 18);
      const b = TokenAmount.fromRaw('100', 6);
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('serializes correctly', () => {
      const amount = TokenAmount.fromRaw('1500000000000000000', 18, 'ETH');
      const json = amount.toJSON();
      expect(json).toEqual({
        raw: '1500000000000000000',
        formatted: '1.5',
        decimals: 18,
        symbol: 'ETH',
      });
    });
  });

  describe('immutability', () => {
    it('is frozen', () => {
      const amount = TokenAmount.fromRaw('100', 18);
      expect(Object.isFrozen(amount)).toBe(true);
    });
  });
});
