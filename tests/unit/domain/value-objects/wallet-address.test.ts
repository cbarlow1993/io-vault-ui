import { describe, expect, it } from 'vitest';
import { WalletAddress, InvalidAddressError } from '@/src/domain/value-objects/index.js';
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

describe('WalletAddress', () => {
  const chainAlias = 'ethereum' as ChainAlias;

  describe('create', () => {
    it('creates a WalletAddress from valid string', () => {
      const addr = WalletAddress.create('0xAbC123', chainAlias);
      expect(addr.original).toBe('0xAbC123');
      expect(addr.chainAlias).toBe('ethereum');
    });

    it('normalizes address to lowercase', () => {
      const addr = WalletAddress.create('0xAbCdEf123456', chainAlias);
      expect(addr.normalized).toBe('0xabcdef123456');
    });

    it('trims whitespace', () => {
      const addr = WalletAddress.create('  0xabc  ', chainAlias);
      expect(addr.original).toBe('0xabc');
      expect(addr.normalized).toBe('0xabc');
    });

    it('throws InvalidAddressError for empty string', () => {
      expect(() => WalletAddress.create('', chainAlias)).toThrow(InvalidAddressError);
      expect(() => WalletAddress.create('   ', chainAlias)).toThrow(InvalidAddressError);
    });

    it('throws InvalidAddressError for null/undefined', () => {
      expect(() => WalletAddress.create(null as unknown as string, chainAlias)).toThrow(
        InvalidAddressError
      );
      expect(() => WalletAddress.create(undefined as unknown as string, chainAlias)).toThrow(
        InvalidAddressError
      );
    });
  });

  describe('fromNormalized', () => {
    it('creates from already-normalized address', () => {
      const addr = WalletAddress.fromNormalized('0xabc123', chainAlias);
      expect(addr.normalized).toBe('0xabc123');
      expect(addr.original).toBe('0xabc123');
    });
  });

  describe('equals', () => {
    it('returns true for same normalized address and chain', () => {
      const a = WalletAddress.create('0xABC', chainAlias);
      const b = WalletAddress.create('0xabc', chainAlias);
      expect(a.equals(b)).toBe(true);
    });

    it('returns false for different addresses', () => {
      const a = WalletAddress.create('0xABC', chainAlias);
      const b = WalletAddress.create('0xDEF', chainAlias);
      expect(a.equals(b)).toBe(false);
    });

    it('returns false for same address on different chains', () => {
      const a = WalletAddress.create('0xABC', 'ethereum' as ChainAlias);
      const b = WalletAddress.create('0xABC', 'polygon' as ChainAlias);
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('matches', () => {
    it('matches case-insensitively', () => {
      const addr = WalletAddress.create('0xAbC', chainAlias);
      expect(addr.matches('0xabc')).toBe(true);
      expect(addr.matches('0xABC')).toBe(true);
      expect(addr.matches('0xAbC')).toBe(true);
    });

    it('trims input for matching', () => {
      const addr = WalletAddress.create('0xabc', chainAlias);
      expect(addr.matches('  0xabc  ')).toBe(true);
    });

    it('returns false for non-matching address', () => {
      const addr = WalletAddress.create('0xabc', chainAlias);
      expect(addr.matches('0xdef')).toBe(false);
    });
  });

  describe('forStorage', () => {
    it('returns normalized address', () => {
      const addr = WalletAddress.create('0xAbC', chainAlias);
      expect(addr.forStorage()).toBe('0xabc');
    });
  });

  describe('display', () => {
    it('returns original address', () => {
      const addr = WalletAddress.create('0xAbC123', chainAlias);
      expect(addr.display).toBe('0xAbC123');
    });
  });

  describe('toJSON', () => {
    it('serializes correctly', () => {
      const addr = WalletAddress.create('0xAbC', chainAlias);
      expect(addr.toJSON()).toEqual({
        address: '0xabc',
        chainAlias: 'ethereum',
      });
    });
  });

  describe('toString', () => {
    it('returns normalized address', () => {
      const addr = WalletAddress.create('0xAbC', chainAlias);
      expect(addr.toString()).toBe('0xabc');
    });
  });

  describe('immutability', () => {
    it('is frozen', () => {
      const addr = WalletAddress.create('0xabc', chainAlias);
      expect(Object.isFrozen(addr)).toBe(true);
    });
  });
});
