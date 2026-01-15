import { z } from 'zod';

// Enums
export const zSignerType = z.enum(['ios', 'android', 'virtual']);
export const zSignerStatus = z.enum(['active', 'pending', 'revoked']);

// Signer configuration (for detail view)
export const zSignerConfig = z.object({
  publicKey: z.string(),
  supportedCurves: z.array(z.string()),
  apiEndpoint: z.string().optional(),
  autoApprove: z.boolean(),
  notificationsEnabled: z.boolean(),
  maxDailySignatures: z.number().optional(),
  allowedNetworks: z.array(z.string()),
  backupEnabled: z.boolean(),
  lastSyncAt: z.string(),
});

// Main signer type
export const zSigner = z.object({
  id: z.string(),
  name: z.string(),
  owner: z.string(),
  type: zSignerType,
  version: z.string(),
  status: zSignerStatus,
  registeredAt: z.string(),
  lastSeen: z.string().nullable(),
  deviceInfo: z.string().optional(),
  vaultsCount: z.number(),
  config: zSignerConfig,
});

// Paginated list response
export const zSignerListResponse = z.object({
  data: z.array(zSigner),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

// Query parameters for list endpoint
export const zSignerListParams = z.object({
  limit: z.number().optional(),
  cursor: z.string().optional(),
  status: zSignerStatus.optional(),
  type: zSignerType.optional(),
  search: z.string().optional(),
});

// Type exports
export type Signer = z.infer<typeof zSigner>;
export type SignerConfig = z.infer<typeof zSignerConfig>;
export type SignerType = z.infer<typeof zSignerType>;
export type SignerStatus = z.infer<typeof zSignerStatus>;
export type SignerListResponse = z.infer<typeof zSignerListResponse>;
export type SignerListParams = z.infer<typeof zSignerListParams>;
