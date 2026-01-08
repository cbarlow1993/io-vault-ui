import type { SpamClassificationProvider, TokenToClassify, SpamClassification, HeuristicsClassification } from '@/src/services/spam/types.js';
import { NameAnalyzer } from '@/src/services/spam/heuristics/name-analyzer.js';

export class HeuristicsProvider implements SpamClassificationProvider {
  readonly name = 'heuristics';
  private readonly nameAnalyzer: NameAnalyzer;

  constructor() {
    this.nameAnalyzer = new NameAnalyzer();
  }

  async classify(token: TokenToClassify): Promise<Partial<SpamClassification>> {
    const nameAnalysis = this.nameAnalyzer.analyze(token.name, token.symbol);

    const heuristics: HeuristicsClassification = {
      suspiciousName: nameAnalysis.suspiciousName,
      namePatterns: nameAnalysis.namePatterns,
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
        address: token.address.toLowerCase(),
        classification: await this.classify(token),
      }))
    );
    for (const { address, classification } of classifications) {
      results.set(address, classification);
    }
    return results;
  }
}
