import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { TokenPrice } from '@/src/domain/value-objects/index.js';

const mockGetID = vi.fn();
const mockContractGet = vi.fn();

vi.mock('@/src/services/coingecko/client.js', () => ({
  getCoinGeckoClient: vi.fn(() => ({
    coins: {
      getID: mockGetID,
      contract: { get: mockContractGet },
    },
  })),
}));

vi.mock('@/src/config/chain-mappings/index.js', () => ({
  mapChainAliasToCoinGeckoAssetPlatform: vi.fn((alias) => alias === ChainAlias.ETH ? 'ethereum' : null),
  mapChainAliasToCoinGeckoNativeCoinId: vi.fn((alias) => alias === ChainAlias.ETH ? 'ethereum' : null),
}));

vi.mock('@/utils/powertools.js', () => ({
  logger: { warn: vi.fn(), debug: vi.fn() },
}));

// Use dynamic import after mocks are set up
const { fetchTokenMetadata, fetchNativeTokenMetadata, getTokenUsdPrice, getNativeTokenUsdPrice } = await import('@/src/services/coingecko/index.js');

describe('CoinGecko Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchTokenMetadata', () => {
    it('should return token metadata on success', async () => {
      const mockData = {
        id: 'usd-coin',
        symbol: 'usdc',
        name: 'USD Coin',
        image: { small: 'https://example.com/usdc.png' },
        market_data: { current_price: { usd: 1.0 } },
      };
      mockContractGet.mockResolvedValue(mockData);

      const chain = { Alias: ChainAlias.ETH } as any;
      const result = await fetchTokenMetadata(chain, '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');

      expect(result).toEqual(mockData);
      expect(mockContractGet).toHaveBeenCalledWith(
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        { id: 'ethereum' }
      );
    });

    it('should return null on error', async () => {
      mockContractGet.mockRejectedValue(new Error('Not found'));

      const chain = { Alias: ChainAlias.ETH } as any;
      const result = await fetchTokenMetadata(chain, '0xinvalid');

      expect(result).toBeNull();
    });
  });

  describe('fetchNativeTokenMetadata', () => {
    it('should return native token metadata on success', async () => {
      const mockData = {
        id: 'ethereum',
        symbol: 'eth',
        name: 'Ethereum',
        image: { small: 'https://example.com/eth.png' },
        market_data: { current_price: { usd: 2000 } },
      };
      mockGetID.mockResolvedValue(mockData);

      const chain = { Alias: ChainAlias.ETH } as any;
      const result = await fetchNativeTokenMetadata(chain);

      expect(result).toEqual(mockData);
      expect(mockGetID).toHaveBeenCalledWith('ethereum');
    });

    it('should return null on error', async () => {
      mockGetID.mockRejectedValue(new Error('Not found'));

      const chain = { Alias: ChainAlias.ETH } as any;
      const result = await fetchNativeTokenMetadata(chain);

      expect(result).toBeNull();
    });
  });

  describe('getTokenUsdPrice', () => {
    it('should return TokenPrice instance when successful', async () => {
      mockContractGet.mockResolvedValue({
        id: 'usd-coin',
        market_data: {
          current_price: { usd: 1.5 },
          price_change_percentage_24h: 2.5,
          market_cap: { usd: 5000000000 },
        },
      });

      const result = await getTokenUsdPrice(ChainAlias.ETH, '0xtoken');

      expect(result).toBeInstanceOf(TokenPrice);
      expect(result?.price).toBe(1.5);
      expect(result?.currency).toBe('usd');
      expect(result?.coingeckoId).toBe('usd-coin');
      expect(result?.priceChange24h).toBe(2.5);
      expect(result?.marketCap).toBe(5000000000);
    });

    it('should return TokenPrice with correct properties when some market data is missing', async () => {
      mockContractGet.mockResolvedValue({
        id: 'some-token',
        market_data: {
          current_price: { usd: 10.0 },
          // price_change_percentage_24h is missing
          // market_cap is missing
        },
      });

      const result = await getTokenUsdPrice(ChainAlias.ETH, '0xtoken');

      expect(result).toBeInstanceOf(TokenPrice);
      expect(result?.price).toBe(10.0);
      expect(result?.priceChange24h).toBeNull();
      expect(result?.marketCap).toBeNull();
    });

    it('should use address as coingeckoId when id is missing', async () => {
      mockContractGet.mockResolvedValue({
        // id is missing
        market_data: {
          current_price: { usd: 1.0 },
        },
      });

      const result = await getTokenUsdPrice(ChainAlias.ETH, '0xtoken');

      expect(result).toBeInstanceOf(TokenPrice);
      expect(result?.coingeckoId).toBe('0xtoken');
    });

    it('should return null when price is null', async () => {
      mockContractGet.mockResolvedValue({
        id: 'some-token',
        market_data: {
          current_price: { usd: null },
        },
      });

      const result = await getTokenUsdPrice(ChainAlias.ETH, '0xtoken');

      expect(result).toBeNull();
    });

    it('should return null when price is undefined', async () => {
      mockContractGet.mockResolvedValue({
        id: 'some-token',
        market_data: {
          current_price: {},
        },
      });

      const result = await getTokenUsdPrice(ChainAlias.ETH, '0xtoken');

      expect(result).toBeNull();
    });

    it('should return null when price is zero', async () => {
      mockContractGet.mockResolvedValue({
        id: 'some-token',
        market_data: {
          current_price: { usd: 0 },
        },
      });

      const result = await getTokenUsdPrice(ChainAlias.ETH, '0xtoken');

      expect(result).toBeNull();
    });

    it('should return null when price is negative', async () => {
      mockContractGet.mockResolvedValue({
        id: 'some-token',
        market_data: {
          current_price: { usd: -1 },
        },
      });

      const result = await getTokenUsdPrice(ChainAlias.ETH, '0xtoken');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockContractGet.mockRejectedValue(new Error('Not found'));

      const result = await getTokenUsdPrice(ChainAlias.ETH, '0xtoken');

      expect(result).toBeNull();
    });

    it('should return null for invalid address', async () => {
      const result = await getTokenUsdPrice(ChainAlias.ETH, '');

      expect(result).toBeNull();
      expect(mockContractGet).not.toHaveBeenCalled();
    });

    it('should return null for unsupported chain', async () => {
      const result = await getTokenUsdPrice('unsupported-chain' as ChainAlias, '0xtoken');

      expect(result).toBeNull();
      expect(mockContractGet).not.toHaveBeenCalled();
    });
  });

  describe('getNativeTokenUsdPrice', () => {
    it('should return TokenPrice instance when successful', async () => {
      mockGetID.mockResolvedValue({
        id: 'ethereum',
        symbol: 'eth',
        name: 'Ethereum',
        market_data: {
          current_price: { usd: 2500 },
          price_change_percentage_24h: -1.5,
          market_cap: { usd: 300000000000 },
        },
      });

      const chain = { Alias: ChainAlias.ETH } as any;
      const result = await getNativeTokenUsdPrice(chain);

      expect(result).toBeInstanceOf(TokenPrice);
      expect(result?.price).toBe(2500);
      expect(result?.currency).toBe('usd');
      expect(result?.coingeckoId).toBe('ethereum');
      expect(result?.priceChange24h).toBe(-1.5);
      expect(result?.marketCap).toBe(300000000000);
      expect(mockGetID).toHaveBeenCalledWith('ethereum');
    });

    it('should return TokenPrice with null optional fields when market data is partial', async () => {
      mockGetID.mockResolvedValue({
        id: 'ethereum',
        market_data: {
          current_price: { usd: 2000 },
          // no price_change_percentage_24h
          // no market_cap
        },
      });

      const chain = { Alias: ChainAlias.ETH } as any;
      const result = await getNativeTokenUsdPrice(chain);

      expect(result).toBeInstanceOf(TokenPrice);
      expect(result?.price).toBe(2000);
      expect(result?.priceChange24h).toBeNull();
      expect(result?.marketCap).toBeNull();
    });

    it('should return null when price is null', async () => {
      mockGetID.mockResolvedValue({
        id: 'ethereum',
        market_data: {
          current_price: { usd: null },
        },
      });

      const chain = { Alias: ChainAlias.ETH } as any;
      const result = await getNativeTokenUsdPrice(chain);

      expect(result).toBeNull();
    });

    it('should return null when price is undefined', async () => {
      mockGetID.mockResolvedValue({
        id: 'ethereum',
        market_data: {
          current_price: {},
        },
      });

      const chain = { Alias: ChainAlias.ETH } as any;
      const result = await getNativeTokenUsdPrice(chain);

      expect(result).toBeNull();
    });

    it('should return null when price is zero', async () => {
      mockGetID.mockResolvedValue({
        id: 'ethereum',
        market_data: {
          current_price: { usd: 0 },
        },
      });

      const chain = { Alias: ChainAlias.ETH } as any;
      const result = await getNativeTokenUsdPrice(chain);

      expect(result).toBeNull();
    });

    it('should return null when price is negative', async () => {
      mockGetID.mockResolvedValue({
        id: 'ethereum',
        market_data: {
          current_price: { usd: -100 },
        },
      });

      const chain = { Alias: ChainAlias.ETH } as any;
      const result = await getNativeTokenUsdPrice(chain);

      expect(result).toBeNull();
    });

    it('should return null when metadata is null', async () => {
      mockGetID.mockResolvedValue(null);

      const chain = { Alias: ChainAlias.ETH } as any;
      const result = await getNativeTokenUsdPrice(chain);

      expect(result).toBeNull();
    });

    it('should return null when native metadata fetch fails', async () => {
      mockGetID.mockRejectedValue(new Error('API error'));

      const chain = { Alias: ChainAlias.ETH } as any;
      const result = await getNativeTokenUsdPrice(chain);

      expect(result).toBeNull();
    });

    it('should use "unknown" as coingeckoId when id is missing', async () => {
      mockGetID.mockResolvedValue({
        // id is missing
        market_data: {
          current_price: { usd: 1500 },
        },
      });

      const chain = { Alias: ChainAlias.ETH } as any;
      const result = await getNativeTokenUsdPrice(chain);

      expect(result).toBeInstanceOf(TokenPrice);
      expect(result?.coingeckoId).toBe('unknown');
    });
  });
});
