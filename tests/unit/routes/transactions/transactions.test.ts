import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import errorHandlerPlugin from '@/src/plugins/error-handler.js';
import transactionRoutes, { vaultTransactionRoutes, transactionRoutesV2 } from '@/src/routes/transactions/index.js';

// Mock environment variables
vi.stubEnv('STAGE', 'dev');
vi.stubEnv('INTERNAL_TRANSACTION_ROUTER_URL', 'https://mock-router.example.com');
vi.stubEnv('MULTI_CHAIN_WALLET_APP_ID', 'test-app-id');

// Hoisted mock functions
const { mockListByChainAliasAndAddress, mockGetByChainAndHash } = vi.hoisted(() => ({
  mockListByChainAliasAndAddress: vi.fn(),
  mockGetByChainAndHash: vi.fn(),
}));

// Mock the transaction service
vi.mock('@/src/services/transactions/transaction.js', () => ({
  listTransactions: vi.fn(),
  getTransaction: vi.fn(),
  getTransactionWithOperation: vi.fn(),
}));


// Mock the blockaid service - path must match import in handlers.ts
vi.mock('@/src/services/blockaid.js', () => ({
  Blockaid: {
    scanEvmTransaction: vi.fn(),
    scanSvmTransaction: vi.fn(),
  },
}));

// Mock unmarshalWallet
vi.mock('@/src/lib/unmarshalWallet.js', () => ({
  unmarshalWallet: vi.fn(),
}));

// Mock Chain from SDK
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
      fromAlias: vi.fn().mockResolvedValue({
        TransactionBuilder: {
          unmarshalHex: vi.fn().mockResolvedValue({
            rawTx: () => ({
              to: '0x1234',
              data: '0x',
              gas: '21000',
            }),
            serializeForSigning: vi.fn().mockResolvedValue(['data-to-sign']),
          }),
        },
        loadWallet: vi.fn().mockReturnValue({
          marshalHex: () => 'marshalled-wallet-hex',
          getCoseAlgorithm: () => 'ES256K',
        }),
        isEcosystem: vi.fn().mockReturnValue(true),
      }),
    },
  };
});

// Mock signedRequest
vi.mock('@/src/lib/signed-request.js', () => ({
  signedRequest: vi.fn().mockResolvedValue({ id: 'test-sign-request-id' }),
}));

// Mock config module to provide required values
vi.mock('@/src/lib/config.js', () => ({
  config: {
    services: {
      internalTransactionRouterUrl: 'https://mock-router.example.com',
    },
    multiChainWallet: {
      appId: 'test-app-id',
    },
  },
}));

// Mock getHooks
vi.mock('@/src/lib/utils.js', () => ({
  getHooks: vi.fn().mockReturnValue([]),
}));

// Mock blockaid utils
vi.mock('@/src/lib/blockaid/utils.js', () => ({
  buildSolanaBlockaidTransactions: vi.fn().mockReturnValue(['base58-tx']),
}));

import { getTransactionWithOperation } from '@/src/services/transactions/transaction.js';
import { Blockaid } from '@/src/services/blockaid.js';
import { unmarshalWallet } from '@/src/lib/unmarshalWallet.js';

const TEST_VAULT_ID = 'clvvvvvvvvvvvvvvvvvvvvvvv'; // Valid cuid2 format
const TEST_ORG_ID = 'org-123';
const TEST_USER_ID = 'user-123';
const TEST_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
const TEST_TX_HASH = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

// Legacy format mock transaction (used for get transaction details)
const mockTransaction = {
  chain: 'eth',
  accountAddress: TEST_ADDRESS,
  classificationData: {
    type: 'transfer',
    description: 'Native token transfer',
  },
  transfers: [
    {
      action: 'sent',
      from: { name: null, address: TEST_ADDRESS },
      to: { name: null, address: '0x9999999999999999999999999999999999999999' },
      amount: '1000000000000000000',
      token: {
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        address: '0x0000000000000000000000000000000000000000',
      },
    },
  ],
  rawTransactionData: {
    transactionHash: TEST_TX_HASH,
    fromAddress: TEST_ADDRESS,
    toAddress: '0x9999999999999999999999999999999999999999',
    blockNumber: 12345678,
    gas: 21000,
    gasUsed: 21000,
    gasPrice: 20000000000,
    transactionFee: {
      amount: '420000000000000',
      token: {
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        address: '0x0000000000000000000000000000000000000000',
      },
    },
    timestamp: 1700000000,
  },
};

