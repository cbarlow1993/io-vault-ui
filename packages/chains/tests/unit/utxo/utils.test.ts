// packages/chains/tests/unit/utxo/utils.test.ts

import { describe, it, expect } from 'vitest';
import {
  formatSatoshis,
  parseSatoshis,
  isValidBitcoinAddress,
  getScriptTypeFromAddress,
  estimateTransactionSize,
  calculateFee,
  SCRIPT_TYPES,
} from '../../../src/utxo/utils.js';

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

  describe('isValidBitcoinAddress', () => {
    it('validates legacy P2PKH addresses (mainnet)', () => {
      expect(isValidBitcoinAddress('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2')).toBe(true);
    });

    it('validates P2SH addresses', () => {
      expect(isValidBitcoinAddress('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy')).toBe(true);
    });

    it('validates native SegWit addresses', () => {
      expect(isValidBitcoinAddress('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq')).toBe(true);
    });

    it('validates testnet addresses', () => {
      expect(isValidBitcoinAddress('tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx')).toBe(true);
      expect(isValidBitcoinAddress('mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn')).toBe(true);
    });

    it('rejects invalid addresses', () => {
      expect(isValidBitcoinAddress('invalid')).toBe(false);
      expect(isValidBitcoinAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44e')).toBe(false);
      expect(isValidBitcoinAddress('')).toBe(false);
    });
  });

  describe('getScriptTypeFromAddress', () => {
    it('identifies P2PKH addresses', () => {
      expect(getScriptTypeFromAddress('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2')).toBe(SCRIPT_TYPES.P2PKH);
      expect(getScriptTypeFromAddress('mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn')).toBe(SCRIPT_TYPES.P2PKH);
    });

    it('identifies P2SH addresses', () => {
      expect(getScriptTypeFromAddress('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy')).toBe(SCRIPT_TYPES.P2SH);
    });

    it('identifies native SegWit addresses', () => {
      expect(getScriptTypeFromAddress('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq')).toBe(SCRIPT_TYPES.P2WPKH);
    });

    it('identifies Taproot addresses', () => {
      expect(getScriptTypeFromAddress('bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0')).toBe(SCRIPT_TYPES.P2TR);
    });

    it('returns null for unknown formats', () => {
      expect(getScriptTypeFromAddress('invalid')).toBe(null);
    });
  });

  describe('estimateTransactionSize', () => {
    it('estimates P2WPKH transaction size', () => {
      const size = estimateTransactionSize(1, 2, SCRIPT_TYPES.P2WPKH);
      expect(size).toBeGreaterThan(100);
      expect(size).toBeLessThan(200);
    });

    it('estimates legacy P2PKH transaction size', () => {
      const legacySize = estimateTransactionSize(1, 2, SCRIPT_TYPES.P2PKH);
      const segwitSize = estimateTransactionSize(1, 2, SCRIPT_TYPES.P2WPKH);
      // Legacy transactions are larger than SegWit
      expect(legacySize).toBeGreaterThan(segwitSize);
    });

    it('scales with input/output count', () => {
      const small = estimateTransactionSize(1, 1);
      const large = estimateTransactionSize(5, 5);
      expect(large).toBeGreaterThan(small);
    });
  });

  describe('calculateFee', () => {
    it('calculates fee from vbytes and rate', () => {
      const fee = calculateFee(200, 10);
      expect(fee).toBe(2000n);
    });

    it('rounds up fractional fees', () => {
      const fee = calculateFee(201, 1.5);
      expect(fee).toBe(302n); // Math.ceil(201 * 1.5) = 302
    });
  });
});
