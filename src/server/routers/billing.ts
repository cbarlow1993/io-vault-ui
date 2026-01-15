import { ORPCError } from '@orpc/client';
import { z } from 'zod';

import { envServer } from '@/env/server';
import {
  zAddPaymentMethodInput,
  zEntitlement,
  zInvoice,
  zPaymentMethod,
  zPlan,
  zSubscription,
  zUpdateSubscriptionInput,
} from '@/features/billing/schema';
import { assertBillingEnabled, getChargebee } from '@/server/lib/chargebee';
import { publicProcedure } from '@/server/orpc';

const tags = ['billing'];

// TEMPORARY: Hardcoded customer ID for testing Chargebee without auth
const TEST_CHARGEBEE_CUSTOMER_ID = 'fo73a6x84nob6s8zvl7enbus';
const TEST_CHARGEBEE_SUBSCRIPTION_ID = '19ACZLV7nxngBJE'; // Set if you have a test subscription

// Helper to get test organization data (bypasses auth for testing)
function getTestOrganization() {
  return {
    id: 'test-org-id',
    chargebeeCustomerId: TEST_CHARGEBEE_CUSTOMER_ID,
    chargebeeSubscriptionId: TEST_CHARGEBEE_SUBSCRIPTION_ID,
  };
}

// Helper to extract item_price_id from subscription (handles both legacy and PC 2.0)
function getSubscriptionItemPriceId(subscription: any): string {
  // PC 2.0: subscription_items array contains item_price_id
  // Legacy: plan_id field exists directly
  return (
    subscription.plan_id ||
    subscription.subscription_items?.[0]?.item_price_id ||
    'unknown'
  );
}

// Helper to get plan name from item_price_id (fetches from Chargebee if needed)
async function getItemPriceName(
  chargebee: any,
  itemPriceId: string
): Promise<string> {
  if (itemPriceId === 'unknown') return 'Unknown Plan';

  try {
    const result = await chargebee.itemPrice.retrieve(itemPriceId);
    return (
      result.item_price.name || result.item_price.external_name || itemPriceId
    );
  } catch {
    // Fallback to ID if retrieval fails
    return itemPriceId;
  }
}

