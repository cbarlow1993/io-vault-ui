import { describe, expect, it } from 'vitest';
import {
  TokenClassification,
  type TokenClassificationData,
  type BlockaidResult,
  type CoingeckoResult,
  type HeuristicsResult,
} from '@/src/domain/entities/token/token-classification.js';

describe('TokenClassification', () => {
  const createBlockaidResult = (overrides: Partial<BlockaidResult> = {}): BlockaidResult => ({
    isMalicious: false,
    isPhishing: false,
    riskScore: 0,
    attackTypes: [],
    checkedAt: new Date().toISOString(),
    resultType: 'Benign',
    ...overrides,
  });

  const createCoingeckoResult = (overrides: Partial<CoingeckoResult> = {}): CoingeckoResult => ({
    isListed: false,
    marketCapRank: null,
    ...overrides,
  });

  const createHeuristicsResult = (overrides: Partial<HeuristicsResult> = {}): HeuristicsResult => ({
    suspiciousName: false,
    namePatterns: [],
    isUnsolicited: false,
    contractAgeDays: 365,
    isNewContract: false,
    holderDistribution: 'normal',
    ...overrides,
  });

  describe('create', () => {
    it('creates a TokenClassification with full data', () => {
      const data: TokenClassificationData = {
        blockaid: createBlockaidResult(),
        coingecko: createCoingeckoResult({ isListed: true }),
        heuristics: createHeuristicsResult(),
        classifiedAt: new Date(),
      };

      const classification = TokenClassification.create(data);

      expect(classification.blockaid).toEqual(data.blockaid);
      expect(classification.coingecko).toEqual(data.coingecko);
      expect(classification.heuristics).toEqual(data.heuristics);
    });

    it('creates classification with null blockaid', () => {
      const classification = TokenClassification.create({
        blockaid: null,
        coingecko: createCoingeckoResult(),
        heuristics: createHeuristicsResult(),
        classifiedAt: new Date(),
      });

      expect(classification.blockaid).toBeNull();
      expect(classification.heuristics).toBeDefined();
    });
  });

  describe('empty', () => {
    it('creates an empty classification', () => {
      const classification = TokenClassification.empty();

      expect(classification.blockaid).toBeNull();
      expect(classification.coingecko.isListed).toBe(false);
      expect(classification.heuristics).toBeDefined();
      expect(classification.heuristics.suspiciousName).toBe(false);
      expect(classification.riskLevel).toBe('safe');
    });
  });

  describe('fromDatabase', () => {
    it('reconstitutes from JSON', () => {
      const json = {
        blockaid: createBlockaidResult(),
        coingecko: createCoingeckoResult({ isListed: true }),
        heuristics: createHeuristicsResult(),
        classifiedAt: new Date().toISOString(),
      };

      const classification = TokenClassification.fromDatabase(json);

      expect(classification.blockaid).toBeDefined();
      expect(classification.coingecko.isListed).toBe(true);
      expect(classification.heuristics).toBeDefined();
    });

    it('returns empty for invalid input', () => {
      const classification = TokenClassification.fromDatabase(null);
      expect(classification.riskLevel).toBe('safe');
    });
  });

  describe('riskLevel', () => {
    it('returns safe for empty classification', () => {
      const classification = TokenClassification.empty();
      expect(classification.riskLevel).toBe('safe');
    });

    it('returns danger for malicious blockaid result', () => {
      const classification = TokenClassification.create({
        blockaid: createBlockaidResult({ isMalicious: true }),
        coingecko: createCoingeckoResult(),
        heuristics: createHeuristicsResult(),
        classifiedAt: new Date(),
      });

      expect(classification.riskLevel).toBe('danger');
    });

    it('returns danger for phishing blockaid result', () => {
      const classification = TokenClassification.create({
        blockaid: createBlockaidResult({ isPhishing: true }),
        coingecko: createCoingeckoResult(),
        heuristics: createHeuristicsResult(),
        classifiedAt: new Date(),
      });

      expect(classification.riskLevel).toBe('danger');
    });

    it('returns warning for suspicious heuristics', () => {
      const classification = TokenClassification.create({
        blockaid: null,
        coingecko: createCoingeckoResult(),
        heuristics: createHeuristicsResult({ suspiciousName: true }),
        classifiedAt: new Date(),
      });

      expect(classification.riskLevel).toBe('warning');
    });

    it('returns safe for CoinGecko listed token', () => {
      const classification = TokenClassification.create({
        blockaid: null,
        coingecko: createCoingeckoResult({ isListed: true }),
        heuristics: createHeuristicsResult(),
        classifiedAt: new Date(),
      });

      expect(classification.riskLevel).toBe('safe');
    });
  });

  describe('isEffectivelySpam', () => {
    it('returns false when user overrides to trusted', () => {
      const classification = TokenClassification.create({
        blockaid: createBlockaidResult({ isMalicious: true }),
        coingecko: createCoingeckoResult(),
        heuristics: createHeuristicsResult(),
        classifiedAt: new Date(),
      });

      expect(classification.isEffectivelySpam('trusted')).toBe(false);
    });

    it('returns true when user marks as spam', () => {
      const classification = TokenClassification.create({
        blockaid: null,
        coingecko: createCoingeckoResult({ isListed: true }),
        heuristics: createHeuristicsResult(),
        classifiedAt: new Date(),
      });

      expect(classification.isEffectivelySpam('spam')).toBe(true);
    });

    it('returns true for danger risk level without override', () => {
      const classification = TokenClassification.create({
        blockaid: createBlockaidResult({ isMalicious: true }),
        coingecko: createCoingeckoResult(),
        heuristics: createHeuristicsResult(),
        classifiedAt: new Date(),
      });

      expect(classification.isEffectivelySpam(null)).toBe(true);
    });

    it('returns false for safe risk level without override', () => {
      const classification = TokenClassification.empty();
      expect(classification.isEffectivelySpam(null)).toBe(false);
    });
  });

  describe('getRiskSummary', () => {
    it('provides reasons for danger level', () => {
      const classification = TokenClassification.create({
        blockaid: createBlockaidResult({ isMalicious: true, attackTypes: ['phishing'] }),
        coingecko: createCoingeckoResult(),
        heuristics: createHeuristicsResult(),
        classifiedAt: new Date(),
      });

      const summary = classification.getRiskSummary(null);

      expect(summary.riskLevel).toBe('danger');
      expect(summary.reasons.length).toBeGreaterThan(0);
    });

    it('includes heuristics reasons for warning', () => {
      const classification = TokenClassification.create({
        blockaid: null,
        coingecko: createCoingeckoResult(),
        heuristics: createHeuristicsResult({
          suspiciousName: true,
          namePatterns: ['Fake USDC'],
        }),
        classifiedAt: new Date(),
      });

      const summary = classification.getRiskSummary(null);

      expect(summary.riskLevel).toBe('warning');
      expect(summary.reasons.some((r) => r.includes('name'))).toBe(true);
    });
  });

  describe('needsReclassification', () => {
    it('returns true when classification is old', () => {
      const oldDate = new Date();
      oldDate.setHours(oldDate.getHours() - 25);

      const classification = TokenClassification.create({
        blockaid: null,
        coingecko: createCoingeckoResult(),
        heuristics: createHeuristicsResult(),
        classifiedAt: oldDate,
      });

      expect(classification.needsReclassification(24)).toBe(true);
    });

    it('returns false when classification is fresh', () => {
      const classification = TokenClassification.create({
        blockaid: null,
        coingecko: createCoingeckoResult(),
        heuristics: createHeuristicsResult(),
        classifiedAt: new Date(),
      });

      expect(classification.needsReclassification(24)).toBe(false);
    });
  });

  describe('merge', () => {
    it('merges new data with existing classification', () => {
      const original = TokenClassification.create({
        blockaid: null,
        coingecko: createCoingeckoResult(),
        heuristics: createHeuristicsResult(),
        classifiedAt: new Date(),
      });

      const merged = original.merge({
        blockaid: createBlockaidResult({ isMalicious: true }),
      });

      expect(merged.blockaid?.isMalicious).toBe(true);
      expect(merged.heuristics).toEqual(original.heuristics);
    });
  });

  describe('immutability', () => {
    it('is frozen', () => {
      const classification = TokenClassification.empty();
      expect(Object.isFrozen(classification)).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('serializes all properties correctly', () => {
      const data: TokenClassificationData = {
        blockaid: createBlockaidResult(),
        coingecko: createCoingeckoResult({ isListed: true }),
        heuristics: createHeuristicsResult(),
        classifiedAt: new Date(),
      };

      const classification = TokenClassification.create(data);
      const json = classification.toJSON() as {
        blockaid: unknown;
        coingecko: { isListed: boolean };
        heuristics: unknown;
        classifiedAt: string;
      };

      expect(json.blockaid).toBeDefined();
      expect(json.coingecko.isListed).toBe(true);
      expect(json.heuristics).toBeDefined();
      expect(json.classifiedAt).toBeDefined();
    });
  });
});
