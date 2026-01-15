import { z } from 'zod';

// ==================== Request Body Schemas ====================

/**
 * Schema for a single curve in the create vault request
 * Matches SDK type: { algorithm, curve, publicKey, xpub? }
 */
export const curveInputSchema = z.object({
  algorithm: z.string().min(1, 'algorithm is required'),
  curve: z.enum(['secp256k1', 'ed25519']),
  publicKey: z.string().min(1, 'publicKey is required'),
  xpub: z.string().optional(),
});

/**
 * Schema for creating a vault with curves.
 * Note: Domain validation (min curves, no duplicates) is in the Vault entity.
 */
export const createVaultBodySchema = z.object({
  id: z.string().min(1, 'id is required'),
  workspaceId: z.string().min(1, 'workspaceId is required'),
  curves: z.array(curveInputSchema),
});

// ==================== Response Schemas ====================

/**
 * Schema for a curve in the response
 */
export const curveResponseSchema = z.object({
  id: z.string().uuid(),
  algorithm: z.string(),
  curve: z.enum(['secp256k1', 'ed25519']),
  publicKey: z.string(),
  xpub: z.string().nullable(),
  createdAt: z.string().datetime(),
});

/**
 * Schema for the create vault response
 */
export const createVaultResponseSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  organisationId: z.string(),
  createdAt: z.string().datetime(),
  curves: z.array(curveResponseSchema),
});

// ==================== Type Exports ====================

export type CurveInput = z.infer<typeof curveInputSchema>;
export type CreateVaultBody = z.infer<typeof createVaultBodySchema>;
export type CurveResponse = z.infer<typeof curveResponseSchema>;
export type CreateVaultResponse = z.infer<typeof createVaultResponseSchema>;
