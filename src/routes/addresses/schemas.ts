import { EcoSystem } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { z } from 'zod';
import { vaultIdSchema } from '@/src/lib/schemas/common.js';
import { supportedChains } from '@/src/lib/chains.js';
import {
  simpleDerivationPathSchema,
  structuredDerivationPathSchema,
} from '@/src/lib/schemas/derivation-path.js';
import {
  cursorPaginationQuerySchema,
  paginationInfoSchema,
} from '@/src/lib/schemas/pagination-schema.js';

// ==================== Path Parameter Schemas ====================

/**
 * Schema for vault ID path parameter
 */
export const vaultIdParamsSchema = z.object({
  vaultId: vaultIdSchema,
});

/**
 * Schema for routes with ecosystem and chainAlias path parameters
 */
export const addressPathParamsSchema = z.object({
  vaultId: vaultIdSchema,
  ecosystem: z.enum(EcoSystem),
  chainAlias: supportedChains,
});

/**
 * Schema for routes with full address path (includes address string)
 */
export const fullAddressParamsSchema = z.object({
  vaultId: vaultIdSchema,
  ecosystem: z.enum(EcoSystem),
  chainAlias: supportedChains,
  address: z.string(),
});

// ==================== Query Parameter Schemas ====================

/**
 * Helper to parse boolean query string
 */
const booleanQueryString = z
  .enum(['true', 'false'])
  .transform((s) => s === 'true')
  .optional();

/**
 * Schema for list addresses query parameters.
 * Uses cursor-based pagination as per requirements.
 *
 * @see docs/requirements/common/001-cursor-pagination.md
 * @see docs/requirements/api-addresses/002-list-vault-addresses.md
 * @see docs/requirements/api-addresses/003-list-chain-addresses.md
 */
export const listAddressesQuerySchema = cursorPaginationQuerySchema.extend({
  /** Filter by monitoring status */
  monitored: booleanQueryString,
});

// ==================== Request Body Schemas ====================

/**
 * Schema for creating an address
 */
export const createAddressBodySchema = z.object({
  address: z.string().min(1),
  derivationPath: simpleDerivationPathSchema.nullish(),
  monitor: z.boolean().optional().default(false),
  alias: z.string().nullish(),
});

/**
 * Schema for generating an address from vault curves
 * The address is generated automatically - only chainAlias is required
 */
export const generateAddressBodySchema = z.object({
  chainAlias: supportedChains,
  derivationPath: simpleDerivationPathSchema.nullish(),
  monitor: z.boolean().optional().default(false),
  alias: z.string().nullish(),
});

/**
 * Schema for updating an address
 */
export const updateAddressBodySchema = z.object({
  addToHiddenAssets: z.array(z.string()).optional(),
  removeFromHiddenAssets: z.array(z.string()).optional(),
  alias: z.string().nullish(),
});

// ==================== Response Schemas ====================

/**
 * Token schema for address tokens
 */
export const tokenSchema = z.object({
  contractAddress: z.string(),
  symbol: z.string(),
  decimals: z.number().optional(),
  hidden: z.boolean().optional(),
});

/**
 * Schema for a single address response
 */
export const addressResponseSchema = z
  .object({
    address: z.string(),
    chainAlias: z.string(),
    vaultId: vaultIdSchema,
    workspaceId: z.string(),
    derivationPath: simpleDerivationPathSchema.nullish(),
    subscriptionId: z.string().nullable(),
    monitored: z.boolean(),
    monitoredAt: z.iso.datetime({ offset: true }).optional(),
    unmonitoredAt: z.iso.datetime({ offset: true }).optional(),
    updatedAt: z.iso.datetime(),
    tokens: z.array(tokenSchema),
    alias: z.string().nullable(),
    lastReconciledBlock: z.number().nullable(),
  })
  .passthrough();

/**
 * Schema for paginated address list response.
 * Uses cursor-based pagination as per requirements documents.
 *
 * @see docs/requirements/api-addresses/002-list-vault-addresses.md
 */
export const addressListResponseSchema = z.object({
  data: z.array(addressResponseSchema),
  pagination: paginationInfoSchema,
});

// ==================== HD Address Schemas ====================

const MAX_HD_ADDRESSES = 100;
const MAX_INDEX = 0x7fffffff; // 2^31 - 1

/**
 * Schema for creating an HD address
 */
export const createHDAddressBodySchema = z.object({
  derivationPath: structuredDerivationPathSchema.optional(),
});

/**
 * Schema for bulk creating HD addresses
 */
export const bulkCreateHDAddressBodySchema = z
  .object({
    indexFrom: z
      .number()
      .int()
      .nonnegative()
      .refine((n) => n <= MAX_INDEX, {
        message: `indexFrom must be between 0 and ${MAX_INDEX}`,
      }),
    indexTo: z
      .number()
      .int()
      .nonnegative()
      .refine((n) => n <= MAX_INDEX, {
        message: `indexTo must be between 0 and ${MAX_INDEX}`,
      }),
  })
  .refine((data) => data.indexTo >= data.indexFrom, {
    message: 'indexTo must be greater than or equal to indexFrom',
    path: ['indexTo'],
  })
  .refine((data) => data.indexTo - data.indexFrom < MAX_HD_ADDRESSES, {
    message: `Cannot create more than ${MAX_HD_ADDRESSES} HD addresses at once`,
    path: ['indexTo'],
  });

/**
 * Schema for HD address response
 */
export const hdAddressResponseSchema = z.object({
  address: z.string(),
  chainAlias: supportedChains,
  vaultId: vaultIdSchema,
  derivationPath: structuredDerivationPathSchema.nullish(),
  ecosystem: z.enum(EcoSystem),
});

/**
 * Schema for bulk HD address response
 */
export const bulkHDAddressResponseSchema = z.object({
  data: z.array(hdAddressResponseSchema),
});

// ==================== Type Exports ====================

export type VaultIdParams = z.infer<typeof vaultIdParamsSchema>;
export type AddressPathParams = z.infer<typeof addressPathParamsSchema>;
export type FullAddressParams = z.infer<typeof fullAddressParamsSchema>;
export type ListAddressesQuery = z.infer<typeof listAddressesQuerySchema>;
export type CreateAddressBody = z.infer<typeof createAddressBodySchema>;
export type GenerateAddressBody = z.infer<typeof generateAddressBodySchema>;
export type UpdateAddressBody = z.infer<typeof updateAddressBodySchema>;
export type AddressResponse = z.infer<typeof addressResponseSchema>;
export type AddressListResponse = z.infer<typeof addressListResponseSchema>;
export type CreateHDAddressBody = z.infer<typeof createHDAddressBodySchema>;
export type BulkCreateHDAddressBody = z.infer<typeof bulkCreateHDAddressBodySchema>;
export type HDAddressResponse = z.infer<typeof hdAddressResponseSchema>;
export type BulkHDAddressResponse = z.infer<typeof bulkHDAddressResponseSchema>;
