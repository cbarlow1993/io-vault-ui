import type { FastifyInstance } from 'fastify';
import { initiateReconciliation, getJob, listJobs } from '@/src/routes/reconciliation/handlers.js';
import {
  initiateReconciliationPathSchema,
  initiateReconciliationBodySchema,
  initiateReconciliationResponseSchema,
  getJobPathSchema,
  jobDetailResponseSchema,
  listJobsPathSchema,
  listJobsQuerySchema,
  listJobsResponseSchema,
} from '@/src/routes/reconciliation/schemas.js';

/**
 * Reconciliation routes - routes for managing transaction reconciliation jobs
 */
export default async function reconciliationRoutes(fastify: FastifyInstance) {
  // ==================== Initiate Reconciliation ====================

  /**
   * POST /addresses/:address/chain/:chainAlias/reconcile
   * Initiate a new reconciliation job for an address on a chain
   */
  fastify.post(
    '/addresses/:address/chain/:chainAlias/reconcile',
    {
      schema: {
        tags: ['Reconciliation'],
        summary: 'Initiate transaction reconciliation',
        description:
          'Creates a new reconciliation job that compares on-chain transaction data with locally stored records to identify discrepancies, missing transactions, and data integrity issues.',
        params: initiateReconciliationPathSchema,
        body: initiateReconciliationBodySchema,
        response: {
          202: initiateReconciliationResponseSchema,
        },
      },
    },
    initiateReconciliation
  );

  // ==================== Get Job ====================

  /**
   * GET /reconciliation-jobs/:jobId
   * Get details of a reconciliation job
   */
  fastify.get(
    '/reconciliation-jobs/:jobId',
    {
      schema: {
        tags: ['Reconciliation'],
        summary: 'Get reconciliation job details',
        description:
          'Retrieves detailed information about a specific reconciliation job including its status, summary statistics, timing information, and audit log.',
        params: getJobPathSchema,
        response: {
          200: jobDetailResponseSchema,
        },
      },
    },
    getJob
  );

  // ==================== List Jobs ====================

  /**
   * GET /addresses/:address/chain/:chainAlias/reconciliation-jobs
   * List reconciliation jobs for an address on a chain
   */
  fastify.get(
    '/addresses/:address/chain/:chainAlias/reconciliation-jobs',
    {
      schema: {
        tags: ['Reconciliation'],
        summary: 'List reconciliation jobs',
        description:
          'Retrieves a paginated list of reconciliation jobs for the specified address on the given chain.',
        params: listJobsPathSchema,
        querystring: listJobsQuerySchema,
        response: {
          200: listJobsResponseSchema,
        },
      },
    },
    listJobs
  );
}
