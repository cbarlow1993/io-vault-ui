import type { InputJsonValue } from '@prisma/client/runtime/library';

import { db } from '@/server/db';
import { Prisma } from '@/server/db/generated/client';
import { getChargebee, isBillingEnabled } from '@/server/lib/chargebee';
import { logger } from '@/server/logger';

// Prisma InputJsonValue type for storing entitlements
type EntitlementsData = InputJsonValue | undefined;

// Chargebee webhook event types we handle
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

// Chargebee webhook event structure
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
 * Sync entitlements from Chargebee API for a subscription
 * Returns an array of entitlement feature IDs the subscription has access to
 */
export async function syncEntitlements(
  subscriptionId: string
): Promise<EntitlementsData> {
  if (!isBillingEnabled()) {
    return [];
  }

  try {
    const chargebee = getChargebee();

    // List subscription entitlements from Chargebee
    const result = await chargebee.subscription_entitlement
      .subscription_entitlements_for_subscription(subscriptionId, {
        limit: 100,
      })
      .request();

    // Extract feature IDs and their values
    const entitlements = result.list.map(
      (entry: {
        subscription_entitlement: { feature_id: string; value?: string };
      }) => ({
        featureId: entry.subscription_entitlement.feature_id,
        value: entry.subscription_entitlement.value,
      })
    );

    logger.info(
      { subscriptionId, count: entitlements.length },
      'Synced entitlements from Chargebee'
    );

    return entitlements as InputJsonValue;
  } catch (error) {
    logger.error(
      { subscriptionId, error },
      'Failed to sync entitlements from Chargebee'
    );
    return [];
  }
}

/**
 * Find organization by Chargebee customer ID
 */
async function findOrgByCustomerId(customerId: string) {
  return db.organization.findUnique({
    where: { chargebeeCustomerId: customerId },
  });
}

/**
 * Find organization by Chargebee subscription ID
 */
async function findOrgBySubscriptionId(subscriptionId: string) {
  return db.organization.findUnique({
    where: { chargebeeSubscriptionId: subscriptionId },
  });
}

/**
 * Handle customer_created event
 * Links the Chargebee customer ID to the organization
 */
export async function handleCustomerCreated(
  event: ChargebeeWebhookEvent
): Promise<void> {
  const customer = event.content.customer;
  if (!customer) {
    logger.warn(
      { eventId: event.id },
      'customer_created event missing customer data'
    );
    return;
  }

  // Get organization ID from pass_thru_content or custom field
  const organizationId = customer.cf_organization_id;

  if (!organizationId) {
    logger.warn(
      { eventId: event.id, customerId: customer.id },
      'customer_created event missing organization ID'
    );
    return;
  }

  // Idempotent: Only update if not already set
  const existingOrg = await db.organization.findUnique({
    where: { id: organizationId },
    select: { chargebeeCustomerId: true },
  });

  if (existingOrg?.chargebeeCustomerId === customer.id) {
    logger.info(
      { eventId: event.id, organizationId },
      'Customer already linked to organization'
    );
    return;
  }

  await db.organization.update({
    where: { id: organizationId },
    data: {
      chargebeeCustomerId: customer.id,
      chargebeeSyncedAt: new Date(),
    },
  });

  logger.info(
    { eventId: event.id, organizationId, customerId: customer.id },
    'Linked Chargebee customer to organization'
  );
}

/**
 * Handle subscription_created event
 * Caches subscription data and syncs entitlements
 */
