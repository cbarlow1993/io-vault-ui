import { z } from 'zod';

// ==================== Path Parameter Schemas ====================

/**
 * Schema for initiate reconciliation path parameters
 * POST /addresses/:address/chain/:chainAlias/reconcile
 */
export const initiateReconciliationPathSchema = z.object({
  address: z.string().min(1),
  chainAlias: z.string().min(1),
});

/**
 * Schema for get job path parameters
 * GET /reconciliation-jobs/:jobId
 */
export const getJobPathSchema = z.object({
  jobId: z.string().uuid(),
});

/**
 * Schema for list jobs path parameters
 * GET /addresses/:address/chain/:chainAlias/reconciliation-jobs
 */
export const listJobsPathSchema = z.object({
  address: z.string().min(1),
  chainAlias: z.string().min(1),
});

// ==================== Query Parameter Schemas ====================

/**
 * Schema for list jobs query parameters
 */
export const listJobsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

// ==================== Request Body Schemas ====================

/**
 * Schema for initiate reconciliation request body
 */
export const initiateReconciliationBodySchema = z.object({
  mode: z.enum(['full', 'partial']).optional().default('partial'),
  fromBlock: z.coerce.number().int().min(0).optional(),
  toBlock: z.coerce.number().int().min(0).optional(),
  // Keep existing timestamp fields for backwards compatibility
  fromTimestamp: z.coerce.number().optional(),
  toTimestamp: z.coerce.number().optional(),
});

// ==================== Response Schemas ====================

/**
 * Job status enum
 */
export const jobStatusSchema = z.enum(['pending', 'running', 'paused', 'completed', 'failed']);

/**
 * Job summary schema for list responses
 */
export const jobSummarySchema = z.object({
  jobId: z.string(),
  status: jobStatusSchema,
  address: z.string(),
  chainAlias: z.string(),
  createdAt: z.string(),
});

/**
 * Response schema for initiate reconciliation
 */
export const initiateReconciliationResponseSchema = z.object({
  jobId: z.string(),
  status: jobStatusSchema,
  mode: z.enum(['full', 'partial']),
  fromBlock: z.number().nullable(),
  toBlock: z.number().nullable(),
  createdAt: z.string(),
  address: z.string(),
  chainAlias: z.string(),
});

/**
 * Audit entry schema
 */
export const auditEntrySchema = z.object({
  action: z.enum(['added', 'soft_deleted', 'discrepancy', 'error']),
  transactionHash: z.string(),
  beforeSnapshot: z.record(z.string(), z.unknown()).nullable(),
  afterSnapshot: z.record(z.string(), z.unknown()).nullable(),
  discrepancyFields: z.array(z.string()).nullable(),
  errorMessage: z.string().nullable(),
});

/**
 * Job detail response schema
 */
export const jobDetailResponseSchema = z.object({
  jobId: z.string(),
  status: jobStatusSchema,
  mode: z.enum(['full', 'partial']),
  fromBlock: z.number().nullable(),
  toBlock: z.number().nullable(),
  finalBlock: z.number().nullable(),
  address: z.string(),
  chainAlias: z.string(),
  provider: z.string(),
  summary: z.object({
    transactionsProcessed: z.number(),
    transactionsAdded: z.number(),
    transactionsSoftDeleted: z.number(),
    discrepanciesFlagged: z.number(),
    errors: z.number(),
  }),
  timing: z.object({
    createdAt: z.string(),
    startedAt: z.string().nullable(),
    completedAt: z.string().nullable(),
    durationMs: z.number().nullable(),
  }),
  auditLog: z.array(auditEntrySchema),
});

/**
 * List jobs response schema
 */
export const listJobsResponseSchema = z.object({
  data: z.array(jobSummarySchema),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    hasMore: z.boolean(),
  }),
});

// ==================== Type Exports ====================

export type InitiateReconciliationPath = z.infer<typeof initiateReconciliationPathSchema>;
export type InitiateReconciliationBody = z.infer<typeof initiateReconciliationBodySchema>;
export type GetJobPath = z.infer<typeof getJobPathSchema>;
export type ListJobsPath = z.infer<typeof listJobsPathSchema>;
export type ListJobsQuery = z.infer<typeof listJobsQuerySchema>;
export type JobStatus = z.infer<typeof jobStatusSchema>;
export type JobSummary = z.infer<typeof jobSummarySchema>;
export type InitiateReconciliationResponse = z.infer<typeof initiateReconciliationResponseSchema>;
export type AuditEntry = z.infer<typeof auditEntrySchema>;
export type JobDetailResponse = z.infer<typeof jobDetailResponseSchema>;
export type ListJobsResponse = z.infer<typeof listJobsResponseSchema>;
