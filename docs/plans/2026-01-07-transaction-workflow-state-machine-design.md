# Transaction Workflow State Machine Design

## Overview

A transaction workflow state machine using XState v5 with PostgreSQL persistence. Designed to work across load-balanced instances, provide detailed audit trails, and be easily extendable.

## Requirements

- **Distributed state**: Any server instance can process any request - state persisted in PostgreSQL
- **Audit logging**: Full event history with context snapshots, queryable via API and logs
- **Extensibility**: Support new states, transaction types, and custom hooks via code changes
- **Retry logic**: Smart retry for transient broadcast failures, immediate fail for semantic errors

## State Flow

```
created
    │
    ▼ START
    │
    ├─ skipReview=true ──────────────┐
    │                                │
    ▼                                │
  review                             │
    │                                │
    ├─ CONFIRM ──────────────────────┤
    └─ CANCEL ───────► failed        │
                                     │
                                     ▼
                          evaluating_policies
                                     │
    ┌────────────────────────────────┼────────────────────────────────┐
    │                                │                                │
    ▼                                ▼                                ▼
POLICIES_PASSED            POLICIES_REQUIRE_APPROVAL          POLICIES_REJECTED
    │                                │                                │
    │                                ▼                                ▼
    │                         waiting_approval                     failed
    │                                │
    │                    ┌───────────┴───────────┐
    │                    │                       │
    │                 APPROVE                  REJECT
    │                    │                       │
    │                    ▼                       ▼
    └──────────────► approved                 failed
                         │
                         ▼ REQUEST_SIGNATURE
                  waiting_signature
                         │
         ┌───────────────┴───────────────┐
         │                               │
   SIGNATURE_RECEIVED              SIGNATURE_FAILED
         │                               │
         ▼                               ▼
    broadcasting                      failed
         │
         ├─ BROADCAST_SUCCESS ──► indexing
         ├─ BROADCAST_RETRY ─────► (self, with backoff)
         └─ BROADCAST_FAILED ───► failed
                                     │
                  ┌──────────────────┘
                  ▼
              indexing
                  │
                  ├─ INDEXING_COMPLETE ──► completed
                  └─ INDEXING_FAILED ────► failed
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         API Layer                                │
│  POST /transactions (create)    POST /transactions/:id/approve  │
│  POST /transactions/:id/confirm POST /transactions/:id/reject   │
│  POST /webhooks/signature       GET /transactions/:id/history   │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Workflow Orchestrator                         │
│  - Loads/creates workflow instances                              │
│  - Sends events to state machines                                │
│  - Persists state after each transition                          │
│  - Emits audit events                                            │
└─────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │ Policy   │ │ Signing  │ │ Broadcast│
              │ Service  │ │ Service  │ │ Service  │
              └──────────┘ └──────────┘ └──────────┘
                    │             │             │
                    ▼             ▼             ▼
              External       External      Blockchain
              Policy         Signing         RPCs
              Engine         System
```

### Key Design Decisions

- **Stateless handlers**: Any server instance can process any request - state comes from PostgreSQL
- **Optimistic locking**: Version column prevents concurrent modifications
- **Event-driven**: All state changes triggered by explicit events, making the flow auditable
- **Separation of concerns**: State machine defines *what* happens, services define *how*

## Database Schema

