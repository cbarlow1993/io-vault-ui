import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

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

vi.mock('@/src/lib/chainAliasMapper.js', () => ({
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
    it('should return USD price on success', async () => {
      mockContractGet.mockResolvedValue({
        market_data: { current_price: { usd: 1.5 } },
      });

      const result = await getTokenUsdPrice(ChainAlias.ETH, '0xtoken');

      expect(result).toBe(1.5);
    });

    it('should return null on error', async () => {
      mockContractGet.mockRejectedValue(new Error('Not found'));

      const result = await getTokenUsdPrice(ChainAlias.ETH, '0xtoken');

      expect(result).toBeNull();
    });
  });

  describe('getNativeTokenUsdPrice', () => {
    it('should return USD price when native metadata fetch succeeds', async () => {
      mockGetID.mockResolvedValue({
        id: 'ethereum',
        symbol: 'eth',
        name: 'Ethereum',
        market_data: { current_price: { usd: 2500 } },
      });

      const chain = { Alias: ChainAlias.ETH } as any;
      const result = await getNativeTokenUsdPrice(chain);

      expect(result).toBe(2500);
      expect(mockGetID).toHaveBeenCalledWith('ethereum');
    });

    it('should return null when native metadata fetch fails', async () => {
      mockGetID.mockRejectedValue(new Error('API error'));

      const chain = { Alias: ChainAlias.ETH } as any;
      const result = await getNativeTokenUsdPrice(chain);

      expect(result).toBeNull();
    });
  });
});
