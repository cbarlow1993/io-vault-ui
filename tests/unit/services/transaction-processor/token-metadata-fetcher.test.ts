import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fns declared before vi.mock calls
const mockContractGet = vi.fn();

vi.mock('@/src/services/coingecko/client.js', () => ({
  getCoinGeckoClient: vi.fn(() => ({
    coins: {
      contract: { get: mockContractGet },
    },
  })),
}));

// Mock chain mappings to return a valid platform for 'eth' as ChainAlias
vi.mock('@/src/config/chain-mappings/index.js', () => ({
  getCoinGeckoPlatform: vi.fn((chainAlias: unknown) => {
    if (chainAlias === 'eth' as ChainAlias) return 'eth' as ChainAlias;
    return undefined;
  }),
}));

// Mock ethers with proper class implementations
vi.mock('ethers', () => {
  class MockJsonRpcProvider {}
  class MockContract {
    name = vi.fn().mockResolvedValue('Test Token');
    symbol = vi.fn().mockResolvedValue('TEST');
    decimals = vi.fn().mockResolvedValue(18);
  }
  return {
    JsonRpcProvider: MockJsonRpcProvider,
    Contract: MockContract,
  };
});

vi.mock('@/utils/powertools.js', () => ({
  logger: { warn: vi.fn(), debug: vi.fn() },
}));

// Use dynamic import after mocks are set up
const { TokenMetadataFetcher } = await import('@/src/services/transaction-processor/token-metadata-fetcher.js');

describe('TokenMetadataFetcher', () => {
  let fetcher: InstanceType<typeof TokenMetadataFetcher>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetcher = new TokenMetadataFetcher({
      rpcUrls: {
        ethereum: 'https://mainnet.infura.io/v3/test',
      },
    });
  });

  describe('fetchOnChain', () => {
    it('fetches token metadata from EVM chain via RPC', async () => {
      const result = await fetcher.fetchOnChain(
        'eth' as ChainAlias,
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
      );

      expect(result).toEqual({
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        name: 'Test Token',
        symbol: 'TEST',
        decimals: 18,
      });
    });

    it('returns only address for unsupported chain', async () => {
      const result = await fetcher.fetchOnChain('unknown-chain' as ChainAlias, '0xabc123');
      expect(result).toEqual({
        address: '0xabc123',
      });
    });
  });

  describe('fetchFromCoinGecko', () => {
    it('fetches token metadata from CoinGecko using SDK', async () => {
      mockContractGet.mockResolvedValueOnce({
        id: 'usd-coin',
        symbol: 'usdc',
        name: 'USD Coin',
        image: { large: 'https://example.com/usdc.png' },
      });

      const result = await fetcher.fetchFromCoinGecko(
        'eth' as ChainAlias,
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
      );

      expect(result).toEqual({
        coingeckoId: 'usd-coin',
        logoUri: 'https://example.com/usdc.png',
      });

      expect(mockContractGet).toHaveBeenCalledWith(
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        { id: 'eth' as ChainAlias }
      );
    });

    it('returns null when SDK throws an error', async () => {
      mockContractGet.mockRejectedValueOnce(new Error('Token not found'));

      const result = await fetcher.fetchFromCoinGecko('eth' as ChainAlias, '0xunknown');

      expect(result).toBeNull();
    });

    it('returns null for unsupported chain', async () => {
      const result = await fetcher.fetchFromCoinGecko(
        'unknown-chain' as ChainAlias,
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
      );

      expect(result).toBeNull();
      expect(mockContractGet).not.toHaveBeenCalled();
    });

    it('uses small image when large is not available', async () => {
      mockContractGet.mockResolvedValueOnce({
        id: 'some-token',
        image: { small: 'https://example.com/small.png' },
      });

      const result = await fetcher.fetchFromCoinGecko(
        'eth' as ChainAlias,
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
      );

      expect(result?.logoUri).toBe('https://example.com/small.png');
    });
  });

  describe('fetch', () => {
    it('combines on-chain and CoinGecko data', async () => {
      mockContractGet.mockResolvedValueOnce({
        id: 'usd-coin',
        image: { large: 'https://example.com/usdc.png' },
      });

      const result = await fetcher.fetch(
        'eth' as ChainAlias,
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
      );

      expect(result.name).toBe('Test Token');
      expect(result.symbol).toBe('TEST');
      expect(result.decimals).toBe(18);
      expect(result.coingeckoId).toBe('usd-coin');
      expect(result.logoUri).toBe('https://example.com/usdc.png');
    });
  });
});
