import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import errorHandlerPlugin from '@/src/plugins/error-handler.js';
import balanceRoutes from '@/src/routes/balances/index.js';
import { tokenBalanceQuerySchema, tokenBalanceItemSchema } from '@/src/routes/balances/schemas.js';

// Mock environment variables
vi.stubEnv('STAGE', 'dev');
vi.stubEnv('COIN_GECKO_API_KEY', 'test-key');
vi.stubEnv('COIN_GECKO_REQUEST_TIMEOUT', '5000');

// Hoisted mock functions that can be used in vi.mock factories
const {
  mockTokenBalanceFetcher,
  mockGetNativeTokenUsdValue,
  mockFetchMetadata,
  mockGetAddress,
  mockUpdateAddressTokens,
  mockExplorerGetBalance,
  mockGetBalancesByChainAndAddress,
  mockGetNativeBalance,
} = vi.hoisted(() => ({
  mockTokenBalanceFetcher: vi.fn(),
  mockGetNativeTokenUsdValue: vi.fn(),
  mockFetchMetadata: vi.fn(),
  mockGetAddress: vi.fn(),
  mockUpdateAddressTokens: vi.fn(),
  mockExplorerGetBalance: vi.fn(),
  mockGetBalancesByChainAndAddress: vi.fn(),
  mockGetNativeBalance: vi.fn(),
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

// Mock CoinGecko service
vi.mock('@/src/services/coingecko/index.js', () => ({
  fetchNativeTokenMetadata: (...args: unknown[]) => mockFetchMetadata(...args),
  fetchNativeTokenMetadataByAlias: (...args: unknown[]) => mockFetchMetadata(...args),
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

// Mock @io-vault/chains package (new chains package used by handlers)
vi.mock('@io-vault/chains', () => ({
  getChainProvider: vi.fn().mockReturnValue({
    getNativeBalance: mockGetNativeBalance,
    config: {
      nativeCurrency: { decimals: 18, name: 'Ethereum', symbol: 'ETH' },
    },
  }),
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
    // Set default mock implementations for legacy Chain SDK
    mockExplorerGetBalance.mockResolvedValue({
      nativeBalance: '1.5',
      nativeSymbol: 'ETH',
    });
    // Set default mock for new chains package
    mockGetNativeBalance.mockResolvedValue({
      isNative: true,
      balance: '1500000000000000000',
      formattedBalance: '1.5',
      symbol: 'ETH',
      decimals: 18,
    });
  });

  describe('GET /v2/balances/ecosystem/:ecosystem/chain/:chain/address/:address/native', () => {
    it('returns native balance for an address', async () => {
      const app = await createTestApp();

      // Mock CoinGecko response format
      mockFetchMetadata.mockResolvedValueOnce({
        id: 'ethereum',
        name: 'Ethereum',
        symbol: 'eth',
        image: { small: 'https://example.com/eth.png' },
        market_data: { current_price: { usd: 3000 } },
      });

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

      // CoinGecko returns null when metadata fetch fails
      mockFetchMetadata.mockResolvedValueOnce(null);

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

describe('tokenBalanceQuerySchema', () => {
  describe('showSpam parameter', () => {
    it('defaults to false when not provided', () => {
      const result = tokenBalanceQuerySchema.parse({});
      expect(result.showSpam).toBe(false);
    });

    it('accepts string "true" and transforms to boolean true', () => {
      const result = tokenBalanceQuerySchema.parse({ showSpam: 'true' });
      expect(result.showSpam).toBe(true);
    });

    it('accepts string "false" and transforms to boolean false', () => {
      const result = tokenBalanceQuerySchema.parse({ showSpam: 'false' });
      expect(result.showSpam).toBe(false);
    });

    it('accepts boolean true', () => {
      const result = tokenBalanceQuerySchema.parse({ showSpam: true });
      expect(result.showSpam).toBe(true);
    });

    it('accepts boolean false', () => {
      const result = tokenBalanceQuerySchema.parse({ showSpam: false });
      expect(result.showSpam).toBe(false);
    });
  });

  describe('sortBy parameter', () => {
    it('defaults to "usdValue" when not provided', () => {
      const result = tokenBalanceQuerySchema.parse({});
      expect(result.sortBy).toBe('usdValue');
    });

    it('accepts "balance"', () => {
      const result = tokenBalanceQuerySchema.parse({ sortBy: 'balance' });
      expect(result.sortBy).toBe('balance');
    });

    it('accepts "usdValue"', () => {
      const result = tokenBalanceQuerySchema.parse({ sortBy: 'usdValue' });
      expect(result.sortBy).toBe('usdValue');
    });

    it('accepts "symbol"', () => {
      const result = tokenBalanceQuerySchema.parse({ sortBy: 'symbol' });
      expect(result.sortBy).toBe('symbol');
    });

    it('rejects invalid sortBy values', () => {
      expect(() => tokenBalanceQuerySchema.parse({ sortBy: 'invalid' })).toThrow();
    });
  });

  describe('sortOrder parameter', () => {
    it('defaults to "desc" when not provided', () => {
      const result = tokenBalanceQuerySchema.parse({});
      expect(result.sortOrder).toBe('desc');
    });

    it('accepts "asc"', () => {
      const result = tokenBalanceQuerySchema.parse({ sortOrder: 'asc' });
      expect(result.sortOrder).toBe('asc');
    });

    it('accepts "desc"', () => {
      const result = tokenBalanceQuerySchema.parse({ sortOrder: 'desc' });
      expect(result.sortOrder).toBe('desc');
    });

    it('rejects invalid sortOrder values', () => {
      expect(() => tokenBalanceQuerySchema.parse({ sortOrder: 'invalid' })).toThrow();
    });
  });

  describe('combined parameters', () => {
    it('parses all parameters together', () => {
      const result = tokenBalanceQuerySchema.parse({
        showSpam: 'true',
        sortBy: 'balance',
        sortOrder: 'asc',
        showHiddenTokens: 'true',
      });

      expect(result.showSpam).toBe(true);
      expect(result.sortBy).toBe('balance');
      expect(result.sortOrder).toBe('asc');
      expect(result.showHiddenTokens).toBe(true);
    });
  });
});

describe('tokenBalanceItemSchema', () => {
  const validBaseItem = {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    balance: '1000.00',
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
    logo: 'https://example.com/usdc.png',
    usdValue: '1000.00',
  };

  describe('spam fields', () => {
    describe('isSpam field', () => {
      it('accepts isSpam as true', () => {
        const result = tokenBalanceItemSchema.safeParse({
          ...validBaseItem,
          isSpam: true,
          userSpamOverride: null,
          effectiveSpamStatus: 'spam',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.isSpam).toBe(true);
        }
      });

      it('accepts isSpam as false', () => {
        const result = tokenBalanceItemSchema.safeParse({
          ...validBaseItem,
          isSpam: false,
          userSpamOverride: null,
          effectiveSpamStatus: 'unknown',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.isSpam).toBe(false);
        }
      });

      it('rejects when isSpam is missing', () => {
        const result = tokenBalanceItemSchema.safeParse({
          ...validBaseItem,
          userSpamOverride: null,
          effectiveSpamStatus: 'unknown',
        });
        expect(result.success).toBe(false);
      });

      it('rejects non-boolean isSpam values', () => {
        const result = tokenBalanceItemSchema.safeParse({
          ...validBaseItem,
          isSpam: 'true',
          userSpamOverride: null,
          effectiveSpamStatus: 'unknown',
        });
        expect(result.success).toBe(false);
      });
    });

    describe('userSpamOverride field', () => {
      it('accepts userSpamOverride as "trusted"', () => {
        const result = tokenBalanceItemSchema.safeParse({
          ...validBaseItem,
          isSpam: true,
          userSpamOverride: 'trusted',
          effectiveSpamStatus: 'trusted',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.userSpamOverride).toBe('trusted');
        }
      });

      it('accepts userSpamOverride as "spam"', () => {
        const result = tokenBalanceItemSchema.safeParse({
          ...validBaseItem,
          isSpam: false,
          userSpamOverride: 'spam',
          effectiveSpamStatus: 'spam',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.userSpamOverride).toBe('spam');
        }
      });

      it('accepts userSpamOverride as null', () => {
        const result = tokenBalanceItemSchema.safeParse({
          ...validBaseItem,
          isSpam: false,
          userSpamOverride: null,
          effectiveSpamStatus: 'unknown',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.userSpamOverride).toBeNull();
        }
      });

      it('rejects invalid userSpamOverride values', () => {
        const result = tokenBalanceItemSchema.safeParse({
          ...validBaseItem,
          isSpam: false,
          userSpamOverride: 'invalid',
          effectiveSpamStatus: 'unknown',
        });
        expect(result.success).toBe(false);
      });
    });

    describe('effectiveSpamStatus field', () => {
      it('accepts effectiveSpamStatus as "spam"', () => {
        const result = tokenBalanceItemSchema.safeParse({
          ...validBaseItem,
          isSpam: true,
          userSpamOverride: null,
          effectiveSpamStatus: 'spam',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.effectiveSpamStatus).toBe('spam');
        }
      });

      it('accepts effectiveSpamStatus as "trusted"', () => {
        const result = tokenBalanceItemSchema.safeParse({
          ...validBaseItem,
          isSpam: true,
          userSpamOverride: 'trusted',
          effectiveSpamStatus: 'trusted',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.effectiveSpamStatus).toBe('trusted');
        }
      });

      it('accepts effectiveSpamStatus as "unknown"', () => {
        const result = tokenBalanceItemSchema.safeParse({
          ...validBaseItem,
          isSpam: false,
          userSpamOverride: null,
          effectiveSpamStatus: 'unknown',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.effectiveSpamStatus).toBe('unknown');
        }
      });

      it('rejects invalid effectiveSpamStatus values', () => {
        const result = tokenBalanceItemSchema.safeParse({
          ...validBaseItem,
          isSpam: false,
          userSpamOverride: null,
          effectiveSpamStatus: 'invalid',
        });
        expect(result.success).toBe(false);
      });

      it('rejects when effectiveSpamStatus is missing', () => {
        const result = tokenBalanceItemSchema.safeParse({
          ...validBaseItem,
          isSpam: false,
          userSpamOverride: null,
        });
        expect(result.success).toBe(false);
      });
    });

    describe('spam field combinations', () => {
      it('validates complete token with all spam fields', () => {
        const result = tokenBalanceItemSchema.safeParse({
          ...validBaseItem,
          isSpam: true,
          userSpamOverride: 'trusted',
          effectiveSpamStatus: 'trusted',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toMatchObject({
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            balance: '1000.00',
            symbol: 'USDC',
            decimals: 6,
            name: 'USD Coin',
            logo: 'https://example.com/usdc.png',
            usdValue: '1000.00',
            isSpam: true,
            userSpamOverride: 'trusted',
            effectiveSpamStatus: 'trusted',
          });
        }
      });

      it('validates spam token marked as trusted by user', () => {
        const result = tokenBalanceItemSchema.safeParse({
          ...validBaseItem,
          isSpam: true,
          userSpamOverride: 'trusted',
          effectiveSpamStatus: 'trusted',
        });
        expect(result.success).toBe(true);
      });

      it('validates non-spam token with no override', () => {
        const result = tokenBalanceItemSchema.safeParse({
          ...validBaseItem,
          isSpam: false,
          userSpamOverride: null,
          effectiveSpamStatus: 'unknown',
        });
        expect(result.success).toBe(true);
      });

      it('validates non-spam token marked as spam by user', () => {
        const result = tokenBalanceItemSchema.safeParse({
          ...validBaseItem,
          isSpam: false,
          userSpamOverride: 'spam',
          effectiveSpamStatus: 'spam',
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('existing fields with spam fields', () => {
    it('validates nullable fields correctly with spam fields', () => {
      const result = tokenBalanceItemSchema.safeParse({
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        balance: '1000.00',
        symbol: 'USDC',
        decimals: 6,
        name: null,
        logo: null,
        usdValue: null,
        isSpam: false,
        userSpamOverride: null,
        effectiveSpamStatus: 'unknown',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBeNull();
        expect(result.data.logo).toBeNull();
        expect(result.data.usdValue).toBeNull();
      }
    });
  });
});
