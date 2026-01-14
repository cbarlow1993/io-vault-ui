# Chargebee Billing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate Chargebee for organization-level billing with real subscription management, payment processing, and invoice handling.

**Architecture:** Server-side Chargebee SDK for API calls, webhooks for real-time sync, client-side Chargebee.js for PCI-compliant card tokenization. Feature-flagged behind `ENABLE_CHARGEBEE_BILLING`.

**Tech Stack:** chargebee-typescript, oRPC, TanStack Router, Prisma, Zod

---

## Task 1: Install Chargebee SDK

**Files:**
- Modify: `package.json`

**Step 1: Install the chargebee-typescript package**

```bash
pnpm add chargebee-typescript
```

**Step 2: Verify installation**

```bash
pnpm list chargebee-typescript
```

Expected: Shows `chargebee-typescript` in dependencies

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add chargebee-typescript dependency"
```

---

## Task 2: Add Environment Variables

**Files:**
- Modify: `src/env/server.ts`
- Modify: `src/env/client.ts`

**Step 1: Add server-side environment variables**

In `src/env/server.ts`, add to the `server` object inside `createEnv`:

```typescript
// Chargebee billing (optional - feature flagged)
ENABLE_CHARGEBEE_BILLING: z
  .enum(['true', 'false'])
  .optional()
  .prefault('false')
  .transform((v) => v === 'true'),
CHARGEBEE_SITE: zOptionalWithReplaceMe(),
CHARGEBEE_API_KEY: zOptionalWithReplaceMe(),
CHARGEBEE_WEBHOOK_SECRET: zOptionalWithReplaceMe(),
```

**Step 2: Add client-side environment variables**

In `src/env/client.ts`, add to the `client` object inside `createEnv`:

```typescript
// Chargebee billing (optional - feature flagged)
VITE_ENABLE_CHARGEBEE_BILLING: z
  .enum(['true', 'false'])
  .optional()
  .prefault('false')
  .transform((v) => v === 'true'),
VITE_CHARGEBEE_SITE: z.string().optional(),
VITE_CHARGEBEE_PUBLISHABLE_KEY: z.string().optional(),
```

**Step 3: Add to runtimeEnv in client.ts**

The `runtimeEnv` should already spread `envMetaOrProcess`, so no changes needed there.

**Step 4: Verify env types**

```bash
pnpm tsc --noEmit
```

Expected: No type errors

**Step 5: Commit**

```bash
git add src/env/server.ts src/env/client.ts
git commit -m "feat(billing): add Chargebee environment variables"
```

---

## Task 3: Add Organization Model to Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add Organization model with Chargebee fields**

Add after the `Verification` model:

```prisma
model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Chargebee integration
  chargebeeCustomerId     String? @unique
  chargebeeSubscriptionId String? @unique

  // Cached subscription data (updated via webhooks)
  subscriptionStatus             String?   // 'active', 'cancelled', 'past_due', etc.
  subscriptionPlanId             String?   // Chargebee plan ID
  subscriptionCurrentPeriodStart DateTime?
  subscriptionCurrentPeriodEnd   DateTime?
  subscriptionCancelledAt        DateTime?

  // Cached entitlements (updated via webhooks)
  entitlements Json? // { "feature-vaults": { "value": "10" }, ... }

  // Sync tracking
  chargebeeSyncedAt DateTime?

  // Relations
  members OrganizationMember[]

  @@map("organization")
}

model OrganizationMember {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  role           String       @default("member") // 'owner', 'admin', 'member'
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@unique([organizationId, userId])
  @@map("organization_member")
}
```

**Step 2: Add relation to User model**

In the `User` model, add:

```prisma
organizationMemberships OrganizationMember[]
```

**Step 3: Generate Prisma client**

```bash
pnpm prisma generate
```

Expected: Prisma Client generated successfully

**Step 4: Create migration**

```bash
pnpm prisma migrate dev --name add_organization_chargebee
```

Expected: Migration created and applied

**Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(billing): add Organization model with Chargebee fields"
```

---

## Task 4: Create Chargebee Server Client

**Files:**
- Create: `src/server/lib/chargebee.ts`

**Step 1: Create the Chargebee client file**

```typescript
import { ChargeBee } from 'chargebee';

import { envServer } from '@/env/server';

// Lazy initialization - only configure when billing is enabled
let chargebeeInstance: ChargeBee | null = null;

export const getChargebee = (): ChargeBee => {
  if (!envServer.ENABLE_CHARGEBEE_BILLING) {
    throw new Error('Chargebee billing is not enabled');
  }

  if (!envServer.CHARGEBEE_SITE || !envServer.CHARGEBEE_API_KEY) {
    throw new Error('Chargebee configuration is missing');
  }

  if (!chargebeeInstance) {
    chargebeeInstance = new ChargeBee();
    chargebeeInstance.configure({
      site: envServer.CHARGEBEE_SITE,
      api_key: envServer.CHARGEBEE_API_KEY,
    });
  }

  return chargebeeInstance;
};

// Helper to check if billing is enabled
export const isBillingEnabled = (): boolean => {
  return envServer.ENABLE_CHARGEBEE_BILLING;
};

// Guard function for billing procedures
export const assertBillingEnabled = (): void => {
  if (!envServer.ENABLE_CHARGEBEE_BILLING) {
    throw new Error('Billing is not enabled');
  }
};
```

**Step 2: Verify types**

```bash
pnpm tsc --noEmit
```

Expected: No type errors

**Step 3: Commit**

```bash
git add src/server/lib/chargebee.ts
git commit -m "feat(billing): add Chargebee server client"
```

---

## Task 5: Create Billing Zod Schemas

**Files:**
- Create: `src/features/billing/schema.ts`

**Step 1: Create billing schemas**