```sql
-- Main workflow table
CREATE TABLE transaction_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Workflow state
    state VARCHAR(50) NOT NULL DEFAULT 'created',
    context JSONB NOT NULL DEFAULT '{}',

    -- Transaction data
    vault_id VARCHAR(100) NOT NULL,
    chain_alias VARCHAR(50) NOT NULL,
    marshalled_hex TEXT NOT NULL,
    organisation_id VARCHAR(100) NOT NULL,
    created_by JSONB NOT NULL,

    -- Results populated during workflow
    tx_hash VARCHAR(255),
    signature TEXT,
    block_number BIGINT,

    -- Optimistic locking
    version INTEGER NOT NULL DEFAULT 1,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- Indexes for common queries
    CONSTRAINT valid_state CHECK (state IN (
        'created', 'review', 'evaluating_policies', 'waiting_approval',
        'approved', 'waiting_signature', 'broadcasting', 'indexing',
        'completed', 'failed'
    ))
);

CREATE INDEX idx_workflows_state ON transaction_workflows(state);
CREATE INDEX idx_workflows_org ON transaction_workflows(organisation_id);
CREATE INDEX idx_workflows_vault ON transaction_workflows(vault_id);

-- Event history for audit trail
CREATE TABLE transaction_workflow_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES transaction_workflows(id),

    -- Event data
    event_type VARCHAR(100) NOT NULL,
    event_payload JSONB NOT NULL DEFAULT '{}',

    -- State transition
    from_state VARCHAR(50) NOT NULL,
    to_state VARCHAR(50) NOT NULL,

    -- Context snapshot at time of event
    context_snapshot JSONB NOT NULL,

    -- Metadata
    triggered_by VARCHAR(255),  -- user ID, 'system', 'webhook', etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_workflow ON transaction_workflow_events(workflow_id);
CREATE INDEX idx_events_created ON transaction_workflow_events(created_at);
```

### Schema Notes

- `context` stores XState context (retry counts, error messages, approvers list, etc.)
- `version` enables optimistic locking - increment on every update, reject if stale
- `context_snapshot` in events table allows full reconstruction of state at any point
- `triggered_by` tracks who/what caused each transition for audit purposes

## XState Machine Definition

