import { z } from 'zod';

// Enums
export const zVaultStatus = z.enum(['active', 'pending', 'revoked']);
export const zCurveType = z.enum(['ECDSA', 'EdDSA']);
export const zDeviceType = z.enum(['server', 'ios', 'android']);

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

// Type exports
export type Vault = z.infer<typeof zVault>;
export type VaultCurve = z.infer<typeof zVaultCurve>;
export type VaultSigner = z.infer<typeof zVaultSigner>;
export type VaultStatus = z.infer<typeof zVaultStatus>;
export type CurveType = z.infer<typeof zCurveType>;
export type DeviceType = z.infer<typeof zDeviceType>;
export type VaultListResponse = z.infer<typeof zVaultListResponse>;
export type VaultListParams = z.infer<typeof zVaultListParams>;
