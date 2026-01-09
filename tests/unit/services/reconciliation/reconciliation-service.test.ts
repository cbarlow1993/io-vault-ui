import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
  ReconciliationJobRepository,
  TransactionRepository,
  AddressRepository,
  ReconciliationJob,
  ReconciliationAuditEntry,
} from '@/src/repositories/types.js';

// Mock dependencies before importing the service
vi.mock('@/src/services/reconciliation/providers/registry.js', () => ({
  getProviderForChainAlias: vi.fn(),
}));

vi.mock('@/src/domain/value-objects/index.js', () => ({
  ReorgThreshold: {
    forChain: vi.fn().mockReturnValue(32),
    calculateSafeFromBlock: vi.fn().mockImplementation((checkpoint: number, _chainAlias: ChainAlias) => {
      return Math.max(0, checkpoint - 32);
    }),
    defaultThreshold: 32,
  },
}));

// Import after mocking
import { ReconciliationService } from '@/src/services/reconciliation/reconciliation-service.js';
import * as providerRegistry from '@/src/services/reconciliation/providers/registry.js';
import { ReorgThreshold } from '@/src/domain/value-objects/index.js';

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

function createMockAddressRepository(): AddressRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByAddressAndChainAlias: vi.fn(),
    findByVaultId: vi.fn(),
    findByVaultIdAndChainAlias: vi.fn(),
    findByVaultIdCursor: vi.fn(),
    findByVaultIdAndChainAliasCursor: vi.fn(),
    findHDAddressesByVaultIdAndChainAliasCursor: vi.fn(),
    findBySubscriptionId: vi.fn(),
    findMonitoredByVaultId: vi.fn(),
    findByOrganisationId: vi.fn(),
    setMonitored: vi.fn(),
    setUnmonitored: vi.fn(),
    updateAlias: vi.fn(),
    addToken: vi.fn(),
    removeToken: vi.fn(),
    findTokensByAddressId: vi.fn(),
    setTokenHidden: vi.fn(),
    setTokensHidden: vi.fn(),
    upsertTokens: vi.fn(),
    createMany: vi.fn(),
    deleteByVaultId: vi.fn(),
    findAllMonitored: vi.fn(),
    updateLastReconciledBlock: vi.fn(),
  };
}

function createMockJob(overrides: Partial<ReconciliationJob> = {}): ReconciliationJob {
  return {
    id: 'job-1',
    address: '0x123',
    chainAlias: 'eth' as ChainAlias,
    status: 'pending',
    provider: 'noves',
    mode: 'full',
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
    createdAt: new Date('2024-01-15T10:00:00.000Z'),
    updatedAt: new Date('2024-01-15T10:00:00.000Z'),
    startedAt: null,
    completedAt: null,
    novesJobId: null,
    novesNextPageUrl: null,
    novesJobStartedAt: null,
    ...overrides,
  };
}

function createMockAuditEntry(overrides: Partial<ReconciliationAuditEntry> = {}): ReconciliationAuditEntry {
  return {
    id: 'audit-1',
    jobId: 'job-1',
    transactionHash: '0xabc123',
    action: 'added',
    beforeSnapshot: null,
    afterSnapshot: { txHash: '0xabc123' },
    discrepancyFields: null,
    errorMessage: null,
    createdAt: new Date('2024-01-15T10:00:00.000Z'),
    ...overrides,
  };
}

