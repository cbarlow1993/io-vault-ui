import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PolicyDecisionLogger } from '@/src/services/policy/decision-logger.js';

describe('PolicyDecisionLogger', () => {
  let mockDb: any;
  let logger: PolicyDecisionLogger;

  beforeEach(() => {
    vi.useFakeTimers();

    mockDb = {
      insertInto: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue(undefined),
    };

    logger = new PolicyDecisionLogger(mockDb, { batchSize: 2, flushIntervalMs: 1000 });
  });

  afterEach(async () => {
    vi.useRealTimers();
    await logger.stop();
  });

  it('should queue decisions and flush when batch size reached', async () => {
    logger.log({
      organisationId: 'org-1',
      userId: 'user-1',
      module: 'treasury',
      action: 'view_balances',
      decision: 'allow',
    });

    expect(mockDb.insertInto).not.toHaveBeenCalled();

    logger.log({
      organisationId: 'org-1',
      userId: 'user-2',
      module: 'treasury',
      action: 'initiate_transfer',
      decision: 'deny',
      reason: 'no permission',
    });

    // Wait for flush
    await vi.advanceTimersByTimeAsync(10);

    expect(mockDb.insertInto).toHaveBeenCalledWith('policy_decisions');
    expect(mockDb.values).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ user_id: 'user-1' }),
        expect.objectContaining({ user_id: 'user-2' }),
      ])
    );
  });

  it('should flush on interval', async () => {
    logger.log({
      organisationId: 'org-1',
      userId: 'user-1',
      module: 'treasury',
      action: 'view_balances',
      decision: 'allow',
    });

    expect(mockDb.insertInto).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);

    expect(mockDb.insertInto).toHaveBeenCalled();
  });

  it('should re-queue failed items on error', async () => {
    mockDb.execute.mockRejectedValueOnce(new Error('DB error'));

    logger.log({
      organisationId: 'org-1',
      userId: 'user-1',
      module: 'treasury',
      action: 'view_balances',
      decision: 'allow',
    });

    logger.log({
      organisationId: 'org-1',
      userId: 'user-2',
      module: 'treasury',
      action: 'initiate_transfer',
      decision: 'deny',
    });

    // Wait for flush (batch size reached)
    await vi.advanceTimersByTimeAsync(10);

    // Should have tried to insert
    expect(mockDb.insertInto).toHaveBeenCalled();

    // Reset mocks for retry
    mockDb.insertInto.mockClear();
    mockDb.values.mockClear();
    mockDb.execute.mockClear();
    mockDb.execute.mockResolvedValueOnce(undefined);

    // Advance to next interval - re-queued items should be flushed
    await vi.advanceTimersByTimeAsync(1000);

    expect(mockDb.insertInto).toHaveBeenCalled();
  });

  it('should stop cleanly and await final flush', async () => {
    logger.log({
      organisationId: 'org-1',
      userId: 'user-1',
      module: 'treasury',
      action: 'view_balances',
      decision: 'allow',
    });

    // stop() should be async and await flush
    await logger.stop();

    expect(mockDb.insertInto).toHaveBeenCalled();
  });
});
