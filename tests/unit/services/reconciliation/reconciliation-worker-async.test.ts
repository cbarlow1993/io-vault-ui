import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
  ReconciliationJobRepository,
  TransactionRepository,
  ReconciliationJob,
} from '@/src/repositories/types.js';
import type { TransactionProvider } from '@/src/services/reconciliation/providers/types.js';

// Mock rate limiting config first - must be hoisted before other mocks
const mockRateLimitConfig = vi.hoisted(() => ({
  RECONCILIATION_RATE_LIMIT: {
    tokensPerInterval: 1000000, // Essentially disable rate limiting in tests
    interval: 'second' as const,
  },
  CHAIN_ALIAS_REORG_THRESHOLDS: {},
  getReorgThreshold: () => 32,
}));

vi.mock('@/src/services/reconciliation/config.js', () => mockRateLimitConfig);

// Mock config with async jobs settings - must be hoisted
const mockConfig = vi.hoisted(() => ({
  config: {
    apis: {
      noves: {
        asyncJobs: {
          enabled: true,
          timeoutHours: 4,
        },
      },
    },
    reconciliation: {
      maxConcurrentJobs: 1,
    },
  },
}));

// Mock both the @ alias and the relative path that the module might use
vi.mock('@/src/lib/config.js', () => mockConfig);

// Mock dependencies before importing the worker
vi.mock('@/src/services/reconciliation/providers/registry.js', () => ({
  getProviderForChainAlias: vi.fn(),
}));

// Import after mocking
import { ReconciliationWorker } from '@/src/services/reconciliation/reconciliation-worker.js';
import * as providerRegistry from '@/src/services/reconciliation/providers/registry.js';

function createMockJobRepository(): ReconciliationJobRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByAddressAndChainAlias: vi.fn(),
    update: vi.fn(),
    claimNextPendingJob: vi.fn(),
    findActiveJobByAddressAndChainAlias: vi.fn(),
    deleteJob: vi.fn(),
    resetStaleRunningJobs: vi.fn(),
    addAuditEntry: vi.fn(),
    getAuditLog: vi.fn(),
  };
}

function createMockTransactionRepository(): TransactionRepository {
  return {
    findById: vi.fn(),
    findByTxHash: vi.fn(),
    findByAddress: vi.fn(),
    findByChainAliasAndAddress: vi.fn(),
    findNativeTransfersByTxIds: vi.fn(),
    findTokenTransfersByTxIds: vi.fn(),
    findTokenTransfersWithMetadataByTxIds: vi.fn(),
  };
}

function createMockJob(overrides: Partial<ReconciliationJob> = {}): ReconciliationJob {
  return {
    id: 'job-1',
    address: '0x123',
    chainAlias: 'eth' as ChainAlias,
    status: 'pending',
    provider: 'noves',
    fromTimestamp: null,
    toTimestamp: null,
    lastProcessedCursor: null,
    processedCount: 0,
    transactionsAdded: 0,
    transactionsSoftDeleted: 0,
    discrepanciesFlagged: 0,
    errorsCount: 0,
    createdAt: new Date('2024-01-15T10:00:00.000Z'),
    updatedAt: new Date('2024-01-15T10:00:00.000Z'),
    startedAt: null,
    completedAt: null,
    mode: 'full',
    fromBlock: null,
    toBlock: null,
    finalBlock: null,
    novesJobId: null,
    novesNextPageUrl: null,
    novesJobStartedAt: null,
    ...overrides,
  };
}

interface MockProviderWithAsync extends TransactionProvider {
  supportsAsyncJobs: (chainAlias: ChainAlias) => boolean;
  startAsyncJob: (
    chainAlias: ChainAlias,
    address: string,
    options?: { startBlock?: number; endBlock?: number }
  ) => Promise<{ jobId: string; nextPageUrl: string }>;
  fetchAsyncJobResults: (nextPageUrl: string) => Promise<{
    transactions: unknown[];
    nextPageUrl?: string;
    isReady: boolean;
    isComplete: boolean;
  }>;
}

