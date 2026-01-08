import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies - use hoisted mock functions
vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn(),
    validate: vi.fn().mockReturnValue(true),
  },
}));

vi.mock('@/src/services/reconciliation/scheduler-lock.js', () => ({
  acquireSchedulerLock: vi.fn(),
  releaseSchedulerLock: vi.fn(),
  SCHEDULER_LOCK_ID: 12345,
}));

vi.mock('@/src/services/reconciliation/reconciliation-scheduler.js', () => ({
  ReconciliationScheduler: vi.fn().mockImplementation(() => ({
    schedulePartialReconciliation: vi.fn(),
  })),
}));

// Mock config
vi.mock('@/src/lib/config.js', () => ({
  config: {
    reconciliation: {
      scheduler: {
        enabled: true,
        cronSchedule: '0 2 * * *',
      },
    },
  },
}));

// Mock logger
vi.mock('@/utils/powertools', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    critical: vi.fn(),
  },
}));

import { runScheduledReconciliation } from '@/src/plugins/reconciliation-cron.js';
import {
  acquireSchedulerLock,
  releaseSchedulerLock,
} from '@/src/services/reconciliation/scheduler-lock.js';
import { logger } from '@/utils/powertools.js';

// Get mocked functions after import
const mockAcquireLock = vi.mocked(acquireSchedulerLock);
const mockReleaseLock = vi.mocked(releaseSchedulerLock);
const mockLogger = vi.mocked(logger);

// Create a mock scheduler
const mockSchedulePartialReconciliation = vi.fn();
const createMockScheduler = () => ({
  schedulePartialReconciliation: mockSchedulePartialReconciliation,
});

describe('reconciliation-cron plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('runScheduledReconciliation', () => {
    it('acquires lock before running scheduler', async () => {
      mockAcquireLock.mockResolvedValue(true);
      mockSchedulePartialReconciliation.mockResolvedValue({ scheduled: 5, errors: 0 });

      await runScheduledReconciliation({} as any, createMockScheduler() as any);

      expect(mockAcquireLock).toHaveBeenCalled();
      expect(mockSchedulePartialReconciliation).toHaveBeenCalled();
    });

    it('skips execution when lock is held by another instance', async () => {
      mockAcquireLock.mockResolvedValue(false);

      await runScheduledReconciliation({} as any, createMockScheduler() as any);

      expect(mockAcquireLock).toHaveBeenCalled();
      expect(mockSchedulePartialReconciliation).not.toHaveBeenCalled();
    });

    it('releases lock after successful execution', async () => {
      mockAcquireLock.mockResolvedValue(true);
      mockSchedulePartialReconciliation.mockResolvedValue({ scheduled: 5, errors: 0 });

      await runScheduledReconciliation({} as any, createMockScheduler() as any);

      expect(mockReleaseLock).toHaveBeenCalledTimes(1);
    });

    it('releases lock even after failure', async () => {
      mockAcquireLock.mockResolvedValue(true);
      mockSchedulePartialReconciliation.mockRejectedValue(new Error('DB error'));

      const promise = runScheduledReconciliation({} as any, createMockScheduler() as any);

      // Advance through all backoff delays
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);

      await promise;

      // Lock should only be released once, after all retries are exhausted
      expect(mockReleaseLock).toHaveBeenCalledTimes(1);
    });

    it('retries on failure with backoff', async () => {
      mockAcquireLock.mockResolvedValue(true);
      mockSchedulePartialReconciliation
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockResolvedValue({ scheduled: 5, errors: 0 });

      const promise = runScheduledReconciliation({} as any, createMockScheduler() as any);

      // Advance through the backoff delay
      await vi.advanceTimersByTimeAsync(1000);

      await promise;

      // Lock should only be acquired once at the start
      expect(mockAcquireLock).toHaveBeenCalledTimes(1);
      expect(mockSchedulePartialReconciliation).toHaveBeenCalledTimes(2);
      // Lock should only be released once after all retries complete
      expect(mockReleaseLock).toHaveBeenCalledTimes(1);
    });

    it('logs critical after all retries exhausted', async () => {
      mockAcquireLock.mockResolvedValue(true);
      mockSchedulePartialReconciliation.mockRejectedValue(new Error('Persistent error'));

      const promise = runScheduledReconciliation({} as any, createMockScheduler() as any);

      // Advance through all backoff delays (1000ms, 2000ms)
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);

      await promise;

      expect(mockSchedulePartialReconciliation).toHaveBeenCalledTimes(3); // maxRetries
      expect(mockLogger.critical).toHaveBeenCalledWith(
        'Reconciliation scheduler failed after all retries',
        expect.objectContaining({ maxRetries: 3 })
      );
    });
  });
});