export async function handleSubscriptionCreated(
  event: ChargebeeWebhookEvent
): Promise<void> {
  const subscription = event.content.subscription;
  if (!subscription) {
    logger.warn(
      { eventId: event.id },
      'subscription_created event missing subscription data'
    );
    return;
  }

  const org = await findOrgByCustomerId(subscription.customer_id);
  if (!org) {
    logger.warn(
      { eventId: event.id, customerId: subscription.customer_id },
      'Organization not found for customer'
    );
    return;
  }

  // Sync entitlements from Chargebee
  const entitlements = await syncEntitlements(subscription.id);

  await db.organization.update({
    where: { id: org.id },
    data: {
      chargebeeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionPlanId: subscription.plan_id,
      subscriptionCurrentPeriodStart: subscription.current_term_start
        ? new Date(subscription.current_term_start * 1000)
        : null,
      subscriptionCurrentPeriodEnd: subscription.current_term_end
        ? new Date(subscription.current_term_end * 1000)
        : null,
      subscriptionCancelledAt: null,
      entitlements,
      chargebeeSyncedAt: new Date(),
    },
  });

  logger.info(
    {
      eventId: event.id,
      organizationId: org.id,
      subscriptionId: subscription.id,
    },
    'Subscription created and cached'
  );
}

/**
 * Handle subscription_changed event
 * Updates cached plan, status, and period dates
 */
export async function handleSubscriptionChanged(
  event: ChargebeeWebhookEvent
): Promise<void> {
  const subscription = event.content.subscription;
  if (!subscription) {
    logger.warn(
      { eventId: event.id },
      'subscription_changed event missing subscription data'
    );
    return;
  }

  const org = await findOrgBySubscriptionId(subscription.id);
  if (!org) {
    logger.warn(
      { eventId: event.id, subscriptionId: subscription.id },
      'Organization not found for subscription'
    );
    return;
  }

  // Sync entitlements in case plan changed
  const entitlements = await syncEntitlements(subscription.id);

  await db.organization.update({
    where: { id: org.id },
    data: {
      subscriptionStatus: subscription.status,
      subscriptionPlanId: subscription.plan_id,
      subscriptionCurrentPeriodStart: subscription.current_term_start
        ? new Date(subscription.current_term_start * 1000)
        : null,
      subscriptionCurrentPeriodEnd: subscription.current_term_end
        ? new Date(subscription.current_term_end * 1000)
        : null,
      entitlements,
      chargebeeSyncedAt: new Date(),
    },
  });

  logger.info(
    {
      eventId: event.id,
      organizationId: org.id,
      subscriptionId: subscription.id,
    },
    'Subscription changed and updated'
  );
}

/**
 * Handle subscription_renewed event
 * Updates period dates
 */
export async function handleSubscriptionRenewed(
  event: ChargebeeWebhookEvent
): Promise<void> {
  const subscription = event.content.subscription;
  if (!subscription) {
    logger.warn(
      { eventId: event.id },
      'subscription_renewed event missing subscription data'
    );
    return;
  }

  const org = await findOrgBySubscriptionId(subscription.id);
  if (!org) {
    logger.warn(
      { eventId: event.id, subscriptionId: subscription.id },
      'Organization not found for subscription'
    );
    return;
  }

  await db.organization.update({
    where: { id: org.id },
    data: {
      subscriptionStatus: subscription.status,
      subscriptionCurrentPeriodStart: subscription.current_term_start
        ? new Date(subscription.current_term_start * 1000)
        : null,
      subscriptionCurrentPeriodEnd: subscription.current_term_end
        ? new Date(subscription.current_term_end * 1000)
        : null,
      chargebeeSyncedAt: new Date(),
    },
  });

  logger.info(
    {
      eventId: event.id,
      organizationId: org.id,
      subscriptionId: subscription.id,
    },
    'Subscription renewed and updated'
  );
}

/**
 * Handle subscription_cancelled event
 * Sets cancellation date and updates status
 */
export async function handleSubscriptionCancelled(
  event: ChargebeeWebhookEvent
): Promise<void> {
  const subscription = event.content.subscription;
  if (!subscription) {
    logger.warn(
      { eventId: event.id },
      'subscription_cancelled event missing subscription data'
    );
    return;
  }

  const org = await findOrgBySubscriptionId(subscription.id);
  if (!org) {
    logger.warn(
      { eventId: event.id, subscriptionId: subscription.id },
      'Organization not found for subscription'
    );
    return;
  }

  await db.organization.update({
    where: { id: org.id },
    data: {
      subscriptionStatus: subscription.status,
      subscriptionCancelledAt: subscription.cancelled_at
        ? new Date(subscription.cancelled_at * 1000)
        : new Date(),
      chargebeeSyncedAt: new Date(),
    },
  });

  logger.info(
    {
      eventId: event.id,
      organizationId: org.id,
      subscriptionId: subscription.id,
    },
    'Subscription cancelled'
  );
}