export default {
  // Get active plans (items) with their pricing options from Chargebee
  getPlans: publicProcedure()
    .route({
      method: 'GET',
      path: '/billing/plans',
      tags,
    })
    .output(z.array(zPlan))
    .handler(async ({ context }) => {
      assertBillingEnabled();
      context.logger.info('Fetching plans from Chargebee');

      const chargebee = getChargebee();
      const allowedPlanIds = envServer.CHARGEBEE_PLAN_IDS;

      // Build filter for items - use item_id filter if CHARGEBEE_PLAN_IDS is set
      const itemFilter: Record<string, unknown> = {
        limit: 100,
        type: { is: 'plan' },
        status: { is: 'active' },
      };

      if (allowedPlanIds && allowedPlanIds.length > 0) {
        // Filter by specific plan IDs from env variable
        itemFilter.id = { in: allowedPlanIds };
      }

      // Fetch items (plans)
      const itemsResult = await chargebee.item.list(itemFilter);

      // Get the actual item IDs returned
      const itemIds = itemsResult.list.map(
        (entry: { item: any }) => entry.item.id
      );

      // Fetch item prices for these specific items
      const itemPricesResult = await chargebee.itemPrice.list({
        limit: 100,
        item_type: { is: 'plan' },
        status: { is: 'active' },
        item_id: { in: itemIds },
      });

      // Group item prices by their parent item
      const pricesByItem = new Map<
        string,
        Array<{
          id: string;
          name: string;
          price: number;
          period: number;
          periodUnit: 'day' | 'week' | 'month' | 'year';
          currencyCode: string;
        }>
      >();

      for (const entry of itemPricesResult.list) {
        const ip = entry.item_price;
        const itemId = ip.item_id;

        // Skip if missing required fields
        if (!itemId || !ip.id || !ip.currency_code) continue;

        if (!pricesByItem.has(itemId)) {
          pricesByItem.set(itemId, []);
        }

        pricesByItem.get(itemId)!.push({
          id: ip.id,
          name: ip.name || ip.id,
          price: ip.price ?? 0,
          period: ip.period ?? 1,
          periodUnit: ip.period_unit ?? 'month',
          currencyCode: ip.currency_code,
        });
      }

      // Build plan objects from items
      const plans = itemsResult.list.map((entry: { item: any }) => {
        const item = entry.item;
        const metadata = item.metadata || {};

        // Parse features from metadata (expects JSON array or comma-separated string)
        let features: string[] | undefined;
        if (metadata.features) {
          try {
            features =
              typeof metadata.features === 'string'
                ? metadata.features.includes('[')
                  ? JSON.parse(metadata.features)
                  : metadata.features.split(',').map((f: string) => f.trim())
                : metadata.features;
          } catch {
            features = undefined;
          }
        }

        // Sort prices by period (shorter periods first)
        const prices = pricesByItem.get(item.id) || [];
        const periodOrder = { day: 0, week: 1, month: 2, year: 3 };
        prices.sort((a, b) => {
          const aOrder = periodOrder[a.periodUnit] * 100 + a.period;
          const bOrder = periodOrder[b.periodUnit] * 100 + b.period;
          return aOrder - bOrder;
        });

        return {
          id: item.id,
          name: item.name || item.id,
          description: item.description,
          features,
          badge: metadata.badge as string | undefined,
          prices,
        };
      });

      // If CHARGEBEE_PLAN_IDS is configured, preserve the order from env variable
      if (allowedPlanIds && allowedPlanIds.length > 0) {
        const planMap = new Map(plans.map((p) => [p.id, p]));
        return allowedPlanIds
          .map((id) => planMap.get(id))
          .filter((p): p is NonNullable<typeof p> => p !== undefined);
      }

      return plans;
    }),

  // Get current org subscription details
  getSubscription: publicProcedure()
    .route({
      method: 'GET',
      path: '/billing/subscription',
      tags,
    })
    .output(zSubscription.nullable())
    .handler(async ({ context }) => {
      assertBillingEnabled();
      context.logger.info('Fetching subscription from Chargebee');

      const org = getTestOrganization();

      if (!org.chargebeeSubscriptionId) {
        return null;
      }

      const chargebee = getChargebee();
      const result = await chargebee.subscription.retrieve(
        org.chargebeeSubscriptionId
      );

      const subscription = result.subscription;

      // Handle both legacy (plan_id) and new (subscription_items) models
      const planId = getSubscriptionItemPriceId(subscription);
      const planName = await getItemPriceName(chargebee, planId);

      return {
        id: subscription.id,
        status: subscription.status as any,
        planId,
        planName,
        currentTermStart: subscription.current_term_start
          ? new Date(subscription.current_term_start * 1000).toISOString()
          : undefined,
        currentTermEnd: subscription.current_term_end
          ? new Date(subscription.current_term_end * 1000).toISOString()
          : undefined,
        cancelledAt: subscription.cancelled_at
          ? new Date(subscription.cancelled_at * 1000).toISOString()
          : undefined,
        nextBillingAt: subscription.next_billing_at
          ? new Date(subscription.next_billing_at * 1000).toISOString()
          : undefined,
      };
    }),

  // Get entitlements for the current subscription
  getEntitlements: publicProcedure()
    .route({
      method: 'GET',
      path: '/billing/entitlements',
      tags,
    })
    .output(z.array(zEntitlement))
    .handler(async ({ context }) => {
      assertBillingEnabled();
      context.logger.info('Fetching entitlements from Chargebee');

      const org = getTestOrganization();

      if (!org.chargebeeSubscriptionId) {
        return [];
      }

      const chargebee = getChargebee();

      // Fetch subscription entitlements using the entitlements API
      // Chargebee's subscription_entitlement.subscription_entitlements_for_subscription endpoint
      try {
        const result =
          await chargebee.subscriptionEntitlement.subscriptionEntitlementsForSubscription(
            org.chargebeeSubscriptionId
          );

        if (!result.list || result.list.length === 0) {
          return [];
        }

        // Map Chargebee entitlements to our schema
        return result.list.map((entry: { subscription_entitlement: any }) => {
          const ent = entry.subscription_entitlement;

          // Parse numeric value if possible
          const numericValue = parseFloat(ent.value);
          const quantity = !isNaN(numericValue) ? numericValue : undefined;

          return {
            featureId: ent.feature_id,
            featureName: ent.feature_name || ent.feature_id,
            value: String(ent.value),
            quantity,
            unit: ent.feature_unit || undefined,
          };
        });
      } catch (error) {
        // If entitlements API is not available or returns error, return empty array
        context.logger.warn({ err: error }, 'Failed to fetch entitlements');
        return [];
      }
    }),

  // List payment sources for org's customer
  getPaymentMethods: publicProcedure()
    .route({
      method: 'GET',
      path: '/billing/payment-methods',
      tags,
    })
    .output(z.array(zPaymentMethod))
    .handler(async ({ context }) => {
      assertBillingEnabled();
      context.logger.info('Fetching payment methods from Chargebee');

      const org = getTestOrganization();

      if (!org.chargebeeCustomerId) {
        return [];
      }

      const chargebee = getChargebee();
      const result = await chargebee.paymentSource.list({
        limit: 100,
        customer_id: { is: org.chargebeeCustomerId },
      });

      // Get primary payment source ID from customer
      let primaryPaymentSourceId: string | null = null;
      try {
        const customerResult = await chargebee.customer.retrieve(
          org.chargebeeCustomerId
        );
        primaryPaymentSourceId =
          customerResult.customer.primary_payment_source_id ?? null;
      } catch {
        // Ignore errors fetching customer
      }

      return result.list.map((entry: { payment_source: any }) => {
        const ps = entry.payment_source;
        return {
          id: ps.id,
          type: ps.type as 'card' | 'bank_account' | 'paypal',
          status: ps.status as 'valid' | 'expiring' | 'expired' | 'invalid',
          isDefault: ps.id === primaryPaymentSourceId,
          cardBrand: ps.card?.brand,
          cardLast4: ps.card?.last4,
          cardExpiryMonth: ps.card?.expiry_month,
          cardExpiryYear: ps.card?.expiry_year,
        };
      });
    }),

  // Create payment source using Chargebee.js token
  addPaymentMethod: publicProcedure()
    .route({
      method: 'POST',
      path: '/billing/payment-methods',
      tags,
    })
    .input(zAddPaymentMethodInput)
    .output(zPaymentMethod)
    .handler(async ({ context, input }) => {
      assertBillingEnabled();
      context.logger.info('Adding payment method to Chargebee');

      const org = getTestOrganization();

      if (!org.chargebeeCustomerId) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization does not have a Chargebee customer',
        });
      }

      const chargebee = getChargebee();
      const result = await chargebee.paymentSource.createUsingToken({
        customer_id: org.chargebeeCustomerId,
        token_id: input.token,
        replace_primary_payment_source: false,
      });

      const ps = result.payment_source;

      return {
        id: ps.id,
        type: ps.type as 'card' | 'bank_account' | 'paypal',
        status: ps.status as 'valid' | 'expiring' | 'expired' | 'invalid',
        isDefault: false,
        cardBrand: ps.card?.brand,
        cardLast4: ps.card?.last4,
        cardExpiryMonth: ps.card?.expiry_month,
        cardExpiryYear: ps.card?.expiry_year,
      };
    }),

  // Delete a payment source
  removePaymentMethod: publicProcedure()
    .route({
      method: 'DELETE',
      path: '/billing/payment-methods/{paymentMethodId}',
      tags,
    })
    .input(
      z.object({
        paymentMethodId: z.string(),
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      assertBillingEnabled();
      context.logger.info('Removing payment method from Chargebee');

      const chargebee = getChargebee();
      await chargebee.paymentSource.delete(input.paymentMethodId);
    }),

  // Update primary payment source
  setDefaultPaymentMethod: publicProcedure()
    .route({
      method: 'POST',
      path: '/billing/payment-methods/{paymentMethodId}/set-default',
      tags,
    })
    .input(
      z.object({
        paymentMethodId: z.string(),
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      assertBillingEnabled();
      context.logger.info('Setting default payment method in Chargebee');

      const org = getTestOrganization();

      if (!org.chargebeeCustomerId) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization does not have a Chargebee customer',
        });
      }

      const chargebee = getChargebee();
      await chargebee.customer.assignPaymentRole(org.chargebeeCustomerId, {
        payment_source_id: input.paymentMethodId,
        role: 'primary',
      });
    }),

  // List invoices for org's customer
  getInvoices: publicProcedure()
    .route({
      method: 'GET',
      path: '/billing/invoices',
      tags,
    })
    .input(
      z
        .object({
          limit: z.coerce.number().int().min(1).max(100).optional(),
        })
        .optional()
    )
    .output(z.array(zInvoice))
    .handler(async ({ context, input }) => {
      assertBillingEnabled();
      context.logger.info('Fetching invoices from Chargebee');

      const org = getTestOrganization();

      if (!org.chargebeeCustomerId) {
        return [];
      }

      const chargebee = getChargebee();
      const result = await chargebee.invoice.list({
        customer_id: { is: org.chargebeeCustomerId },
        limit: input?.limit ?? 20,
      });

      return result.list.map((entry: { invoice: any }) => {
        const inv = entry.invoice;
        return {
          id: inv.id,
          number: inv.id, // Chargebee uses ID as invoice number by default
          status: inv.status as any,
          date: new Date(inv.date * 1000).toISOString(),
          total: inv.total ?? 0,
          currencyCode: inv.currency_code,
        };
      });
    }),

  // Get invoice PDF download URL
  downloadInvoice: publicProcedure()
    .route({
      method: 'GET',
      path: '/billing/invoices/{invoiceId}/download',
      tags,
    })
    .input(
      z.object({
        invoiceId: z.string(),
      })
    )
    .output(
      z.object({
        downloadUrl: z.string(),
      })
    )
    .handler(async ({ context, input }) => {
      assertBillingEnabled();
      context.logger.info('Getting invoice download URL from Chargebee');

      const chargebee = getChargebee();
      const result = await chargebee.invoice.pdf(input.invoiceId);

      return {
        downloadUrl: result.download.download_url,
      };
    }),

  // Change plan (upgrade/downgrade)
  updateSubscription: publicProcedure()
    .route({
      method: 'POST',
      path: '/billing/subscription/update',
      tags,
    })
    .input(zUpdateSubscriptionInput)
    .output(zSubscription)
    .handler(async ({ context, input }) => {
      assertBillingEnabled();
      context.logger.info('Updating subscription in Chargebee');

      const org = getTestOrganization();

      if (!org.chargebeeSubscriptionId) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization does not have an active subscription',
        });
      }

      const chargebee = getChargebee();
      const result = await chargebee.subscription.updateForItems(
        org.chargebeeSubscriptionId,
        {
          subscription_items: [
            {
              item_price_id: input.planId,
            },
          ],
        }
      );

      const subscription = result.subscription;

      // Handle both legacy (plan_id) and new (subscription_items) models
      const planId = getSubscriptionItemPriceId(subscription);
      const planName = await getItemPriceName(chargebee, planId);

      return {
        id: subscription.id,
        status: subscription.status as any,
        planId,
        planName,
        currentTermStart: subscription.current_term_start
          ? new Date(subscription.current_term_start * 1000).toISOString()
          : undefined,
        currentTermEnd: subscription.current_term_end
          ? new Date(subscription.current_term_end * 1000).toISOString()
          : undefined,
        cancelledAt: subscription.cancelled_at
          ? new Date(subscription.cancelled_at * 1000).toISOString()
          : undefined,
        nextBillingAt: subscription.next_billing_at
          ? new Date(subscription.next_billing_at * 1000).toISOString()
          : undefined,
      };
    }),

  // Schedule cancellation at period end
  cancelSubscription: publicProcedure()
    .route({
      method: 'POST',
      path: '/billing/subscription/cancel',
      tags,
    })
    .output(zSubscription)
    .handler(async ({ context }) => {
      assertBillingEnabled();
      context.logger.info('Cancelling subscription in Chargebee');

      const org = getTestOrganization();

      if (!org.chargebeeSubscriptionId) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization does not have an active subscription',
        });
      }

      const chargebee = getChargebee();
      const result = await chargebee.subscription.cancelForItems(
        org.chargebeeSubscriptionId,
        {
          end_of_term: true, // Cancel at end of billing period
        }
      );

      const subscription = result.subscription;

      // Handle both legacy (plan_id) and new (subscription_items) models
      const planId = getSubscriptionItemPriceId(subscription);
      const planName = await getItemPriceName(chargebee, planId);

      return {
        id: subscription.id,
        status: subscription.status as any,
        planId,
        planName,
        currentTermStart: subscription.current_term_start
          ? new Date(subscription.current_term_start * 1000).toISOString()
          : undefined,
        currentTermEnd: subscription.current_term_end
          ? new Date(subscription.current_term_end * 1000).toISOString()
          : undefined,
        cancelledAt: subscription.cancelled_at
          ? new Date(subscription.cancelled_at * 1000).toISOString()
          : undefined,
        nextBillingAt: subscription.next_billing_at
          ? new Date(subscription.next_billing_at * 1000).toISOString()
          : undefined,
      };
    }),

  // Undo pending cancellation
  reactivateSubscription: publicProcedure()
    .route({
      method: 'POST',
      path: '/billing/subscription/reactivate',
      tags,
    })
    .output(zSubscription)
    .handler(async ({ context }) => {
      assertBillingEnabled();
      context.logger.info('Reactivating subscription in Chargebee');

      const org = getTestOrganization();

      if (!org.chargebeeSubscriptionId) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization does not have a subscription',
        });
      }

      const chargebee = getChargebee();
      const result = await chargebee.subscription.removeScheduledCancellation(
        org.chargebeeSubscriptionId
      );

      const subscription = result.subscription;

      // Handle both legacy (plan_id) and new (subscription_items) models
      const planId = getSubscriptionItemPriceId(subscription);
      const planName = await getItemPriceName(chargebee, planId);

      return {
        id: subscription.id,
        status: subscription.status as any,
        planId,
        planName,
        currentTermStart: subscription.current_term_start
          ? new Date(subscription.current_term_start * 1000).toISOString()
          : undefined,
        currentTermEnd: subscription.current_term_end
          ? new Date(subscription.current_term_end * 1000).toISOString()
          : undefined,
        cancelledAt: subscription.cancelled_at
          ? new Date(subscription.cancelled_at * 1000).toISOString()
          : undefined,
        nextBillingAt: subscription.next_billing_at
          ? new Date(subscription.next_billing_at * 1000).toISOString()
          : undefined,
      };
    }),

  // Generate hosted page URL for new subscription
  createCheckout: publicProcedure()
    .route({
      method: 'POST',
      path: '/billing/checkout',
      tags,
    })
    .input(
      z.object({
        planId: z.string(),
        redirectUrl: z.string().url().optional(),
        cancelUrl: z.string().url().optional(),
      })
    )
    .output(
      z.object({
        url: z.string(),
        id: z.string(),
        expiresAt: z.string().optional(),
      })
    )
    .handler(async ({ context, input }) => {
      assertBillingEnabled();
      context.logger.info('Creating checkout session in Chargebee');

      const org = getTestOrganization();

      const chargebee = getChargebee();

      // If org already has a customer, use checkout_existing_for_items
      // Otherwise, use checkout_new_for_items
      let result;

      if (org.chargebeeCustomerId && org.chargebeeSubscriptionId) {
        // Existing customer with subscription - update subscription
        result = await chargebee.hostedPage.checkoutExistingForItems({
          subscription: {
            id: org.chargebeeSubscriptionId,
          },
          subscription_items: [
            {
              item_price_id: input.planId,
            },
          ],
          redirect_url: input.redirectUrl,
          cancel_url: input.cancelUrl,
        });
      } else if (org.chargebeeCustomerId) {
        // Existing customer without subscription - create subscription
        result = await chargebee.hostedPage.checkoutNewForItems({
          customer: {
            id: org.chargebeeCustomerId,
          },
          subscription_items: [
            {
              item_price_id: input.planId,
            },
          ],
          redirect_url: input.redirectUrl,
          cancel_url: input.cancelUrl,
        });
      } else {
        // New customer - create customer and subscription
        // In test mode, use hardcoded customer or create without user context
        result = await chargebee.hostedPage.checkoutNewForItems({
          customer: {
            email: 'test@example.com', // Test mode - hardcoded email
            first_name: 'Test',
            last_name: 'User',
          },
          subscription_items: [
            {
              item_price_id: input.planId,
            },
          ],
          redirect_url: input.redirectUrl,
          cancel_url: input.cancelUrl,
          pass_thru_content: JSON.stringify({
            organizationId: org.id,
          }),
        });
      }

      const hostedPage = result.hosted_page;

      return {
        url: hostedPage.url ?? '',
        id: hostedPage.id ?? '',
        expiresAt: hostedPage.expires_at
          ? new Date(hostedPage.expires_at * 1000).toISOString()
          : undefined,
      };
    }),
};
