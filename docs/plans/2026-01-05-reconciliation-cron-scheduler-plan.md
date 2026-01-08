# Reconciliation Cron Scheduler Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement automatic scheduled partial reconciliation with PostgreSQL advisory locks for distributed coordination.

**Architecture:** A Fastify plugin runs a cron job (default 2am UTC) that acquires a PG advisory lock before calling the existing `ReconciliationScheduler.schedulePartialReconciliation()`. Retries with exponential backoff on failure.

**Tech Stack:** node-cron, PostgreSQL advisory locks, Fastify plugin, Powertools logger

---

### Task 1: Add node-cron dependency

**Files:**
- Modify: `services/core/package.json`

**Step 1: Install node-cron**

Run:
```bash
cd services/core && npm install node-cron && npm install -D @types/node-cron
```

**Step 2: Verify installation**

Run:
```bash
cd services/core && npm ls node-cron
```
Expected: `node-cron@3.x.x`

**Step 3: Commit**

```bash
git add services/core/package.json services/core/package-lock.json
git commit -m "chore: add node-cron dependency for scheduled reconciliation"
```

---

### Task 2: Add scheduler configuration

**Files:**
- Modify: `services/core/src/lib/config.ts`
- Modify: `services/core/.env.example`

**Step 1: Update config schema**

In `services/core/src/lib/config.ts`, find the `reconciliation` schema (around line 67) and update:

```typescript
reconciliation: z.object({
  workerEnabled: booleanFromString.default(false),
  pollingIntervalMs: z.coerce.number().default(5000),
  scheduler: z.object({
    enabled: booleanFromString.default(false),
    cronSchedule: z.string().default('0 2 * * *'),
  }),
}),
```

**Step 2: Update config loading**

In the `loadConfig()` function (around line 154), update:

```typescript
reconciliation: {
  workerEnabled: process.env.RECONCILIATION_WORKER_ENABLED,
  pollingIntervalMs: process.env.RECONCILIATION_POLLING_INTERVAL_MS,
  scheduler: {
    enabled: process.env.RECONCILIATION_SCHEDULER_ENABLED,
    cronSchedule: process.env.RECONCILIATION_CRON_SCHEDULE,
  },
},
```

**Step 3: Update .env.example**

Add to `services/core/.env.example`:

```bash
# Reconciliation Scheduler (automatic job creation)
RECONCILIATION_SCHEDULER_ENABLED=false
# Cron schedule for automatic reconciliation (default: daily at 2am UTC)
RECONCILIATION_CRON_SCHEDULE=0 2 * * *
```

**Step 4: Verify config loads**

Run:
```bash
cd services/core && npx tsc --noEmit
```
Expected: No errors

**Step 5: Commit**

```bash
git add services/core/src/lib/config.ts services/core/.env.example
git commit -m "feat(config): add reconciliation scheduler configuration"
```

---

### Task 3: Create scheduler lock helper

**Files:**
- Create: `services/core/src/services/reconciliation/scheduler-lock.ts`
- Create: `services/core/tests/unit/services/reconciliation/scheduler-lock.test.ts`

**Step 1: Write the failing tests**

Create `services/core/tests/unit/services/reconciliation/scheduler-lock.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { acquireSchedulerLock, releaseSchedulerLock, SCHEDULER_LOCK_ID } from '@/services/core/src/services/reconciliation/scheduler-lock';

describe('scheduler-lock', () => {
  const mockDb = {
    selectFrom: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('acquireSchedulerLock', () => {
    it('returns true when lock is acquired', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        rows: [{ pg_try_advisory_lock: true }],
      });
      mockDb.selectFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          execute: mockExecute,
        }),
      });

      const result = await acquireSchedulerLock(mockDb as any);

      expect(result).toBe(true);
    });

    it('returns false when lock is already held', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        rows: [{ pg_try_advisory_lock: false }],
      });
      mockDb.selectFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          execute: mockExecute,
        }),
      });

      const result = await acquireSchedulerLock(mockDb as any);

      expect(result).toBe(false);
    });
  });

  describe('releaseSchedulerLock', () => {
    it('calls advisory unlock', async () => {
      const mockExecute = vi.fn().mockResolvedValue({ rows: [] });
      mockDb.selectFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          execute: mockExecute,
        }),
      });

      await releaseSchedulerLock(mockDb as any);

      expect(mockDb.selectFrom).toHaveBeenCalled();
    });
  });

  describe('SCHEDULER_LOCK_ID', () => {
    it('exports a consistent lock ID', () => {
      expect(typeof SCHEDULER_LOCK_ID).toBe('number');
      expect(SCHEDULER_LOCK_ID).toBeGreaterThan(0);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run:
```bash
cd services/core && npm test -- --run tests/unit/services/reconciliation/scheduler-lock.test.ts
```
Expected: FAIL with "Cannot find module"

**Step 3: Implement the scheduler lock helper**

Create `services/core/src/services/reconciliation/scheduler-lock.ts`:

```typescript
import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import type { DB } from '../../lib/database/types.js';

