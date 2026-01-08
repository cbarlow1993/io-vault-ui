import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresReconciliationRepository } from '@/src/repositories/reconciliation.repository.js';
import type { Kysely } from 'kysely';
import type { Database } from '@/src/lib/database/types.js';
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

// Create mock Kysely instance
function createMockDb() {
  const mockExecute = vi.fn();
  const mockExecuteTakeFirst = vi.fn();
  const mockExecuteTakeFirstOrThrow = vi.fn();

  const chainable = {
    selectAll: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    returningAll: vi.fn().mockReturnThis(),
    forUpdate: vi.fn().mockReturnThis(),
    skipLocked: vi.fn().mockReturnThis(),
    execute: mockExecute,
    executeTakeFirst: mockExecuteTakeFirst,
    executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
  };

  const mockDb = {
    selectFrom: vi.fn().mockReturnValue(chainable),
    insertInto: vi.fn().mockReturnValue(chainable),
    updateTable: vi.fn().mockReturnValue(chainable),
  };

  return {
    mockDb: mockDb as unknown as Kysely<Database>,
    chainable,
    mockExecute,
    mockExecuteTakeFirst,
    mockExecuteTakeFirstOrThrow,
  };
}

// Helper to create a mock reconciliation job row from the database (snake_case)
function createMockJobRow(overrides: Partial<{
  id: string;
  address: string;
  chain_alias: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  provider: string;
  from_timestamp: Date | null;
  to_timestamp: Date | null;
  last_processed_cursor: string | null;
  processed_count: number;
  transactions_added: number;
  transactions_soft_deleted: number;
  discrepancies_flagged: number;
  errors_count: number;
  created_at: Date;
  updated_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
}> = {}) {
  return {
    id: 'job-uuid-1',
    address: '0xabc123',
    chain_alias: 'eth' as ChainAlias,
    status: 'pending' as const,
    provider: 'noves',
    from_timestamp: null,
    to_timestamp: null,
    last_processed_cursor: null,
    processed_count: 0,
    transactions_added: 0,
    transactions_soft_deleted: 0,
    discrepancies_flagged: 0,
    errors_count: 0,
    created_at: new Date('2024-01-15T10:00:00Z'),
    updated_at: new Date('2024-01-15T10:00:00Z'),
    started_at: null,
    completed_at: null,
    ...overrides,
  };
}

// Helper to create a mock audit log row from the database (snake_case)
function createMockAuditRow(overrides: Partial<{
  id: string;
  job_id: string;
  transaction_hash: string;
  action: 'added' | 'soft_deleted' | 'discrepancy' | 'error';
  before_snapshot: Record<string, unknown> | null;
  after_snapshot: Record<string, unknown> | null;
  discrepancy_fields: string[] | null;
  error_message: string | null;
  created_at: Date;
}> = {}) {
  return {
    id: 'audit-uuid-1',
    job_id: 'job-uuid-1',
    transaction_hash: '0xtx123',
    action: 'added' as const,
    before_snapshot: null,
    after_snapshot: { value: '100' },
    discrepancy_fields: null,
    error_message: null,
    created_at: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  };
}

