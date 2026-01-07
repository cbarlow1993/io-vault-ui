# Transaction Workflow State Machine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement an XState v5 transaction workflow state machine with PostgreSQL persistence, enabling distributed processing across load-balanced instances.

**Architecture:** Stateless API handlers send events to a WorkflowOrchestrator, which loads workflow state from PostgreSQL, creates an XState actor, processes the event, persists the new state atomically with an audit event, then triggers async side effects (policy evaluation, signing, broadcasting).

**Tech Stack:** XState v5, Kysely (PostgreSQL), Fastify, Zod

---

## Phase 1: Foundation

### Task 1: Install XState v5

**Files:**
- Modify: `package.json`

**Step 1: Install xstate**

Run:
```bash
npm install xstate
```

**Step 2: Verify installation**

Run:
```bash
npm ls xstate
```
Expected: `xstate@5.x.x`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add xstate v5 dependency"
```

---

### Task 2: Create Database Migration

**Files:**
- Create: `src/lib/database/migrations/024_create_workflow_tables.ts`

**Step 1: Create migration file**

```typescript
import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('transaction_workflows')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(db.fn('gen_random_uuid'))
    )
    .addColumn('state', 'varchar(50)', (col) => col.notNull().defaultTo('created'))
    .addColumn('context', 'jsonb', (col) => col.notNull().defaultTo('{}'))
    .addColumn('vault_id', 'varchar(100)', (col) => col.notNull())
    .addColumn('chain_alias', 'varchar(50)', (col) => col.notNull())
    .addColumn('marshalled_hex', 'text', (col) => col.notNull())
    .addColumn('organisation_id', 'varchar(100)', (col) => col.notNull())
    .addColumn('created_by', 'jsonb', (col) => col.notNull())
    .addColumn('tx_hash', 'varchar(255)')
    .addColumn('signature', 'text')
    .addColumn('block_number', 'bigint')
    .addColumn('version', 'integer', (col) => col.notNull().defaultTo(1))
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(db.fn('now'))
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(db.fn('now'))
    )
    .addColumn('completed_at', 'timestamptz')
    .execute();

  await db.schema
    .createIndex('idx_workflows_state')
    .on('transaction_workflows')
    .column('state')
    .execute();

  await db.schema
    .createIndex('idx_workflows_org')
    .on('transaction_workflows')
    .column('organisation_id')
    .execute();

  await db.schema
    .createIndex('idx_workflows_vault')
    .on('transaction_workflows')
    .column('vault_id')
    .execute();

  await db.schema
    .createTable('transaction_workflow_events')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(db.fn('gen_random_uuid'))
    )
    .addColumn('workflow_id', 'uuid', (col) =>
      col.notNull().references('transaction_workflows.id')
    )
    .addColumn('event_type', 'varchar(100)', (col) => col.notNull())
    .addColumn('event_payload', 'jsonb', (col) => col.notNull().defaultTo('{}'))
    .addColumn('from_state', 'varchar(50)', (col) => col.notNull())
    .addColumn('to_state', 'varchar(50)', (col) => col.notNull())
    .addColumn('context_snapshot', 'jsonb', (col) => col.notNull())
    .addColumn('triggered_by', 'varchar(255)')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(db.fn('now'))
    )
    .execute();

  await db.schema
    .createIndex('idx_events_workflow')
    .on('transaction_workflow_events')
    .column('workflow_id')
    .execute();

  await db.schema
    .createIndex('idx_events_created')
    .on('transaction_workflow_events')
    .column('created_at')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('transaction_workflow_events').execute();
  await db.schema.dropTable('transaction_workflows').execute();
}
```

**Step 2: Run migration**

Run:
```bash
npm run migrate:up
```
Expected: Migration applies successfully

**Step 3: Verify tables exist**

Run:
```bash
docker exec -it io-vault-postgres psql -U postgres -d io_vault -c "\dt transaction_workflow*"
```
Expected: Both tables listed

**Step 4: Commit**

```bash
git add src/lib/database/migrations/024_create_workflow_tables.ts
git commit -m "feat(db): add transaction workflow tables migration"
```

---

### Task 3: Add Database Types

**Files:**
- Modify: `src/lib/database/types.ts`

**Step 1: Add workflow table types**

Add to the Database interface:

```typescript
export interface TransactionWorkflowTable {
  id: Generated<string>;
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
  version: Generated<number>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  completed_at: Date | null;
}

export interface TransactionWorkflowEventTable {
  id: Generated<string>;
  workflow_id: string;
  event_type: string;
  event_payload: Record<string, unknown>;
  from_state: string;
  to_state: string;
  context_snapshot: Record<string, unknown>;
  triggered_by: string | null;
  created_at: Generated<Date>;
}

// Add to Database interface:
// transaction_workflows: TransactionWorkflowTable;
// transaction_workflow_events: TransactionWorkflowEventTable;
```

**Step 2: Run typecheck**

Run:
```bash
npm run typecheck
```
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/database/types.ts
git commit -m "feat(db): add workflow table type definitions"
```

---

## Phase 2: State Machine Core

### Task 4: Create Workflow Types

**Files:**
- Create: `src/services/workflow/types.ts`

**Step 1: Create types file**

```typescript
export interface Originator {
  id: string;
  type: 'User' | 'System' | 'Webhook';
}

export interface WorkflowContext {
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

export type WorkflowState =
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

export type WorkflowEvent =
  | { type: 'START'; skipReview?: boolean }
  | { type: 'CONFIRM' }
  | { type: 'CANCEL'; reason?: string }
  | { type: 'POLICIES_PASSED' }
  | { type: 'POLICIES_REQUIRE_APPROVAL'; approvers: string[] }
  | { type: 'POLICIES_REJECTED'; reason: string }
  | { type: 'APPROVE'; approvedBy: string }
  | { type: 'REJECT'; rejectedBy: string; reason: string }
  | { type: 'REQUEST_SIGNATURE' }
  | { type: 'SIGNATURE_RECEIVED'; signature: string }
  | { type: 'SIGNATURE_FAILED'; reason: string }
  | { type: 'BROADCAST_SUCCESS'; txHash: string }
  | { type: 'BROADCAST_RETRY'; error: string; attempt: number }
  | { type: 'BROADCAST_FAILED'; error: string }
  | { type: 'INDEXING_COMPLETE'; blockNumber: number }
  | { type: 'INDEXING_FAILED'; error: string };

export interface CreateWorkflowInput {
  vaultId: string;
  chainAlias: string;
  marshalledHex: string;
  organisationId: string;
  createdBy: Originator;
  skipReview?: boolean;
}

export interface Workflow {
  id: string;
  state: WorkflowState;
  context: WorkflowContext;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowEventRecord {
  id: string;
  workflowId: string;
  eventType: string;
  eventPayload: Record<string, unknown>;
  fromState: string;
  toState: string;
  triggeredBy: string | null;
  createdAt: Date;
}
```

**Step 2: Run typecheck**

Run:
```bash
npm run typecheck
```
Expected: No errors

**Step 3: Commit**

```bash
git add src/services/workflow/types.ts
git commit -m "feat(workflow): add workflow type definitions"
```

---

### Task 5: Create Workflow Errors

**Files:**
- Create: `src/services/workflow/errors.ts`

**Step 1: Create errors file**

```typescript
export class ConcurrentModificationError extends Error {
  constructor(workflowId: string) {
    super(`Workflow ${workflowId} was modified by another request`);
    this.name = 'ConcurrentModificationError';
  }
}

export class InvalidStateTransitionError extends Error {
  constructor(workflowId: string, currentState: string, event: string) {
    super(
      `Cannot send '${event}' to workflow ${workflowId} in state '${currentState}'`
    );
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

**Step 2: Commit**

```bash
git add src/services/workflow/errors.ts
git commit -m "feat(workflow): add custom error classes"
```

---

### Task 6: Write State Machine Tests

**Files:**
- Create: `tests/unit/services/workflow/machine.test.ts`

**Step 1: Create test file with initial tests**

```typescript
import { createActor } from 'xstate';
import { describe, it, expect } from 'vitest';
import { transactionMachine } from '@/services/workflow/machine';
import type { WorkflowContext } from '@/services/workflow/types';