```typescript
import { z } from 'zod';

// Subscription status enum matching Chargebee
export const zSubscriptionStatus = z.enum([
  'future',
  'in_trial',
  'active',
  'non_renewing',
  'paused',
  'cancelled',
]);

export type SubscriptionStatus = z.infer<typeof zSubscriptionStatus>;

// Plan from Chargebee
export const zPlan = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  price: z.number(),
  period: z.number(),
  periodUnit: z.enum(['day', 'week', 'month', 'year']),
  currencyCode: z.string(),
});

export type Plan = z.infer<typeof zPlan>;

// Subscription details
export const zSubscription = z.object({
  id: z.string(),
  status: zSubscriptionStatus,
  planId: z.string(),
  planName: z.string(),
  currentTermStart: z.string().optional(),
  currentTermEnd: z.string().optional(),
  cancelledAt: z.string().optional(),
  nextBillingAt: z.string().optional(),
});

export type Subscription = z.infer<typeof zSubscription>;

// Payment method
export const zPaymentMethod = z.object({
  id: z.string(),
  type: z.enum(['card', 'bank_account', 'paypal']),
  status: z.enum(['valid', 'expiring', 'expired', 'invalid']),
  isDefault: z.boolean(),
  // Card-specific fields
  cardBrand: z.string().optional(),
  cardLast4: z.string().optional(),
  cardExpiryMonth: z.number().optional(),
  cardExpiryYear: z.number().optional(),
});

export type PaymentMethod = z.infer<typeof zPaymentMethod>;

// Invoice
export const zInvoice = z.object({
  id: z.string(),
  number: z.string().optional(),
  status: z.enum(['paid', 'posted', 'payment_due', 'not_paid', 'voided', 'pending']),
  date: z.string(),
  total: z.number(),
  currencyCode: z.string(),
  downloadUrl: z.string().optional(),
});

export type Invoice = z.infer<typeof zInvoice>;

// Entitlement
export const zEntitlement = z.object({
  featureId: z.string(),
  value: z.string(),
});

export type Entitlement = z.infer<typeof zEntitlement>;

// Input schemas for mutations
export const zAddPaymentMethodInput = z.object({
  token: z.string(), // Chargebee.js tokenized card
});

export const zUpdateSubscriptionInput = z.object({
  planId: z.string(),
});
```

**Step 2: Verify types**

```bash
pnpm tsc --noEmit
```

Expected: No type errors

**Step 3: Commit**

```bash
git add src/features/billing/schema.ts
git commit -m "feat(billing): add Zod schemas for billing types"
```

---

## Task 6: Create Billing Router

**Files:**
- Create: `src/server/routers/billing.ts`
- Modify: `src/server/router.ts`

**Step 1: Create the billing router**

