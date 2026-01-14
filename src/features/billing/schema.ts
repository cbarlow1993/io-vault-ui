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

// Item Price (pricing variant) from Chargebee
export const zItemPrice = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  period: z.number(),
  periodUnit: z.enum(['day', 'week', 'month', 'year']),
  currencyCode: z.string(),
});

export type ItemPrice = z.infer<typeof zItemPrice>;

// Plan (Item) from Chargebee with its pricing options
export const zPlan = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  // Features list - populated from Chargebee metadata
  features: z.array(z.string()).optional(),
  // Highlight this plan (e.g., "Most Popular")
  badge: z.string().optional(),
  // Pricing variants (weekly, monthly, yearly, etc.)
  prices: z.array(zItemPrice),
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
  status: z.enum([
    'paid',
    'posted',
    'payment_due',
    'not_paid',
    'voided',
    'pending',
  ]),
  date: z.string(),
  total: z.number(),
  currencyCode: z.string(),
  downloadUrl: z.string().optional(),
});

export type Invoice = z.infer<typeof zInvoice>;

// Entitlement from subscription
export const zEntitlement = z.object({
  featureId: z.string(),
  featureName: z.string(),
  value: z.string(),
  // Numeric quantity if the value is a number
  quantity: z.number().optional(),
  // Unit for the value (e.g., "users", "GB", etc.)
  unit: z.string().optional(),
});

export type Entitlement = z.infer<typeof zEntitlement>;

// Input schemas for mutations
export const zAddPaymentMethodInput = z.object({
  token: z.string(), // Chargebee.js tokenized card
});

export const zUpdateSubscriptionInput = z.object({
  planId: z.string(),
});
