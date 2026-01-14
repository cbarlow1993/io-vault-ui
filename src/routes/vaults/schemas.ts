import { z } from 'zod';

// ==================== Request Body Schemas ====================

/**
 * Schema for a single curve in the create vault request
 */
export const curveInputSchema = z.object({
  curveType: z.enum(['secp256k1', 'ed25519']),
  xpub: z.string().min(1, 'xpub is required'),
});

/**
 * Schema for creating a vault with curves.
 * Note: Domain validation (min curves, no duplicates) is in the Vault entity.
 */
export const createVaultBodySchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
  workspaceId: z.string().uuid('workspaceId must be a valid UUID'),
  curves: z.array(curveInputSchema),
});

// ==================== Response Schemas ====================

/**
 * Schema for a curve in the response
 */
export const curveResponseSchema = z.object({
  id: z.string().uuid(),
  curveType: z.enum(['secp256k1', 'ed25519']),
  xpub: z.string(),
  createdAt: z.string().datetime(),
});

/**
 * Schema for the create vault response
 */
export const createVaultResponseSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  organisationId: z.string().uuid(),
  createdAt: z.string().datetime(),
  curves: z.array(curveResponseSchema),
});

// ==================== Type Exports ====================

export type CurveInput = z.infer<typeof curveInputSchema>;
export type CreateVaultBody = z.infer<typeof createVaultBodySchema>;
export type CurveResponse = z.infer<typeof curveResponseSchema>;
export type CreateVaultResponse = z.infer<typeof createVaultResponseSchema>;
