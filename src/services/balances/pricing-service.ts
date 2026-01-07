import { logger } from '@/utils/powertools.js';
import type { TokenPriceRepository, CreateTokenPriceInput } from '@/src/repositories/types.js';
import { getCoinGeckoClient } from '@/src/services/coingecko/client.js';

export interface TokenPriceInfo {
  coingeckoId: string;
  price: number;
  priceChange24h: number | null;
  marketCap: number | null;
  isStale: boolean;
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
      try {
        const freshPrices = await this.fetchFromCoinGecko(missingIds, currency);

        // Update cache
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
          await this.priceRepository.upsertMany(cacheInputs);
        }
      } catch (error) {
        logger.error('Failed to fetch prices from CoinGecko, falling back to stale cache', {
          error,
          missingIds,
          currency,
        });

        // On error, try to get stale prices
        const stalePrices = await this.priceRepository.findByCoingeckoIds(
          missingIds,
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
      }
    }

    return result;
  }

  private async fetchFromCoinGecko(
    ids: string[],
    currency: string
  ): Promise<Map<string, Omit<TokenPriceInfo, 'isStale'>>> {
    const result = new Map<string, Omit<TokenPriceInfo, 'isStale'>>();
    const client = getCoinGeckoClient();

    // CoinGecko limits to 250 IDs per request
    const batches = this.chunk(ids, 250);

    for (const batch of batches) {
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
          result.set(id, {
            coingeckoId: id,
            price: priceData[currency] ?? 0,
            priceChange24h: priceData[`${currency}_24h_change`] ?? null,
            marketCap: priceData[`${currency}_market_cap`] ?? null,
          });
        }
      }
    }

    return result;
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}
