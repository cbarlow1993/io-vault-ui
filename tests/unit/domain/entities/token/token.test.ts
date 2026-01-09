import { describe, expect, it } from 'vitest';
import { Token, InvalidTokenError } from '@/src/domain/entities/index.js';
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

describe('Token', () => {
  const chainAlias = 'ethereum' as ChainAlias;

  describe('create', () => {
    it('creates a Token entity with required fields', () => {
      const token = Token.create({
        id: 'token-123',
        chainAlias,
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
      });

      expect(token.id).toBe('token-123');
      expect(token.chainAlias).toBe('ethereum');
      expect(token.name).toBe('USD Coin');
      expect(token.symbol).toBe('USDC');
      expect(token.decimals).toBe(6);
      expect(token.isNative).toBe(false);
    });

    it('creates a Token with metadata', () => {
      const token = Token.create({
        id: 'token-123',
        chainAlias,
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        logoUri: 'https://example.com/logo.png',
        coingeckoId: 'usd-coin',
        isVerified: true,
      });

      expect(token.logoUri).toBe('https://example.com/logo.png');
      expect(token.coingeckoId).toBe('usd-coin');
      expect(token.isVerified).toBe(true);
    });

    it('throws for invalid decimals (negative)', () => {
      expect(() =>
        Token.create({
          id: 'token-123',
          chainAlias,
          address: '0xabc',
          name: 'Test',
          symbol: 'TST',
          decimals: -1,
        })
      ).toThrow(InvalidTokenError);
    });

    it('throws for invalid decimals (too high)', () => {
      expect(() =>
        Token.create({
          id: 'token-123',
          chainAlias,
          address: '0xabc',
          name: 'Test',
          symbol: 'TST',
          decimals: 78,
        })
      ).toThrow(InvalidTokenError);
    });

    it('normalizes address to lowercase', () => {
      const token = Token.create({
        id: 'token-123',
        chainAlias,
        address: '0xAbCdEf',
        name: 'Test',
        symbol: 'TST',
        decimals: 18,
      });

      expect(token.address.normalized).toBe('0xabcdef');
    });
  });

  describe('native', () => {
    it('creates a native token', () => {
      const eth = Token.native('ethereum' as ChainAlias, 'Ethereum', 'ETH', 18, 'ethereum');

      expect(eth.isNative).toBe(true);
      expect(eth.address.isNative).toBe(true);
      expect(eth.name).toBe('Ethereum');
      expect(eth.symbol).toBe('ETH');
      expect(eth.decimals).toBe(18);
      expect(eth.coingeckoId).toBe('ethereum');
      expect(eth.isVerified).toBe(true);
    });

    it('creates native token without coingeckoId', () => {
      const native = Token.native('solana' as ChainAlias, 'Solana', 'SOL', 9);

      expect(native.coingeckoId).toBeNull();
    });
  });

  describe('formatAmount', () => {
    it('formats raw amount using token decimals', () => {
      const token = Token.create({
        id: 'token-123',
        chainAlias,
        address: '0xabc',
        name: 'Test',
        symbol: 'TST',
        decimals: 6,
      });

      const amount = token.formatAmount('1000000');
      expect(amount.formatted).toBe('1');
    });

    it('handles 18 decimal tokens', () => {
      const token = Token.create({
        id: 'token-123',
        chainAlias,
        address: '0xabc',
        name: 'Test',
        symbol: 'TST',
        decimals: 18,
      });

      const amount = token.formatAmount('1000000000000000000');
      expect(amount.formatted).toBe('1');
    });
  });

  describe('calculateValue', () => {
    it('calculates USD value from amount and price', () => {
      const token = Token.create({
        id: 'token-123',
        chainAlias,
        address: '0xabc',
        name: 'Test',
        symbol: 'TST',
        decimals: 6,
      });

      const amount = token.formatAmount('1000000'); // 1 token
      const value = token.calculateValue(amount, 100);

      expect(value).toBe(100);
    });

    it('returns null when price is null', () => {
      const token = Token.create({
        id: 'token-123',
        chainAlias,
        address: '0xabc',
        name: 'Test',
        symbol: 'TST',
        decimals: 6,
      });

      const amount = token.formatAmount('1000000');
      const value = token.calculateValue(amount, null);

      expect(value).toBeNull();
    });
  });

  describe('isSpam / riskLevel', () => {
    it('returns false for empty classification', () => {
      const token = Token.create({
        id: 'token-123',
        chainAlias,
        address: '0xabc',
        name: 'Test',
        symbol: 'TST',
        decimals: 18,
      });

      expect(token.isSpam).toBe(false);
      expect(token.riskLevel).toBe('safe');
    });

    it('returns true for dangerous classification', () => {
      const token = Token.create({
        id: 'token-123',
        chainAlias,
        address: '0xabc',
        name: 'Scam Token',
        symbol: 'SCAM',
        decimals: 18,
        classification: {
          blockaid: {
            isMalicious: true,
            isPhishing: false,
            riskScore: 100,
            attackTypes: [],
            checkedAt: new Date().toISOString(),
          },
          coingecko: { isListed: false, marketCapRank: null },
          heuristics: null,
          userOverride: null,
          classifiedAt: new Date(),
        },
      });

      expect(token.isSpam).toBe(true);
      expect(token.riskLevel).toBe('danger');
    });
  });

  describe('isEffectivelySpam', () => {
    it('respects user override to trusted', () => {
      const token = Token.create({
        id: 'token-123',
        chainAlias,
        address: '0xabc',
        name: 'Risky',
        symbol: 'RISK',
        decimals: 18,
        classification: {
          blockaid: {
            isMalicious: true,
            isPhishing: false,
            riskScore: 100,
            attackTypes: [],
            checkedAt: new Date().toISOString(),
          },
          coingecko: { isListed: false, marketCapRank: null },
          heuristics: null,
          userOverride: null,
          classifiedAt: new Date(),
        },
      });

      expect(token.isEffectivelySpam('trusted')).toBe(false);
    });

    it('respects user override to spam', () => {
      const token = Token.create({
        id: 'token-123',
        chainAlias,
        address: '0xabc',
        name: 'Safe Token',
        symbol: 'SAFE',
        decimals: 18,
        classification: {
          blockaid: null,
          coingecko: { isListed: true, marketCapRank: 10 },
          heuristics: null,
          userOverride: null,
          classifiedAt: new Date(),
        },
      });

      expect(token.isEffectivelySpam('spam')).toBe(true);
    });
  });

  describe('hasSuspiciousName', () => {
    it('returns false for normal name', () => {
      const token = Token.create({
        id: 'token-123',
        chainAlias,
        address: '0xabc',
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
      });

      expect(token.hasSuspiciousName).toBe(false);
    });

    it('returns true for suspicious name', () => {
      const token = Token.create({
        id: 'token-123',
        chainAlias,
        address: '0xabc',
        name: 'Claim at scam.com',
        symbol: 'SCAM',
        decimals: 18,
      });

      expect(token.hasSuspiciousName).toBe(true);
    });
  });

  describe('withClassification', () => {
    it('creates new token with updated classification', () => {
      const original = Token.create({
        id: 'token-123',
        chainAlias,
        address: '0xabc',
        name: 'Test',
        symbol: 'TST',
        decimals: 18,
      });

      const updated = original.withClassification({
        blockaid: {
          isMalicious: true,
          isPhishing: false,
          riskScore: 100,
          attackTypes: [],
          checkedAt: new Date().toISOString(),
        },
        coingecko: { isListed: false, marketCapRank: null },
        heuristics: null,
        userOverride: null,
        classifiedAt: new Date(),
      });

      expect(updated.id).toBe(original.id);
      expect(updated.isSpam).toBe(true);
      expect(original.isSpam).toBe(false);
    });
  });

  describe('withMetadata', () => {
    it('creates new token with updated metadata', () => {
      const original = Token.create({
        id: 'token-123',
        chainAlias,
        address: '0xabc',
        name: 'Test',
        symbol: 'TST',
        decimals: 18,
      });

      const updated = original.withMetadata({
        logoUri: 'https://example.com/logo.png',
        isVerified: true,
      });

      expect(updated.logoUri).toBe('https://example.com/logo.png');
      expect(updated.isVerified).toBe(true);
      expect(original.logoUri).toBeNull();
    });
  });

  describe('equals', () => {
    it('returns true for same id', () => {
      const a = Token.create({
        id: 'token-123',
        chainAlias,
        address: '0xabc',
        name: 'Test',
        symbol: 'TST',
        decimals: 18,
      });

      const b = Token.create({
        id: 'token-123',
        chainAlias,
        address: '0xdef',
        name: 'Different',
        symbol: 'DIF',
        decimals: 6,
      });

      expect(a.equals(b)).toBe(true);
    });

    it('returns false for different id', () => {
      const a = Token.create({
        id: 'token-123',
        chainAlias,
        address: '0xabc',
        name: 'Test',
        symbol: 'TST',
        decimals: 18,
      });

      const b = Token.create({
        id: 'token-456',
        chainAlias,
        address: '0xabc',
        name: 'Test',
        symbol: 'TST',
        decimals: 18,
      });

      expect(a.equals(b)).toBe(false);
    });
  });

  describe('immutability', () => {
    it('is frozen', () => {
      const token = Token.create({
        id: 'token-123',
        chainAlias,
        address: '0xabc',
        name: 'Test',
        symbol: 'TST',
        decimals: 18,
      });

      expect(Object.isFrozen(token)).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('serializes correctly', () => {
      const token = Token.create({
        id: 'token-123',
        chainAlias,
        address: '0xAbC',
        name: 'Test Token',
        symbol: 'TST',
        decimals: 18,
        coingeckoId: 'test-token',
        isVerified: true,
      });

      const json = token.toJSON();

      expect(json).toMatchObject({
        id: 'token-123',
        chainAlias: 'ethereum',
        address: '0xabc',
        isNative: false,
        name: 'Test Token',
        symbol: 'TST',
        decimals: 18,
        coingeckoId: 'test-token',
        isVerified: true,
      });
    });
  });
});
