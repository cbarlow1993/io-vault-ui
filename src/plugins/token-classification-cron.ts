import cron from 'node-cron';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { logger } from '@/utils/powertools.js';
import { config } from '@/src/lib/config.js';
import { TokenClassificationWorker } from '@/src/services/token-classification/token-classification-worker.js';
import { SpamClassificationService } from '@/src/services/spam/spam-classification-service.js';
import { BlockaidProvider } from '@/src/services/spam/providers/blockaid-provider.js';
import { CoingeckoProvider } from '@/src/services/spam/providers/coingecko-provider.js';
import { HeuristicsProvider } from '@/src/services/spam/providers/heuristics-provider.js';
import {
  acquireSchedulerLock,
  releaseSchedulerLock,
} from '@/src/services/reconciliation/scheduler-lock.js';
import type { Kysely } from 'kysely';
import type { Database } from '@/src/lib/database/types.js';

const LOCK_NAME = 'token_classification_scheduler';

/**
 * Runs the token classification worker with distributed locking.
 * Exported for testing.
 */
export async function runTokenClassificationWorker(
  db: Kysely<Database>,
  worker: TokenClassificationWorker
): Promise<void> {
  let lockAcquired = false;

  try {
    lockAcquired = await acquireSchedulerLock(db, LOCK_NAME);

    if (!lockAcquired) {
      logger.info('Another instance is running the token classification worker, skipping');
      return;
    }

    const startTime = Date.now();
    const result = await worker.run();
    const durationMs = Date.now() - startTime;

    logger.info('Token classification worker completed', {
      ...result,
      durationMs,
    });
  } catch (error) {
    logger.error('Token classification worker failed', { error });
  } finally {
    if (lockAcquired) {
      try {
        await releaseSchedulerLock(db, LOCK_NAME);
      } catch (unlockError) {
        logger.error('Failed to release token classification lock', { error: unlockError });
      }
    }
  }
}

async function tokenClassificationCronPlugin(fastify: FastifyInstance) {
  if (!config.tokenClassification.scheduler.enabled) {
    fastify.log.info('Token classification scheduler disabled');
    return;
  }

  const db = fastify.db;
  if (!db) {
    fastify.log.warn('Database not available, skipping token classification scheduler registration');
    return;
  }

  const cronSchedule = config.tokenClassification.scheduler.cronSchedule;

  if (!cron.validate(cronSchedule)) {
    fastify.log.error(`Invalid cron schedule: ${cronSchedule}`);
    return;
  }

  // Create classification service with providers
  const providers = [
    new BlockaidProvider(),
    new CoingeckoProvider(),
    new HeuristicsProvider(),
  ];
  const classificationService = new SpamClassificationService(providers);

  // Create worker
  const worker = new TokenClassificationWorker({
    tokenRepository: fastify.repositories.tokens,
    classificationService,
    batchSize: config.tokenClassification.scheduler.batchSize,
    maxAttempts: config.tokenClassification.scheduler.maxAttempts,
    ttlHours: config.tokenClassification.ttlHours,
  });

  fastify.log.info(`Scheduling token classification cron job with schedule: ${cronSchedule}`);

  const task = cron.schedule(
    cronSchedule,
    async () => {
      fastify.log.info('Token classification cron job triggered');
      await runTokenClassificationWorker(db, worker);
    },
    {
      timezone: 'UTC',
    }
  );

  // Stop cron on server close
  fastify.addHook('onClose', async () => {
    fastify.log.info('Stopping token classification cron job');
    task.stop();
  });
}

export default fp(tokenClassificationCronPlugin, {
  name: 'token-classification-cron',
  dependencies: ['database'],
});
