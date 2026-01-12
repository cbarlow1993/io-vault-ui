import { createHmac, timingSafeEqual } from 'crypto';

import { createFileRoute } from '@tanstack/react-router';

import { envServer } from '@/env/server';
import { logger } from '@/server/logger';
import {
  handleWebhookEvent,
  type ChargebeeWebhookEvent,
} from '@/server/webhooks/chargebee/handlers';

/**
 * Verify Chargebee webhook signature using HMAC SHA256
 * Chargebee sends the signature in the webhook body as webhook_key
 * or we can verify using the X-Chargebee-Webhook-Key header
 */
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) {
    return false;
  }

  try {
    const expectedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const signatureBuffer = new Uint8Array(Buffer.from(signature, 'utf-8'));
    const expectedBuffer = new Uint8Array(
      Buffer.from(expectedSignature, 'utf-8')
    );

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (error) {
    logger.error({ error }, 'Error verifying webhook signature');
    return false;
  }
}

/**
 * Chargebee webhook endpoint
 * Receives webhook events from Chargebee and routes them to appropriate handlers
 */
export const Route = createFileRoute('/api/webhooks/chargebee')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // If billing is disabled, acknowledge but do nothing
        if (!envServer.ENABLE_CHARGEBEE_BILLING) {
          logger.debug('Chargebee webhook received but billing is disabled');
          return new Response('OK', { status: 200 });
        }

        // Get webhook secret
        const webhookSecret = envServer.CHARGEBEE_WEBHOOK_SECRET;
        if (!webhookSecret) {
          logger.error('CHARGEBEE_WEBHOOK_SECRET is not configured');
          return new Response('Webhook secret not configured', { status: 500 });
        }

        // Read the raw body for signature verification
        let rawBody: string;
        try {
          rawBody = await request.text();
        } catch (error) {
          logger.error({ error }, 'Failed to read webhook body');
          return new Response('Failed to read body', { status: 400 });
        }

        // Parse the event
        let event: ChargebeeWebhookEvent;
        try {
          event = JSON.parse(rawBody) as ChargebeeWebhookEvent;
        } catch (error) {
          logger.error({ error }, 'Failed to parse webhook JSON');
          return new Response('Invalid JSON', { status: 400 });
        }

        // Get signature from header (Chargebee uses various header names)
        const signature =
          request.headers.get('x-chargebee-webhook-key') ??
          request.headers.get('x-chargebee-signature');

        // Verify signature
        // Note: Chargebee's signature verification may differ based on configuration
        // Some implementations use the webhook_key from body instead of header
        if (signature) {
          const isValid = verifyWebhookSignature(
            rawBody,
            signature,
            webhookSecret
          );
          if (!isValid) {
            logger.warn({ eventId: event.id }, 'Invalid webhook signature');
            return new Response('Invalid signature', { status: 401 });
          }
        } else {
          // If no header signature, check for basic auth or API key
          // Chargebee can also authenticate webhooks via basic auth with the webhook password
          const authHeader = request.headers.get('authorization');
          if (authHeader) {
            const expectedBasic = `Basic ${Buffer.from(webhookSecret).toString('base64')}`;
            if (authHeader !== expectedBasic) {
              // Also check if it's just the password as username with empty password
              const expectedBasicPassword = `Basic ${Buffer.from(`${webhookSecret}:`).toString('base64')}`;
              if (authHeader !== expectedBasicPassword) {
                logger.warn(
                  { eventId: event.id },
                  'Invalid webhook authorization'
                );
                return new Response('Invalid authorization', { status: 401 });
              }
            }
          } else {
            // No signature or auth header - check if webhook key is in body (legacy)
            // For security, we still require some form of authentication
            logger.warn(
              { eventId: event.id },
              'No webhook authentication provided'
            );
            return new Response('Authentication required', { status: 401 });
          }
        }

        // Log the incoming event
        logger.info(
          { eventId: event.id, eventType: event.event_type },
          'Received Chargebee webhook'
        );

        // Process the event asynchronously but return quickly
        // This ensures Chargebee doesn't timeout waiting for our response
        // Note: In production, you may want to queue this for processing
        try {
          await handleWebhookEvent(event);
        } catch (error) {
          logger.error(
            { error, eventId: event.id, eventType: event.event_type },
            'Error processing webhook event'
          );
          // Still return 200 to acknowledge receipt
          // The error will be logged and can be monitored
        }

        return new Response('OK', { status: 200 });
      },
    },
  },
});