/**
 * Advisory lock ID for the reconciliation scheduler.
 * This is an arbitrary but consistent number used across all instances.
 */
export const SCHEDULER_LOCK_ID = 738523901;

/**
 * Attempts to acquire the scheduler advisory lock.
 * Returns true if the lock was acquired, false if another instance holds it.
 * This is non-blocking - it returns immediately.
 */
export async function acquireSchedulerLock(db: Kysely<DB>): Promise<boolean> {
  const result = await sql<{ pg_try_advisory_lock: boolean }>`
    SELECT pg_try_advisory_lock(${SCHEDULER_LOCK_ID})
  `.execute(db);

  return result.rows[0]?.pg_try_advisory_lock === true;
}

/**
 * Releases the scheduler advisory lock.
 * Should be called after the scheduling operation completes.
 */
export async function releaseSchedulerLock(db: Kysely<DB>): Promise<void> {
  await sql`SELECT pg_advisory_unlock(${SCHEDULER_LOCK_ID})`.execute(db);
}
```

**Step 4: Export from index**

Add to `services/core/src/services/reconciliation/index.ts`:

```typescript
export { acquireSchedulerLock, releaseSchedulerLock, SCHEDULER_LOCK_ID } from './scheduler-lock.js';
```

**Step 5: Run tests to verify they pass**

Run:
```bash
cd services/core && npm test -- --run tests/unit/services/reconciliation/scheduler-lock.test.ts
```
Expected: PASS

**Step 6: Commit**

```bash
git add services/core/src/services/reconciliation/scheduler-lock.ts services/core/src/services/reconciliation/index.ts services/core/tests/unit/services/reconciliation/scheduler-lock.test.ts
git commit -m "feat(reconciliation): add advisory lock helper for scheduler coordination"
```

---

### Task 4: Create reconciliation-cron plugin

**Files:**
- Create: `services/core/src/plugins/reconciliation-cron.ts`
- Create: `services/core/tests/unit/plugins/reconciliation-cron.test.ts`

**Step 1: Write the failing tests**

Create `services/core/tests/unit/plugins/reconciliation-cron.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
const mockSchedule = vi.fn();
const mockValidate = vi.fn().mockReturnValue(true);
vi.mock('node-cron', () => ({
  default: {
    schedule: mockSchedule,
    validate: mockValidate,
  },
}));

const mockAcquireLock = vi.fn();
const mockReleaseLock = vi.fn();
vi.mock('@/services/core/src/services/reconciliation/scheduler-lock', () => ({
  acquireSchedulerLock: mockAcquireLock,
  releaseSchedulerLock: mockReleaseLock,
  SCHEDULER_LOCK_ID: 12345,
}));

const mockSchedulePartialReconciliation = vi.fn();
vi.mock('@/services/core/src/services/reconciliation', () => ({
  ReconciliationScheduler: vi.fn().mockImplementation(() => ({
    schedulePartialReconciliation: mockSchedulePartialReconciliation,
  })),
}));

// Mock config
vi.mock('@/services/core/src/lib/config', () => ({
  config: {
    reconciliation: {
      scheduler: {
        enabled: true,
        cronSchedule: '0 2 * * *',
      },
    },
  },
}));

import { runScheduledReconciliation } from '@/services/core/src/plugins/reconciliation-cron';

