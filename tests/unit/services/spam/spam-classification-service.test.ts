import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpamClassificationService } from '@/src/services/spam/spam-classification-service.js';
import type { SpamClassificationProvider, TokenToClassify, SpamClassification } from '@/src/services/spam/types.js';

function createMockProvider(name: string, result: Partial<SpamClassification>): SpamClassificationProvider {
  return {
    name,
    classify: vi.fn().mockResolvedValue(result),
    classifyBatch: vi.fn().mockResolvedValue(new Map([['0x123', result]])),
  };
}

describe('SpamClassificationService', () => {
  let heuristicsProvider: SpamClassificationProvider;
  let coingeckoProvider: SpamClassificationProvider;
  let blockaidProvider: SpamClassificationProvider;
  let service: SpamClassificationService;

  beforeEach(() => {
    heuristicsProvider = createMockProvider('heuristics', {
      heuristics: {
        suspiciousName: false,
        namePatterns: [],
        isUnsolicited: false,
        contractAgeDays: null,
        isNewContract: false,
        holderDistribution: 'unknown',
      },
    });

    coingeckoProvider = createMockProvider('coingecko', {
      coingecko: {
        isListed: true,
        marketCapRank: 10,
      },
    });

    blockaidProvider = createMockProvider('blockaid', {
      blockaid: {
        isMalicious: false,
        isPhishing: false,
        riskScore: 0.1,
        attackTypes: [],
        checkedAt: new Date().toISOString(),
        resultType: 'Benign',
        rawResponse: null,
      },
    });

    service = new SpamClassificationService([heuristicsProvider, coingeckoProvider, blockaidProvider]);
  });

  describe('classifyToken', () => {
    it('should aggregate results from all providers', async () => {
      const token: TokenToClassify = {
        chain: 'ethereum',
        network: 'mainnet',
        address: '0x123',
        name: 'Test Token',
        symbol: 'TEST',
        coingeckoId: 'test-token',
      };

      const result = await service.classifyToken(token);

      expect(result.classification.heuristics).toBeDefined();
      expect(result.classification.coingecko).toBeDefined();
      expect(result.classification.blockaid).toBeDefined();
    });

    it('should call all providers', async () => {
      const token: TokenToClassify = {
        chain: 'ethereum',
        network: 'mainnet',
        address: '0x123',
        name: 'Test Token',
        symbol: 'TEST',
        coingeckoId: null,
      };

      await service.classifyToken(token);

      expect(heuristicsProvider.classify).toHaveBeenCalledWith(token);
      expect(coingeckoProvider.classify).toHaveBeenCalledWith(token);
      expect(blockaidProvider.classify).toHaveBeenCalledWith(token);
    });

    it('should handle provider failure gracefully', async () => {
      const failingProvider: SpamClassificationProvider = {
        name: 'failing',
        classify: vi.fn().mockRejectedValue(new Error('Provider failed')),
      };

      service = new SpamClassificationService([
        failingProvider,
        heuristicsProvider,
        coingeckoProvider,
      ]);

      const token: TokenToClassify = {
        chain: 'ethereum',
        network: 'mainnet',
        address: '0x123',
        name: 'Test Token',
        symbol: 'TEST',
        coingeckoId: null,
      };

      // Should not throw, should still return results from working providers
      const result = await service.classifyToken(token);

      expect(result.classification.heuristics).toBeDefined();
      expect(result.classification.coingecko).toBeDefined();
    });

    it('should use defaults when all providers fail', async () => {
      const failingProvider: SpamClassificationProvider = {
        name: 'failing',
        classify: vi.fn().mockRejectedValue(new Error('Provider failed')),
      };

      service = new SpamClassificationService([failingProvider]);

      const token: TokenToClassify = {
        chain: 'ethereum',
        network: 'mainnet',
        address: '0x123',
        name: 'Test Token',
        symbol: 'TEST',
        coingeckoId: null,
      };

      const result = await service.classifyToken(token);

      // Domain aggregate defaults should be used
      expect(result.classification.blockaid).toBeNull();
      expect(result.classification.coingecko).toEqual({
        isListed: false,
        marketCapRank: null,
      });
      expect(result.classification.heuristics).toEqual({
        suspiciousName: false,
        namePatterns: [],
        isUnsolicited: false,
        contractAgeDays: null,
        isNewContract: false,
        holderDistribution: 'unknown',
      });
    });

    it('should merge provider results with later results overriding earlier ones', async () => {
      // First provider returns one blockaid result
      const provider1: SpamClassificationProvider = {
        name: 'provider1',
        classify: vi.fn().mockResolvedValue({
          blockaid: {
            isMalicious: false,
            isPhishing: false,
            riskScore: 0.1,
            attackTypes: [],
            checkedAt: '2024-01-01T00:00:00Z',
            resultType: 'Benign',
          },
        }),
      };

      // Second provider returns a different blockaid result (should override)
      const provider2: SpamClassificationProvider = {
        name: 'provider2',
        classify: vi.fn().mockResolvedValue({
          blockaid: {
            isMalicious: true,
            isPhishing: true,
            riskScore: 0.95,
            attackTypes: ['phishing'],
            checkedAt: '2024-01-02T00:00:00Z',
            resultType: 'Malicious',
          },
        }),
      };

      service = new SpamClassificationService([provider1, provider2]);

      const token: TokenToClassify = {
        chain: 'ethereum',
        network: 'mainnet',
        address: '0x123',
        name: 'Test Token',
        symbol: 'TEST',
        coingeckoId: null,
      };

      const result = await service.classifyToken(token);

      // Later provider result should override earlier one
      expect(result.classification.blockaid?.isMalicious).toBe(true);
      expect(result.classification.blockaid?.resultType).toBe('Malicious');
    });
  });

  describe('computeRiskSummary', () => {
    it('should return danger level for malicious tokens', async () => {
      blockaidProvider = createMockProvider('blockaid', {
        blockaid: {
          isMalicious: true,
          isPhishing: false,
          riskScore: 0.9,
          attackTypes: ['honeypot'],
          checkedAt: new Date().toISOString(),
          resultType: 'Malicious',
          rawResponse: null,
        },
      });

      service = new SpamClassificationService([heuristicsProvider, coingeckoProvider, blockaidProvider]);

      const token: TokenToClassify = {
        chain: 'ethereum',
        network: 'mainnet',
        address: '0x123',
        name: 'Scam Token',
        symbol: 'SCAM',
        coingeckoId: null,
      };

      const result = await service.classifyToken(token);
      const summary = service.computeRiskSummary(result.classification, null);

      expect(summary.riskLevel).toBe('danger');
      expect(summary.reasons).toContain('Flagged as malicious by Blockaid');
    });

    it('should return warning level for suspicious names', async () => {
      heuristicsProvider = createMockProvider('heuristics', {
        heuristics: {
          suspiciousName: true,
          namePatterns: ['contains_url'],
          isUnsolicited: false,
          contractAgeDays: null,
          isNewContract: false,
          holderDistribution: 'unknown',
        },
      });

      service = new SpamClassificationService([heuristicsProvider, coingeckoProvider, blockaidProvider]);

      const token: TokenToClassify = {
        chain: 'ethereum',
        network: 'mainnet',
        address: '0x123',
        name: 'Visit scam.com',
        symbol: 'SCAM',
        coingeckoId: null,
      };

      const result = await service.classifyToken(token);
      const summary = service.computeRiskSummary(result.classification, null);

      expect(summary.riskLevel).toBe('warning');
      expect(summary.reasons).toContain('Suspicious token name detected');
    });

    it('should return safe level for verified tokens', async () => {
      const token: TokenToClassify = {
        chain: 'ethereum',
        network: 'mainnet',
        address: '0x123',
        name: 'USD Coin',
        symbol: 'USDC',
        coingeckoId: 'usd-coin',
      };

      const result = await service.classifyToken(token);
      const summary = service.computeRiskSummary(result.classification, null);

      expect(summary.riskLevel).toBe('safe');
      expect(summary.reasons).toHaveLength(0);
    });

    it('should respect user trusted override', async () => {
      blockaidProvider = createMockProvider('blockaid', {
        blockaid: {
          isMalicious: true,
          isPhishing: false,
          riskScore: 0.9,
          attackTypes: ['honeypot'],
          checkedAt: new Date().toISOString(),
          resultType: 'Malicious',
          rawResponse: null,
        },
      });

      service = new SpamClassificationService([heuristicsProvider, coingeckoProvider, blockaidProvider]);

      const token: TokenToClassify = {
        chain: 'ethereum',
        network: 'mainnet',
        address: '0x123',
        name: 'My Token',
        symbol: 'MY',
        coingeckoId: null,
      };

      const result = await service.classifyToken(token);
      const summary = service.computeRiskSummary(result.classification, 'trusted');

      expect(summary.riskLevel).toBe('safe');
      expect(summary.reasons).toContain('User marked as trusted');
    });

    it('should respect user spam override', async () => {
      const token: TokenToClassify = {
        chain: 'ethereum',
        network: 'mainnet',
        address: '0x123',
        name: 'USD Coin',
        symbol: 'USDC',
        coingeckoId: 'usd-coin',
      };

      const result = await service.classifyToken(token);
      const summary = service.computeRiskSummary(result.classification, 'spam');

      expect(summary.riskLevel).toBe('danger');
      expect(summary.reasons).toContain('User marked as spam');
    });
  });

  describe('classifyTokensBatch', () => {
    it('should classify multiple tokens', async () => {
      const tokens: TokenToClassify[] = [
        { chain: 'ethereum', network: 'mainnet', address: '0xAAA', name: 'Token1', symbol: 'T1', coingeckoId: null },
        { chain: 'ethereum', network: 'mainnet', address: '0xBBB', name: 'Token2', symbol: 'T2', coingeckoId: 'token2' },
      ];

      const results = await service.classifyTokensBatch(tokens);

      expect(results.size).toBe(2);
      expect(results.has('0xaaa')).toBe(true);
      expect(results.has('0xbbb')).toBe(true);
    });
  });
});
