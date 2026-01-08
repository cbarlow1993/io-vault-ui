import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import type { Database } from '@/src/lib/database/types.js';

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
export async function acquireSchedulerLock(db: Kysely<Database>): Promise<boolean> {
  const result = await sql<{ pg_try_advisory_lock: boolean }>`
    SELECT pg_try_advisory_lock(${SCHEDULER_LOCK_ID})
  `.execute(db);

  return result.rows[0]?.pg_try_advisory_lock === true;
}

/**
 * Releases the scheduler advisory lock.
 * Should be called after the scheduling operation completes.
 */
export async function releaseSchedulerLock(db: Kysely<Database>): Promise<void> {
  await sql`SELECT pg_advisory_unlock(${SCHEDULER_LOCK_ID})`.execute(db);
}
