import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { ReconciliationWorker } from '@/src/services/reconciliation/reconciliation-worker.js';
import { PostgresReconciliationRepository } from '@/src/repositories/reconciliation.repository.js';
import { PostgresAddressRepository } from '@/src/repositories/address.repository.js';
import { TransactionProcessor } from '@/src/services/transaction-processor/index.js';
import { getEvmRpcUrls, getSvmRpcUrls } from '@/src/lib/chains.js';
import { config } from '@/src/lib/config.js';

declare module 'fastify' {
  interface FastifyInstance {
    reconciliationWorker: ReconciliationWorker;
  }
}

async function reconciliationWorkerPlugin(fastify: FastifyInstance) {
  const db = fastify.db;

  if (!db) {
    fastify.log.warn('Database not available, skipping reconciliation worker registration');
    return;
  }

  // Create TransactionProcessor for fetching, classifying, and upserting transactions
  const transactionProcessor = new TransactionProcessor({
    evmRpcUrls: getEvmRpcUrls(),
    svmRpcUrls: getSvmRpcUrls(),
    novesApiKey: config.apis.noves.apiKey,
    db,
  });

  const worker = new ReconciliationWorker({
    jobRepository: new PostgresReconciliationRepository(db),
    transactionRepository: fastify.repositories.transactions,
    transactionProcessor,
    addressRepository: new PostgresAddressRepository(db),
  });

  // Decorate fastify instance with worker
  fastify.decorate('reconciliationWorker', worker);

  // Start worker when server is ready
  fastify.addHook('onReady', async () => {
    fastify.log.info('Starting reconciliation worker');
    // Run worker in background (non-blocking)
    worker.start().catch((err) => {
      fastify.log.error(err, 'Reconciliation worker error');
    });
  });

  // Stop worker on server close with graceful shutdown
  fastify.addHook('onClose', async () => {
    fastify.log.info('Stopping reconciliation worker');
    await worker.stop();
  });
}

export default fp(reconciliationWorkerPlugin, {
  name: 'reconciliation-worker',
  dependencies: ['database'], // Ensure database plugin is loaded first
});
