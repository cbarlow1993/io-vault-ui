import type { FastifyRequest, FastifyReply } from 'fastify';
import { NotFoundError, OperationForbiddenError } from '@iofinnet/errors-sdk';
import type {
  CreateWorkflowBody,
  WorkflowParams,
  RejectBody,
  HistoryQuery,
} from './schemas.js';

export async function createWorkflowHandler(
  request: FastifyRequest<{ Body: CreateWorkflowBody }>,
  reply: FastifyReply
) {
  const { vaultId, chainAlias, marshalledHex, skipReview } = request.body;
  const { organisationId, userId } = request.auth!;
  const orchestrator = request.server.services.workflowOrchestrator;

  // Verify vault ownership
  const vault = await request.server.services.vault.getVaultDetails(vaultId);
  if (!vault || vault.organisationId !== organisationId) {
    throw new OperationForbiddenError('Not authorized to access this vault');
  }

  // Create workflow
  const workflow = await orchestrator.create({
    vaultId,
    chainAlias,
    marshalledHex,
    organisationId,
    createdBy: { id: userId, type: 'User' },
    skipReview,
  });

  // Send START event
  const updated = await orchestrator.send(
    workflow.id,
    { type: 'START', skipReview },
    `user:${userId}`
  );

  return reply.status(201).send({
    id: updated.id,
    state: updated.state,
  });
}

export async function confirmWorkflowHandler(
  request: FastifyRequest<{ Params: WorkflowParams }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const { userId } = request.auth!;
  const orchestrator = request.server.services.workflowOrchestrator;

  const workflow = await orchestrator.send(
    id,
    { type: 'CONFIRM' },
    `user:${userId}`
  );

  return reply.send({
    id: workflow.id,
    state: workflow.state,
  });
}

export async function approveWorkflowHandler(
  request: FastifyRequest<{ Params: WorkflowParams }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const { userId } = request.auth!;
  const orchestrator = request.server.services.workflowOrchestrator;

  const workflow = await orchestrator.send(
    id,
    { type: 'APPROVE', approvedBy: userId },
    `user:${userId}`
  );

  return reply.send({
    id: workflow.id,
    state: workflow.state,
  });
}

export async function rejectWorkflowHandler(
  request: FastifyRequest<{ Params: WorkflowParams; Body: RejectBody }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const { reason } = request.body!;
  const { userId } = request.auth!;
  const orchestrator = request.server.services.workflowOrchestrator;

  const workflow = await orchestrator.send(
    id,
    { type: 'REJECT', rejectedBy: userId, reason },
    `user:${userId}`
  );

  return reply.send({
    id: workflow.id,
    state: workflow.state,
  });
}

export async function getWorkflowHandler(
  request: FastifyRequest<{ Params: WorkflowParams }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const orchestrator = request.server.services.workflowOrchestrator;

  const workflow = await orchestrator.getById(id);
  if (!workflow) {
    throw new NotFoundError('Workflow not found');
  }

  return reply.send({
    id: workflow.id,
    state: workflow.state,
    context: {
      vaultId: workflow.context.vaultId,
      chainAlias: workflow.context.chainAlias,
      skipReview: workflow.context.skipReview,
      approvers: workflow.context.approvers,
      approvedBy: workflow.context.approvedBy,
      txHash: workflow.context.txHash,
      blockNumber: workflow.context.blockNumber,
      error: workflow.context.error,
      failedAt: workflow.context.failedAt,
    },
    createdAt: workflow.createdAt.toISOString(),
    updatedAt: workflow.updatedAt.toISOString(),
  });
}

export async function getWorkflowHistoryHandler(
  request: FastifyRequest<{ Params: WorkflowParams; Querystring: HistoryQuery }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const { limit, cursor } = request.query;
  const orchestrator = request.server.services.workflowOrchestrator;

  const workflow = await orchestrator.getById(id);
  if (!workflow) {
    throw new NotFoundError('Workflow not found');
  }

  const events = await orchestrator.getHistory(id);

  // Simple pagination (could be optimized with cursor-based approach)
  const startIndex = cursor
    ? events.findIndex((e) => e.id === cursor) + 1
    : 0;
  const paginatedEvents = events.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < events.length;
  const nextCursor = hasMore ? paginatedEvents[paginatedEvents.length - 1]?.id ?? null : null;

  return reply.send({
    workflowId: id,
    history: paginatedEvents.map((e) => ({
      id: e.id,
      event: e.eventType,
      fromState: e.fromState,
      toState: e.toState,
      triggeredBy: e.triggeredBy,
      timestamp: e.createdAt.toISOString(),
    })),
    pagination: {
      nextCursor,
      hasMore,
    },
  });
}
