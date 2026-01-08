import cron from 'node-cron';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { logger } from '@/utils/powertools.js';
import { config } from '@/src/lib/config.js';
import { ReconciliationScheduler } from '@/src/services/reconciliation/reconciliation-scheduler.js';
import { ReconciliationService } from '@/src/services/reconciliation/reconciliation-service.js';
import {
  acquireSchedulerLock,
  releaseSchedulerLock,
} from '@/src/services/reconciliation/scheduler-lock.js';
import { PostgresReconciliationRepository } from '@/src/repositories/reconciliation.repository.js';
import { PostgresAddressRepository } from '@/src/repositories/address.repository.js';
import type { Kysely } from 'kysely';
import type { Database } from '@/src/lib/database/types.js';

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
  db: Kysely<Database>,
  scheduler: ReconciliationScheduler
): Promise<void> {
  let lockAcquired = false;

  try {
    lockAcquired = await acquireSchedulerLock(db);

    if (!lockAcquired) {
      logger.info('Another instance is running the reconciliation scheduler, skipping');
      return;
    }

    // Retry loop WITHOUT lock acquisition inside
    for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        const result = await scheduler.schedulePartialReconciliation();
        const durationMs = Date.now() - startTime;

        logger.info('Reconciliation scheduler completed', {
          scheduled: result.scheduled,
          errors: result.errors,
          durationMs,
          attempt,
        });

        return; // Success, exit
      } catch (error) {
        logger.warn('Reconciliation scheduler attempt failed', {
          error,
          attempt,
          maxRetries: RETRY_CONFIG.maxRetries,
        });

        if (attempt < RETRY_CONFIG.maxRetries) {
          const delay = getBackoffDelay(attempt);
          logger.info('Scheduling retry', { delayMs: delay });
          await sleep(delay);
        } else {
          logger.critical('Reconciliation scheduler failed after all retries', {
            error,
            maxRetries: RETRY_CONFIG.maxRetries,
          });
        }
      }
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
