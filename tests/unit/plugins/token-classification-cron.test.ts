import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock scheduler lock
vi.mock('@/src/services/reconciliation/scheduler-lock.js', () => ({
  acquireSchedulerLock: vi.fn().mockResolvedValue(true),
  releaseSchedulerLock: vi.fn().mockResolvedValue(undefined),
}));

describe('runTokenClassificationWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should acquire and release lock', async () => {
    const { runTokenClassificationWorker } = await import('@/src/plugins/token-classification-cron.js');
    const { acquireSchedulerLock, releaseSchedulerLock } = await import('@/src/services/reconciliation/scheduler-lock.js');

    const mockDb = {} as any;
    const mockWorker = {
      run: vi.fn().mockResolvedValue({
        refreshed: 0,
        processed: 0,
        succeeded: 0,
        failed: 0,
      }),
    } as any;

    await runTokenClassificationWorker(mockDb, mockWorker);

    expect(acquireSchedulerLock).toHaveBeenCalledWith(mockDb, 'token_classification_scheduler');
    expect(releaseSchedulerLock).toHaveBeenCalledWith(mockDb, 'token_classification_scheduler');
    expect(mockWorker.run).toHaveBeenCalled();
  });

  it('should skip if lock not acquired', async () => {
    const { runTokenClassificationWorker } = await import('@/src/plugins/token-classification-cron.js');
    const schedulerLock = await import('@/src/services/reconciliation/scheduler-lock.js');
    vi.mocked(schedulerLock.acquireSchedulerLock).mockResolvedValueOnce(false);

    const mockDb = {} as any;
    const mockWorker = {
      run: vi.fn(),
    } as any;

    await runTokenClassificationWorker(mockDb, mockWorker);

    expect(mockWorker.run).not.toHaveBeenCalled();
    expect(schedulerLock.releaseSchedulerLock).not.toHaveBeenCalled();
  });

  it('should release lock even on worker error', async () => {
    const { runTokenClassificationWorker } = await import('@/src/plugins/token-classification-cron.js');
    const { releaseSchedulerLock } = await import('@/src/services/reconciliation/scheduler-lock.js');

    const mockDb = {} as any;
    const mockWorker = {
      run: vi.fn().mockRejectedValue(new Error('Worker failed')),
    } as any;

    await runTokenClassificationWorker(mockDb, mockWorker);

    expect(releaseSchedulerLock).toHaveBeenCalled();
  });
});