const baseInput: Partial<WorkflowContext> = {
  vaultId: 'vault-123',
  chainAlias: 'ethereum',
  marshalledHex: '0xabc',
  organisationId: 'org-123',
  createdBy: { id: 'user-123', type: 'User' },
};

describe('transactionMachine', () => {
  describe('initial state', () => {
    it('starts in created state', () => {
      const actor = createActor(transactionMachine, {
        input: baseInput,
      });
      actor.start();

      expect(actor.getSnapshot().value).toBe('created');
    });
  });

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

    it('transitions to evaluating_policies on CONFIRM', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: false },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({ type: 'CONFIRM' });

      expect(actor.getSnapshot().value).toBe('evaluating_policies');
    });

    it('transitions to failed on CANCEL', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: false },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({ type: 'CANCEL', reason: 'User cancelled' });

      expect(actor.getSnapshot().value).toBe('failed');
      expect(actor.getSnapshot().context.error).toBe('User cancelled');
      expect(actor.getSnapshot().context.failedAt).toBe('review');
    });
  });

  describe('policy evaluation', () => {
    it('transitions to approved on POLICIES_PASSED', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: true },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({ type: 'POLICIES_PASSED' });

      expect(actor.getSnapshot().value).toBe('approved');
    });

    it('transitions to waiting_approval on POLICIES_REQUIRE_APPROVAL', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: true },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({
        type: 'POLICIES_REQUIRE_APPROVAL',
        approvers: ['approver-1', 'approver-2'],
      });

      expect(actor.getSnapshot().value).toBe('waiting_approval');
      expect(actor.getSnapshot().context.approvers).toEqual([
        'approver-1',
        'approver-2',
      ]);
    });

    it('transitions to failed on POLICIES_REJECTED', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: true },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({ type: 'POLICIES_REJECTED', reason: 'Amount too high' });

      expect(actor.getSnapshot().value).toBe('failed');
      expect(actor.getSnapshot().context.error).toBe('Amount too high');
    });
  });

  describe('approval flow', () => {
    it('transitions to approved on APPROVE', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: true },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({ type: 'POLICIES_REQUIRE_APPROVAL', approvers: ['approver-1'] });
      actor.send({ type: 'APPROVE', approvedBy: 'approver-1' });

      expect(actor.getSnapshot().value).toBe('approved');
      expect(actor.getSnapshot().context.approvedBy).toBe('approver-1');
    });

    it('transitions to failed on REJECT', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: true },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({ type: 'POLICIES_REQUIRE_APPROVAL', approvers: ['approver-1'] });
      actor.send({ type: 'REJECT', rejectedBy: 'approver-1', reason: 'Not authorized' });

      expect(actor.getSnapshot().value).toBe('failed');
      expect(actor.getSnapshot().context.error).toBe('Not authorized');
    });
  });

  describe('signature flow', () => {
    it('transitions to waiting_signature on REQUEST_SIGNATURE', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: true },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({ type: 'POLICIES_PASSED' });
      actor.send({ type: 'REQUEST_SIGNATURE' });

      expect(actor.getSnapshot().value).toBe('waiting_signature');
    });

    it('transitions to broadcasting on SIGNATURE_RECEIVED', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: true },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({ type: 'POLICIES_PASSED' });
      actor.send({ type: 'REQUEST_SIGNATURE' });
      actor.send({ type: 'SIGNATURE_RECEIVED', signature: '0xsig123' });

      expect(actor.getSnapshot().value).toBe('broadcasting');
      expect(actor.getSnapshot().context.signature).toBe('0xsig123');
    });

    it('transitions to failed on SIGNATURE_FAILED', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: true },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({ type: 'POLICIES_PASSED' });
      actor.send({ type: 'REQUEST_SIGNATURE' });
      actor.send({ type: 'SIGNATURE_FAILED', reason: 'Timeout' });

      expect(actor.getSnapshot().value).toBe('failed');
      expect(actor.getSnapshot().context.error).toBe('Timeout');
    });
  });

  describe('broadcast flow', () => {
    it('transitions to indexing on BROADCAST_SUCCESS', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: true },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({ type: 'POLICIES_PASSED' });
      actor.send({ type: 'REQUEST_SIGNATURE' });
      actor.send({ type: 'SIGNATURE_RECEIVED', signature: '0xsig' });
      actor.send({ type: 'BROADCAST_SUCCESS', txHash: '0xhash123' });

      expect(actor.getSnapshot().value).toBe('indexing');
      expect(actor.getSnapshot().context.txHash).toBe('0xhash123');
    });

    it('retries broadcast on transient failure within limit', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: true },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({ type: 'POLICIES_PASSED' });
      actor.send({ type: 'REQUEST_SIGNATURE' });
      actor.send({ type: 'SIGNATURE_RECEIVED', signature: '0xsig' });
      actor.send({ type: 'BROADCAST_RETRY', error: 'timeout', attempt: 1 });

      expect(actor.getSnapshot().value).toBe('broadcasting');
      expect(actor.getSnapshot().context.broadcastAttempts).toBe(1);
    });

    it('fails after max broadcast attempts', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: true },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({ type: 'POLICIES_PASSED' });
      actor.send({ type: 'REQUEST_SIGNATURE' });
      actor.send({ type: 'SIGNATURE_RECEIVED', signature: '0xsig' });

      // Exhaust retries
      actor.send({ type: 'BROADCAST_RETRY', error: 'timeout', attempt: 1 });
      actor.send({ type: 'BROADCAST_RETRY', error: 'timeout', attempt: 2 });
      actor.send({ type: 'BROADCAST_RETRY', error: 'timeout', attempt: 3 });
      actor.send({ type: 'BROADCAST_RETRY', error: 'timeout', attempt: 4 });

      expect(actor.getSnapshot().value).toBe('failed');
      expect(actor.getSnapshot().context.error).toBe('timeout');
    });

    it('fails immediately on BROADCAST_FAILED', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: true },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({ type: 'POLICIES_PASSED' });
      actor.send({ type: 'REQUEST_SIGNATURE' });
      actor.send({ type: 'SIGNATURE_RECEIVED', signature: '0xsig' });
      actor.send({ type: 'BROADCAST_FAILED', error: 'insufficient funds' });

      expect(actor.getSnapshot().value).toBe('failed');
      expect(actor.getSnapshot().context.error).toBe('insufficient funds');
    });
  });

  describe('indexing flow', () => {
    it('transitions to completed on INDEXING_COMPLETE', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: true },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({ type: 'POLICIES_PASSED' });
      actor.send({ type: 'REQUEST_SIGNATURE' });
      actor.send({ type: 'SIGNATURE_RECEIVED', signature: '0xsig' });
      actor.send({ type: 'BROADCAST_SUCCESS', txHash: '0xhash' });
      actor.send({ type: 'INDEXING_COMPLETE', blockNumber: 12345678 });

      expect(actor.getSnapshot().value).toBe('completed');
      expect(actor.getSnapshot().context.blockNumber).toBe(12345678);
    });

    it('transitions to failed on INDEXING_FAILED', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: true },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({ type: 'POLICIES_PASSED' });
      actor.send({ type: 'REQUEST_SIGNATURE' });
      actor.send({ type: 'SIGNATURE_RECEIVED', signature: '0xsig' });
      actor.send({ type: 'BROADCAST_SUCCESS', txHash: '0xhash' });
      actor.send({ type: 'INDEXING_FAILED', error: 'Indexer unavailable' });

      expect(actor.getSnapshot().value).toBe('failed');
      expect(actor.getSnapshot().context.error).toBe('Indexer unavailable');
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run:
```bash
npm run test:unit -- tests/unit/services/workflow/machine.test.ts
```
Expected: FAIL - Cannot find module '@/services/workflow/machine'

