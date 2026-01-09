import { describe, expect, it } from 'vitest';
import { SpamAnalysis, TokenClassification } from '@/src/domain/entities/index.js';
import type {
  BlockaidResult,
  CoingeckoResult,
  HeuristicsResult,
} from '@/src/domain/entities/token/token-classification.js';

describe('SpamAnalysis', () => {
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

  describe('fromClassification', () => {
    it('creates SpamAnalysis from TokenClassification', () => {
      const classification = TokenClassification.create({
        blockaid: createBlockaidResult(),
        coingecko: createCoingeckoResult({ isListed: true }),
        heuristics: createHeuristicsResult(),
        classifiedAt: new Date(),
      });

      const analysis = SpamAnalysis.fromClassification(classification, null, new Date());

      expect(analysis.blockaid).toBeDefined();
      expect(analysis.coingecko?.isListed).toBe(true);
      expect(analysis.userOverride).toBeNull();
    });

    it('preserves user override', () => {
      const classification = TokenClassification.empty();
      const analysis = SpamAnalysis.fromClassification(classification, 'trusted', new Date());

      expect(analysis.userOverride).toBe('trusted');
    });
  });

  describe('create', () => {
    it('creates SpamAnalysis with all data', () => {
      const analysis = SpamAnalysis.create({
        blockaid: createBlockaidResult(),
        coingecko: createCoingeckoResult({ isListed: true }),
        heuristics: createHeuristicsResult(),
        userOverride: 'trusted',
        classificationUpdatedAt: new Date().toISOString(),
      });

      expect(analysis.blockaid).toBeDefined();
      expect(analysis.coingecko?.isListed).toBe(true);
      expect(analysis.userOverride).toBe('trusted');
    });
  });

  describe('none', () => {
    it('creates empty SpamAnalysis', () => {
      const analysis = SpamAnalysis.none();

      expect(analysis.blockaid).toBeNull();
      expect(analysis.coingecko).toBeNull();
      expect(analysis.heuristics).toBeNull();
      expect(analysis.userOverride).toBeNull();
      expect(analysis.hasClassification).toBe(false);
    });
  });

  describe('trusted', () => {
    it('creates trusted SpamAnalysis', () => {
      const analysis = SpamAnalysis.trusted();

      expect(analysis.userOverride).toBe('trusted');
      expect(analysis.isEffectivelySpam).toBe(false);
    });
  });

  describe('spam', () => {
    it('creates spam SpamAnalysis', () => {
      const analysis = SpamAnalysis.spam();

      expect(analysis.userOverride).toBe('spam');
      expect(analysis.isEffectivelySpam).toBe(true);
    });
  });

  describe('hasClassification', () => {
    it('returns true when classification data exists', () => {
      const analysis = SpamAnalysis.create({
        blockaid: createBlockaidResult(),
        coingecko: null,
        heuristics: null,
        userOverride: null,
        classificationUpdatedAt: null,
      });

      expect(analysis.hasClassification).toBe(true);
    });

    it('returns false when no classification data', () => {
      const analysis = SpamAnalysis.none();
      expect(analysis.hasClassification).toBe(false);
    });
  });

  describe('isEffectivelySpam', () => {
    it('returns true when user marked as spam', () => {
      const analysis = SpamAnalysis.spam();
      expect(analysis.isEffectivelySpam).toBe(true);
    });

    it('returns false when user marked as trusted', () => {
      const analysis = SpamAnalysis.create({
        blockaid: createBlockaidResult({ isMalicious: true }),
        coingecko: null,
        heuristics: null,
        userOverride: 'trusted',
        classificationUpdatedAt: null,
      });

      expect(analysis.isEffectivelySpam).toBe(false);
    });

    it('returns true for danger risk without override', () => {
      const analysis = SpamAnalysis.create({
        blockaid: createBlockaidResult({ isMalicious: true }),
        coingecko: null,
        heuristics: null,
        userOverride: null,
        classificationUpdatedAt: null,
      });

      expect(analysis.isEffectivelySpam).toBe(true);
    });

    it('returns false for safe risk without override', () => {
      const analysis = SpamAnalysis.none();
      expect(analysis.isEffectivelySpam).toBe(false);
    });
  });

  describe('shouldFilter', () => {
    it('returns true when effectively spam', () => {
      const analysis = SpamAnalysis.spam();
      expect(analysis.shouldFilter).toBe(true);
    });

    it('returns false when not spam', () => {
      const analysis = SpamAnalysis.trusted();
      expect(analysis.shouldFilter).toBe(false);
    });
  });

  describe('displayStatus', () => {
    it('returns "trusted" when user override is trusted', () => {
      const analysis = SpamAnalysis.trusted();
      expect(analysis.displayStatus).toBe('trusted');
    });

    it('returns "spam" when user override is spam', () => {
      const analysis = SpamAnalysis.spam();
      expect(analysis.displayStatus).toBe('spam');
    });

    it('returns "spam" for malicious tokens', () => {
      const analysis = SpamAnalysis.create({
        blockaid: createBlockaidResult({ isMalicious: true }),
        coingecko: null,
        heuristics: null,
        userOverride: null,
        classificationUpdatedAt: null,
      });

      expect(analysis.displayStatus).toBe('spam');
    });

    it('returns "warning" for suspicious tokens', () => {
      const analysis = SpamAnalysis.create({
        blockaid: null,
        coingecko: null,
        heuristics: createHeuristicsResult({ suspiciousName: true }),
        userOverride: null,
        classificationUpdatedAt: null,
      });

      expect(analysis.displayStatus).toBe('warning');
    });

    it('returns "safe" for normal tokens', () => {
      const analysis = SpamAnalysis.create({
        blockaid: null,
        coingecko: createCoingeckoResult({ isListed: true }),
        heuristics: null,
        userOverride: null,
        classificationUpdatedAt: null,
      });

      expect(analysis.displayStatus).toBe('safe');
    });
  });

  describe('summary', () => {
    it('includes risk level and reasons', () => {
      const analysis = SpamAnalysis.create({
        blockaid: createBlockaidResult({ isMalicious: true }),
        coingecko: null,
        heuristics: null,
        userOverride: null,
        classificationUpdatedAt: null,
      });

      expect(analysis.summary.riskLevel).toBe('danger');
      expect(analysis.summary.reasons.length).toBeGreaterThan(0);
    });
  });

  describe('immutability', () => {
    it('is frozen', () => {
      const analysis = SpamAnalysis.none();
      expect(Object.isFrozen(analysis)).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('serializes all properties', () => {
      const analysis = SpamAnalysis.create({
        blockaid: createBlockaidResult(),
        coingecko: createCoingeckoResult({ isListed: true }),
        heuristics: createHeuristicsResult(),
        userOverride: 'trusted',
        classificationUpdatedAt: '2024-01-01T00:00:00Z',
      });

      const json = analysis.toJSON();

      expect(json.blockaid).toBeDefined();
      expect(json.coingecko?.isListed).toBe(true);
      expect(json.heuristics).toBeDefined();
      expect(json.userOverride).toBe('trusted');
      expect(json.classificationUpdatedAt).toBe('2024-01-01T00:00:00Z');
      expect(json.summary).toBeDefined();
    });
  });
});
