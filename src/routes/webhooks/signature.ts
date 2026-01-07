import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const signatureWebhookSchema = z.object({
  workflowId: z.string().uuid(),
  requestId: z.string(),
  success: z.boolean(),
  signature: z.string().optional(),
  error: z.string().optional(),
});

type SignatureWebhookBody = z.infer<typeof signatureWebhookSchema>;

export async function signatureWebhookRoutes(server: FastifyInstance) {
  server.post<{ Body: SignatureWebhookBody }>(
    '/signature',
    {
      schema: {
        body: signatureWebhookSchema,
        tags: ['Webhooks'],
        summary: 'Receive signature completion webhook',
      },
    },
    async (request, reply) => {
      const { workflowId, requestId, success, signature, error } = request.body;
      const orchestrator = server.services.workflowOrchestrator;
      const eventsRepo = server.services.workflowEventsRepo;

      // Idempotency check
      const existingEvents = await eventsRepo.findByWorkflowId(workflowId);
      const isDuplicate = existingEvents.some(
        (e) => (e.eventPayload as Record<string, unknown>)?.requestId === requestId
      );

      if (isDuplicate) {
        server.log.info('Duplicate webhook received, ignoring', {
          workflowId,
          requestId,
        });
        return reply.status(200).send({ received: true, duplicate: true });
      }

      // State check - use getById not get
      const workflow = await orchestrator.getById(workflowId);
      if (!workflow || workflow.state !== 'waiting_signature') {
        server.log.warn('Webhook received for workflow not awaiting signature', {
          workflowId,
          currentState: workflow?.state,
        });
        return reply.status(200).send({ received: true, ignored: true });
      }

      if (success && signature) {
        await orchestrator.send(
          workflowId,
          { type: 'SIGNATURE_RECEIVED', signature },
          'webhook:signing-service'
        );

        // TODO: Trigger broadcast service
      } else {
        await orchestrator.send(
          workflowId,
          { type: 'SIGNATURE_FAILED', reason: error ?? 'Unknown error' },
          'webhook:signing-service'
        );
      }

      return reply.status(200).send({ received: true });
    }
  );
}