**Step 3: Commit test file**

```bash
git add tests/unit/services/workflow/machine.test.ts
git commit -m "test(workflow): add state machine unit tests"
```

---

### Task 7: Implement State Machine

**Files:**
- Create: `src/services/workflow/machine.ts`

**Step 1: Create state machine implementation**

```typescript
import { setup, assign } from 'xstate';
import type { WorkflowContext, WorkflowEvent } from './types';

export const transactionMachine = setup({
  types: {
    context: {} as WorkflowContext,
    events: {} as WorkflowEvent,
    input: {} as Partial<WorkflowContext>,
  },

  guards: {
    shouldSkipReview: ({ context }) => context.skipReview,
    canRetryBroadcast: ({ context }) =>
      context.broadcastAttempts < context.maxBroadcastAttempts,
  },

  actions: {
    setApprovers: assign({
      approvers: (_, params: { approvers: string[] }) => params.approvers,
    }),
    recordApproval: assign({
      approvedBy: (_, params: { approvedBy: string }) => params.approvedBy,
    }),
    recordSignature: assign({
      signature: (_, params: { signature: string }) => params.signature,
    }),
    recordTxHash: assign({
      txHash: (_, params: { txHash: string }) => params.txHash,
    }),
    recordBlockNumber: assign({
      blockNumber: (_, params: { blockNumber: number }) => params.blockNumber,
    }),
    incrementBroadcastAttempts: assign({
      broadcastAttempts: ({ context }) => context.broadcastAttempts + 1,
    }),
    recordFailure: assign(
      (_, params: { error: string; state: string }) => ({
        error: params.error,
        failedAt: params.state,
      })
    ),
  },
}).createMachine({
  id: 'transactionWorkflow',
  initial: 'created',
  context: ({ input }) => ({
    vaultId: input.vaultId ?? '',
    chainAlias: input.chainAlias ?? '',
    marshalledHex: input.marshalledHex ?? '',
    organisationId: input.organisationId ?? '',
    createdBy: input.createdBy ?? { id: '', type: 'User' },
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
            params: ({ event }) => ({
              error: event.reason ?? 'Cancelled by user',
              state: 'review',
            }),
          },
        },
      },
    },

    evaluating_policies: {
      on: {
        POLICIES_PASSED: { target: 'approved' },
        POLICIES_REQUIRE_APPROVAL: {
          target: 'waiting_approval',
          actions: {
            type: 'setApprovers',
            params: ({ event }) => ({ approvers: event.approvers }),
          },
        },
        POLICIES_REJECTED: {
          target: 'failed',
          actions: {
            type: 'recordFailure',
            params: ({ event }) => ({
              error: event.reason,
              state: 'evaluating_policies',
            }),
          },
        },
      },
    },

    waiting_approval: {
      on: {
        APPROVE: {
          target: 'approved',
          actions: {
            type: 'recordApproval',
            params: ({ event }) => ({ approvedBy: event.approvedBy }),
          },
        },
        REJECT: {
          target: 'failed',
          actions: {
            type: 'recordFailure',
            params: ({ event }) => ({
              error: event.reason,
              state: 'waiting_approval',
            }),
          },
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
            params: ({ event }) => ({ signature: event.signature }),
          },
        },
        SIGNATURE_FAILED: {
          target: 'failed',
          actions: {
            type: 'recordFailure',
            params: ({ event }) => ({
              error: event.reason,
              state: 'waiting_signature',
            }),
          },
        },
      },
    },

    broadcasting: {
      on: {
        BROADCAST_SUCCESS: {
          target: 'indexing',
          actions: {
            type: 'recordTxHash',
            params: ({ event }) => ({ txHash: event.txHash }),
          },
        },
        BROADCAST_RETRY: [
          {
            target: 'broadcasting',
            guard: 'canRetryBroadcast',
            actions: 'incrementBroadcastAttempts',
          },
          {
            target: 'failed',
            actions: {
              type: 'recordFailure',
              params: ({ event }) => ({
                error: event.error,
                state: 'broadcasting',
              }),
            },
          },
        ],
        BROADCAST_FAILED: {
          target: 'failed',
          actions: {
            type: 'recordFailure',
            params: ({ event }) => ({
              error: event.error,
              state: 'broadcasting',
            }),
          },
        },
      },
    },

    indexing: {
      on: {
        INDEXING_COMPLETE: {
          target: 'completed',
          actions: {
            type: 'recordBlockNumber',
            params: ({ event }) => ({ blockNumber: event.blockNumber }),
          },
        },
        INDEXING_FAILED: {
          target: 'failed',
          actions: {
            type: 'recordFailure',
            params: ({ event }) => ({
              error: event.error,
              state: 'indexing',
            }),
          },
        },
      },
    },

    completed: { type: 'final' },
    failed: { type: 'final' },
  },
});
```

**Step 2: Run tests to verify they pass**

Run:
```bash
npm run test:unit -- tests/unit/services/workflow/machine.test.ts
```
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/services/workflow/machine.ts
git commit -m "feat(workflow): implement XState v5 state machine"
```

---

### Task 8: Create Service Index

**Files:**
- Create: `src/services/workflow/index.ts`

**Step 1: Create index file**

```typescript
export { transactionMachine } from './machine';
export * from './types';
export * from './errors';
```

**Step 2: Commit**

```bash
git add src/services/workflow/index.ts
git commit -m "feat(workflow): add service exports"
```

---

## Phase 3: Repository Layer

### Task 9: Write Workflow Repository Tests

**Files:**
- Create: `tests/unit/repositories/workflow.test.ts`

**Step 1: Create test file**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowRepository } from '@/repositories/workflow';
import { createTestDb, cleanupTestDb } from '@tests/utils/test-db';
import type { Kysely } from 'kysely';
import type { Database } from '@/lib/database/types';

describe('WorkflowRepository', () => {
  let db: Kysely<Database>;
  let repository: WorkflowRepository;

  beforeEach(async () => {
    db = await createTestDb();
    repository = new WorkflowRepository(db);
  });

  afterEach(async () => {
    await cleanupTestDb(db);
  });

  describe('create', () => {
    it('creates a workflow with initial state', async () => {
      const workflow = await repository.create({
        vaultId: 'vault-123',
        chainAlias: 'ethereum',
        marshalledHex: '0xabc',
        organisationId: 'org-123',
        createdBy: { id: 'user-123', type: 'User' },
        context: { skipReview: false },
      });

      expect(workflow.id).toBeDefined();
      expect(workflow.state).toBe('created');
      expect(workflow.version).toBe(1);
    });
  });

  describe('findById', () => {
    it('returns workflow when found', async () => {
      const created = await repository.create({
        vaultId: 'vault-123',
        chainAlias: 'ethereum',
        marshalledHex: '0xabc',
        organisationId: 'org-123',
        createdBy: { id: 'user-123', type: 'User' },
        context: {},
      });

      const found = await repository.findById(created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });

    it('returns null when not found', async () => {
      const found = await repository.findById('non-existent-id');

      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('updates state and increments version', async () => {
      const created = await repository.create({
        vaultId: 'vault-123',
        chainAlias: 'ethereum',
        marshalledHex: '0xabc',
        organisationId: 'org-123',
        createdBy: { id: 'user-123', type: 'User' },
        context: {},
      });

      const updated = await repository.update(created.id, {
        state: 'review',
        context: { skipReview: false },
        expectedVersion: 1,
      });

      expect(updated.state).toBe('review');
      expect(updated.version).toBe(2);
    });

    it('throws on version mismatch', async () => {
      const created = await repository.create({
        vaultId: 'vault-123',
        chainAlias: 'ethereum',
        marshalledHex: '0xabc',
        organisationId: 'org-123',
        createdBy: { id: 'user-123', type: 'User' },
        context: {},
      });

      await expect(
        repository.update(created.id, {
          state: 'review',
          context: {},
          expectedVersion: 999,
        })
      ).rejects.toThrow('ConcurrentModificationError');
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run:
```bash
npm run test:unit -- tests/unit/repositories/workflow.test.ts
```
Expected: FAIL - Cannot find module

**Step 3: Commit**

```bash
git add tests/unit/repositories/workflow.test.ts
git commit -m "test(workflow): add repository unit tests"
```

---

### Task 10: Implement Workflow Repository

**Files:**
- Create: `src/repositories/workflow.ts`

**Step 1: Create repository implementation**

```typescript
import type { Kysely } from 'kysely';
import type { Database } from '@/lib/database/types';
import type { Workflow, WorkflowContext, Originator } from '@/services/workflow/types';
import { ConcurrentModificationError } from '@/services/workflow/errors';

