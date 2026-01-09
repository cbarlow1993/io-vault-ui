// packages/chains/tests/unit/substrate/utils.test.ts

import { describe, it, expect } from 'vitest';
import {
  encodeAddress,
  decodeAddress,
  isValidSubstrateAddress,
  formatPlanck,
  parsePlanck,
  encodeCompact,
  decodeCompact,
  hexToBytes,
  bytesToHex,
  encodeBase58,
  decodeBase58,
} from '../../../src/substrate/utils.js';

describe('Substrate Utils', () => {
  // Known valid Bittensor address (SS58 prefix 42)
  const validAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
  const validPublicKey = new Uint8Array([
    0xd4, 0x35, 0x93, 0xc7, 0x15, 0xfd, 0xd3, 0x1c, 0x61, 0x14, 0x1a, 0xbd, 0x04, 0xa9, 0x9f, 0xd6,
    0x82, 0x2c, 0x85, 0x58, 0x85, 0x4c, 0xcd, 0xe3, 0x9a, 0x56, 0x84, 0xe7, 0xa5, 0x6d, 0xa2, 0x7d,
  ]);

  describe('Base58', () => {
    it('encodes and decodes Base58', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const encoded = encodeBase58(data);
      const decoded = decodeBase58(encoded);
      expect(decoded).toEqual(data);
    });

    it('handles leading zeros', () => {
      const data = new Uint8Array([0, 0, 1, 2, 3]);
      const encoded = encodeBase58(data);
      expect(encoded.startsWith('11')).toBe(true);
      const decoded = decodeBase58(encoded);
      expect(decoded).toEqual(data);
    });

    it('throws on invalid Base58 characters', () => {
      expect(() => decodeBase58('0OIl')).toThrow('Invalid Base58 character');
    });
  });

  describe('SS58 Address Encoding', () => {
    it('encodes public key to SS58 address', () => {
      const address = encodeAddress(validPublicKey, 42);
      expect(address).toBe(validAddress);
    });

    it('decodes SS58 address to public key', () => {
      const { publicKey, ss58Prefix } = decodeAddress(validAddress);
      expect(publicKey).toEqual(validPublicKey);
      expect(ss58Prefix).toBe(42);
    });

    it('throws on invalid public key length', () => {
      const shortKey = new Uint8Array(16);
      expect(() => encodeAddress(shortKey, 42)).toThrow('Invalid public key length');
    });

    it('throws on too-short address', () => {
      expect(() => decodeAddress('abc')).toThrow('Invalid SS58 address');
    });

    it('throws on checksum mismatch', () => {
      // Tampered address (changed last character)
      const tamperedAddress = validAddress.slice(0, -1) + 'Z';
      expect(() => decodeAddress(tamperedAddress)).toThrow();
    });

    it('handles two-byte prefix', () => {
      // Prefix 200 requires two bytes
      const address = encodeAddress(validPublicKey, 200);
      const { ss58Prefix } = decodeAddress(address);
      expect(ss58Prefix).toBe(200);
    });
  });

  describe('Address Validation', () => {
    it('validates correct address', () => {
      expect(isValidSubstrateAddress(validAddress)).toBe(true);
    });

    it('validates with expected prefix', () => {
      expect(isValidSubstrateAddress(validAddress, 42)).toBe(true);
    });

    it('rejects with wrong prefix', () => {
      expect(isValidSubstrateAddress(validAddress, 0)).toBe(false);
    });

    it('rejects invalid address', () => {
      expect(isValidSubstrateAddress('invalid')).toBe(false);
      expect(isValidSubstrateAddress('')).toBe(false);
      expect(isValidSubstrateAddress(null as unknown as string)).toBe(false);
    });
  });

  describe('Planck Formatting', () => {
    it('formats zero', () => {
      expect(formatPlanck(0n)).toBe('0');
    });

    it('formats whole numbers', () => {
      expect(formatPlanck(1000000000n, 9)).toBe('1');
      expect(formatPlanck(5000000000n, 9)).toBe('5');
    });

    it('formats fractional numbers', () => {
      expect(formatPlanck(1500000000n, 9)).toBe('1.5');
      expect(formatPlanck(1234567890n, 9)).toBe('1.23456789');
    });

    it('trims trailing zeros', () => {
      expect(formatPlanck(1100000000n, 9)).toBe('1.1');
    });
  });

  describe('Planck Parsing', () => {
    it('parses whole numbers', () => {
      expect(parsePlanck('1', 9)).toBe(1000000000n);
      expect(parsePlanck('5', 9)).toBe(5000000000n);
    });

    it('parses fractional numbers', () => {
      expect(parsePlanck('1.5', 9)).toBe(1500000000n);
      expect(parsePlanck('0.123456789', 9)).toBe(123456789n);
    });

    it('truncates extra decimals', () => {
      expect(parsePlanck('1.1234567891', 9)).toBe(1123456789n);
    });
  });

  describe('Compact Encoding', () => {
    it('encodes single-byte mode (0-63)', () => {
      const encoded = encodeCompact(42n);
      expect(encoded).toEqual(new Uint8Array([168])); // 42 << 2 = 168
    });

    it('encodes two-byte mode (64-16383)', () => {
      const encoded = encodeCompact(100n);
      expect(encoded.length).toBe(2);
      expect(encoded[0] & 0x03).toBe(0x01);
    });

    it('encodes four-byte mode (16384-1073741823)', () => {
      const encoded = encodeCompact(100000n);
      expect(encoded.length).toBe(4);
      expect(encoded[0] & 0x03).toBe(0x02);
    });

    it('encodes big integer mode', () => {
      const bigValue = 1000000000000n;
      const encoded = encodeCompact(bigValue);
      expect(encoded[0] & 0x03).toBe(0x03);
    });
  });

  describe('Compact Decoding', () => {
    it('decodes single-byte mode', () => {
      const { value, bytesRead } = decodeCompact(new Uint8Array([168]));
      expect(value).toBe(42n);
      expect(bytesRead).toBe(1);
    });

    it('decodes two-byte mode', () => {
      const encoded = encodeCompact(100n);
      const { value } = decodeCompact(encoded);
      expect(value).toBe(100n);
    });

    it('decodes four-byte mode', () => {
      const encoded = encodeCompact(100000n);
      const { value } = decodeCompact(encoded);
      expect(value).toBe(100000n);
    });

    it('round-trips big integers', () => {
      const original = 1000000000000n;
      const encoded = encodeCompact(original);
      const { value } = decodeCompact(encoded);
      expect(value).toBe(original);
    });
  });

  describe('Hex Conversion', () => {
    it('converts bytes to hex with prefix', () => {
      const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
      expect(bytesToHex(bytes)).toBe('0xdeadbeef');
    });

    it('converts bytes to hex without prefix', () => {
      const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
      expect(bytesToHex(bytes, false)).toBe('deadbeef');
    });

    it('converts hex to bytes with prefix', () => {
      const bytes = hexToBytes('0xdeadbeef');
      expect(bytes).toEqual(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
    });

    it('converts hex to bytes without prefix', () => {
      const bytes = hexToBytes('deadbeef');
      expect(bytes).toEqual(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
    });

    it('throws on odd-length hex', () => {
      expect(() => hexToBytes('0xdea')).toThrow('Invalid hex string');
    });
  });
});
