import { describe, expect, it } from 'vitest';
import {
  SpamClassificationResult,
  type ProviderResult,
  type BlockaidResult,
  type CoingeckoResult,
  type HeuristicsResult,
} from '@/src/domain/entities/spam/spam-classification-result.js';

describe('SpamClassificationResult', () => {
  // Test fixtures matching the canonical BlockaidResult interface
  const blockaidResult: BlockaidResult = {
    isMalicious: true,
    isPhishing: false,
    riskScore: 0.9,
    attackTypes: ['honeypot'],
    checkedAt: '2024-01-01T00:00:00Z',
    resultType: 'Malicious',
  };

  const coingeckoResult: CoingeckoResult = {
    isListed: true,
    marketCapRank: 100,
  };

  const heuristicsResult: HeuristicsResult = {
    suspiciousName: false,
    namePatterns: [],
    isUnsolicited: false,
    contractAgeDays: null,
    isNewContract: false,
    holderDistribution: 'unknown',
  };

  describe('merge', () => {
    it('creates result from multiple provider results', () => {
      const results: ProviderResult[] = [
        { blockaid: blockaidResult },
        { coingecko: coingeckoResult },
        { heuristics: heuristicsResult },
      ];

      const merged = SpamClassificationResult.merge(results);

      expect(merged.blockaid).toEqual(blockaidResult);
      expect(merged.coingecko).toEqual(coingeckoResult);
      expect(merged.heuristics?.suspiciousName).toBe(false);
    });

    it('uses defaults when provider results are missing', () => {
      const benignBlockaid: BlockaidResult = {
        isMalicious: false,
        isPhishing: false,
        riskScore: 0.1,
        attackTypes: [],
        checkedAt: '2024-01-01T00:00:00Z',
        resultType: 'Benign',
      };

      const results: ProviderResult[] = [{ blockaid: benignBlockaid }];

      const merged = SpamClassificationResult.merge(results);

      expect(merged.blockaid).toEqual(benignBlockaid);
      expect(merged.coingecko).toEqual({ isListed: false, marketCapRank: null });
      expect(merged.heuristics).toEqual({
        suspiciousName: false,
        namePatterns: [],
        isUnsolicited: false,
        contractAgeDays: null,
        isNewContract: false,
        holderDistribution: 'unknown',
      });
    });

    it('later results override earlier ones', () => {
      const earlyBlockaid: BlockaidResult = {
        isMalicious: false,
        isPhishing: false,
        riskScore: 0.1,
        attackTypes: [],
        checkedAt: '2024-01-01T00:00:00Z',
        resultType: 'Benign',
      };

      const laterBlockaid: BlockaidResult = {
        isMalicious: true,
        isPhishing: true,
        riskScore: 0.95,
        attackTypes: ['phishing'],
        checkedAt: '2024-01-02T00:00:00Z',
        resultType: 'Malicious',
      };

      const results: ProviderResult[] = [
        { blockaid: earlyBlockaid },
        { blockaid: laterBlockaid },
      ];

      const merged = SpamClassificationResult.merge(results);
      expect(merged.blockaid).toEqual(laterBlockaid);
    });

    it('returns defaults when merging empty array', () => {
      const result = SpamClassificationResult.merge([]);

      expect(result.blockaid).toBeNull();
      expect(result.coingecko).toEqual({
        isListed: false,
        marketCapRank: null,
      });
      expect(result.heuristics).toEqual({
        suspiciousName: false,
        namePatterns: [],
        isUnsolicited: false,
        contractAgeDays: null,
        isNewContract: false,
        holderDistribution: 'unknown',
      });
    });
  });

  describe('empty', () => {
    it('creates empty result with defaults', () => {
      const result = SpamClassificationResult.empty();
      expect(result.blockaid).toBeNull();
      expect(result.coingecko).toEqual({ isListed: false, marketCapRank: null });
      expect(result.heuristics).toEqual({
        suspiciousName: false,
        namePatterns: [],
        isUnsolicited: false,
        contractAgeDays: null,
        isNewContract: false,
        holderDistribution: 'unknown',
      });
    });
  });

  describe('fromData', () => {
    it('reconstitutes from raw data', () => {
      const data = {
        blockaid: blockaidResult,
        coingecko: coingeckoResult,
        heuristics: heuristicsResult,
      };

      const result = SpamClassificationResult.fromData(data);

      expect(result.blockaid).toEqual(blockaidResult);
      expect(result.coingecko).toEqual(coingeckoResult);
      expect(result.heuristics).toEqual(heuristicsResult);
    });

    it('handles null blockaid', () => {
      const data = {
        blockaid: null,
        coingecko: coingeckoResult,
        heuristics: heuristicsResult,
      };

      const result = SpamClassificationResult.fromData(data);

      expect(result.blockaid).toBeNull();
      expect(result.coingecko).toEqual(coingeckoResult);
      expect(result.heuristics).toEqual(heuristicsResult);
    });
  });

  describe('immutability', () => {
    it('is frozen', () => {
      const result = SpamClassificationResult.merge([]);
      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('serializes correctly', () => {
      const result = SpamClassificationResult.merge([{ blockaid: blockaidResult }]);
      const json = result.toJSON();
      expect(json).toHaveProperty('blockaid');
      expect(json).toHaveProperty('coingecko');
      expect(json).toHaveProperty('heuristics');
    });

    it('roundtrips through fromData', () => {
      const original = SpamClassificationResult.merge([
        { blockaid: blockaidResult },
        { coingecko: coingeckoResult },
        { heuristics: heuristicsResult },
      ]);

      const json = original.toJSON();
      const restored = SpamClassificationResult.fromData(json);

      expect(restored.blockaid).toEqual(original.blockaid);
      expect(restored.coingecko).toEqual(original.coingecko);
      expect(restored.heuristics).toEqual(original.heuristics);
    });
  });
});
