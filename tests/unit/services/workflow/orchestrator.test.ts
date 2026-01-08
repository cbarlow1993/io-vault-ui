import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowOrchestrator } from '@/src/services/workflow/orchestrator.js';
import { WorkflowRepository } from '@/src/repositories/workflow.repository.js';
import { WorkflowEventsRepository } from '@/src/repositories/workflow-events.repository.js';
import {
  ConcurrentModificationError,
  InvalidStateTransitionError,
  WorkflowNotFoundError,
} from '@/src/services/workflow/errors.js';
import type {
  Workflow,
  WorkflowContext,
  WorkflowEventRecord,
} from '@/src/services/workflow/types.js';

// Helper to create complete workflow objects for tests
function createMockWorkflow(overrides: Partial<Workflow> = {}): Workflow {
  const defaultContext: WorkflowContext = {
    vaultId: 'vault-123',
    chainAlias: 'eth' as ChainAlias,
    marshalledHex: '0xabc',
    organisationId: 'org-123',
    createdBy: { id: 'user-123', type: 'User' },
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

  const context = overrides.context ?? defaultContext;

  return {
    id: overrides.id ?? 'wf-123',
    state: overrides.state ?? 'created',
    context,
    version: overrides.version ?? 1,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
    vaultId: 'vault-123',
    chainAlias: 'eth' as ChainAlias,
    marshalledHex: '0xabc',
    organisationId: 'org-123',
    createdBy: { id: 'user-123', type: 'User' },
    txHash: null,
    signature: null,
    blockNumber: null,
    completedAt: null,
  };
}

describe('WorkflowOrchestrator', () => {
  let orchestrator: WorkflowOrchestrator;
  let workflowRepo: WorkflowRepository;
  let eventsRepo: WorkflowEventsRepository;
  let mockLogger: {
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  const baseContext: WorkflowContext = {
    vaultId: 'vault-123',
    chainAlias: 'eth' as ChainAlias,
    marshalledHex: '0xabc',
    organisationId: 'org-123',
    createdBy: { id: 'user-123', type: 'User' },
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
    workflowRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByIdForUpdate: vi.fn(),
      update: vi.fn(),
    } as unknown as WorkflowRepository;

    eventsRepo = {
      create: vi.fn(),
      findByWorkflowId: vi.fn(),
    } as unknown as WorkflowEventsRepository;

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    // Cast logger to match expected interface
    orchestrator = new WorkflowOrchestrator(
      workflowRepo,
      eventsRepo,
      mockLogger as unknown as { info: (msg: string, meta?: Record<string, unknown>) => void; warn: (msg: string, meta?: Record<string, unknown>) => void; error: (msg: string, meta?: Record<string, unknown>) => void }
    );
  });

  describe('create', () => {
    it('creates workflow with initial context', async () => {
      const input = {
        vaultId: 'vault-123',
        chainAlias: 'eth' as ChainAlias,
        marshalledHex: '0xabc',
        organisationId: 'org-123',
        createdBy: { id: 'user-123', type: 'User' as const },
        skipReview: false,
      };

      const createdWorkflow = createMockWorkflow();

      vi.mocked(workflowRepo.create).mockResolvedValue(createdWorkflow);

      const result = await orchestrator.create(input);

      expect(result.id).toBe('wf-123');
      expect(result.state).toBe('created');
      expect(workflowRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          vaultId: 'vault-123',
          chainAlias: 'eth' as ChainAlias,
          marshalledHex: '0xabc',
          organisationId: 'org-123',
        })
      );
    });

    it('creates workflow with skipReview enabled', async () => {
      const input = {
        vaultId: 'vault-456',
        chainAlias: 'polygon' as ChainAlias,
        marshalledHex: '0xdef',
        organisationId: 'org-456',
        createdBy: { id: 'system', type: 'System' as const },
        skipReview: true,
      };

      const createdWorkflow = createMockWorkflow({
        id: 'wf-456',
        context: { ...baseContext, skipReview: true },
      });

      vi.mocked(workflowRepo.create).mockResolvedValue(createdWorkflow);

      const result = await orchestrator.create(input);

      expect(result.id).toBe('wf-456');
      expect(workflowRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          skipReview: true,
        })
      );
    });
  });

  describe('send', () => {
    it('transitions state and records event', async () => {
      const existingWorkflow = createMockWorkflow();

      const updatedWorkflow = createMockWorkflow({
        state: 'review',
        version: 2,
      });

      const createdEvent: WorkflowEventRecord = {
        id: 'evt-1',
        workflowId: 'wf-123',
        eventType: 'START',
        eventPayload: {},
        fromState: 'created',
        toState: 'review',
        triggeredBy: 'user:123',
        createdAt: new Date(),
      };

      vi.mocked(workflowRepo.findByIdForUpdate).mockResolvedValue(existingWorkflow);
      vi.mocked(workflowRepo.update).mockResolvedValue(updatedWorkflow);
      vi.mocked(eventsRepo.create).mockResolvedValue(createdEvent);

      const result = await orchestrator.send('wf-123', { type: 'START' }, 'user:123');

      expect(result.state).toBe('review');
      expect(result.version).toBe(2);
      expect(workflowRepo.findByIdForUpdate).toHaveBeenCalledWith('wf-123');
      expect(workflowRepo.update).toHaveBeenCalledWith(
        'wf-123',
        1,
        expect.objectContaining({
          state: 'review',
        })
      );
      expect(eventsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: 'wf-123',
          eventType: 'START',
          fromState: 'created',
          toState: 'review',
          triggeredBy: 'user:123',
        })
      );
    });

    it('skips review when skipReview is true', async () => {
      const existingWorkflow = createMockWorkflow({
        context: { ...baseContext, skipReview: true },
      });

      const updatedWorkflow = createMockWorkflow({
        state: 'evaluating_policies',
        context: { ...baseContext, skipReview: true },
        version: 2,
      });

      vi.mocked(workflowRepo.findByIdForUpdate).mockResolvedValue(existingWorkflow);
      vi.mocked(workflowRepo.update).mockResolvedValue(updatedWorkflow);
      vi.mocked(eventsRepo.create).mockResolvedValue({
        id: 'evt-1',
        workflowId: 'wf-123',
        eventType: 'START',
        eventPayload: {},
        fromState: 'created',
        toState: 'evaluating_policies',
        triggeredBy: 'user:123',
        createdAt: new Date(),
      });

      const result = await orchestrator.send('wf-123', { type: 'START' }, 'user:123');

      expect(result.state).toBe('evaluating_policies');
    });

    it('updates context with event payload data', async () => {
      const existingWorkflow = createMockWorkflow({
        state: 'evaluating_policies',
        context: { ...baseContext, skipReview: true },
      });

      const updatedWorkflow = createMockWorkflow({
        state: 'waiting_approval',
        context: {
          ...baseContext,
          skipReview: true,
          approvers: ['approver-1', 'approver-2'],
        },
        version: 2,
      });

      vi.mocked(workflowRepo.findByIdForUpdate).mockResolvedValue(existingWorkflow);
      vi.mocked(workflowRepo.update).mockResolvedValue(updatedWorkflow);
      vi.mocked(eventsRepo.create).mockResolvedValue({
        id: 'evt-1',
        workflowId: 'wf-123',
        eventType: 'POLICIES_REQUIRE_APPROVAL',
        eventPayload: { approvers: ['approver-1', 'approver-2'] },
        fromState: 'evaluating_policies',
        toState: 'waiting_approval',
        triggeredBy: 'system',
        createdAt: new Date(),
      });

      const result = await orchestrator.send(
        'wf-123',
        { type: 'POLICIES_REQUIRE_APPROVAL', approvers: ['approver-1', 'approver-2'] },
        'system'
      );

      expect(result.state).toBe('waiting_approval');
      expect(result.context.approvers).toEqual(['approver-1', 'approver-2']);
    });

    it('throws WorkflowNotFoundError when workflow not found', async () => {
      vi.mocked(workflowRepo.findByIdForUpdate).mockResolvedValue(null);

      await expect(
        orchestrator.send('non-existent', { type: 'START' }, 'user:123')
      ).rejects.toThrow(WorkflowNotFoundError);

      expect(workflowRepo.update).not.toHaveBeenCalled();
      expect(eventsRepo.create).not.toHaveBeenCalled();
    });

    it('throws InvalidStateTransitionError for invalid event in current state', async () => {
      const existingWorkflow = createMockWorkflow({
        state: 'completed',
      });

      vi.mocked(workflowRepo.findByIdForUpdate).mockResolvedValue(existingWorkflow);

      await expect(
        orchestrator.send('wf-123', { type: 'START' }, 'user:123')
      ).rejects.toThrow(InvalidStateTransitionError);

      expect(workflowRepo.update).not.toHaveBeenCalled();
      expect(eventsRepo.create).not.toHaveBeenCalled();
    });

    it('throws InvalidStateTransitionError when sending CONFIRM from wrong state', async () => {
      const existingWorkflow = createMockWorkflow();

      vi.mocked(workflowRepo.findByIdForUpdate).mockResolvedValue(existingWorkflow);

      await expect(
        orchestrator.send('wf-123', { type: 'CONFIRM' }, 'user:123')
      ).rejects.toThrow(InvalidStateTransitionError);
    });

    it('throws ConcurrentModificationError on version conflict', async () => {
      const existingWorkflow = createMockWorkflow();

      vi.mocked(workflowRepo.findByIdForUpdate).mockResolvedValue(existingWorkflow);
      vi.mocked(workflowRepo.update).mockRejectedValue(
        new ConcurrentModificationError('wf-123')
      );

      await expect(
        orchestrator.send('wf-123', { type: 'START' }, 'user:123')
      ).rejects.toThrow(ConcurrentModificationError);

      expect(eventsRepo.create).not.toHaveBeenCalled();
    });

    it('logs state transition info', async () => {
      const existingWorkflow = createMockWorkflow();

      vi.mocked(workflowRepo.findByIdForUpdate).mockResolvedValue(existingWorkflow);
      vi.mocked(workflowRepo.update).mockResolvedValue(
        createMockWorkflow({ state: 'review', version: 2 })
      );
      vi.mocked(eventsRepo.create).mockResolvedValue({
        id: 'evt-1',
        workflowId: 'wf-123',
        eventType: 'START',
        eventPayload: {},
        fromState: 'created',
        toState: 'review',
        triggeredBy: 'user:123',
        createdAt: new Date(),
      });

      await orchestrator.send('wf-123', { type: 'START' }, 'user:123');

      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('returns workflow when found', async () => {
      const existingWorkflow = createMockWorkflow({ state: 'review' });

      vi.mocked(workflowRepo.findById).mockResolvedValue(existingWorkflow);

      const result = await orchestrator.getById('wf-123');

      expect(result).toEqual(existingWorkflow);
      expect(workflowRepo.findById).toHaveBeenCalledWith('wf-123');
    });

    it('returns null when workflow not found', async () => {
      vi.mocked(workflowRepo.findById).mockResolvedValue(null);

      const result = await orchestrator.getById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getHistory', () => {
    it('returns event history for workflow', async () => {
      const events: WorkflowEventRecord[] = [
        {
          id: 'evt-1',
          workflowId: 'wf-123',
          eventType: 'START',
          eventPayload: {},
          fromState: 'created',
          toState: 'review',
          triggeredBy: 'user:123',
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: 'evt-2',
          workflowId: 'wf-123',
          eventType: 'CONFIRM',
          eventPayload: {},
          fromState: 'review',
          toState: 'evaluating_policies',
          triggeredBy: 'user:123',
          createdAt: new Date('2024-01-01T10:05:00Z'),
        },
      ];

      vi.mocked(eventsRepo.findByWorkflowId).mockResolvedValue(events);

      const result = await orchestrator.getHistory('wf-123');

      expect(result).toHaveLength(2);
      expect(result[0]!.eventType).toBe('START');
      expect(result[1]!.eventType).toBe('CONFIRM');
      expect(eventsRepo.findByWorkflowId).toHaveBeenCalledWith('wf-123');
    });

    it('returns empty array when no events exist', async () => {
      vi.mocked(eventsRepo.findByWorkflowId).mockResolvedValue([]);

      const result = await orchestrator.getHistory('wf-123');

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });
  });

  describe('complete workflow scenarios', () => {
    it('handles full happy path from created to completed', async () => {
      // This test verifies the orchestrator can handle a complete workflow
      // through multiple state transitions

      const workflow = createMockWorkflow({
        context: { ...baseContext, skipReview: true },
      });

      // Each transition updates the mock to return the next state
      vi.mocked(workflowRepo.findByIdForUpdate).mockResolvedValue(workflow);

      let currentVersion = 1;
      vi.mocked(workflowRepo.update).mockImplementation(async (_id, _ver, input) => {
        currentVersion++;
        return createMockWorkflow({
          state: input.state as Workflow['state'],
          context: input.context ?? workflow.context,
          version: currentVersion,
        });
      });

      vi.mocked(eventsRepo.create).mockImplementation(async (input) => ({
        id: `evt-${currentVersion}`,
        workflowId: input.workflowId,
        eventType: input.eventType,
        eventPayload: input.eventPayload,
        fromState: input.fromState,
        toState: input.toState,
        triggeredBy: input.triggeredBy,
        createdAt: new Date(),
      }));

      // Verify the orchestrator processes events correctly
      const result = await orchestrator.send('wf-123', { type: 'START' }, 'system');

      expect(result.state).toBe('evaluating_policies');
      expect(eventsRepo.create).toHaveBeenCalled();
    });

    it('handles transition to failed state with error tracking', async () => {
      const workflow = createMockWorkflow({ state: 'review' });

      vi.mocked(workflowRepo.findByIdForUpdate).mockResolvedValue(workflow);
      vi.mocked(workflowRepo.update).mockResolvedValue(
        createMockWorkflow({
          state: 'failed',
          context: {
            ...baseContext,
            error: 'User cancelled',
            failedAt: 'review',
          },
          version: 2,
        })
      );
      vi.mocked(eventsRepo.create).mockResolvedValue({
        id: 'evt-1',
        workflowId: 'wf-123',
        eventType: 'CANCEL',
        eventPayload: { reason: 'User cancelled' },
        fromState: 'review',
        toState: 'failed',
        triggeredBy: 'user:123',
        createdAt: new Date(),
      });

      const result = await orchestrator.send(
        'wf-123',
        { type: 'CANCEL', reason: 'User cancelled' },
        'user:123'
      );

      expect(result.state).toBe('failed');
      expect(result.context.error).toBe('User cancelled');
      expect(result.context.failedAt).toBe('review');
    });
  });
});
