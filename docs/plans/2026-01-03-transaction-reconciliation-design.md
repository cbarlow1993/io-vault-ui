# Transaction Reconciliation API Design

## Overview

A transaction reconciliation system that audits local transaction data against external providers, ensuring data integrity by:

- **Adding** missing transactions found in the provider but not locally
- **Soft-deleting** orphan transactions that exist locally but not in the provider
- **Flagging** discrepancies between local and provider data for manual review

The system starts with Noves as the provider for EVM, XRP, SVM, and BTC chains, with an abstraction layer to support additional providers with fallback capabilities.

## Requirements

### Functional Requirements

1. Reconcile transactions for a single address + chain combination
2. Asynchronous job execution with polling for results
3. Full audit log with before/after snapshots for all changes
4. Checkpoint-based progress for resumable jobs after failures
5. Provider abstraction with primary + fallback provider chain per blockchain

### Non-Functional Requirements

1. Jobs must be resumable after crashes or restarts
2. Local data is preserved; discrepancies are flagged, not auto-corrected
3. Audit logs must support compliance and debugging use cases

## API Design

### Initiate Reconciliation

```
POST /v2/addresses/{address}/chains/{chain}/reconcile
```

**Request Body** (optional):
```json
{
  "fromTimestamp": 1672527600000,
  "toTimestamp": 1704063600000
}
```

**Response** (202 Accepted):
```json
{
  "jobId": "rec_abc123",
  "status": "pending",
  "createdAt": "2026-01-03T10:00:00Z",
  "address": "0x123...",
  "chain": "ETH"
}
```

### Get Job Status & Results

```
GET /v2/reconciliation-jobs/{jobId}
```

**Response** (completed job):
```json
{
  "jobId": "rec_abc123",
  "status": "completed",
  "address": "0x123...",
  "chain": "ETH",
  "provider": "noves",

  "summary": {
    "transactionsProcessed": 1542,
    "transactionsAdded": 12,
    "transactionsSoftDeleted": 3,
    "discrepanciesFlagged": 7,
    "errors": 0
  },

  "timing": {
    "createdAt": "2026-01-03T10:00:00Z",
    "startedAt": "2026-01-03T10:00:01Z",
    "completedAt": "2026-01-03T10:02:34Z",
    "durationMs": 153000
  },

  "auditLog": [
    {
      "action": "added",
      "transactionHash": "0xabc...",
      "afterSnapshot": { }
    },
    {
      "action": "soft_deleted",
      "transactionHash": "0x789...",
      "beforeSnapshot": { }
    },
    {
      "action": "discrepancy",
      "transactionHash": "0xdef...",
      "discrepancyFields": ["value", "status"],
      "beforeSnapshot": { "value": "1000", "status": "pending" },
      "afterSnapshot": { "value": "1000", "status": "success" }
    }
  ]
}
```

**Job Statuses**:
- `pending` - Job created, awaiting processing
- `running` - Job actively processing
- `paused` - Job paused due to error, can be resumed
- `completed` - Job finished successfully
- `failed` - Job failed and cannot be resumed

### List Jobs

```
GET /v2/reconciliation-jobs?address={address}&chain={chain}&status={status}&limit={limit}&cursor={cursor}
```

Returns paginated list of reconciliation jobs filtered by address/chain.

## Database Schema

### reconciliation_jobs

Stores job state, progress checkpoints, and summary results.

```sql
CREATE TABLE reconciliation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address VARCHAR(255) NOT NULL,
  chain VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  provider VARCHAR(50) NOT NULL,

  -- Scope
  from_timestamp TIMESTAMPTZ,
  to_timestamp TIMESTAMPTZ,

  -- Checkpoint for resumability
  last_processed_cursor TEXT,
  processed_count INT DEFAULT 0,

  -- Results summary
  transactions_added INT DEFAULT 0,
  transactions_soft_deleted INT DEFAULT 0,
  discrepancies_flagged INT DEFAULT 0,
  errors_count INT DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_reconciliation_jobs_address_chain ON reconciliation_jobs(address, chain);
CREATE INDEX idx_reconciliation_jobs_status ON reconciliation_jobs(status);
CREATE INDEX idx_reconciliation_jobs_created_at ON reconciliation_jobs(created_at DESC);
```

### reconciliation_audit_log

Stores detailed audit entries for each action taken during reconciliation.

