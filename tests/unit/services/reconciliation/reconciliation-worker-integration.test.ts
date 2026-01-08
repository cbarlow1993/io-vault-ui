import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Setup mocks that will be hoisted - use vi.hoisted for values
const mockProcess = vi.hoisted(() => vi.fn());
const mockProviderFetchTransactions = vi.hoisted(() => vi.fn());

// Mock rate limiting config first - must be hoisted before other mocks
const mockRateLimitConfig = vi.hoisted(() => ({
  RECONCILIATION_RATE_LIMIT: {
    tokensPerInterval: 1000000, // Essentially disable rate limiting in tests
    interval: 'second' as const,
  },
  CHAIN_REORG_THRESHOLDS: {},
  getReorgThreshold: () => 32,
}));

vi.mock('@/src/services/reconciliation/config.js', () => mockRateLimitConfig);

vi.mock('@/src/services/transaction-processor/index.js', () => ({
  TransactionProcessor: vi.fn().mockImplementation(() => ({
    process: mockProcess,
  })),
}));

vi.mock('@/src/services/reconciliation/providers/registry.js', () => ({
  getProviderForChainAlias: vi.fn().mockReturnValue({
    fetchTransactions: mockProviderFetchTransactions,
  }),
}));

// Import after mocking
import { ReconciliationWorker } from '@/src/services/reconciliation/reconciliation-worker.js';

// Re-use existing mocks from reconciliation-worker.test.ts pattern
const mockJobRepository = {
  claimNextPendingJob: vi.fn(),
  update: vi.fn(),
  addAuditEntry: vi.fn(),
};

const mockTransactionRepository = {
  findByChainAliasAndAddress: vi.fn(),
};

describe('ReconciliationWorker with TransactionProcessor', () => {
  let worker: ReconciliationWorker;

  beforeEach(() => {
    vi.clearAllMocks();

    worker = new ReconciliationWorker({
      jobRepository: mockJobRepository as any,
      transactionRepository: mockTransactionRepository as any,
      transactionProcessor: { process: mockProcess } as any,
    });

    mockTransactionRepository.findByChainAliasAndAddress.mockResolvedValue({
      data: [],
      hasMore: false,
    });
  });

  it('uses TransactionProcessor when processing new transactions', async () => {
    const job = {
      id: 'job-1',
      address: '0xaddress',
      chainAlias: 'eth' as ChainAlias,
      provider: 'noves',
      status: 'running' as const,
      processedCount: 0,
      transactionsAdded: 0,
      transactionsSoftDeleted: 0,
      discrepanciesFlagged: 0,
      errorsCount: 0,
      lastProcessedCursor: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: null,
      completedAt: null,
      fromTimestamp: null,
      toTimestamp: null,
      mode: 'full' as const,
      fromBlock: null,
      toBlock: null,
      finalBlock: null,
      novesJobId: null,
      novesNextPageUrl: null,
      novesJobStartedAt: null,
    };

    mockProviderFetchTransactions.mockImplementation(async function* () {
      yield {
        transactionHash: '0xnewtx',
        chainAlias: 'eth' as ChainAlias,
        timestamp: new Date(),
        cursor: 'cursor1',
        rawData: {},
        normalized: {
          fromAddress: '0xsender',
          toAddress: '0xrecipient',
          blockNumber: '12345',
          fee: '21000',
        },
      };
    });

    mockProcess.mockResolvedValue({
      transactionId: 'tx-123',
      classificationType: 'transfer',
      tokensDiscovered: 1,
      tokensUpserted: 1,
    });

    await worker.processJob(job);

    expect(mockProcess).toHaveBeenCalledWith('eth' as ChainAlias, '0xnewtx', '0xaddress');
    expect(mockJobRepository.addAuditEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: 'job-1',
        transactionHash: '0xnewtx',
        action: 'added',
      })
    );
  });

  it('continues processing when TransactionProcessor throws an error', async () => {
    const job = {
      id: 'job-2',
      address: '0xaddress',
      chainAlias: 'eth' as ChainAlias,
      provider: 'noves',
      status: 'running' as const,
      processedCount: 0,
      transactionsAdded: 0,
      transactionsSoftDeleted: 0,
      discrepanciesFlagged: 0,
      errorsCount: 0,
      lastProcessedCursor: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: null,
      completedAt: null,
      fromTimestamp: null,
      toTimestamp: null,
      mode: 'full' as const,
      fromBlock: null,
      toBlock: null,
      finalBlock: null,
      novesJobId: null,
      novesNextPageUrl: null,
      novesJobStartedAt: null,
    };

    mockProviderFetchTransactions.mockImplementation(async function* () {
      yield {
        transactionHash: '0xfailingtx',
        chainAlias: 'eth' as ChainAlias,
        timestamp: new Date(),
        cursor: 'cursor1',
        rawData: {},
        normalized: {
          fromAddress: '0xsender',
          toAddress: '0xrecipient',
          blockNumber: '12345',
          fee: '21000',
        },
      };
    });

    mockProcess.mockRejectedValue(new Error('Processing failed'));

    await worker.processJob(job);

    // Should still add audit entry even when processor fails
    expect(mockJobRepository.addAuditEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: 'job-2',
        transactionHash: '0xfailingtx',
        action: 'added',
      })
    );

    // Job should complete successfully
    expect(mockJobRepository.update).toHaveBeenCalledWith(
      'job-2',
      expect.objectContaining({
        status: 'completed',
        transactionsAdded: 1,
      })
    );
  });

  it('works without TransactionProcessor (backward compatibility)', async () => {
    // Create worker without transactionProcessor
    const workerWithoutProcessor = new ReconciliationWorker({
      jobRepository: mockJobRepository as any,
      transactionRepository: mockTransactionRepository as any,
    });

    const job = {
      id: 'job-3',
      address: '0xaddress',
      chainAlias: 'eth' as ChainAlias,
      provider: 'noves',
      status: 'running' as const,
      processedCount: 0,
      transactionsAdded: 0,
      transactionsSoftDeleted: 0,
      discrepanciesFlagged: 0,
      errorsCount: 0,
      lastProcessedCursor: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: null,
      completedAt: null,
      fromTimestamp: null,
      toTimestamp: null,
      mode: 'full' as const,
      fromBlock: null,
      toBlock: null,
      finalBlock: null,
      novesJobId: null,
      novesNextPageUrl: null,
      novesJobStartedAt: null,
    };

    mockProviderFetchTransactions.mockImplementation(async function* () {
      yield {
        transactionHash: '0xnewtx',
        chainAlias: 'eth' as ChainAlias,
        timestamp: new Date(),
        cursor: 'cursor1',
        rawData: {},
        normalized: {
          fromAddress: '0xsender',
          toAddress: '0xrecipient',
          blockNumber: '12345',
          fee: '21000',
        },
      };
    });

    await workerWithoutProcessor.processJob(job);

    // TransactionProcessor should not be called
    expect(mockProcess).not.toHaveBeenCalled();

    // But audit entry should still be created
    expect(mockJobRepository.addAuditEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: 'job-3',
        transactionHash: '0xnewtx',
        action: 'added',
      })
    );
  });
});