// PostgreSQL format mock transaction (matches postgresTransactionSchema)
const mockPostgresTransaction = {
  id: 'tx-uuid-1',
  chainAlias: 'eth',
  network: 'mainnet',
  txHash: TEST_TX_HASH,
  blockNumber: '12345678',
  blockHash: '0xblockhash123',
  txIndex: 0,
  fromAddress: TEST_ADDRESS,
  toAddress: '0x9999999999999999999999999999999999999999',
  value: '1000000000000000000',
  fee: '21000000000000',
  status: 'success' as const,
  timestamp: new Date('2024-01-15T10:00:00Z'),
  classificationType: 'transfer',
  classificationLabel: 'Native Transfer',
  direction: 'out' as const,
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T10:00:00Z'),
  operationId: null, // Required by getTransactionV2ResponseSchema (nullable but not optional)
  transfers: [
    {
      id: 'transfer-uuid-1',
      transferType: 'native' as const,
      direction: 'out' as const,
      fromAddress: TEST_ADDRESS,
      toAddress: '0x9999999999999999999999999999999999999999',
      tokenAddress: null,
      amount: '1000000000000000000',
      formattedAmount: '1.0',
      displayAmount: '1.0 ETH',
      asset: {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
        logoUri: null,
        coingeckoId: 'ethereum',
        isVerified: true,
        isSpam: false,
      },
    },
  ],
};

const mockWallet = {
  getAddress: () => TEST_ADDRESS,
  Chain: { Alias: 'eth' },
  isHDWallet: () => false,
};

async function createTestApp() {
  const app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Register error handler
  await app.register(errorHandlerPlugin);

  // Mock auth decorator
  app.decorateRequest('auth', null);
  app.addHook('onRequest', async (request) => {
    request.auth = { organisationId: TEST_ORG_ID, userId: TEST_USER_ID, token: 'test-token' };
  });

  // Mock services decorator
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.decorate('services', {
    transactions: {
      listByChainAliasAndAddress: mockListByChainAliasAndAddress,
      getByChainAndHash: mockGetByChainAndHash,
    },
  } as any);

  // Register transaction routes
  await app.register(transactionRoutes, { prefix: '/v2/transactions' });
  await app.ready();

  return app;
}

async function createVaultTestApp() {
  const app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Register error handler
  await app.register(errorHandlerPlugin);

  // Mock auth decorator
  app.decorateRequest('auth', null);
  app.addHook('onRequest', async (request) => {
    request.auth = { organisationId: TEST_ORG_ID, userId: TEST_USER_ID, token: 'test-token' };
  });

  // Mock services decorator
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.decorate('services', {
    vault: {
      getVaultCurves: vi.fn().mockResolvedValue({
        vaultId: TEST_VAULT_ID,
        curves: [],
      }),
    },
  } as any);

  // Register vault transaction routes
  await app.register(vaultTransactionRoutes, {
    prefix: '/v2/vaults/:vaultId/transactions',
  });
  await app.ready();

  return app;
}

async function createV2TestApp() {
  const app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Register error handler
  await app.register(errorHandlerPlugin);

  // Mock auth decorator
  app.decorateRequest('auth', null);
  app.addHook('onRequest', async (request) => {
    request.auth = { organisationId: TEST_ORG_ID, userId: TEST_USER_ID, token: 'test-token' };
  });

  // Mock services decorator
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.decorate('services', {
    transactions: {
      listByChainAliasAndAddress: mockListByChainAliasAndAddress,
      getByChainAndHash: mockGetByChainAndHash,
    },
  } as any);

  // Register v2 transaction routes (includes GET transaction details)
  await app.register(transactionRoutesV2, { prefix: '/v2/transactions' });
  await app.ready();

  return app;
}

