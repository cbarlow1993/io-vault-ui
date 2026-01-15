# Chargebee Billing Integration Design

## Overview

Integrate Chargebee for organization-level billing, replacing the current mock billing UI with real subscription management, payment processing, and invoice handling.

## Requirements

- Full Chargebee API integration (not hosted portal)
- Organization-level billing (one subscription per org)
- Custom card inputs using Chargebee.js tokenization
- Webhooks + API calls for data sync
- Cache key subscription data locally, fetch invoices/payments live
- Chargebee as source of truth for plan definitions
- Feature-flagged behind `ENABLE_CHARGEBEE_BILLING`

## Environment Variables

### Server-side (`src/env/server.ts`)

| Variable | Description |
|----------|-------------|
| `ENABLE_CHARGEBEE_BILLING` | `'true'` \| `'false'` - feature switch |
| `CHARGEBEE_SITE` | Chargebee site name (e.g., `'mycompany'`) |
| `CHARGEBEE_API_KEY` | Chargebee API key (server-side only) |
| `CHARGEBEE_WEBHOOK_SECRET` | For validating webhook signatures |

### Client-side (`src/env/client.ts`)

| Variable | Description |
|----------|-------------|
| `VITE_ENABLE_CHARGEBEE_BILLING` | Mirror of server flag for UI |
| `VITE_CHARGEBEE_SITE` | Needed for Chargebee.js initialization |
| `VITE_CHARGEBEE_PUBLISHABLE_KEY` | Chargebee publishable key for JS SDK |

## Feature Flag Behavior

**When `ENABLE_CHARGEBEE_BILLING=false`:**
- Billing route redirects to `/settings/members`
- "Billing" removed from settings navigation
- No Chargebee.js loaded on client
- Webhook endpoint returns 200 but does nothing

**When `ENABLE_CHARGEBEE_BILLING=true`:**
- Full billing functionality available
- Chargebee.js loaded on billing page
- Webhooks processed normally

## Database Schema

Add to Organization model in `prisma/schema.prisma`:

```prisma
model Organization {
  // ... existing fields

  // Chargebee integration
  chargebeeCustomerId      String?   @unique
  chargebeeSubscriptionId  String?   @unique

  // Cached subscription data (updated via webhooks)
  subscriptionStatus       String?   // 'active', 'cancelled', 'past_due', etc.
  subscriptionPlanId       String?   // Chargebee plan ID
  subscriptionCurrentPeriodStart DateTime?
  subscriptionCurrentPeriodEnd   DateTime?
  subscriptionCancelledAt  DateTime?

  // Cached entitlements (updated via webhooks)
  entitlements             Json?     // { "feature-vaults": { "value": "10" }, ... }

  // Timestamps
  chargebeeSyncedAt        DateTime?
}
```

### What we cache locally
- `subscriptionStatus` - Gate features, show banners for past-due
- `subscriptionPlanId` - Determine feature limits without API call
- Period dates - Show "renews on X" without API call
- `entitlements` - Feature gating without API calls

### What we fetch live
- Payment methods (PCI considerations)
- Invoices (can be many, change status)
- Full plan details (pricing, features)

## Server API Layer

### File structure

```
src/server/
├── lib/
│   └── chargebee.ts           # Chargebee client initialization
├── routers/
│   └── billing.ts             # oRPC router for billing operations
└── webhooks/
    └── chargebee/
        └── handlers.ts        # Webhook event handlers
```

### Billing router procedures

| Procedure | Description |
|-----------|-------------|
| `getPlans` | Fetch all plans from Chargebee (cached with TTL) |
| `getSubscription` | Get current org subscription details |
| `getPaymentMethods` | List payment sources for org's customer |
| `addPaymentMethod` | Create payment source using Chargebee.js token |
| `removePaymentMethod` | Delete a payment source |
| `setDefaultPaymentMethod` | Update primary payment source |
| `getInvoices` | List invoices for org's customer |
| `downloadInvoice` | Get invoice PDF download URL |
| `createCheckout` | Generate hosted page URL for new subscription |
| `updateSubscription` | Change plan (upgrade/downgrade) |
| `cancelSubscription` | Schedule cancellation at period end |
| `reactivateSubscription` | Undo pending cancellation |

