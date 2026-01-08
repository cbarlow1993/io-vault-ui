import { vaultIdSchema } from '@/src/lib/schemas/common.js';
import { z } from 'zod';

/**
 * Base address schema with common fields
 */
export const addressBaseSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  vaultId: vaultIdSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
  ttl: z.number().optional(),
});

/**
 * Schema for address creation
 */
export const createAddressSchema = addressBaseSchema.extend({
  address: z.string().min(1, 'Address is required'),
  chain: z.string().min(1, 'Chain is required'),
});

/**
 * Schema for address update
 * Address and chain are not included as they come from the path parameters
 */
export const updateAddressSchema = addressBaseSchema;

/**
 * Schema for path parameters when fetching a single address
 */
export const addressPathParamsSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  chain: z.string().min(1, 'Chain is required'),
});

/**
 * Schema for organization and workspace parameters
 */
export const orgWorkspaceParamsSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  workspaceId: z.string().min(1, 'Workspace ID is required'),
});

/**
 * Schema for vault parameters
 */
export const vaultParamsSchema = z.object({
  vaultId: vaultIdSchema,
});

/**
 * Type for validated create address input
 */
export type CreateAddressInput = z.infer<typeof createAddressSchema>;

/**
 * Type for validated update address input
 */
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
