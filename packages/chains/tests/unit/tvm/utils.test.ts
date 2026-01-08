// packages/chains/tests/unit/tvm/utils.test.ts

import { describe, it, expect } from 'vitest';
import {
  formatSun,
  parseSun,
  isValidTronAddress,
  addressToHex,
  hexToAddress,
  isHexAddress,
  encodeTrc20Transfer,
  decodeTrc20Transfer,
  encodeBalanceOf,
  encodeDecimals,
  encodeSymbol,
  estimateBandwidth,
  estimateEnergy,
  calculateFeeLimit,
  SUN_PER_TRX,
  TRX_DECIMALS,
  CONTRACT_TYPES,
} from '../../../src/tvm/utils.js';

describe('TVM Utils', () => {
  describe('formatSun', () => {
    it('formats SUN to TRX correctly', () => {
      expect(formatSun(1000000n)).toBe('1');
      expect(formatSun(1500000n)).toBe('1.5');
      expect(formatSun(1234567n)).toBe('1.234567');
      expect(formatSun(100000n)).toBe('0.1');
      expect(formatSun(1n)).toBe('0.000001');
    });

    it('handles zero', () => {
      expect(formatSun(0n)).toBe('0');
    });

    it('handles large amounts', () => {
      expect(formatSun(1000000000000n)).toBe('1000000');
    });

    it('handles negative amounts', () => {
      expect(formatSun(-1000000n)).toBe('-1');
    });

    it('respects custom decimals', () => {
      expect(formatSun(100n, 2)).toBe('1');
      expect(formatSun(150n, 2)).toBe('1.5');
    });
  });

  describe('parseSun', () => {
    it('parses TRX to SUN correctly', () => {
      expect(parseSun('1')).toBe(1000000n);
      expect(parseSun('1.5')).toBe(1500000n);
      expect(parseSun('0.1')).toBe(100000n);
      expect(parseSun('0.000001')).toBe(1n);
    });

    it('handles zero', () => {
      expect(parseSun('0')).toBe(0n);
    });

    it('handles large amounts', () => {
      expect(parseSun('1000000')).toBe(1000000000000n);
    });

    it('handles decimals beyond precision', () => {
      // Should truncate to 6 decimals
      expect(parseSun('1.1234567')).toBe(1123456n);
    });
  });

  describe('isValidTronAddress', () => {
    it('validates correct TRON addresses', () => {
      // Valid mainnet addresses start with T
      expect(isValidTronAddress('TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW')).toBe(true);
      expect(isValidTronAddress('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t')).toBe(true);
    });

    it('rejects invalid addresses', () => {
      expect(isValidTronAddress('')).toBe(false);
      expect(isValidTronAddress('T')).toBe(false);
      expect(isValidTronAddress('TShort')).toBe(false);
      expect(isValidTronAddress('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2')).toBe(false); // BTC address
      expect(isValidTronAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44e')).toBe(false); // ETH address
    });

    it('rejects addresses with invalid characters', () => {
      expect(isValidTronAddress('TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxOO')).toBe(false); // O not in base58
      expect(isValidTronAddress('TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sx0I')).toBe(false); // 0 and I not in base58
    });
  });

  describe('addressToHex / hexToAddress', () => {
    it('converts base58 to hex and back', () => {
      const base58 = 'TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW';
      const hex = addressToHex(base58);
      expect(hex).toMatch(/^41[0-9a-f]{40}$/i);
    });

    it('throws for invalid address in addressToHex', () => {
      expect(() => addressToHex('invalid')).toThrow();
    });

    it('handles hex with different formats', () => {
      // With 41 prefix
      const hex1 = '41' + '0'.repeat(40);
      expect(() => hexToAddress(hex1)).not.toThrow();

      // Without 41 prefix (40 chars)
      const hex2 = '0'.repeat(40);
      expect(() => hexToAddress(hex2)).not.toThrow();
    });
  });

  describe('isHexAddress', () => {
    it('validates hex addresses', () => {
      expect(isHexAddress('41' + 'a'.repeat(40))).toBe(true);
      expect(isHexAddress('a'.repeat(40))).toBe(true);
      expect(isHexAddress('0x' + 'a'.repeat(40))).toBe(true);
    });

    it('rejects invalid hex addresses', () => {
      expect(isHexAddress('')).toBe(false);
      expect(isHexAddress('short')).toBe(false);
      expect(isHexAddress('g'.repeat(40))).toBe(false); // g not valid hex
    });
  });

  describe('encodeTrc20Transfer', () => {
    it('encodes transfer correctly', () => {
      const to = '0'.repeat(40);
      const amount = 1000000n;
      const data = encodeTrc20Transfer(to, amount);

      expect(data.startsWith('a9059cbb')).toBe(true);
      expect(data.length).toBe(136); // 8 (selector) + 64 (address) + 64 (amount)
    });

    it('pads address and amount correctly', () => {
      const to = 'abcd' + '0'.repeat(36);
      const amount = 255n;
      const data = encodeTrc20Transfer(to, amount);

      // Address should be left-padded with zeros
      expect(data.slice(8, 72)).toBe('0'.repeat(24) + 'abcd' + '0'.repeat(36));
      // Amount should be left-padded
      expect(data.slice(72, 136)).toBe('0'.repeat(62) + 'ff');
    });
  });

  describe('decodeTrc20Transfer', () => {
    it('decodes transfer correctly', () => {
      const to = '41' + 'a'.repeat(40);
      const amount = 1000000n;
      const data = encodeTrc20Transfer(to.slice(2), amount);

      const decoded = decodeTrc20Transfer(data);
      expect(decoded).not.toBeNull();
      expect(decoded!.amount).toBe(amount);
    });

    it('returns null for non-transfer data', () => {
      expect(decodeTrc20Transfer('deadbeef')).toBeNull();
      expect(decodeTrc20Transfer('')).toBeNull();
    });
  });

  describe('encodeBalanceOf', () => {
    it('encodes balanceOf correctly', () => {
      const address = 'TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW';
      const data = encodeBalanceOf(address);

      expect(data.startsWith('70a08231')).toBe(true);
      expect(data.length).toBe(72); // 8 (selector) + 64 (address)
    });
  });

  describe('encodeDecimals', () => {
    it('returns correct selector', () => {
      expect(encodeDecimals()).toBe('313ce567');
    });
  });

  describe('encodeSymbol', () => {
    it('returns correct selector', () => {
      expect(encodeSymbol()).toBe('95d89b41');
    });
  });

  describe('estimateBandwidth', () => {
    it('estimates bandwidth based on size', () => {
      expect(estimateBandwidth(100)).toBe(100);
      expect(estimateBandwidth(270)).toBe(270);
    });
  });

  describe('estimateEnergy', () => {
    it('returns 0 for simple transfers', () => {
      expect(estimateEnergy(true)).toBe(0);
    });

    it('returns energy estimate for contract calls', () => {
      expect(estimateEnergy(false)).toBe(30000);
    });
  });

  describe('calculateFeeLimit', () => {
    it('calculates fee limit correctly', () => {
      expect(calculateFeeLimit(30000)).toBe(BigInt(30000 * 420));
      expect(calculateFeeLimit(30000, 420)).toBe(12600000n);
    });

    it('uses custom energy price', () => {
      expect(calculateFeeLimit(1000, 500)).toBe(500000n);
    });
  });

  describe('constants', () => {
    it('has correct SUN_PER_TRX', () => {
      expect(SUN_PER_TRX).toBe(1000000n);
    });

    it('has correct TRX_DECIMALS', () => {
      expect(TRX_DECIMALS).toBe(6);
    });

    it('has expected CONTRACT_TYPES', () => {
      expect(CONTRACT_TYPES.TRANSFER).toBe('TransferContract');
      expect(CONTRACT_TYPES.TRC20_TRANSFER).toBe('TriggerSmartContract');
      expect(CONTRACT_TYPES.CREATE_SMART_CONTRACT).toBe('CreateSmartContract');
    });
  });
});
