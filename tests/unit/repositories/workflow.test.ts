import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowRepository } from '@/src/repositories/workflow.repository.js';
import { ConcurrentModificationError } from '@/src/services/workflow/errors.js';
import type { Kysely } from 'kysely';
import type { Database } from '@/src/lib/database/types.js';

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

// Helper to create a mock workflow row from the database (snake_case)
function createMockWorkflowRow(overrides: Partial<{
  id: string;
  state: string;
  context: Record<string, unknown>;
  vault_id: string;
  chain_alias: string;
  marshalled_hex: string;
  organisation_id: string;
  created_by: Record<string, unknown>;
  tx_hash: string | null;
  signature: string | null;
  block_number: number | null;
  version: number;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
}> = {}) {
  return {
    id: 'workflow-uuid-1',
    state: 'created',
    context: {
      vaultId: 'vault-123',
      chainAlias: 'eth-mainnet',
      marshalledHex: '0xabc123',
      organisationId: 'org-123',
      createdBy: { id: 'user-1', type: 'User' },
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
    },
    vault_id: 'vault-123',
    chain_alias: 'eth-mainnet',
    marshalled_hex: '0xabc123',
    organisation_id: 'org-123',
    created_by: { id: 'user-1', type: 'User' },
    tx_hash: null,
    signature: null,
    block_number: null,
    version: 1,
    created_at: new Date('2024-01-15T10:00:00Z'),
    updated_at: new Date('2024-01-15T10:00:00Z'),
    completed_at: null,
    ...overrides,
  };
}

