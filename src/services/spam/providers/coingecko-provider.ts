import type { SpamClassificationProvider, TokenToClassify, SpamClassification, CoingeckoClassification } from '@/src/services/spam/types.js';

/**
 * CoinGecko-based spam classification provider.
 *
 * NOTE: This provider checks whether a token has a CoinGecko ID in our database,
 * which indicates it's a known legitimate token. It does NOT make live API calls
 * to CoinGecko for performance reasons (avoiding rate limits and latency).
 *
 * The coingeckoId field is populated during token sync/discovery processes,
 * so a null coingeckoId means the token wasn't found in CoinGecko's catalog
 * at the time of sync. This is a reasonable heuristic since legitimate tokens
 * with significant trading volume are typically listed on CoinGecko.
 *
 * Market cap rank enrichment is not implemented as it would require additional
 * API calls. The isListed check alone provides sufficient signal for spam detection.
 */
export class CoingeckoProvider implements SpamClassificationProvider {
  readonly name = 'coingecko';

  async classify(token: TokenToClassify): Promise<Partial<SpamClassification>> {
    const coingecko: CoingeckoClassification = {
      // Check database-cached CoinGecko ID (see class-level comment for rationale)
      isListed: token.coingeckoId !== null,
      marketCapRank: null,
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
