import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import errorHandlerPlugin from '@/src/plugins/error-handler.js';
import transactionRoutes, { vaultTransactionRoutes } from '@/src/routes/transactions/index.js';

// Mock environment variables
vi.stubEnv('STAGE', 'dev');
vi.stubEnv('INTERNAL_TRANSACTION_ROUTER_URL', 'https://mock-router.example.com');
vi.stubEnv('MULTI_CHAIN_WALLET_APP_ID', 'test-app-id');

// Hoisted mock functions
const { mockListByChainAndAddress } = vi.hoisted(() => ({
  mockListByChainAndAddress: vi.fn(),
}));

// Mock the transaction service
vi.mock('@/src/services/transactions/transaction.js', () => ({
  listTransactions: vi.fn(),
  getTransaction: vi.fn(),
  getTransactionWithOperation: vi.fn(),
}));


// Mock the blockaid service
vi.mock('@/src/services/blockaid/index.js', () => ({
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

// Mock signedHttpLambdaRequest
vi.mock('@iofinnet/io-core-cldsvc-sdk', () => ({
  signedHttpLambdaRequest: vi.fn().mockResolvedValue({ id: 'test-sign-request-id' }),
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
import { Blockaid } from '@/src/services/blockaid/index.js';
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

// PostgreSQL format mock transaction (used for list transactions)
const mockPostgresTransaction = {
  id: 'tx-uuid-1',
  chain: 'ethereum',
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
  protocolName: null,
  details: null,
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T10:00:00Z'),
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
      listByChainAndAddress: mockListByChainAndAddress,
    },
  } as any);

  // Register transaction routes
  await app.register(transactionRoutes, { prefix: '/v1/transactions' });
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
    prefix: '/v1/vaults/:vaultId/transactions',
  });
  await app.ready();

  return app;
}

describe('Transaction Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /v1/transactions/ecosystem/:ecosystem/chain/:chain/address/:address', () => {
    it('returns paginated list of transactions', async () => {
      const app = await createTestApp();

      mockListByChainAndAddress.mockResolvedValueOnce({
        transactions: [mockPostgresTransaction],
        pagination: {
          hasNextPage: true,
          hasPreviousPage: false,
          nextCursor: 'cursor123',
          previousCursor: null,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/v1/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}`,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.pagination.hasNextPage).toBe(true);
    });

    it('supports pagination parameters', async () => {
      const app = await createTestApp();

      mockListByChainAndAddress.mockResolvedValueOnce({
        transactions: [],
        pagination: {
          hasNextPage: false,
          hasPreviousPage: false,
          nextCursor: null,
          previousCursor: null,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/v1/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}?limit=10&cursor=cursor123`,
      });

      expect(response.statusCode).toBe(200);
      expect(mockListByChainAndAddress).toHaveBeenCalledWith(
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
        url: `/v1/transactions/ecosystem/invalid/chain/eth/address/${TEST_ADDRESS}`,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /v1/transactions/ecosystem/:ecosystem/chain/:chain/address/:address/transaction/:transactionHash', () => {
    it('returns transaction details', async () => {
      const app = await createTestApp();

      vi.mocked(getTransactionWithOperation).mockResolvedValueOnce(mockTransaction as any);

      const response = await app.inject({
        method: 'GET',
        url: `/v1/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/transaction/${TEST_TX_HASH}`,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.rawTransactionData.transactionHash).toBe(TEST_TX_HASH);
    });

    it('supports include=operation query parameter', async () => {
      const app = await createTestApp();

      vi.mocked(getTransactionWithOperation).mockResolvedValueOnce({
        ...mockTransaction,
        operationId: 'op-123',
      } as any);

      const response = await app.inject({
        method: 'GET',
        url: `/v1/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/transaction/${TEST_TX_HASH}?include=operation`,
      });

      expect(response.statusCode).toBe(200);
      expect(getTransactionWithOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          shouldIncludeOperation: true,
        })
      );
    });
  });

  describe('POST /v1/transactions/ecosystem/:ecosystem/chain/:chain/scan-transaction', () => {
    it('scans EVM transaction successfully', async () => {
      const app = await createTestApp();

      vi.mocked(unmarshalWallet).mockResolvedValueOnce(mockWallet as any);
      vi.mocked(Blockaid.scanEvmTransaction).mockResolvedValueOnce({
        simulation: { status: 'success' },
        validation: { status: 'benign' },
      } as any);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/transactions/ecosystem/evm/chain/eth/scan-transaction',
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
        url: '/v1/transactions/ecosystem/evm/chain/eth/scan-transaction',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /v1/vaults/:vaultId/transactions/ecosystem/:ecosystem/chain/:chain/transaction', () => {
    it('creates a transaction successfully', async () => {
      const app = await createVaultTestApp();

      vi.mocked(unmarshalWallet).mockResolvedValueOnce(mockWallet as any);
      // getVaultCurves mock is already set up in createVaultTestApp()

      const response = await app.inject({
        method: 'POST',
        url: `/v1/vaults/${TEST_VAULT_ID}/transactions/ecosystem/evm/chain/eth/transaction`,
        payload: {
          marshalledHex: 'abcd1234',
          memo: 'Test transaction',
          broadcast: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const data = response.json();
      expect(data).toHaveProperty('id');
    });

    it('validates vaultId format', async () => {
      const app = await createVaultTestApp();

      const response = await app.inject({
        method: 'POST',
        url: '/v1/vaults/invalid-vault/transactions/ecosystem/evm/chain/eth/transaction',
        payload: {
          marshalledHex: 'abcd1234',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('validates required marshalledHex field', async () => {
      const app = await createVaultTestApp();

      const response = await app.inject({
        method: 'POST',
        url: `/v1/vaults/${TEST_VAULT_ID}/transactions/ecosystem/evm/chain/eth/transaction`,
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
