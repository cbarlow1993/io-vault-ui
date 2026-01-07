import type { FastifyInstance } from 'fastify';
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
      schema: {
        body: createWorkflowBodySchema,
        tags: ['Workflows'],
        summary: 'Create a new transaction workflow',
      },
    },
    createWorkflowHandler
  );

  // Confirm review
  server.post(
    '/:id/confirm',
    {
      schema: {
        params: workflowParamsSchema,
        tags: ['Workflows'],
        summary: 'Confirm transaction review',
      },
    },
    confirmWorkflowHandler
  );

  // Approve
  server.post(
    '/:id/approve',
    {
      schema: {
        params: workflowParamsSchema,
        tags: ['Workflows'],
        summary: 'Approve transaction',
      },
    },
    approveWorkflowHandler
  );

  // Reject
  server.post(
    '/:id/reject',
    {
      schema: {
        params: workflowParamsSchema,
        body: rejectBodySchema,
        tags: ['Workflows'],
        summary: 'Reject transaction',
      },
    },
    rejectWorkflowHandler
  );

  // Get workflow
  server.get(
    '/:id',
    {
      schema: {
        params: workflowParamsSchema,
        tags: ['Workflows'],
        summary: 'Get workflow status',
      },
    },
    getWorkflowHandler
  );

  // Get history
  server.get(
    '/:id/history',
    {
      schema: {
        params: workflowParamsSchema,
        querystring: historyQuerySchema,
        tags: ['Workflows'],
        summary: 'Get workflow event history',
      },
    },
    getWorkflowHistoryHandler
  );
}
