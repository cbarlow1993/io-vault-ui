import { logger } from '@/utils/powertools.js';
import type {
  SpamClassification,
  SpamClassificationProvider,
  TokenToClassify,
  ClassificationResult,
} from '@/src/services/spam/types.js';
import { TokenClassification, type RiskSummary } from '@/src/domain/entities/index.js';

export type { RiskSummary };

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
      const classification = classifications[index];
      if (classification) {
        results.set(token.address.toLowerCase(), classification);
      }
    });

    return results;
  }

  computeRiskSummary(
    classification: SpamClassification,
    userOverride: 'trusted' | 'spam' | null
  ): RiskSummary {
    const tokenClassification = TokenClassification.create({
      blockaid: classification.blockaid,
      coingecko: classification.coingecko,
      heuristics: classification.heuristics,
      classifiedAt: new Date(),
    });
    return tokenClassification.getRiskSummary(userOverride);
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
