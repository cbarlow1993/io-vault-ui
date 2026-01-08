import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
  ReconciliationJobRepository,
  TransactionRepository,
  ReconciliationJob,
  Transaction,
} from '@/src/repositories/types.js';
import type { ProviderTransaction, TransactionProvider } from '@/src/services/reconciliation/providers/types.js';

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

// Mock config with async jobs disabled - existing tests use sync flow
const mockConfig = vi.hoisted(() => ({
  config: {
    apis: {
      noves: {
        asyncJobs: {
          enabled: false,
          timeoutHours: 4,
        },
      },
    },
    reconciliation: {
      maxConcurrentJobs: 1,
    },
  },
}));

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

function createMockTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    chainAlias: 'eth' as ChainAlias,
    txHash: '0xabc123',
    blockNumber: '12345678',
    blockHash: '0xblockhash',
    txIndex: 0,
    fromAddress: '0xfrom',
    toAddress: '0xto',
    value: '1000000000000000000',
    fee: '21000000000000',
    status: 'success',
    timestamp: new Date('2024-01-15T10:00:00.000Z'),
    classificationType: null,
    classificationLabel: null,
    createdAt: new Date('2024-01-15T10:00:00.000Z'),
    updatedAt: new Date('2024-01-15T10:00:00.000Z'),
    ...overrides,
  };
}

function createMockProviderTransaction(overrides: Partial<ProviderTransaction> = {}): ProviderTransaction {
  return {
    transactionHash: '0xabc123',
    chainAlias: 'eth' as ChainAlias,
    timestamp: new Date('2024-01-15T10:00:00.000Z'),
    cursor: 'cursor-1',
    rawData: { txHash: '0xabc123' },
    normalized: {
      fromAddress: '0xfrom',
      toAddress: '0xto',
      blockNumber: '12345678',
      fee: '21000000000000',
    },
    ...overrides,
  };
}

function createMockProvider(
  transactions: ProviderTransaction[] = []
): TransactionProvider {
  async function* mockFetchTransactions(): AsyncGenerator<ProviderTransaction> {
    for (const tx of transactions) {
      yield tx;
    }
  }

  return {
    name: 'noves',
    supportedChainAliases: ['eth' as ChainAlias],
    fetchTransactions: vi.fn().mockImplementation(mockFetchTransactions),
    healthCheck: vi.fn().mockResolvedValue(true),
  };
}