function createMockAsyncProvider(options: {
  supportsAsync?: boolean;
  startAsyncJobResult?: { jobId: string; nextPageUrl: string };
  fetchAsyncJobResult?: {
    transactions: unknown[];
    nextPageUrl?: string;
    isReady: boolean;
    isComplete: boolean;
  };
} = {}): MockProviderWithAsync {
  const {
    supportsAsync = true,
    startAsyncJobResult = { jobId: 'noves-job-123', nextPageUrl: 'https://noves.fi/results?jobId=noves-job-123' },
    fetchAsyncJobResult = { transactions: [], isReady: true, isComplete: true },
  } = options;

  async function* mockFetchTransactions(): AsyncGenerator<never> {
    // Empty generator for sync mode
  }

  return {
    name: 'noves',
    supportedChainAliases: ['eth' as ChainAlias, 'ripple' as ChainAlias],
    fetchTransactions: vi.fn().mockImplementation(mockFetchTransactions),
    healthCheck: vi.fn().mockResolvedValue(true),
    supportsAsyncJobs: vi.fn().mockReturnValue(supportsAsync),
    startAsyncJob: vi.fn().mockResolvedValue(startAsyncJobResult),
    fetchAsyncJobResults: vi.fn().mockResolvedValue(fetchAsyncJobResult),
  };
}

