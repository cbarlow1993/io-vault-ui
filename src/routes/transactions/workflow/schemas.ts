import { z } from 'zod';

export const createWorkflowBodySchema = z.object({
  vaultId: z.string().min(1),
  chainAlias: z.string().min(1),
  marshalledHex: z.string().min(1),
  skipReview: z.boolean().optional().default(false),
});

export const workflowParamsSchema = z.object({
  id: z.string().uuid(),
});

export const confirmBodySchema = z.object({}).optional();

export const approveBodySchema = z.object({}).optional();

export const rejectBodySchema = z.object({
  reason: z.string().min(1),
});

export const historyQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  cursor: z.string().uuid().optional(),
});

export const workflowResponseSchema = z.object({
  id: z.string().uuid(),
  state: z.string(),
  context: z.object({
    vaultId: z.string(),
    chainAlias: z.string(),
    skipReview: z.boolean(),
    approvers: z.array(z.string()),
    approvedBy: z.string().nullable(),
    txHash: z.string().nullable(),
    blockNumber: z.number().nullable(),
    error: z.string().nullable(),
    failedAt: z.string().nullable(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const historyEventSchema = z.object({
  id: z.string().uuid(),
  event: z.string(),
  fromState: z.string(),
  toState: z.string(),
  triggeredBy: z.string().nullable(),
  timestamp: z.string(),
});

export const historyResponseSchema = z.object({
  workflowId: z.string().uuid(),
  history: z.array(historyEventSchema),
  pagination: z.object({
    nextCursor: z.string().uuid().nullable(),
    hasMore: z.boolean(),
  }),
});

export type CreateWorkflowBody = z.infer<typeof createWorkflowBodySchema>;
export type WorkflowParams = z.infer<typeof workflowParamsSchema>;
export type RejectBody = z.infer<typeof rejectBodySchema>;
export type HistoryQuery = z.infer<typeof historyQuerySchema>;
