import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { TokenPrice, InvalidPriceError, SUPPORTED_CURRENCIES } from '@/src/domain/value-objects/token-price.js';

describe('TokenPrice', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('create', () => {
    it('creates a TokenPrice from valid data', () => {
      const price = TokenPrice.create({
        coingeckoId: 'bitcoin',
        price: 50000,
        currency: 'usd',
        priceChange24h: 2.5,
        marketCap: 900000000000,
      });

      expect(price.coingeckoId).toBe('bitcoin');
      expect(price.price).toBe(50000);
      expect(price.currency).toBe('usd');
      expect(price.priceChange24h).toBe(2.5);
      expect(price.marketCap).toBe(900000000000);
    });

    it('creates TokenPrice with null optional fields', () => {
      const price = TokenPrice.create({
        coingeckoId: 'ethereum',
        price: 3000,
        currency: 'usd',
      });

      expect(price.priceChange24h).toBeNull();
      expect(price.marketCap).toBeNull();
    });

    it('throws InvalidPriceError for negative price', () => {
      expect(() =>
        TokenPrice.create({
          coingeckoId: 'bitcoin',
          price: -100,
          currency: 'usd',
        })
      ).toThrow(InvalidPriceError);
    });

    it('throws InvalidPriceError for zero price', () => {
      expect(() =>
        TokenPrice.create({
          coingeckoId: 'bitcoin',
          price: 0,
          currency: 'usd',
        })
      ).toThrow(InvalidPriceError);
    });

    it('normalizes currency to lowercase', () => {
      const price = TokenPrice.create({
        coingeckoId: 'bitcoin',
        price: 50000,
        currency: 'USD',
      });

      expect(price.currency).toBe('usd');
    });

    it('falls back to usd for unsupported currency', () => {
      const price = TokenPrice.create({
        coingeckoId: 'bitcoin',
        price: 50000,
        currency: 'xyz',
      });

      expect(price.currency).toBe('usd');
    });
  });

  describe('unknown', () => {
    it('creates a placeholder for unknown price', () => {
      const price = TokenPrice.unknown('unknown-token');

      expect(price.coingeckoId).toBe('unknown-token');
      expect(price.price).toBe(0);
      expect(price.currency).toBe('usd');
      expect(price.priceChange24h).toBeNull();
      expect(price.marketCap).toBeNull();
    });

    it('is marked as unknown', () => {
      const price = TokenPrice.unknown('unknown-token');
      expect(price.isUnknown).toBe(true);
    });

    it('regular price is not unknown', () => {
      const price = TokenPrice.create({
        coingeckoId: 'bitcoin',
        price: 50000,
        currency: 'usd',
      });
      expect(price.isUnknown).toBe(false);
    });
  });

  describe('isStale', () => {
    it('returns false for fresh price', () => {
      const now = new Date('2024-01-01T12:00:00Z');
      vi.setSystemTime(now);

      const price = TokenPrice.create({
        coingeckoId: 'bitcoin',
        price: 50000,
        currency: 'usd',
        fetchedAt: now,
      });

      expect(price.isStale(60000)).toBe(false); // 60 seconds TTL in ms
    });

    it('returns true for stale price', () => {
      const fetchedAt = new Date('2024-01-01T12:00:00Z');
      const now = new Date('2024-01-01T12:02:00Z'); // 2 minutes later
      vi.setSystemTime(now);

      const price = TokenPrice.create({
        coingeckoId: 'bitcoin',
        price: 50000,
        currency: 'usd',
        fetchedAt,
      });

      expect(price.isStale(60000)).toBe(true); // 60 seconds TTL, price is 120s old
    });

    it('returns false at exactly TTL boundary', () => {
      const fetchedAt = new Date('2024-01-01T12:00:00Z');
      const now = new Date('2024-01-01T12:01:00Z'); // exactly 60 seconds later
      vi.setSystemTime(now);

      const price = TokenPrice.create({
        coingeckoId: 'bitcoin',
        price: 50000,
        currency: 'usd',
        fetchedAt,
      });

      expect(price.isStale(60000)).toBe(false); // At boundary, not stale
    });
  });

  describe('calculateValue', () => {
    it('calculates USD value for a given amount', () => {
      const price = TokenPrice.create({
        coingeckoId: 'bitcoin',
        price: 50000,
        currency: 'usd',
      });

      expect(price.calculateValue(2)).toBe(100000);
    });

    it('handles fractional amounts', () => {
      const price = TokenPrice.create({
        coingeckoId: 'ethereum',
        price: 3000,
        currency: 'usd',
      });

      expect(price.calculateValue(0.5)).toBe(1500);
    });

    it('returns 0 for zero amount', () => {
      const price = TokenPrice.create({
        coingeckoId: 'bitcoin',
        price: 50000,
        currency: 'usd',
      });

      expect(price.calculateValue(0)).toBe(0);
    });
  });

  describe('isSupportedCurrency', () => {
    it('returns true for supported currencies', () => {
      expect(TokenPrice.isSupportedCurrency('usd')).toBe(true);
      expect(TokenPrice.isSupportedCurrency('USD')).toBe(true);
      expect(TokenPrice.isSupportedCurrency('eur')).toBe(true);
      expect(TokenPrice.isSupportedCurrency('btc')).toBe(true);
    });

    it('returns false for unsupported currencies', () => {
      expect(TokenPrice.isSupportedCurrency('xyz')).toBe(false);
      expect(TokenPrice.isSupportedCurrency('')).toBe(false);
    });
  });

  describe('normalizeCurrency', () => {
    it('normalizes and validates currency', () => {
      expect(TokenPrice.normalizeCurrency('USD')).toBe('usd');
      expect(TokenPrice.normalizeCurrency('  EUR  ')).toBe('eur');
    });

    it('returns usd for invalid currency', () => {
      expect(TokenPrice.normalizeCurrency('invalid')).toBe('usd');
    });
  });

  describe('toJSON', () => {
    it('serializes correctly', () => {
      const fetchedAt = new Date('2024-01-01T12:00:00Z');
      const price = TokenPrice.create({
        coingeckoId: 'bitcoin',
        price: 50000,
        currency: 'usd',
        priceChange24h: 2.5,
        marketCap: 900000000000,
        fetchedAt,
      });

      const json = price.toJSON();

      expect(json).toEqual({
        coingeckoId: 'bitcoin',
        price: 50000,
        currency: 'usd',
        priceChange24h: 2.5,
        marketCap: 900000000000,
        fetchedAt: '2024-01-01T12:00:00.000Z',
      });
    });
  });

  describe('immutability', () => {
    it('is frozen', () => {
      const price = TokenPrice.create({
        coingeckoId: 'bitcoin',
        price: 50000,
        currency: 'usd',
      });
      expect(Object.isFrozen(price)).toBe(true);
    });
  });

  describe('SUPPORTED_CURRENCIES', () => {
    it('contains expected currencies', () => {
      expect(SUPPORTED_CURRENCIES.has('usd')).toBe(true);
      expect(SUPPORTED_CURRENCIES.has('eur')).toBe(true);
      expect(SUPPORTED_CURRENCIES.has('gbp')).toBe(true);
      expect(SUPPORTED_CURRENCIES.has('btc')).toBe(true);
      expect(SUPPORTED_CURRENCIES.has('eth')).toBe(true);
    });
  });
});
