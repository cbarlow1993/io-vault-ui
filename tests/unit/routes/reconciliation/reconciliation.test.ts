import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import errorHandlerPlugin from '@/src/plugins/error-handler.js';

// Hoisted mock functions
const { mockCreateJob, mockGetJob, mockListJobs } = vi.hoisted(() => ({
  mockCreateJob: vi.fn(),
  mockGetJob: vi.fn(),
  mockListJobs: vi.fn(),
}));

// Mock ReconciliationService
vi.mock('@/src/services/reconciliation/index.js', () => ({
  ReconciliationService: vi.fn().mockImplementation(() => ({
    createJob: mockCreateJob,
    getJob: mockGetJob,
    listJobs: mockListJobs,
  })),
}));

// Mock repositories
vi.mock('@/src/repositories/index.js', () => ({
  PostgresReconciliationRepository: vi.fn(),
  PostgresTransactionRepository: vi.fn(),
  PostgresAddressRepository: vi.fn(),
}));

vi.mock('@/utils/powertools.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Import handlers after mocks are set up
import {
  initiateReconciliation,
  getJob,
  listJobs,
} from '@/src/routes/reconciliation/handlers.js';
import {
  initiateReconciliationPathSchema,
  initiateReconciliationBodySchema,
  getJobPathSchema,
  listJobsPathSchema,
  listJobsQuerySchema,
} from '@/src/routes/reconciliation/schemas.js';

const TEST_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
const TEST_CHAIN = 'ethereum';
const TEST_JOB_ID = '123e4567-e89b-12d3-a456-426614174000';

const mockJobData = {
  id: TEST_JOB_ID,
  address: TEST_ADDRESS,
  chain: 'ethereum',
  network: 'mainnet',
  status: 'pending' as const,
  provider: 'noves',
  mode: 'partial' as const,
  fromBlock: null,
  toBlock: null,
  finalBlock: null,
  fromTimestamp: null,
  toTimestamp: null,
  lastProcessedCursor: null,
  processedCount: 0,
  transactionsAdded: 0,
  transactionsSoftDeleted: 0,
  discrepanciesFlagged: 0,
  errorsCount: 0,
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T10:00:00Z'),
  startedAt: null,
  completedAt: null,
};

const mockJobWithAuditLog = {
  ...mockJobData,
  auditLog: [
    {
      id: 'audit-1',
      jobId: TEST_JOB_ID,
      transactionHash: '0xabc123',
      action: 'added' as const,
      beforeSnapshot: null,
      afterSnapshot: { txHash: '0xabc123' },
      discrepancyFields: null,
      errorMessage: null,
      createdAt: new Date('2024-01-15T10:01:00Z'),
    },
  ],
};

async function createTestApp() {
  const app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Register error handler
  await app.register(errorHandlerPlugin);

  // Mock db decorator (required by handlers)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.decorate('db', {} as any);

  // Mock repositories decorator
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.decorate('repositories', {
    reconciliation: {},
    transactions: {},
  } as any);

  // Register routes
  app.post(
    '/addresses/:address/chains/:chain/reconcile',
    {
      schema: {
        params: initiateReconciliationPathSchema,
        body: initiateReconciliationBodySchema,
      },
    },
    initiateReconciliation
  );

  app.get(
    '/reconciliation-jobs/:jobId',
    {
      schema: {
        params: getJobPathSchema,
      },
    },
    getJob
  );

  app.get(
    '/addresses/:address/chains/:chain/reconciliation-jobs',
    {
      schema: {
        params: listJobsPathSchema,
        querystring: listJobsQuerySchema,
      },
    },
    listJobs
  );

  await app.ready();

  return app;
}

describe('Reconciliation Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /addresses/:address/chains/:chain/reconcile', () => {
    it('returns 202 with job details when reconciliation is initiated', async () => {
      const app = await createTestApp();

      mockCreateJob.mockResolvedValueOnce(mockJobData);

      const response = await app.inject({
        method: 'POST',
        url: `/addresses/${TEST_ADDRESS}/chains/${TEST_CHAIN}/reconcile`,
        payload: {},
      });

      expect(response.statusCode).toBe(202);
      const data = response.json();
      expect(data).toHaveProperty('jobId', TEST_JOB_ID);
      expect(data).toHaveProperty('status', 'pending');
      expect(data).toHaveProperty('mode', 'partial');
      expect(data).toHaveProperty('fromBlock', null);
      expect(data).toHaveProperty('toBlock', null);
      expect(data).toHaveProperty('address', TEST_ADDRESS);
      expect(data).toHaveProperty('chain', 'ethereum');
      expect(data).toHaveProperty('createdAt');
    });

    it('accepts mode and block range parameters', async () => {
      const app = await createTestApp();

      const jobWithBlocks = {
        ...mockJobData,
        mode: 'full' as const,
        fromBlock: 1000000,
        toBlock: 2000000,
      };
      mockCreateJob.mockResolvedValueOnce(jobWithBlocks);

      const response = await app.inject({
        method: 'POST',
        url: `/addresses/${TEST_ADDRESS}/chains/${TEST_CHAIN}/reconcile`,
        payload: {
          mode: 'full',
          fromBlock: 1000000,
          toBlock: 2000000,
        },
      });

      expect(response.statusCode).toBe(202);
      const data = response.json();
      expect(data).toHaveProperty('mode', 'full');
      expect(data).toHaveProperty('fromBlock', 1000000);
      expect(data).toHaveProperty('toBlock', 2000000);

      expect(mockCreateJob).toHaveBeenCalledWith({
        address: TEST_ADDRESS,
        chain: TEST_CHAIN,
        mode: 'full',
        fromBlock: 1000000,
        toBlock: 2000000,
        fromTimestamp: undefined,
        toTimestamp: undefined,
      });
    });

    it('accepts optional fromTimestamp and toTimestamp in request body', async () => {
      const app = await createTestApp();

      mockCreateJob.mockResolvedValueOnce(mockJobData);

      const fromTimestamp = 1704067200; // 2024-01-01 00:00:00
      const toTimestamp = 1704153600; // 2024-01-02 00:00:00

      const response = await app.inject({
        method: 'POST',
        url: `/addresses/${TEST_ADDRESS}/chains/${TEST_CHAIN}/reconcile`,
        payload: { fromTimestamp, toTimestamp },
      });

      expect(response.statusCode).toBe(202);
      expect(mockCreateJob).toHaveBeenCalledWith({
        address: TEST_ADDRESS,
        chain: TEST_CHAIN,
        mode: 'partial', // default mode when not specified
        fromBlock: undefined,
        toBlock: undefined,
        fromTimestamp: new Date(fromTimestamp * 1000),
        toTimestamp: new Date(toTimestamp * 1000),
      });
    });

    it('returns 400 when address is empty', async () => {
      const app = await createTestApp();

      const response = await app.inject({
        method: 'POST',
        url: '/addresses//chains/ethereum/reconcile',
        payload: {},
      });

      // Zod validation fails for empty address (min(1))
      expect(response.statusCode).toBe(400);
    });

    it('returns 400 when chain is empty', async () => {
      const app = await createTestApp();

      const response = await app.inject({
        method: 'POST',
        url: `/addresses/${TEST_ADDRESS}/chains//reconcile`,
        payload: {},
      });

      // Zod validation fails for empty chain (min(1))
      expect(response.statusCode).toBe(400);
    });

    it('returns 500 when service throws an error', async () => {
      const app = await createTestApp();

      mockCreateJob.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await app.inject({
        method: 'POST',
        url: `/addresses/${TEST_ADDRESS}/chains/${TEST_CHAIN}/reconcile`,
        payload: {},
      });

      expect(response.statusCode).toBe(500);
    });
  });

  describe('GET /reconciliation-jobs/:jobId', () => {
    it('returns job details with audit log', async () => {
      const app = await createTestApp();

      mockGetJob.mockResolvedValueOnce(mockJobWithAuditLog);

      const response = await app.inject({
        method: 'GET',
        url: `/reconciliation-jobs/${TEST_JOB_ID}`,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data).toHaveProperty('jobId', TEST_JOB_ID);
      expect(data).toHaveProperty('status', 'pending');
      expect(data).toHaveProperty('mode', 'partial');
      expect(data).toHaveProperty('fromBlock', null);
      expect(data).toHaveProperty('toBlock', null);
      expect(data).toHaveProperty('finalBlock', null);
      expect(data).toHaveProperty('address', TEST_ADDRESS);
      expect(data).toHaveProperty('chain', 'ethereum');
      expect(data).toHaveProperty('provider', 'noves');
      expect(data).toHaveProperty('summary');
      expect(data.summary).toEqual({
        transactionsProcessed: 0,
        transactionsAdded: 0,
        transactionsSoftDeleted: 0,
        discrepanciesFlagged: 0,
        errors: 0,
      });
      expect(data).toHaveProperty('timing');
      expect(data.timing).toHaveProperty('createdAt');
      expect(data.timing).toHaveProperty('startedAt');
      expect(data.timing).toHaveProperty('completedAt');
      expect(data.timing).toHaveProperty('durationMs');
      expect(data).toHaveProperty('auditLog');
      expect(Array.isArray(data.auditLog)).toBe(true);
      expect(data.auditLog).toHaveLength(1);
      expect(data.auditLog[0]).toHaveProperty('action', 'added');
    });

    it('returns 404 when job is not found', async () => {
      const app = await createTestApp();

      mockGetJob.mockResolvedValueOnce(null);

      const response = await app.inject({
        method: 'GET',
        url: `/reconciliation-jobs/${TEST_JOB_ID}`,
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns 400 when jobId is not a valid UUID', async () => {
      const app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: '/reconciliation-jobs/invalid-uuid',
      });

      expect(response.statusCode).toBe(400);
    });

    it('calculates durationMs when job is completed', async () => {
      const app = await createTestApp();

      const completedJob = {
        ...mockJobWithAuditLog,
        status: 'completed' as const,
        startedAt: new Date('2024-01-15T10:00:00Z'),
        completedAt: new Date('2024-01-15T10:05:00Z'),
      };

      mockGetJob.mockResolvedValueOnce(completedJob);

      const response = await app.inject({
        method: 'GET',
        url: `/reconciliation-jobs/${TEST_JOB_ID}`,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      // 5 minutes = 300000 ms
      expect(data.timing.durationMs).toBe(300000);
    });
  });

  describe('GET /addresses/:address/chains/:chain/reconciliation-jobs', () => {
    it('returns paginated list of jobs', async () => {
      const app = await createTestApp();

      const jobSummaries = [
        {
          jobId: TEST_JOB_ID,
          status: 'pending' as const,
          address: TEST_ADDRESS,
          chain: 'ethereum',
          createdAt: new Date('2024-01-15T10:00:00Z'),
        },
        {
          jobId: '223e4567-e89b-12d3-a456-426614174001',
          status: 'completed' as const,
          address: TEST_ADDRESS,
          chain: 'ethereum',
          createdAt: new Date('2024-01-14T10:00:00Z'),
        },
      ];

      mockListJobs.mockResolvedValueOnce({
        data: jobSummaries,
        total: 2,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/addresses/${TEST_ADDRESS}/chains/${TEST_CHAIN}/reconciliation-jobs`,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0]).toHaveProperty('jobId', TEST_JOB_ID);
      expect(data.data[0]).toHaveProperty('status', 'pending');
      expect(data.pagination).toEqual({
        total: 2,
        limit: 50,
        offset: 0,
        hasMore: false,
      });
    });

    it('returns empty array when no jobs exist', async () => {
      const app = await createTestApp();

      mockListJobs.mockResolvedValueOnce({
        data: [],
        total: 0,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/addresses/${TEST_ADDRESS}/chains/${TEST_CHAIN}/reconciliation-jobs`,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.data).toHaveLength(0);
      expect(data.pagination.total).toBe(0);
      expect(data.pagination.hasMore).toBe(false);
    });

    it('respects limit query parameter', async () => {
      const app = await createTestApp();

      mockListJobs.mockResolvedValueOnce({
        data: [],
        total: 0,
      });

      await app.inject({
        method: 'GET',
        url: `/addresses/${TEST_ADDRESS}/chains/${TEST_CHAIN}/reconciliation-jobs?limit=10`,
      });

      expect(mockListJobs).toHaveBeenCalledWith(TEST_ADDRESS, TEST_CHAIN, {
        limit: 10,
        offset: 0,
      });
    });

    it('respects offset query parameter', async () => {
      const app = await createTestApp();

      mockListJobs.mockResolvedValueOnce({
        data: [],
        total: 0,
      });

      await app.inject({
        method: 'GET',
        url: `/addresses/${TEST_ADDRESS}/chains/${TEST_CHAIN}/reconciliation-jobs?offset=20`,
      });

      expect(mockListJobs).toHaveBeenCalledWith(TEST_ADDRESS, TEST_CHAIN, {
        limit: 50,
        offset: 20,
      });
    });

    it('uses default limit of 50 and offset of 0', async () => {
      const app = await createTestApp();

      mockListJobs.mockResolvedValueOnce({
        data: [],
        total: 0,
      });

      await app.inject({
        method: 'GET',
        url: `/addresses/${TEST_ADDRESS}/chains/${TEST_CHAIN}/reconciliation-jobs`,
      });

      expect(mockListJobs).toHaveBeenCalledWith(TEST_ADDRESS, TEST_CHAIN, {
        limit: 50,
        offset: 0,
      });
    });

    it('returns 400 when limit exceeds 100', async () => {
      const app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: `/addresses/${TEST_ADDRESS}/chains/${TEST_CHAIN}/reconciliation-jobs?limit=150`,
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 when limit is less than 1', async () => {
      const app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: `/addresses/${TEST_ADDRESS}/chains/${TEST_CHAIN}/reconciliation-jobs?limit=0`,
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 when offset is negative', async () => {
      const app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: `/addresses/${TEST_ADDRESS}/chains/${TEST_CHAIN}/reconciliation-jobs?offset=-1`,
      });

      expect(response.statusCode).toBe(400);
    });

    it('calculates hasMore correctly', async () => {
      const app = await createTestApp();

      // Mock 100 total items, returning first 50
      mockListJobs.mockResolvedValueOnce({
        data: Array(50).fill({
          jobId: TEST_JOB_ID,
          status: 'pending' as const,
          address: TEST_ADDRESS,
          chain: 'ethereum',
          createdAt: new Date('2024-01-15T10:00:00Z'),
        }),
        total: 100,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/addresses/${TEST_ADDRESS}/chains/${TEST_CHAIN}/reconciliation-jobs`,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.pagination.hasMore).toBe(true);
    });
  });
});