describe('PostgresReconciliationRepository', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let repository: PostgresReconciliationRepository;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = new PostgresReconciliationRepository(mockDb.mockDb);
  });

  describe('create', () => {
    it('should create a job and return it with camelCase fields', async () => {
      const jobRow = createMockJobRow({
        id: 'new-job-id',
        address: '0xtest',
        chain_alias: 'eth' as ChainAlias,
        provider: 'noves',
      });
      mockDb.mockExecuteTakeFirstOrThrow.mockResolvedValue(jobRow);

      const result = await repository.create({
        address: '0xtest',
        chainAlias: 'eth' as ChainAlias,
        provider: 'noves',
      });

      expect(mockDb.mockDb.insertInto).toHaveBeenCalledWith('reconciliation_jobs');
      expect(mockDb.chainable.values).toHaveBeenCalledWith(expect.objectContaining({
        address: '0xtest',
        chain_alias: 'eth' as ChainAlias,
        provider: 'noves',
      }));
      expect(mockDb.chainable.returningAll).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        id: 'new-job-id',
        address: '0xtest',
        chainAlias: 'eth' as ChainAlias,
        provider: 'noves',
        status: 'pending',
        processedCount: 0,
        transactionsAdded: 0,
        transactionsSoftDeleted: 0,
        discrepanciesFlagged: 0,
        errorsCount: 0,
      }));
    });

    it('should include optional timestamps when provided', async () => {
      const fromTs = new Date('2024-01-01T00:00:00Z');
      const toTs = new Date('2024-01-31T23:59:59Z');
      const jobRow = createMockJobRow({
        from_timestamp: fromTs,
        to_timestamp: toTs,
      });
      mockDb.mockExecuteTakeFirstOrThrow.mockResolvedValue(jobRow);

      const result = await repository.create({
        address: '0xtest',
        chainAlias: 'eth' as ChainAlias,
        provider: 'noves',
        fromTimestamp: fromTs,
        toTimestamp: toTs,
      });

      expect(mockDb.chainable.values).toHaveBeenCalledWith(expect.objectContaining({
        from_timestamp: fromTs,
        to_timestamp: toTs,
      }));
      expect(result.fromTimestamp).toEqual(fromTs);
      expect(result.toTimestamp).toEqual(toTs);
    });
  });

  describe('findById', () => {
    it('should return job when found', async () => {
      const jobRow = createMockJobRow();
      mockDb.mockExecuteTakeFirst.mockResolvedValue(jobRow);

      const result = await repository.findById('job-uuid-1');

      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('reconciliation_jobs');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('id', '=', 'job-uuid-1');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('job-uuid-1');
      expect(result?.address).toBe('0xabc123');
      expect(result?.processedCount).toBe(0);
    });

    it('should return null when not found', async () => {
      mockDb.mockExecuteTakeFirst.mockResolvedValue(undefined);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should map snake_case to camelCase correctly', async () => {
      const jobRow = createMockJobRow({
        last_processed_cursor: 'cursor-123',
        processed_count: 50,
        transactions_added: 10,
        transactions_soft_deleted: 2,
        discrepancies_flagged: 5,
        errors_count: 1,
      });
      mockDb.mockExecuteTakeFirst.mockResolvedValue(jobRow);

      const result = await repository.findById('job-uuid-1');

      expect(result).toEqual(expect.objectContaining({
        lastProcessedCursor: 'cursor-123',
        processedCount: 50,
        transactionsAdded: 10,
        transactionsSoftDeleted: 2,
        discrepanciesFlagged: 5,
        errorsCount: 1,
      }));
    });
  });

  describe('update', () => {
    it('should update job and return updated record', async () => {
      const updatedJobRow = createMockJobRow({
        status: 'running',
        processed_count: 100,
        started_at: new Date('2024-01-15T11:00:00Z'),
      });
      mockDb.mockExecuteTakeFirstOrThrow.mockResolvedValue(updatedJobRow);

      const result = await repository.update('job-uuid-1', {
        status: 'running',
        processedCount: 100,
        startedAt: new Date('2024-01-15T11:00:00Z'),
      });

      expect(mockDb.mockDb.updateTable).toHaveBeenCalledWith('reconciliation_jobs');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('id', '=', 'job-uuid-1');
      expect(mockDb.chainable.returningAll).toHaveBeenCalled();
      expect(result.status).toBe('running');
      expect(result.processedCount).toBe(100);
      expect(result.startedAt).toEqual(new Date('2024-01-15T11:00:00Z'));
    });

    it('should convert camelCase input to snake_case for database', async () => {
      const updatedJobRow = createMockJobRow({
        last_processed_cursor: 'new-cursor',
        transactions_added: 5,
        transactions_soft_deleted: 1,
        discrepancies_flagged: 2,
        errors_count: 0,
      });
      mockDb.mockExecuteTakeFirstOrThrow.mockResolvedValue(updatedJobRow);

      await repository.update('job-uuid-1', {
        lastProcessedCursor: 'new-cursor',
        transactionsAdded: 5,
        transactionsSoftDeleted: 1,
        discrepanciesFlagged: 2,
        errorsCount: 0,
      });

      expect(mockDb.chainable.set).toHaveBeenCalledWith(expect.objectContaining({
        last_processed_cursor: 'new-cursor',
        transactions_added: 5,
        transactions_soft_deleted: 1,
        discrepancies_flagged: 2,
        errors_count: 0,
      }));
    });
  });

  describe('findByAddressAndChainAlias', () => {
    it('should return jobs with pagination', async () => {
      const jobRows = [
        createMockJobRow({ id: 'job-1' }),
        createMockJobRow({ id: 'job-2' }),
      ];
      mockDb.mockExecute.mockResolvedValue(jobRows);
      mockDb.mockExecuteTakeFirstOrThrow.mockResolvedValue({ count: 5 });

      const result = await repository.findByAddressAndChainAlias('0xabc123', 'eth' as ChainAlias, {
        limit: 10,
        offset: 0,
      });

      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('reconciliation_jobs');
      // First where call uses sql template for case-insensitive address matching
      expect(mockDb.chainable.where).toHaveBeenCalledWith(expect.anything(), '=', '0xabc123');
      // Second where call is for chain_alias
      expect(mockDb.chainable.where).toHaveBeenCalledWith('chain_alias', '=', 'eth');
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(5);
    });

    it('should use default pagination when not provided', async () => {
      mockDb.mockExecute.mockResolvedValue([]);
      mockDb.mockExecuteTakeFirstOrThrow.mockResolvedValue({ count: 0 });

      await repository.findByAddressAndChainAlias('0xabc123', 'eth' as ChainAlias);

      expect(mockDb.chainable.limit).toHaveBeenCalledWith(50);
      expect(mockDb.chainable.offset).toHaveBeenCalledWith(0);
    });
  });

  describe('claimNextPendingJob', () => {
    it('should claim and return next pending job', async () => {
      const pendingJobRow = createMockJobRow({ id: 'pending-job-1', status: 'pending' });
      const runningJobRow = createMockJobRow({ id: 'pending-job-1', status: 'running' });

      // First call: select pending job with FOR UPDATE SKIP LOCKED
      mockDb.mockExecuteTakeFirst.mockResolvedValueOnce(pendingJobRow);
      // Second call: update to running
      mockDb.mockExecuteTakeFirstOrThrow.mockResolvedValueOnce(runningJobRow);

      const result = await repository.claimNextPendingJob();

      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('reconciliation_jobs');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('status', '=', 'pending');
      expect(mockDb.chainable.forUpdate).toHaveBeenCalled();
      expect(mockDb.chainable.skipLocked).toHaveBeenCalled();
      expect(result?.status).toBe('running');
    });

    it('should return null when no pending jobs', async () => {
      mockDb.mockExecuteTakeFirst.mockResolvedValue(undefined);

      const result = await repository.claimNextPendingJob();

      expect(result).toBeNull();
    });
  });

  describe('addAuditEntry', () => {
    it('should add audit entry and return it', async () => {
      const auditRow = createMockAuditRow({
        id: 'audit-1',
        job_id: 'job-1',
        transaction_hash: '0xtx123',
        action: 'added',
        after_snapshot: { value: '100' },
      });
      mockDb.mockExecuteTakeFirstOrThrow.mockResolvedValue(auditRow);

      const result = await repository.addAuditEntry({
        jobId: 'job-1',
        transactionHash: '0xtx123',
        action: 'added',
        afterSnapshot: { value: '100' },
      });

      expect(mockDb.mockDb.insertInto).toHaveBeenCalledWith('reconciliation_audit_log');
      expect(mockDb.chainable.values).toHaveBeenCalledWith(expect.objectContaining({
        job_id: 'job-1',
        transaction_hash: '0xtx123',
        action: 'added',
        after_snapshot: JSON.stringify({ value: '100' }),
      }));
      expect(result.jobId).toBe('job-1');
      expect(result.transactionHash).toBe('0xtx123');
      expect(result.action).toBe('added');
    });

    it('should handle discrepancy entries with fields', async () => {
      const auditRow = createMockAuditRow({
        action: 'discrepancy',
        before_snapshot: { value: '100' },
        after_snapshot: { value: '200' },
        discrepancy_fields: ['value'],
      });
      mockDb.mockExecuteTakeFirstOrThrow.mockResolvedValue(auditRow);

      const result = await repository.addAuditEntry({
        jobId: 'job-1',
        transactionHash: '0xtx123',
        action: 'discrepancy',
        beforeSnapshot: { value: '100' },
        afterSnapshot: { value: '200' },
        discrepancyFields: ['value'],
      });

      expect(result.discrepancyFields).toEqual(['value']);
    });

    it('should handle error entries with message', async () => {
      const auditRow = createMockAuditRow({
        action: 'error',
        error_message: 'Failed to fetch transaction',
      });
      mockDb.mockExecuteTakeFirstOrThrow.mockResolvedValue(auditRow);

      const result = await repository.addAuditEntry({
        jobId: 'job-1',
        transactionHash: '0xtx123',
        action: 'error',
        errorMessage: 'Failed to fetch transaction',
      });

      expect(result.errorMessage).toBe('Failed to fetch transaction');
    });
  });

  describe('getAuditLog', () => {
    it('should return audit entries for a job', async () => {
      const auditRows = [
        createMockAuditRow({ id: 'audit-1', action: 'added' }),
        createMockAuditRow({ id: 'audit-2', action: 'soft_deleted' }),
      ];
      mockDb.mockExecute.mockResolvedValue(auditRows);

      const result = await repository.getAuditLog('job-uuid-1');

      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('reconciliation_audit_log');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('job_id', '=', 'job-uuid-1');
      expect(mockDb.chainable.orderBy).toHaveBeenCalledWith('created_at', 'asc');
      expect(result).toHaveLength(2);
      expect(result[0]!.action).toBe('added');
      expect(result[1]!.action).toBe('soft_deleted');
    });

    it('should return empty array when no audit entries', async () => {
      mockDb.mockExecute.mockResolvedValue([]);

      const result = await repository.getAuditLog('job-with-no-entries');

      expect(result).toEqual([]);
    });
  });
});
