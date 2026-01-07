import { logger } from '@/utils/powertools.js';
import type { TokenPriceRepository, CreateTokenPriceInput } from '@/src/repositories/types.js';
import { getCoinGeckoClient } from '@/src/services/coingecko/client.js';
import {
  RateLimitError,
  AuthenticationError,
  APIConnectionError,
  APIConnectionTimeoutError,
} from '@coingecko/coingecko-typescript';

export interface TokenPriceInfo {
  coingeckoId: string;
  price: number;
  priceChange24h: number | null;
  marketCap: number | null;
  isStale: boolean;
}

/** Tokens that could not be priced (for caller visibility) */
export interface PricingResult {
  prices: Map<string, TokenPriceInfo>;
  /** Token IDs that failed to get prices (not found, API error, etc.) */
  failedIds: string[];
}

export interface PricingServiceConfig {
  cacheTtlSeconds?: number;
}

export class PricingService {
  private readonly cacheTtlSeconds: number;

  constructor(
    private readonly priceRepository: TokenPriceRepository,
    config: PricingServiceConfig = {}
  ) {
    this.cacheTtlSeconds = config.cacheTtlSeconds ?? 60;
  }

  async getPrices(
    coingeckoIds: string[],
    currency: string = 'usd'
  ): Promise<Map<string, TokenPriceInfo>> {
    if (coingeckoIds.length === 0) {
      return new Map();
    }

    const uniqueIds = [...new Set(coingeckoIds)];
    const result = new Map<string, TokenPriceInfo>();

    // Check cache first
    const cachedPrices = await this.priceRepository.findFreshPrices(
      uniqueIds,
      currency,
      this.cacheTtlSeconds
    );

    const cachedIds = new Set<string>();
    for (const cached of cachedPrices) {
      cachedIds.add(cached.coingeckoId);
      result.set(cached.coingeckoId, {
        coingeckoId: cached.coingeckoId,
        price: parseFloat(cached.price),
        priceChange24h: cached.priceChange24h ? parseFloat(cached.priceChange24h) : null,
        marketCap: cached.marketCap ? parseFloat(cached.marketCap) : null,
        isStale: false,
      });
    }

    // Fetch missing prices from CoinGecko
    const missingIds = uniqueIds.filter((id) => !cachedIds.has(id));
    if (missingIds.length > 0) {
      const { prices: freshPrices, notFoundIds } = await this.fetchFromCoinGecko(missingIds, currency);

      // Update cache with fresh prices
      const cacheInputs: CreateTokenPriceInput[] = [];
      for (const [id, price] of freshPrices) {
        result.set(id, { ...price, isStale: false });
        cacheInputs.push({
          coingeckoId: id,
          currency,
          price: price.price.toString(),
          priceChange24h: price.priceChange24h?.toString() ?? null,
          marketCap: price.marketCap?.toString() ?? null,
        });
      }

      if (cacheInputs.length > 0) {
        try {
          await this.priceRepository.upsertMany(cacheInputs);
        } catch (cacheError) {
          logger.warn('Failed to cache fresh prices', {
            error: cacheError instanceof Error ? cacheError.message : cacheError,
            count: cacheInputs.length,
          });
        }
      }

      // Try to get stale prices for IDs that weren't found fresh
      if (notFoundIds.length > 0) {
        try {
          const stalePrices = await this.priceRepository.findByCoingeckoIds(
            notFoundIds,
            currency
          );

          for (const stale of stalePrices) {
            result.set(stale.coingeckoId, {
              coingeckoId: stale.coingeckoId,
              price: parseFloat(stale.price),
              priceChange24h: stale.priceChange24h ? parseFloat(stale.priceChange24h) : null,
              marketCap: stale.marketCap ? parseFloat(stale.marketCap) : null,
              isStale: true,
            });
          }

          // Log which IDs still have no price
          const stillMissingIds = notFoundIds.filter((id) => !result.has(id));
          if (stillMissingIds.length > 0) {
            logger.debug('Tokens with no price data available', {
              coingeckoIds: stillMissingIds,
              count: stillMissingIds.length,
            });
          }
        } catch (staleError) {
          logger.warn('Failed to fetch stale prices from cache', {
            error: staleError instanceof Error ? staleError.message : staleError,
            notFoundIds,
          });
        }
      }
    }

    return result;
  }

  private async fetchFromCoinGecko(
    ids: string[],
    currency: string
  ): Promise<{ prices: Map<string, Omit<TokenPriceInfo, 'isStale'>>; notFoundIds: string[] }> {
    const prices = new Map<string, Omit<TokenPriceInfo, 'isStale'>>();
    const notFoundIds: string[] = [];
    const client = getCoinGeckoClient();

    // CoinGecko limits to 250 IDs per request
    const batches = this.chunk(ids, 250);

    for (const batch of batches) {
      try {
        const response = await client.simple.price.get({
          ids: batch.join(','),
          vs_currencies: currency,
          include_24hr_change: true,
          include_market_cap: true,
        });

        // SDK returns an object where keys are coin IDs
        // e.g., { "bitcoin": { "usd": 50000, "usd_24h_change": 2.5, "usd_market_cap": 900000000000 } }
        const data = response as Record<string, Record<string, number | undefined>>;

        for (const id of batch) {
          const priceData = data[id];
          if (priceData) {
            const price = priceData[currency];
            // Only add if we got an actual price value (not undefined)
            if (price !== undefined) {
              prices.set(id, {
                coingeckoId: id,
                price,
                priceChange24h: priceData[`${currency}_24h_change`] ?? null,
                marketCap: priceData[`${currency}_market_cap`] ?? null,
              });
            } else {
              logger.debug('CoinGecko returned token but without price', { coingeckoId: id, currency });
              notFoundIds.push(id);
            }
          } else {
            // Token not found in CoinGecko response
            logger.debug('Token not found in CoinGecko price response', { coingeckoId: id });
            notFoundIds.push(id);
          }
        }
      } catch (error) {
        // Log batch-specific errors but continue with other batches
        if (error instanceof RateLimitError) {
          logger.error('CoinGecko rate limit exceeded during batch fetch', { batchSize: batch.length });
        } else if (error instanceof AuthenticationError) {
          logger.error('CoinGecko authentication failed - check API key');
        } else if (error instanceof APIConnectionTimeoutError) {
          logger.warn('CoinGecko batch request timed out', { batchSize: batch.length });
        } else if (error instanceof APIConnectionError) {
          logger.warn('CoinGecko connection error during batch fetch', { batchSize: batch.length });
        } else {
          logger.warn('CoinGecko batch fetch failed', {
            batchSize: batch.length,
            error: error instanceof Error ? error.message : error,
          });
        }
        // Mark all IDs in this batch as failed
        notFoundIds.push(...batch);
      }
    }

    return { prices, notFoundIds };
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}
