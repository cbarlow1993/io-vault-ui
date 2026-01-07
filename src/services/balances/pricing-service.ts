import { logger } from '@/utils/powertools.js';
import type { TokenPriceRepository, CreateTokenPriceInput } from '@/src/repositories/types.js';
import { getCoinGeckoClient } from '@/src/services/coingecko/client.js';
import { handleCoinGeckoError } from '@/src/services/coingecko/index.js';

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

/** CoinGecko API limit for IDs per request */
const COINGECKO_MAX_IDS_PER_REQUEST = 250;

/** Supported currencies for CoinGecko price lookups */
const SUPPORTED_CURRENCIES = new Set(['usd', 'eur', 'gbp', 'jpy', 'btc', 'eth']);

/**
 * Service for fetching and caching token prices from CoinGecko.
 * Implements caching with configurable TTL and stale fallback.
 */
export class PricingService {
  private readonly cacheTtlSeconds: number;

  constructor(
    private readonly priceRepository: TokenPriceRepository,
    config: PricingServiceConfig = {}
  ) {
    this.cacheTtlSeconds = config.cacheTtlSeconds ?? 60;
  }

  /**
   * Parse a string price value to a number, returning null for empty/null values.
   */
  private parsePrice(value: string | null): number | null {
    return value ? parseFloat(value) : null;
  }

  /**
   * Get prices for multiple tokens by their CoinGecko IDs.
   * Uses caching with configurable TTL and falls back to stale prices when needed.
   *
   * @param coingeckoIds - Array of CoinGecko token IDs
   * @param currency - Currency for prices (default: 'usd')
   * @returns Map of token ID to price info
   */
  async getPrices(
    coingeckoIds: string[],
    currency: string = 'usd'
  ): Promise<Map<string, TokenPriceInfo>> {
    if (coingeckoIds.length === 0) {
      return new Map();
    }

    // Validate and normalize currency
    const normalizedCurrency = currency.toLowerCase().trim();
    if (!SUPPORTED_CURRENCIES.has(normalizedCurrency)) {
      logger.warn('Unsupported currency provided, using default USD', { currency });
      currency = 'usd';
    } else {
      currency = normalizedCurrency;
    }

    // Deduplicate and filter out empty/invalid IDs
    const uniqueIds = [...new Set(coingeckoIds)].filter(id => id && id.trim().length > 0);
    if (uniqueIds.length === 0) {
      return new Map();
    }

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
        priceChange24h: this.parsePrice(cached.priceChange24h),
        marketCap: this.parsePrice(cached.marketCap),
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
          logger.debug('Successfully cached fresh prices', { count: cacheInputs.length });
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
              priceChange24h: this.parsePrice(stale.priceChange24h),
              marketCap: this.parsePrice(stale.marketCap),
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

  /**
   * Fetch prices from CoinGecko API for a batch of token IDs.
   * Handles batching (max 250 per request) and partial failures.
   *
   * @param ids - Array of CoinGecko token IDs to fetch
   * @param currency - Currency for prices
   * @returns Object containing prices map and array of IDs that failed
   */
  private async fetchFromCoinGecko(
    ids: string[],
    currency: string
  ): Promise<{ prices: Map<string, Omit<TokenPriceInfo, 'isStale'>>; notFoundIds: string[] }> {
    const prices = new Map<string, Omit<TokenPriceInfo, 'isStale'>>();
    const notFoundIds: string[] = [];
    const client = getCoinGeckoClient();

    const batches = this.chunk(ids, COINGECKO_MAX_IDS_PER_REQUEST);

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
            // Only add if we got a valid positive price (not undefined, null, or zero)
            // A price of 0 typically indicates a pricing error or unavailable data
            if (price !== undefined && price > 0) {
              prices.set(id, {
                coingeckoId: id,
                price,
                priceChange24h: priceData[`${currency}_24h_change`] ?? null,
                marketCap: priceData[`${currency}_market_cap`] ?? null,
              });
            } else {
              logger.debug('CoinGecko returned token but without valid price', {
                coingeckoId: id,
                currency,
                price,
              });
              notFoundIds.push(id);
            }
          } else {
            // Token not found in CoinGecko response
            logger.debug('Token not found in CoinGecko price response', { coingeckoId: id });
            notFoundIds.push(id);
          }
        }
      } catch (error) {
        // Log batch-specific errors with coin IDs for debugging, continue with other batches
        handleCoinGeckoError(error, { batchSize: batch.length, coinIds: batch });
        // Mark all IDs in this batch as failed
        notFoundIds.push(...batch);
      }
    }

    return { prices, notFoundIds };
  }

  /**
   * Split an array into smaller chunks of specified size.
   *
   * @param arr - The array to split
   * @param size - Maximum size of each chunk
   * @returns Array of chunks
   */
  private chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}