All procedures check `ENABLE_CHARGEBEE_BILLING` and throw if disabled.

## Webhooks

### Endpoint

```
POST /api/webhooks/chargebee
```

### Implementation
- Verify webhook signature using `CHARGEBEE_WEBHOOK_SECRET`
- Parse event type and route to handlers
- Return 200 quickly
- Idempotent - safe to receive same event multiple times

### Events to handle

| Event | Action |
|-------|--------|
| `customer_created` | Store `chargebeeCustomerId` on org |
| `subscription_created` | Cache subscription data + entitlements |
| `subscription_changed` | Update cached plan, status, period dates |
| `subscription_renewed` | Update period dates |
| `subscription_cancelled` | Set `subscriptionCancelledAt`, update status |
| `subscription_reactivated` | Clear cancellation, update status |
| `payment_failed` | Update status to `past_due` |
| `payment_succeeded` | Update status to `active` if was past_due |
| `entitlement_overrides_updated` | Refresh cached entitlements |
| `subscription_deleted` | Clear all cached billing data |

On subscription events, fetch current entitlements from Chargebee API and update the org's `entitlements` JSON field.

## Client-Side Chargebee.js

### File structure

```
src/lib/chargebee/
├── provider.tsx      # ChargebeeProvider context + initialization
├── use-chargebee.ts  # Hook to access Chargebee instance
└── index.ts          # Public exports
```

### Provider pattern

```tsx
// Wrap billing page only (lazy load)
<ChargebeeProvider site={envClient.VITE_CHARGEBEE_SITE}>
  <PageSettingsBilling />
</ChargebeeProvider>
```

### Card tokenization flow

1. User enters card details in custom inputs (using app's `Input` component)
2. On submit, call `chargebee.tokenize()` with card data
3. Receive temporary token from Chargebee
4. Send token to server (`addPaymentMethod` procedure)
5. Server creates payment source in Chargebee using token

Card inputs use existing app styling (`Input` component, `border-input` class).

## Billing Page UI Changes

### What stays the same
- Overall page layout and structure
- Visual design (cards, tables, dialogs)
- Styling using existing design system classes

### What changes

| Current (Mock) | New (Chargebee) |
|----------------|-----------------|
| Static `billingInfo` data | Live data from `getSubscription` query |
| Static `plans` array | Fetched via `getPlans` (cached) |
| Fake payment form | Real tokenization with Chargebee.js |
| Static invoice list | Live from `getInvoices` query |
| Toast-only actions | Real mutations + optimistic updates |

### UI additions
- Cancel subscription flow (confirmation dialog, cancel at period end)
- Reactivate button when cancellation is pending
- Past-due warning banner
- Skeleton loaders for async data
- Error handling with inline messages and toasts

## File Changes

### New files

```
src/server/lib/chargebee.ts                    # Chargebee client init
src/server/routers/billing.ts                  # Billing API procedures
src/server/webhooks/chargebee/handlers.ts      # Webhook event handlers
src/routes/api/webhooks/chargebee.ts           # Webhook endpoint
src/lib/chargebee/provider.tsx                 # ChargebeeProvider context
src/lib/chargebee/use-chargebee.ts             # Hook for tokenization
src/lib/chargebee/index.ts                     # Public exports
```

### Modified files

```
src/env/server.ts                              # Add Chargebee env vars
src/env/client.ts                              # Add client-side env vars
prisma/schema.prisma                           # Add billing fields to Organization
src/server/router.ts                           # Register billing router
src/features/settings/page-settings-billing.tsx # Replace mock with real data
src/features/settings/data/settings.ts         # Remove billing mock data
src/features/settings/components/settings-layout.tsx # Filter nav by flag
src/routes/_app/settings/billing.tsx           # Add route guard
```

### New dependency

```
chargebee-typescript
```

## Implementation Order

1. Environment variables + feature flag
2. Database schema + migration
3. Chargebee server client + billing router
4. Webhook endpoint + handlers
5. Client-side Chargebee.js provider
6. Update billing page UI
7. Navigation filtering