describe('Transaction Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /v2/transactions/ecosystem/:ecosystem/chain/:chain/address/:address', () => {
    it('returns paginated list of transactions', async () => {
      const app = await createTestApp();

      mockListByChainAliasAndAddress.mockResolvedValueOnce({
        transactions: [mockPostgresTransaction],
        pagination: {
          hasMore: true,
          nextCursor: 'cursor123',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/v2/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}`,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.pagination.hasMore).toBe(true);
    });

    it('supports pagination parameters', async () => {
      const app = await createTestApp();

      mockListByChainAliasAndAddress.mockResolvedValueOnce({
        transactions: [],
        pagination: {
          hasMore: false,
          nextCursor: null,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/v2/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}?limit=10&cursor=cursor123`,
      });

      expect(response.statusCode).toBe(200);
      expect(mockListByChainAliasAndAddress).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          cursor: 'cursor123',
        })
      );
    });

    it('validates ecosystem parameter', async () => {
      const app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: `/v2/transactions/ecosystem/invalid/chain/eth/address/${TEST_ADDRESS}`,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /v2/transactions/ecosystem/:ecosystem/chain/:chain/address/:address/transaction/:transactionHash', () => {
    it('returns transaction details', async () => {
      const app = await createV2TestApp();

      mockGetByChainAndHash.mockResolvedValueOnce(mockPostgresTransaction);

      const response = await app.inject({
        method: 'GET',
        url: `/v2/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/transaction/${TEST_TX_HASH}`,
      });

      if (response.statusCode !== 200) {
        console.log('Transaction details error:', response.body);
      }
      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.txHash).toBe(TEST_TX_HASH);
    });

    it('supports include=operation query parameter', async () => {
      const app = await createV2TestApp();

      mockGetByChainAndHash.mockResolvedValueOnce(mockPostgresTransaction);

      const response = await app.inject({
        method: 'GET',
        url: `/v2/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/transaction/${TEST_TX_HASH}?include=operation`,
      });

      // V2 endpoint accepts include=operation but operation inclusion is not yet implemented
      expect(response.statusCode).toBe(200);
      expect(mockGetByChainAndHash).toHaveBeenCalledWith(
        expect.objectContaining({
          chainAlias: 'eth',
          txHash: TEST_TX_HASH,
          address: TEST_ADDRESS,
        })
      );
    });
  });

  describe('POST /v2/transactions/ecosystem/:ecosystem/chain/:chain/scan-transaction', () => {
    it('scans EVM transaction successfully', async () => {
      const app = await createTestApp();

      vi.mocked(unmarshalWallet).mockResolvedValueOnce(mockWallet as any);
      vi.mocked(Blockaid.scanEvmTransaction).mockResolvedValueOnce({
        simulation: { status: 'success' },
        validation: { status: 'benign' },
      } as any);

      const response = await app.inject({
        method: 'POST',
        url: '/v2/transactions/ecosystem/evm/chain/eth/scan-transaction',
        payload: {
          marshalledHex: 'abcd1234',
          options: ['simulation', 'validation'],
          metadata: { url: 'https://example.com' },
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data).toHaveProperty('scan');
    });

    it('validates required fields', async () => {
      const app = await createTestApp();

      const response = await app.inject({
        method: 'POST',
        url: '/v2/transactions/ecosystem/evm/chain/eth/scan-transaction',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /v2/vaults/:vaultId/transactions/ecosystem/:ecosystem/chain/:chain/transaction', () => {
    it('creates a transaction successfully', async () => {
      const app = await createVaultTestApp();

      vi.mocked(unmarshalWallet).mockResolvedValueOnce(mockWallet as any);
      // getVaultCurves mock is already set up in createVaultTestApp()

      const response = await app.inject({
        method: 'POST',
        url: `/v2/vaults/${TEST_VAULT_ID}/transactions/ecosystem/evm/chain/eth/transaction`,
        payload: {
          marshalledHex: 'abcd1234',
          memo: 'Test transaction',
          broadcast: true,
        },
      });

      if (response.statusCode !== 201) {
        console.log('Create transaction error:', response.body);
      }
      expect(response.statusCode).toBe(201);
      const data = response.json();
      expect(data).toHaveProperty('id');
    });

    it('rejects invalid marshalledHex with error', async () => {
      // Note: vaultIdSchema only validates min(1) string, not format like cuid2
      // Invalid vaultId passes schema but fails downstream when wallet can't be loaded
      const app = await createVaultTestApp();

      vi.mocked(unmarshalWallet).mockRejectedValueOnce(new Error('Invalid marshalled hex'));

      const response = await app.inject({
        method: 'POST',
        url: '/v2/vaults/some-vault-id/transactions/ecosystem/evm/chain/eth/transaction',
        payload: {
          marshalledHex: 'invalid-hex-data',
        },
      });

      expect(response.statusCode).toBe(500);
    });

    it('validates required marshalledHex field', async () => {
      const app = await createVaultTestApp();

      const response = await app.inject({
        method: 'POST',
        url: `/v2/vaults/${TEST_VAULT_ID}/transactions/ecosystem/evm/chain/eth/transaction`,
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