describe('ReconciliationService', () => {
  let jobRepository: ReturnType<typeof createMockJobRepository>;
  let transactionRepository: ReturnType<typeof createMockTransactionRepository>;
  let addressRepository: ReturnType<typeof createMockAddressRepository>;
  let service: ReconciliationService;

  beforeEach(() => {
    vi.clearAllMocks();
    jobRepository = createMockJobRepository();
    transactionRepository = createMockTransactionRepository();
    addressRepository = createMockAddressRepository();

    // Default mock implementations
    vi.mocked(providerRegistry.getProviderForChainAlias).mockReturnValue({
      name: 'noves',
      supportedChainAliases: ['eth' as ChainAlias],
      fetchTransactions: vi.fn(),
      healthCheck: vi.fn(),
    });

    // Default: no address exists (upgrade to full mode)
    vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(null);

    service = new ReconciliationService({
      jobRepository,
      transactionRepository,
      addressRepository,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createJob', () => {
    it('should create a new reconciliation job with chain alias', async () => {
      const mockJob = createMockJob();
      vi.mocked(jobRepository.create).mockResolvedValue(mockJob);

      const result = await service.createJob({
        address: '0x123',
        chainAlias: 'eth',
      });

      expect(result.id).toBe('job-1');
      expect(result.status).toBe('pending');
      expect(result.address).toBe('0x123');
      expect(result.chainAlias).toBe('eth');
      expect(result.provider).toBe('noves');

      expect(providerRegistry.getProviderForChainAlias).toHaveBeenCalledWith('eth');
      // Default mode is partial, but no address exists, so auto-upgrades to full
      expect(jobRepository.create).toHaveBeenCalledWith({
        address: '0x123',
        chainAlias: 'eth',
        provider: 'noves',
        mode: 'full',
        fromBlock: undefined,
        toBlock: undefined,
        fromTimestamp: undefined,
        toTimestamp: undefined,
      });
    });

    it('should create job with optional timestamp filters', async () => {
      const fromTimestamp = new Date('2024-01-01T00:00:00.000Z');
      const toTimestamp = new Date('2024-01-31T23:59:59.999Z');
      const mockJob = createMockJob({
        fromTimestamp,
        toTimestamp,
      });

      vi.mocked(jobRepository.create).mockResolvedValue(mockJob);

      const result = await service.createJob({
        address: '0x123',
        chainAlias: 'eth',
        fromTimestamp,
        toTimestamp,
      });

      expect(result.fromTimestamp).toEqual(fromTimestamp);
      expect(result.toTimestamp).toEqual(toTimestamp);

      expect(jobRepository.create).toHaveBeenCalledWith({
        address: '0x123',
        chainAlias: 'eth',
        provider: 'noves',
        mode: 'full',
        fromBlock: undefined,
        toBlock: undefined,
        fromTimestamp,
        toTimestamp,
      });
    });

    it('should use provider for chain alias directly', async () => {
      vi.mocked(providerRegistry.getProviderForChainAlias).mockReturnValue({
        name: 'noves',
        supportedChainAliases: ['polygon'],
        fetchTransactions: vi.fn(),
        healthCheck: vi.fn(),
      });

      const mockJob = createMockJob({
        chainAlias: 'polygon',
      });

      vi.mocked(jobRepository.create).mockResolvedValue(mockJob);

      await service.createJob({
        address: '0x123',
        chainAlias: 'polygon',
      });

      expect(providerRegistry.getProviderForChainAlias).toHaveBeenCalledWith('polygon');
      expect(jobRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          chainAlias: 'polygon',
          mode: 'full',
        })
      );
    });

    it('should use partial mode with calculated fromBlock when address has checkpoint', async () => {
      const mockAddress = {
        id: 'addr-1',
        address: '0x123',
        chain_alias: 'eth',
        vault_id: 'vault-1',
        organisation_id: 'org-1',
        ecosystem: 'evm',
        workspace_id: 'ws-1',
        derivation_path: null,
        alias: null,
        is_monitored: true,
        subscription_id: 'sub-1',
        monitored_at: new Date(),
        unmonitored_at: null,
        last_reconciled_block: 1000,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(mockAddress);
      vi.mocked(ReorgThreshold.calculateSafeFromBlock).mockReturnValue(968);

      const mockJob = createMockJob({ mode: 'partial', fromBlock: 968 });
      vi.mocked(jobRepository.create).mockResolvedValue(mockJob);

      await service.createJob({
        address: '0x123',
        chainAlias: 'eth',
      });

      // fromBlock should be last_reconciled_block - reorg_threshold = 1000 - 32 = 968
      expect(jobRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'partial',
          fromBlock: 968,
        })
      );
    });

    it('should auto-upgrade to full mode when no checkpoint exists', async () => {
      const mockAddress = {
        id: 'addr-1',
        address: '0x123',
        chain_alias: 'eth',
        vault_id: 'vault-1',
        organisation_id: 'org-1',
        ecosystem: 'evm',
        workspace_id: 'ws-1',
        derivation_path: null,
        alias: null,
        is_monitored: true,
        subscription_id: 'sub-1',
        monitored_at: new Date(),
        unmonitored_at: null,
        last_reconciled_block: null, // No checkpoint
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(mockAddress);

      const mockJob = createMockJob({ mode: 'full' });
      vi.mocked(jobRepository.create).mockResolvedValue(mockJob);

      await service.createJob({
        address: '0x123',
        chainAlias: 'eth',
      });

      expect(jobRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'full',
          fromBlock: undefined,
        })
      );
    });

    it('should auto-upgrade to full mode when address does not exist', async () => {
      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(null);

      const mockJob = createMockJob({ mode: 'full' });
      vi.mocked(jobRepository.create).mockResolvedValue(mockJob);

      await service.createJob({
        address: '0x123',
        chainAlias: 'eth',
      });

      expect(jobRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'full',
          fromBlock: undefined,
        })
      );
    });

    it('should respect explicit full mode even when checkpoint exists', async () => {
      const mockAddress = {
        id: 'addr-1',
        address: '0x123',
        chain_alias: 'eth',
        vault_id: 'vault-1',
        organisation_id: 'org-1',
        ecosystem: 'evm',
        workspace_id: 'ws-1',
        derivation_path: null,
        alias: null,
        is_monitored: true,
        subscription_id: 'sub-1',
        monitored_at: new Date(),
        unmonitored_at: null,
        last_reconciled_block: 1000,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(mockAddress);

      const mockJob = createMockJob({ mode: 'full' });
      vi.mocked(jobRepository.create).mockResolvedValue(mockJob);

      await service.createJob({
        address: '0x123',
        chainAlias: 'eth',
        mode: 'full', // Explicit full mode
      });

      // Should not query address since mode is explicitly full
      expect(addressRepository.findByAddressAndChainAlias).not.toHaveBeenCalled();
      expect(jobRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'full',
          fromBlock: undefined,
        })
      );
    });

    it('should respect explicit fromBlock in partial mode', async () => {
      const mockJob = createMockJob({ mode: 'partial', fromBlock: 500 });
      vi.mocked(jobRepository.create).mockResolvedValue(mockJob);

      await service.createJob({
        address: '0x123',
        chainAlias: 'eth',
        mode: 'partial',
        fromBlock: 500, // Explicit fromBlock
      });

      // Should not query address since fromBlock is explicitly provided
      expect(addressRepository.findByAddressAndChainAlias).not.toHaveBeenCalled();
      expect(jobRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'partial',
          fromBlock: 500,
        })
      );
    });

    it('should clamp fromBlock to 0 when checkpoint minus threshold is negative', async () => {
      const mockAddress = {
        id: 'addr-1',
        address: '0x123',
        chain_alias: 'eth',
        vault_id: 'vault-1',
        organisation_id: 'org-1',
        ecosystem: 'evm',
        workspace_id: 'ws-1',
        derivation_path: null,
        alias: null,
        is_monitored: true,
        subscription_id: 'sub-1',
        monitored_at: new Date(),
        unmonitored_at: null,
        last_reconciled_block: 10, // Small value
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(addressRepository.findByAddressAndChainAlias).mockResolvedValue(mockAddress);
      vi.mocked(ReorgThreshold.calculateSafeFromBlock).mockReturnValue(0);

      const mockJob = createMockJob({ mode: 'partial', fromBlock: 0 });
      vi.mocked(jobRepository.create).mockResolvedValue(mockJob);

      await service.createJob({
        address: '0x123',
        chainAlias: 'eth',
      });

      // fromBlock should be clamped to 0 (10 - 32 = -22, clamped to 0)
      expect(jobRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'partial',
          fromBlock: 0,
        })
      );
    });
  });

  describe('getJob', () => {
    it('should return job with audit log when job exists', async () => {
      const mockJob = createMockJob({
        status: 'completed',
        completedAt: new Date('2024-01-15T11:00:00.000Z'),
      });
      const mockAuditLog = [
        createMockAuditEntry({ id: 'audit-1', action: 'added' }),
        createMockAuditEntry({ id: 'audit-2', action: 'discrepancy', discrepancyFields: ['value'] }),
      ];

      vi.mocked(jobRepository.findById).mockResolvedValue(mockJob);
      vi.mocked(jobRepository.getAuditLog).mockResolvedValue(mockAuditLog);

      const result = await service.getJob('job-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('job-1');
      expect(result?.status).toBe('completed');
      expect(result?.auditLog).toBeDefined();
      expect(result?.auditLog).toHaveLength(2);
      expect(result?.auditLog![0]!.action).toBe('added');
      expect(result?.auditLog![1]!.action).toBe('discrepancy');

      expect(jobRepository.findById).toHaveBeenCalledWith('job-1');
      expect(jobRepository.getAuditLog).toHaveBeenCalledWith('job-1');
    });

    it('should return null when job not found', async () => {
      vi.mocked(jobRepository.findById).mockResolvedValue(null);

      const result = await service.getJob('nonexistent');

      expect(result).toBeNull();
      expect(jobRepository.findById).toHaveBeenCalledWith('nonexistent');
      expect(jobRepository.getAuditLog).not.toHaveBeenCalled();
    });

    it('should return job with empty audit log when no entries exist', async () => {
      const mockJob = createMockJob({ status: 'pending' });

      vi.mocked(jobRepository.findById).mockResolvedValue(mockJob);
      vi.mocked(jobRepository.getAuditLog).mockResolvedValue([]);

      const result = await service.getJob('job-1');

      expect(result).not.toBeNull();
      expect(result?.auditLog).toEqual([]);
    });
  });

  describe('listJobs', () => {
    it('should return paginated list of job summaries', async () => {
      const mockJobs = [
        createMockJob({ id: 'job-1', status: 'completed' }),
        createMockJob({ id: 'job-2', status: 'pending' }),
      ];

      vi.mocked(jobRepository.findByAddressAndChainAlias).mockResolvedValue({
        data: mockJobs,
        total: 5,
      });

      const result = await service.listJobs('0x123', 'eth', { limit: 2, offset: 0 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.data[0]).toEqual({
        jobId: 'job-1',
        status: 'completed',
        address: '0x123',
        chainAlias: 'eth',
        createdAt: expect.any(Date),
      });
      expect(result.data[1]).toEqual({
        jobId: 'job-2',
        status: 'pending',
        address: '0x123',
        chainAlias: 'eth',
        createdAt: expect.any(Date),
      });

      expect(jobRepository.findByAddressAndChainAlias).toHaveBeenCalledWith('0x123', 'eth', {
        limit: 2,
        offset: 0,
      });
    });

    it('should return empty list when no jobs exist', async () => {
      vi.mocked(jobRepository.findByAddressAndChainAlias).mockResolvedValue({
        data: [],
        total: 0,
      });

      const result = await service.listJobs('0x123', 'eth');

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should use default pagination when not specified', async () => {
      vi.mocked(jobRepository.findByAddressAndChainAlias).mockResolvedValue({
        data: [],
        total: 0,
      });

      await service.listJobs('0x123', 'eth');

      expect(jobRepository.findByAddressAndChainAlias).toHaveBeenCalledWith('0x123', 'eth', undefined);
    });
  });
});
