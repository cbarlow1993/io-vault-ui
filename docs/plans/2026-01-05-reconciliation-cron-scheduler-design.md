# Reconciliation Cron Scheduler Design

## Overview

Implements automatic scheduled partial reconciliation for all monitored addresses. Runs on a cron schedule (default: daily at 2am UTC) with distributed coordination to prevent duplicate execution across multiple instances.

## Architecture

```
Cron triggers (e.g., 2am UTC)
    |
    v
Attempt to acquire PG advisory lock
    |
    v
Lock acquired? --No--> Log info "Another instance handling", skip
    | Yes
    v
Run schedulePartialReconciliation()
    |
    v
Log results (scheduled: X, errors: Y)
    |
    v
Release lock
```

## Key Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Coordination | PostgreSQL advisory lock | Already have Postgres, no new infrastructure |
| Schedule | Default 2am UTC, configurable via env var | Sensible default with escape hatch |
| Enable flags | Separate `RECONCILIATION_SCHEDULER_ENABLED` | Independent control from worker |
| Retry | 3 attempts, exponential backoff (1s -> 2s -> 4s) | Resilient to transient failures |
| Logging | Powertools, `critical` for exhausted retries | CloudWatch integration for alerting |
| Library | `node-cron` | Lightweight, well-maintained, 3M+ weekly downloads |

## Distributed Coordination

### Advisory Lock

PostgreSQL advisory locks are application-level locks using a numeric key. Only one instance can hold the lock at a time.

```typescript
const SCHEDULER_LOCK_ID = 738523901; // Arbitrary consistent ID

// Try to acquire lock (non-blocking)
SELECT pg_try_advisory_lock(738523901);  // Returns true if acquired

// Release lock when done
SELECT pg_advisory_unlock(738523901);
```

### Why One Lock, Not Per-Address?

- The scheduler creates jobs for ALL addresses in one operation
- Jobs go into a queue; workers process them independently
- Per-address locking adds complexity for no benefit
- Lock held only during job creation (seconds), not processing

### How Workers Avoid Duplicates

Separate mechanism - workers use `FOR UPDATE SKIP LOCKED` for atomic job claiming:

```sql
UPDATE reconciliation_jobs
SET status = 'running', started_at = NOW()
WHERE id = (
  SELECT id FROM reconciliation_jobs
  WHERE status = 'pending'
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE SKIP LOCKED
)
RETURNING *;
```

## Retry Logic

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,      // 1 second
  maxDelayMs: 30000,         // 30 seconds cap
  backoffMultiplier: 2,      // 1s -> 2s -> 4s
};
```

| Scenario | Behavior |
|----------|----------|
| Lock already held | No retry - expected, log info and skip |
| Database connection error | Retry with backoff |
| `schedulePartialReconciliation()` throws | Retry with backoff |
| All retries exhausted | Log critical, wait for next cron tick |

## Logging Strategy

| Level | Event |
|-------|-------|
| `info` | Scheduler started/completed, lock skipped |
| `warn` | Retry attempt, partial success (some addresses failed) |
| `error` | Individual address scheduling failed |
| `critical` | All retries exhausted, unhandled errors |

Structured log fields:

```typescript
logger.info('Reconciliation scheduler completed', {
  scheduled: 42,
  errors: 0,
  durationMs: 1234,
  lockAcquired: true,
});
```

## Configuration

### Environment Variables

```bash
# Reconciliation Scheduler (creates jobs automatically)
RECONCILIATION_SCHEDULER_ENABLED=false
# Cron schedule (default: daily at 2am UTC)
RECONCILIATION_CRON_SCHEDULE=0 2 * * *
```

### Config Parsing

```typescript
reconciliation: {
  worker: {
    enabled: process.env.RECONCILIATION_WORKER_ENABLED === 'true',
    pollingIntervalMs: parseInt(process.env.RECONCILIATION_POLLING_INTERVAL_MS || '5000'),
  },
  scheduler: {
    enabled: process.env.RECONCILIATION_SCHEDULER_ENABLED === 'true',
    cronSchedule: process.env.RECONCILIATION_CRON_SCHEDULE || '0 2 * * *',
  },
},
```

## File Structure

**New files:**
```
src/plugins/reconciliation-cron.ts        # Fastify plugin
src/services/reconciliation/scheduler-lock.ts  # Advisory lock helper
```

**Modified files:**
```
.env.example          # Add new env vars
src/lib/config.ts     # Add scheduler config parsing
src/app.ts            # Register scheduler plugin
```

## Testing Approach

### Unit Tests

**`scheduler-lock.ts`:**
- Lock acquisition returns true when available
- Lock acquisition returns false when already held
- Lock release calls correct SQL

**`reconciliation-cron.ts` plugin:**
- Cron job scheduled with correct expression
- Cron job stops on server close
- Plugin skips registration when disabled
- Retry logic with correct backoff delays
- Lock-already-held scenario skips without retry

### Integration Tests

```typescript
it('only one instance runs when lock is held', async () => {
  await acquireSchedulerLock(db);
  const result = await runScheduledReconciliation(db, scheduler);
  expect(result.skipped).toBe(true);
});

it('creates jobs for all monitored addresses', async () => {
  await seedAddresses([...]);
  await runScheduledReconciliation(db, scheduler);
  const jobs = await db.query('SELECT * FROM reconciliation_jobs');
  expect(jobs.rows).toHaveLength(3);
  expect(jobs.rows.every(j => j.mode === 'partial')).toBe(true);
});
```

## Dependencies

- `node-cron` - Cron scheduling library (to be added to package.json)