```typescript
// src/services/workflow/machine.ts

import { setup, assign } from 'xstate';

interface WorkflowContext {
  // Transaction data
  vaultId: string;
  chainAlias: string;
  marshalledHex: string;
  organisationId: string;
  createdBy: Originator;

  // Runtime data
  skipReview: boolean;
  approvers: string[];
  approvedBy: string | null;
  signature: string | null;
  txHash: string | null;
  blockNumber: number | null;

  // Retry tracking
  broadcastAttempts: number;
  maxBroadcastAttempts: number;

  // Error tracking
  error: string | null;
  failedAt: string | null;
}

type WorkflowState =
  | 'created'
  | 'review'
  | 'evaluating_policies'
  | 'waiting_approval'
  | 'approved'
  | 'waiting_signature'
  | 'broadcasting'
  | 'indexing'
  | 'completed'
  | 'failed';

type WorkflowEvent =
  | { type: 'START'; skipReview?: boolean }
  | { type: 'CONFIRM' }
  | { type: 'CANCEL'; reason?: string }
  | { type: 'EVALUATE_POLICIES' }
  | { type: 'POLICIES_PASSED' }
  | { type: 'POLICIES_REQUIRE_APPROVAL'; approvers: string[] }
  | { type: 'POLICIES_REJECTED'; reason: string }
  | { type: 'APPROVE'; approvedBy: string }
  | { type: 'REJECT'; rejectedBy: string; reason: string }
  | { type: 'REQUEST_SIGNATURE' }
  | { type: 'SIGNATURE_RECEIVED'; signature: string }
  | { type: 'SIGNATURE_FAILED'; reason: string }
  | { type: 'BROADCAST' }
  | { type: 'BROADCAST_SUCCESS'; txHash: string }
  | { type: 'BROADCAST_RETRY'; error: string; attempt: number }
  | { type: 'BROADCAST_FAILED'; error: string }
  | { type: 'INDEXING_COMPLETE'; blockNumber: number }
  | { type: 'INDEXING_FAILED'; error: string };

export const transactionMachine = setup({
  types: {
    context: {} as WorkflowContext,
    events: {} as WorkflowEvent,
  },

  guards: {
    shouldSkipReview: ({ context }) => context.skipReview,
    canRetryBroadcast: ({ context }) =>
      context.broadcastAttempts < context.maxBroadcastAttempts,
  },

  actions: {
    recordApproval: assign({
      approvedBy: (_, params: { approvedBy: string }) => params.approvedBy,
    }),
    recordSignature: assign({
      signature: (_, params: { signature: string }) => params.signature,
    }),
    recordTxHash: assign({
      txHash: (_, params: { txHash: string }) => params.txHash,
    }),
    incrementBroadcastAttempts: assign({
      broadcastAttempts: ({ context }) => context.broadcastAttempts + 1,
    }),
    recordFailure: assign({
      error: (_, params: { error: string }) => params.error,
      failedAt: (_, params: { state: string }) => params.state,
    }),
  },
}).createMachine({
  id: 'transactionWorkflow',
  initial: 'created',
  context: ({ input }) => ({
    ...input,
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
  }),

  states: {
    created: {
      on: {
        START: [
          { target: 'evaluating_policies', guard: 'shouldSkipReview' },
          { target: 'review' },
        ],
      },
    },

    review: {
      on: {
        CONFIRM: { target: 'evaluating_policies' },
        CANCEL: {
          target: 'failed',
          actions: {
            type: 'recordFailure',
            params: { error: 'Cancelled by user', state: 'review' }
          }
        },
      },
    },

    evaluating_policies: {
      on: {
        POLICIES_PASSED: { target: 'approved' },
        POLICIES_REQUIRE_APPROVAL: {
          target: 'waiting_approval',
          actions: assign({ approvers: (_, e) => e.approvers }),
        },
        POLICIES_REJECTED: {
          target: 'failed',
          actions: {
            type: 'recordFailure',
            params: ({ event }) => ({ error: event.reason, state: 'evaluating_policies' })
          }
        },
      },
    },

    waiting_approval: {
      on: {
        APPROVE: {
          target: 'approved',
          actions: {
            type: 'recordApproval',
            params: ({ event }) => ({ approvedBy: event.approvedBy })
          }
        },
        REJECT: {
          target: 'failed',
          actions: {
            type: 'recordFailure',
            params: ({ event }) => ({ error: event.reason, state: 'waiting_approval' })
          }
        },
      },
    },

    approved: {
      on: {
        REQUEST_SIGNATURE: { target: 'waiting_signature' },
      },
    },

    waiting_signature: {
      on: {
        SIGNATURE_RECEIVED: {
          target: 'broadcasting',
          actions: {
            type: 'recordSignature',
            params: ({ event }) => ({ signature: event.signature })
          }
        },
        SIGNATURE_FAILED: {
          target: 'failed',
          actions: {
            type: 'recordFailure',
            params: ({ event }) => ({ error: event.reason, state: 'waiting_signature' })
          }
        },
      },
    },

    broadcasting: {
      on: {
        BROADCAST_SUCCESS: {
          target: 'indexing',
          actions: {
            type: 'recordTxHash',
            params: ({ event }) => ({ txHash: event.txHash })
          }
        },
        BROADCAST_RETRY: [
          {
            target: 'broadcasting',
            guard: 'canRetryBroadcast',
            actions: 'incrementBroadcastAttempts'
          },
          {
            target: 'failed',
            actions: {
              type: 'recordFailure',
              params: ({ event }) => ({ error: event.error, state: 'broadcasting' })
            }
          },
        ],
        BROADCAST_FAILED: {
          target: 'failed',
          actions: {
            type: 'recordFailure',
            params: ({ event }) => ({ error: event.error, state: 'broadcasting' })
          }
        },
      },
    },

    indexing: {
      on: {
        INDEXING_COMPLETE: {
          target: 'completed',
          actions: assign({ blockNumber: (_, e) => e.blockNumber })
        },
        INDEXING_FAILED: {
          target: 'failed',
          actions: {
            type: 'recordFailure',
            params: ({ event }) => ({ error: event.error, state: 'indexing' })
          }
        },
      },
    },

    completed: { type: 'final' },
    failed: { type: 'final' },
  },
});
```

## Workflow Orchestrator

