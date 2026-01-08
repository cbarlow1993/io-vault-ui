import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import errorHandlerPlugin from '@/src/plugins/error-handler.js';
import balanceRoutes from '@/src/routes/balances/index.js';

// Mock environment variables
vi.stubEnv('STAGE', 'dev');
vi.stubEnv('COIN_GECKO_API_KEY', 'test-key');
vi.stubEnv('COIN_GECKO_REQUEST_TIMEOUT', '5000');

// Hoisted mock functions that can be used in vi.mock factories
const {
  mockTokenBalanceFetcher,
  mockGetNativeTokenMetadata,
  mockFetchTokenMetadataBulk,
  mockGetNativeTokenUsdValue,
  mockFetchMetadata,
  mockGetAddress,
  mockUpdateAddressTokens,
  mockExplorerGetBalance,
  mockGetBalancesByChainAndAddress,
} = vi.hoisted(() => ({
  mockTokenBalanceFetcher: vi.fn(),
  mockGetNativeTokenMetadata: vi.fn(),
  mockFetchTokenMetadataBulk: vi.fn(),
  mockGetNativeTokenUsdValue: vi.fn(),
  mockFetchMetadata: vi.fn(),
  mockGetAddress: vi.fn(),
  mockUpdateAddressTokens: vi.fn(),
  mockExplorerGetBalance: vi.fn(),
  mockGetBalancesByChainAndAddress: vi.fn(),
}));

// Mock the balance services - using dynamic enum values
vi.mock('@/src/services/balances/index.js', () => ({
  tokenBalanceFetchers: {
    evm: mockTokenBalanceFetcher,
    svm: vi.fn(),
    utxo: vi.fn(),
    tvm: vi.fn(),
    cosmos: undefined,
    substrate: undefined,
    xrp: vi.fn(),
  },
}));

// Mock the metadata service
vi.mock('@/src/services/balances/metadata/metadata.js', () => ({
  getNativeTokenMetadata: (...args: unknown[]) => mockGetNativeTokenMetadata(...args),
  fetchTokenMetadataBulk: (...args: unknown[]) => mockFetchTokenMetadataBulk(...args),
}));

// Mock CoinGecko service
vi.mock('@/src/services/coingecko/index.js', () => ({
  fetchNativeTokenMetadata: (...args: unknown[]) => mockFetchMetadata(...args),
  getNativeTokenUsdPrice: (...args: unknown[]) => mockGetNativeTokenUsdValue(...args),
  getTokenUsdPrice: vi.fn(),
  fetchTokenMetadata: vi.fn(),
}));

// Mock addresses service
vi.mock('@/src/services/addresses/index.js', () => ({
  getAddress: (...args: unknown[]) => mockGetAddress(...args),
  updateAddressTokens: (...args: unknown[]) => mockUpdateAddressTokens(...args),
}));

// Mock error reporter
vi.mock('@/src/lib/error-reporter.js', () => ({
  reportErrorToQueue: vi.fn(),
}));

// Mock Chain SDK
vi.mock('@iofinnet/io-core-dapp-utils-chains-sdk', async () => {
  const actual = await vi.importActual('@iofinnet/io-core-dapp-utils-chains-sdk');
  return {
    ...actual,
    Chain: {
      setAuthContext: vi.fn(),
      getAuthContext: vi.fn().mockReturnValue({
        apiBearerToken: 'test-token',
        rpcBearerToken: 'test-token',
        iofinnetApiEndpoint: 'https://api.test.com',
        iofinnetRpcApiEndpoint: 'https://rpc.test.com',
      }),
      requireAuthContext: vi.fn().mockReturnValue({
        apiBearerToken: 'test-token',
        rpcBearerToken: 'test-token',
        iofinnetApiEndpoint: 'https://api.test.com',
        iofinnetRpcApiEndpoint: 'https://rpc.test.com',
      }),
      fromAlias: vi.fn().mockImplementation(() =>
        Promise.resolve({
          Alias: 'eth',
          Config: {
            ecosystem: 'evm',
            nativeCurrency: { decimals: 18 },
          },
          Explorer: {
            getBalance: mockExplorerGetBalance,
          },
          isEcosystem: vi.fn().mockReturnValue(true),
        })
      ),
    },
  };
});

const TEST_ORG_ID = 'org-123';
const TEST_USER_ID = 'user-123';
const TEST_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';

const mockTokenBalances = [
  {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    balance: '1000.00',
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
    usdValue: '1000.00',
  },
  {
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    balance: '500.00',
    symbol: 'USDT',
    decimals: 6,
    name: 'Tether USD',
    usdValue: '500.00',
  },
];

async function createTestApp() {
  const app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Register error handler to properly convert errors to status codes
  await app.register(errorHandlerPlugin);

  // Mock auth decorator
  app.decorateRequest('auth', null);
  app.addHook('onRequest', async (request) => {
    request.auth = { organisationId: TEST_ORG_ID, userId: TEST_USER_ID, token: 'test-token' };
  });

  // Mock services decorator for balance service
  app.decorate('services', {
    balances: {
      getBalancesByChainAndAddress: mockGetBalancesByChainAndAddress,
    },
  });

  // Register balance routes
  await app.register(balanceRoutes, { prefix: '/v2/balances' });
  await app.ready();

  return app;
}

