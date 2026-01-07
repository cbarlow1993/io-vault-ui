import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PricingService } from '@/src/services/balances/pricing-service.js';
import type { TokenPriceRepository } from '@/src/repositories/types.js';

// Mock the logger
vi.mock('@/utils/powertools.js', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock the CoinGecko SDK client
const mockSimplePriceGet = vi.fn();
vi.mock('@/src/services/coingecko/client.js', () => ({
  getCoinGeckoClient: () => ({
    simple: {
      price: {
        get: mockSimplePriceGet,
      },
    },
  }),
}));

function createMockPriceRepository() {
  return {
    findByCoingeckoId: vi.fn(),
    findByCoingeckoIds: vi.fn(),
    findFreshPrices: vi.fn(),
    upsertMany: vi.fn(),
  } as unknown as TokenPriceRepository;
}

describe('PricingService', () => {
  let priceRepository: ReturnType<typeof createMockPriceRepository>;
  let service: PricingService;

  beforeEach(() => {
    priceRepository = createMockPriceRepository();
    service = new PricingService(priceRepository, {
      cacheTtlSeconds: 60,
    });
    mockSimplePriceGet.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getPrices', () => {
    it('should return empty map for empty coingecko ids', async () => {
      const result = await service.getPrices([]);

      expect(result.size).toBe(0);
      expect(priceRepository.findFreshPrices).not.toHaveBeenCalled();
    });

    it('should return cached prices when available', async () => {
      vi.mocked(priceRepository.findFreshPrices).mockResolvedValue([
        {
          id: 'price-1',
          coingeckoId: 'ethereum',
          currency: 'usd',
          price: '2000.50',
          priceChange24h: '5.25',
          marketCap: '250000000000',
          fetchedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.getPrices(['ethereum'], 'usd');

      expect(result.size).toBe(1);
      expect(result.get('ethereum')).toEqual({
        coingeckoId: 'ethereum',
        price: 2000.5,
        priceChange24h: 5.25,
        marketCap: 250000000000,
        isStale: false,
      });
      expect(mockSimplePriceGet).not.toHaveBeenCalled();
    });

    it('should fetch missing prices from CoinGecko SDK', async () => {
      vi.mocked(priceRepository.findFreshPrices).mockResolvedValue([]);
      vi.mocked(priceRepository.upsertMany).mockResolvedValue();

      mockSimplePriceGet.mockResolvedValue({
        ethereum: {
          usd: 2000,
          usd_24h_change: 5.5,
          usd_market_cap: 250000000000,
        },
      });

      const result = await service.getPrices(['ethereum'], 'usd');

      expect(result.size).toBe(1);
      expect(result.get('ethereum')).toEqual({
        coingeckoId: 'ethereum',
        price: 2000,
        priceChange24h: 5.5,
        marketCap: 250000000000,
        isStale: false,
      });

      expect(mockSimplePriceGet).toHaveBeenCalledWith({
        ids: 'ethereum',
        vs_currencies: 'usd',
        include_24hr_change: true,
        include_market_cap: true,
      });

      expect(priceRepository.upsertMany).toHaveBeenCalledWith([
        {
          coingeckoId: 'ethereum',
          currency: 'usd',
          price: '2000',
          priceChange24h: '5.5',
          marketCap: '250000000000',
        },
      ]);
    });

    it('should deduplicate coingecko ids', async () => {
      vi.mocked(priceRepository.findFreshPrices).mockResolvedValue([
        {
          id: 'price-1',
          coingeckoId: 'ethereum',
          currency: 'usd',
          price: '2000',
          priceChange24h: null,
          marketCap: null,
          fetchedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.getPrices(['ethereum', 'ethereum', 'ethereum'], 'usd');

      expect(result.size).toBe(1);
      expect(priceRepository.findFreshPrices).toHaveBeenCalledWith(
        ['ethereum'],
        'usd',
        60
      );
    });

    it('should combine cached and fresh prices', async () => {
      vi.mocked(priceRepository.findFreshPrices).mockResolvedValue([
        {
          id: 'price-1',
          coingeckoId: 'ethereum',
          currency: 'usd',
          price: '2000',
          priceChange24h: '5',
          marketCap: null,
          fetchedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      vi.mocked(priceRepository.upsertMany).mockResolvedValue();

      mockSimplePriceGet.mockResolvedValue({
        bitcoin: {
          usd: 40000,
          usd_24h_change: -2.5,
          usd_market_cap: 800000000000,
        },
      });

      const result = await service.getPrices(['ethereum', 'bitcoin'], 'usd');

      expect(result.size).toBe(2);
      expect(result.get('ethereum')?.price).toBe(2000);
      expect(result.get('ethereum')?.isStale).toBe(false);
      expect(result.get('bitcoin')?.price).toBe(40000);
      expect(result.get('bitcoin')?.isStale).toBe(false);
    });

    it('should fall back to stale prices on CoinGecko SDK error', async () => {
      vi.mocked(priceRepository.findFreshPrices).mockResolvedValue([]);
      vi.mocked(priceRepository.findByCoingeckoIds).mockResolvedValue([
        {
          id: 'price-1',
          coingeckoId: 'ethereum',
          currency: 'usd',
          price: '1800',
          priceChange24h: '3',
          marketCap: null,
          fetchedAt: new Date(Date.now() - 120000), // 2 minutes old
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      mockSimplePriceGet.mockRejectedValue(new Error('SDK error: rate limited'));

      const result = await service.getPrices(['ethereum'], 'usd');

      expect(result.size).toBe(1);
      expect(result.get('ethereum')).toEqual({
        coingeckoId: 'ethereum',
        price: 1800,
        priceChange24h: 3,
        marketCap: null,
        isStale: true,
      });
    });

    it('should handle CoinGecko SDK network errors gracefully', async () => {
      vi.mocked(priceRepository.findFreshPrices).mockResolvedValue([]);
      vi.mocked(priceRepository.findByCoingeckoIds).mockResolvedValue([]);

      mockSimplePriceGet.mockRejectedValue(new Error('Network error'));

      const result = await service.getPrices(['ethereum'], 'usd');

      expect(result.size).toBe(0);
    });

    it('should pass correct parameters to SDK for multiple coins', async () => {
      vi.mocked(priceRepository.findFreshPrices).mockResolvedValue([]);
      vi.mocked(priceRepository.upsertMany).mockResolvedValue();

      mockSimplePriceGet.mockResolvedValue({
        ethereum: { usd: 2000 },
        bitcoin: { usd: 40000 },
      });

      await service.getPrices(['ethereum', 'bitcoin'], 'usd');

      expect(mockSimplePriceGet).toHaveBeenCalledWith({
        ids: 'ethereum,bitcoin',
        vs_currencies: 'usd',
        include_24hr_change: true,
        include_market_cap: true,
      });
    });

    it('should handle tokens not found in CoinGecko response', async () => {
      vi.mocked(priceRepository.findFreshPrices).mockResolvedValue([]);
      vi.mocked(priceRepository.upsertMany).mockResolvedValue();

      mockSimplePriceGet.mockResolvedValue({
        ethereum: { usd: 2000 },
        // bitcoin is not returned
      });

      const result = await service.getPrices(['ethereum', 'bitcoin'], 'usd');

      expect(result.size).toBe(1);
      expect(result.has('ethereum')).toBe(true);
      expect(result.has('bitcoin')).toBe(false);
    });

    it('should handle null priceChange24h and marketCap', async () => {
      vi.mocked(priceRepository.findFreshPrices).mockResolvedValue([
        {
          id: 'price-1',
          coingeckoId: 'ethereum',
          currency: 'usd',
          price: '2000',
          priceChange24h: null,
          marketCap: null,
          fetchedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.getPrices(['ethereum'], 'usd');

      expect(result.get('ethereum')?.priceChange24h).toBeNull();
      expect(result.get('ethereum')?.marketCap).toBeNull();
    });

    it('should handle different currencies', async () => {
      vi.mocked(priceRepository.findFreshPrices).mockResolvedValue([]);
      vi.mocked(priceRepository.upsertMany).mockResolvedValue();

      mockSimplePriceGet.mockResolvedValue({
        ethereum: {
          eur: 1800,
          eur_24h_change: 3.2,
          eur_market_cap: 220000000000,
        },
      });

      const result = await service.getPrices(['ethereum'], 'eur');

      expect(mockSimplePriceGet).toHaveBeenCalledWith({
        ids: 'ethereum',
        vs_currencies: 'eur',
        include_24hr_change: true,
        include_market_cap: true,
      });

      expect(result.get('ethereum')).toEqual({
        coingeckoId: 'ethereum',
        price: 1800,
        priceChange24h: 3.2,
        marketCap: 220000000000,
        isStale: false,
      });
    });
  });

  describe('configuration', () => {
    it('should use default cache TTL of 60 seconds when not configured', async () => {
      const defaultService = new PricingService(priceRepository);

      vi.mocked(priceRepository.findFreshPrices).mockResolvedValue([]);
      vi.mocked(priceRepository.upsertMany).mockResolvedValue();

      mockSimplePriceGet.mockResolvedValue({ ethereum: { usd: 2000 } });

      await defaultService.getPrices(['ethereum'], 'usd');

      // Should use default cache TTL of 60 seconds
      expect(priceRepository.findFreshPrices).toHaveBeenCalledWith(
        ['ethereum'],
        'usd',
        60
      );
    });

    it('should use custom cache TTL when configured', async () => {
      const customService = new PricingService(priceRepository, {
        cacheTtlSeconds: 120,
      });

      vi.mocked(priceRepository.findFreshPrices).mockResolvedValue([]);
      vi.mocked(priceRepository.upsertMany).mockResolvedValue();

      mockSimplePriceGet.mockResolvedValue({ ethereum: { usd: 2000 } });

      await customService.getPrices(['ethereum'], 'usd');

      expect(priceRepository.findFreshPrices).toHaveBeenCalledWith(
        ['ethereum'],
        'usd',
        120
      );
    });
  });
});
