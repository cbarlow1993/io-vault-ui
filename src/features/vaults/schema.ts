import { z } from 'zod';

// Enums
export const zVaultStatus = z.enum(['active', 'draft', 'archived']);
export const zCurveType = z.enum(['ECDSA', 'EdDSA']);
export const zDeviceType = z.enum(['virtual', 'ios', 'android']);

// Curve structure for UI display
export const zVaultCurve = z.object({
  type: zCurveType,
  curve: z.string(),
  publicKey: z.string(),
  fingerprint: z.string(),
});

// Embedded signer (simplified for list view)
export const zVaultSigner = z.object({
  id: z.string(),
  name: z.string(),
  owner: z.string(),
  deviceType: zDeviceType,
  votingPower: z.number(),
});

// Main vault type
export const zVault = z.object({
  id: z.string(),
  name: z.string(),
  curves: z.array(zVaultCurve),
  threshold: z.number(),
  signers: z.array(zVaultSigner),
  status: zVaultStatus,
  createdAt: z.string(),
  createdBy: z.string(),
  lastUsed: z.string().nullable(),
  signatureCount: z.number(),
});

// Paginated list response
export const zVaultListResponse = z.object({
  data: z.array(zVault),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

// Query parameters for list endpoint
export const zVaultListParams = z.object({
  limit: z.number().optional(),
  cursor: z.string().optional(),
  status: zVaultStatus.optional(),
  search: z.string().optional(),
});

// Get vault by ID params
export const zGetVaultParams = z.object({
  id: z.string(),
});

// Create vault input
export const zCreateVaultInput = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullable().optional(),
  threshold: z.number().min(1, 'Threshold must be at least 1'),
  signers: z
    .array(
      z.object({
        key: z.string(), // Signer ID
        weight: z.number().min(1), // Voting power
      })
    )
    .min(1, 'At least one signer is required'),
});

// Create vault response (same as vault but from API)
export const zCreateVaultResponse = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  threshold: z.number(),
  status: z.enum(['draft', 'active', 'archived']),
  reshareNonce: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
});

// Create reshare input (for edit/reshare mode)
export const zCreateReshareInput = z.object({
  vaultId: z.string(),
  threshold: z.number().min(1, 'Threshold must be at least 1'),
  signers: z
    .array(
      z.object({
        signerKey: z.string(), // Signer ID
        signingPower: z.number().min(1), // Voting power
      })
    )
    .min(1, 'At least one signer is required'),
  expiresAt: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
});

// Create reshare response
export const zCreateReshareResponse = z.object({
  id: z.string(),
  vaultId: z.string(),
  threshold: z.number(),
  status: z.enum([
    'voting',
    'completed',
    'failed',
    'expired',
    'signing',
    'rejected',
  ]),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
  expiresAt: z.string(),
  memo: z.string().nullable().optional(),
});

// Type exports
export type Vault = z.infer<typeof zVault>;
export type VaultCurve = z.infer<typeof zVaultCurve>;
export type VaultSigner = z.infer<typeof zVaultSigner>;
export type VaultStatus = z.infer<typeof zVaultStatus>;
export type CreateVaultInput = z.infer<typeof zCreateVaultInput>;
export type CreateVaultResponse = z.infer<typeof zCreateVaultResponse>;
export type CreateReshareInput = z.infer<typeof zCreateReshareInput>;
export type CreateReshareResponse = z.infer<typeof zCreateReshareResponse>;
export type CurveType = z.infer<typeof zCurveType>;
export type DeviceType = z.infer<typeof zDeviceType>;
export type VaultListResponse = z.infer<typeof zVaultListResponse>;
export type VaultListParams = z.infer<typeof zVaultListParams>;
