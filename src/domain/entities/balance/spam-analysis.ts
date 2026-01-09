/**
 * SpamAnalysis value object.
 * Immutable representation of spam analysis for a balance, including user override.
 */
import {
  TokenClassification,
  type BlockaidResult,
  type CoingeckoResult,
  type HeuristicsResult,
  type RiskLevel,
  type RiskSummary,
  type UserOverride,
} from '../token/token-classification.js';

export interface SpamAnalysisData {
  blockaid: BlockaidResult | null;
  coingecko: CoingeckoResult | null;
  heuristics: HeuristicsResult | null;
  userOverride: UserOverride;
  classificationUpdatedAt: string | null;
}

/**
 * Immutable value object representing spam analysis for a balance.
 * Combines classification data with user override and computed summary.
 *
 * @example
 * const analysis = SpamAnalysis.fromClassification(tokenClassification, 'trusted');
 * analysis.isEffectivelySpam; // false (user override takes precedence)
 * analysis.displayStatus; // 'trusted'
 */
export class SpamAnalysis {
  private constructor(
    public readonly blockaid: BlockaidResult | null,
    public readonly coingecko: CoingeckoResult | null,
    public readonly heuristics: HeuristicsResult | null,
    public readonly userOverride: UserOverride,
    public readonly classificationUpdatedAt: string | null,
    public readonly summary: RiskSummary
  ) {
    Object.freeze(this);
  }

  /**
   * Create from TokenClassification and user override
   */
  static fromClassification(
    classification: TokenClassification,
    userOverride: UserOverride,
    updatedAt?: Date
  ): SpamAnalysis {
    const summary = classification.getRiskSummary(userOverride);

    return new SpamAnalysis(
      classification.blockaid,
      classification.coingecko,
      classification.heuristics,
      userOverride,
      updatedAt?.toISOString() ?? classification.classifiedAt.toISOString(),
      summary
    );
  }

  /**
   * Create from raw classification data and user override
   */
  static create(data: SpamAnalysisData): SpamAnalysis {
    // Build classification to compute summary
    const classification = TokenClassification.create({
      blockaid: data.blockaid,
      coingecko: data.coingecko ?? { isListed: false, marketCapRank: null },
      heuristics: data.heuristics ?? {
        suspiciousName: false,
        namePatterns: [],
        isUnsolicited: false,
        contractAgeDays: null,
        isNewContract: false,
        holderDistribution: 'unknown',
      },
    });

    const summary = classification.getRiskSummary(data.userOverride);

    return new SpamAnalysis(
      data.blockaid,
      data.coingecko,
      data.heuristics,
      data.userOverride,
      data.classificationUpdatedAt,
      summary
    );
  }

  /**
   * Create empty analysis (no classification data)
   */
  static none(): SpamAnalysis {
    return new SpamAnalysis(
      null,
      null,
      null,
      null,
      null,
      { riskLevel: 'safe', reasons: [] }
    );
  }

  /**
   * Create analysis for a trusted token (by user override)
   */
  static trusted(): SpamAnalysis {
    return new SpamAnalysis(
      null,
      null,
      null,
      'trusted',
      null,
      { riskLevel: 'safe', reasons: ['User marked as trusted'] }
    );
  }

  /**
   * Create analysis for a spam token (by user override)
   */
  static spam(): SpamAnalysis {
    return new SpamAnalysis(
      null,
      null,
      null,
      'spam',
      null,
      { riskLevel: 'danger', reasons: ['User marked as spam'] }
    );
  }

  // --- Computed properties ---

  /**
   * Risk level from summary
   */
  get riskLevel(): RiskLevel {
    return this.summary.riskLevel;
  }

  /**
   * Reasons for current risk level
   */
  get riskReasons(): string[] {
    return this.summary.reasons;
  }

  /**
   * Whether token should be treated as spam (considers user override)
   */
  get isEffectivelySpam(): boolean {
    if (this.userOverride === 'trusted') return false;
    if (this.userOverride === 'spam') return true;
    return this.summary.riskLevel === 'danger';
  }

  /**
   * Whether token should be filtered out in spam filtering
   */
  get shouldFilter(): boolean {
    return this.isEffectivelySpam;
  }

  /**
   * Human-readable status for display
   */
  get displayStatus(): 'trusted' | 'spam' | 'warning' | 'safe' {
    if (this.userOverride === 'trusted') return 'trusted';
    if (this.userOverride === 'spam') return 'spam';
    if (this.summary.riskLevel === 'danger') return 'spam';
    if (this.summary.riskLevel === 'warning') return 'warning';
    return 'safe';
  }

  /**
   * Whether we have meaningful classification data
   */
  get hasClassification(): boolean {
    return this.blockaid !== null || this.coingecko !== null || this.heuristics !== null;
  }

  /**
   * Whether user has overridden the classification
   */
  get hasUserOverride(): boolean {
    return this.userOverride !== null;
  }

  // --- Serialization ---

  /**
   * For API responses (matches existing SpamAnalysis interface)
   */
  toJSON(): {
    blockaid: BlockaidResult | null;
    coingecko: CoingeckoResult | null;
    heuristics: HeuristicsResult | null;
    userOverride: UserOverride;
    classificationUpdatedAt: string | null;
    summary: RiskSummary;
  } {
    return {
      blockaid: this.blockaid,
      coingecko: this.coingecko,
      heuristics: this.heuristics,
      userOverride: this.userOverride,
      classificationUpdatedAt: this.classificationUpdatedAt,
      summary: this.summary,
    };
  }

  /**
   * Check equality with another SpamAnalysis
   */
  equals(other: SpamAnalysis): boolean {
    return (
      this.userOverride === other.userOverride &&
      this.summary.riskLevel === other.summary.riskLevel &&
      JSON.stringify(this.blockaid) === JSON.stringify(other.blockaid)
    );
  }
}
