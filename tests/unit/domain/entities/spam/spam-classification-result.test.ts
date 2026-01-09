import { describe, expect, it } from 'vitest';
import { SpamClassificationResult, type ProviderResult } from '@/src/domain/entities/spam/spam-classification-result.js';

describe('SpamClassificationResult', () => {
  describe('merge', () => {
    it('creates result from multiple provider results', () => {
      const results: ProviderResult[] = [
        { blockaid: { isSpam: true, reason: 'known scam' } },
        { coingecko: { isListed: true, marketCapRank: 100 } },
        { heuristics: { suspiciousName: false, namePatterns: [], isUnsolicited: false, contractAgeDays: null, isNewContract: false, holderDistribution: 'unknown' } },
      ];

      const merged = SpamClassificationResult.merge(results);

      expect(merged.blockaid).toEqual({ isSpam: true, reason: 'known scam' });
      expect(merged.coingecko).toEqual({ isListed: true, marketCapRank: 100 });
      expect(merged.heuristics?.suspiciousName).toBe(false);
    });

    it('uses defaults when provider results are missing', () => {
      const results: ProviderResult[] = [
        { blockaid: { isSpam: false, reason: null } },
      ];

      const merged = SpamClassificationResult.merge(results);

      expect(merged.blockaid).toEqual({ isSpam: false, reason: null });
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
      const results: ProviderResult[] = [
        { blockaid: { isSpam: false, reason: null } },
        { blockaid: { isSpam: true, reason: 'updated' } },
      ];

      const merged = SpamClassificationResult.merge(results);
      expect(merged.blockaid).toEqual({ isSpam: true, reason: 'updated' });
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

  describe('immutability', () => {
    it('is frozen', () => {
      const result = SpamClassificationResult.merge([]);
      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('serializes correctly', () => {
      const result = SpamClassificationResult.merge([
        { blockaid: { isSpam: true, reason: 'test' } }
      ]);
      const json = result.toJSON();
      expect(json).toHaveProperty('blockaid');
      expect(json).toHaveProperty('coingecko');
      expect(json).toHaveProperty('heuristics');
    });
  });
});