```typescript
import { ORPCError } from '@orpc/server';
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
import { protectedProcedure } from '@/server/orpc';

const tags = ['billing'];

// Helper to get user's organization (for now, get first org they belong to)
const getUserOrganization = async (
  db: any,
  userId: string
) => {
  const membership = await db.organizationMember.findFirst({
    where: { userId },
    include: { organization: true },
  });

  if (!membership) {
    throw new ORPCError('NOT_FOUND', { message: 'No organization found' });
  }

  return membership.organization;
};

export default {
  // Get available plans from Chargebee
  getPlans: protectedProcedure({ permission: null })
    .route({ method: 'GET', path: '/billing/plans', tags })
    .output(z.array(zPlan))
    .handler(async () => {
      assertBillingEnabled();
      const chargebee = getChargebee();

      const result = await chargebee.plan.list({
        limit: 100,
        'status[is]': 'active',
      }).request();

      return result.list.map((item: any) => ({
        id: item.plan.id,
        name: item.plan.name,
        description: item.plan.description,
        price: item.plan.price,
        period: item.plan.period,
        periodUnit: item.plan.period_unit,
        currencyCode: item.plan.currency_code,
      }));
    }),

  // Get current subscription
  getSubscription: protectedProcedure({ permission: null })
    .route({ method: 'GET', path: '/billing/subscription', tags })
    .output(zSubscription.nullable())
    .handler(async ({ context }) => {
      assertBillingEnabled();
      const org = await getUserOrganization(context.db, context.user.id);

      if (!org.chargebeeSubscriptionId) {
        return null;
      }

      const chargebee = getChargebee();
      const result = await chargebee.subscription
        .retrieve(org.chargebeeSubscriptionId)
        .request();

      const sub = result.subscription;
      return {
        id: sub.id,
        status: sub.status,
        planId: sub.plan_id,
        planName: sub.plan_id, // Will be enriched on client
        currentTermStart: sub.current_term_start
          ? new Date(sub.current_term_start * 1000).toISOString()
          : undefined,
        currentTermEnd: sub.current_term_end
          ? new Date(sub.current_term_end * 1000).toISOString()
          : undefined,
        cancelledAt: sub.cancelled_at
          ? new Date(sub.cancelled_at * 1000).toISOString()
          : undefined,
        nextBillingAt: sub.next_billing_at
          ? new Date(sub.next_billing_at * 1000).toISOString()
          : undefined,
      };
    }),

  // Get payment methods
  getPaymentMethods: protectedProcedure({ permission: null })
    .route({ method: 'GET', path: '/billing/payment-methods', tags })
    .output(z.array(zPaymentMethod))
    .handler(async ({ context }) => {
      assertBillingEnabled();
      const org = await getUserOrganization(context.db, context.user.id);

      if (!org.chargebeeCustomerId) {
        return [];
      }

      const chargebee = getChargebee();
      const result = await chargebee.payment_source
        .list({ 'customer_id[is]': org.chargebeeCustomerId })
        .request();

      return result.list.map((item: any) => {
        const source = item.payment_source;
        return {
          id: source.id,
          type: source.type,
          status: source.status,
          isDefault: source.id === item.customer?.primary_payment_source_id,
          cardBrand: source.card?.brand,
          cardLast4: source.card?.last4,
          cardExpiryMonth: source.card?.expiry_month,
          cardExpiryYear: source.card?.expiry_year,
        };
      });
    }),

  // Add payment method using Chargebee.js token
  addPaymentMethod: protectedProcedure({ permission: null })
    .route({ method: 'POST', path: '/billing/payment-methods', tags })
    .input(zAddPaymentMethodInput)
    .output(zPaymentMethod)
    .handler(async ({ context, input }) => {
      assertBillingEnabled();
      const org = await getUserOrganization(context.db, context.user.id);
      const chargebee = getChargebee();

      // Create customer if doesn't exist
      let customerId = org.chargebeeCustomerId;
      if (!customerId) {
        const customerResult = await chargebee.customer
          .create({
            id: org.id,
            email: context.user.email,
            company: org.name,
          })
          .request();

        customerId = customerResult.customer.id;

        await context.db.organization.update({
          where: { id: org.id },
          data: { chargebeeCustomerId: customerId },
        });
      }

      // Add payment source using token
      const result = await chargebee.payment_source
        .create_using_temp_token({
          customer_id: customerId,
          tmp_token: input.token,
        })
        .request();

      const source = result.payment_source;
      return {
        id: source.id,
        type: source.type,
        status: source.status,
        isDefault: false,
        cardBrand: source.card?.brand,
        cardLast4: source.card?.last4,
        cardExpiryMonth: source.card?.expiry_month,
        cardExpiryYear: source.card?.expiry_year,
      };
    }),

  // Remove payment method
  removePaymentMethod: protectedProcedure({ permission: null })
    .route({ method: 'DELETE', path: '/billing/payment-methods/{id}', tags })
    .input(z.object({ id: z.string() }))
    .output(z.void())
    .handler(async ({ context, input }) => {
      assertBillingEnabled();
      const org = await getUserOrganization(context.db, context.user.id);

      if (!org.chargebeeCustomerId) {
        throw new ORPCError('NOT_FOUND', { message: 'No customer found' });
      }

      const chargebee = getChargebee();
      await chargebee.payment_source.delete(input.id).request();
    }),

  // Set default payment method
  setDefaultPaymentMethod: protectedProcedure({ permission: null })
    .route({ method: 'POST', path: '/billing/payment-methods/{id}/default', tags })
    .input(z.object({ id: z.string() }))
    .output(z.void())
    .handler(async ({ context, input }) => {
      assertBillingEnabled();
      const org = await getUserOrganization(context.db, context.user.id);

      if (!org.chargebeeCustomerId) {
        throw new ORPCError('NOT_FOUND', { message: 'No customer found' });
      }

      const chargebee = getChargebee();
      await chargebee.customer
        .assign_payment_role(org.chargebeeCustomerId, {
          payment_source_id: input.id,
          role: 'PRIMARY',
        })
        .request();
    }),

  // Get invoices
  getInvoices: protectedProcedure({ permission: null })
    .route({ method: 'GET', path: '/billing/invoices', tags })
    .output(z.array(zInvoice))
    .handler(async ({ context }) => {
      assertBillingEnabled();
      const org = await getUserOrganization(context.db, context.user.id);

      if (!org.chargebeeCustomerId) {
        return [];
      }

      const chargebee = getChargebee();
      const result = await chargebee.invoice
        .list({
          'customer_id[is]': org.chargebeeCustomerId,
          limit: 20,
          'sort_by[desc]': 'date',
        })
        .request();

      return result.list.map((item: any) => {
        const inv = item.invoice;
        return {
          id: inv.id,
          number: inv.id,
          status: inv.status,
          date: new Date(inv.date * 1000).toISOString(),
          total: inv.total,
          currencyCode: inv.currency_code,
          downloadUrl: inv.download?.download_url,
        };
      });
    }),

  // Get invoice download URL
  downloadInvoice: protectedProcedure({ permission: null })
    .route({ method: 'GET', path: '/billing/invoices/{id}/download', tags })
    .input(z.object({ id: z.string() }))
    .output(z.object({ url: z.string() }))
    .handler(async ({ input }) => {
      assertBillingEnabled();
      const chargebee = getChargebee();

      const result = await chargebee.invoice.pdf(input.id).request();

      return { url: result.download.download_url };
    }),

  // Update subscription (change plan)
  updateSubscription: protectedProcedure({ permission: null })
    .route({ method: 'POST', path: '/billing/subscription', tags })
    .input(zUpdateSubscriptionInput)
    .output(zSubscription)
    .handler(async ({ context, input }) => {
      assertBillingEnabled();
      const org = await getUserOrganization(context.db, context.user.id);

      if (!org.chargebeeSubscriptionId) {
        throw new ORPCError('NOT_FOUND', { message: 'No subscription found' });
      }

      const chargebee = getChargebee();
      const result = await chargebee.subscription
        .update(org.chargebeeSubscriptionId, {
          plan_id: input.planId,
        })
        .request();

      const sub = result.subscription;

      // Update cached data
      await context.db.organization.update({
        where: { id: org.id },
        data: {
          subscriptionPlanId: sub.plan_id,
          subscriptionStatus: sub.status,
          chargebeeSyncedAt: new Date(),
        },
      });

      return {
        id: sub.id,
        status: sub.status,
        planId: sub.plan_id,
        planName: sub.plan_id,
        currentTermStart: sub.current_term_start
          ? new Date(sub.current_term_start * 1000).toISOString()
          : undefined,
        currentTermEnd: sub.current_term_end
          ? new Date(sub.current_term_end * 1000).toISOString()
          : undefined,
        nextBillingAt: sub.next_billing_at
          ? new Date(sub.next_billing_at * 1000).toISOString()
          : undefined,
      };
    }),

  // Cancel subscription
  cancelSubscription: protectedProcedure({ permission: null })
    .route({ method: 'POST', path: '/billing/subscription/cancel', tags })
    .output(zSubscription)
    .handler(async ({ context }) => {
      assertBillingEnabled();
      const org = await getUserOrganization(context.db, context.user.id);

      if (!org.chargebeeSubscriptionId) {
        throw new ORPCError('NOT_FOUND', { message: 'No subscription found' });
      }

      const chargebee = getChargebee();
      const result = await chargebee.subscription
        .cancel_for_items(org.chargebeeSubscriptionId, {
          end_of_term: true,
        })
        .request();

      const sub = result.subscription;

      // Update cached data
      await context.db.organization.update({
        where: { id: org.id },
        data: {
          subscriptionStatus: sub.status,
          subscriptionCancelledAt: sub.cancelled_at
            ? new Date(sub.cancelled_at * 1000)
            : null,
          chargebeeSyncedAt: new Date(),
        },
      });

      return {
        id: sub.id,
        status: sub.status,
        planId: sub.plan_id,
        planName: sub.plan_id,
        cancelledAt: sub.cancelled_at
          ? new Date(sub.cancelled_at * 1000).toISOString()
          : undefined,
      };
    }),

  // Reactivate subscription
  reactivateSubscription: protectedProcedure({ permission: null })
    .route({ method: 'POST', path: '/billing/subscription/reactivate', tags })
    .output(zSubscription)
    .handler(async ({ context }) => {
      assertBillingEnabled();
      const org = await getUserOrganization(context.db, context.user.id);

      if (!org.chargebeeSubscriptionId) {
        throw new ORPCError('NOT_FOUND', { message: 'No subscription found' });
      }

      const chargebee = getChargebee();
      const result = await chargebee.subscription
        .reactivate(org.chargebeeSubscriptionId)
        .request();

      const sub = result.subscription;

      // Update cached data
      await context.db.organization.update({
        where: { id: org.id },
        data: {
          subscriptionStatus: sub.status,
          subscriptionCancelledAt: null,
          chargebeeSyncedAt: new Date(),
        },
      });

      return {
        id: sub.id,
        status: sub.status,
        planId: sub.plan_id,
        planName: sub.plan_id,
      };
    }),

  // Create checkout session for new subscription
  createCheckout: protectedProcedure({ permission: null })
    .route({ method: 'POST', path: '/billing/checkout', tags })
    .input(z.object({ planId: z.string() }))
    .output(z.object({ url: z.string() }))
    .handler(async ({ context, input }) => {
      assertBillingEnabled();
      const org = await getUserOrganization(context.db, context.user.id);
      const chargebee = getChargebee();

      const result = await chargebee.hosted_page
        .checkout_new_for_items({
          customer: {
            id: org.chargebeeCustomerId || org.id,
            email: context.user.email,
            company: org.name,
          },
          subscription_items: [
            {
              item_price_id: input.planId,
              quantity: 1,
            },
          ],
        })
        .request();

      return { url: result.hosted_page.url };
    }),
};
```

**Step 2: Register billing router**

In `src/server/router.ts`, add the import and router:

