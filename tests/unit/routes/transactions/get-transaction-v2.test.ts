import { NotFoundError } from '@iofinnet/errors-sdk';
import { EcoSystem } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { z } from 'zod';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import errorHandlerPlugin from '@/src/plugins/error-handler.js';

// Hoisted mock functions
const { mockGetByChainAndHash, mockLoggerInfo } = vi.hoisted(() => ({
  mockGetByChainAndHash: vi.fn(),
  mockLoggerInfo: vi.fn(),
}));

// Mock all path-aliased dependencies before importing handlers
vi.mock('@/src/lib/blockaid/utils.js', () => ({
  buildSolanaBlockaidTransactions: vi.fn(),
}));

vi.mock('@/src/lib/unmarshalWallet.js', () => ({
  unmarshalWallet: vi.fn(),
}));

vi.mock('@/src/lib/utils.js', () => ({
  getHooks: vi.fn(),
}));

vi.mock('@/src/services/blockaid.js', () => ({
  Blockaid: {
    scanEvmTransaction: vi.fn(),
    scanSvmTransaction: vi.fn(),
  },
}));

vi.mock('@/src/services/transactions/transaction.js', () => ({
  getTransactionWithOperation: vi.fn(),
}));

vi.mock('@/src/services/vaults/vaults.js', () => ({
  getVaultCurves: vi.fn(),
}));

vi.mock('@/src/lib/config.js', () => ({
  config: {
    services: {
      internalTransactionRouterUrl: 'http://localhost:3000',
    },
    multiChainWallet: {
      appId: 'test-app-id',
    },
  },
}));

vi.mock('@/utils/powertools.js', () => ({
  logger: {
    info: mockLoggerInfo,
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/utils/try-catch.js', () => ({
  tryCatch: vi.fn(),
}));

vi.mock('@/src/lib/schemas/common.js', () => ({
  vaultIdSchema: z.string().uuid(),
}));

vi.mock('@/src/lib/chains.js', () => ({
  ChainFeatures: {
    TRANSACTION_HISTORY: 'TRANSACTION_HISTORY',
    TRANSACTION_DESCRIPTIONS: 'TRANSACTION_DESCRIPTIONS',
    BLOCKAID_SCAN: 'BLOCKAID_SCAN',
  },
  supportedChains: z.string(),
}));

vi.mock('@/src/lib/isChainFeatureActive.js', () => ({
  isChainFeatureActive: vi.fn().mockReturnValue(true),
}));

// Import handler after mocks are set up
import { getTransactionDetailsV2 } from '@/src/routes/transactions/handlers.js';

const TEST_ORG_ID = 'org-123';
const TEST_USER_ID = 'user-123';
const TEST_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
const TEST_TX_HASH = '0xabc123def456789abc123def456789abc123def456789abc123def456789abc1';

const mockTransaction = {
  id: 'tx-uuid-1',
  chain: 'ethereum',
  network: 'mainnet',
  txHash: TEST_TX_HASH,
  blockNumber: '12345678',
  blockHash: '0xblockhash123',
  txIndex: 0,
  fromAddress: TEST_ADDRESS,
  toAddress: '0xrecipient',
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
  nativeTransfers: [],
  tokenTransfers: [],
  operationId: null,
};

const mockNativeTransfer = {
  id: 'nt-uuid-1',
  txId: 'tx-uuid-1',
  chain: 'ethereum',
  network: 'mainnet',
  fromAddress: TEST_ADDRESS,
  toAddress: '0xrecipient',
  amount: '1000000000000000000',
  metadata: null,
  createdAt: new Date('2024-01-15T10:00:00Z'),
};

const mockTokenTransfer = {
  id: 'tt-uuid-1',
  txId: 'tx-uuid-1',
  chain: 'ethereum',
  network: 'mainnet',
  tokenAddress: '0xtoken123',
  fromAddress: TEST_ADDRESS,
  toAddress: '0xrecipient',
  amount: '500000000',
  transferType: 'ERC20',
  metadata: null,
  createdAt: new Date('2024-01-15T10:00:00Z'),
};

// Simplified schemas for testing (bypass chain validation)
const getTransactionPathParamsSchema = z.object({
  ecosystem: z.enum(EcoSystem),
  chain: z.string().min(1),
  address: z.string().min(1),
  transactionHash: z.string().min(1),
});

const getTransactionQuerySchema = z
  .object({
    include: z.enum(['operation']).optional().nullable(),
  })
  .optional()
  .nullable();

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
  app.decorate('services', {
    transactions: {
      getByChainAndHash: mockGetByChainAndHash,
    },
  } as any);

  // Register the route directly with simplified schemas
  app.get(
    '/v2/transactions/ecosystem/:ecosystem/chain/:chain/address/:address/transaction/:transactionHash',
    {
      schema: {
        params: getTransactionPathParamsSchema,
        querystring: getTransactionQuerySchema,
      },
    },
    getTransactionDetailsV2
  );

  await app.ready();

  return app;
}