```typescript
// src/services/workflow/orchestrator.ts

interface WorkflowOrchestrator {
  create(params: CreateWorkflowParams): Promise<Workflow>;
  send(workflowId: string, event: WorkflowEvent, triggeredBy: string): Promise<Workflow>;
  get(workflowId: string): Promise<Workflow | null>;
  getHistory(workflowId: string): Promise<WorkflowEvent[]>;
}

class WorkflowOrchestratorImpl implements WorkflowOrchestrator {
  constructor(
    private db: Kysely<Database>,
    private logger: Logger,
    private services: {
      policy: PolicyService;
      signing: SigningService;
      broadcast: BroadcastService;
      indexing: IndexingService;
    }
  ) {}

  async send(workflowId: string, event: WorkflowEvent, triggeredBy: string): Promise<Workflow> {
    // 1. Load current state from DB with row lock
    const workflow = await this.loadWithLock(workflowId);

    // 2. Create XState actor from persisted state
    const actor = createActor(transactionMachine, {
      snapshot: workflow.toSnapshot(),
    });

    // 3. Capture previous state
    const fromState = actor.getSnapshot().value;

    // 4. Send event
    actor.start();
    actor.send(event);
    const snapshot = actor.getSnapshot();

    // 5. Persist new state + event record (atomic transaction)
    await this.db.transaction().execute(async (trx) => {
      await this.updateWorkflow(trx, workflowId, snapshot, workflow.version);
      await this.recordEvent(trx, workflowId, event, fromState, snapshot, triggeredBy);
    });

    // 6. Log for observability
    this.logger.info('Workflow transition', {
      workflowId,
      event: event.type,
      fromState,
      toState: snapshot.value,
      triggeredBy,
    });

    // 7. Trigger side effects (non-blocking)
    this.handleSideEffects(workflowId, snapshot);

    return this.toWorkflow(snapshot);
  }

  async updateWorkflow(
    trx: Transaction,
    id: string,
    snapshot: Snapshot,
    expectedVersion: number
  ) {
    const result = await trx
      .updateTable('transaction_workflows')
      .set({
        state: snapshot.value,
        context: JSON.stringify(snapshot.context),
        version: expectedVersion + 1,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .where('version', '=', expectedVersion)
      .executeTakeFirst();

    if (result.numUpdatedRows === 0n) {
      throw new ConcurrentModificationError(id);
    }
  }
}
```

## API Routes

```typescript
// src/routes/transactions/workflow/index.ts

export async function workflowRoutes(server: FastifyInstance) {
  const orchestrator = server.services.workflowOrchestrator;

  // Create transaction workflow
  server.post<{ Body: CreateTransactionBody }>(
    '/transactions',
    { schema: createTransactionSchema },
    async (request, reply) => {
      const { skipReview, ...transactionData } = request.body;
      const { organisationId, userId } = request.auth;

      const { marshalledHex } = await server.services.buildTransaction.build(transactionData);

      const workflow = await orchestrator.create({
        ...transactionData,
        marshalledHex,
        organisationId,
        createdBy: { id: userId, type: 'User' },
        skipReview: skipReview ?? false,
      });

      await orchestrator.send(workflow.id, { type: 'START', skipReview }, userId);

      if (skipReview) {
        await triggerPolicyEvaluation(workflow.id);
      }

      return reply.status(201).send({ id: workflow.id, state: workflow.state });
    }
  );

  // Confirm review step
  server.post<{ Params: { id: string } }>(
    '/transactions/:id/confirm',
    { schema: confirmSchema },
    async (request, reply) => {
      const { id } = request.params;
      const { userId } = request.auth;

      const workflow = await orchestrator.send(id, { type: 'CONFIRM' }, userId);
      await triggerPolicyEvaluation(id);

      return reply.send({ id, state: workflow.state });
    }
  );

  // Approve (for policy-required approvals)
  server.post<{ Params: { id: string } }>(
    '/transactions/:id/approve',
    { schema: approveSchema },
    async (request, reply) => {
      const { id } = request.params;
      const { userId } = request.auth;

      const workflow = await orchestrator.send(
        id,
        { type: 'APPROVE', approvedBy: userId },
        userId
      );

      await triggerSignatureRequest(id);

      return reply.send({ id, state: workflow.state });
    }
  );

  // Reject approval
  server.post<{ Params: { id: string }; Body: { reason: string } }>(
    '/transactions/:id/reject',
    { schema: rejectSchema },
    async (request, reply) => {
      const { id } = request.params;
      const { reason } = request.body;
      const { userId } = request.auth;

      const workflow = await orchestrator.send(
        id,
        { type: 'REJECT', rejectedBy: userId, reason },
        userId
      );

      return reply.send({ id, state: workflow.state });
    }
  );

  // Get workflow status
  server.get<{ Params: { id: string } }>(
    '/transactions/:id',
    { schema: getWorkflowSchema },
    async (request, reply) => {
      const workflow = await orchestrator.get(request.params.id);
      if (!workflow) {
        throw new NotFoundError('Workflow not found');
      }
      return reply.send(workflow);
    }
  );

  // Get audit history
  server.get<{ Params: { id: string } }>(
    '/transactions/:id/history',
    { schema: historySchema },
    async (request, reply) => {
      const events = await orchestrator.getHistory(request.params.id);
      return reply.send({ events });
    }
  );
}
```

