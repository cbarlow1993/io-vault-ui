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
const { mockListByChainAndAddress } = vi.hoisted(() => ({
  mockListByChainAndAddress: vi.fn(),
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
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/utils/try-catch.js', () => ({
  tryCatch: vi.fn(),
}));

vi.mock('@/services/common/index.js', () => ({
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
import { listTransactions } from '@/src/routes/transactions/handlers.js';

const TEST_ORG_ID = 'org-123';
const TEST_USER_ID = 'user-123';
const TEST_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';

const mockTransaction = {
  id: 'tx-uuid-1',
  chain: 'ethereum',
  network: 'mainnet',
  txHash: '0xabc123',
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
const listTransactionsPathParamsSchema = z.object({
  ecosystem: z.nativeEnum(EcoSystem),
  chain: z.string().min(1),
  address: z.string().min(1),
});

const listTransactionsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  sort: z.enum(['asc', 'desc']).optional().default('desc'),
  includeNativeTransfers: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  includeTokenTransfers: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

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

  // Register the route directly with simplified schemas
  app.get(
    '/v1/transactions/ecosystem/:ecosystem/chain/:chain/address/:address',
    {
      schema: {
        params: listTransactionsPathParamsSchema,
        querystring: listTransactionsQuerySchema,
      },
    },
    listTransactions
  );

  await app.ready();

  return app;
}

describe('Transaction Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /v1/transactions/ecosystem/:ecosystem/chain/:chain/address/:address', () => {
    it('returns transactions for an address', async () => {
      const app = await createTestApp();

      mockListByChainAndAddress.mockResolvedValueOnce({
        transactions: [mockTransaction],
        pagination: {
          hasNextPage: false,
          hasPreviousPage: false,
          nextCursor: null,
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
      expect(data.data).toHaveLength(1);
      expect(data.data[0].txHash).toBe('0xabc123');
    });

    it('returns empty transactions array for address with no transactions', async () => {
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
        url: `/v1/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}`,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.data).toHaveLength(0);
    });

    it('returns 404 when address is not found', async () => {
      const app = await createTestApp();

      mockListByChainAndAddress.mockRejectedValueOnce(
        new NotFoundError(`Address not found: ${TEST_ADDRESS}`)
      );

      const response = await app.inject({
        method: 'GET',
        url: `/v1/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}`,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      app.decorate('services', undefined as any);

      // Register route directly without services
      app.get(
        '/v1/transactions/ecosystem/:ecosystem/chain/:chain/address/:address',
        {
          schema: {
            params: listTransactionsPathParamsSchema,
            querystring: listTransactionsQuerySchema,
          },
        },
        listTransactions
      );

      await app.ready();

      const response = await app.inject({
        method: 'GET',
        url: `/v1/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}`,
      });

      expect(response.statusCode).toBe(500);
    });

    describe('pagination parameters', () => {
      it('uses default limit of 50 when not specified', async () => {
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

        await app.inject({
          method: 'GET',
          url: `/v1/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}`,
        });

        expect(mockListByChainAndAddress).toHaveBeenCalledWith(
          expect.objectContaining({
            limit: 50,
          })
        );
      });

      it('respects custom limit parameter', async () => {
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

        await app.inject({
          method: 'GET',
          url: `/v1/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}?limit=25`,
        });

        expect(mockListByChainAndAddress).toHaveBeenCalledWith(
          expect.objectContaining({
            limit: 25,
          })
        );
      });

      it('rejects limit greater than 100', async () => {
        const app = await createTestApp();

        const response = await app.inject({
          method: 'GET',
          url: `/v1/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}?limit=150`,
        });

        expect(response.statusCode).toBe(400);
      });

      it('rejects limit less than 1', async () => {
        const app = await createTestApp();

        const response = await app.inject({
          method: 'GET',
          url: `/v1/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}?limit=0`,
        });

        expect(response.statusCode).toBe(400);
      });

      it('uses default sort of desc when not specified', async () => {
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

        await app.inject({
          method: 'GET',
          url: `/v1/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}`,
        });

        expect(mockListByChainAndAddress).toHaveBeenCalledWith(
          expect.objectContaining({
            sort: 'desc',
          })
        );
      });

      it('respects sort=asc parameter', async () => {
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

        await app.inject({
          method: 'GET',
          url: `/v1/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}?sort=asc`,
        });

        expect(mockListByChainAndAddress).toHaveBeenCalledWith(
          expect.objectContaining({
            sort: 'asc',
          })
        );
      });

      it('rejects invalid sort parameter', async () => {
        const app = await createTestApp();

        const response = await app.inject({
          method: 'GET',
          url: `/v1/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}?sort=invalid`,
        });

        expect(response.statusCode).toBe(400);
      });

      it('passes cursor to service when provided', async () => {
        const app = await createTestApp();

        mockListByChainAndAddress.mockResolvedValueOnce({
          transactions: [],
          pagination: {
            hasNextPage: false,
            hasPreviousPage: true,
            nextCursor: null,
            previousCursor: 'prev-cursor',
          },
        });

        const cursor = 'eyJ0cyI6MTcwNTMxMzYwMDAwMCwiaWQiOiJ0eC11dWlkLTEifQ';

        await app.inject({
          method: 'GET',
          url: `/v1/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}?cursor=${cursor}`,
        });

        expect(mockListByChainAndAddress).toHaveBeenCalledWith(
          expect.objectContaining({
            cursor,
          })
        );
      });

      it('returns pagination cursors when available', async () => {
        const app = await createTestApp();

        mockListByChainAndAddress.mockResolvedValueOnce({
          transactions: [mockTransaction],
          pagination: {
            hasNextPage: true,
            hasPreviousPage: false,
            nextCursor: 'next-cursor-value',
            previousCursor: null,
          },
        });

        const response = await app.inject({
          method: 'GET',
          url: `/v1/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}`,
        });

        expect(response.statusCode).toBe(200);
        const data = response.json();
        expect(data.pagination.hasNextPage).toBe(true);
        expect(data.pagination.hasPreviousPage).toBe(false);
        expect(data.pagination.nextCursor).toBe('next-cursor-value');
        expect(data.pagination.previousCursor).toBeNull();
      });
    });

    describe('include options', () => {
      it('includes native transfers when includeNativeTransfers=true', async () => {
        const app = await createTestApp();

        mockListByChainAndAddress.mockResolvedValueOnce({
          transactions: [
            {
              ...mockTransaction,
              nativeTransfers: [mockNativeTransfer],
            },
          ],
          pagination: {
            hasNextPage: false,
            hasPreviousPage: false,
            nextCursor: null,
            previousCursor: null,
          },
        });

        const response = await app.inject({
          method: 'GET',
          url: `/v1/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}?includeNativeTransfers=true`,
        });

        expect(response.statusCode).toBe(200);
        expect(mockListByChainAndAddress).toHaveBeenCalledWith(
          expect.objectContaining({
            include: expect.objectContaining({
              nativeTransfers: true,
            }),
          })
        );

        const data = response.json();
        expect(data.data[0].nativeTransfers).toBeDefined();
        expect(data.data[0].nativeTransfers).toHaveLength(1);
      });

      it('includes token transfers when includeTokenTransfers=true', async () => {
        const app = await createTestApp();

        mockListByChainAndAddress.mockResolvedValueOnce({
          transactions: [
            {
              ...mockTransaction,
              tokenTransfers: [mockTokenTransfer],
            },
          ],
          pagination: {
            hasNextPage: false,
            hasPreviousPage: false,
            nextCursor: null,
            previousCursor: null,
          },
        });

        const response = await app.inject({
          method: 'GET',
          url: `/v1/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}?includeTokenTransfers=true`,
        });

        expect(response.statusCode).toBe(200);
        expect(mockListByChainAndAddress).toHaveBeenCalledWith(
          expect.objectContaining({
            include: expect.objectContaining({
              tokenTransfers: true,
            }),
          })
        );

        const data = response.json();
        expect(data.data[0].tokenTransfers).toBeDefined();
        expect(data.data[0].tokenTransfers).toHaveLength(1);
      });

      it('includes both transfer types when both flags are true', async () => {
        const app = await createTestApp();

        mockListByChainAndAddress.mockResolvedValueOnce({
          transactions: [
            {
              ...mockTransaction,
              nativeTransfers: [mockNativeTransfer],
              tokenTransfers: [mockTokenTransfer],
            },
          ],
          pagination: {
            hasNextPage: false,
            hasPreviousPage: false,
            nextCursor: null,
            previousCursor: null,
          },
        });

        const response = await app.inject({
          method: 'GET',
          url: `/v1/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}?includeNativeTransfers=true&includeTokenTransfers=true`,
        });

        expect(response.statusCode).toBe(200);
        expect(mockListByChainAndAddress).toHaveBeenCalledWith(
          expect.objectContaining({
            include: {
              nativeTransfers: true,
              tokenTransfers: true,
            },
          })
        );

        const data = response.json();
        expect(data.data[0].nativeTransfers).toHaveLength(1);
        expect(data.data[0].tokenTransfers).toHaveLength(1);
      });

      it('does not include transfers when flags are false', async () => {
        const app = await createTestApp();

        mockListByChainAndAddress.mockResolvedValueOnce({
          transactions: [mockTransaction],
          pagination: {
            hasNextPage: false,
            hasPreviousPage: false,
            nextCursor: null,
            previousCursor: null,
          },
        });

        await app.inject({
          method: 'GET',
          url: `/v1/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}?includeNativeTransfers=false&includeTokenTransfers=false`,
        });

        expect(mockListByChainAndAddress).toHaveBeenCalledWith(
          expect.objectContaining({
            include: {
              nativeTransfers: false,
              tokenTransfers: false,
            },
          })
        );
      });
    });

    describe('parameter validation', () => {
      it('validates ecosystem parameter', async () => {
        const app = await createTestApp();

        const response = await app.inject({
          method: 'GET',
          url: `/v1/transactions/ecosystem/invalid/chain/eth/address/${TEST_ADDRESS}`,
        });

        expect(response.statusCode).toBe(400);
      });

      it('requires address parameter', async () => {
        const app = await createTestApp();

        const response = await app.inject({
          method: 'GET',
          url: `/v1/transactions/ecosystem/evm/chain/eth/address/`,
        });

        // Route matches but empty address fails min(1) validation
        expect(response.statusCode).toBe(400);
      });

      it('passes chain alias to service', async () => {
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

        await app.inject({
          method: 'GET',
          url: `/v1/transactions/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}`,
        });

        expect(mockListByChainAndAddress).toHaveBeenCalledWith(
          expect.objectContaining({
            chain: 'eth',
            address: TEST_ADDRESS,
          })
        );
      });
    });
  });
});
