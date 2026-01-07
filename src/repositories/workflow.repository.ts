import type { Kysely } from 'kysely';
import type { Database } from '@/src/lib/database/types.js';
import type {
  Workflow,
  WorkflowContext,
  WorkflowEventRecord,
} from '@/src/services/workflow/types.js';
import { ConcurrentModificationError } from '@/src/services/workflow/errors.js';

export interface CreateWorkflowInput {
  vaultId: string;
  chainAlias: string;
  marshalledHex: string;
  organisationId: string;
  createdBy: { id: string; type: string };
  skipReview?: boolean;
}

export interface UpdateWorkflowInput {
  state?: string;
  txHash?: string;
  signature?: string;
  blockNumber?: number;
  context?: WorkflowContext;
}

export interface AddEventInput {
  workflowId: string;
  eventType: string;
  eventPayload: Record<string, unknown>;
  fromState: string;
  toState: string;
  contextSnapshot: Record<string, unknown>;
  triggeredBy: string;
}

// Database row types (snake_case)
interface WorkflowRow {
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
}

interface WorkflowEventRow {
  id: string;
  workflow_id: string;
  event_type: string;
  event_payload: Record<string, unknown>;
  from_state: string;
  to_state: string;
  context_snapshot: Record<string, unknown>;
  triggered_by: string | null;
  created_at: Date;
}

function mapRowToWorkflow(row: WorkflowRow): Workflow {
  return {
    id: row.id,
    state: row.state as Workflow['state'],
    context: row.context as unknown as WorkflowContext,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    vaultId: row.vault_id,
    chainAlias: row.chain_alias,
    marshalledHex: row.marshalled_hex,
    organisationId: row.organisation_id,
    createdBy: row.created_by,
    txHash: row.tx_hash,
    signature: row.signature,
    blockNumber: row.block_number,
    completedAt: row.completed_at,
  };
}

function mapRowToEvent(row: WorkflowEventRow): WorkflowEventRecord {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    eventType: row.event_type,
    eventPayload: row.event_payload,
    fromState: row.from_state,
    toState: row.to_state,
    triggeredBy: row.triggered_by,
    createdAt: row.created_at,
  };
}

export class WorkflowRepository {
  constructor(private db: Kysely<Database>) {}

  async create(input: CreateWorkflowInput): Promise<Workflow> {
    const context: WorkflowContext = {
      vaultId: input.vaultId,
      chainAlias: input.chainAlias,
      marshalledHex: input.marshalledHex,
      organisationId: input.organisationId,
      createdBy: input.createdBy as { id: string; type: 'User' | 'System' | 'Webhook' },
      skipReview: input.skipReview ?? false,
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

    const row = await this.db
      .insertInto('transaction_workflows')
      .values({
        vault_id: input.vaultId,
        chain_alias: input.chainAlias,
        marshalled_hex: input.marshalledHex,
        organisation_id: input.organisationId,
        created_by: input.createdBy,
        state: 'created',
        context: context as unknown as Record<string, unknown>,
        tx_hash: null,
        signature: null,
        block_number: null,
        completed_at: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return mapRowToWorkflow(row as unknown as WorkflowRow);
  }

  async findById(id: string): Promise<Workflow | null> {
    const row = await this.db
      .selectFrom('transaction_workflows')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!row) {
      return null;
    }

    return mapRowToWorkflow(row as unknown as WorkflowRow);
  }

  async findByIdForUpdate(id: string): Promise<Workflow | null> {
    const result = await this.db
      .selectFrom('transaction_workflows')
      .selectAll()
      .where('id', '=', id)
      .forUpdate()
      .executeTakeFirst();

    if (!result) {
      return null;
    }

    return mapRowToWorkflow(result as unknown as WorkflowRow);
  }

  async update(
    id: string,
    expectedVersion: number,
    input: UpdateWorkflowInput
  ): Promise<Workflow> {
    const updateValues: Record<string, unknown> = {
      version: expectedVersion + 1,
      updated_at: new Date(),
    };

    if (input.state !== undefined) {
      updateValues.state = input.state;
    }
    if (input.txHash !== undefined) {
      updateValues.tx_hash = input.txHash;
    }
    if (input.signature !== undefined) {
      updateValues.signature = input.signature;
    }
    if (input.blockNumber !== undefined) {
      updateValues.block_number = input.blockNumber;
    }
    if (input.context !== undefined) {
      updateValues.context = input.context;
    }

    const row = await this.db
      .updateTable('transaction_workflows')
      .set(updateValues)
      .where('id', '=', id)
      .where('version', '=', expectedVersion)
      .returningAll()
      .executeTakeFirst();

    if (!row) {
      throw new ConcurrentModificationError(id);
    }

    return mapRowToWorkflow(row as unknown as WorkflowRow);
  }

  async addEvent(input: AddEventInput): Promise<WorkflowEventRecord> {
    const row = await this.db
      .insertInto('transaction_workflow_events')
      .values({
        workflow_id: input.workflowId,
        event_type: input.eventType,
        event_payload: input.eventPayload,
        from_state: input.fromState,
        to_state: input.toState,
        context_snapshot: input.contextSnapshot,
        triggered_by: input.triggeredBy,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return mapRowToEvent(row as unknown as WorkflowEventRow);
  }

  async findEventsByWorkflowId(workflowId: string): Promise<WorkflowEventRecord[]> {
    const rows = await this.db
      .selectFrom('transaction_workflow_events')
      .selectAll()
      .where('workflow_id', '=', workflowId)
      .orderBy('created_at', 'asc')
      .execute();

    return rows.map((row) => mapRowToEvent(row as unknown as WorkflowEventRow));
  }
}
