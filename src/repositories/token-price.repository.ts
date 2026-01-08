import type { Kysely } from 'kysely';
import { v4 as uuidv4 } from 'uuid';
import type { Database, TokenPrice as TokenPriceRow } from '@/src/lib/database/types.js';
import type { TokenPrice, CreateTokenPriceInput, TokenPriceRepository } from '@/src/repositories/types.js';

/**
 * Maps a database token price row to the repository TokenPrice interface
 */
function mapToTokenPrice(row: TokenPriceRow): TokenPrice {
  return {
    id: row.id,
    coingeckoId: row.coingecko_id,
    currency: row.currency,
    price: row.price,
    priceChange24h: row.price_change_24h,
    marketCap: row.market_cap,
    fetchedAt: row.fetched_at as Date,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

export class PostgresTokenPriceRepository implements TokenPriceRepository {
  constructor(private db: Kysely<Database>) {}

  async findByCoingeckoId(coingeckoId: string, currency: string): Promise<TokenPrice | null> {
    const result = await this.db
      .selectFrom('token_prices')
      .selectAll()
      .where('coingecko_id', '=', coingeckoId)
      .where('currency', '=', currency.toLowerCase())
      .executeTakeFirst();

    return result ? mapToTokenPrice(result) : null;
  }

  async findByCoingeckoIds(coingeckoIds: string[], currency: string): Promise<TokenPrice[]> {
    if (coingeckoIds.length === 0) {
      return [];
    }

    const results = await this.db
      .selectFrom('token_prices')
      .selectAll()
      .where('coingecko_id', 'in', coingeckoIds)
      .where('currency', '=', currency.toLowerCase())
      .execute();

    return results.map(mapToTokenPrice);
  }

  async findFreshPrices(
    coingeckoIds: string[],
    currency: string,
    maxAgeSeconds: number
  ): Promise<TokenPrice[]> {
    if (coingeckoIds.length === 0) {
      return [];
    }

    // Calculate cutoff time in JavaScript to avoid SQL injection risk
    const cutoffTime = new Date(Date.now() - maxAgeSeconds * 1000);

    const results = await this.db
      .selectFrom('token_prices')
      .selectAll()
      .where('coingecko_id', 'in', coingeckoIds)
      .where('currency', '=', currency.toLowerCase())
      .where('fetched_at', '>', cutoffTime)
      .execute();

    return results.map(mapToTokenPrice);
  }

  async upsertMany(inputs: CreateTokenPriceInput[]): Promise<void> {
    if (inputs.length === 0) {
      return;
    }

    const now = new Date().toISOString();

    const values = inputs.map((input) => ({
      id: uuidv4(),
      coingecko_id: input.coingeckoId,
      currency: input.currency.toLowerCase(),
      price: input.price,
      price_change_24h: input.priceChange24h ?? null,
      market_cap: input.marketCap ?? null,
      fetched_at: now,
      created_at: now,
      updated_at: now,
    }));

    await this.db
      .insertInto('token_prices')
      .values(values)
      .onConflict((oc) =>
        oc.columns(['coingecko_id', 'currency']).doUpdateSet((eb) => ({
          price: eb.ref('excluded.price'),
          price_change_24h: eb.ref('excluded.price_change_24h'),
          market_cap: eb.ref('excluded.market_cap'),
          fetched_at: eb.ref('excluded.fetched_at'),
          updated_at: eb.ref('excluded.updated_at'),
        }))
      )
      .execute();
  }
}
