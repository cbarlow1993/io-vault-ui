import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  StubPolicyService,
  ApprovalRequiredPolicyService,
  RejectingPolicyService,
  type PolicyResult,
} from '@/src/services/workflow/side-effects/policy-service.js';
import type { WorkflowContext } from '@/src/services/workflow/types.js';

describe('PolicyService', () => {
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  const mockContext: WorkflowContext = {
    vaultId: 'vault-123',
    chainAlias: 'ethereum',
    marshalledHex: '0xabc123',
    organisationId: 'org-456',
    createdBy: { id: 'user-789', type: 'User' },
    skipReview: false,
    approvers: [],
    approvedBy: null,
    signature: null,
    txHash: null,
    blockNumber: null,
    broadcastAttempts: 0,
    maxBroadcastAttempts: 3,
    error: null,
    failedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('StubPolicyService', () => {
    it('passes all transactions', async () => {
      const service = new StubPolicyService(mockLogger);

      const result = await service.evaluate(mockContext);

      expect(result).toEqual({ outcome: 'passed' });
    });

    it('logs evaluation with context details', async () => {
      const service = new StubPolicyService(mockLogger);

      await service.evaluate(mockContext);

      expect(mockLogger.info).toHaveBeenCalledWith('Evaluating policies (stub)', {
        vaultId: 'vault-123',
        chainAlias: 'ethereum',
        organisationId: 'org-456',
      });
    });
  });

  describe('ApprovalRequiredPolicyService', () => {
    it('requires approval with default approvers', async () => {
      const approvers = ['approver-1', 'approver-2'];
      const service = new ApprovalRequiredPolicyService(mockLogger, approvers);

      const result = await service.evaluate(mockContext);

      expect(result).toEqual({
        outcome: 'requires_approval',
        approvers: ['approver-1', 'approver-2'],
      });
    });

    it('requires approval with empty approvers list by default', async () => {
      const service = new ApprovalRequiredPolicyService(mockLogger);

      const result = await service.evaluate(mockContext);

      expect(result).toEqual({
        outcome: 'requires_approval',
        approvers: [],
      });
    });

    it('logs evaluation with context and approvers', async () => {
      const approvers = ['approver-1'];
      const service = new ApprovalRequiredPolicyService(mockLogger, approvers);

      await service.evaluate(mockContext);

      expect(mockLogger.info).toHaveBeenCalledWith('Evaluating policies (approval required)', {
        vaultId: 'vault-123',
        chainAlias: 'ethereum',
        approvers: ['approver-1'],
      });
    });
  });

  describe('RejectingPolicyService', () => {
    it('rejects with default reason', async () => {
      const service = new RejectingPolicyService(mockLogger);

      const result = await service.evaluate(mockContext);

      expect(result).toEqual({
        outcome: 'rejected',
        reason: 'Policy rejection',
      });
    });

    it('rejects with custom reason', async () => {
      const service = new RejectingPolicyService(mockLogger, 'Transaction exceeds daily limit');

      const result = await service.evaluate(mockContext);

      expect(result).toEqual({
        outcome: 'rejected',
        reason: 'Transaction exceeds daily limit',
      });
    });

    it('logs evaluation with context details', async () => {
      const service = new RejectingPolicyService(mockLogger);

      await service.evaluate(mockContext);

      expect(mockLogger.info).toHaveBeenCalledWith('Evaluating policies (rejecting)', {
        vaultId: 'vault-123',
        chainAlias: 'ethereum',
      });
    });
  });

  describe('PolicyResult type safety', () => {
    it('discriminates passed result', () => {
      const result: PolicyResult = { outcome: 'passed' };
      expect(result.outcome).toBe('passed');
    });

    it('discriminates requires_approval result', () => {
      const result: PolicyResult = { outcome: 'requires_approval', approvers: ['user-1'] };
      expect(result.outcome).toBe('requires_approval');
      expect(result.approvers).toEqual(['user-1']);
    });

    it('discriminates rejected result', () => {
      const result: PolicyResult = { outcome: 'rejected', reason: 'Test reason' };
      expect(result.outcome).toBe('rejected');
      expect(result.reason).toBe('Test reason');
    });
  });
});
