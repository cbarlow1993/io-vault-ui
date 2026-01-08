import { describe, it, expect, beforeEach } from 'vitest';
import { CoingeckoProvider } from '@/src/services/spam/providers/coingecko-provider.js';
import type { TokenToClassify } from '@/src/services/spam/types.js';

describe('CoingeckoProvider', () => {
  let provider: CoingeckoProvider;

  beforeEach(() => {
    provider = new CoingeckoProvider();
  });

  describe('classify', () => {
    it('should mark token as listed if it has coingeckoId', async () => {
      const token: TokenToClassify = {
        chain: 'ethereum',
        network: 'mainnet',
        address: '0x123',
        name: 'USD Coin',
        symbol: 'USDC',
        coingeckoId: 'usd-coin',
      };

      const result = await provider.classify(token);

      expect(result.coingecko?.isListed).toBe(true);
    });

    it('should mark token as not listed if no coingeckoId', async () => {
      const token: TokenToClassify = {
        chain: 'ethereum',
        network: 'mainnet',
        address: '0x123',
        name: 'Unknown Token',
        symbol: 'UNK',
        coingeckoId: null,
      };

      const result = await provider.classify(token);

      expect(result.coingecko?.isListed).toBe(false);
    });

    it('should return null marketCapRank when not available', async () => {
      const token: TokenToClassify = {
        chain: 'ethereum',
        network: 'mainnet',
        address: '0x123',
        name: 'Some Token',
        symbol: 'SOME',
        coingeckoId: 'some-token',
      };

      const result = await provider.classify(token);

      expect(result.coingecko?.marketCapRank).toBeNull();
    });
  });

  describe('classifyBatch', () => {
    it('should classify multiple tokens', async () => {
      const tokens: TokenToClassify[] = [
        { chain: 'ethereum', network: 'mainnet', address: '0xAAA', name: 'USDC', symbol: 'USDC', coingeckoId: 'usd-coin' },
        { chain: 'ethereum', network: 'mainnet', address: '0xBBB', name: 'Unknown', symbol: 'UNK', coingeckoId: null },
      ];

      const results = await provider.classifyBatch(tokens);

      expect(results.size).toBe(2);
      expect(results.get('0xaaa')?.coingecko?.isListed).toBe(true);
      expect(results.get('0xbbb')?.coingecko?.isListed).toBe(false);
    });

    it('should handle empty array', async () => {
      const results = await provider.classifyBatch([]);
      expect(results.size).toBe(0);
    });
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('coingecko');
  });
});
