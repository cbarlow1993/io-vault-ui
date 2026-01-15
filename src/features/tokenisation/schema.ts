import { z } from 'zod';

// Token status
export const zTokenStatus = z.enum(['active', 'paused', 'deprecated']);
export type TokenStatus = z.infer<typeof zTokenStatus>;

// Token standard
export const zTokenStandard = z.enum([
  'ERC-20',
  'ERC-721',
  'ERC-1155',
  'ERC-3643',
]);
export type TokenStandard = z.infer<typeof zTokenStandard>;

// Address status for whitelist/blocklist
export const zAddressStatus = z.enum(['whitelisted', 'blocked', 'pending']);
export type AddressStatus = z.infer<typeof zAddressStatus>;

// Token schema
export const zToken = z.object({
  id: z.string(),
  name: z.string(),
  symbol: z.string(),
  standard: zTokenStandard,
  status: zTokenStatus,
  contractAddress: z.string(),
  chainId: z.number(),
  chainName: z.string(),
  decimals: z.number(),
  totalSupply: z.string(),
  circulatingSupply: z.string(),
  holdersCount: z.number(),
  transfersCount: z.number(),
  deployedAt: z.string(),
  deployedBy: z.string(),
  isPaused: z.boolean(),
  isTransferable: z.boolean(),
  hasWhitelist: z.boolean(),
  hasBlocklist: z.boolean(),
});
export type Token = z.infer<typeof zToken>;

// Token holder schema
export const zTokenHolder = z.object({
  id: z.string(),
  address: z.string(),
  balance: z.string(),
  balanceUsd: z.string().optional(),
  percentage: z.number(),
  lastActivity: z.string(),
  status: zAddressStatus,
  label: z.string().optional(),
});
export type TokenHolder = z.infer<typeof zTokenHolder>;

// Whitelist entry schema
export const zWhitelistEntry = z.object({
  id: z.string(),
  address: z.string(),
  label: z.string().optional(),
  addedAt: z.string(),
  addedBy: z.string(),
  expiresAt: z.string().optional(),
  status: z.enum(['active', 'expired', 'removed']),
});
export type WhitelistEntry = z.infer<typeof zWhitelistEntry>;

// Blocklist entry schema
export const zBlocklistEntry = z.object({
  id: z.string(),
  address: z.string(),
  label: z.string().optional(),
  reason: z.string(),
  blockedAt: z.string(),
  blockedBy: z.string(),
  status: z.enum(['blocked', 'unblocked']),
});
export type BlocklistEntry = z.infer<typeof zBlocklistEntry>;

// Token operation (mint/burn) schema
export const zTokenOperation = z.object({
  id: z.string(),
  type: z.enum(['mint', 'burn']),
  tokenId: z.string(),
  amount: z.string(),
  toAddress: z.string().optional(),
  fromAddress: z.string().optional(),
  txHash: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'failed']),
  createdAt: z.string(),
  createdBy: z.string(),
  confirmedAt: z.string().optional(),
});
export type TokenOperation = z.infer<typeof zTokenOperation>;

// Token deployment form schema
export const zTokenDeploymentForm = z.object({
  name: z.string().min(1, 'Name is required').max(64, 'Name too long'),
  symbol: z
    .string()
    .min(1, 'Symbol is required')
    .max(11, 'Symbol too long')
    .toUpperCase(),
  standard: zTokenStandard,
  chainId: z.number(),
  decimals: z.number().min(0).max(18),
  initialSupply: z.string().optional(),
  maxSupply: z.string().optional(),
  isMintable: z.boolean(),
  isBurnable: z.boolean(),
  isPausable: z.boolean(),
  hasWhitelist: z.boolean(),
  hasBlocklist: z.boolean(),
});
export type TokenDeploymentForm = z.infer<typeof zTokenDeploymentForm>;

// Mint/Burn form schema
export const zMintBurnForm = z.object({
  amount: z.string().min(1, 'Amount is required'),
  address: z.string().min(1, 'Address is required'),
  memo: z.string().optional(),
});
export type MintBurnForm = z.infer<typeof zMintBurnForm>;

// Token transaction schema (for transactions tab - includes mint, burn, transfer)
export const zTokenTransaction = z.object({
  id: z.string(),
  type: z.enum(['mint', 'burn', 'transfer']),
  tokenId: z.string(),
  amount: z.string(),
  fromAddress: z.string().optional(),
  toAddress: z.string().optional(),
  txHash: z.string(),
  status: z.enum(['pending', 'confirmed', 'failed']),
  timestamp: z.string(),
  blockNumber: z.number().optional(),
  gasUsed: z.string().optional(),
  initiatedBy: z.string().optional(),
});
export type TokenTransaction = z.infer<typeof zTokenTransaction>;
