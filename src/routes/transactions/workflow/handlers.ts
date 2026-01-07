import type { FastifyRequest, FastifyReply } from 'fastify';
import { NotFoundError, OperationForbiddenError } from '@iofinnet/errors-sdk';
import type {
  CreateWorkflowBody,
  WorkflowParams,
  RejectBody,
  HistoryQuery,
} from './schemas.js';

/**
 * Verifies that the authenticated user has access to the workflow.
 * Throws OperationForbiddenError if the user's organisation doesn't match.
 */
async function verifyWorkflowAccess(
  request: FastifyRequest<{ Params: WorkflowParams }>,
  workflowId: string
): Promise<void> {
  const { organisationId } = request.auth!;
  const orchestrator = request.server.services.workflowOrchestrator;

  const workflow = await orchestrator.getById(workflowId);
  if (!workflow) {
    throw new NotFoundError('Workflow not found');
  }

  if (workflow.context.organisationId !== organisationId) {
    throw new OperationForbiddenError('Not authorized to access this workflow');
  }
}

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

  // Verify organisation access
  await verifyWorkflowAccess(request, id);

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
  const { userId, organisationId } = request.auth!;
  const orchestrator = request.server.services.workflowOrchestrator;

  // Fetch workflow and verify access
  const existingWorkflow = await orchestrator.getById(id);
  if (!existingWorkflow) {
    throw new NotFoundError('Workflow not found');
  }

  if (existingWorkflow.context.organisationId !== organisationId) {
    throw new OperationForbiddenError('Not authorized to access this workflow');
  }

  // Verify user is in the approvers list (if approvers are specified)
  const { approvers } = existingWorkflow.context;
  if (approvers.length > 0 && !approvers.includes(userId)) {
    throw new OperationForbiddenError('User is not authorized to approve this workflow');
  }

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

  // Verify organisation access
  await verifyWorkflowAccess(request, id);

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
  const { organisationId } = request.auth!;
  const orchestrator = request.server.services.workflowOrchestrator;

  const workflow = await orchestrator.getById(id);
  if (!workflow) {
    throw new NotFoundError('Workflow not found');
  }

  // Verify organisation access
  if (workflow.context.organisationId !== organisationId) {
    throw new OperationForbiddenError('Not authorized to access this workflow');
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
  const { organisationId } = request.auth!;
  const orchestrator = request.server.services.workflowOrchestrator;
  const eventsRepo = request.server.services.workflowEventsRepo;

  const workflow = await orchestrator.getById(id);
  if (!workflow) {
    throw new NotFoundError('Workflow not found');
  }

  // Verify organisation access
  if (workflow.context.organisationId !== organisationId) {
    throw new OperationForbiddenError('Not authorized to access this workflow');
  }

  // Use database-level pagination for efficiency
  const { events, nextCursor } = await eventsRepo.findByWorkflowIdPaginated(id, {
    limit,
    cursor,
  });

  return reply.send({
    workflowId: id,
    history: events.map((e) => ({
      id: e.id,
      event: e.eventType,
      fromState: e.fromState,
      toState: e.toState,
      triggeredBy: e.triggeredBy,
      timestamp: e.createdAt.toISOString(),
    })),
    pagination: {
      nextCursor,
      hasMore: nextCursor !== null,
    },
  });
}
