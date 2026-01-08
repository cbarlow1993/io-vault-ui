import { describe, it, expect } from 'vitest';
import { HeuristicsProvider } from '@/src/services/spam/providers/heuristics-provider.js';
import type { TokenToClassify } from '@/src/services/spam/types.js';

describe('HeuristicsProvider', () => {
  const provider = new HeuristicsProvider();

  describe('classify', () => {
    it('should detect suspicious token names', async () => {
      const token: TokenToClassify = {
        chain: 'ethereum',
        network: 'mainnet',
        address: '0x123',
        name: 'Visit scam.com',
        symbol: 'SCAM',
        coingeckoId: null,
      };

      const result = await provider.classify(token);

      expect(result.heuristics?.suspiciousName).toBe(true);
      expect(result.heuristics?.namePatterns).toContain('contains_url');
    });

    it('should pass legitimate tokens', async () => {
      const token: TokenToClassify = {
        chain: 'ethereum',
        network: 'mainnet',
        address: '0x123',
        name: 'USD Coin',
        symbol: 'USDC',
        coingeckoId: 'usd-coin',
      };

      const result = await provider.classify(token);

      expect(result.heuristics?.suspiciousName).toBe(false);
      expect(result.heuristics?.namePatterns).toHaveLength(0);
    });

    it('should return unknown holder distribution by default', async () => {
      const token: TokenToClassify = {
        chain: 'ethereum',
        network: 'mainnet',
        address: '0x123',
        name: 'Test Token',
        symbol: 'TEST',
        coingeckoId: null,
      };

      const result = await provider.classify(token);

      expect(result.heuristics?.holderDistribution).toBe('unknown');
    });
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('heuristics');
  });

  describe('classifyBatch', () => {
    it('should classify multiple tokens and return results keyed by lowercase address', async () => {
      const tokens: TokenToClassify[] = [
        { chain: 'ethereum', network: 'mainnet', address: '0xABC', name: 'Visit scam.com', symbol: 'SCAM', coingeckoId: null },
        { chain: 'ethereum', network: 'mainnet', address: '0xDEF', name: 'USD Coin', symbol: 'USDC', coingeckoId: 'usd-coin' },
      ];
      const results = await provider.classifyBatch(tokens);
      expect(results.size).toBe(2);
      expect(results.has('0xabc')).toBe(true);
      expect(results.has('0xdef')).toBe(true);
      expect(results.get('0xabc')?.heuristics?.suspiciousName).toBe(true);
      expect(results.get('0xdef')?.heuristics?.suspiciousName).toBe(false);
    });

    it('should handle empty array', async () => {
      const results = await provider.classifyBatch([]);
      expect(results.size).toBe(0);
    });
  });
});
