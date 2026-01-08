import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresTokenPriceRepository } from '@/src/repositories/token-price.repository.js';
import type { Kysely } from 'kysely';
import type { Database } from '@/src/lib/database/types.js';

// Create mock Kysely instance
function createMockDb() {
  const mockExecute = vi.fn();
  const mockExecuteTakeFirst = vi.fn();
  const mockExecuteTakeFirstOrThrow = vi.fn();

  const chainable = {
    selectAll: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returningAll: vi.fn().mockReturnThis(),
    onConflict: vi.fn().mockReturnThis(),
    doUpdateSet: vi.fn().mockReturnThis(),
    columns: vi.fn().mockReturnThis(),
    execute: mockExecute,
    executeTakeFirst: mockExecuteTakeFirst,
    executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
  };

  // Mock onConflict to return chainable with columns/doUpdateSet
  chainable.onConflict = vi.fn((cb) => {
    const ocChainable = {
      columns: vi.fn().mockReturnValue({
        doUpdateSet: vi.fn().mockReturnValue(chainable),
      }),
    };
    cb(ocChainable);
    return chainable;
  });

  const mockDb = {
    selectFrom: vi.fn().mockReturnValue(chainable),
    insertInto: vi.fn().mockReturnValue(chainable),
    updateTable: vi.fn().mockReturnValue(chainable),
    deleteFrom: vi.fn().mockReturnValue(chainable),
  };

  return {
    mockDb: mockDb as unknown as Kysely<Database>,
    chainable,
    mockExecute,
    mockExecuteTakeFirst,
    mockExecuteTakeFirstOrThrow,
  };
}

describe('PostgresTokenPriceRepository', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let repository: PostgresTokenPriceRepository;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = new PostgresTokenPriceRepository(mockDb.mockDb);
  });

  describe('findByCoingeckoId', () => {
    it('should return token price when found', async () => {
      const expectedPrice = {
        id: 'price-uuid-1',
        coingecko_id: 'ethereum',
        currency: 'usd',
        price: '2000.50',
        price_change_24h: '5.25',
        market_cap: '250000000000',
        fetched_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.mockExecuteTakeFirst.mockResolvedValue(expectedPrice);

      const result = await repository.findByCoingeckoId('ethereum', 'USD');

      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('token_prices');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('coingecko_id', '=', 'ethereum');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('currency', '=', 'usd');
      expect(result?.coingeckoId).toBe('ethereum');
      expect(result?.price).toBe('2000.50');
    });

    it('should normalize currency to lowercase', async () => {
      mockDb.mockExecuteTakeFirst.mockResolvedValue(undefined);

      await repository.findByCoingeckoId('ethereum', 'USD');

      expect(mockDb.chainable.where).toHaveBeenCalledWith('currency', '=', 'usd');
    });

    it('should return null when not found', async () => {
      mockDb.mockExecuteTakeFirst.mockResolvedValue(undefined);

      const result = await repository.findByCoingeckoId('unknown', 'usd');

      expect(result).toBeNull();
    });
  });

  describe('findByCoingeckoIds', () => {
    it('should return token prices for given ids', async () => {
      const prices = [
        {
          id: 'price-1',
          coingecko_id: 'ethereum',
          currency: 'usd',
          price: '2000',
          price_change_24h: null,
          market_cap: null,
          fetched_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'price-2',
          coingecko_id: 'bitcoin',
          currency: 'usd',
          price: '40000',
          price_change_24h: '-2.5',
          market_cap: '800000000000',
          fetched_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockDb.mockExecute.mockResolvedValue(prices);

      const result = await repository.findByCoingeckoIds(['ethereum', 'bitcoin'], 'usd');

      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('token_prices');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('coingecko_id', 'in', ['ethereum', 'bitcoin']);
      expect(result).toHaveLength(2);
    });

    it('should return empty array for empty ids', async () => {
      const result = await repository.findByCoingeckoIds([], 'usd');

      expect(mockDb.mockDb.selectFrom).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('findFreshPrices', () => {
    it('should return prices newer than max age', async () => {
      const freshPrice = {
        id: 'price-1',
        coingecko_id: 'ethereum',
        currency: 'usd',
        price: '2000',
        price_change_24h: '5',
        market_cap: null,
        fetched_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.mockExecute.mockResolvedValue([freshPrice]);

      const result = await repository.findFreshPrices(['ethereum'], 'usd', 60);

      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('token_prices');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('coingecko_id', 'in', ['ethereum']);
      expect(mockDb.chainable.where).toHaveBeenCalledWith('fetched_at', '>', expect.any(Date));
      expect(result).toHaveLength(1);
    });

    it('should return empty array for empty ids', async () => {
      const result = await repository.findFreshPrices([], 'usd', 60);

      expect(mockDb.mockDb.selectFrom).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('upsertMany', () => {
    it('should upsert multiple token prices', async () => {
      const inputs = [
        {
          coingeckoId: 'ethereum',
          currency: 'USD',
          price: '2000',
          priceChange24h: '5',
          marketCap: '250000000000',
        },
        {
          coingeckoId: 'bitcoin',
          currency: 'USD',
          price: '40000',
          priceChange24h: null,
          marketCap: null,
        },
      ];

      mockDb.mockExecute.mockResolvedValue([]);

      await repository.upsertMany(inputs);

      expect(mockDb.mockDb.insertInto).toHaveBeenCalledWith('token_prices');
      expect(mockDb.chainable.values).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            coingecko_id: 'ethereum',
            currency: 'usd',
            price: '2000',
          }),
          expect.objectContaining({
            coingecko_id: 'bitcoin',
            currency: 'usd',
            price: '40000',
          }),
        ])
      );
    });

    it('should not call insert for empty inputs', async () => {
      await repository.upsertMany([]);

      expect(mockDb.mockDb.insertInto).not.toHaveBeenCalled();
    });
  });
});