### Signature Webhook Handler

```typescript
// src/routes/webhooks/signature.ts

server.post<{ Body: SignatureWebhookPayload }>(
  '/webhooks/signature',
  { schema: signatureWebhookSchema },
  async (request, reply) => {
    const { workflowId, requestId, signature, success, error } = request.body;

    // Idempotency check
    const existing = await db
      .selectFrom('transaction_workflow_events')
      .where('workflow_id', '=', workflowId)
      .where("event_payload->>'requestId'", '=', requestId)
      .executeTakeFirst();

    if (existing) {
      return reply.status(200).send({ received: true, duplicate: true });
    }

    // State check
    const workflow = await orchestrator.get(workflowId);
    if (!workflow || workflow.state !== 'waiting_signature') {
      return reply.status(200).send({ received: true, ignored: true });
    }

    if (success) {
      await orchestrator.send(
        workflowId,
        { type: 'SIGNATURE_RECEIVED', signature },
        'webhook:signing-service'
      );
      await triggerBroadcast(workflowId);
    } else {
      await orchestrator.send(
        workflowId,
        { type: 'SIGNATURE_FAILED', reason: error },
        'webhook:signing-service'
      );
    }

    return reply.status(200).send({ received: true });
  }
);
```

## Side Effect Services

### Policy Service

```typescript
// src/services/workflow/side-effects/policy-service.ts

export class PolicyService {
  constructor(
    private orchestrator: WorkflowOrchestrator,
    private policyEngineClient: PolicyEngineClient,
    private logger: Logger
  ) {}

  async evaluate(workflowId: string): Promise<void> {
    const workflow = await this.orchestrator.get(workflowId);
    if (!workflow || workflow.state !== 'evaluating_policies') {
      return;
    }

    try {
      const result = await this.policyEngineClient.evaluate({
        vaultId: workflow.context.vaultId,
        chainAlias: workflow.context.chainAlias,
        marshalledHex: workflow.context.marshalledHex,
        organisationId: workflow.context.organisationId,
      });

      if (result.approved) {
        await this.orchestrator.send(
          workflowId,
          { type: 'POLICIES_PASSED' },
          'system:policy-service'
        );
        await this.triggerNextStep(workflowId);
      } else if (result.requiresApproval) {
        await this.orchestrator.send(
          workflowId,
          { type: 'POLICIES_REQUIRE_APPROVAL', approvers: result.approvers },
          'system:policy-service'
        );
      } else {
        await this.orchestrator.send(
          workflowId,
          { type: 'POLICIES_REJECTED', reason: result.reason },
          'system:policy-service'
        );
      }
    } catch (error) {
      this.logger.error('Policy evaluation failed', { workflowId, error });
      await this.orchestrator.send(
        workflowId,
        { type: 'POLICIES_REJECTED', reason: 'Policy evaluation error' },
        'system:policy-service'
      );
    }
  }
}
```

### Broadcast Service