describe('ReconciliationWorker - Async Job Flow', () => {
  let jobRepository: ReturnType<typeof createMockJobRepository>;
  let transactionRepository: ReturnType<typeof createMockTransactionRepository>;
  let worker: ReconciliationWorker;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    jobRepository = createMockJobRepository();
    transactionRepository = createMockTransactionRepository();

    worker = new ReconciliationWorker({
      jobRepository,
      transactionRepository,
    });

    // Reset config to enabled state
    mockConfig.config.apis.noves.asyncJobs.enabled = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('starts Noves job and saves jobId when no existing jobId', () => {
    it('should start a new Noves async job when no novesJobId exists', async () => {
      const mockJob = createMockJob({
        chainAlias: 'eth',
        fromBlock: 100,
        novesJobId: null,
        novesNextPageUrl: null,
        novesJobStartedAt: null,
      });

      const mockProvider = createMockAsyncProvider({
        supportsAsync: true,
        startAsyncJobResult: {
          jobId: 'noves-job-456',
          nextPageUrl: 'https://noves.fi/results?jobId=noves-job-456&page=0',
        },
      });

      vi.mocked(providerRegistry.getProviderForChainAlias).mockReturnValue(mockProvider);
      vi.mocked(jobRepository.update).mockResolvedValue(createMockJob({
        novesJobId: 'noves-job-456',
      }));

      await worker.processJob(mockJob);

      // Should call startAsyncJob with correct params
      expect(mockProvider.startAsyncJob).toHaveBeenCalledWith(
        'eth',
        '0x123',
        { startBlock: 100 }
      );

      // Should update job with Noves job info
      expect(jobRepository.update).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          novesJobId: 'noves-job-456',
          novesNextPageUrl: 'https://noves.fi/results?jobId=noves-job-456&page=0',
          novesJobStartedAt: expect.any(Date),
        })
      );

      // Should NOT call fetchAsyncJobResults yet (will continue on next poll)
      expect(mockProvider.fetchAsyncJobResults).not.toHaveBeenCalled();
    });
  });

  describe('skips processing when Noves job returns 425 (not ready)', () => {
    it('should skip processing and return when job is not ready', async () => {
      const mockJob = createMockJob({
        chainAlias: 'eth',
        novesJobId: 'noves-job-789',
        novesNextPageUrl: 'https://noves.fi/results?jobId=noves-job-789&page=0',
        novesJobStartedAt: new Date(),
      });

      const mockProvider = createMockAsyncProvider({
        supportsAsync: true,
        fetchAsyncJobResult: {
          transactions: [],
          nextPageUrl: 'https://noves.fi/results?jobId=noves-job-789&page=0',
          isReady: false,
          isComplete: false,
        },
      });

      vi.mocked(providerRegistry.getProviderForChainAlias).mockReturnValue(mockProvider);

      await worker.processJob(mockJob);

      // Should call fetchAsyncJobResults
      expect(mockProvider.fetchAsyncJobResults).toHaveBeenCalledWith(
        'https://noves.fi/results?jobId=noves-job-789&page=0'
      );

      // Should NOT update job status (skip processing)
      expect(jobRepository.update).not.toHaveBeenCalled();

      // Should NOT start a new job
      expect(mockProvider.startAsyncJob).not.toHaveBeenCalled();
    });
  });

  describe('processes transactions when Noves job is ready', () => {
    it('should process transactions and complete job when ready and complete', async () => {
      const mockJob = createMockJob({
        chainAlias: 'eth',
        novesJobId: 'noves-job-ready',
        novesNextPageUrl: 'https://noves.fi/results?jobId=noves-job-ready&page=0',
        novesJobStartedAt: new Date(),
      });

      const mockTransactions = [
        { rawTransactionData: { transactionHash: '0xabc', fromAddress: '0xfrom', toAddress: '0xto', blockNumber: 100 } },
        { rawTransactionData: { transactionHash: '0xdef', fromAddress: '0xfrom', toAddress: '0xto', blockNumber: 101 } },
      ];

      const mockProvider = createMockAsyncProvider({
        supportsAsync: true,
        fetchAsyncJobResult: {
          transactions: mockTransactions,
          isReady: true,
          isComplete: true,
        },
      });

      vi.mocked(providerRegistry.getProviderForChainAlias).mockReturnValue(mockProvider);
      vi.mocked(transactionRepository.findByChainAliasAndAddress).mockResolvedValue({
        data: [],
        hasMore: false,
      });
      vi.mocked(jobRepository.update).mockResolvedValue(createMockJob({ status: 'completed' }));
      vi.mocked(jobRepository.addAuditEntry).mockResolvedValue({
        id: 'audit-1',
        jobId: 'job-1',
        transactionHash: '0xabc',
        action: 'added',
        beforeSnapshot: null,
        afterSnapshot: {},
        discrepancyFields: null,
        errorMessage: null,
        createdAt: new Date(),
      });

      await worker.processJob(mockJob);

      // Should fetch results
      expect(mockProvider.fetchAsyncJobResults).toHaveBeenCalledWith(
        'https://noves.fi/results?jobId=noves-job-ready&page=0'
      );

      // Should mark job as completed
      expect(jobRepository.update).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          status: 'completed',
          completedAt: expect.any(Date),
        })
      );
    });

    it('should update nextPageUrl and continue when job is ready but not complete', async () => {
      const mockJob = createMockJob({
        chainAlias: 'eth',
        novesJobId: 'noves-job-paginated',
        novesNextPageUrl: 'https://noves.fi/results?jobId=noves-job-paginated&page=0',
        novesJobStartedAt: new Date(),
      });

      const mockTransactions = [
        { rawTransactionData: { transactionHash: '0xabc', fromAddress: '0xfrom', toAddress: '0xto', blockNumber: 100 } },
      ];

      const mockProvider = createMockAsyncProvider({
        supportsAsync: true,
        fetchAsyncJobResult: {
          transactions: mockTransactions,
          nextPageUrl: 'https://noves.fi/results?jobId=noves-job-paginated&page=1',
          isReady: true,
          isComplete: false,
        },
      });

      vi.mocked(providerRegistry.getProviderForChainAlias).mockReturnValue(mockProvider);
      vi.mocked(transactionRepository.findByChainAliasAndAddress).mockResolvedValue({
        data: [],
        hasMore: false,
      });
      vi.mocked(jobRepository.update).mockResolvedValue(createMockJob());
      vi.mocked(jobRepository.addAuditEntry).mockResolvedValue({
        id: 'audit-1',
        jobId: 'job-1',
        transactionHash: '0xabc',
        action: 'added',
        beforeSnapshot: null,
        afterSnapshot: {},
        discrepancyFields: null,
        errorMessage: null,
        createdAt: new Date(),
      });

      await worker.processJob(mockJob);

      // Should update with next page URL (not mark as completed)
      expect(jobRepository.update).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          novesNextPageUrl: 'https://noves.fi/results?jobId=noves-job-paginated&page=1',
        })
      );

      // Should NOT mark as completed
      const updateCalls = vi.mocked(jobRepository.update).mock.calls;
      const completedCall = updateCalls.find(
        ([, data]) => (data as Record<string, unknown>).status === 'completed'
      );
      expect(completedCall).toBeUndefined();
    });
  });

  describe('fails job when timeout exceeded', () => {
    it('should mark job as failed when Noves job has timed out', async () => {
      // Set timeout to 4 hours
      const fourHoursAgo = new Date(Date.now() - (4 * 60 * 60 * 1000 + 1000)); // 4 hours + 1 second ago

      const mockJob = createMockJob({
        chainAlias: 'eth',
        novesJobId: 'noves-job-timed-out',
        novesNextPageUrl: 'https://noves.fi/results?jobId=noves-job-timed-out&page=0',
        novesJobStartedAt: fourHoursAgo,
      });

      const mockProvider = createMockAsyncProvider({
        supportsAsync: true,
      });

      vi.mocked(providerRegistry.getProviderForChainAlias).mockReturnValue(mockProvider);
      vi.mocked(jobRepository.update).mockResolvedValue(createMockJob({ status: 'failed' }));

      await worker.processJob(mockJob);

      // Should mark job as failed and clear Noves metadata for potential retry
      expect(jobRepository.update).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          status: 'failed',
          completedAt: expect.any(Date),
          novesJobId: null,
          novesNextPageUrl: null,
          novesJobStartedAt: null,
        })
      );

      // Should NOT call fetchAsyncJobResults
      expect(mockProvider.fetchAsyncJobResults).not.toHaveBeenCalled();
    });

    it('should not timeout if job started recently', async () => {
      const recentlyStarted = new Date(Date.now() - (60 * 1000)); // 1 minute ago

      const mockJob = createMockJob({
        chainAlias: 'eth',
        novesJobId: 'noves-job-recent',
        novesNextPageUrl: 'https://noves.fi/results?jobId=noves-job-recent&page=0',
        novesJobStartedAt: recentlyStarted,
      });

      const mockProvider = createMockAsyncProvider({
        supportsAsync: true,
        fetchAsyncJobResult: {
          transactions: [],
          isReady: true,
          isComplete: true,
        },
      });

      vi.mocked(providerRegistry.getProviderForChainAlias).mockReturnValue(mockProvider);
      vi.mocked(transactionRepository.findByChainAliasAndAddress).mockResolvedValue({
        data: [],
        hasMore: false,
      });
      vi.mocked(jobRepository.update).mockResolvedValue(createMockJob({ status: 'completed' }));

      await worker.processJob(mockJob);

      // Should continue processing, not fail
      expect(mockProvider.fetchAsyncJobResults).toHaveBeenCalled();
      expect(jobRepository.update).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          status: 'completed',
        })
      );
    });
  });

  describe('fails job when nextPageUrl is missing', () => {
    it('should mark job as failed when novesJobId exists but nextPageUrl is null', async () => {
      const mockJob = createMockJob({
        chainAlias: 'eth',
        novesJobId: 'noves-job-missing-url',
        novesNextPageUrl: null, // Missing URL
        novesJobStartedAt: new Date(),
      });

      const mockProvider = createMockAsyncProvider({
        supportsAsync: true,
      });

      vi.mocked(providerRegistry.getProviderForChainAlias).mockReturnValue(mockProvider);
      vi.mocked(jobRepository.update).mockResolvedValue(createMockJob({ status: 'failed' }));

      await worker.processJob(mockJob);

      // Should mark job as failed and clear Noves metadata for potential retry
      expect(jobRepository.update).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          status: 'failed',
          completedAt: expect.any(Date),
          novesJobId: null,
          novesNextPageUrl: null,
          novesJobStartedAt: null,
        })
      );

      // Should NOT call fetchAsyncJobResults
      expect(mockProvider.fetchAsyncJobResults).not.toHaveBeenCalled();
    });
  });

  describe('handles errors in async flow', () => {
    it('should mark job as failed when fetchAsyncJobResults throws', async () => {
      const mockJob = createMockJob({
        chainAlias: 'eth',
        novesJobId: 'noves-job-error',
        novesNextPageUrl: 'https://noves.fi/results?jobId=noves-job-error&page=0',
        novesJobStartedAt: new Date(),
        errorsCount: 0,
      });

      const mockProvider = createMockAsyncProvider({
        supportsAsync: true,
      });
      // Make fetchAsyncJobResults throw an error
      vi.mocked(mockProvider.fetchAsyncJobResults).mockRejectedValue(new Error('Noves API error'));

      vi.mocked(providerRegistry.getProviderForChainAlias).mockReturnValue(mockProvider);
      vi.mocked(jobRepository.update).mockResolvedValue(createMockJob({ status: 'failed' }));
      vi.mocked(jobRepository.addAuditEntry).mockResolvedValue({
        id: 'audit-error',
        jobId: 'job-1',
        transactionHash: 'N/A',
        action: 'error',
        beforeSnapshot: null,
        afterSnapshot: null,
        discrepancyFields: null,
        errorMessage: 'Noves API error',
        createdAt: new Date(),
      });

      await worker.processJob(mockJob);

      // Should mark job as failed and clear Noves metadata
      expect(jobRepository.update).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          status: 'failed',
          completedAt: expect.any(Date),
          errorsCount: 1,
          novesJobId: null,
          novesNextPageUrl: null,
          novesJobStartedAt: null,
        })
      );

      // Should add error audit entry
      expect(jobRepository.addAuditEntry).toHaveBeenCalledWith({
        jobId: 'job-1',
        transactionHash: 'N/A',
        action: 'error',
        errorMessage: 'Noves API error',
      });
    });

    it('should mark job as failed when processProviderTransactions throws', async () => {
      const mockJob = createMockJob({
        chainAlias: 'eth',
        novesJobId: 'noves-job-process-error',
        novesNextPageUrl: 'https://noves.fi/results?jobId=noves-job-process-error&page=0',
        novesJobStartedAt: new Date(),
        errorsCount: 2, // Already had some errors
      });

      const mockProvider = createMockAsyncProvider({
        supportsAsync: true,
        fetchAsyncJobResult: {
          transactions: [
            { rawTransactionData: { transactionHash: '0xabc', fromAddress: '0xfrom', blockNumber: 100 } },
          ],
          isReady: true,
          isComplete: false,
        },
      });

      vi.mocked(providerRegistry.getProviderForChainAlias).mockReturnValue(mockProvider);
      // Make findByChainAliasAndAddress throw to simulate processProviderTransactions failure
      vi.mocked(transactionRepository.findByChainAliasAndAddress).mockRejectedValue(new Error('Database connection lost'));
      vi.mocked(jobRepository.update).mockResolvedValue(createMockJob({ status: 'failed' }));
      vi.mocked(jobRepository.addAuditEntry).mockResolvedValue({
        id: 'audit-error',
        jobId: 'job-1',
        transactionHash: 'N/A',
        action: 'error',
        beforeSnapshot: null,
        afterSnapshot: null,
        discrepancyFields: null,
        errorMessage: 'Database connection lost',
        createdAt: new Date(),
      });

      await worker.processJob(mockJob);

      // Should mark job as failed with incremented error count
      expect(jobRepository.update).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          status: 'failed',
          completedAt: expect.any(Date),
          errorsCount: 3, // Incremented from 2
          novesJobId: null,
          novesNextPageUrl: null,
          novesJobStartedAt: null,
        })
      );

      // Should add error audit entry
      expect(jobRepository.addAuditEntry).toHaveBeenCalledWith({
        jobId: 'job-1',
        transactionHash: 'N/A',
        action: 'error',
        errorMessage: 'Database connection lost',
      });
    });
  });

  describe('falls back to sync for XRPL (unsupported chain alias)', () => {
    it('should use sync flow when chain alias does not support async jobs', async () => {
      const mockJob = createMockJob({
        chainAlias: 'ripple',
        novesJobId: null,
      });

      const mockProvider = createMockAsyncProvider({
        supportsAsync: false,
      });

      vi.mocked(providerRegistry.getProviderForChainAlias).mockReturnValue(mockProvider);
      vi.mocked(transactionRepository.findByChainAliasAndAddress).mockResolvedValue({
        data: [],
        hasMore: false,
      });
      vi.mocked(jobRepository.update).mockResolvedValue(createMockJob({ status: 'completed' }));

      await worker.processJob(mockJob);

      // Should check if async is supported
      expect(mockProvider.supportsAsyncJobs).toHaveBeenCalledWith('ripple');

      // Should NOT call startAsyncJob
      expect(mockProvider.startAsyncJob).not.toHaveBeenCalled();

      // Should use sync flow (fetchTransactions)
      expect(mockProvider.fetchTransactions).toHaveBeenCalledWith(
        '0x123',
        'ripple',
        expect.any(Object)
      );

      // Should complete via sync flow
      expect(jobRepository.update).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          status: 'completed',
        })
      );
    });

    it('should use sync flow when async jobs are disabled in config', async () => {
      // Disable async jobs in config
      mockConfig.config.apis.noves.asyncJobs.enabled = false;

      const mockJob = createMockJob({
        chainAlias: 'eth',
        novesJobId: null,
      });

      const mockProvider = createMockAsyncProvider({
        supportsAsync: true,
      });

      vi.mocked(providerRegistry.getProviderForChainAlias).mockReturnValue(mockProvider);
      vi.mocked(transactionRepository.findByChainAliasAndAddress).mockResolvedValue({
        data: [],
        hasMore: false,
      });
      vi.mocked(jobRepository.update).mockResolvedValue(createMockJob({ status: 'completed' }));

      await worker.processJob(mockJob);

      // Should NOT call startAsyncJob (async disabled)
      expect(mockProvider.startAsyncJob).not.toHaveBeenCalled();

      // Should use sync flow
      expect(mockProvider.fetchTransactions).toHaveBeenCalled();
    });
  });
});
