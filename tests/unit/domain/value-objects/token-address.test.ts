import { describe, expect, it } from 'vitest';
import {
  TokenAddress,
  NATIVE_TOKEN_ADDRESS,
  InvalidAddressError,
} from '@/src/domain/value-objects/index.js';
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

describe('TokenAddress', () => {
  const chainAlias = 'ethereum' as ChainAlias;

  describe('create', () => {
    it('creates a TokenAddress from valid string', () => {
      const addr = TokenAddress.create('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', chainAlias);
      expect(addr.isNative).toBe(false);
      expect(addr.value).toBe('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
    });

    it('normalizes address to lowercase', () => {
      const addr = TokenAddress.create('0xAbCdEf', chainAlias);
      expect(addr.normalized).toBe('0xabcdef');
    });

    it('creates native token for null', () => {
      const addr = TokenAddress.create(null, chainAlias);
      expect(addr.isNative).toBe(true);
      expect(addr.value).toBeNull();
    });

    it('creates native token for undefined', () => {
      const addr = TokenAddress.create(undefined, chainAlias);
      expect(addr.isNative).toBe(true);
    });

    it('creates native token for "native" string', () => {
      const addr = TokenAddress.create(NATIVE_TOKEN_ADDRESS, chainAlias);
      expect(addr.isNative).toBe(true);
      expect(addr.value).toBeNull();
    });

    it('throws InvalidAddressError for empty string', () => {
      expect(() => TokenAddress.create('', chainAlias)).toThrow(InvalidAddressError);
      expect(() => TokenAddress.create('   ', chainAlias)).toThrow(InvalidAddressError);
    });
  });

  describe('native', () => {
    it('creates native token address explicitly', () => {
      const addr = TokenAddress.native(chainAlias);
      expect(addr.isNative).toBe(true);
      expect(addr.value).toBeNull();
      expect(addr.display).toBe('native');
    });
  });

  describe('isNative', () => {
    it('returns true for native token', () => {
      const addr = TokenAddress.native(chainAlias);
      expect(addr.isNative).toBe(true);
    });

    it('returns false for contract address', () => {
      const addr = TokenAddress.create('0xabc', chainAlias);
      expect(addr.isNative).toBe(false);
    });
  });

  describe('display', () => {
    it('returns "native" for native token', () => {
      const addr = TokenAddress.native(chainAlias);
      expect(addr.display).toBe('native');
    });

    it('returns original address for contract', () => {
      const addr = TokenAddress.create('0xAbC', chainAlias);
      expect(addr.display).toBe('0xAbC');
    });
  });

  describe('equals', () => {
    it('returns true for same contract address and chain', () => {
      const a = TokenAddress.create('0xABC', chainAlias);
      const b = TokenAddress.create('0xabc', chainAlias);
      expect(a.equals(b)).toBe(true);
    });

    it('returns true for both native on same chain', () => {
      const a = TokenAddress.native(chainAlias);
      const b = TokenAddress.create(null, chainAlias);
      expect(a.equals(b)).toBe(true);
    });

    it('returns false for native vs contract', () => {
      const a = TokenAddress.native(chainAlias);
      const b = TokenAddress.create('0xabc', chainAlias);
      expect(a.equals(b)).toBe(false);
    });

    it('returns false for different chains', () => {
      const a = TokenAddress.create('0xabc', 'ethereum' as ChainAlias);
      const b = TokenAddress.create('0xabc', 'polygon' as ChainAlias);
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('matches', () => {
    it('matches contract address case-insensitively', () => {
      const addr = TokenAddress.create('0xAbC', chainAlias);
      expect(addr.matches('0xabc')).toBe(true);
      expect(addr.matches('0xABC')).toBe(true);
    });

    it('matches null for native token', () => {
      const addr = TokenAddress.native(chainAlias);
      expect(addr.matches(null)).toBe(true);
      expect(addr.matches(undefined)).toBe(true);
      expect(addr.matches('native')).toBe(true);
    });

    it('returns false for mismatched addresses', () => {
      const addr = TokenAddress.create('0xabc', chainAlias);
      expect(addr.matches('0xdef')).toBe(false);
    });
  });

  describe('forStorage', () => {
    it('returns normalized address for contract', () => {
      const addr = TokenAddress.create('0xAbC', chainAlias);
      expect(addr.forStorage()).toBe('0xabc');
    });

    it('returns null for native', () => {
      const addr = TokenAddress.native(chainAlias);
      expect(addr.forStorage()).toBeNull();
    });
  });

  describe('toJSON', () => {
    it('serializes contract address correctly', () => {
      const addr = TokenAddress.create('0xAbC', chainAlias);
      expect(addr.toJSON()).toEqual({
        address: '0xabc',
        isNative: false,
        chainAlias: 'ethereum',
      });
    });

    it('serializes native token correctly', () => {
      const addr = TokenAddress.native(chainAlias);
      expect(addr.toJSON()).toEqual({
        address: null,
        isNative: true,
        chainAlias: 'ethereum',
      });
    });
  });

  describe('toString', () => {
    it('returns display value', () => {
      const contract = TokenAddress.create('0xabc', chainAlias);
      expect(contract.toString()).toBe('0xabc');

      const native = TokenAddress.native(chainAlias);
      expect(native.toString()).toBe('native');
    });
  });

  describe('immutability', () => {
    it('is frozen', () => {
      const addr = TokenAddress.create('0xabc', chainAlias);
      expect(Object.isFrozen(addr)).toBe(true);
    });
  });
});