```typescript
import { InferRouterInputs, InferRouterOutputs } from '@orpc/server';

import accountRouter from './routers/account';
import billingRouter from './routers/billing';
import configRouter from './routers/config';
import userRouter from './routers/user';

export type Router = typeof router;
export type Inputs = InferRouterInputs<typeof router>;
export type Outputs = InferRouterOutputs<typeof router>;
export const router = {
  account: accountRouter,
  billing: billingRouter,
  user: userRouter,
  config: configRouter,
};
```

**Step 3: Verify types**

```bash
pnpm tsc --noEmit
```

Expected: No type errors

**Step 4: Commit**

```bash
git add src/server/routers/billing.ts src/server/router.ts
git commit -m "feat(billing): add billing router with Chargebee operations"
```

---

## Task 7: Create Webhook Endpoint

**Files:**
- Create: `src/routes/api/webhooks/chargebee.ts`
- Create: `src/server/webhooks/chargebee/handlers.ts`

**Step 1: Create webhook handlers**

```typescript
// src/server/webhooks/chargebee/handlers.ts
import { db } from '@/server/db';
import { getChargebee } from '@/server/lib/chargebee';
import { logger } from '@/server/logger';

type WebhookEvent = {
  event_type: string;
  content: any;
};

// Fetch and update entitlements for a subscription
const syncEntitlements = async (subscriptionId: string, orgId: string) => {
  try {
    const chargebee = getChargebee();
    const result = await chargebee.entitlement
      .list({ 'subscription_id[is]': subscriptionId })
      .request();

    const entitlements: Record<string, { value: string }> = {};
    for (const item of result.list) {
      entitlements[item.entitlement.feature_id] = {
        value: item.entitlement.value,
      };
    }

    await db.organization.update({
      where: { id: orgId },
      data: {
        entitlements,
        chargebeeSyncedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error({ error, subscriptionId, orgId }, 'Failed to sync entitlements');
  }
};

export const webhookHandlers: Record<
  string,
  (event: WebhookEvent) => Promise<void>
> = {
  // Customer created - link to organization
  customer_created: async (event) => {
    const customer = event.content.customer;
    // Customer ID should match org ID if we created it
    await db.organization.updateMany({
      where: { id: customer.id },
      data: {
        chargebeeCustomerId: customer.id,
        chargebeeSyncedAt: new Date(),
      },
    });
  },

  // Subscription created
  subscription_created: async (event) => {
    const subscription = event.content.subscription;
    const customerId = subscription.customer_id;

    const org = await db.organization.findFirst({
      where: { chargebeeCustomerId: customerId },
    });

    if (!org) {
      logger.warn({ customerId }, 'No organization found for customer');
      return;
    }

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
        chargebeeSyncedAt: new Date(),
      },
    });

    await syncEntitlements(subscription.id, org.id);
  },

  // Subscription changed (plan change, etc.)
  subscription_changed: async (event) => {
    const subscription = event.content.subscription;

    const org = await db.organization.findFirst({
      where: { chargebeeSubscriptionId: subscription.id },
    });

    if (!org) {
      logger.warn({ subscriptionId: subscription.id }, 'No organization found');
      return;
    }

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

    await syncEntitlements(subscription.id, org.id);
  },

  // Subscription renewed
  subscription_renewed: async (event) => {
    const subscription = event.content.subscription;

    await db.organization.updateMany({
      where: { chargebeeSubscriptionId: subscription.id },
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
  },

  // Subscription cancelled
  subscription_cancelled: async (event) => {
    const subscription = event.content.subscription;

    await db.organization.updateMany({
      where: { chargebeeSubscriptionId: subscription.id },
      data: {
        subscriptionStatus: subscription.status,
        subscriptionCancelledAt: subscription.cancelled_at
          ? new Date(subscription.cancelled_at * 1000)
          : null,
        chargebeeSyncedAt: new Date(),
      },
    });
  },

  // Subscription reactivated
  subscription_reactivated: async (event) => {
    const subscription = event.content.subscription;

    const org = await db.organization.findFirst({
      where: { chargebeeSubscriptionId: subscription.id },
    });

    if (!org) return;

    await db.organization.update({
      where: { id: org.id },
      data: {
        subscriptionStatus: subscription.status,
        subscriptionCancelledAt: null,
        chargebeeSyncedAt: new Date(),
      },
    });

    await syncEntitlements(subscription.id, org.id);
  },

  // Payment failed
  payment_failed: async (event) => {
    const subscription = event.content.subscription;
    if (!subscription) return;

    await db.organization.updateMany({
      where: { chargebeeSubscriptionId: subscription.id },
      data: {
        subscriptionStatus: 'past_due',
        chargebeeSyncedAt: new Date(),
      },
    });
  },

  // Payment succeeded
  payment_succeeded: async (event) => {
    const subscription = event.content.subscription;
    if (!subscription) return;

    await db.organization.updateMany({
      where: {
        chargebeeSubscriptionId: subscription.id,
        subscriptionStatus: 'past_due',
      },
      data: {
        subscriptionStatus: 'active',
        chargebeeSyncedAt: new Date(),
      },
    });
  },

  // Entitlements updated
  entitlement_overrides_updated: async (event) => {
    const subscriptionId = event.content.subscription?.id;
    if (!subscriptionId) return;

    const org = await db.organization.findFirst({
      where: { chargebeeSubscriptionId: subscriptionId },
    });

    if (org) {
      await syncEntitlements(subscriptionId, org.id);
    }
  },

  // Subscription deleted
  subscription_deleted: async (event) => {
    const subscription = event.content.subscription;

    await db.organization.updateMany({
      where: { chargebeeSubscriptionId: subscription.id },
      data: {
        chargebeeSubscriptionId: null,
        subscriptionStatus: null,
        subscriptionPlanId: null,
        subscriptionCurrentPeriodStart: null,
        subscriptionCurrentPeriodEnd: null,
        subscriptionCancelledAt: null,
        entitlements: null,
        chargebeeSyncedAt: new Date(),
      },
    });
  },
};
```

**Step 2: Create webhook endpoint**

```typescript
// src/routes/api/webhooks/chargebee.ts
import { createFileRoute } from '@tanstack/react-router';
import { createHmac } from 'crypto';

import { envServer } from '@/env/server';
import { logger } from '@/server/logger';
import { webhookHandlers } from '@/server/webhooks/chargebee/handlers';

const verifyWebhookSignature = (
  payload: string,
  signature: string,
  secret: string
): boolean => {
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  return signature === expectedSignature;
};

export const Route = createFileRoute('/api/webhooks/chargebee')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // If billing is disabled, acknowledge but do nothing
        if (!envServer.ENABLE_CHARGEBEE_BILLING) {
          return new Response('OK', { status: 200 });
        }

        try {
          const body = await request.text();

          // Verify signature if webhook secret is configured
          if (envServer.CHARGEBEE_WEBHOOK_SECRET) {
            const signature = request.headers.get('x-chargebee-signature') || '';
            if (
              !verifyWebhookSignature(
                body,
                signature,
                envServer.CHARGEBEE_WEBHOOK_SECRET
              )
            ) {
              logger.warn('Invalid webhook signature');
              return new Response('Invalid signature', { status: 401 });
            }
          }

          const event = JSON.parse(body);
          const eventType = event.event_type;

          logger.info({ eventType }, 'Received Chargebee webhook');

          const handler = webhookHandlers[eventType];
          if (handler) {
            await handler(event);
          } else {
            logger.debug({ eventType }, 'No handler for event type');
          }

          return new Response('OK', { status: 200 });
        } catch (error) {
          logger.error({ error }, 'Webhook processing error');
          return new Response('Error', { status: 500 });
        }
      },
    },
  },
});
```

