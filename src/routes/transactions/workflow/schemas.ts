import { z } from 'zod';

// Regex for valid hex string (with optional 0x prefix)
const hexStringRegex = /^(0x)?[a-fA-F0-9]+$/;

export const createWorkflowBodySchema = z.object({
  vaultId: z.uuid(),
  chainAlias: z.string().min(1).max(50),
  marshalledHex: z
    .string()
    .min(1)
    .regex(hexStringRegex, 'Must be a valid hex string'),
  skipReview: z.boolean().optional().default(false),
});

export const workflowParamsSchema = z.object({
  id: z.uuid(),
});

export const confirmBodySchema = z.object({}).optional();

export const approveBodySchema = z.object({}).optional();

export const rejectBodySchema = z.object({
  reason: z.string().min(1),
});

export const historyQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  cursor: z.uuid().optional(),
});

export const workflowResponseSchema = z.object({
  id: z.uuid(),
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
  id: z.uuid(),
  event: z.string(),
  fromState: z.string(),
  toState: z.string(),
  triggeredBy: z.string().nullable(),
  timestamp: z.string(),
});

export const historyResponseSchema = z.object({
  workflowId: z.uuid(),
  history: z.array(historyEventSchema),
  pagination: z.object({
    nextCursor: z.uuid().nullable(),
    hasMore: z.boolean(),
  }),
});

export type CreateWorkflowBody = z.infer<typeof createWorkflowBodySchema>;
export type WorkflowParams = z.infer<typeof workflowParamsSchema>;
export type RejectBody = z.infer<typeof rejectBodySchema>;
export type HistoryQuery = z.infer<typeof historyQuerySchema>;