interface CreateWorkflowInput {
  vaultId: string;
  chainAlias: string;
  marshalledHex: string;
  organisationId: string;
  createdBy: Originator;
  context: Partial<WorkflowContext>;
}

interface UpdateWorkflowInput {
  state: string;
  context: Partial<WorkflowContext>;
  expectedVersion: number;
  txHash?: string;
  signature?: string;
  blockNumber?: number;
}

export class WorkflowRepository {
  constructor(private db: Kysely<Database>) {}

  async create(input: CreateWorkflowInput): Promise<Workflow> {
    const result = await this.db
      .insertInto('transaction_workflows')
      .values({
        vault_id: input.vaultId,
        chain_alias: input.chainAlias,
        marshalled_hex: input.marshalledHex,
        organisation_id: input.organisationId,
        created_by: JSON.stringify(input.createdBy),
        context: JSON.stringify(input.context),
        state: 'created',
      })
      .returning([
        'id',
        'state',
        'context',
        'vault_id',
        'chain_alias',
        'marshalled_hex',
        'organisation_id',
        'created_by',
        'tx_hash',
        'signature',
        'block_number',
        'version',
        'created_at',
        'updated_at',
      ])
      .executeTakeFirstOrThrow();

    return this.toDomain(result);
  }

  async findById(id: string): Promise<Workflow | null> {
    const result = await this.db
      .selectFrom('transaction_workflows')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!result) {
      return null;
    }

    return this.toDomain(result);
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

