import type { SpamClassificationProvider, TokenToClassify, SpamClassification, HeuristicsClassification } from '@/src/services/spam/types.js';
import { TokenName } from '@/src/domain/entities/index.js';
import { TokenAddress } from '@/src/domain/value-objects/index.js';

export class HeuristicsProvider implements SpamClassificationProvider {
  readonly name = 'heuristics';

  async classify(token: TokenToClassify): Promise<Partial<SpamClassification>> {
    const tokenName = TokenName.create(token.name, token.symbol);

    const heuristics: HeuristicsClassification = {
      suspiciousName: tokenName.isSuspicious,
      namePatterns: tokenName.suspiciousPatterns,
      isUnsolicited: false, // TODO: Implement airdrop detection
      contractAgeDays: null, // TODO: Implement contract age checking
      isNewContract: false,
      holderDistribution: 'unknown', // TODO: Implement holder analysis
    };

    return { heuristics };
  }

  async classifyBatch(tokens: TokenToClassify[]): Promise<Map<string, Partial<SpamClassification>>> {
    const results = new Map<string, Partial<SpamClassification>>();
    const classifications = await Promise.all(
      tokens.map(async (token) => ({
        address: TokenAddress.normalizeForComparison(token.address) as string,
        classification: await this.classify(token),
      }))
    );
    for (const { address, classification } of classifications) {
      results.set(address, classification);
    }
    return results;
  }
}
