import { describe, it, expect, vi, beforeEach } from 'vitest';
import { acquireSchedulerLock, releaseSchedulerLock, SCHEDULER_LOCK_ID } from '@/src/services/reconciliation/scheduler-lock.js';

/**
 * Creates a mock Kysely db instance that properly mocks the executor
 * for raw SQL template execution (sql`...`.execute(db))
 */
function createMockDb(queryResult: { rows: unknown[] }) {
  const mockExecuteQuery = vi.fn().mockResolvedValue(queryResult);

  const mockExecutor = {
    executeQuery: mockExecuteQuery,
    // transformQuery returns the query node unchanged for our mock
    transformQuery: vi.fn().mockImplementation((node: unknown) => node),
    // compileQuery returns a mock compiled query
    compileQuery: vi.fn().mockReturnValue({
      sql: 'SELECT pg_try_advisory_lock($1)',
      parameters: [738523901],
    }),
  };

  const mockDb = {
    getExecutor: vi.fn().mockReturnValue(mockExecutor),
  };

  return { mockDb, mockExecuteQuery };
}

describe('scheduler-lock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('acquireSchedulerLock', () => {
    it('returns true when lock is acquired', async () => {
      const { mockDb } = createMockDb({
        rows: [{ pg_try_advisory_lock: true }],
      });

      const result = await acquireSchedulerLock(mockDb as any);

      expect(result).toBe(true);
      expect(mockDb.getExecutor).toHaveBeenCalled();
    });

    it('returns false when lock is already held', async () => {
      const { mockDb } = createMockDb({
        rows: [{ pg_try_advisory_lock: false }],
      });

      const result = await acquireSchedulerLock(mockDb as any);

      expect(result).toBe(false);
    });

    it('returns false when no rows returned', async () => {
      const { mockDb } = createMockDb({
        rows: [],
      });

      const result = await acquireSchedulerLock(mockDb as any);

      expect(result).toBe(false);
    });
  });

  describe('releaseSchedulerLock', () => {
    it('calls advisory unlock', async () => {
      const { mockDb, mockExecuteQuery } = createMockDb({ rows: [] });

      await releaseSchedulerLock(mockDb as any);

      expect(mockDb.getExecutor).toHaveBeenCalled();
      expect(mockExecuteQuery).toHaveBeenCalled();
    });
  });

  describe('SCHEDULER_LOCK_ID', () => {
    it('exports a consistent lock ID', () => {
      expect(typeof SCHEDULER_LOCK_ID).toBe('number');
      expect(SCHEDULER_LOCK_ID).toBeGreaterThan(0);
    });
  });
});