```typescript
// src/services/workflow/side-effects/broadcast-service.ts

export class BroadcastService {
  constructor(
    private orchestrator: WorkflowOrchestrator,
    private rpcClients: ChainRpcClients,
    private logger: Logger
  ) {}

  async broadcast(workflowId: string): Promise<void> {
    const workflow = await this.orchestrator.get(workflowId);
    if (!workflow || workflow.state !== 'broadcasting') {
      return;
    }

    const { chainAlias, marshalledHex, signature } = workflow.context;

    try {
      const signedTx = await this.assembleSignedTransaction(
        chainAlias,
        marshalledHex,
        signature
      );

      const txHash = await this.rpcClients.get(chainAlias).broadcast(signedTx);

      await this.orchestrator.send(
        workflowId,
        { type: 'BROADCAST_SUCCESS', txHash },
        'system:broadcast-service'
      );

      await this.triggerIndexing(workflowId);

    } catch (error) {
      const errorMsg = error.message;

      if (this.isTransientError(errorMsg)) {
        this.logger.warn('Broadcast transient failure, will retry', { workflowId, error: errorMsg });
        await this.orchestrator.send(
          workflowId,
          { type: 'BROADCAST_RETRY', error: errorMsg, attempt: workflow.context.broadcastAttempts + 1 },
          'system:broadcast-service'
        );
        await this.scheduleRetry(workflowId, workflow.context.broadcastAttempts);
      } else {
        this.logger.error('Broadcast permanent failure', { workflowId, error: errorMsg });
        await this.orchestrator.send(
          workflowId,
          { type: 'BROADCAST_FAILED', error: errorMsg },
          'system:broadcast-service'
        );
      }
    }
  }

  private isTransientError(error: string): boolean {
    const transientPatterns = [
      /timeout/i,
      /network/i,
      /unavailable/i,
      /rate limit/i,
      /503/,
      /502/,
    ];
    return transientPatterns.some(p => p.test(error));
  }

  private async scheduleRetry(workflowId: string, attempt: number): Promise<void> {
    const delayMs = Math.min(1000 * Math.pow(2, attempt), 30000);
    setTimeout(() => this.broadcast(workflowId), delayMs);
  }
}
```

## Error Handling

### Custom Errors

```typescript
// src/services/workflow/errors.ts

export class ConcurrentModificationError extends Error {
  constructor(workflowId: string) {
    super(`Workflow ${workflowId} was modified by another request`);
    this.name = 'ConcurrentModificationError';
  }
}

export class InvalidStateTransitionError extends Error {
  constructor(workflowId: string, currentState: string, event: string) {
    super(`Cannot send '${event}' to workflow ${workflowId} in state '${currentState}'`);
    this.name = 'InvalidStateTransitionError';
  }
}

export class WorkflowNotFoundError extends Error {
  constructor(workflowId: string) {
    super(`Workflow ${workflowId} not found`);
    this.name = 'WorkflowNotFoundError';
  }
}
```

### Retry Logic with Optimistic Locking

```typescript
async send(
  workflowId: string,
  event: WorkflowEvent,
  triggeredBy: string,
  options: { maxRetries?: number } = {}
): Promise<Workflow> {
  const maxRetries = options.maxRetries ?? 3;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await this.doSend(workflowId, event, triggeredBy);
    } catch (error) {
      if (error instanceof ConcurrentModificationError && attempt < maxRetries) {
        this.logger.warn('Concurrent modification, retrying', {
          workflowId,
          attempt: attempt + 1,
          maxRetries
        });
        await this.delay(50 * Math.pow(2, attempt));
        continue;
      }
      throw error;
    }
  }
}
```

### Stuck Workflow Detection

