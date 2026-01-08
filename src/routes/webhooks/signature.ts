import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'node:crypto';
import { config } from '@/src/lib/config.js';

const signatureWebhookSchema = z.object({
  workflowId: z.uuid(),
  requestId: z.string(),
  success: z.boolean(),
  signature: z.string().optional(),
  error: z.string().optional(),
});

type SignatureWebhookBody = z.infer<typeof signatureWebhookSchema>;

/**
 * Verifies HMAC-SHA256 signature of the webhook payload.
 * Expected header format: sha256=<hex-encoded-signature>
 */
function verifyWebhookSignature(
  payload: string,
  signatureHeader: string | undefined,
  secret: string
): boolean {
  if (!signatureHeader) {
    return false;
  }

  const expectedSignature = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')}`;

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

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
      // Verify webhook signature if secret is configured
      const webhookSecret = config.webhooks.signingService.secret;
      if (webhookSecret) {
        const signatureHeader = request.headers['x-webhook-signature'] as string | undefined;
        const rawBody = JSON.stringify(request.body);

        if (!verifyWebhookSignature(rawBody, signatureHeader, webhookSecret)) {
          server.log.warn('Invalid webhook signature received');
          return reply.status(401).send({ error: 'Invalid signature' });
        }
      }

      const { workflowId, requestId, success, signature, error } = request.body;
      const orchestrator = server.services.workflowOrchestrator;
      const eventsRepo = server.services.workflowEventsRepo;

      // Idempotency check
      const existingEvents = await eventsRepo.findByWorkflowId(workflowId);
      const isDuplicate = existingEvents.some(
        (e) => (e.eventPayload as Record<string, unknown>)?.requestId === requestId
      );

      if (isDuplicate) {
        server.log.info({ workflowId, requestId }, 'Duplicate webhook received, ignoring');
        return reply.status(200).send({ received: true, duplicate: true });
      }

      // State check - use getById not get
      const workflow = await orchestrator.getById(workflowId);
      if (!workflow || workflow.state !== 'waiting_signature') {
        server.log.warn(
          { workflowId, currentState: workflow?.state },
          'Webhook received for workflow not awaiting signature'
        );
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