```sql
CREATE TABLE reconciliation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES reconciliation_jobs(id) ON DELETE CASCADE,
  transaction_hash VARCHAR(255) NOT NULL,
  action VARCHAR(20) NOT NULL,
  before_snapshot JSONB,
  after_snapshot JSONB,
  discrepancy_fields TEXT[],
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reconciliation_audit_log_job_id ON reconciliation_audit_log(job_id);
CREATE INDEX idx_reconciliation_audit_log_action ON reconciliation_audit_log(action);
```

### Transaction Table Updates

Add soft-delete support to the existing transactions table:

```sql
ALTER TABLE transactions
  ADD COLUMN deleted_at TIMESTAMPTZ,
  ADD COLUMN deletion_reason VARCHAR(50);

CREATE INDEX idx_transactions_deleted_at ON transactions(deleted_at) WHERE deleted_at IS NOT NULL;
```

## Provider Abstraction

### Interface

```typescript
interface TransactionProvider {
  name: string;
  supportedChains: string[];

  fetchTransactions(
    address: string,
    chain: string,
    options?: {
      fromTimestamp?: number;
      toTimestamp?: number;
      cursor?: string;
    }
  ): AsyncGenerator<ProviderTransaction>;

  healthCheck(): Promise<boolean>;
}

interface ProviderTransaction {
  hash: string;
  chain: string;
  timestamp: number;
  cursor: string;
  rawData: Record<string, unknown>;
  normalized: {
    from: string;
    to: string | null;
    value: string;
    status: 'success' | 'failed' | 'pending';
    blockNumber?: number;
    fee?: string;
  };
}
```

### Provider Registry

```typescript
interface ProviderConfig {
  primary: string;
  fallbacks: string[];
}

const providerConfig: Record<string, ProviderConfig> = {
  ETH: { primary: 'noves', fallbacks: [] },
  BTC: { primary: 'noves', fallbacks: [] },
  XRP: { primary: 'noves', fallbacks: [] },
  SOL: { primary: 'noves', fallbacks: [] },
};
```

The registry attempts the primary provider first. If it fails health check or returns errors during reconciliation, it falls back to the next provider in the chain.

### Noves Implementation

```typescript
class NovesProvider implements TransactionProvider {
  name = 'noves';
  supportedChains = ['ETH', 'BTC', 'XRP', 'SOL', /* other EVM chains */];

  async *fetchTransactions(
    address: string,
    chain: string,
    options?: { fromTimestamp?: number; toTimestamp?: number; cursor?: string }
  ): AsyncGenerator<ProviderTransaction> {
    let cursor = options?.cursor;

    do {
      const response = await this.client.getTransactions(address, chain, {
        cursor,
        fromTimestamp: options?.fromTimestamp,
        toTimestamp: options?.toTimestamp,
      });

      for (const tx of response.transactions) {
        yield this.normalizeTransaction(tx, chain);
      }

      cursor = response.nextCursor;
    } while (cursor);
  }

  private normalizeTransaction(tx: NovesTransaction, chain: string): ProviderTransaction {
    return {
      hash: tx.hash,
      chain,
      timestamp: tx.timestamp,
      cursor: tx.cursor,
      rawData: tx,
      normalized: {
        from: tx.from,
        to: tx.to,
        value: tx.value,
        status: this.mapStatus(tx.status),
        blockNumber: tx.blockNumber,
        fee: tx.fee,
      },
    };
  }
}
```

## Reconciliation Logic

### Algorithm

```
1. Create job record with status='pending'
2. Resolve provider (primary or fallback)
3. Update job status to 'running', set started_at

4. Load local transactions for address+chain into memory map
   - Key: transaction hash
   - Value: local transaction data

5. Stream provider transactions:
   For each provider transaction:
     a. Check if hash exists in local map
     b. If NOT in local: INSERT transaction, log 'added'
     c. If in local: COMPARE fields
        - If match: remove from local map (accounted for)
        - If differ: log 'discrepancy' with before/after
     d. Checkpoint every N transactions (default: 100)

6. After provider stream exhausted:
   - Remaining items in local map are orphans
   - For each orphan: SOFT DELETE, log 'soft_deleted'

7. Update job with final counts, status='completed', completed_at
```

### Comparison Fields

Fields compared for discrepancy detection:

| Field | Description |
|-------|-------------|
| `timestamp` | Transaction timestamp |
| `from` | Sender address |
| `to` | Recipient address |
| `value` | Transaction value |
| `status` | success / failed / pending |
| `block_number` | Block containing the transaction |
| `fee` | Transaction fee (where applicable) |