**Step 3: Verify types**

```bash
pnpm tsc --noEmit
```

Expected: No type errors

**Step 4: Commit**

```bash
git add src/routes/api/webhooks/chargebee.ts src/server/webhooks/chargebee/handlers.ts
git commit -m "feat(billing): add Chargebee webhook endpoint and handlers"
```

---

## Task 8: Create Chargebee.js Client Provider

**Files:**
- Create: `src/lib/chargebee/provider.tsx`
- Create: `src/lib/chargebee/use-chargebee.ts`
- Create: `src/lib/chargebee/index.ts`

**Step 1: Create the provider**

```typescript
// src/lib/chargebee/provider.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { envClient } from '@/env/client';

type ChargebeeInstance = {
  tokenize: (options: {
    number: string;
    cvv: string;
    expiryMonth: string;
    expiryYear: string;
  }) => Promise<{ token: string }>;
};

type ChargebeeContextValue = {
  chargebee: ChargebeeInstance | null;
  isLoading: boolean;
  error: Error | null;
};

const ChargebeeContext = createContext<ChargebeeContextValue>({
  chargebee: null,
  isLoading: true,
  error: null,
});

declare global {
  interface Window {
    Chargebee: {
      init: (options: { site: string; publishableKey: string }) => ChargebeeInstance;
    };
  }
}

type ChargebeeProviderProps = {
  children: ReactNode;
};

export const ChargebeeProvider = ({ children }: ChargebeeProviderProps) => {
  const [chargebee, setChargebee] = useState<ChargebeeInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!envClient.VITE_ENABLE_CHARGEBEE_BILLING) {
      setIsLoading(false);
      return;
    }

    const site = envClient.VITE_CHARGEBEE_SITE;
    const publishableKey = envClient.VITE_CHARGEBEE_PUBLISHABLE_KEY;

    if (!site || !publishableKey) {
      setError(new Error('Chargebee configuration missing'));
      setIsLoading(false);
      return;
    }

    // Check if already loaded
    if (window.Chargebee) {
      try {
        const instance = window.Chargebee.init({ site, publishableKey });
        setChargebee(instance);
        setIsLoading(false);
      } catch (err) {
        setError(err as Error);
        setIsLoading(false);
      }
      return;
    }

    // Load Chargebee.js script
    const script = document.createElement('script');
    script.src = 'https://js.chargebee.com/v2/chargebee.js';
    script.async = true;

    script.onload = () => {
      try {
        const instance = window.Chargebee.init({ site, publishableKey });
        setChargebee(instance);
      } catch (err) {
        setError(err as Error);
      }
      setIsLoading(false);
    };

    script.onerror = () => {
      setError(new Error('Failed to load Chargebee.js'));
      setIsLoading(false);
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, []);

  return (
    <ChargebeeContext.Provider value={{ chargebee, isLoading, error }}>
      {children}
    </ChargebeeContext.Provider>
  );
};

export const useChargebeeContext = () => useContext(ChargebeeContext);
```

**Step 2: Create the hook**

```typescript
// src/lib/chargebee/use-chargebee.ts
import { useState } from 'react';

import { useChargebeeContext } from './provider';

type TokenizeParams = {
  cardNumber: string;
  cvv: string;
  expiryMonth: string;
  expiryYear: string;
};

export const useChargebee = () => {
  const { chargebee, isLoading, error } = useChargebeeContext();
  const [isTokenizing, setIsTokenizing] = useState(false);
  const [tokenizeError, setTokenizeError] = useState<Error | null>(null);

  const tokenize = async (params: TokenizeParams): Promise<string | null> => {
    if (!chargebee) {
      setTokenizeError(new Error('Chargebee not initialized'));
      return null;
    }

    setIsTokenizing(true);
    setTokenizeError(null);

    try {
      const result = await chargebee.tokenize({
        number: params.cardNumber.replace(/\s/g, ''),
        cvv: params.cvv,
        expiryMonth: params.expiryMonth,
        expiryYear: params.expiryYear,
      });

      return result.token;
    } catch (err) {
      setTokenizeError(err as Error);
      return null;
    } finally {
      setIsTokenizing(false);
    }
  };

  return {
    isReady: !isLoading && !error && !!chargebee,
    isLoading,
    error,
    tokenize,
    isTokenizing,
    tokenizeError,
  };
};
```

**Step 3: Create index file**

```typescript
// src/lib/chargebee/index.ts
export { ChargebeeProvider, useChargebeeContext } from './provider';
export { useChargebee } from './use-chargebee';
```

**Step 4: Verify types**

```bash
pnpm tsc --noEmit
```

Expected: No type errors

**Step 5: Commit**

```bash
git add src/lib/chargebee/
git commit -m "feat(billing): add Chargebee.js client provider and hooks"
```

---

## Task 9: Add Feature Flag to Navigation

**Files:**
- Modify: `src/features/settings/components/settings-layout.tsx`

**Step 1: Import envClient and filter nav items**

Update the file to conditionally show billing:

