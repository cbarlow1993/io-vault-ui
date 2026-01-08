import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { InternalServerError, NotFoundError, UserInputError } from '@iofinnet/errors-sdk';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  ReconciliationService,
  type JobWithAuditLog,
} from '@/src/services/reconciliation/reconciliation-service.js';
import { initializeProviders } from '@/src/services/reconciliation/providers/registry.js';
import { PostgresReconciliationRepository } from '@/src/repositories/reconciliation.repository.js';
import { PostgresTransactionRepository } from '@/src/repositories/transaction.repository.js';
import { PostgresAddressRepository } from '@/src/repositories/address.repository.js';
import { config } from '@/src/lib/config.js';
import { logger } from '@/utils/powertools.js';
import type {
  InitiateReconciliationPath,
  InitiateReconciliationBody,
  GetJobPath,
  ListJobsPath,
  ListJobsQuery,
} from '@/src/routes/reconciliation/schemas.js';

// Initialize providers on module load
try {
  if (config.apis.noves.apiKey) {
    initializeProviders({ novesApiKey: config.apis.noves.apiKey });
    logger.info('Reconciliation providers initialized successfully');
  } else {
    logger.warn('Noves API key not configured - reconciliation providers not initialized');
  }
} catch (error) {
  // Log error but don't crash - providers may be initialized elsewhere (e.g., by the worker plugin)
  logger.error('Failed to initialize reconciliation providers', {
    error: error instanceof Error ? { message: error.message, name: error.name } : error,
  });
}


/**
 * Helper function to create a ReconciliationService instance
 * using the Fastify instance's database connection.
 */
function getService(request: FastifyRequest): ReconciliationService {
  const db = request.server.db;
  if (!db) {
    throw new InternalServerError('Database connection not available');
  }
  const jobRepository = new PostgresReconciliationRepository(db);
  const transactionRepository = new PostgresTransactionRepository(db);
  const addressRepository = new PostgresAddressRepository(db);

  return new ReconciliationService({
    jobRepository,
    transactionRepository,
    addressRepository,
  });
}

/**
 * Calculate duration in milliseconds between two dates
 */
function calculateDurationMs(startedAt: Date | null, completedAt: Date | null): number | null {
  if (!startedAt || !completedAt) {
    return null;
  }
  return completedAt.getTime() - startedAt.getTime();
}

/**
 * Format a job with audit log into the API response format
 */
function formatJobDetailResponse(job: JobWithAuditLog) {
  return {
    jobId: job.id,
    status: job.status,
    mode: job.mode,
    fromBlock: job.fromBlock !== null ? Number(job.fromBlock) : null,
    toBlock: job.toBlock !== null ? Number(job.toBlock) : null,
    finalBlock: job.finalBlock !== null ? Number(job.finalBlock) : null,
    address: job.address,
    chainAlias: job.chainAlias,
    provider: job.provider,
    summary: {
      transactionsProcessed: job.processedCount,
      transactionsAdded: job.transactionsAdded,
      transactionsSoftDeleted: job.transactionsSoftDeleted,
      discrepanciesFlagged: job.discrepanciesFlagged,
      errors: job.errorsCount,
    },
    timing: {
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
      durationMs: calculateDurationMs(job.startedAt, job.completedAt),
    },
    auditLog: job.auditLog.map((entry) => ({
      action: entry.action,
      transactionHash: entry.transactionHash,
      beforeSnapshot: entry.beforeSnapshot,
      afterSnapshot: entry.afterSnapshot,
      discrepancyFields: entry.discrepancyFields,
      errorMessage: entry.errorMessage,
    })),
  };
}

// ==================== Initiate Reconciliation ====================

/**
 * Initiate a new reconciliation job for an address on a chain alias
 * POST /addresses/:address/chains/:chainAlias/reconcile
 */
export async function initiateReconciliation(
  request: FastifyRequest<{
    Params: InitiateReconciliationPath;
    Body: InitiateReconciliationBody;
  }>,
  reply: FastifyReply
) {
  const { address, chainAlias } = request.params;
  const { mode, fromBlock, toBlock, fromTimestamp, toTimestamp } = request.body ?? {};

  const service = getService(request);

  // Check if there's already an active job for this address/chainAlias
  const activeJob = await service.findActiveJob(address, chainAlias as ChainAlias);
  if (activeJob) {
    if (activeJob.status === 'running') {
      // Block new jobs while one is already running
      throw new UserInputError(
        `A reconciliation job is already running for address ${address} on chain ${chainAlias}. ` +
          `Job ID: ${activeJob.id}. Please wait for it to complete.`
      );
    } else if (activeJob.status === 'pending') {
      // Replace pending job with new one
      logger.info('Replacing pending reconciliation job with new request', {
        oldJobId: activeJob.id,
        address,
        chainAlias,
      });
      await service.deleteJob(activeJob.id);
    }
  }

  const job = await service.createJob({
    address,
    chainAlias: chainAlias as ChainAlias,
    mode,
    fromBlock,
    toBlock,
    fromTimestamp: fromTimestamp ? new Date(fromTimestamp * 1000) : undefined,
    toTimestamp: toTimestamp ? new Date(toTimestamp * 1000) : undefined,
  });

  return reply.status(202).send({
    jobId: job.id,
    status: job.status,
    mode: job.mode,
    fromBlock: job.fromBlock !== null ? Number(job.fromBlock) : null,
    toBlock: job.toBlock !== null ? Number(job.toBlock) : null,
    createdAt: job.createdAt.toISOString(),
    address: job.address,
    chainAlias: job.chainAlias,
  });
}

// ==================== Get Job ====================

/**
 * Get details of a reconciliation job
 * GET /reconciliation-jobs/:jobId
 */
export async function getJob(
  request: FastifyRequest<{
    Params: GetJobPath;
  }>,
  reply: FastifyReply
) {
  const { jobId } = request.params;

  const service = getService(request);
  const job = await service.getJob(jobId);

  if (!job) {
    throw new NotFoundError(`Reconciliation job not found: ${jobId}`);
  }

  return reply.send(formatJobDetailResponse(job));
}

// ==================== List Jobs ====================

/**
 * List reconciliation jobs for an address on a chain alias
 * GET /addresses/:address/chains/:chainAlias/reconciliation-jobs
 */
export async function listJobs(
  request: FastifyRequest<{
    Params: ListJobsPath;
    Querystring: ListJobsQuery;
  }>,
  reply: FastifyReply
) {
  const { address, chainAlias } = request.params;
  const { limit, offset } = request.query;

  const service = getService(request);
  const result = await service.listJobs(address, chainAlias as ChainAlias, { limit, offset });

  const hasMore = offset + result.data.length < result.total;

  return reply.send({
    data: result.data.map((job) => ({
      jobId: job.jobId,
      status: job.status,
      address: job.address,
      chainAlias: job.chainAlias,
      createdAt: job.createdAt.toISOString(),
    })),
    pagination: {
      total: result.total,
      limit,
      offset,
      hasMore,
    },
  });
}