### Soft Delete

Orphan transactions are soft-deleted rather than permanently removed:

```sql
UPDATE transactions
SET deleted_at = NOW(),
    deletion_reason = 'reconciliation_orphan'
WHERE hash = $1 AND chain = $2;
```

Normal queries exclude soft-deleted records:

```sql
SELECT * FROM transactions
WHERE address = $1 AND chain = $2 AND deleted_at IS NULL;
```

## Job Execution

### In-Process Worker

The job runner executes as a Fastify plugin that polls for pending jobs:

```typescript
class ReconciliationWorker {
  private polling = false;
  private pollIntervalMs = 5000;

  async start() {
    this.polling = true;
    while (this.polling) {
      const job = await this.claimNextJob();
      if (job) {
        await this.processJob(job);
      } else {
        await this.sleep(this.pollIntervalMs);
      }
    }
  }

  private async claimNextJob(): Promise<ReconciliationJob | null> {
    // Atomic claim: find pending job and update to 'running'
    return await db.query(`
      UPDATE reconciliation_jobs
      SET status = 'running', started_at = NOW()
      WHERE id = (
        SELECT id FROM reconciliation_jobs
        WHERE status IN ('pending', 'running')
        ORDER BY
          CASE WHEN status = 'running' THEN 0 ELSE 1 END,
          created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `);
  }
}
```

### Checkpointing

Progress is saved periodically to enable resume after failures:

```typescript
const CHECKPOINT_INTERVAL = 100;

async function processReconciliation(job: ReconciliationJob) {
  let processed = job.processed_count;
  let lastCursor = job.last_processed_cursor;

  for await (const providerTx of provider.fetchTransactions(
    job.address,
    job.chain,
    { cursor: lastCursor }
  )) {
    await processTransaction(job, providerTx);
    processed++;
    lastCursor = providerTx.cursor;

    if (processed % CHECKPOINT_INTERVAL === 0) {
      await updateJobCheckpoint(job.id, {
        last_processed_cursor: lastCursor,
        processed_count: processed,
        transactions_added: job.transactionsAdded,
        transactions_soft_deleted: job.transactionsSoftDeleted,
        discrepancies_flagged: job.discrepanciesFlagged,
      });
    }
  }
}
```

### Resume Logic

On worker startup, resume any interrupted jobs:

```typescript
async function resumeInterruptedJobs() {
  const interrupted = await db.query(`
    SELECT * FROM reconciliation_jobs
    WHERE status = 'running'
    ORDER BY updated_at ASC
  `);

  for (const job of interrupted) {
    // Job will resume from last_processed_cursor
    await this.processJob(job);
  }
}
```

## Error Handling

### Error Categories

| Category | Handling |
|----------|----------|
| Provider API errors | Retry with exponential backoff (max 3 attempts), then fail job or try fallback provider |
| Rate limiting | Pause and retry after delay indicated by provider |
| Invalid transaction data | Skip transaction, log error in audit log, continue |
| Database errors | Pause job (status='paused'), allow manual resume |
| Network timeouts | Retry with backoff, checkpoint progress before retrying |

### Retry Strategy

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;

      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }
}
```

## Future Enhancements

Items explicitly deferred for later implementation:

1. **Scheduled reconciliation** - Cron-based automatic reconciliation for all addresses
2. **Event-driven triggers** - Reconcile on address registration or suspected issues
3. **Vault/org scope** - Reconcile all addresses for a vault or organization
4. **Manual discrepancy resolution** - API to approve/reject flagged discrepancies
5. **Separate worker service** - Extract job processing to dedicated service for scale
6. **Webhooks** - Notify external systems when reconciliation completes

## File Structure

```
services/core/src/
├── routes/
│   └── reconciliation/
│       ├── index.ts           # Route registration
│       ├── handlers.ts        # Request handlers
│       └── schemas.ts         # Zod schemas
├── services/
│   └── reconciliation/
│       ├── reconciliation-service.ts
│       ├── reconciliation-worker.ts
│       └── providers/
│           ├── provider-interface.ts
│           ├── provider-registry.ts
│           └── noves-provider.ts
├── repositories/
│   └── reconciliation/
│       ├── reconciliation-job-repository.ts
│       └── reconciliation-audit-repository.ts
└── lib/
    └── database/
        └── migrations/
            └── XXXX_create_reconciliation_tables.sql
```
