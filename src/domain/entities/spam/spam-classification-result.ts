/**
 * SpamClassificationResult aggregate.
 * Immutable representation of merged spam classification results from multiple providers.
 */

// Re-export the canonical interfaces from token-classification
export type {
  BlockaidResult,
  CoingeckoResult,
  HeuristicsResult,
} from '../token/token-classification.js';

import type {
  BlockaidResult,
  CoingeckoResult,
  HeuristicsResult,
} from '../token/token-classification.js';

export interface ProviderResult {
  blockaid?: BlockaidResult;
  coingecko?: CoingeckoResult;
  heuristics?: HeuristicsResult;
}

export interface SpamClassificationData {
  blockaid: BlockaidResult | null;
  coingecko: CoingeckoResult;
  heuristics: HeuristicsResult;
}

const DEFAULT_COINGECKO: CoingeckoResult = {
  isListed: false,
  marketCapRank: null,
};

const DEFAULT_HEURISTICS: HeuristicsResult = {
  suspiciousName: false,
  namePatterns: [],
  isUnsolicited: false,
  contractAgeDays: null,
  isNewContract: false,
  holderDistribution: 'unknown',
};

/**
 * Immutable aggregate for spam classification results.
 *
 * @example
 * const result = SpamClassificationResult.merge([
 *   { blockaid: { isMalicious: true, isPhishing: false, riskScore: 0.9, attackTypes: ['scam'], checkedAt: '2024-01-01T00:00:00Z', resultType: 'Malicious' } },
 *   { coingecko: { isListed: false, marketCapRank: null } },
 * ]);
 * result.blockaid?.isMalicious; // true
 */
export class SpamClassificationResult {
  private constructor(
    public readonly blockaid: BlockaidResult | null,
    public readonly coingecko: CoingeckoResult,
    public readonly heuristics: HeuristicsResult
  ) {
    Object.freeze(this);
  }

  /**
   * Merge multiple provider results into a single classification.
   * Later results override earlier ones.
   */
  static merge(results: ProviderResult[]): SpamClassificationResult {
    let blockaid: BlockaidResult | null = null;
    let coingecko: CoingeckoResult = { ...DEFAULT_COINGECKO };
    let heuristics: HeuristicsResult = { ...DEFAULT_HEURISTICS };

    for (const result of results) {
      if (result.blockaid !== undefined) {
        blockaid = result.blockaid;
      }
      if (result.coingecko !== undefined) {
        coingecko = result.coingecko;
      }
      if (result.heuristics !== undefined) {
        heuristics = result.heuristics;
      }
    }

    return new SpamClassificationResult(blockaid, coingecko, heuristics);
  }

  /**
   * Create from raw data (e.g., from database)
   */
  static fromData(data: SpamClassificationData): SpamClassificationResult {
    return new SpamClassificationResult(
      data.blockaid,
      data.coingecko,
      data.heuristics
    );
  }

  /**
   * Create empty classification with defaults
   */
  static empty(): SpamClassificationResult {
    return new SpamClassificationResult(null, DEFAULT_COINGECKO, DEFAULT_HEURISTICS);
  }

  toJSON(): SpamClassificationData {
    return {
      blockaid: this.blockaid,
      coingecko: this.coingecko,
      heuristics: this.heuristics,
    };
  }
}