describe('Get Transaction V2 Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /v2/transactions/ecosystem/:ecosystem/chain/:chain/address/:address/transaction/:transactionHash', () => {
    it('returns transaction with transfers for valid hash', async () => {
      const app = await createTestApp();

      const transactionWithTransfers = {
        ...mockTransaction,
        nativeTransfers: [mockNativeTransfer],
        tokenTransfers: [mockTokenTransfer],
      };

      mockGetByChainAndHash.mockResolvedValueOnce(transactionWithTransfers);

      const response = await app.inject({
        method: 'GET',
        url: `/v2/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/transaction/${TEST_TX_HASH}`,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();

      // Verify transaction data
      expect(data.id).toBe('tx-uuid-1');
      expect(data.txHash).toBe(TEST_TX_HASH);
      expect(data.chain).toBe('ethereum');
      expect(data.network).toBe('mainnet');
      expect(data.status).toBe('success');

      // Verify transfers are included
      expect(Array.isArray(data.nativeTransfers)).toBe(true);
      expect(data.nativeTransfers).toHaveLength(1);
      expect(data.nativeTransfers[0].amount).toBe('1000000000000000000');

      expect(Array.isArray(data.tokenTransfers)).toBe(true);
      expect(data.tokenTransfers).toHaveLength(1);
      expect(data.tokenTransfers[0].tokenAddress).toBe('0xtoken123');

      // Verify operationId is present but null (stubbed)
      // TODO: operationId will be populated when operation inclusion is implemented
      expect(data.operationId).toBeNull();
    });

    it('returns transaction with empty transfers when none exist', async () => {
      const app = await createTestApp();

      mockGetByChainAndHash.mockResolvedValueOnce(mockTransaction);

      const response = await app.inject({
        method: 'GET',
        url: `/v2/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/transaction/${TEST_TX_HASH}`,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();

      expect(data.txHash).toBe(TEST_TX_HASH);
      expect(data.nativeTransfers).toHaveLength(0);
      expect(data.tokenTransfers).toHaveLength(0);
    });

    it('returns 404 when transaction not found', async () => {
      const app = await createTestApp();

      mockGetByChainAndHash.mockRejectedValueOnce(
        new NotFoundError(`Transaction not found: ${TEST_TX_HASH} on chain eth`)
      );

      const response = await app.inject({
        method: 'GET',
        url: `/v2/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/transaction/${TEST_TX_HASH}`,
      });

      expect(response.statusCode).toBe(404);
      const data = response.json();
      expect(data.message).toContain('Transaction not found');
    });

    it('returns 404 when chain not supported', async () => {
      const app = await createTestApp();

      // Simulate chain resolution failure (thrown by resolveChainNetwork)
      mockGetByChainAndHash.mockRejectedValueOnce(
        new NotFoundError('Chain not found: unsupported-chain')
      );

      const response = await app.inject({
        method: 'GET',
        url: `/v2/transactions/ecosystem/evm/chain/unsupported-chain/address/${TEST_ADDRESS}/transaction/${TEST_TX_HASH}`,
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns 500 when service is unavailable', async () => {
      const app = Fastify().withTypeProvider<ZodTypeProvider>();
      app.setValidatorCompiler(validatorCompiler);
      app.setSerializerCompiler(serializerCompiler);
      await app.register(errorHandlerPlugin);

      app.decorateRequest('auth', null);
      app.addHook('onRequest', async (request) => {
        request.auth = { organisationId: TEST_ORG_ID, userId: TEST_USER_ID, token: 'test-token' };
      });

      // Don't decorate services - simulate unavailable service
      app.decorate('services', undefined as any);

      // Register route directly without services
      app.get(
        '/v2/transactions/ecosystem/:ecosystem/chain/:chain/address/:address/transaction/:transactionHash',
        {
          schema: {
            params: getTransactionPathParamsSchema,
            querystring: getTransactionQuerySchema,
          },
        },
        getTransactionDetailsV2
      );

      await app.ready();

      const response = await app.inject({
        method: 'GET',
        url: `/v2/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/transaction/${TEST_TX_HASH}`,
      });

      expect(response.statusCode).toBe(500);
    });

    describe('path parameter validation', () => {
      it('validates ecosystem parameter', async () => {
        const app = await createTestApp();

        const response = await app.inject({
          method: 'GET',
          url: `/v2/transactions/ecosystem/invalid-ecosystem/chain/eth/address/${TEST_ADDRESS}/transaction/${TEST_TX_HASH}`,
        });

        expect(response.statusCode).toBe(400);
      });

      it('requires chain parameter', async () => {
        const app = await createTestApp();

        // Empty chain should fail min(1) validation
        const response = await app.inject({
          method: 'GET',
          url: `/v2/transactions/ecosystem/evm/chain//address/${TEST_ADDRESS}/transaction/${TEST_TX_HASH}`,
        });

        expect(response.statusCode).toBe(400);
      });

      it('requires address parameter', async () => {
        const app = await createTestApp();

        const response = await app.inject({
          method: 'GET',
          url: `/v2/transactions/ecosystem/evm/chain/eth/address//transaction/${TEST_TX_HASH}`,
        });

        expect(response.statusCode).toBe(400);
      });

      it('requires transactionHash parameter', async () => {
        const app = await createTestApp();

        const response = await app.inject({
          method: 'GET',
          url: `/v2/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/transaction/`,
        });

        // Empty transaction hash should fail validation or return 404
        expect([400, 404]).toContain(response.statusCode);
      });

      it('passes chain alias to service correctly', async () => {
        const app = await createTestApp();

        mockGetByChainAndHash.mockResolvedValueOnce(mockTransaction);

        await app.inject({
          method: 'GET',
          url: `/v2/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/transaction/${TEST_TX_HASH}`,
        });

        expect(mockGetByChainAndHash).toHaveBeenCalledWith({
          chain: 'eth',
          txHash: TEST_TX_HASH,
        });
      });
    });

    describe('include=operation query parameter', () => {
      it('logs TODO message when include=operation is passed', async () => {
        const app = await createTestApp();

        mockGetByChainAndHash.mockResolvedValueOnce(mockTransaction);

        const response = await app.inject({
          method: 'GET',
          url: `/v2/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/transaction/${TEST_TX_HASH}?include=operation`,
        });

        expect(response.statusCode).toBe(200);

        // Verify the TODO info message was logged
        // TODO: Operation inclusion is not yet implemented for v2 transaction endpoint
        expect(mockLoggerInfo).toHaveBeenCalledWith(
          'TODO: Operation inclusion not yet implemented for v2 transaction endpoint'
        );
      });

      it('still returns transaction even with include=operation', async () => {
        const app = await createTestApp();

        mockGetByChainAndHash.mockResolvedValueOnce(mockTransaction);

        const response = await app.inject({
          method: 'GET',
          url: `/v2/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/transaction/${TEST_TX_HASH}?include=operation`,
        });

        expect(response.statusCode).toBe(200);
        const data = response.json();
        expect(data.txHash).toBe(TEST_TX_HASH);
        // operationId is always null for now (stubbed)
        // TODO: operationId will be populated when operation inclusion is implemented
        expect(data.operationId).toBeNull();
      });

      it('does not log TODO message when include is not provided', async () => {
        const app = await createTestApp();

        mockGetByChainAndHash.mockResolvedValueOnce(mockTransaction);

        await app.inject({
          method: 'GET',
          url: `/v2/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/transaction/${TEST_TX_HASH}`,
        });

        expect(mockLoggerInfo).not.toHaveBeenCalledWith(
          'TODO: Operation inclusion not yet implemented for v2 transaction endpoint'
        );
      });

      it('rejects invalid include parameter value', async () => {
        const app = await createTestApp();

        const response = await app.inject({
          method: 'GET',
          url: `/v2/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/transaction/${TEST_TX_HASH}?include=invalid`,
        });

        expect(response.statusCode).toBe(400);
      });
    });

    describe('response shape', () => {
      it('includes all required transaction fields', async () => {
        const app = await createTestApp();

        mockGetByChainAndHash.mockResolvedValueOnce(mockTransaction);

        const response = await app.inject({
          method: 'GET',
          url: `/v2/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/transaction/${TEST_TX_HASH}`,
        });

        expect(response.statusCode).toBe(200);
        const data = response.json();

        // Verify all required fields are present
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('chain');
        expect(data).toHaveProperty('network');
        expect(data).toHaveProperty('txHash');
        expect(data).toHaveProperty('blockNumber');
        expect(data).toHaveProperty('blockHash');
        expect(data).toHaveProperty('txIndex');
        expect(data).toHaveProperty('fromAddress');
        expect(data).toHaveProperty('toAddress');
        expect(data).toHaveProperty('value');
        expect(data).toHaveProperty('fee');
        expect(data).toHaveProperty('status');
        expect(data).toHaveProperty('timestamp');
        expect(data).toHaveProperty('classificationType');
        expect(data).toHaveProperty('classificationLabel');
        expect(data).toHaveProperty('protocolName');
        expect(data).toHaveProperty('details');
        expect(data).toHaveProperty('createdAt');
        expect(data).toHaveProperty('updatedAt');
        expect(data).toHaveProperty('nativeTransfers');
        expect(data).toHaveProperty('tokenTransfers');
        expect(data).toHaveProperty('operationId');
      });

      it('nativeTransfers and tokenTransfers are always arrays', async () => {
        const app = await createTestApp();

        mockGetByChainAndHash.mockResolvedValueOnce(mockTransaction);

        const response = await app.inject({
          method: 'GET',
          url: `/v2/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/transaction/${TEST_TX_HASH}`,
        });

        expect(response.statusCode).toBe(200);
        const data = response.json();

        expect(Array.isArray(data.nativeTransfers)).toBe(true);
        expect(Array.isArray(data.tokenTransfers)).toBe(true);
      });
    });
  });
});