```typescript
import { Link, useRouterState } from '@tanstack/react-router';
import {
  ArchiveIcon,
  CreditCardIcon,
  KeyRoundIcon,
  LayoutGridIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  Users2Icon,
  UsersIcon,
} from 'lucide-react';
import { type ReactNode, useMemo } from 'react';

import { envClient } from '@/env/client';
import { cn } from '@/lib/tailwind/utils';

import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
} from '@/layout/shell';

const allSettingsNavItems = [
  { title: 'Billing', icon: CreditCardIcon, url: '/settings/billing', requiresBilling: true },
  { title: 'Members', icon: UsersIcon, url: '/settings/members' },
  { title: 'Teams', icon: Users2Icon, url: '/settings/teams' },
  { title: 'Roles', icon: KeyRoundIcon, url: '/settings/roles' },
  { title: 'Workspaces', icon: LayoutGridIcon, url: '/settings/workspaces' },
  { title: 'Backups', icon: ArchiveIcon, url: '/settings/backups' },
  { title: 'Governance', icon: ShieldCheckIcon, url: '/settings/governance' },
  { title: 'Audit Log', icon: ScrollTextIcon, url: '/settings/audit' },
];

type SettingsLayoutProps = {
  children: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export const SettingsLayout = ({
  children,
  title,
  description,
  actions,
}: SettingsLayoutProps) => {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const settingsNavItems = useMemo(() => {
    return allSettingsNavItems.filter((item) => {
      if (item.requiresBilling && !envClient.VITE_ENABLE_CHARGEBEE_BILLING) {
        return false;
      }
      return true;
    });
  }, []);

  return (
    <PageLayout>
      <PageLayoutTopBar title="Settings" />
      <PageLayoutContent containerClassName="py-0">
        <div className="flex min-h-[calc(100vh-48px)]">
          {/* Settings Sidebar */}
          <aside className="w-56 shrink-0 border-r border-neutral-200 bg-neutral-50 py-4">
            <nav className="space-y-1 px-3">
              {settingsNavItems.map((item) => {
                const isActive = pathname.startsWith(item.url);
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-white text-neutral-900 shadow-sm'
                        : 'text-neutral-600 hover:bg-white hover:text-neutral-900'
                    )}
                  >
                    <item.icon className="size-4" strokeWidth={1.5} />
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 bg-white">
            {/* Content Header */}
            <div className="border-b border-neutral-200 px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-semibold text-neutral-900">
                    {title}
                  </h1>
                  {description && (
                    <p className="mt-1 text-sm text-neutral-500">
                      {description}
                    </p>
                  )}
                </div>
                {actions && (
                  <div className="flex items-center gap-3">{actions}</div>
                )}
              </div>
            </div>

            {/* Content Body */}
            <div className="px-8 py-6">{children}</div>
          </main>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
```

**Step 2: Verify types**

```bash
pnpm tsc --noEmit
```

Expected: No type errors

**Step 3: Commit**

```bash
git add src/features/settings/components/settings-layout.tsx
git commit -m "feat(billing): add feature flag to settings navigation"
```

---

## Task 10: Add Route Guard to Billing Page

**Files:**
- Modify: `src/routes/_app/settings/billing.tsx`

**Step 1: Add beforeLoad guard**

```typescript
import { createFileRoute, redirect } from '@tanstack/react-router';

import { envClient } from '@/env/client';
import { PageSettingsBilling } from '@/features/settings/page-settings-billing';

export const Route = createFileRoute('/_app/settings/billing')({
  beforeLoad: () => {
    if (!envClient.VITE_ENABLE_CHARGEBEE_BILLING) {
      throw redirect({ to: '/settings/members' });
    }
  },
  component: PageSettingsBilling,
});
```

**Step 2: Verify types**

```bash
pnpm tsc --noEmit
```

Expected: No type errors

**Step 3: Commit**

```bash
git add src/routes/_app/settings/billing.tsx
git commit -m "feat(billing): add route guard for feature flag"
```

---

## Task 11: Update Billing Page to Use Real Data

**Files:**
- Modify: `src/features/settings/page-settings-billing.tsx`

**Step 1: Refactor to use real Chargebee data**

This is a larger refactor. Replace the entire file content:

