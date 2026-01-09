// packages/chains/tests/unit/utxo/utils.test.ts

import { describe, it, expect } from 'vitest';
import { formatSatoshis, parseSatoshis } from '../../../src/utxo/utils.js';

describe('UTXO Utils', () => {
  describe('formatSatoshis', () => {
    it('formats whole BTC amounts', () => {
      expect(formatSatoshis(100000000n)).toBe('1');
      expect(formatSatoshis(500000000n)).toBe('5');
    });

    it('formats fractional BTC amounts', () => {
      expect(formatSatoshis(100000n)).toBe('0.001');
      expect(formatSatoshis(12345678n)).toBe('0.12345678');
    });

    it('removes trailing zeros', () => {
      expect(formatSatoshis(10000000n)).toBe('0.1');
      expect(formatSatoshis(100000000n)).toBe('1');
    });

    it('handles zero', () => {
      expect(formatSatoshis(0n)).toBe('0');
    });

    it('handles custom decimals', () => {
      expect(formatSatoshis(1000n, 3)).toBe('1');
    });
  });

  describe('parseSatoshis', () => {
    it('parses whole BTC amounts', () => {
      expect(parseSatoshis('1')).toBe(100000000n);
      expect(parseSatoshis('5')).toBe(500000000n);
    });

    it('parses fractional BTC amounts', () => {
      expect(parseSatoshis('0.001')).toBe(100000n);
      expect(parseSatoshis('0.12345678')).toBe(12345678n);
    });

    it('handles trailing zeros in input', () => {
      expect(parseSatoshis('1.00')).toBe(100000000n);
    });

    it('handles custom decimals', () => {
      expect(parseSatoshis('1', 3)).toBe(1000n);
    });
  });
});
