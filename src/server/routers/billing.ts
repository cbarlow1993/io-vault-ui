import { ORPCError } from '@orpc/client';
import { z } from 'zod';

import {
  zAddPaymentMethodInput,
  zInvoice,
  zPaymentMethod,
  zPlan,
  zSubscription,
  zUpdateSubscriptionInput,
} from '@/features/billing/schema';
import { assertBillingEnabled, getChargebee } from '@/server/lib/chargebee';
import { db } from '@/server/db';
import { protectedProcedure } from '@/server/orpc';

const tags = ['billing'];

// Helper to get user's organization with Chargebee customer ID
async function getUserOrganization(userId: string) {
  const membership = await db.organizationMember.findFirst({
    where: { userId },
    include: { organization: true },
  });

  if (!membership?.organization) {
    throw new ORPCError('NOT_FOUND', {
      message: 'User is not a member of any organization',
    });
  }

  return membership.organization;
}

export default {
  // Get all active plans from Chargebee
  getPlans: protectedProcedure({
    permission: null,
  })
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
      const result = await chargebee.item_price
        .list({
          limit: 100,
          item_type: { is: 'plan' },
          status: { is: 'active' },
        })
        .request();

      return result.list.map((entry: { item_price: any }) => ({
        id: entry.item_price.id,
        name: entry.item_price.name,
        description: entry.item_price.description,
        price: entry.item_price.price ?? 0,
        period: entry.item_price.period ?? 1,
        periodUnit: entry.item_price.period_unit ?? 'month',
        currencyCode: entry.item_price.currency_code,
      }));
    }),

  // Get current org subscription details
  getSubscription: protectedProcedure({
    permission: null,
  })
    .route({
      method: 'GET',
      path: '/billing/subscription',
      tags,
    })
    .output(zSubscription.nullable())
    .handler(async ({ context }) => {
      assertBillingEnabled();
      context.logger.info('Fetching subscription from Chargebee');

      const org = await getUserOrganization(context.user.id);

      if (!org.chargebeeSubscriptionId) {
        return null;
      }

      const chargebee = getChargebee();
      const result = await chargebee.subscription
        .retrieve(org.chargebeeSubscriptionId)
        .request();

      const subscription = result.subscription;

      return {
        id: subscription.id,
        status: subscription.status as any,
        planId: subscription.plan_id,
        planName: subscription.plan_id, // Would need additional lookup for actual name
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

  // List payment sources for org's customer
  getPaymentMethods: protectedProcedure({
    permission: null,
  })
    .route({
      method: 'GET',
      path: '/billing/payment-methods',
      tags,
    })
    .output(z.array(zPaymentMethod))
    .handler(async ({ context }) => {
      assertBillingEnabled();
      context.logger.info('Fetching payment methods from Chargebee');

      const org = await getUserOrganization(context.user.id);

      if (!org.chargebeeCustomerId) {
        return [];
      }

      const chargebee = getChargebee();
      const result = await chargebee.payment_source
        .list({
          limit: 100,
          customer_id: { is: org.chargebeeCustomerId },
        })
        .request();

      // Get primary payment source ID from customer
      let primaryPaymentSourceId: string | null = null;
      try {
        const customerResult = await chargebee.customer
          .retrieve(org.chargebeeCustomerId)
          .request();
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
  addPaymentMethod: protectedProcedure({
    permission: null,
  })
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

      const org = await getUserOrganization(context.user.id);

      if (!org.chargebeeCustomerId) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization does not have a Chargebee customer',
        });
      }

      const chargebee = getChargebee();
      const result = await chargebee.payment_source
        .create_using_token({
          customer_id: org.chargebeeCustomerId,
          token_id: input.token,
          replace_primary_payment_source: false,
        })
        .request();

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
  removePaymentMethod: protectedProcedure({
    permission: null,
  })
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

      // Verify user has access to this org
      await getUserOrganization(context.user.id);

      const chargebee = getChargebee();
      await chargebee.payment_source.delete(input.paymentMethodId).request();
    }),

  // Update primary payment source
  setDefaultPaymentMethod: protectedProcedure({
    permission: null,
  })
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

      const org = await getUserOrganization(context.user.id);

      if (!org.chargebeeCustomerId) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization does not have a Chargebee customer',
        });
      }

      const chargebee = getChargebee();
      await chargebee.customer
        .assign_payment_role(org.chargebeeCustomerId, {
          payment_source_id: input.paymentMethodId,
          role: 'PRIMARY',
        })
        .request();
    }),

  // List invoices for org's customer
  getInvoices: protectedProcedure({
    permission: null,
  })
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

      const org = await getUserOrganization(context.user.id);

      if (!org.chargebeeCustomerId) {
        return [];
      }

      const chargebee = getChargebee();
      const result = await chargebee.invoice
        .invoices_for_customer(org.chargebeeCustomerId, {
          limit: input?.limit ?? 20,
          'sort_by[desc]': 'date',
        })
        .request();

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
  downloadInvoice: protectedProcedure({
    permission: null,
  })
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

      // Verify user has access to this org
      await getUserOrganization(context.user.id);

      const chargebee = getChargebee();
      const result = await chargebee.invoice.pdf(input.invoiceId).request();

      return {
        downloadUrl: result.download.download_url,
      };
    }),

  // Change plan (upgrade/downgrade)
  updateSubscription: protectedProcedure({
    permission: null,
  })
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

      const org = await getUserOrganization(context.user.id);

      if (!org.chargebeeSubscriptionId) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization does not have an active subscription',
        });
      }

      const chargebee = getChargebee();
      const result = await chargebee.subscription
        .update_for_items(org.chargebeeSubscriptionId, {
          subscription_items: [
            {
              item_price_id: input.planId,
            },
          ],
        })
        .request();

      const subscription = result.subscription;

      // Update cached subscription data in database
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
          chargebeeSyncedAt: new Date(),
        },
      });

      return {
        id: subscription.id,
        status: subscription.status as any,
        planId: subscription.plan_id,
        planName: subscription.plan_id,
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
  cancelSubscription: protectedProcedure({
    permission: null,
  })
    .route({
      method: 'POST',
      path: '/billing/subscription/cancel',
      tags,
    })
    .output(zSubscription)
    .handler(async ({ context }) => {
      assertBillingEnabled();
      context.logger.info('Cancelling subscription in Chargebee');

      const org = await getUserOrganization(context.user.id);

      if (!org.chargebeeSubscriptionId) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization does not have an active subscription',
        });
      }

      const chargebee = getChargebee();
      const result = await chargebee.subscription
        .cancel_for_items(org.chargebeeSubscriptionId, {
          end_of_term: true, // Cancel at end of billing period
        })
        .request();

      const subscription = result.subscription;

      // Update cached subscription data in database
      await db.organization.update({
        where: { id: org.id },
        data: {
          subscriptionStatus: subscription.status,
          subscriptionCancelledAt: subscription.cancelled_at
            ? new Date(subscription.cancelled_at * 1000)
            : null,
          chargebeeSyncedAt: new Date(),
        },
      });

      return {
        id: subscription.id,
        status: subscription.status as any,
        planId: subscription.plan_id,
        planName: subscription.plan_id,
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
  reactivateSubscription: protectedProcedure({
    permission: null,
  })
    .route({
      method: 'POST',
      path: '/billing/subscription/reactivate',
      tags,
    })
    .output(zSubscription)
    .handler(async ({ context }) => {
      assertBillingEnabled();
      context.logger.info('Reactivating subscription in Chargebee');

      const org = await getUserOrganization(context.user.id);

      if (!org.chargebeeSubscriptionId) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization does not have a subscription',
        });
      }

      const chargebee = getChargebee();
      const result = await chargebee.subscription
        .remove_scheduled_cancellation(org.chargebeeSubscriptionId)
        .request();

      const subscription = result.subscription;

      // Update cached subscription data in database
      await db.organization.update({
        where: { id: org.id },
        data: {
          subscriptionStatus: subscription.status,
          subscriptionCancelledAt: null,
          chargebeeSyncedAt: new Date(),
        },
      });

      return {
        id: subscription.id,
        status: subscription.status as any,
        planId: subscription.plan_id,
        planName: subscription.plan_id,
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
  createCheckout: protectedProcedure({
    permission: null,
  })
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

      const org = await getUserOrganization(context.user.id);

      const chargebee = getChargebee();

      // If org already has a customer, use checkout_existing_for_items
      // Otherwise, use checkout_new_for_items
      let result;

      if (org.chargebeeCustomerId && org.chargebeeSubscriptionId) {
        // Existing customer with subscription - update subscription
        result = await chargebee.hosted_page
          .checkout_existing_for_items({
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
          })
          .request();
      } else if (org.chargebeeCustomerId) {
        // Existing customer without subscription - create subscription
        result = await chargebee.hosted_page
          .checkout_new_for_items({
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
          })
          .request();
      } else {
        // New customer - create customer and subscription
        result = await chargebee.hosted_page
          .checkout_new_for_items({
            customer: {
              email: context.user.email,
              first_name: context.user.name?.split(' ')[0],
              last_name: context.user.name?.split(' ').slice(1).join(' '),
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
          })
          .request();
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