describe('reconciliation-cron plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('runScheduledReconciliation', () => {
    it('acquires lock before running scheduler', async () => {
      mockAcquireLock.mockResolvedValue(true);
      mockSchedulePartialReconciliation.mockResolvedValue({ scheduled: 5, errors: 0 });

      await runScheduledReconciliation({} as any, {} as any);

      expect(mockAcquireLock).toHaveBeenCalled();
      expect(mockSchedulePartialReconciliation).toHaveBeenCalled();
    });

    it('skips execution when lock is held by another instance', async () => {
      mockAcquireLock.mockResolvedValue(false);

      await runScheduledReconciliation({} as any, {} as any);

      expect(mockAcquireLock).toHaveBeenCalled();
      expect(mockSchedulePartialReconciliation).not.toHaveBeenCalled();
    });

    it('releases lock after successful execution', async () => {
      mockAcquireLock.mockResolvedValue(true);
      mockSchedulePartialReconciliation.mockResolvedValue({ scheduled: 5, errors: 0 });

      await runScheduledReconciliation({} as any, {} as any);

      expect(mockReleaseLock).toHaveBeenCalled();
    });

    it('releases lock even after failure', async () => {
      mockAcquireLock.mockResolvedValue(true);
      mockSchedulePartialReconciliation.mockRejectedValue(new Error('DB error'));

      await runScheduledReconciliation({} as any, {} as any);

      expect(mockReleaseLock).toHaveBeenCalled();
    });

    it('retries on failure with backoff', async () => {
      mockAcquireLock.mockResolvedValue(true);
      mockSchedulePartialReconciliation
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockResolvedValue({ scheduled: 5, errors: 0 });

      await runScheduledReconciliation({} as any, {} as any);

      expect(mockSchedulePartialReconciliation).toHaveBeenCalledTimes(2);
    });

    it('logs critical after all retries exhausted', async () => {
      mockAcquireLock.mockResolvedValue(true);
      mockSchedulePartialReconciliation.mockRejectedValue(new Error('Persistent error'));

      await runScheduledReconciliation({} as any, {} as any);

      expect(mockSchedulePartialReconciliation).toHaveBeenCalledTimes(3); // maxRetries
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run:
```bash
cd services/core && npm test -- --run tests/unit/plugins/reconciliation-cron.test.ts
```
Expected: FAIL with "Cannot find module"

**Step 3: Implement the reconciliation-cron plugin**

Create `services/core/src/plugins/reconciliation-cron.ts`:

```typescript
import cron from 'node-cron';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { logger } from '@/utils/powertools';
import { config } from '../lib/config.js';
import { ReconciliationScheduler } from '../services/reconciliation/reconciliation-scheduler.js';
import { ReconciliationService } from '../services/reconciliation/reconciliation-service.js';
import {
  acquireSchedulerLock,
  releaseSchedulerLock,
} from '../services/reconciliation/scheduler-lock.js';
import { PostgresReconciliationRepository } from '../repositories/reconciliation.repository.js';
import { PostgresAddressRepository } from '../repositories/address.repository.js';
import type { Kysely } from 'kysely';
import type { DB } from '../lib/database/types.js';

const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

function getBackoffDelay(attempt: number): number {
  const delay = RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1);
  return Math.min(delay, RETRY_CONFIG.maxDelayMs);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs the scheduled reconciliation with retry logic and distributed locking.
 * Exported for testing.
 */
export async function runScheduledReconciliation(
  db: Kysely<DB>,
  scheduler: ReconciliationScheduler
): Promise<void> {
  for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    let lockAcquired = false;

    try {
      lockAcquired = await acquireSchedulerLock(db);

      if (!lockAcquired) {
        logger.info('Another instance is running the reconciliation scheduler, skipping');
        return;
      }

      const startTime = Date.now();
      const result = await scheduler.schedulePartialReconciliation();
      const durationMs = Date.now() - startTime;

      logger.info('Reconciliation scheduler completed', {
        scheduled: result.scheduled,
        errors: result.errors,
        durationMs,
        attempt,
      });

      return;
    } catch (error) {
      logger.warn(`Reconciliation scheduler attempt ${attempt}/${RETRY_CONFIG.maxRetries} failed`, {
        error,
        attempt,
      });

      if (attempt < RETRY_CONFIG.maxRetries) {
        const delay = getBackoffDelay(attempt);
        logger.info(`Retrying in ${delay}ms`);
        await sleep(delay);
      } else {
        logger.critical('Reconciliation scheduler failed after all retries', {
          error,
          maxRetries: RETRY_CONFIG.maxRetries,
        });
      }
    } finally {
      if (lockAcquired) {
        try {
          await releaseSchedulerLock(db);
        } catch (unlockError) {
          logger.error('Failed to release scheduler lock', { error: unlockError });
        }
      }
    }
  }
}

async function reconciliationCronPlugin(fastify: FastifyInstance) {
  if (!config.reconciliation.scheduler.enabled) {
    fastify.log.info('Reconciliation scheduler disabled');
    return;
  }

  const db = fastify.db;
  if (!db) {
    fastify.log.warn('Database not available, skipping reconciliation scheduler registration');
    return;
  }

  const cronSchedule = config.reconciliation.scheduler.cronSchedule;

  if (!cron.validate(cronSchedule)) {
    fastify.log.error(`Invalid cron schedule: ${cronSchedule}`);
    return;
  }

  // Create scheduler dependencies
  const jobRepository = new PostgresReconciliationRepository(db);
  const addressRepository = new PostgresAddressRepository(db);
  const reconciliationService = new ReconciliationService({
    jobRepository,
    transactionRepository: fastify.repositories.transactions,
    addressRepository,
  });
  const scheduler = new ReconciliationScheduler({
    addressRepository,
    reconciliationService,
  });

  fastify.log.info(`Scheduling reconciliation cron job with schedule: ${cronSchedule}`);

  const task = cron.schedule(
    cronSchedule,
    async () => {
      fastify.log.info('Reconciliation cron job triggered');
      await runScheduledReconciliation(db, scheduler);
    },
    {
      timezone: 'UTC',
    }
  );

  // Stop cron on server close
  fastify.addHook('onClose', async () => {
    fastify.log.info('Stopping reconciliation cron job');
    task.stop();
  });
}

export default fp(reconciliationCronPlugin, {
  name: 'reconciliation-cron',
  dependencies: ['database'],
});
```

**Step 4: Run tests to verify they pass**

Run:
```bash
cd services/core && npm test -- --run tests/unit/plugins/reconciliation-cron.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add services/core/src/plugins/reconciliation-cron.ts services/core/tests/unit/plugins/reconciliation-cron.test.ts
git commit -m "feat(reconciliation): add cron scheduler plugin with distributed locking"
```

---

### Task 5: Register plugin in app

**Files:**
- Modify: `services/core/src/app.ts`

**Step 1: Import and register the plugin**

Find where plugins are registered in `services/core/src/app.ts` and add:

```typescript
import reconciliationCronPlugin from './plugins/reconciliation-cron.js';

// After other plugin registrations (after database plugin)
await app.register(reconciliationCronPlugin);
```

**Step 2: Verify app starts**

Run:
```bash
cd services/core && npx tsc --noEmit
```
Expected: No errors

**Step 3: Commit**

```bash
git add services/core/src/app.ts
git commit -m "feat(app): register reconciliation cron plugin"
```

---

### Task 6: Update env files for testing

**Files:**
- Modify: `services/core/envs/.env.local.test`
- Modify: `services/core/envs/.env.dev.test`

**Step 1: Add scheduler config to test env files**

Add to both env files:

```bash
RECONCILIATION_SCHEDULER_ENABLED=false
```

**Step 2: Commit**

```bash
git add services/core/envs/.env.local.test services/core/envs/.env.dev.test
git commit -m "chore(env): add reconciliation scheduler config to test environments"
```

---

### Task 7: Run full test suite

**Step 1: Run all tests**

Run:
```bash
cd services/core && npm test
```
Expected: All tests pass

**Step 2: Run type check**

Run:
```bash
cd services/core && npx tsc --noEmit
```
Expected: No errors

---

## Summary

After completing all tasks, you will have:
- `node-cron` dependency installed
- Configuration for `RECONCILIATION_SCHEDULER_ENABLED` and `RECONCILIATION_CRON_SCHEDULE`
- `scheduler-lock.ts` helper for PostgreSQL advisory locks
- `reconciliation-cron.ts` Fastify plugin with retry logic
- Full test coverage for new components