    return this.toDomain(result);
  }

  async update(id: string, input: UpdateWorkflowInput): Promise<Workflow> {
    const updateData: Record<string, unknown> = {
      state: input.state,
      context: JSON.stringify(input.context),
      version: input.expectedVersion + 1,
      updated_at: new Date(),
    };

    if (input.txHash !== undefined) {
      updateData.tx_hash = input.txHash;
    }
    if (input.signature !== undefined) {
      updateData.signature = input.signature;
    }
    if (input.blockNumber !== undefined) {
      updateData.block_number = input.blockNumber;
    }
    if (input.state === 'completed' || input.state === 'failed') {
      updateData.completed_at = new Date();
    }

    const result = await this.db
      .updateTable('transaction_workflows')
      .set(updateData)
      .where('id', '=', id)
      .where('version', '=', input.expectedVersion)
      .returning([
        'id',
        'state',
        'context',
        'vault_id',
        'chain_alias',
        'marshalled_hex',
        'organisation_id',
        'created_by',
        'tx_hash',
        'signature',
        'block_number',
        'version',
        'created_at',
        'updated_at',
      ])
      .executeTakeFirst();

    if (!result) {
      throw new ConcurrentModificationError(id);
    }

    return this.toDomain(result);
  }

  private toDomain(row: Record<string, unknown>): Workflow {
    const context =
      typeof row.context === 'string'
        ? JSON.parse(row.context)
        : row.context;

    const createdBy =
      typeof row.created_by === 'string'
        ? JSON.parse(row.created_by)
        : row.created_by;

    return {
      id: row.id as string,
      state: row.state as Workflow['state'],
      context: {
        vaultId: row.vault_id as string,
        chainAlias: row.chain_alias as string,
        marshalledHex: row.marshalled_hex as string,
        organisationId: row.organisation_id as string,
        createdBy,
        ...context,
        skipReview: context.skipReview ?? false,
        approvers: context.approvers ?? [],
        approvedBy: context.approvedBy ?? null,
        signature: (row.signature as string) ?? null,
        txHash: (row.tx_hash as string) ?? null,
        blockNumber: (row.block_number as number) ?? null,
        broadcastAttempts: context.broadcastAttempts ?? 0,
        maxBroadcastAttempts: context.maxBroadcastAttempts ?? 3,
        error: context.error ?? null,
        failedAt: context.failedAt ?? null,
      },
      version: row.version as number,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}
```

**Step 2: Run tests**

Run:
```bash
npm run test:unit -- tests/unit/repositories/workflow.test.ts
```
Expected: Tests PASS (may need to adjust based on test DB setup)

**Step 3: Commit**

```bash
git add src/repositories/workflow.ts
git commit -m "feat(workflow): implement workflow repository"
```

---

### Task 11: Implement Workflow Events Repository

**Files:**
- Create: `src/repositories/workflow-events.ts`

**Step 1: Create events repository**

```typescript
import type { Kysely } from 'kysely';
import type { Database } from '@/lib/database/types';
import type { WorkflowEventRecord } from '@/services/workflow/types';

interface CreateEventInput {
  workflowId: string;
  eventType: string;
  eventPayload: Record<string, unknown>;
  fromState: string;
  toState: string;
  contextSnapshot: Record<string, unknown>;
  triggeredBy: string;
}

export class WorkflowEventsRepository {
  constructor(private db: Kysely<Database>) {}

  async create(input: CreateEventInput): Promise<WorkflowEventRecord> {
    const result = await this.db
      .insertInto('transaction_workflow_events')
      .values({
        workflow_id: input.workflowId,
        event_type: input.eventType,
        event_payload: JSON.stringify(input.eventPayload),
        from_state: input.fromState,
        to_state: input.toState,
        context_snapshot: JSON.stringify(input.contextSnapshot),
        triggered_by: input.triggeredBy,
      })
      .returning(['id', 'workflow_id', 'event_type', 'event_payload', 'from_state', 'to_state', 'triggered_by', 'created_at'])
      .executeTakeFirstOrThrow();

    return this.toDomain(result);
  }

  async findByWorkflowId(workflowId: string): Promise<WorkflowEventRecord[]> {
    const results = await this.db
      .selectFrom('transaction_workflow_events')
      .selectAll()
      .where('workflow_id', '=', workflowId)
      .orderBy('created_at', 'asc')
      .execute();

    return results.map(this.toDomain);
  }

  async findByWorkflowIdPaginated(
    workflowId: string,
    options: { limit: number; cursor?: string }
  ): Promise<{ events: WorkflowEventRecord[]; nextCursor: string | null }> {
    let query = this.db
      .selectFrom('transaction_workflow_events')
      .selectAll()
      .where('workflow_id', '=', workflowId)
      .orderBy('created_at', 'asc')
      .limit(options.limit + 1);

    if (options.cursor) {
      query = query.where('id', '>', options.cursor);
    }

    const results = await query.execute();
    const hasMore = results.length > options.limit;
    const events = results.slice(0, options.limit).map(this.toDomain);

    return {
      events,
      nextCursor: hasMore ? events[events.length - 1].id : null,
    };
  }

  private toDomain(row: Record<string, unknown>): WorkflowEventRecord {
    return {
      id: row.id as string,
      workflowId: row.workflow_id as string,
      eventType: row.event_type as string,
      eventPayload:
        typeof row.event_payload === 'string'
          ? JSON.parse(row.event_payload)
          : (row.event_payload as Record<string, unknown>),
      fromState: row.from_state as string,
      toState: row.to_state as string,
      triggeredBy: row.triggered_by as string | null,
      createdAt: row.created_at as Date,
    };
  }
}
```

**Step 2: Commit**

```bash
git add src/repositories/workflow-events.ts
git commit -m "feat(workflow): implement workflow events repository"
```

---

## Phase 4: Orchestrator

### Task 12: Write Orchestrator Tests

**Files:**
- Create: `tests/unit/services/workflow/orchestrator.test.ts`

**Step 1: Create test file**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowOrchestrator } from '@/services/workflow/orchestrator';
import { WorkflowRepository } from '@/repositories/workflow';
import { WorkflowEventsRepository } from '@/repositories/workflow-events';
import {
  ConcurrentModificationError,
  InvalidStateTransitionError,
  WorkflowNotFoundError,
} from '@/services/workflow/errors';

describe('WorkflowOrchestrator', () => {
  let orchestrator: WorkflowOrchestrator;
  let workflowRepo: WorkflowRepository;
  let eventsRepo: WorkflowEventsRepository;
  let mockLogger: { info: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

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

    orchestrator = new WorkflowOrchestrator(
      workflowRepo,
      eventsRepo,
      mockLogger
    );
  });

  describe('create', () => {
    it('creates workflow with initial context', async () => {
      const input = {
        vaultId: 'vault-123',
        chainAlias: 'ethereum',
        marshalledHex: '0xabc',
        organisationId: 'org-123',
        createdBy: { id: 'user-123', type: 'User' as const },
        skipReview: false,
      };

      vi.mocked(workflowRepo.create).mockResolvedValue({
        id: 'wf-123',
        state: 'created',
        context: { ...input, approvers: [], approvedBy: null, signature: null, txHash: null, blockNumber: null, broadcastAttempts: 0, maxBroadcastAttempts: 3, error: null, failedAt: null },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await orchestrator.create(input);

      expect(result.id).toBe('wf-123');
      expect(result.state).toBe('created');
      expect(workflowRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        vaultId: 'vault-123',
      }));
    });
  });

  describe('send', () => {
    it('transitions state and records event', async () => {
      const existingWorkflow = {
        id: 'wf-123',
        state: 'created' as const,
        context: {
          vaultId: 'vault-123',
          chainAlias: 'ethereum',
          marshalledHex: '0xabc',
          organisationId: 'org-123',
          createdBy: { id: 'user-123', type: 'User' as const },
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
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(workflowRepo.findByIdForUpdate).mockResolvedValue(existingWorkflow);
      vi.mocked(workflowRepo.update).mockResolvedValue({
        ...existingWorkflow,
        state: 'review',
        version: 2,
      });
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

      const result = await orchestrator.send('wf-123', { type: 'START' }, 'user:123');

      expect(result.state).toBe('review');
      expect(workflowRepo.update).toHaveBeenCalled();
      expect(eventsRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        eventType: 'START',
        fromState: 'created',
        toState: 'review',
      }));
    });

    it('throws WorkflowNotFoundError when workflow not found', async () => {
      vi.mocked(workflowRepo.findByIdForUpdate).mockResolvedValue(null);

      await expect(
        orchestrator.send('non-existent', { type: 'START' }, 'user:123')
      ).rejects.toThrow(WorkflowNotFoundError);
    });

    it('throws InvalidStateTransitionError for invalid event', async () => {
      const existingWorkflow = {
        id: 'wf-123',
        state: 'completed' as const,
        context: {
          vaultId: 'vault-123',
          chainAlias: 'ethereum',
          marshalledHex: '0xabc',
          organisationId: 'org-123',
          createdBy: { id: 'user-123', type: 'User' as const },
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
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(workflowRepo.findByIdForUpdate).mockResolvedValue(existingWorkflow);

      await expect(
        orchestrator.send('wf-123', { type: 'START' }, 'user:123')
      ).rejects.toThrow(InvalidStateTransitionError);
    });
  });

  describe('getHistory', () => {
    it('returns event history', async () => {
      const events = [
        { id: 'evt-1', workflowId: 'wf-123', eventType: 'START', eventPayload: {}, fromState: 'created', toState: 'review', triggeredBy: 'user:123', createdAt: new Date() },
      ];

      vi.mocked(eventsRepo.findByWorkflowId).mockResolvedValue(events);

      const result = await orchestrator.getHistory('wf-123');

      expect(result).toHaveLength(1);
      expect(result[0].eventType).toBe('START');
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run:
```bash
npm run test:unit -- tests/unit/services/workflow/orchestrator.test.ts
```
Expected: FAIL - Cannot find module

**Step 3: Commit**

```bash
git add tests/unit/services/workflow/orchestrator.test.ts
git commit -m "test(workflow): add orchestrator unit tests"
```

---

### Task 13: Implement Orchestrator

**Files:**
- Create: `src/services/workflow/orchestrator.ts`

**Step 1: Create orchestrator implementation**

```typescript
import { createActor } from 'xstate';
import { transactionMachine } from './machine';
import type {
  Workflow,
  WorkflowEvent,
  WorkflowEventRecord,
  CreateWorkflowInput,
  WorkflowContext,
} from './types';
import {
  WorkflowNotFoundError,
  InvalidStateTransitionError,
  ConcurrentModificationError,
} from './errors';
import type { WorkflowRepository } from '@/repositories/workflow';
import type { WorkflowEventsRepository } from '@/repositories/workflow-events';

interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export class WorkflowOrchestrator {
  constructor(
    private workflowRepo: WorkflowRepository,
    private eventsRepo: WorkflowEventsRepository,
    private logger: Logger
  ) {}

  async create(input: CreateWorkflowInput): Promise<Workflow> {
    const workflow = await this.workflowRepo.create({
      vaultId: input.vaultId,
      chainAlias: input.chainAlias,
      marshalledHex: input.marshalledHex,
      organisationId: input.organisationId,
      createdBy: input.createdBy,
      context: {
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
      },
    });

    this.logger.info('Workflow created', {
      workflowId: workflow.id,
      vaultId: input.vaultId,
      chainAlias: input.chainAlias,
    });

    return workflow;
  }

  async send(
    workflowId: string,
    event: WorkflowEvent,
    triggeredBy: string
  ): Promise<Workflow> {
    const workflow = await this.workflowRepo.findByIdForUpdate(workflowId);

    if (!workflow) {
      throw new WorkflowNotFoundError(workflowId);
    }

    // Create actor from current state
    const actor = createActor(transactionMachine, {
      input: workflow.context,
      snapshot: {
        value: workflow.state,
        context: workflow.context,
      } as Parameters<typeof createActor>[1]['snapshot'],
    });

    actor.start();

    // Check if transition is valid
    const currentSnapshot = actor.getSnapshot();
    const fromState = currentSnapshot.value as string;

    // Check if event can be handled
    if (!this.canHandleEvent(currentSnapshot, event.type)) {
      throw new InvalidStateTransitionError(workflowId, fromState, event.type);
    }

    // Send event
    actor.send(event);
    const newSnapshot = actor.getSnapshot();
    const toState = newSnapshot.value as string;
    const newContext = newSnapshot.context;

    // Persist state update
    const updatedWorkflow = await this.workflowRepo.update(workflowId, {
      state: toState,
      context: newContext,
      expectedVersion: workflow.version,
      txHash: newContext.txHash ?? undefined,
      signature: newContext.signature ?? undefined,
      blockNumber: newContext.blockNumber ?? undefined,
    });

    // Record event
    await this.eventsRepo.create({
      workflowId,
      eventType: event.type,
      eventPayload: event as Record<string, unknown>,
      fromState,
      toState,
      contextSnapshot: this.sanitizeContext(newContext),
      triggeredBy,
    });

    this.logger.info('Workflow transition', {
      workflowId,
      event: event.type,
      fromState,
      toState,
      triggeredBy,
    });

    actor.stop();

    return updatedWorkflow;
  }

  async get(workflowId: string): Promise<Workflow | null> {
    return this.workflowRepo.findById(workflowId);
  }

  async getHistory(workflowId: string): Promise<WorkflowEventRecord[]> {
    return this.eventsRepo.findByWorkflowId(workflowId);
  }

  private canHandleEvent(
    snapshot: ReturnType<ReturnType<typeof createActor>['getSnapshot']>,
    eventType: string
  ): boolean {
    // For final states, no events can be handled
    if (snapshot.status === 'done') {
      return false;
    }

    // Check if the event type is in the list of next possible events
    const nextEvents = snapshot.nextEvents || [];
    return nextEvents.includes(eventType);
  }

  private sanitizeContext(context: WorkflowContext): Record<string, unknown> {
    const { marshalledHex, signature, ...safe } = context;
    return {
      ...safe,
      marshalledHex: marshalledHex ? '[REDACTED]' : null,
      signature: signature ? '[REDACTED]' : null,
    };
  }
}
```

**Step 2: Run tests**

Run:
```bash
npm run test:unit -- tests/unit/services/workflow/orchestrator.test.ts
```
Expected: Tests PASS

**Step 3: Commit**

```bash
git add src/services/workflow/orchestrator.ts
git commit -m "feat(workflow): implement workflow orchestrator"
```

---

### Task 14: Update Service Index

**Files:**
- Modify: `src/services/workflow/index.ts`

**Step 1: Add orchestrator export**

```typescript
export { transactionMachine } from './machine';
export { WorkflowOrchestrator } from './orchestrator';
export * from './types';
export * from './errors';
```

**Step 2: Commit**

```bash
git add src/services/workflow/index.ts
git commit -m "feat(workflow): export orchestrator from service index"
```

---

## Phase 5: API Routes

### Task 15: Create Route Schemas

**Files:**
- Create: `src/routes/transactions/workflow/schemas.ts`

**Step 1: Create schema definitions**

```typescript
import { z } from 'zod';

export const createWorkflowBodySchema = z.object({
  vaultId: z.string().min(1),
  chainAlias: z.string().min(1),
  marshalledHex: z.string().min(1),
  skipReview: z.boolean().optional().default(false),
});

export const workflowParamsSchema = z.object({
  id: z.string().uuid(),
});

export const confirmBodySchema = z.object({}).optional();

export const approveBodySchema = z.object({}).optional();

export const rejectBodySchema = z.object({
  reason: z.string().min(1),
});

export const historyQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  cursor: z.string().uuid().optional(),
});