```typescript
// src/plugins/workflow-monitor.ts

export async function workflowMonitorPlugin(server: FastifyInstance) {
  const STUCK_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

  setInterval(async () => {
    const stuckWorkflows = await server.db
      .selectFrom('transaction_workflows')
      .select(['id', 'state', 'updated_at'])
      .where('state', 'not in', ['completed', 'failed'])
      .where('updated_at', '<', new Date(Date.now() - STUCK_THRESHOLD_MS))
      .execute();

    for (const workflow of stuckWorkflows) {
      server.log.warn('Stuck workflow detected', {
        workflowId: workflow.id,
        state: workflow.state,
        stuckSince: workflow.updated_at,
      });

      await attemptRecovery(server, workflow);
    }
  }, 5 * 60 * 1000);
}

async function attemptRecovery(server: FastifyInstance, workflow: StuckWorkflow) {
  switch (workflow.state) {
    case 'evaluating_policies':
      await server.services.policyService.evaluate(workflow.id);
      break;
    case 'broadcasting':
      await server.services.broadcastService.broadcast(workflow.id);
      break;
    case 'indexing':
      await server.services.indexingService.startIndexing(workflow.id);
      break;
    default:
      server.log.error('Workflow requires manual intervention', { workflowId: workflow.id });
  }
}
```

## Logging and Audit Trail

### Structured Logging

```typescript
private async recordEvent(
  trx: Transaction,
  workflowId: string,
  event: WorkflowEvent,
  fromState: string,
  snapshot: Snapshot,
  triggeredBy: string
): Promise<void> {
  const eventRecord = {
    id: randomUUID(),
    workflow_id: workflowId,
    event_type: event.type,
    event_payload: JSON.stringify(event),
    from_state: fromState,
    to_state: snapshot.value as string,
    context_snapshot: JSON.stringify(snapshot.context),
    triggered_by: triggeredBy,
    created_at: new Date(),
  };

  await trx
    .insertInto('transaction_workflow_events')
    .values(eventRecord)
    .execute();

  this.logger.info('workflow.transition', {
    workflowId,
    eventType: event.type,
    fromState,
    toState: snapshot.value,
    triggeredBy,
    context: this.sanitizeContext(snapshot.context),
    timestamp: eventRecord.created_at.toISOString(),
  });
}

private sanitizeContext(context: WorkflowContext): Partial<WorkflowContext> {
  const { marshalledHex, signature, ...safe } = context;
  return {
    ...safe,
    marshalledHex: marshalledHex ? '[REDACTED]' : null,
    signature: signature ? '[REDACTED]' : null,
  };
}
```

### History API Response

```json
{
  "workflowId": "abc-123",
  "history": [
    {
      "id": "evt-1",
      "event": "START",
      "fromState": "created",
      "toState": "review",
      "triggeredBy": "user:usr-456",
      "timestamp": "2026-01-07T10:00:00Z",
      "details": { "skipReview": false }
    },
    {
      "id": "evt-2",
      "event": "CONFIRM",
      "fromState": "review",
      "toState": "evaluating_policies",
      "triggeredBy": "user:usr-456",
      "timestamp": "2026-01-07T10:05:00Z",
      "details": {}
    }
  ],
  "pagination": {
    "nextCursor": null,
    "hasMore": false
  }
}
```

## File Structure

```
src/
├── routes/
│   ├── transactions/
│   │   └── workflow/
│   │       ├── index.ts              # Route registration
│   │       ├── handlers.ts           # Request handlers
│   │       └── schemas.ts            # Zod validation schemas
│   └── webhooks/
│       ├── index.ts                  # Webhook route registration
│       └── signature.ts              # Signature webhook handler
│
├── services/
│   └── workflow/
│       ├── index.ts                  # Exports
│       ├── orchestrator.ts           # WorkflowOrchestrator class
│       ├── machine.ts                # XState machine definition
│       ├── types.ts                  # TypeScript types
│       ├── errors.ts                 # Custom error classes
│       └── side-effects/
│           ├── index.ts              # Side effect coordinator
│           ├── policy-service.ts     # Policy engine integration
│           ├── signing-service.ts    # Signing system integration
│           ├── broadcast-service.ts  # Blockchain broadcast
│           └── indexing-service.ts   # Transaction indexing
│
├── repositories/
│   ├── workflow.ts                   # Workflow CRUD operations
│   └── workflow-events.ts            # Event history queries
│
├── plugins/
│   └── workflow-monitor.ts           # Stuck workflow detection
│
└── lib/
    └── database/
        └── migrations/
            └── 024_create_workflow_tables.ts
```

## Testing Strategy

### Unit Tests - State Machine