describe('ReconciliationWorker', () => {
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('processJob', () => {
    it('should mark job as completed when processing succeeds with no transactions', async () => {
      const mockJob = createMockJob();
      const mockProvider = createMockProvider([]);

      vi.mocked(providerRegistry.getProviderForChainAlias).mockReturnValue(mockProvider);
      vi.mocked(transactionRepository.findByChainAliasAndAddress).mockResolvedValue({
        data: [],
        hasMore: false,
      });
      vi.mocked(jobRepository.update).mockResolvedValue(createMockJob({ status: 'completed' }));

      await worker.processJob(mockJob);

      expect(jobRepository.update).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          status: 'completed',
          completedAt: expect.any(Date),
          processedCount: 0,
          transactionsAdded: 0,
          transactionsSoftDeleted: 0,
          discrepanciesFlagged: 0,
        })
      );
    });

    it('should log added transaction when provider has tx not in local', async () => {
      const mockJob = createMockJob();
      const providerTx = createMockProviderTransaction({
        transactionHash: '0xnewtx',
        cursor: 'cursor-new',
      });
      const mockProvider = createMockProvider([providerTx]);

      vi.mocked(providerRegistry.getProviderForChainAlias).mockReturnValue(mockProvider);
      vi.mocked(transactionRepository.findByChainAliasAndAddress).mockResolvedValue({
        data: [],
        hasMore: false,
      });
      vi.mocked(jobRepository.update).mockResolvedValue(createMockJob({ status: 'completed' }));
      vi.mocked(jobRepository.addAuditEntry).mockResolvedValue({
        id: 'audit-1',
        jobId: 'job-1',
        transactionHash: '0xnewtx',
        action: 'added',
        beforeSnapshot: null,
        afterSnapshot: providerTx.rawData,
        discrepancyFields: null,
        errorMessage: null,
        createdAt: new Date(),
      });

      await worker.processJob(mockJob);

      expect(jobRepository.addAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'job-1',
          transactionHash: '0xnewtx',
          action: 'added',
          afterSnapshot: expect.any(Object),
        })
      );

      expect(jobRepository.update).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          status: 'completed',
          transactionsAdded: 1,
        })
      );
    });

    it('should log soft_deleted when local has tx not in provider', async () => {
      const mockJob = createMockJob();
      const localTx = createMockTransaction({
        id: 'tx-orphan',
        txHash: '0xorphan',
      });
      const mockProvider = createMockProvider([]);

      vi.mocked(providerRegistry.getProviderForChainAlias).mockReturnValue(mockProvider);
      vi.mocked(transactionRepository.findByChainAliasAndAddress).mockResolvedValue({
        data: [localTx],
        hasMore: false,
      });
      vi.mocked(jobRepository.update).mockResolvedValue(createMockJob({ status: 'completed' }));
      vi.mocked(jobRepository.addAuditEntry).mockResolvedValue({
        id: 'audit-1',
        jobId: 'job-1',
        transactionHash: '0xorphan',
        action: 'soft_deleted',
        beforeSnapshot: expect.any(Object),
        afterSnapshot: null,
        discrepancyFields: null,
        errorMessage: null,
        createdAt: new Date(),
      });

      await worker.processJob(mockJob);

      expect(jobRepository.addAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'job-1',
          transactionHash: '0xorphan',
          action: 'soft_deleted',
          beforeSnapshot: expect.any(Object),
        })
      );

      expect(jobRepository.update).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          status: 'completed',
          transactionsSoftDeleted: 1,
        })
      );
    });

    it('should detect discrepancy when transaction data differs', async () => {
      const mockJob = createMockJob();
      const localTx = createMockTransaction({
        txHash: '0xabc123',
        blockNumber: '12345678',
      });
      const providerTx = createMockProviderTransaction({
        transactionHash: '0xabc123',
        normalized: {
          fromAddress: '0xfrom',
          toAddress: '0xto',
          blockNumber: '99999999', // Different block number
          fee: '21000000000000',
        },
      });
      const mockProvider = createMockProvider([providerTx]);

      vi.mocked(providerRegistry.getProviderForChainAlias).mockReturnValue(mockProvider);
      vi.mocked(transactionRepository.findByChainAliasAndAddress).mockResolvedValue({
        data: [localTx],
        hasMore: false,
      });
      vi.mocked(jobRepository.update).mockResolvedValue(createMockJob({ status: 'completed' }));
      vi.mocked(jobRepository.addAuditEntry).mockResolvedValue({
        id: 'audit-1',
        jobId: 'job-1',
        transactionHash: '0xabc123',
        action: 'discrepancy',
        beforeSnapshot: expect.any(Object),
        afterSnapshot: expect.any(Object),
        discrepancyFields: ['blockNumber'],
        errorMessage: null,
        createdAt: new Date(),
      });

      await worker.processJob(mockJob);

      expect(jobRepository.addAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'job-1',
          transactionHash: '0xabc123',
          action: 'discrepancy',
          discrepancyFields: expect.arrayContaining(['blockNumber']),
        })
      );

      expect(jobRepository.update).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          status: 'completed',
          discrepanciesFlagged: 1,
        })
      );
    });

    it('should save checkpoint periodically during processing', async () => {
      // Use real timers for this test to allow rate limiting to work properly
      vi.useRealTimers();

      const mockJob = createMockJob();
      // Create 150 transactions to trigger checkpoint at 100
      const providerTransactions: ProviderTransaction[] = [];
      for (let i = 0; i < 150; i++) {
        providerTransactions.push(
          createMockProviderTransaction({
            transactionHash: `0xtx${i}`,
            cursor: `cursor-${i}`,
          })
        );
      }
      const mockProvider = createMockProvider(providerTransactions);

      vi.mocked(providerRegistry.getProviderForChainAlias).mockReturnValue(mockProvider);
      vi.mocked(transactionRepository.findByChainAliasAndAddress).mockResolvedValue({
        data: [],
        hasMore: false,
      });
      vi.mocked(jobRepository.update).mockResolvedValue(createMockJob({ status: 'running' }));
      vi.mocked(jobRepository.addAuditEntry).mockResolvedValue({
        id: 'audit-1',
        jobId: 'job-1',
        transactionHash: '0x',
        action: 'added',
        beforeSnapshot: null,
        afterSnapshot: {},
        discrepancyFields: null,
        errorMessage: null,
        createdAt: new Date(),
      });

      await worker.processJob(mockJob);

      // Should have checkpoint call at 100, and final completion call
      const updateCalls = vi.mocked(jobRepository.update).mock.calls;
      expect(updateCalls.length).toBeGreaterThanOrEqual(2);

      // Verify checkpoint call at 100
      const checkpointCall = updateCalls.find(
        ([, data]) =>
          (data as Record<string, unknown>).processedCount === 100 &&
          (data as Record<string, unknown>).status === undefined
      );
      expect(checkpointCall).toBeDefined();
    });

    it('should mark job as failed when processing throws error', async () => {
      const mockJob = createMockJob();
      const mockProvider: TransactionProvider = {
        name: 'noves',
        supportedChainAliases: ['eth' as ChainAlias],
        fetchTransactions: vi.fn().mockImplementation(async function* () {
          throw new Error('Provider API error');
        }),
        healthCheck: vi.fn(),
      };

      vi.mocked(providerRegistry.getProviderForChainAlias).mockReturnValue(mockProvider);
      vi.mocked(transactionRepository.findByChainAliasAndAddress).mockResolvedValue({
        data: [],
        hasMore: false,
      });
      vi.mocked(jobRepository.update).mockResolvedValue(createMockJob({ status: 'failed' }));
      vi.mocked(jobRepository.addAuditEntry).mockResolvedValue({
        id: 'audit-1',
        jobId: 'job-1',
        transactionHash: 'N/A',
        action: 'error',
        beforeSnapshot: null,
        afterSnapshot: null,
        discrepancyFields: null,
        errorMessage: 'Provider API error',
        createdAt: new Date(),
      });

      await worker.processJob(mockJob);

      expect(jobRepository.update).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          status: 'failed',
          errorsCount: 1,
        })
      );

      expect(jobRepository.addAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'job-1',
          transactionHash: 'N/A',
          action: 'error',
          errorMessage: 'Provider API error',
        })
      );
    });

    it('should resume from lastProcessedCursor when job has one', async () => {
      const mockJob = createMockJob({
        lastProcessedCursor: 'previous-cursor',
        processedCount: 50,
      });
      const providerTx = createMockProviderTransaction({
        transactionHash: '0xnewtx',
        cursor: 'cursor-new',
      });
      const mockProvider = createMockProvider([providerTx]);

      vi.mocked(providerRegistry.getProviderForChainAlias).mockReturnValue(mockProvider);
      vi.mocked(transactionRepository.findByChainAliasAndAddress).mockResolvedValue({
        data: [],
        hasMore: false,
      });
      vi.mocked(jobRepository.update).mockResolvedValue(createMockJob({ status: 'completed' }));
      vi.mocked(jobRepository.addAuditEntry).mockResolvedValue({
        id: 'audit-1',
        jobId: 'job-1',
        transactionHash: '0xnewtx',
        action: 'added',
        beforeSnapshot: null,
        afterSnapshot: providerTx.rawData,
        discrepancyFields: null,
        errorMessage: null,
        createdAt: new Date(),
      });

      await worker.processJob(mockJob);

      expect(mockProvider.fetchTransactions).toHaveBeenCalledWith(
        '0x123',
        'eth',
        expect.objectContaining({
          cursor: 'previous-cursor',
        })
      );
    });

    it('should handle matching transactions without creating audit entries', async () => {
      const mockJob = createMockJob();
      const localTx = createMockTransaction({
        txHash: '0xabc123',
        fromAddress: '0xfrom',
        value: '1000000000000000000',
        status: 'success',
        blockNumber: '12345678',
        fee: '21000000000000',
      });
      const providerTx = createMockProviderTransaction({
        transactionHash: '0xabc123',
        normalized: {
          fromAddress: '0xfrom',
          toAddress: '0xto',
          blockNumber: '12345678',
          fee: '21000000000000',
        },
      });
      const mockProvider = createMockProvider([providerTx]);

      vi.mocked(providerRegistry.getProviderForChainAlias).mockReturnValue(mockProvider);
      vi.mocked(transactionRepository.findByChainAliasAndAddress).mockResolvedValue({
        data: [localTx],
        hasMore: false,
      });
      vi.mocked(jobRepository.update).mockResolvedValue(createMockJob({ status: 'completed' }));

      await worker.processJob(mockJob);

      // Should not have any audit entries for matching transactions
      expect(jobRepository.addAuditEntry).not.toHaveBeenCalled();

      expect(jobRepository.update).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          status: 'completed',
          transactionsAdded: 0,
          transactionsSoftDeleted: 0,
          discrepanciesFlagged: 0,
        })
      );
    });
  });

  describe('start/stop', () => {
    it('should poll for jobs when started', async () => {
      vi.mocked(jobRepository.claimNextPendingJob).mockResolvedValue(null);

      const startPromise = worker.start();

      // Let the first poll cycle complete
      await vi.advanceTimersByTimeAsync(100);

      expect(jobRepository.claimNextPendingJob).toHaveBeenCalled();

      // Stop the worker
      worker.stop();

      // Advance timers to let the loop exit
      await vi.advanceTimersByTimeAsync(5100);
      await startPromise;
    });

    it('should process claimed job when available', async () => {
      const mockJob = createMockJob();
      const mockProvider = createMockProvider([]);

      vi.mocked(jobRepository.claimNextPendingJob)
        .mockResolvedValueOnce(mockJob)
        .mockResolvedValue(null);
      vi.mocked(providerRegistry.getProviderForChainAlias).mockReturnValue(mockProvider);
      vi.mocked(transactionRepository.findByChainAliasAndAddress).mockResolvedValue({
        data: [],
        hasMore: false,
      });
      vi.mocked(jobRepository.update).mockResolvedValue(createMockJob({ status: 'completed' }));

      const startPromise = worker.start();

      // Let the first poll and processing complete
      await vi.advanceTimersByTimeAsync(100);

      expect(jobRepository.claimNextPendingJob).toHaveBeenCalled();
      expect(jobRepository.update).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          status: 'completed',
        })
      );

      // Stop the worker
      worker.stop();
      await vi.advanceTimersByTimeAsync(5100);
      await startPromise;
    });

    it('should wait pollIntervalMs between polls when no job is found', async () => {
      vi.mocked(jobRepository.claimNextPendingJob).mockResolvedValue(null);

      const startPromise = worker.start();

      // Wait for the first poll cycle to complete (it happens immediately)
      await vi.runOnlyPendingTimersAsync();
      const callsAfterFirstPoll = vi.mocked(jobRepository.claimNextPendingJob).mock.calls.length;
      expect(callsAfterFirstPoll).toBeGreaterThanOrEqual(1);

      // Clear the mock to track fresh calls
      vi.mocked(jobRepository.claimNextPendingJob).mockClear();

      // Advance partway through poll interval - should not poll yet
      await vi.advanceTimersByTimeAsync(4900);
      expect(jobRepository.claimNextPendingJob).toHaveBeenCalledTimes(0);

      // Complete the poll interval
      await vi.advanceTimersByTimeAsync(200);
      expect(jobRepository.claimNextPendingJob).toHaveBeenCalledTimes(1);

      worker.stop();
      await vi.advanceTimersByTimeAsync(5100);
      await startPromise;
    });

    it('should continue running when claimNextPendingJob throws error', async () => {
      // First call throws, second call succeeds with null
      vi.mocked(jobRepository.claimNextPendingJob)
        .mockRejectedValueOnce(new Error('Database connection lost'))
        .mockResolvedValue(null);

      const startPromise = worker.start();

      // Let the first poll cycle complete (with error)
      await vi.advanceTimersByTimeAsync(100);

      // Should have been called at least once
      expect(jobRepository.claimNextPendingJob).toHaveBeenCalled();

      // Advance past the sleep after error to trigger second poll
      await vi.advanceTimersByTimeAsync(5100);

      // Should have called again (worker recovered and continued)
      expect(vi.mocked(jobRepository.claimNextPendingJob).mock.calls.length).toBeGreaterThanOrEqual(2);

      worker.stop();
      await vi.advanceTimersByTimeAsync(5100);
      await startPromise;
    });

    it('should continue running when processJob throws error', async () => {
      const mockJob = createMockJob();

      // First claim returns job, processJob will throw via provider
      vi.mocked(jobRepository.claimNextPendingJob)
        .mockResolvedValueOnce(mockJob)
        .mockResolvedValue(null);
      vi.mocked(providerRegistry.getProviderForChainAlias).mockImplementation(() => {
        throw new Error('Provider initialization failed');
      });

      const startPromise = worker.start();

      // Let the first poll and failed processing complete
      await vi.advanceTimersByTimeAsync(100);

      expect(jobRepository.claimNextPendingJob).toHaveBeenCalled();

      // Advance past the sleep after error to trigger second poll
      await vi.advanceTimersByTimeAsync(5100);

      // Worker should still be running and claim again
      expect(vi.mocked(jobRepository.claimNextPendingJob).mock.calls.length).toBeGreaterThanOrEqual(2);

      worker.stop();
      await vi.advanceTimersByTimeAsync(5100);
      await startPromise;
    });
  });
});
