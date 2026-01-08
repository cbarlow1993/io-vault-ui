import { z } from 'zod';

// ==================== Shared Schemas ====================

/**
 * Token address schema: either 'native' or 0x followed by 40 hex chars
 */
export const tokenAddressSchema = z
  .string()
  .regex(
    /^(native|0x[a-fA-F0-9]{40})$/,
    'Invalid token address format. Must be "native" or a valid Ethereum address (0x followed by 40 hex characters).'
  );

// ==================== Path Parameter Schemas ====================

/**
 * Path params for single token spam override routes
 */
export const spamOverrideParamsSchema = z.object({
  addressId: z.uuid(),
  tokenAddress: tokenAddressSchema,
});

/**
 * Path params for bulk spam override route
 */
export const bulkSpamOverrideParamsSchema = z.object({
  addressId: z.uuid(),
});

// ==================== Request Body Schemas ====================

/**
 * Request body for setting a spam override
 */
export const spamOverrideBodySchema = z.object({
  override: z.enum(['trusted', 'spam']),
});

/**
 * Single override item in bulk request
 */
export const bulkOverrideItemSchema = z.object({
  tokenAddress: tokenAddressSchema,
  override: z.enum(['trusted', 'spam']),
});

/**
 * Request body for bulk spam override
 */
export const bulkSpamOverrideBodySchema = z.object({
  overrides: z.array(bulkOverrideItemSchema).min(1).max(100),
});

// ==================== Error Response Schemas ====================

/**
 * Standard error response schema for 400 Bad Request
 */
export const badRequestErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.array(z.object({
    code: z.string(),
    message: z.string(),
    path: z.array(z.union([z.string(), z.number()])),
  })).optional(),
});

/**
 * Standard error response schema for 404 Not Found
 */
export const notFoundErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
});

// ==================== Response Schemas ====================

/**
 * Response for spam override update
 */
export const spamOverrideResponseSchema = z.object({
  tokenAddress: z.string(),
  userOverride: z.enum(['trusted', 'spam']).nullable(),
  updatedAt: z.string(),
});

/**
 * Response for bulk spam override update
 */
export const bulkSpamOverrideResponseSchema = z.object({
  updated: z.array(spamOverrideResponseSchema),
});

// ==================== Type Exports ====================

export type SpamOverrideParams = z.infer<typeof spamOverrideParamsSchema>;
export type BulkSpamOverrideParams = z.infer<typeof bulkSpamOverrideParamsSchema>;
export type SpamOverrideBody = z.infer<typeof spamOverrideBodySchema>;
export type BulkOverrideItem = z.infer<typeof bulkOverrideItemSchema>;
export type BulkSpamOverrideBody = z.infer<typeof bulkSpamOverrideBodySchema>;
export type SpamOverrideResponse = z.infer<typeof spamOverrideResponseSchema>;
export type BulkSpamOverrideResponse = z.infer<typeof bulkSpamOverrideResponseSchema>;
