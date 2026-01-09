// packages/chains/tests/unit/xrp/utils.test.ts

import { describe, it, expect } from 'vitest';
import {
  formatDrops,
  parseDrops,
  isValidXrpAddress,
  encodeBase58,
  decodeBase58,
  encodeCurrencyCode,
  decodeCurrencyCode,
  classifyTransaction,
  rippleTimeNow,
  unixToRippleTime,
  rippleToUnixTime,
  DROPS_PER_XRP,
  XRP_DECIMALS,
  XRP_TRANSACTION_TYPES,
} from '../../../src/xrp/utils.js';

describe('XRP Utils', () => {
  describe('formatDrops', () => {
    it('formats drops to XRP correctly', () => {
      expect(formatDrops(1000000n)).toBe('1');
      expect(formatDrops(1500000n)).toBe('1.5');
      expect(formatDrops(1234567n)).toBe('1.234567');
      expect(formatDrops(100000n)).toBe('0.1');
      expect(formatDrops(1n)).toBe('0.000001');
    });

    it('handles zero', () => {
      expect(formatDrops(0n)).toBe('0');
    });

    it('handles large amounts', () => {
      expect(formatDrops(1000000000000n)).toBe('1000000');
    });

    it('handles negative amounts', () => {
      expect(formatDrops(-1000000n)).toBe('-1');
    });

    it('respects custom decimals', () => {
      expect(formatDrops(100n, 2)).toBe('1');
      expect(formatDrops(150n, 2)).toBe('1.5');
    });
  });

  describe('parseDrops', () => {
    it('parses XRP to drops correctly', () => {
      expect(parseDrops('1')).toBe(1000000n);
      expect(parseDrops('1.5')).toBe(1500000n);
      expect(parseDrops('0.1')).toBe(100000n);
      expect(parseDrops('0.000001')).toBe(1n);
    });

    it('handles zero', () => {
      expect(parseDrops('0')).toBe(0n);
    });

    it('handles large amounts', () => {
      expect(parseDrops('1000000')).toBe(1000000000000n);
    });

    it('handles decimals beyond precision', () => {
      // Should truncate to 6 decimals
      expect(parseDrops('1.1234567')).toBe(1123456n);
    });

    it('handles negative amounts', () => {
      expect(parseDrops('-1')).toBe(-1000000n);
      expect(parseDrops('-1.5')).toBe(-1500000n);
      expect(parseDrops('-0.000001')).toBe(-1n);
    });

    it('handles leading decimal point', () => {
      expect(parseDrops('.5')).toBe(500000n);
      expect(parseDrops('.000001')).toBe(1n);
      expect(parseDrops('.123456')).toBe(123456n);
    });
  });

  describe('isValidXrpAddress', () => {
    // Valid XRP addresses for testing
    const validAddress = 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh'; // Genesis address
    const validAddress2 = 'rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn'; // Known valid mainnet address

    it('validates correct XRP addresses', () => {
      expect(isValidXrpAddress(validAddress)).toBe(true);
      expect(isValidXrpAddress(validAddress2)).toBe(true);
    });

    it('rejects invalid addresses', () => {
      expect(isValidXrpAddress('')).toBe(false);
      expect(isValidXrpAddress('r')).toBe(false);
      expect(isValidXrpAddress('rShort')).toBe(false);
      expect(isValidXrpAddress('TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW')).toBe(false); // TRON address
      expect(isValidXrpAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44e')).toBe(false); // ETH address
    });

    it('rejects addresses not starting with r', () => {
      expect(isValidXrpAddress('xHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh')).toBe(false);
    });

    it('rejects addresses with invalid characters', () => {
      // 0, O, I, l are not in XRP Base58 alphabet
      expect(isValidXrpAddress('rHb9CJAWyB4rj91VRWn96DkukG4bwdty0h')).toBe(false);
    });
  });

  describe('encodeBase58 / decodeBase58', () => {
    it('encodes and decodes correctly', () => {
      const original = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
      const encoded = encodeBase58(original);
      const decoded = decodeBase58(encoded);

      expect(decoded).toEqual(original);
    });

    it('handles leading zeros', () => {
      const original = new Uint8Array([0x00, 0x00, 0x01, 0x02]);
      const encoded = encodeBase58(original);
      const decoded = decodeBase58(encoded);

      expect(decoded[0]).toBe(0);
      expect(decoded[1]).toBe(0);
    });

    it('throws for invalid characters', () => {
      expect(() => decodeBase58('0')).toThrow('Invalid Base58 character');
      expect(() => decodeBase58('O')).toThrow('Invalid Base58 character');
      expect(() => decodeBase58('I')).toThrow('Invalid Base58 character');
      expect(() => decodeBase58('l')).toThrow('Invalid Base58 character');
    });
  });

  describe('encodeCurrencyCode', () => {
    it('encodes 3-char currency codes', () => {
      const encoded = encodeCurrencyCode('USD');
      expect(encoded).toHaveLength(40);
      expect(encoded).toMatch(/^[0-9A-F]+$/);
    });

    it('passes through 40-char hex codes', () => {
      const hex = '0'.repeat(40);
      expect(encodeCurrencyCode(hex)).toBe(hex.toUpperCase());
    });

    it('throws for invalid currency codes', () => {
      expect(() => encodeCurrencyCode('AB')).toThrow('Invalid currency code');
      expect(() => encodeCurrencyCode('TOOLONG')).toThrow('Invalid currency code');
    });
  });

  describe('decodeCurrencyCode', () => {
    it('decodes standard 3-char currencies', () => {
      const encoded = encodeCurrencyCode('USD');
      expect(decodeCurrencyCode(encoded)).toBe('USD');
    });

    it('returns hex for non-standard currencies', () => {
      const nonStandard = 'F'.repeat(40);
      expect(decodeCurrencyCode(nonStandard)).toBe(nonStandard);
    });

    it('returns input for non-40-char strings', () => {
      expect(decodeCurrencyCode('USD')).toBe('USD');
    });
  });

  describe('classifyTransaction', () => {
    it('classifies native XRP payment', () => {
      const tx = {
        TransactionType: XRP_TRANSACTION_TYPES.PAYMENT,
        Amount: '1000000',
        Destination: 'rDestination',
      };
      expect(classifyTransaction(tx)).toBe('native-transfer');
    });

    it('classifies issued currency payment', () => {
      const tx = {
        TransactionType: XRP_TRANSACTION_TYPES.PAYMENT,
        Amount: {
          currency: 'USD',
          issuer: 'rIssuer',
          value: '100',
        },
        Destination: 'rDestination',
      };
      expect(classifyTransaction(tx)).toBe('token-transfer');
    });

    it('classifies trust set as approval', () => {
      const tx = {
        TransactionType: XRP_TRANSACTION_TYPES.TRUST_SET,
      };
      expect(classifyTransaction(tx)).toBe('approval');
    });

    it('classifies other transactions as unknown', () => {
      const tx = {
        TransactionType: XRP_TRANSACTION_TYPES.OFFER_CREATE,
      };
      expect(classifyTransaction(tx)).toBe('unknown');
    });
  });

  describe('time conversion', () => {
    it('converts between Ripple and Unix time', () => {
      const unixTime = Math.floor(Date.now() / 1000);
      const rippleTime = unixToRippleTime(unixTime);
      const backToUnix = rippleToUnixTime(rippleTime);

      expect(backToUnix).toBe(unixTime);
    });

    it('rippleTimeNow returns a positive number', () => {
      const now = rippleTimeNow();
      expect(now).toBeGreaterThan(0);
      // Should be roughly current time minus Ripple epoch (946684800)
      expect(now).toBeGreaterThan(700000000); // After ~2022
    });
  });

  describe('constants', () => {
    it('has correct DROPS_PER_XRP', () => {
      expect(DROPS_PER_XRP).toBe(1000000n);
    });

    it('has correct XRP_DECIMALS', () => {
      expect(XRP_DECIMALS).toBe(6);
    });

    it('has expected transaction types', () => {
      expect(XRP_TRANSACTION_TYPES.PAYMENT).toBe('Payment');
      expect(XRP_TRANSACTION_TYPES.TRUST_SET).toBe('TrustSet');
      expect(XRP_TRANSACTION_TYPES.OFFER_CREATE).toBe('OfferCreate');
    });
  });
});
