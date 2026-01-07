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
} = vi.hoisted(() => ({
  mockTokenBalanceFetcher: vi.fn(),
  mockGetNativeTokenMetadata: vi.fn(),
  mockFetchTokenMetadataBulk: vi.fn(),
  mockGetNativeTokenUsdValue: vi.fn(),
  mockFetchMetadata: vi.fn(),
  mockGetAddress: vi.fn(),
  mockUpdateAddressTokens: vi.fn(),
  mockExplorerGetBalance: vi.fn(),
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
  CoinGecko: {
    getNativeTokenUsdValue: (...args: unknown[]) => mockGetNativeTokenUsdValue(...args),
    getTokenUsdValue: vi.fn(),
    fetchMetadata: (...args: unknown[]) => mockFetchMetadata(...args),
  },
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

// Mock Chain.fromAlias
vi.mock('@iofinnet/io-core-dapp-utils-chains-sdk', async () => {
  const actual = await vi.importActual('@iofinnet/io-core-dapp-utils-chains-sdk');
  return {
    ...actual,
    Chain: {
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

  // Register balance routes
  await app.register(balanceRoutes, { prefix: '/v1/balances' });
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

  describe('GET /v1/balances/ecosystem/:ecosystem/chainAlias/:chain/address/:address/native', () => {
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
        url: `/v1/balances/ecosystem/evm/chainAlias/eth/address/${TEST_ADDRESS}/native`,
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
        url: `/v1/balances/ecosystem/evm/chainAlias/eth/address/${TEST_ADDRESS}/native`,
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
        url: `/v1/balances/ecosystem/invalid/chainAlias/eth/address/${TEST_ADDRESS}/native`,
      });

      expect(response.statusCode).toBe(400);
    });

    it('validates chain parameter', async () => {
      const app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: `/v1/balances/ecosystem/evm/chainAlias/invalid-chain/address/${TEST_ADDRESS}/native`,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /v1/balances/ecosystem/:ecosystem/chainAlias/:chain/address/:address/tokens', () => {
    it('returns token balances for an address', async () => {
      const app = await createTestApp();

      mockGetAddress.mockResolvedValueOnce({
        address: TEST_ADDRESS,
        chain: 'eth',
        vaultId: 'vault-123',
        workspaceId: 'workspace-123',
        monitored: true,
        tokens: [],
        updatedAt: new Date().toISOString(),
        subscriptionId: null,
        alias: null,
      });

      mockTokenBalanceFetcher.mockResolvedValueOnce(mockTokenBalances);
      mockFetchTokenMetadataBulk.mockResolvedValueOnce([]);
      mockUpdateAddressTokens.mockResolvedValueOnce(undefined);

      const response = await app.inject({
        method: 'GET',
        url: `/v1/balances/ecosystem/evm/chainAlias/eth/address/${TEST_ADDRESS}/tokens`,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('lastUpdated');
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('filters hidden tokens by default', async () => {
      const app = await createTestApp();

      const hiddenTokenAddress = '0xhidden';
      mockGetAddress.mockResolvedValueOnce({
        address: TEST_ADDRESS,
        chain: 'eth',
        vaultId: 'vault-123',
        workspaceId: 'workspace-123',
        monitored: true,
        tokens: [
          {
            contractAddress: hiddenTokenAddress,
            hidden: true,
            symbol: 'HIDDEN',
            decimals: 18,
          },
        ],
        updatedAt: new Date().toISOString(),
        subscriptionId: null,
        alias: null,
      });

      const allTokens = [
        ...mockTokenBalances,
        {
          address: hiddenTokenAddress,
          balance: '100',
          symbol: 'HIDDEN',
          decimals: 18,
          name: 'Hidden Token',
          usdValue: null,
        },
      ];

      mockTokenBalanceFetcher.mockResolvedValueOnce(allTokens);
      mockFetchTokenMetadataBulk.mockResolvedValueOnce([]);
      mockUpdateAddressTokens.mockResolvedValueOnce(undefined);

      const response = await app.inject({
        method: 'GET',
        url: `/v1/balances/ecosystem/evm/chainAlias/eth/address/${TEST_ADDRESS}/tokens`,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      // Hidden token should be filtered out
      const hiddenToken = data.data.find((t: any) => t.address === hiddenTokenAddress);
      expect(hiddenToken).toBeUndefined();
    });

    it('shows hidden tokens when showHiddenTokens=true', async () => {
      const app = await createTestApp();

      const hiddenTokenAddress = '0xhidden';
      mockGetAddress.mockResolvedValueOnce({
        address: TEST_ADDRESS,
        chain: 'eth',
        vaultId: 'vault-123',
        workspaceId: 'workspace-123',
        monitored: true,
        tokens: [
          {
            contractAddress: hiddenTokenAddress,
            hidden: true,
            symbol: 'HIDDEN',
            decimals: 18,
          },
        ],
        updatedAt: new Date().toISOString(),
        subscriptionId: null,
        alias: null,
      });

      const allTokens = [
        ...mockTokenBalances,
        {
          address: hiddenTokenAddress,
          balance: '100',
          symbol: 'HIDDEN',
          decimals: 18,
          name: 'Hidden Token',
          usdValue: null,
        },
      ];

      mockTokenBalanceFetcher.mockResolvedValueOnce(allTokens);
      mockFetchTokenMetadataBulk.mockResolvedValueOnce([]);
      mockUpdateAddressTokens.mockResolvedValueOnce(undefined);

      const response = await app.inject({
        method: 'GET',
        url: `/v1/balances/ecosystem/evm/chainAlias/eth/address/${TEST_ADDRESS}/tokens?showHiddenTokens=true`,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      // Hidden token should be included
      const hiddenToken = data.data.find((t: any) => t.address === hiddenTokenAddress);
      expect(hiddenToken).toBeDefined();
    });

    it('validates ecosystem parameter', async () => {
      const app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: `/v1/balances/ecosystem/invalid/chainAlias/eth/address/${TEST_ADDRESS}/tokens`,
      });

      expect(response.statusCode).toBe(400);
    });

    it('validates chain parameter', async () => {
      const app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: `/v1/balances/ecosystem/evm/chainAlias/invalid-chain/address/${TEST_ADDRESS}/tokens`,
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
