import { EcoSystem } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { z } from 'zod';
import { ChainFeatures, supportedChains } from '@/src/lib/chains.js';
import { isChainFeatureActive } from '@/src/lib/isChainFeatureActive.js';
import {
  cursorPaginationTokensQuerySchema,
  paginationInfoSchema,
} from '@/src/lib/schemas/pagination-schema.js';

// ==================== Path Parameter Schemas ====================


/**
 * Base path params for balance routes (ecosystem, chainAlias, address)
 */
export const balancePathParamsSchema = z.object({
  ecosystem: z.enum(EcoSystem),
  chainAlias: supportedChains,
  address: z.string().min(1),
});

/**
 * Path params for token balances with chainAlias feature validation
 */
export const tokenBalancePathParamsSchema = z.object({
  ecosystem: z.enum(EcoSystem),
  chainAlias: supportedChains.refine(
    (chainAlias) => isChainFeatureActive({ chainAlias, feature: ChainFeatures.TOKEN_BALANCES }),
    {
      message: 'Token balances are not supported for this chain',
      path: ['chainAlias'],
    }
  ),
  address: z.string().min(1),
});

// ==================== Query Parameter Schemas ====================

/**
 * Query params for token balances.
 * Uses cursor-based pagination with limit (20) for token endpoints.
 *
 * @see docs/requirements/common/001-cursor-pagination.md
 * @see docs/requirements/api-balances/002-get-token-balances.md
 */
export const tokenBalanceQuerySchema = cursorPaginationTokensQuerySchema.extend({
  showHiddenTokens: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .transform((v) => (typeof v === 'string' ? v === 'true' : v))
    .optional()
    .default(false),
  showSpam: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .transform((v) => (typeof v === 'string' ? v === 'true' : v))
    .optional()
    .default(false),
  sortBy: z.enum(['balance', 'usdValue', 'symbol']).optional().default('usdValue'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ==================== Response Schemas ====================

/**
 * Native balance response schema
 */
export const nativeBalanceResponseSchema = z.object({
  balance: z.string(),
  symbol: z.string(),
  name: z.string().nullable(),
  logo: z.string().nullable(),
  usdValue: z.string().nullable(),
  lastUpdated: z.string(),
});

/**
 * Single token balance response schema
 */
export const tokenBalanceItemSchema = z.object({
  address: z.string(),
  balance: z.string(),
  symbol: z.string(),
  decimals: z.number(),
  name: z.string().nullable(),
  logo: z.string().nullable(),
  usdValue: z.string().nullable(),
  // Spam-related fields
  isSpam: z.boolean(),
  userSpamOverride: z.enum(['trusted', 'spam']).nullable(),
  effectiveSpamStatus: z.enum(['spam', 'trusted', 'unknown']),
});

/**
 * Token balances list response schema.
 * Uses standardized cursor-based pagination format.
 *
 * @see docs/requirements/common/001-cursor-pagination.md
 * @see docs/requirements/api-balances/002-get-token-balances.md
 */
export const tokenBalancesResponseSchema = z.object({
  data: z.array(tokenBalanceItemSchema),
  lastUpdated: z.string(),
  pagination: paginationInfoSchema,
});

/**
 * Balance item for address ID based balance response
 */
export const balanceByAddressIdItemSchema = z.object({
  tokenAddress: z.string().nullable(),
  symbol: z.string(),
  name: z.string(),
  decimals: z.number(),
  balance: z.string(),
  rawBalance: z.string(),
  usdPrice: z.number().nullable(),
  usdValue: z.number().nullable(),
  priceChange24h: z.number().nullable(),
  logoUri: z.string().nullable(),
  isNative: z.boolean(),
});

/**
 * Response schema for balances by address ID
 */
export const balancesByAddressIdResponseSchema = z.object({
  data: z.array(balanceByAddressIdItemSchema),
  lastUpdated: z.string(),
});

// ==================== Type Exports ====================

export type BalancePathParams = z.infer<typeof balancePathParamsSchema>;
export type TokenBalancePathParams = z.infer<typeof tokenBalancePathParamsSchema>;
export type TokenBalanceQuery = z.infer<typeof tokenBalanceQuerySchema>;
export type NativeBalanceResponse = z.infer<typeof nativeBalanceResponseSchema>;
export type TokenBalanceItem = z.infer<typeof tokenBalanceItemSchema>;
export type TokenBalancesResponse = z.infer<typeof tokenBalancesResponseSchema>;
export type BalanceByAddressIdItem = z.infer<typeof balanceByAddressIdItemSchema>;
export type BalancesByAddressIdResponse = z.infer<typeof balancesByAddressIdResponseSchema>;
