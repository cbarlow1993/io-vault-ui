/**
 * Classification results from various spam detection providers.
 * Immutable value object that encapsulates token risk assessment.
 */

export interface BlockaidResult {
  isMalicious: boolean;
  isPhishing: boolean;
  riskScore: number | null;
  attackTypes: string[];
  checkedAt: string;
  resultType: 'Benign' | 'Warning' | 'Malicious' | 'Spam';
}

export interface CoingeckoResult {
  isListed: boolean;
  marketCapRank: number | null;
}

export interface HeuristicsResult {
  suspiciousName: boolean;
  namePatterns: string[];
  isUnsolicited: boolean;
  contractAgeDays: number | null;
  isNewContract: boolean;
  holderDistribution: 'normal' | 'suspicious' | 'unknown';
}

export type RiskLevel = 'safe' | 'warning' | 'danger';
export type UserOverride = 'trusted' | 'spam' | null;

export interface RiskSummary {
  riskLevel: RiskLevel;
  reasons: string[];
}

export interface TokenClassificationData {
  blockaid: BlockaidResult | null;
  coingecko: CoingeckoResult;
  heuristics: HeuristicsResult;
  classifiedAt?: Date;
}

/**
 * Immutable value object representing token spam classification.
 * Consolidates multi-source risk assessment into a single coherent view.
 *
 * @example
 * const classification = TokenClassification.create({
 *   blockaid: null,
 *   coingecko: { isListed: true, marketCapRank: 10 },
 *   heuristics: { suspiciousName: false, namePatterns: [], ... }
 * });
 *
 * classification.riskLevel; // 'safe'
 * classification.isEffectivelySpam(null); // false
 */
export class TokenClassification {
  private constructor(
    public readonly blockaid: BlockaidResult | null,
    public readonly coingecko: CoingeckoResult,
    public readonly heuristics: HeuristicsResult,
    public readonly classifiedAt: Date
  ) {
    Object.freeze(this);
  }

  /**
   * Create a new classification from provider results
   */
  static create(data: TokenClassificationData): TokenClassification {
    return new TokenClassification(
      data.blockaid,
      data.coingecko,
      data.heuristics,
      data.classifiedAt ?? new Date()
    );
  }

  /**
   * Create an empty/default classification (no data available)
   */
  static empty(): TokenClassification {
    return new TokenClassification(
      null,
      { isListed: false, marketCapRank: null },
      {
        suspiciousName: false,
        namePatterns: [],
        isUnsolicited: false,
        contractAgeDays: null,
        isNewContract: false,
        holderDistribution: 'unknown',
      },
      new Date()
    );
  }

  /**
   * Reconstitute from database JSON
   */
  static fromDatabase(json: unknown): TokenClassification {
    if (!json || typeof json !== 'object') {
      return TokenClassification.empty();
    }

    const data = json as Record<string, unknown>;

    return new TokenClassification(
      (data.blockaid as BlockaidResult) ?? null,
      (data.coingecko as CoingeckoResult) ?? { isListed: false, marketCapRank: null },
      (data.heuristics as HeuristicsResult) ?? {
        suspiciousName: false,
        namePatterns: [],
        isUnsolicited: false,
        contractAgeDays: null,
        isNewContract: false,
        holderDistribution: 'unknown',
      },
      data.classifiedAt ? new Date(data.classifiedAt as string) : new Date()
    );
  }

  /**
   * Compute risk level without considering user override.
   * Use getRiskSummary() to include user override in calculation.
   */
  get riskLevel(): RiskLevel {
    // Blockaid malicious/phishing = danger
    if (this.blockaid?.isMalicious || this.blockaid?.isPhishing) {
      return 'danger';
    }

    // Any heuristic warnings = warning level
    if (this.heuristics.suspiciousName) {
      return 'warning';
    }

    return 'safe';
  }

  /**
   * Get all reasons contributing to the current risk level
   */
  get riskReasons(): string[] {
    const reasons: string[] = [];

    if (this.blockaid?.isMalicious) {
      reasons.push('Flagged as malicious by Blockaid');
    }
    if (this.blockaid?.isPhishing) {
      reasons.push('Flagged as phishing by Blockaid');
    }
    if (this.heuristics.suspiciousName) {
      reasons.push('Suspicious token name detected');
    }

    // Only add CoinGecko warning if there are other issues
    if (!this.coingecko.isListed && reasons.length > 0) {
      reasons.push('Not listed on CoinGecko');
    }

    return reasons;
  }

  /**
   * Compute full risk summary with user override consideration
   */
  getRiskSummary(userOverride: UserOverride): RiskSummary {
    // User override takes precedence
    if (userOverride === 'trusted') {
      return {
        riskLevel: 'safe',
        reasons: ['User marked as trusted'],
      };
    }

    if (userOverride === 'spam') {
      return {
        riskLevel: 'danger',
        reasons: ['User marked as spam'],
      };
    }

    return {
      riskLevel: this.riskLevel,
      reasons: this.riskReasons,
    };
  }

  /**
   * Whether token should be considered spam, respecting user override
   */
  isEffectivelySpam(userOverride: UserOverride): boolean {
    if (userOverride === 'trusted') return false;
    if (userOverride === 'spam') return true;
    return this.riskLevel === 'danger';
  }

  /**
   * Check if classification data is stale and needs refresh
   */
  needsReclassification(ttlHours: number): boolean {
    const ageMs = Date.now() - this.classifiedAt.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);
    return ageHours > ttlHours;
  }

  /**
   * Check if we have meaningful classification data
   */
  get hasData(): boolean {
    return (
      this.blockaid !== null ||
      this.coingecko.isListed ||
      this.heuristics.suspiciousName ||
      this.heuristics.namePatterns.length > 0
    );
  }

  /**
   * Merge with new classification results (creates new instance)
   */
  merge(updates: Partial<TokenClassificationData>): TokenClassification {
    return new TokenClassification(
      updates.blockaid !== undefined ? updates.blockaid : this.blockaid,
      updates.coingecko ?? this.coingecko,
      updates.heuristics ?? this.heuristics,
      new Date()
    );
  }

  /**
   * For database storage
   */
  toJSON(): object {
    return {
      blockaid: this.blockaid,
      coingecko: this.coingecko,
      heuristics: this.heuristics,
      classifiedAt: this.classifiedAt.toISOString(),
    };
  }

  /**
   * Check equality with another classification
   */
  equals(other: TokenClassification): boolean {
    return JSON.stringify(this.toJSON()) === JSON.stringify(other.toJSON());
  }
}