```typescript
// tests/unit/services/workflow/machine.test.ts

describe('transactionMachine', () => {
  describe('review step', () => {
    it('skips review when skipReview is true', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: true },
      });
      actor.start();
      actor.send({ type: 'START' });

      expect(actor.getSnapshot().value).toBe('evaluating_policies');
    });

    it('enters review when skipReview is false', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: false },
      });
      actor.start();
      actor.send({ type: 'START' });

      expect(actor.getSnapshot().value).toBe('review');
    });
  });

  describe('broadcast retries', () => {
    it('retries on transient failure up to max attempts', () => {
      const actor = createActorInState('broadcasting', { broadcastAttempts: 0 });

      actor.send({ type: 'BROADCAST_RETRY', error: 'timeout', attempt: 1 });
      expect(actor.getSnapshot().value).toBe('broadcasting');
      expect(actor.getSnapshot().context.broadcastAttempts).toBe(1);
    });

    it('fails after max attempts exceeded', () => {
      const actor = createActorInState('broadcasting', { broadcastAttempts: 3 });

      actor.send({ type: 'BROADCAST_RETRY', error: 'timeout', attempt: 4 });
      expect(actor.getSnapshot().value).toBe('failed');
    });
  });
});
```

### Unit Tests - Orchestrator

```typescript
// tests/unit/services/workflow/orchestrator.test.ts

describe('WorkflowOrchestrator', () => {
  it('persists state after transition', async () => {
    const { orchestrator, db } = createTestOrchestrator();
    const workflow = await orchestrator.create(testInput);

    await orchestrator.send(workflow.id, { type: 'START' }, 'user:123');

    const persisted = await db
      .selectFrom('transaction_workflows')
      .where('id', '=', workflow.id)
      .executeTakeFirst();
    expect(persisted.state).toBe('review');
  });

  it('records event in history', async () => {
    const { orchestrator, db } = createTestOrchestrator();
    const workflow = await orchestrator.create(testInput);

    await orchestrator.send(workflow.id, { type: 'START' }, 'user:123');

    const events = await db
      .selectFrom('transaction_workflow_events')
      .where('workflow_id', '=', workflow.id)
      .execute();
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe('START');
  });

  it('throws on concurrent modification', async () => {
    const { orchestrator, db } = createTestOrchestrator();
    const workflow = await orchestrator.create(testInput);

    await db
      .updateTable('transaction_workflows')
      .set({ version: 999 })
      .where('id', '=', workflow.id)
      .execute();

    await expect(orchestrator.send(workflow.id, { type: 'START' }, 'user:123'))
      .rejects.toThrow(ConcurrentModificationError);
  });
});
```

### Integration Tests - Full Flow

```typescript
// tests/integration/workflow/full-flow.test.ts

describe('Transaction Workflow E2E', () => {
  it('completes full happy path', async () => {
    const { server, mockPolicyEngine } = await createTestServer();

    // 1. Create transaction
    const createRes = await server.inject({
      method: 'POST',
      url: '/transactions',
      payload: { ...testTransaction, skipReview: true },
    });
    expect(createRes.statusCode).toBe(201);
    const { id } = createRes.json();

    // 2. Policy engine approves
    mockPolicyEngine.mockResolvedValue({ approved: true });
    await waitForState(id, 'approved');

    // 3. Signature webhook received
    await server.inject({
      method: 'POST',
      url: '/webhooks/signature',
      payload: { workflowId: id, success: true, signature: '0xabc...' },
    });
    await waitForState(id, 'indexing');

    // 4. Indexing completes
    await server.services.indexingService.onIndexingComplete(id, 12345678);

    // 5. Verify final state
    const workflow = await server.services.orchestrator.get(id);
    expect(workflow.state).toBe('completed');
    expect(workflow.context.blockNumber).toBe(12345678);
  });
});
```

## Dependencies

```json
{
  "dependencies": {
    "xstate": "^5.x"
  }
}
```

## Migration Notes

- Existing `create-transaction` legacy endpoint continues to work during transition
- New workflow endpoints registered under `/v2/transactions` initially
- Gradual migration of clients to new workflow-based API