export const workflowResponseSchema = z.object({
  id: z.string().uuid(),
  state: z.string(),
  context: z.object({
    vaultId: z.string(),
    chainAlias: z.string(),
    skipReview: z.boolean(),
    approvers: z.array(z.string()),
    approvedBy: z.string().nullable(),
    txHash: z.string().nullable(),
    blockNumber: z.number().nullable(),
    error: z.string().nullable(),
    failedAt: z.string().nullable(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const historyEventSchema = z.object({
  id: z.string().uuid(),
  event: z.string(),
  fromState: z.string(),
  toState: z.string(),
  triggeredBy: z.string().nullable(),
  timestamp: z.string(),
});

export const historyResponseSchema = z.object({
  workflowId: z.string().uuid(),
  history: z.array(historyEventSchema),
  pagination: z.object({
    nextCursor: z.string().uuid().nullable(),
    hasMore: z.boolean(),
  }),
});

export type CreateWorkflowBody = z.infer<typeof createWorkflowBodySchema>;
export type WorkflowParams = z.infer<typeof workflowParamsSchema>;
export type RejectBody = z.infer<typeof rejectBodySchema>;
export type HistoryQuery = z.infer<typeof historyQuerySchema>;
```

**Step 2: Commit**

```bash
git add src/routes/transactions/workflow/schemas.ts
git commit -m "feat(workflow): add API route schemas"
```

---

### Task 16: Create Route Handlers

**Files:**
- Create: `src/routes/transactions/workflow/handlers.ts`

**Step 1: Create handlers**

```typescript
import type { FastifyRequest, FastifyReply } from 'fastify';
import type {
  CreateWorkflowBody,
  WorkflowParams,
  RejectBody,
  HistoryQuery,
} from './schemas';
import { NotFoundError, OperationForbiddenError } from '@/lib/errors';

export async function createWorkflowHandler(
  request: FastifyRequest<{ Body: CreateWorkflowBody }>,
  reply: FastifyReply
) {
  const { vaultId, chainAlias, marshalledHex, skipReview } = request.body;
  const { organisationId, userId } = request.auth;
  const orchestrator = request.server.services.workflowOrchestrator;

  // Verify vault ownership
  const vault = await request.server.services.vault.getVault(vaultId);
  if (!vault || vault.organisationId !== organisationId) {
    throw new OperationForbiddenError('Not authorized to access this vault');
  }

  // Create workflow
  const workflow = await orchestrator.create({
    vaultId,
    chainAlias,
    marshalledHex,
    organisationId,
    createdBy: { id: userId, type: 'User' },
    skipReview,
  });

  // Send START event
  const updated = await orchestrator.send(
    workflow.id,
    { type: 'START', skipReview },
    `user:${userId}`
  );

  return reply.status(201).send({
    id: updated.id,
    state: updated.state,
  });
}

export async function confirmWorkflowHandler(
  request: FastifyRequest<{ Params: WorkflowParams }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const { userId } = request.auth;
  const orchestrator = request.server.services.workflowOrchestrator;

  const workflow = await orchestrator.send(
    id,
    { type: 'CONFIRM' },
    `user:${userId}`
  );

  return reply.send({
    id: workflow.id,
    state: workflow.state,
  });
}

export async function approveWorkflowHandler(
  request: FastifyRequest<{ Params: WorkflowParams }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const { userId } = request.auth;
  const orchestrator = request.server.services.workflowOrchestrator;

  const workflow = await orchestrator.send(
    id,
    { type: 'APPROVE', approvedBy: userId },
    `user:${userId}`
  );

  return reply.send({
    id: workflow.id,
    state: workflow.state,
  });
}

export async function rejectWorkflowHandler(
  request: FastifyRequest<{ Params: WorkflowParams; Body: RejectBody }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const { reason } = request.body;
  const { userId } = request.auth;
  const orchestrator = request.server.services.workflowOrchestrator;

  const workflow = await orchestrator.send(
    id,
    { type: 'REJECT', rejectedBy: userId, reason },
    `user:${userId}`
  );

  return reply.send({
    id: workflow.id,
    state: workflow.state,
  });
}

export async function getWorkflowHandler(
  request: FastifyRequest<{ Params: WorkflowParams }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const orchestrator = request.server.services.workflowOrchestrator;

  const workflow = await orchestrator.get(id);
  if (!workflow) {
    throw new NotFoundError('Workflow not found');
  }

  return reply.send({
    id: workflow.id,
    state: workflow.state,
    context: {
      vaultId: workflow.context.vaultId,
      chainAlias: workflow.context.chainAlias,
      skipReview: workflow.context.skipReview,
      approvers: workflow.context.approvers,
      approvedBy: workflow.context.approvedBy,
      txHash: workflow.context.txHash,
      blockNumber: workflow.context.blockNumber,
      error: workflow.context.error,
      failedAt: workflow.context.failedAt,
    },
    createdAt: workflow.createdAt.toISOString(),
    updatedAt: workflow.updatedAt.toISOString(),
  });
}

export async function getWorkflowHistoryHandler(
  request: FastifyRequest<{ Params: WorkflowParams; Querystring: HistoryQuery }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const { limit, cursor } = request.query;
  const orchestrator = request.server.services.workflowOrchestrator;

  const workflow = await orchestrator.get(id);
  if (!workflow) {
    throw new NotFoundError('Workflow not found');
  }

  const events = await orchestrator.getHistory(id);

  // Simple pagination (could be optimized with cursor-based approach)
  const startIndex = cursor
    ? events.findIndex((e) => e.id === cursor) + 1
    : 0;
  const paginatedEvents = events.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < events.length;
  const nextCursor = hasMore ? paginatedEvents[paginatedEvents.length - 1]?.id : null;

  return reply.send({
    workflowId: id,
    history: paginatedEvents.map((e) => ({
      id: e.id,
      event: e.eventType,
      fromState: e.fromState,
      toState: e.toState,
      triggeredBy: e.triggeredBy,
      timestamp: e.createdAt.toISOString(),
    })),
    pagination: {
      nextCursor,
      hasMore,
    },
  });
}
```

**Step 2: Commit**

```bash
git add src/routes/transactions/workflow/handlers.ts
git commit -m "feat(workflow): add API route handlers"
```

---

### Task 17: Create Route Registration

**Files:**
- Create: `src/routes/transactions/workflow/index.ts`

**Step 1: Create route registration**

```typescript
import type { FastifyInstance } from 'fastify';
import {
  createWorkflowBodySchema,
  workflowParamsSchema,
  rejectBodySchema,
  historyQuerySchema,
} from './schemas';
import {
  createWorkflowHandler,
  confirmWorkflowHandler,
  approveWorkflowHandler,
  rejectWorkflowHandler,
  getWorkflowHandler,
  getWorkflowHistoryHandler,
} from './handlers';

export async function workflowRoutes(server: FastifyInstance) {
  // Create workflow
  server.post(
    '/',
    {
      schema: {
        body: createWorkflowBodySchema,
        tags: ['Workflows'],
        summary: 'Create a new transaction workflow',
      },
    },
    createWorkflowHandler
  );

  // Confirm review
  server.post(
    '/:id/confirm',
    {
      schema: {
        params: workflowParamsSchema,
        tags: ['Workflows'],
        summary: 'Confirm transaction review',
      },
    },
    confirmWorkflowHandler
  );

  // Approve
  server.post(
    '/:id/approve',
    {
      schema: {
        params: workflowParamsSchema,
        tags: ['Workflows'],
        summary: 'Approve transaction',
      },
    },
    approveWorkflowHandler
  );

  // Reject
  server.post(
    '/:id/reject',
    {
      schema: {
        params: workflowParamsSchema,
        body: rejectBodySchema,
        tags: ['Workflows'],
        summary: 'Reject transaction',
      },
    },
    rejectWorkflowHandler
  );

  // Get workflow
  server.get(
    '/:id',
    {
      schema: {
        params: workflowParamsSchema,
        tags: ['Workflows'],
        summary: 'Get workflow status',
      },
    },
    getWorkflowHandler
  );

  // Get history
  server.get(
    '/:id/history',
    {
      schema: {
        params: workflowParamsSchema,
        querystring: historyQuerySchema,
        tags: ['Workflows'],
        summary: 'Get workflow event history',
      },
    },
    getWorkflowHistoryHandler
  );
}
```

**Step 2: Commit**

```bash
git add src/routes/transactions/workflow/index.ts
git commit -m "feat(workflow): add route registration"
```

---

### Task 18: Create Signature Webhook Handler

**Files:**
- Create: `src/routes/webhooks/signature.ts`

**Step 1: Create webhook handler**

```typescript
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const signatureWebhookSchema = z.object({
  workflowId: z.string().uuid(),
  requestId: z.string(),
  success: z.boolean(),
  signature: z.string().optional(),
  error: z.string().optional(),
});

type SignatureWebhookBody = z.infer<typeof signatureWebhookSchema>;

export async function signatureWebhookRoutes(server: FastifyInstance) {
  server.post<{ Body: SignatureWebhookBody }>(
    '/signature',
    {
      schema: {
        body: signatureWebhookSchema,
        tags: ['Webhooks'],
        summary: 'Receive signature completion webhook',
      },
    },
    async (request, reply) => {
      const { workflowId, requestId, success, signature, error } = request.body;
      const orchestrator = server.services.workflowOrchestrator;
      const eventsRepo = server.services.workflowEventsRepo;

      // Idempotency check
      const existingEvents = await eventsRepo.findByWorkflowId(workflowId);
      const isDuplicate = existingEvents.some(
        (e) => e.eventPayload?.requestId === requestId
      );

      if (isDuplicate) {
        server.log.info('Duplicate webhook received, ignoring', {
          workflowId,
          requestId,
        });
        return reply.status(200).send({ received: true, duplicate: true });
      }

      // State check
      const workflow = await orchestrator.get(workflowId);
      if (!workflow || workflow.state !== 'waiting_signature') {
        server.log.warn('Webhook received for workflow not awaiting signature', {
          workflowId,
          currentState: workflow?.state,
        });
        return reply.status(200).send({ received: true, ignored: true });
      }

      if (success && signature) {
        await orchestrator.send(
          workflowId,
          { type: 'SIGNATURE_RECEIVED', signature },
          'webhook:signing-service'
        );

        // TODO: Trigger broadcast service
      } else {
        await orchestrator.send(
          workflowId,
          { type: 'SIGNATURE_FAILED', reason: error ?? 'Unknown error' },
          'webhook:signing-service'
        );
      }

      return reply.status(200).send({ received: true });
    }
  );
}
```

**Step 2: Commit**

```bash
git add src/routes/webhooks/signature.ts
git commit -m "feat(workflow): add signature webhook handler"
```

---

## Phase 6: Service Registration

### Task 19: Register Services and Routes

**Files:**
- Modify: `src/app.ts` (add service registration)

**Step 1: Add workflow services to Fastify**

Add to the service registration section:

```typescript
import { WorkflowRepository } from '@/repositories/workflow';
import { WorkflowEventsRepository } from '@/repositories/workflow-events';
import { WorkflowOrchestrator } from '@/services/workflow';

// In the buildApp function, after database setup:
const workflowRepo = new WorkflowRepository(db);
const workflowEventsRepo = new WorkflowEventsRepository(db);
const workflowOrchestrator = new WorkflowOrchestrator(
  workflowRepo,
  workflowEventsRepo,
  server.log
);

server.decorate('services', {
  ...server.services,
  workflowOrchestrator,
  workflowEventsRepo,
});
```

**Step 2: Register routes**

Add to route registration:

```typescript
import { workflowRoutes } from '@/routes/transactions/workflow';
import { signatureWebhookRoutes } from '@/routes/webhooks/signature';

// Register workflow routes
await server.register(workflowRoutes, { prefix: '/v2/workflows' });
await server.register(signatureWebhookRoutes, { prefix: '/webhooks' });
```

**Step 3: Run typecheck**

Run:
```bash
npm run typecheck
```
Expected: No errors

**Step 4: Commit**

```bash
git add src/app.ts
git commit -m "feat(workflow): register services and routes in app"
```

---

## Phase 7: Integration Tests

### Task 20: Write Integration Tests

**Files:**
- Create: `tests/integration/workflow/workflow.test.ts`

**Step 1: Create integration test**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '@/app';
import type { FastifyInstance } from 'fastify';

describe('Workflow API Integration', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildApp({ testing: true });
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  describe('POST /v2/workflows', () => {
    it('creates workflow and returns id', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/v2/workflows',
        payload: {
          vaultId: 'vault-123',
          chainAlias: 'ethereum',
          marshalledHex: '0xabc123',
          skipReview: false,
        },
        headers: {
          // Add auth headers as needed
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.id).toBeDefined();
      expect(body.state).toBe('review');
    });

    it('skips review when skipReview is true', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/v2/workflows',
        payload: {
          vaultId: 'vault-123',
          chainAlias: 'ethereum',
          marshalledHex: '0xabc123',
          skipReview: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.state).toBe('evaluating_policies');
    });
  });

  describe('POST /v2/workflows/:id/confirm', () => {
    it('transitions from review to evaluating_policies', async () => {
      // Create workflow
      const createResponse = await server.inject({
        method: 'POST',
        url: '/v2/workflows',
        payload: {
          vaultId: 'vault-123',
          chainAlias: 'ethereum',
          marshalledHex: '0xabc123',
          skipReview: false,
        },
      });
      const { id } = JSON.parse(createResponse.body);

      // Confirm
      const confirmResponse = await server.inject({
        method: 'POST',
        url: `/v2/workflows/${id}/confirm`,
      });

      expect(confirmResponse.statusCode).toBe(200);
      const body = JSON.parse(confirmResponse.body);
      expect(body.state).toBe('evaluating_policies');
    });
  });

  describe('GET /v2/workflows/:id/history', () => {
    it('returns event history', async () => {
      // Create and confirm workflow
      const createResponse = await server.inject({
        method: 'POST',
        url: '/v2/workflows',
        payload: {
          vaultId: 'vault-123',
          chainAlias: 'ethereum',
          marshalledHex: '0xabc123',
          skipReview: false,
        },
      });
      const { id } = JSON.parse(createResponse.body);

      await server.inject({
        method: 'POST',
        url: `/v2/workflows/${id}/confirm`,
      });

      // Get history
      const historyResponse = await server.inject({
        method: 'GET',
        url: `/v2/workflows/${id}/history`,
      });

      expect(historyResponse.statusCode).toBe(200);
      const body = JSON.parse(historyResponse.body);
      expect(body.history).toHaveLength(2); // START + CONFIRM
      expect(body.history[0].event).toBe('START');
      expect(body.history[1].event).toBe('CONFIRM');
    });
  });
});
```

**Step 2: Run integration tests**

Run:
```bash
npm run test:integration -- tests/integration/workflow/workflow.test.ts
```
Expected: Tests PASS

**Step 3: Commit**

```bash
git add tests/integration/workflow/workflow.test.ts
git commit -m "test(workflow): add API integration tests"
```

---

## Phase 8: Side Effects (Stubs)

### Task 21: Create Policy Service Stub

**Files:**
- Create: `src/services/workflow/side-effects/policy-service.ts`

**Step 1: Create policy service stub**

```typescript
import type { WorkflowOrchestrator } from '../orchestrator';

interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

interface PolicyEngineClient {
  evaluate(params: {
    vaultId: string;
    chainAlias: string;
    marshalledHex: string;
    organisationId: string;
  }): Promise<{
    approved: boolean;
    requiresApproval?: boolean;
    approvers?: string[];
    reason?: string;
  }>;
}

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
      } else if (result.requiresApproval && result.approvers) {
        await this.orchestrator.send(
          workflowId,
          { type: 'POLICIES_REQUIRE_APPROVAL', approvers: result.approvers },
          'system:policy-service'
        );
      } else {
        await this.orchestrator.send(
          workflowId,
          { type: 'POLICIES_REJECTED', reason: result.reason ?? 'Policy check failed' },
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

**Step 2: Commit**

```bash
git add src/services/workflow/side-effects/policy-service.ts
git commit -m "feat(workflow): add policy service stub"
```

---

### Task 22: Create Broadcast Service Stub

**Files:**
- Create: `src/services/workflow/side-effects/broadcast-service.ts`

**Step 1: Create broadcast service stub**

```typescript
import type { WorkflowOrchestrator } from '../orchestrator';

interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

interface ChainRpcClient {
  broadcast(signedTx: string): Promise<string>;
}

export class BroadcastService {
  constructor(
    private orchestrator: WorkflowOrchestrator,
    private rpcClients: Map<string, ChainRpcClient>,
    private logger: Logger
  ) {}

  async broadcast(workflowId: string): Promise<void> {
    const workflow = await this.orchestrator.get(workflowId);
    if (!workflow || workflow.state !== 'broadcasting') {
      return;
    }

    const { chainAlias, marshalledHex, signature } = workflow.context;

    if (!signature) {
      this.logger.error('No signature available for broadcast', { workflowId });
      await this.orchestrator.send(
        workflowId,
        { type: 'BROADCAST_FAILED', error: 'No signature available' },
        'system:broadcast-service'
      );
      return;
    }

    try {
      const signedTx = await this.assembleSignedTransaction(
        chainAlias,
        marshalledHex,
        signature
      );

      const rpcClient = this.rpcClients.get(chainAlias);
      if (!rpcClient) {
        throw new Error(`No RPC client for chain: ${chainAlias}`);
      }

      const txHash = await rpcClient.broadcast(signedTx);

      await this.orchestrator.send(
        workflowId,
        { type: 'BROADCAST_SUCCESS', txHash },
        'system:broadcast-service'
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      if (this.isTransientError(errorMsg)) {
        this.logger.warn('Broadcast transient failure, will retry', {
          workflowId,
          error: errorMsg,
        });
        await this.orchestrator.send(
          workflowId,
          {
            type: 'BROADCAST_RETRY',
            error: errorMsg,
            attempt: workflow.context.broadcastAttempts + 1,
          },
          'system:broadcast-service'
        );
        await this.scheduleRetry(workflowId, workflow.context.broadcastAttempts);
      } else {
        this.logger.error('Broadcast permanent failure', {
          workflowId,
          error: errorMsg,
        });
        await this.orchestrator.send(
          workflowId,
          { type: 'BROADCAST_FAILED', error: errorMsg },
          'system:broadcast-service'
        );
      }
    }
  }

  private async assembleSignedTransaction(
    chainAlias: string,
    marshalledHex: string,
    signature: string
  ): Promise<string> {
    // TODO: Implement actual transaction assembly based on chain
    // This is a placeholder that will need chain-specific logic
    return `${marshalledHex}:${signature}`;
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
    return transientPatterns.some((p) => p.test(error));
  }

  private async scheduleRetry(workflowId: string, attempt: number): Promise<void> {
    const delayMs = Math.min(1000 * Math.pow(2, attempt), 30000);
    setTimeout(() => this.broadcast(workflowId), delayMs);
  }
}
```

**Step 2: Commit**

```bash
git add src/services/workflow/side-effects/broadcast-service.ts
git commit -m "feat(workflow): add broadcast service stub"
```

---

### Task 23: Create Side Effects Index

**Files:**
- Create: `src/services/workflow/side-effects/index.ts`

**Step 1: Create index**

```typescript
export { PolicyService } from './policy-service';
export { BroadcastService } from './broadcast-service';
```

**Step 2: Commit**

```bash
git add src/services/workflow/side-effects/index.ts
git commit -m "feat(workflow): add side effects exports"
```

---

### Task 24: Run Full Test Suite

**Step 1: Run all tests**

Run:
```bash
npm run test:unit
npm run test:integration
```
Expected: All tests PASS

**Step 2: Run typecheck**

Run:
```bash
npm run typecheck
```
Expected: No errors

**Step 3: Run linter**

Run:
```bash
npm run lint
```
Expected: No errors

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(workflow): complete transaction workflow state machine implementation"
```

---

## Summary

This plan implements:

1. **Database Layer** - Migration, types, repositories for workflows and events
2. **State Machine** - XState v5 machine with all states and transitions
3. **Orchestrator** - Coordinates state transitions, persistence, and audit logging
4. **API Routes** - Create, confirm, approve, reject, get status, get history
5. **Webhook Handler** - Signature completion webhook with idempotency
6. **Side Effect Stubs** - Policy service and broadcast service ready for implementation

### Next Steps (Not in this plan)

- Implement actual policy engine client integration
- Implement signing service integration
- Implement broadcast service with chain-specific logic
- Implement indexing service
- Add stuck workflow monitor plugin
- Add comprehensive error handling for edge cases
