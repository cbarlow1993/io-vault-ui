import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  StubBroadcastService,
  RetryableFailureBroadcastService,
  PermanentFailureBroadcastService,
  EventualSuccessBroadcastService,
} from '@/src/services/workflow/side-effects/broadcast-service.js';
import type { WorkflowContext } from '@/src/services/workflow/types.js';

describe('BroadcastService', () => {
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  const createMockContext = (overrides: Partial<WorkflowContext> = {}): WorkflowContext => ({
    vaultId: 'vault-123',
    chainAlias: 'eth' as ChainAlias,
    marshalledHex: '0xabc123',
    organisationId: 'org-456',
    createdBy: { id: 'user-789', type: 'User' },
    skipReview: false,
    approvers: [],
    approvedBy: null,
    signature: '0xsignature123',
    txHash: null,
    blockNumber: null,
    broadcastAttempts: 0,
    maxBroadcastAttempts: 3,
    error: null,
    failedAt: null,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('StubBroadcastService', () => {
    it('broadcasts successfully with valid signature', async () => {
      const service = new StubBroadcastService(mockLogger);
      const context = createMockContext();

      const result = await service.broadcast(context);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.txHash).toMatch(/^0x[a-f0-9]+$/);
      }
    });

    it('fails when no signature is provided', async () => {
      const service = new StubBroadcastService(mockLogger);
      const context = createMockContext({ signature: null });

      const result = await service.broadcast(context);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('No signature available for broadcast');
        expect(result.retryable).toBe(false);
      }
    });

    it('logs broadcast attempt with context', async () => {
      const service = new StubBroadcastService(mockLogger);
      const context = createMockContext();

      await service.broadcast(context);

      expect(mockLogger.info).toHaveBeenCalledWith('Broadcasting transaction (stub)', {
        vaultId: 'vault-123',
        chainAlias: 'eth' as ChainAlias,
        hasSignature: true,
      });
    });
  });

  describe('RetryableFailureBroadcastService', () => {
    it('fails with retryable error', async () => {
      const service = new RetryableFailureBroadcastService(mockLogger);
      const context = createMockContext();

      const result = await service.broadcast(context);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Network timeout');
        expect(result.retryable).toBe(true);
      }
    });

    it('fails with custom error message', async () => {
      const service = new RetryableFailureBroadcastService(mockLogger, 'RPC node unavailable');
      const context = createMockContext();

      const result = await service.broadcast(context);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('RPC node unavailable');
        expect(result.retryable).toBe(true);
      }
    });

    it('logs warning with attempt count', async () => {
      const service = new RetryableFailureBroadcastService(mockLogger);
      const context = createMockContext({ broadcastAttempts: 2 });

      await service.broadcast(context);

      expect(mockLogger.warn).toHaveBeenCalledWith('Broadcast failed (retryable)', {
        vaultId: 'vault-123',
        chainAlias: 'eth' as ChainAlias,
        attempt: 3,
      });
    });
  });

  describe('PermanentFailureBroadcastService', () => {
    it('fails with non-retryable error', async () => {
      const service = new PermanentFailureBroadcastService(mockLogger);
      const context = createMockContext();

      const result = await service.broadcast(context);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Transaction rejected: insufficient funds');
        expect(result.retryable).toBe(false);
      }
    });

    it('fails with custom error message', async () => {
      const service = new PermanentFailureBroadcastService(mockLogger, 'Invalid nonce');
      const context = createMockContext();

      const result = await service.broadcast(context);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Invalid nonce');
        expect(result.retryable).toBe(false);
      }
    });

    it('logs error with details', async () => {
      const service = new PermanentFailureBroadcastService(mockLogger, 'Custom error');
      const context = createMockContext();

      await service.broadcast(context);

      expect(mockLogger.error).toHaveBeenCalledWith('Broadcast failed (permanent)', {
        vaultId: 'vault-123',
        chainAlias: 'eth' as ChainAlias,
        error: 'Custom error',
      });
    });
  });

  describe('EventualSuccessBroadcastService', () => {
    it('fails initially then succeeds after configured attempts', async () => {
      const service = new EventualSuccessBroadcastService(mockLogger, 3);
      const context = createMockContext();

      // First attempt - fail
      const result1 = await service.broadcast(context);
      expect(result1.success).toBe(false);
      if (!result1.success) {
        expect(result1.retryable).toBe(true);
      }

      // Second attempt - fail
      const result2 = await service.broadcast(context);
      expect(result2.success).toBe(false);
      if (!result2.success) {
        expect(result2.retryable).toBe(true);
      }

      // Third attempt - success
      const result3 = await service.broadcast(context);
      expect(result3.success).toBe(true);
      if (result3.success) {
        expect(result3.txHash).toMatch(/^0x[a-f0-9]+$/);
      }
    });

    it('succeeds on first attempt when configured for 1', async () => {
      const service = new EventualSuccessBroadcastService(mockLogger, 1);
      const context = createMockContext();

      const result = await service.broadcast(context);

      expect(result.success).toBe(true);
    });

    it('can be reset to retry the sequence', async () => {
      const service = new EventualSuccessBroadcastService(mockLogger, 2);
      const context = createMockContext();

      // First sequence
      await service.broadcast(context); // fail
      const result1 = await service.broadcast(context); // success
      expect(result1.success).toBe(true);

      // Reset
      service.reset();

      // Second sequence starts fresh
      const result2 = await service.broadcast(context); // fail
      expect(result2.success).toBe(false);
    });

    it('logs warning during failed attempts', async () => {
      const service = new EventualSuccessBroadcastService(mockLogger, 2);
      const context = createMockContext();

      await service.broadcast(context);

      expect(mockLogger.warn).toHaveBeenCalledWith('Broadcast attempt failed, will retry', {
        vaultId: 'vault-123',
        attempt: 1,
        willSucceedAt: 2,
      });
    });

    it('logs success after retries', async () => {
      const service = new EventualSuccessBroadcastService(mockLogger, 2);
      const context = createMockContext();

      await service.broadcast(context); // fail
      await service.broadcast(context); // success

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Broadcast succeeded after retries',
        expect.objectContaining({
          vaultId: 'vault-123',
          attempts: 2,
        })
      );
    });
  });
});
