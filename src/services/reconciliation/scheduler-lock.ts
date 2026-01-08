import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import type { Database } from '@/src/lib/database/types.js';

/**
 * Lock name to numeric ID mappings for PostgreSQL advisory locks.
 * Each scheduler needs a unique lock ID to prevent conflicts.
 */
export const LOCK_IDS: Record<string, number> = {
  reconciliation_scheduler: 738523901,
  token_classification_scheduler: 738523902,
};

/**
 * Default lock name for backwards compatibility.
 */
const DEFAULT_LOCK_NAME = 'reconciliation_scheduler';

/**
 * Gets the numeric lock ID for a given lock name.
 * Falls back to a hash of the name for unknown locks.
 */
function getLockId(lockName: string): number {
  if (lockName in LOCK_IDS) {
    return LOCK_IDS[lockName]!;
  }
  // Simple hash for unknown lock names
  let hash = 0;
  for (let i = 0; i < lockName.length; i++) {
    const char = lockName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Attempts to acquire a scheduler advisory lock.
 * Returns true if the lock was acquired, false if another instance holds it.
 * This is non-blocking - it returns immediately.
 *
 * @param db - The Kysely database instance
 * @param lockName - The name of the lock (default: 'reconciliation_scheduler')
 */
export async function acquireSchedulerLock(
  db: Kysely<Database>,
  lockName: string = DEFAULT_LOCK_NAME
): Promise<boolean> {
  const lockId = getLockId(lockName);
  const result = await sql<{ pg_try_advisory_lock: boolean }>`
    SELECT pg_try_advisory_lock(${lockId})
  `.execute(db);

  return result.rows[0]?.pg_try_advisory_lock === true;
}

/**
 * Releases a scheduler advisory lock.
 * Should be called after the scheduling operation completes.
 *
 * @param db - The Kysely database instance
 * @param lockName - The name of the lock (default: 'reconciliation_scheduler')
 */
export async function releaseSchedulerLock(
  db: Kysely<Database>,
  lockName: string = DEFAULT_LOCK_NAME
): Promise<void> {
  const lockId = getLockId(lockName);
  await sql`SELECT pg_advisory_unlock(${lockId})`.execute(db);
}
