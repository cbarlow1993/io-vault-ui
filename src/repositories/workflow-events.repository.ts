import type { Kysely } from 'kysely';
import type { Database } from '@/src/lib/database/types.js';
import type { WorkflowEventRecord } from '@/src/services/workflow/types.js';

export interface CreateEventInput {
  workflowId: string;
  eventType: string;
  eventPayload: Record<string, unknown>;
  fromState: string;
  toState: string;
  contextSnapshot: Record<string, unknown>;
  triggeredBy: string;
}

// Database row type (snake_case)
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

export class WorkflowEventsRepository {
  constructor(private db: Kysely<Database>) {}

  /**
   * Creates a new workflow event record
   */
  async create(input: CreateEventInput): Promise<WorkflowEventRecord> {
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

  /**
   * Find all events for a workflow, ordered by created_at ascending
   */
  async findByWorkflowId(workflowId: string): Promise<WorkflowEventRecord[]> {
    const rows = await this.db
      .selectFrom('transaction_workflow_events')
      .selectAll()
      .where('workflow_id', '=', workflowId)
      .orderBy('created_at', 'asc')
      .execute();

    return rows.map((row) => mapRowToEvent(row as unknown as WorkflowEventRow));
  }

  /**
   * Find events for a workflow with cursor-based pagination
   * Uses the event id as the cursor for stable pagination
   */
  async findByWorkflowIdPaginated(
    workflowId: string,
    options: { limit: number; cursor?: string }
  ): Promise<{ events: WorkflowEventRecord[]; nextCursor: string | null }> {
    let query = this.db
      .selectFrom('transaction_workflow_events')
      .selectAll()
      .where('workflow_id', '=', workflowId)
      .orderBy('created_at', 'asc')
      .orderBy('id', 'asc')
      .limit(options.limit + 1); // Fetch one extra to determine if there's a next page

    if (options.cursor) {
      // The cursor is the id of the last event from the previous page
      // We need to fetch events created after that event
      query = query.where((eb) =>
        eb.or([
          eb(
            'created_at',
            '>',
            eb
              .selectFrom('transaction_workflow_events')
              .select('created_at')
              .where('id', '=', options.cursor!)
          ),
          eb.and([
            eb(
              'created_at',
              '=',
              eb
                .selectFrom('transaction_workflow_events')
                .select('created_at')
                .where('id', '=', options.cursor!)
            ),
            eb('id', '>', options.cursor!),
          ]),
        ])
      );
    }

    const rows = await query.execute();

    const hasNextPage = rows.length > options.limit;
    const events = rows
      .slice(0, options.limit)
      .map((row) => mapRowToEvent(row as unknown as WorkflowEventRow));

    const nextCursor = hasNextPage ? events[events.length - 1]?.id ?? null : null;

    return { events, nextCursor };
  }
}
