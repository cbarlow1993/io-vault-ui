import type { FastifyInstance } from 'fastify';
import { requireAccess } from '@/src/middleware/require-access.js';
import {
  createWorkflowBodySchema,
  workflowParamsSchema,
  rejectBodySchema,
  historyQuerySchema,
} from './schemas.js';
import {
  createWorkflowHandler,
  confirmWorkflowHandler,
  approveWorkflowHandler,
  rejectWorkflowHandler,
  getWorkflowHandler,
  getWorkflowHistoryHandler,
} from './handlers.js';

export async function workflowRoutes(server: FastifyInstance) {
  // Create workflow
  server.post(
    '/',
    {
      preHandler: [requireAccess('treasury', 'initiate_transfer')],
      schema: {
        body: createWorkflowBodySchema,
        tags: ['Workflows'],
        summary: 'Create a new transaction workflow',
        description: 'Creates a new transaction workflow. Requires treasury:initiate_transfer permission.',
      },
    },
    createWorkflowHandler
  );

  // Confirm review
  server.post(
    '/:id/confirm',
    {
      preHandler: [requireAccess('treasury', 'approve_transfer')],
      schema: {
        params: workflowParamsSchema,
        tags: ['Workflows'],
        summary: 'Confirm transaction review',
        description: 'Confirms transaction review. Requires treasury:approve_transfer permission.',
      },
    },
    confirmWorkflowHandler
  );

  // Approve
  server.post(
    '/:id/approve',
    {
      preHandler: [requireAccess('treasury', 'approve_transfer')],
      schema: {
        params: workflowParamsSchema,
        tags: ['Workflows'],
        summary: 'Approve transaction',
        description: 'Approves a transaction. Requires treasury:approve_transfer permission.',
      },
    },
    approveWorkflowHandler
  );

  // Reject
  server.post(
    '/:id/reject',
    {
      preHandler: [requireAccess('treasury', 'approve_transfer')],
      schema: {
        params: workflowParamsSchema,
        body: rejectBodySchema,
        tags: ['Workflows'],
        summary: 'Reject transaction',
        description: 'Rejects a transaction. Requires treasury:approve_transfer permission.',
      },
    },
    rejectWorkflowHandler
  );

  // Get workflow
  server.get(
    '/:id',
    {
      preHandler: [requireAccess('treasury', 'view_transactions')],
      schema: {
        params: workflowParamsSchema,
        tags: ['Workflows'],
        summary: 'Get workflow status',
        description: 'Gets workflow status. Requires treasury:view_transactions permission.',
      },
    },
    getWorkflowHandler
  );

  // Get history
  server.get(
    '/:id/history',
    {
      preHandler: [requireAccess('treasury', 'view_transactions')],
      schema: {
        params: workflowParamsSchema,
        querystring: historyQuerySchema,
        tags: ['Workflows'],
        summary: 'Get workflow event history',
        description: 'Gets workflow event history. Requires treasury:view_transactions permission.',
      },
    },
    getWorkflowHistoryHandler
  );
}
