import { z } from 'zod';

// ==================== Pagination Constants ====================

/**
 * Default pagination limits as per requirements documents.
 * @see docs/requirements/common/001-cursor-pagination.md
 */
export const PAGINATION_DEFAULTS = {
  /** Default number of items per page */
  DEFAULT_LIMIT: 20,
  /** Maximum items per page for most endpoints */
  MAX_LIMIT: 100,
  /** Maximum items per page for token balances endpoint */
  MAX_LIMIT_TOKENS: 20,
} as const;

// ==================== Cursor-Based Pagination Schema ====================

/**
 * Creates a limit schema with configurable max.
 * Transforms string to number and validates range.
 */
const createLimitSchema = (maxLimit: number) =>
  z.coerce
    .number()
    .int()
    .min(1, { message: 'limit must be at least 1' })
    .max(maxLimit, { message: `limit must be at most ${maxLimit}` })
    .optional()
    .default(PAGINATION_DEFAULTS.DEFAULT_LIMIT);

/**
 * Standard cursor-based pagination schema as per requirements documents.
 *
 * @see docs/requirements/common/001-cursor-pagination.md
 * @example Query: ?cursor=abc123&limit=50
 *
 * Use this schema for all list endpoints:
 * - Address listing
 * - Transaction listing
 */
export const cursorPaginationQuerySchema = z.object({
  /** Opaque cursor for retrieving next page of results */
  cursor: z.string().optional(),
  /** Maximum number of items to return (default: 20, max: 100) */
  limit: createLimitSchema(PAGINATION_DEFAULTS.MAX_LIMIT),
});

/**
 * Cursor-based pagination schema with higher limit for token endpoints.
 * @see docs/requirements/api-balances/002-get-token-balances.md
 */
export const cursorPaginationTokensQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: createLimitSchema(PAGINATION_DEFAULTS.MAX_LIMIT_TOKENS),
});

export type CursorPaginationQuery = z.infer<typeof cursorPaginationQuerySchema>;
export type CursorPaginationTokensQuery = z.infer<typeof cursorPaginationTokensQuerySchema>;

// ==================== Pagination Response Schema ====================

/**
 * Standard pagination response metadata as per requirements documents.
 */
export const paginationInfoSchema = z.object({
  /** Cursor for fetching the next page (null if no more results) */
  nextCursor: z.string().nullable(),
  /** Whether more results are available */
  hasMore: z.boolean(),
  /** Total count of items (optional, may be expensive to compute) */
  total: z.number().optional(),
});

export type PaginationInfo = z.infer<typeof paginationInfoSchema>;

// ==================== Legacy Schemas (Deprecated) ====================

/**
 * @deprecated Use cursorPaginationQuerySchema instead.
 * Kept for backward compatibility during migration.
 */
const positiveIntString = z
  .string()
  .regex(/^\d+$/, { message: 'Must be a positive integer' })
  .transform((val: string) => Number.parseInt(val, 10))
  .refine((val: number) => val > 0, { message: 'Must be greater than 0' })
  .refine((val: number) => val <= 1000, { message: 'Must be at most 1000' });

/**
 * @deprecated Use cursorPaginationQuerySchema instead.
 */
export const queryStringPaginationBaseSchema = z.object({
  first: z.string().optional().nullable(),
  last: z.string().optional().nullable(),
  before: z.string().optional().nullable(),
  after: z.string().optional().nullable(),
});

/**
 * @deprecated Use cursorPaginationQuerySchema instead.
 */
export const queryStringPaginationObjectSchema = z.object({
  first: positiveIntString.optional().nullable(),
  last: positiveIntString.optional().nullable(),
  before: z.string().optional().nullable(),
  after: z.string().optional().nullable(),
});

/**
 * @deprecated Use cursorPaginationQuerySchema instead.
 * Validates cursor pagination parameters for relay-style pagination.
 */
export const paginationCursorValidation = (
  data: { first?: number | null; last?: number | null; after?: string | null; before?: string | null },
  ctx: z.RefinementCtx
) => {
  // Cannot use both first and last
  if (data.first && data.last) {
    ctx.addIssue({
      code: 'custom' as const,
      message: 'Cannot use both first and last',
      path: ['first'],
    });
  }

  // Cannot use both after and before
  if (data.after && data.before) {
    ctx.addIssue({
      code: 'custom' as const,
      message: 'Cannot use both after and before',
      path: ['after'],
    });
  }

  // after requires first
  if (data.after && !data.first) {
    ctx.addIssue({
      code: 'custom' as const,
      message: 'first is required when using after',
      path: ['first'],
    });
  }

  // before requires last
  if (data.before && !data.last) {
    ctx.addIssue({
      code: 'custom' as const,
      message: 'last is required when using before',
      path: ['last'],
    });
  }
};

/**
 * @deprecated Use cursorPaginationQuerySchema instead.
 * Note: Using superRefine as it's still supported in Zod v4 (though deprecated).
 * This is legacy code that will be removed with the rest of the relay-style pagination.
 */
export const queryStringPaginationSchema = queryStringPaginationObjectSchema.superRefine(
  paginationCursorValidation
);

export type PaginationQueryParams = z.infer<typeof queryStringPaginationSchema>;

/**
 * @deprecated Use paginationInfoSchema instead.
 */
export const pageInfoSchema = z.object({
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
  startCursor: z.string().optional().nullable(),
  endCursor: z.string().optional().nullable(),
});

export type PageInfo = z.infer<typeof pageInfoSchema>;