describe('Balance Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default mock implementations
    mockExplorerGetBalance.mockResolvedValue({
      nativeBalance: '1.5',
      nativeSymbol: 'ETH',
    });
  });

  describe('GET /v2/balances/ecosystem/:ecosystem/chain/:chain/address/:address/native', () => {
    it('returns native balance for an address', async () => {
      const app = await createTestApp();

      mockGetNativeTokenMetadata.mockResolvedValueOnce({
        chain: 'eth',
        PK: 'chain#eth',
        SK: 'address#eth',
        name: 'Ethereum',
        logoUrl: 'https://example.com/eth.png',
        symbol: 'ETH',
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });

      mockGetNativeTokenUsdValue.mockResolvedValueOnce('3000.00');

      const response = await app.inject({
        method: 'GET',
        url: `/v2/balances/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/native`,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data).toHaveProperty('balance');
      expect(data).toHaveProperty('symbol');
      expect(data).toHaveProperty('lastUpdated');
    });

    it('returns native balance without metadata when metadata fetch fails', async () => {
      const app = await createTestApp();

      mockGetNativeTokenMetadata.mockRejectedValueOnce(new Error('Metadata fetch failed'));
      mockGetNativeTokenUsdValue.mockResolvedValueOnce('3000.00');

      const response = await app.inject({
        method: 'GET',
        url: `/v2/balances/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/native`,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data).toHaveProperty('balance');
      expect(data).toHaveProperty('symbol');
      expect(data.name).toBeNull();
      expect(data.logo).toBeNull();
    });

    it('validates ecosystem parameter', async () => {
      const app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: `/v2/balances/ecosystem/invalid/chain/eth/address/${TEST_ADDRESS}/native`,
      });

      expect(response.statusCode).toBe(400);
    });

    it('validates chain parameter', async () => {
      const app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: `/v2/balances/ecosystem/evm/chain/invalid-chain/address/${TEST_ADDRESS}/native`,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /v2/balances/ecosystem/:ecosystem/chain/:chain/address/:address/tokens', () => {
    // Mock EnrichedBalance data for token balance tests
    const mockEnrichedBalances = [
      {
        tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        formattedBalance: '1000.00',
        symbol: 'USDC',
        decimals: 6,
        name: 'USD Coin',
        usdValue: 1000.0,
        logoUri: 'https://example.com/usdc.png',
        isNative: false,
      },
      {
        tokenAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        formattedBalance: '500.00',
        symbol: 'USDT',
        decimals: 6,
        name: 'Tether USD',
        usdValue: 500.0,
        logoUri: 'https://example.com/usdt.png',
        isNative: false,
      },
    ];

    it('returns token balances for an address', async () => {
      const app = await createTestApp();

      mockGetBalancesByChainAndAddress.mockResolvedValueOnce(mockEnrichedBalances);

      const response = await app.inject({
        method: 'GET',
        url: `/v2/balances/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/tokens`,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('lastUpdated');
      expect(data).toHaveProperty('pagination');
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(mockGetBalancesByChainAndAddress).toHaveBeenCalledWith(
        'eth',
        TEST_ADDRESS,
        { includeHidden: false }
      );
    });

    it('filters hidden tokens by default', async () => {
      const app = await createTestApp();

      // Service returns only visible tokens when includeHidden is false
      mockGetBalancesByChainAndAddress.mockResolvedValueOnce(mockEnrichedBalances);

      const response = await app.inject({
        method: 'GET',
        url: `/v2/balances/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/tokens`,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      // Verify service was called with includeHidden: false
      expect(mockGetBalancesByChainAndAddress).toHaveBeenCalledWith(
        'eth',
        TEST_ADDRESS,
        { includeHidden: false }
      );
      // Only visible tokens returned
      expect(data.data).toHaveLength(2);
    });

    it('shows hidden tokens when showHiddenTokens=true', async () => {
      const app = await createTestApp();

      const hiddenTokenAddress = '0xhidden';
      const balancesWithHidden = [
        ...mockEnrichedBalances,
        {
          tokenAddress: hiddenTokenAddress,
          formattedBalance: '100',
          symbol: 'HIDDEN',
          decimals: 18,
          name: 'Hidden Token',
          usdValue: null,
          logoUri: null,
          isNative: false,
        },
      ];

      mockGetBalancesByChainAndAddress.mockResolvedValueOnce(balancesWithHidden);

      const response = await app.inject({
        method: 'GET',
        url: `/v2/balances/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/tokens?showHiddenTokens=true`,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      // Verify service was called with includeHidden: true
      expect(mockGetBalancesByChainAndAddress).toHaveBeenCalledWith(
        'eth',
        TEST_ADDRESS,
        { includeHidden: true }
      );
      // Hidden token should be included
      const hiddenToken = data.data.find((t: any) => t.address === hiddenTokenAddress);
      expect(hiddenToken).toBeDefined();
    });

    it('validates ecosystem parameter', async () => {
      const app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: `/v2/balances/ecosystem/invalid/chain/eth/address/${TEST_ADDRESS}/tokens`,
      });

      expect(response.statusCode).toBe(400);
    });

    it('validates chain parameter', async () => {
      const app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: `/v2/balances/ecosystem/evm/chain/invalid-chain/address/${TEST_ADDRESS}/tokens`,
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
