import { logger } from '@/utils/powertools.js';
import type {
  SpamClassification,
  SpamClassificationProvider,
  TokenToClassify,
  ClassificationResult,
} from '@/src/services/spam/types.js';
import { TokenClassification, SpamClassificationResult, type RiskSummary } from '@/src/domain/entities/index.js';
import { WalletAddress } from '@/src/domain/value-objects/index.js';

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

    // Merge results from all providers using domain aggregate
    const classificationResult = SpamClassificationResult.merge(providerResults);
    const classification = classificationResult.toJSON() as SpamClassification;

    return {
      tokenAddress: WalletAddress.normalizeForComparison(token.address),
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
        results.set(WalletAddress.normalizeForComparison(token.address), classification);
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

}