```typescript
import {
  CheckIcon,
  CreditCardIcon,
  DownloadIcon,
  Loader2Icon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/tailwind/utils';
import { ChargebeeProvider, useChargebee } from '@/lib/chargebee';
import { orpc } from '@/lib/orpc/react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

import { SettingsLayout } from './components/settings-layout';
import { getStatusStyles } from '@/features/shared/lib/status-styles';

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount / 100); // Chargebee amounts are in cents
};

const formatDate = (isoDate: string) => {
  return new Date(isoDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const BillingPageContent = () => {
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');

  const { tokenize, isTokenizing, isReady: isChargebeeReady } = useChargebee();

  // Queries
  const { data: plans, isLoading: plansLoading } = orpc.billing.getPlans.useQuery({});
  const { data: subscription, isLoading: subscriptionLoading } = orpc.billing.getSubscription.useQuery({});
  const { data: paymentMethods, isLoading: paymentMethodsLoading } = orpc.billing.getPaymentMethods.useQuery({});
  const { data: invoices, isLoading: invoicesLoading } = orpc.billing.getInvoices.useQuery({});

  // Mutations
  const utils = orpc.useUtils();

  const addPaymentMethodMutation = orpc.billing.addPaymentMethod.useMutation({
    onSuccess: () => {
      toast.success('Payment method added');
      setAddPaymentOpen(false);
      resetCardForm();
      utils.billing.getPaymentMethods.invalidate();
    },
    onError: (error) => {
      toast.error('Failed to add payment method', { description: error.message });
    },
  });

  const removePaymentMethodMutation = orpc.billing.removePaymentMethod.useMutation({
    onSuccess: () => {
      toast.success('Payment method removed');
      utils.billing.getPaymentMethods.invalidate();
    },
    onError: (error) => {
      toast.error('Failed to remove payment method', { description: error.message });
    },
  });

  const setDefaultPaymentMethodMutation = orpc.billing.setDefaultPaymentMethod.useMutation({
    onSuccess: () => {
      toast.success('Default payment method updated');
      utils.billing.getPaymentMethods.invalidate();
    },
    onError: (error) => {
      toast.error('Failed to update default', { description: error.message });
    },
  });

  const updateSubscriptionMutation = orpc.billing.updateSubscription.useMutation({
    onSuccess: (data) => {
      toast.success('Plan updated successfully');
      setChangePlanOpen(false);
      utils.billing.getSubscription.invalidate();
    },
    onError: (error) => {
      toast.error('Failed to update plan', { description: error.message });
    },
  });

  const cancelSubscriptionMutation = orpc.billing.cancelSubscription.useMutation({
    onSuccess: () => {
      toast.success('Subscription will be cancelled at the end of the billing period');
      utils.billing.getSubscription.invalidate();
    },
    onError: (error) => {
      toast.error('Failed to cancel subscription', { description: error.message });
    },
  });

  const reactivateSubscriptionMutation = orpc.billing.reactivateSubscription.useMutation({
    onSuccess: () => {
      toast.success('Subscription reactivated');
      utils.billing.getSubscription.invalidate();
    },
    onError: (error) => {
      toast.error('Failed to reactivate subscription', { description: error.message });
    },
  });

  const resetCardForm = () => {
    setCardNumber('');
    setExpiryMonth('');
    setExpiryYear('');
    setCvv('');
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isChargebeeReady) {
      toast.error('Payment system not ready');
      return;
    }

    const token = await tokenize({
      cardNumber,
      cvv,
      expiryMonth,
      expiryYear,
    });

    if (!token) {
      toast.error('Failed to process card');
      return;
    }

    addPaymentMethodMutation.mutate({ token });
  };

  const handleChangePlan = () => {
    if (!selectedPlanId) return;
    updateSubscriptionMutation.mutate({ planId: selectedPlanId });
  };

  const currentPlan = plans?.find((p) => p.id === subscription?.planId);
  const isLoading = plansLoading || subscriptionLoading;

  return (
    <SettingsLayout
      title="Billing"
      description="Manage your subscription and payment methods"
    >
      <div className="space-y-8">
        {/* Current Plan */}
        <div className="border border-neutral-200">
          <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-6 py-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                Current Plan
              </h2>
              {subscription?.currentTermEnd && (
                <p className="mt-0.5 text-xs text-neutral-500">
                  Your subscription renews on {formatDate(subscription.currentTermEnd)}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {subscription?.status === 'non_renewing' && (
                <Button
                  variant="secondary"
                  onClick={() => reactivateSubscriptionMutation.mutate()}
                  disabled={reactivateSubscriptionMutation.isPending}
                  className="h-8 rounded-none border-neutral-300 px-4 text-xs font-medium"
                >
                  {reactivateSubscriptionMutation.isPending ? (
                    <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
                  ) : null}
                  Reactivate
                </Button>
              )}
              <Dialog open={changePlanOpen} onOpenChange={setChangePlanOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="secondary"
                    className="h-8 rounded-none border-neutral-300 px-4 text-xs font-medium"
                  >
                    Change Plan
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl rounded-none p-0">
                  <DialogHeader className="border-b border-neutral-200 px-6 py-4">
                    <DialogTitle className="text-sm font-semibold text-neutral-900">
                      Choose a Plan
                    </DialogTitle>
                    <DialogDescription className="text-xs text-neutral-500">
                      Select the plan that best fits your needs
                    </DialogDescription>
                  </DialogHeader>

                  {/* Plans Grid */}
                  <div className="grid grid-cols-3 gap-px bg-neutral-200 p-6">
                    {plansLoading ? (
                      <div className="col-span-3 flex justify-center py-8">
                        <Loader2Icon className="size-6 animate-spin text-neutral-400" />
                      </div>
                    ) : (
                      plans?.map((plan) => {
                        const isCurrentPlan = plan.id === subscription?.planId;
                        const isSelected = plan.id === selectedPlanId;

                        return (
                          <button
                            key={plan.id}
                            type="button"
                            onClick={() => setSelectedPlanId(plan.id)}
                            className={cn(
                              'relative bg-white p-5 text-left transition-all',
                              isSelected
                                ? 'ring-2 ring-neutral-900'
                                : 'hover:bg-neutral-50'
                            )}
                          >
                            {isCurrentPlan && (
                              <span className="absolute top-3 right-3 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
                                Current
                              </span>
                            )}
                            <h3 className="text-sm font-semibold text-neutral-900">
                              {plan.name}
                            </h3>
                            {plan.description && (
                              <p className="mt-1 text-xs text-neutral-500">
                                {plan.description}
                              </p>
                            )}
                            <div className="mt-4">
                              <span className="text-2xl font-bold text-neutral-900 tabular-nums">
                                {formatCurrency(plan.price, plan.currencyCode)}
                              </span>
                              <span className="text-xs text-neutral-500">
                                /{plan.periodUnit}
                              </span>
                            </div>
                            {isSelected && (
                              <div className="absolute right-3 bottom-3">
                                <CheckIcon className="size-5 text-neutral-900" />
                              </div>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>

                  <DialogFooter className="border-t border-neutral-200 px-6 py-4">
                    <DialogClose asChild>
                      <Button
                        variant="secondary"
                        className="h-8 rounded-none border-neutral-300 px-4 text-xs font-medium"
                      >
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button
                      onClick={handleChangePlan}
                      disabled={
                        !selectedPlanId ||
                        selectedPlanId === subscription?.planId ||
                        updateSubscriptionMutation.isPending
                      }
                      className="h-8 rounded-none bg-brand-500 px-4 text-xs font-medium text-white hover:bg-brand-600"
                    >
                      {updateSubscriptionMutation.isPending ? (
                        <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
                      ) : null}
                      {selectedPlanId === subscription?.planId
                        ? 'Current Plan'
                        : 'Switch Plan'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2Icon className="size-6 animate-spin text-neutral-400" />
              </div>
            ) : subscription ? (
              <div className="flex items-start gap-4">
                <div className="flex size-12 items-center justify-center rounded-full bg-neutral-100">
                  <SparklesIcon className="size-6 text-neutral-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-neutral-900">
                      {currentPlan?.name || subscription.planId}
                    </h3>
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 text-xs font-medium capitalize',
                        subscription.status === 'active'
                          ? 'bg-positive-50 text-positive-700'
                          : subscription.status === 'non_renewing'
                            ? 'bg-warning-50 text-warning-700'
                            : 'bg-neutral-100 text-neutral-600'
                      )}
                    >
                      {subscription.status === 'non_renewing'
                        ? 'Cancelling'
                        : subscription.status}
                    </span>
                  </div>
                  {currentPlan?.description && (
                    <p className="mt-1 text-sm text-neutral-500">
                      {currentPlan.description}
                    </p>
                  )}
                  {currentPlan && (
                    <div className="mt-4">
                      <p className="text-2xl font-bold text-neutral-900 tabular-nums">
                        {formatCurrency(currentPlan.price, currentPlan.currencyCode)}
                      </p>
                      <p className="text-xs text-neutral-500">
                        per {currentPlan.periodUnit}
                      </p>
                    </div>
                  )}
                  {subscription.status === 'non_renewing' && subscription.currentTermEnd && (
                    <p className="mt-4 text-sm text-warning-600">
                      Your subscription will end on {formatDate(subscription.currentTermEnd)}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-neutral-500">No active subscription</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="border border-neutral-200">
          <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-6 py-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                Payment Methods
              </h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                Manage your payment methods
              </p>
            </div>
            <Dialog open={addPaymentOpen} onOpenChange={setAddPaymentOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="secondary"
                  className="h-8 rounded-none border-neutral-300 px-4 text-xs font-medium"
                >
                  <PlusIcon className="mr-1.5 size-3.5" />
                  Add Payment Method
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md rounded-none">
                <DialogHeader>
                  <DialogTitle className="text-sm font-semibold text-neutral-900">
                    Add Payment Method
                  </DialogTitle>
                  <DialogDescription className="text-xs text-neutral-500">
                    Enter your card details below
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddPayment} className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-700">
                      Card Number
                    </label>
                    <Input
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="1234 5678 9012 3456"
                      className="h-10 rounded-none border-neutral-200"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-neutral-700">
                        Month
                      </label>
                      <Input
                        value={expiryMonth}
                        onChange={(e) => setExpiryMonth(e.target.value)}
                        placeholder="MM"
                        maxLength={2}
                        className="h-10 rounded-none border-neutral-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-neutral-700">
                        Year
                      </label>
                      <Input
                        value={expiryYear}
                        onChange={(e) => setExpiryYear(e.target.value)}
                        placeholder="YY"
                        maxLength={2}
                        className="h-10 rounded-none border-neutral-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-neutral-700">
                        CVC
                      </label>
                      <Input
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        placeholder="123"
                        maxLength={4}
                        className="h-10 rounded-none border-neutral-200"
                      />
                    </div>
                  </div>
                  <DialogFooter className="mt-6">
                    <DialogClose asChild>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-8 rounded-none border-neutral-300 px-4 text-xs font-medium"
                      >
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button
                      type="submit"
                      disabled={isTokenizing || addPaymentMethodMutation.isPending}
                      className="h-8 rounded-none bg-brand-500 px-4 text-xs font-medium text-white hover:bg-brand-600"
                    >
                      {(isTokenizing || addPaymentMethodMutation.isPending) && (
                        <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
                      )}
                      Add Card
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="divide-y divide-neutral-100">
            {paymentMethodsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2Icon className="size-6 animate-spin text-neutral-400" />
              </div>
            ) : paymentMethods?.length === 0 ? (
              <div className="py-8 text-center text-sm text-neutral-500">
                No payment methods on file
              </div>
            ) : (
              paymentMethods?.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div className="flex items-center gap-4">
                    <CreditCardIcon className="size-5 text-neutral-500" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-neutral-900 capitalize">
                          {method.cardBrand || method.type}
                        </span>
                        {method.cardLast4 && (
                          <span className="font-mono text-sm text-neutral-600">
                            •••• {method.cardLast4}
                          </span>
                        )}
                        {method.isDefault && (
                          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
                            Default
                          </span>
                        )}
                      </div>
                      {method.cardExpiryMonth && method.cardExpiryYear && (
                        <p className="text-xs text-neutral-500">
                          Expires {method.cardExpiryMonth}/{method.cardExpiryYear}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!method.isDefault && (
                      <Button
                        variant="secondary"
                        onClick={() =>
                          setDefaultPaymentMethodMutation.mutate({ id: method.id })
                        }
                        disabled={setDefaultPaymentMethodMutation.isPending}
                        className="h-7 rounded-none border-neutral-200 px-3 text-xs"
                      >
                        Set as Default
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        removePaymentMethodMutation.mutate({ id: method.id })
                      }
                      disabled={removePaymentMethodMutation.isPending}
                      className="flex size-7 items-center justify-center text-neutral-400 hover:bg-neutral-100 hover:text-negative-600"
                    >
                      <Trash2Icon className="size-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Invoice History */}
        <div className="border border-neutral-200">
          <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
            <h2 className="text-sm font-semibold text-neutral-900">
              Invoice History
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Download past invoices for your records
            </p>
          </div>
          {invoicesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2Icon className="size-6 animate-spin text-neutral-400" />
            </div>
          ) : invoices?.length === 0 ? (
            <div className="py-8 text-center text-sm text-neutral-500">
              No invoices yet
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs">
                  <th className="px-6 py-3 font-medium text-neutral-500">
                    Invoice
                  </th>
                  <th className="px-6 py-3 font-medium text-neutral-500">Date</th>
                  <th className="px-6 py-3 font-medium text-neutral-500">
                    Amount
                  </th>
                  <th className="px-6 py-3 font-medium text-neutral-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-neutral-500">
                    Download
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {invoices?.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-3 font-medium text-neutral-900">
                      {invoice.number || invoice.id}
                    </td>
                    <td className="px-6 py-3 text-neutral-600">
                      {formatDate(invoice.date)}
                    </td>
                    <td className="px-6 py-3 text-neutral-900 tabular-nums">
                      {formatCurrency(invoice.total, invoice.currencyCode)}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={cn(
                          'inline-block rounded px-2 py-0.5 text-xs font-medium capitalize',
                          getStatusStyles(invoice.status)
                        )}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      {invoice.downloadUrl && (
                        <a
                          href={invoice.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900"
                        >
                          <DownloadIcon className="size-3.5" />
                          PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Cancel Subscription */}
        {subscription && subscription.status === 'active' && (
          <div className="border border-neutral-200 bg-neutral-50 p-6">
            <h3 className="text-sm font-medium text-neutral-900">
              Cancel Subscription
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              Your subscription will remain active until the end of your current
              billing period.
            </p>
            <Button
              variant="secondary"
              onClick={() => cancelSubscriptionMutation.mutate()}
              disabled={cancelSubscriptionMutation.isPending}
              className="mt-4 h-8 rounded-none border-negative-300 px-4 text-xs font-medium text-negative-600 hover:bg-negative-50"
            >
              {cancelSubscriptionMutation.isPending && (
                <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
              )}
              Cancel Subscription
            </Button>
          </div>
        )}
      </div>
    </SettingsLayout>
  );
};

// Wrap with ChargebeeProvider
export const PageSettingsBilling = () => {
  return (
    <ChargebeeProvider>
      <BillingPageContent />
    </ChargebeeProvider>
  );
};
```

