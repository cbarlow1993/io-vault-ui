import type { SpamClassificationProvider, TokenToClassify, SpamClassification, CoingeckoClassification } from '@/src/services/spam/types.js';

export class CoingeckoProvider implements SpamClassificationProvider {
  readonly name = 'coingecko';

  async classify(token: TokenToClassify): Promise<Partial<SpamClassification>> {
    const coingecko: CoingeckoClassification = {
      isListed: token.coingeckoId !== null,
      marketCapRank: null, // Could be enriched from CoinGecko API if needed
    };

    return { coingecko };
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