/**
 * Handle subscription_reactivated event
 * Clears cancellation and updates status
 */
export async function handleSubscriptionReactivated(
  event: ChargebeeWebhookEvent
): Promise<void> {
  const subscription = event.content.subscription;
  if (!subscription) {
    logger.warn(
      { eventId: event.id },
      'subscription_reactivated event missing subscription data'
    );
    return;
  }

  const org = await findOrgBySubscriptionId(subscription.id);
  if (!org) {
    logger.warn(
      { eventId: event.id, subscriptionId: subscription.id },
      'Organization not found for subscription'
    );
    return;
  }

  // Sync entitlements in case they changed
  const entitlements = await syncEntitlements(subscription.id);

  await db.organization.update({
    where: { id: org.id },
    data: {
      subscriptionStatus: subscription.status,
      subscriptionCancelledAt: null,
      subscriptionCurrentPeriodStart: subscription.current_term_start
        ? new Date(subscription.current_term_start * 1000)
        : null,
      subscriptionCurrentPeriodEnd: subscription.current_term_end
        ? new Date(subscription.current_term_end * 1000)
        : null,
      entitlements,
      chargebeeSyncedAt: new Date(),
    },
  });

  logger.info(
    {
      eventId: event.id,
      organizationId: org.id,
      subscriptionId: subscription.id,
    },
    'Subscription reactivated'
  );
}

/**
 * Handle payment_failed event
 * Updates status to past_due
 */
export async function handlePaymentFailed(
  event: ChargebeeWebhookEvent
): Promise<void> {
  const subscription = event.content.subscription;
  if (!subscription) {
    // Payment failed events may not have subscription data, try to find from invoice
    const invoice = event.content.invoice;
    if (!invoice?.subscription_id) {
      logger.warn(
        { eventId: event.id },
        'payment_failed event missing subscription data'
      );
      return;
    }

    const org = await findOrgBySubscriptionId(invoice.subscription_id);
    if (!org) {
      logger.warn(
        { eventId: event.id, subscriptionId: invoice.subscription_id },
        'Organization not found for subscription'
      );
      return;
    }

    await db.organization.update({
      where: { id: org.id },
      data: {
        subscriptionStatus: 'past_due',
        chargebeeSyncedAt: new Date(),
      },
    });

    logger.info(
      { eventId: event.id, organizationId: org.id },
      'Payment failed, status set to past_due'
    );
    return;
  }

  const org = await findOrgBySubscriptionId(subscription.id);
  if (!org) {
    logger.warn(
      { eventId: event.id, subscriptionId: subscription.id },
      'Organization not found for subscription'
    );
    return;
  }

  await db.organization.update({
    where: { id: org.id },
    data: {
      subscriptionStatus: 'past_due',
      chargebeeSyncedAt: new Date(),
    },
  });

  logger.info(
    {
      eventId: event.id,
      organizationId: org.id,
      subscriptionId: subscription.id,
    },
    'Payment failed, status set to past_due'
  );
}

/**
 * Handle payment_succeeded event
 * Updates status to active if was past_due
 */
export async function handlePaymentSucceeded(
  event: ChargebeeWebhookEvent
): Promise<void> {
  const subscription = event.content.subscription;
  const invoice = event.content.invoice;

  // Try to get subscription ID from subscription or invoice
  const subscriptionId = subscription?.id ?? invoice?.subscription_id;

  if (!subscriptionId) {
    logger.warn(
      { eventId: event.id },
      'payment_succeeded event missing subscription data'
    );
    return;
  }

  const org = await findOrgBySubscriptionId(subscriptionId);
  if (!org) {
    logger.warn(
      { eventId: event.id, subscriptionId },
      'Organization not found for subscription'
    );
    return;
  }

  // Only update to active if currently past_due
  if (org.subscriptionStatus === 'past_due') {
    await db.organization.update({
      where: { id: org.id },
      data: {
        subscriptionStatus: 'active',
        chargebeeSyncedAt: new Date(),
      },
    });

    logger.info(
      { eventId: event.id, organizationId: org.id, subscriptionId },
      'Payment succeeded, status restored to active'
    );
  } else {
    logger.info(
      { eventId: event.id, organizationId: org.id, subscriptionId },
      'Payment succeeded, status unchanged'
    );
  }
}