describe('WorkflowRepository', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let repository: WorkflowRepository;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = new WorkflowRepository(mockDb.mockDb);
  });

  describe('create', () => {
    it('creates a workflow with initial state', async () => {
      const workflowRow = createMockWorkflowRow({
        id: 'new-workflow-id',
        state: 'created',
        version: 1,
      });
      mockDb.mockExecuteTakeFirstOrThrow.mockResolvedValue(workflowRow);

      const result = await repository.create({
        vaultId: 'vault-123',
        chainAlias: 'eth-mainnet',
        marshalledHex: '0xabc123',
        organisationId: 'org-123',
        createdBy: { id: 'user-1', type: 'User' },
      });

      expect(mockDb.mockDb.insertInto).toHaveBeenCalledWith('transaction_workflows');
      expect(mockDb.chainable.values).toHaveBeenCalledWith(expect.objectContaining({
        vault_id: 'vault-123',
        chain_alias: 'eth-mainnet',
        marshalled_hex: '0xabc123',
        organisation_id: 'org-123',
        state: 'created',
      }));
      expect(mockDb.chainable.returningAll).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        id: 'new-workflow-id',
        state: 'created',
        version: 1,
      }));
    });

    it('sets initial version to 1', async () => {
      const workflowRow = createMockWorkflowRow({ version: 1 });
      mockDb.mockExecuteTakeFirstOrThrow.mockResolvedValue(workflowRow);

      const result = await repository.create({
        vaultId: 'vault-123',
        chainAlias: 'eth-mainnet',
        marshalledHex: '0xabc123',
        organisationId: 'org-123',
        createdBy: { id: 'user-1', type: 'User' },
      });

      expect(result.version).toBe(1);
    });

    it('respects skipReview option', async () => {
      const workflowRow = createMockWorkflowRow({
        context: {
          vaultId: 'vault-123',
          chainAlias: 'eth-mainnet',
          marshalledHex: '0xabc123',
          organisationId: 'org-123',
          createdBy: { id: 'user-1', type: 'User' },
          skipReview: true,
          approvers: [],
          approvedBy: null,
          signature: null,
          txHash: null,
          blockNumber: null,
          broadcastAttempts: 0,
          maxBroadcastAttempts: 3,
          error: null,
          failedAt: null,
        },
      });
      mockDb.mockExecuteTakeFirstOrThrow.mockResolvedValue(workflowRow);

      const result = await repository.create({
        vaultId: 'vault-123',
        chainAlias: 'eth-mainnet',
        marshalledHex: '0xabc123',
        organisationId: 'org-123',
        createdBy: { id: 'user-1', type: 'User' },
        skipReview: true,
      });

      expect(result.context.skipReview).toBe(true);
    });
  });

  describe('findById', () => {
    it('returns workflow when found', async () => {
      const workflowRow = createMockWorkflowRow();
      mockDb.mockExecuteTakeFirst.mockResolvedValue(workflowRow);

      const result = await repository.findById('workflow-uuid-1');

      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('transaction_workflows');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('id', '=', 'workflow-uuid-1');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('workflow-uuid-1');
      expect(result?.state).toBe('created');
      expect(result?.version).toBe(1);
    });

    it('returns null when not found', async () => {
      mockDb.mockExecuteTakeFirst.mockResolvedValue(undefined);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('maps snake_case to camelCase correctly', async () => {
      const workflowRow = createMockWorkflowRow({
        id: 'workflow-1',
        vault_id: 'vault-abc',
        chain_alias: 'btc-mainnet',
        marshalled_hex: '0xdef456',
        organisation_id: 'org-xyz',
        created_by: { id: 'admin', type: 'System' },
        tx_hash: '0xtx123',
        block_number: 12345,
        created_at: new Date('2024-06-01T12:00:00Z'),
        updated_at: new Date('2024-06-02T12:00:00Z'),
      });
      mockDb.mockExecuteTakeFirst.mockResolvedValue(workflowRow);

      const result = await repository.findById('workflow-1');

      expect(result).toEqual(expect.objectContaining({
        id: 'workflow-1',
        vaultId: 'vault-abc',
        chainAlias: 'btc-mainnet',
        marshalledHex: '0xdef456',
        organisationId: 'org-xyz',
        txHash: '0xtx123',
        blockNumber: 12345,
      }));
    });
  });

  describe('update', () => {
    it('updates state and increments version', async () => {
      const updatedWorkflowRow = createMockWorkflowRow({
        state: 'review',
        version: 2,
        updated_at: new Date('2024-01-15T11:00:00Z'),
      });
      mockDb.mockExecuteTakeFirst.mockResolvedValue(updatedWorkflowRow);

      const result = await repository.update('workflow-uuid-1', 1, {
        state: 'review',
      });

      expect(mockDb.mockDb.updateTable).toHaveBeenCalledWith('transaction_workflows');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('id', '=', 'workflow-uuid-1');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('version', '=', 1);
      expect(mockDb.chainable.returningAll).toHaveBeenCalled();
      expect(result.state).toBe('review');
      expect(result.version).toBe(2);
    });

    it('throws ConcurrentModificationError on version mismatch', async () => {
      mockDb.mockExecuteTakeFirst.mockResolvedValue(undefined);

      await expect(
        repository.update('workflow-uuid-1', 5, { state: 'failed' })
      ).rejects.toThrow(ConcurrentModificationError);
    });

    it('updates context fields', async () => {
      const updatedWorkflowRow = createMockWorkflowRow({
        state: 'completed',
        tx_hash: '0xhash123',
        signature: '0xsig456',
        block_number: 54321,
        version: 3,
        context: {
          vaultId: 'vault-123',
          chainAlias: 'eth-mainnet',
          marshalledHex: '0xabc123',
          organisationId: 'org-123',
          createdBy: { id: 'user-1', type: 'User' },
          skipReview: false,
          approvers: [],
          approvedBy: null,
          signature: '0xsig456',
          txHash: '0xhash123',
          blockNumber: 54321,
          broadcastAttempts: 1,
          maxBroadcastAttempts: 3,
          error: null,
          failedAt: null,
        },
      });
      mockDb.mockExecuteTakeFirst.mockResolvedValue(updatedWorkflowRow);

      const result = await repository.update('workflow-uuid-1', 2, {
        state: 'completed',
        txHash: '0xhash123',
        signature: '0xsig456',
        blockNumber: 54321,
        context: {
          vaultId: 'vault-123',
          chainAlias: 'eth-mainnet',
          marshalledHex: '0xabc123',
          organisationId: 'org-123',
          createdBy: { id: 'user-1', type: 'User' },
          skipReview: false,
          approvers: [],
          approvedBy: null,
          signature: '0xsig456',
          txHash: '0xhash123',
          blockNumber: 54321,
          broadcastAttempts: 1,
          maxBroadcastAttempts: 3,
          error: null,
          failedAt: null,
        },
      });

      expect(result.txHash).toBe('0xhash123');
      expect(result.signature).toBe('0xsig456');
      expect(result.blockNumber).toBe(54321);
    });

    it('converts camelCase input to snake_case for database', async () => {
      const updatedWorkflowRow = createMockWorkflowRow({
        state: 'broadcasting',
        tx_hash: '0xhash',
        version: 2,
      });
      mockDb.mockExecuteTakeFirst.mockResolvedValue(updatedWorkflowRow);

      await repository.update('workflow-uuid-1', 1, {
        state: 'broadcasting',
        txHash: '0xhash',
      });

      expect(mockDb.chainable.set).toHaveBeenCalledWith(expect.objectContaining({
        state: 'broadcasting',
        tx_hash: '0xhash',
        version: 2,
      }));
    });
  });

  describe('addEvent', () => {
    it('adds workflow event record', async () => {
      const eventRow = {
        id: 'event-uuid-1',
        workflow_id: 'workflow-uuid-1',
        event_type: 'START',
        event_payload: {},
        from_state: 'created',
        to_state: 'review',
        context_snapshot: {},
        triggered_by: 'user-1',
        created_at: new Date('2024-01-15T10:00:00Z'),
      };
      mockDb.mockExecuteTakeFirstOrThrow.mockResolvedValue(eventRow);

      const result = await repository.addEvent({
        workflowId: 'workflow-uuid-1',
        eventType: 'START',
        eventPayload: {},
        fromState: 'created',
        toState: 'review',
        contextSnapshot: {},
        triggeredBy: 'user-1',
      });

      expect(mockDb.mockDb.insertInto).toHaveBeenCalledWith('transaction_workflow_events');
      expect(mockDb.chainable.values).toHaveBeenCalledWith(expect.objectContaining({
        workflow_id: 'workflow-uuid-1',
        event_type: 'START',
        from_state: 'created',
        to_state: 'review',
        triggered_by: 'user-1',
      }));
      expect(result.id).toBe('event-uuid-1');
      expect(result.eventType).toBe('START');
    });
  });

  describe('findEventsByWorkflowId', () => {
    it('returns events for workflow ordered by creation time', async () => {
      const eventRows = [
        {
          id: 'event-1',
          workflow_id: 'workflow-uuid-1',
          event_type: 'START',
          event_payload: {},
          from_state: 'created',
          to_state: 'review',
          context_snapshot: {},
          triggered_by: 'user-1',
          created_at: new Date('2024-01-15T10:00:00Z'),
        },
        {
          id: 'event-2',
          workflow_id: 'workflow-uuid-1',
          event_type: 'CONFIRM',
          event_payload: {},
          from_state: 'review',
          to_state: 'evaluating_policies',
          context_snapshot: {},
          triggered_by: 'user-1',
          created_at: new Date('2024-01-15T10:05:00Z'),
        },
      ];
      mockDb.mockExecute.mockResolvedValue(eventRows);

      const result = await repository.findEventsByWorkflowId('workflow-uuid-1');

      expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('transaction_workflow_events');
      expect(mockDb.chainable.where).toHaveBeenCalledWith('workflow_id', '=', 'workflow-uuid-1');
      expect(mockDb.chainable.orderBy).toHaveBeenCalledWith('created_at', 'asc');
      expect(result).toHaveLength(2);
      expect(result[0]!.eventType).toBe('START');
      expect(result[1]!.eventType).toBe('CONFIRM');
    });

    it('returns empty array when no events found', async () => {
      mockDb.mockExecute.mockResolvedValue([]);

      const result = await repository.findEventsByWorkflowId('workflow-with-no-events');

      expect(result).toEqual([]);
    });
  });
});
