import { logger } from '@/utils/powertools.js';
import type {
  SpamClassification,
  SpamClassificationProvider,
  TokenToClassify,
  ClassificationResult,
} from '@/src/services/spam/types.js';

export interface RiskSummary {
  riskLevel: 'safe' | 'warning' | 'danger';
  reasons: string[];
}

export class SpamClassificationService {
  constructor(private readonly providers: SpamClassificationProvider[]) {}

  async classifyToken(token: TokenToClassify): Promise<ClassificationResult> {
    // Call all providers in parallel
    const providerResults = await Promise.all(
      this.providers.map(async (provider) => {
        try {
          return await provider.classify(token);
        } catch (error) {
          logger.warn('Provider classification failed', { provider: provider.name, error, tokenAddress: token.address });
          return {};
        }
      })
    );

    // Merge results from all providers
    const classification = this.mergeClassifications(providerResults);

    return {
      tokenAddress: token.address.toLowerCase(),
      classification,
      updatedAt: new Date(),
    };
  }

  async classifyTokensBatch(tokens: TokenToClassify[]): Promise<Map<string, ClassificationResult>> {
    const results = new Map<string, ClassificationResult>();

    // Process tokens in parallel
    const classificationPromises = tokens.map((token) => this.classifyToken(token));
    const classifications = await Promise.all(classificationPromises);

    tokens.forEach((token, index) => {
      results.set(token.address.toLowerCase(), classifications[index]!);
    });

    return results;
  }

  computeRiskSummary(
    classification: SpamClassification,
    userOverride: 'trusted' | 'spam' | null
  ): RiskSummary {
    const reasons: string[] = [];

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

    // Check Blockaid results
    if (classification.blockaid?.isMalicious) {
      reasons.push('Flagged as malicious by Blockaid');
    }
    if (classification.blockaid?.isPhishing) {
      reasons.push('Flagged as phishing by Blockaid');
    }

    // Check heuristics
    if (classification.heuristics.suspiciousName) {
      reasons.push('Suspicious token name detected');
    }
    // NOTE: isUnsolicited, isNewContract, and holderDistribution checks are not yet implemented.
    // These require additional infrastructure (on-chain analysis, holder distribution APIs).
    // The heuristics provider returns hardcoded values for these fields until implemented.

    // Check CoinGecko listing - only add as reason if there are other issues
    if (!classification.coingecko.isListed && reasons.length > 0) {
      reasons.push('Not listed on CoinGecko');
    }

    // Determine risk level
    let riskLevel: 'safe' | 'warning' | 'danger' = 'safe';

    if (classification.blockaid?.isMalicious || classification.blockaid?.isPhishing) {
      riskLevel = 'danger';
    } else if (reasons.length > 0) {
      riskLevel = 'warning';
    }

    return { riskLevel, reasons };
  }

  private mergeClassifications(results: Partial<SpamClassification>[]): SpamClassification {
    const merged: SpamClassification = {
      blockaid: null,
      coingecko: {
        isListed: false,
        marketCapRank: null,
      },
      heuristics: {
        suspiciousName: false,
        namePatterns: [],
        isUnsolicited: false,
        contractAgeDays: null,
        isNewContract: false,
        holderDistribution: 'unknown',
      },
    };

    for (const result of results) {
      if (result.blockaid !== undefined) {
        merged.blockaid = result.blockaid;
      }
      if (result.coingecko !== undefined) {
        merged.coingecko = result.coingecko;
      }
      if (result.heuristics !== undefined) {
        merged.heuristics = result.heuristics;
      }
    }

    return merged;
  }
}