/**
 * Handle entitlement_overrides_updated event
 * Refreshes cached entitlements from Chargebee
 */
export async function handleEntitlementOverridesUpdated(
  event: ChargebeeWebhookEvent
): Promise<void> {
  const subscription = event.content.subscription;
  if (!subscription) {
    logger.warn(
      { eventId: event.id },
      'entitlement_overrides_updated event missing subscription data'
    );
    return;
  }

  const org = await findOrgBySubscriptionId(subscription.id);
  if (!org) {
    logger.warn(
      { eventId: event.id, subscriptionId: subscription.id },
      'Organization not found for subscription'
    );
    return;
  }

  // Sync entitlements from Chargebee
  const entitlements = await syncEntitlements(subscription.id);

  await db.organization.update({
    where: { id: org.id },
    data: {
      entitlements,
      chargebeeSyncedAt: new Date(),
    },
  });

  logger.info(
    {
      eventId: event.id,
      organizationId: org.id,
      subscriptionId: subscription.id,
    },
    'Entitlements refreshed'
  );
}

/**
 * Handle subscription_deleted event
 * Clears all cached billing data
 */
export async function handleSubscriptionDeleted(
  event: ChargebeeWebhookEvent
): Promise<void> {
  const subscription = event.content.subscription;
  if (!subscription) {
    logger.warn(
      { eventId: event.id },
      'subscription_deleted event missing subscription data'
    );
    return;
  }

  const org = await findOrgBySubscriptionId(subscription.id);
  if (!org) {
    logger.warn(
      { eventId: event.id, subscriptionId: subscription.id },
      'Organization not found for subscription'
    );
    return;
  }

  await db.organization.update({
    where: { id: org.id },
    data: {
      chargebeeSubscriptionId: null,
      subscriptionStatus: null,
      subscriptionPlanId: null,
      subscriptionCurrentPeriodStart: null,
      subscriptionCurrentPeriodEnd: null,
      subscriptionCancelledAt: null,
      entitlements: Prisma.DbNull,
      chargebeeSyncedAt: new Date(),
    },
  });

  logger.info(
    {
      eventId: event.id,
      organizationId: org.id,
      subscriptionId: subscription.id,
    },
    'Subscription deleted, cleared cached data'
  );
}

/**
 * Route webhook event to appropriate handler
 */
export async function handleWebhookEvent(
  event: ChargebeeWebhookEvent
): Promise<void> {
  const eventType = event.event_type as ChargebeeEventType;

  logger.info(
    { eventId: event.id, eventType },
    'Processing Chargebee webhook event'
  );

  switch (eventType) {
    case 'customer_created':
      return handleCustomerCreated(event);
    case 'subscription_created':
      return handleSubscriptionCreated(event);
    case 'subscription_changed':
      return handleSubscriptionChanged(event);
    case 'subscription_renewed':
      return handleSubscriptionRenewed(event);
    case 'subscription_cancelled':
      return handleSubscriptionCancelled(event);
    case 'subscription_reactivated':
      return handleSubscriptionReactivated(event);
    case 'payment_failed':
      return handlePaymentFailed(event);
    case 'payment_succeeded':
      return handlePaymentSucceeded(event);
    case 'entitlement_overrides_updated':
      return handleEntitlementOverridesUpdated(event);
    case 'subscription_deleted':
      return handleSubscriptionDeleted(event);
    default:
      logger.debug(
        { eventId: event.id, eventType },
        'Unhandled Chargebee webhook event type'
      );
  }
}
