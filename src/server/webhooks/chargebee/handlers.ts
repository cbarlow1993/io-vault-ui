/**
 * Chargebee Webhook Handlers
 *
 * TODO: Re-implement when database layer is added
 * This file previously handled Chargebee webhook events and synced subscription
 * data to the Organization model in Prisma. Since Prisma has been removed,
 * these handlers are temporarily disabled.
 *
 * See: docs/plans/2026-01-13-remove-prisma-better-auth.md
 *
 * When re-implementing, the handlers should:
 * - Sync customer/subscription data to the new database layer
 * - Handle entitlements syncing
 * - Update billing status based on payment events
 *
 * Previously handled event types:
 * - customer_created
 * - subscription_created
 * - subscription_changed
 * - subscription_renewed
 * - subscription_cancelled
 * - subscription_reactivated
 * - payment_failed
 * - payment_succeeded
 * - entitlement_overrides_updated
 * - subscription_deleted
 */

// Chargebee webhook event types (kept for reference)
export type ChargebeeEventType =
  | 'customer_created'
  | 'subscription_created'
  | 'subscription_changed'
  | 'subscription_renewed'
  | 'subscription_cancelled'
  | 'subscription_reactivated'
  | 'payment_failed'
  | 'payment_succeeded'
  | 'entitlement_overrides_updated'
  | 'subscription_deleted';

// Chargebee webhook event structure (kept for reference)
export interface ChargebeeWebhookEvent {
  id: string;
  event_type: string;
  occurred_at: number;
  content: {
    customer?: {
      id: string;
      email?: string;
      first_name?: string;
      last_name?: string;
      cf_organization_id?: string;
    };
    subscription?: {
      id: string;
      customer_id: string;
      plan_id?: string;
      status: string;
      current_term_start?: number;
      current_term_end?: number;
      cancelled_at?: number;
    };
    invoice?: {
      id: string;
      customer_id: string;
      subscription_id?: string;
      status: string;
    };
    transaction?: {
      id: string;
      customer_id: string;
      subscription_id?: string;
      status: string;
    };
  };
}

/**
 * Placeholder handler - does nothing until database layer is added
 */
export async function handleWebhookEvent(
  _event: ChargebeeWebhookEvent
): Promise<void> {
  // No-op: Database layer not available
  // When re-implementing, route events to appropriate handlers
}