**Step 2: Verify types**

```bash
pnpm tsc --noEmit
```

Expected: No type errors (may need to fix any import issues)

**Step 3: Commit**

```bash
git add src/features/settings/page-settings-billing.tsx
git commit -m "feat(billing): update billing page to use Chargebee data"
```

---

## Task 12: Configure Environment and Test

**Files:**
- Create/Modify: `.env.local` (not committed)

**Step 1: Add environment variables to .env.local**

```bash
# Chargebee Billing
ENABLE_CHARGEBEE_BILLING=true
CHARGEBEE_SITE=your-site-name
CHARGEBEE_API_KEY=test_k6OpXcLQSdcuksedd0mnLxAf26vv5Qz5Y
CHARGEBEE_WEBHOOK_SECRET=

VITE_ENABLE_CHARGEBEE_BILLING=true
VITE_CHARGEBEE_SITE=your-site-name
VITE_CHARGEBEE_PUBLISHABLE_KEY=your-publishable-key
```

**Step 2: Run database migration**

```bash
pnpm prisma migrate dev
```

**Step 3: Start the development server**

```bash
pnpm dev
```

**Step 4: Test the billing page**

1. Navigate to `/settings/billing`
2. Verify plans load from Chargebee
3. Test adding a payment method (use Chargebee test cards)
4. Test viewing invoices

**Step 5: No commit** (environment files are not committed)

---

## Summary

This implementation plan covers:

1. **Task 1-2**: Dependencies and environment setup
2. **Task 3**: Database schema with Organization model
3. **Task 4-6**: Server-side Chargebee client and billing router
4. **Task 7**: Webhook endpoint for real-time sync
5. **Task 8**: Client-side Chargebee.js provider
6. **Task 9-10**: Feature flag in navigation and route guard
7. **Task 11**: Updated billing page with real data
8. **Task 12**: Configuration and testing

Each task is designed to be completed in 5-15 minutes with clear verification steps.
