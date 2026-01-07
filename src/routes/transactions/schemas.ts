import {
  type ChainAlias,
  EcoSystem,
  EvmChainAliases,
  SvmChainAliases,
} from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { z } from 'zod';
import { vaultIdSchema } from '@/services/common.js';
import { ChainFeatures, supportedChains } from '@/src/lib/chains.js';
import { isChainFeatureActive } from '@/src/lib/isChainFeatureActive.js';

// ==================== Path Parameter Schemas ====================

/**
 * Schema for transaction address ID path parameters (PostgreSQL)
 * GET /addresses/:addressId/transactions
 */
export const transactionAddressIdPathParamsSchema = z.object({
  addressId: z.string().uuid(),
});

/**
 * Schema for list transactions path parameters
 * GET /ecosystem/:ecosystem/chain/:chainAlias/address/:address
 */
export const listTransactionsPathParamsSchema = z.object({
  ecosystem: z.nativeEnum(EcoSystem),
  chainAlias: supportedChains.refine(
    (chainAlias) => {
      try {
        return isChainFeatureActive({
          chainAlias,
          feature: ChainFeatures.TRANSACTION_HISTORY,
        });
      } catch {
        return false;
      }
    },
    { message: 'Transaction history is not supported for this chain', path: ['chainAlias'] }
  ),
  address: z.string().min(1),
});

/**
 * Schema for get transaction path parameters
 * GET /ecosystem/:ecosystem/chain/:chainAlias/address/:address/transaction/:transactionHash
 */
export const getTransactionPathParamsSchema = z.object({
  ecosystem: z.nativeEnum(EcoSystem),
  chainAlias: supportedChains.refine(
    (chainAlias) => {
      try {
        return isChainFeatureActive({
          chainAlias,
          feature: ChainFeatures.TRANSACTION_DESCRIPTIONS,
        });
      } catch {
        return false;
      }
    },
    { message: 'Transaction descriptions are not supported for this chain', path: ['chainAlias'] }
  ),
  address: z.string().min(1),
  transactionHash: z.string().min(1),
});

/**
 * Schema for scan transaction path parameters
 * POST /ecosystem/:ecosystem/chain/:chainAlias/scan-transaction
 */
const evmAliases = Object.values(EvmChainAliases) as string[];
const svmAliases = Object.values(SvmChainAliases) as string[];

const isEvmChain = (c: string) => evmAliases.includes(c);
const isSvmChain = (c: string) => svmAliases.includes(c);

export const scanTransactionPathParamsSchema = z.object({
  ecosystem: z.enum([EcoSystem.EVM, EcoSystem.SVM]),
  chainAlias: z.enum([...evmAliases, ...svmAliases] as [string, ...string[]]).refine(
    (chainAlias: string) =>
      isChainFeatureActive({
        chainAlias: chainAlias as ChainAlias,
        feature: ChainFeatures.BLOCKAID_SCAN,
      }),
    {
      message: 'Blockaid scan is not supported for this chain',
      path: ['chainAlias'],
    }
  ),
});

/**
 * Schema for create transaction path parameters (vault-scoped)
 * POST /vaults/:vaultId/transactions/ecosystem/:ecosystem/chain/:chainAlias/transaction
 */
export const createTransactionPathParamsSchema = z.object({
  vaultId: vaultIdSchema,
  ecosystem: z.nativeEnum(EcoSystem),
  chainAlias: supportedChains,
});

// ==================== Query Parameter Schemas ====================

/**
 * Schema for transaction list query parameters (PostgreSQL)
 * GET /addresses/:addressId/transactions
 */
export const transactionListQuerySchema = z.object({
  limit: z.coerce.number().optional(),
  offset: z.coerce.number().optional(),
  chainAlias: z.string().optional(),
});

/**
 * Schema for list transactions query parameters.
 * Uses cursor-based pagination as per requirements.
 *
 * @see docs/requirements/common/001-cursor-pagination.md
 * @see docs/requirements/api-transactions/001-list-transactions.md
 */
export const listTransactionsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: z.enum(['asc', 'desc']).optional().default('desc'),
  /** Filter by direction (comma-separated: 'in', 'out', 'neutral') */
  direction: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const directions = val.split(',').map((d) => d.trim().toLowerCase());
      const valid = directions.filter((d): d is 'in' | 'out' | 'neutral' =>
        ['in', 'out', 'neutral'].includes(d)
      );
      return valid.length > 0 ? valid : undefined;
    }),
  /** Include enriched transfers with asset metadata */
  includeTransfers: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

/**
 * Schema for get transaction query parameters
 */
export const getTransactionQuerySchema = z
  .object({
    include: z.enum(['operation']).optional().nullable(),
  })
  .optional()
  .nullable();

// ==================== Request Body Schemas ====================

/**
 * Schema for scan transaction body
 */
const evmOverrides = z
  .object({
    simulate_with_estimated_gas: z.boolean().default(false),
  })
  .strict();

export const scanTransactionBodySchema = z
  .object({
    options: z
      .array(z.enum(['validation', 'simulation']))
      .min(1)
      .default(['simulation', 'validation']),
    marshalledHex: z.string().min(4),
    metadata: z
      .object({
        url: z.string().url().nullable().default(null),
      })
      .default({ url: null }),
    overrides: z
      .object({
        evm: evmOverrides.optional(),
      })
      .partial()
      .default({})
      .nullable(),
  })
  .strict();

/**
 * Schema for create transaction body
 */
export const createTransactionBodySchema = z.object({
  marshalledHex: z.string().min(1),
  memo: z.string().optional().nullable(),
  broadcast: z.boolean().optional().nullable().default(true),
  expiryTimestamp: z.coerce.date().min(new Date()).optional().nullable(),
});

// ==================== Response Schemas ====================

/**
 * Token schema for transaction responses
 */
export const tokenSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  decimals: z.number(),
  address: z.string(),
  price: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
});

/**
 * Address schema for transaction responses
 */
export const addressSchema = z.object({
  name: z.string().nullable(),
  address: z.string().nullable(),
});

/**
 * Transfer schema for transaction responses
 */
export const transferSchema = z.object({
  action: z.string(),
  from: addressSchema,
  to: addressSchema,
  amount: z.string(),
  token: tokenSchema.optional(),
  nft: z
    .object({
      address: z.string(),
      id: z.string().optional(),
      name: z.string().optional(),
      symbol: z.string(),
    })
    .optional(),
});

/**
 * Classification data schema
 */
export const classificationDataSchema = z.object({
  type: z.string(),
  description: z.string(),
});

/**
 * Raw transaction data schema
 */
export const rawTransactionDataSchema = z.object({
  transactionHash: z.string(),
  fromAddress: z.string(),
  toAddress: z.string(),
  blockNumber: z.number(),
  gas: z.number().optional(),
  gasUsed: z.number().optional(),
  gasPrice: z.number().optional(),
  transactionFee: z
    .object({
      amount: z.string(),
      token: tokenSchema,
    })
    .optional(),
  timestamp: z.number(),
});

/**
 * Transaction response schema
 */
export const transactionResponseSchema = z.object({
  chainAlias: z.string(),
  accountAddress: z.string(),
  classificationData: classificationDataSchema,
  transfers: z.array(transferSchema),
  rawTransactionData: rawTransactionDataSchema,
  publicMetadata: z.record(z.string(), z.unknown()).optional(),
  operationId: z.string().optional(),
});

/**
 * Pagination schema for transaction list.
 * Uses standardized cursor-based pagination format.
 *
 * @see docs/requirements/common/001-cursor-pagination.md
 */
export const transactionPaginationSchema = z.object({
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
  total: z.number().optional(),
});

/**
 * Transaction list response schema (legacy)
 */
export const transactionListResponseSchema = z.object({
  data: z.array(transactionResponseSchema),
  pagination: transactionPaginationSchema,
});

/**
 * Asset metadata schema for unified transfers
 */
export const assetMetadataSchema = z.object({
  name: z.string(),
  symbol: z.string(),
  decimals: z.number(),
  logoUri: z.string().nullable(),
  coingeckoId: z.string().nullable(),
  isVerified: z.boolean(),
  isSpam: z.boolean(),
});

/**
 * Unified transfer schema for PostgreSQL transactions
 * Combines native and token transfers with full asset metadata
 */
export const transferResponseSchema = z.object({
  id: z.string(),
  transferType: z.enum(['native', 'token']),
  direction: z.enum(['in', 'out']),
  fromAddress: z.string().nullable(),
  toAddress: z.string().nullable(),
  tokenAddress: z.string().nullable(),
  amount: z.string(),
  formattedAmount: z.string(),
  displayAmount: z.string(),
  asset: assetMetadataSchema,
});

/**
 * PostgreSQL transaction schema
 */
export const postgresTransactionSchema = z.object({
  id: z.string(),
  chainAlias: z.string(),
  network: z.string(),
  txHash: z.string(),
  blockNumber: z.string(),
  blockHash: z.string(),
  txIndex: z.number().nullable(),
  fromAddress: z.string(),
  toAddress: z.string().nullable(),
  value: z.string(),
  fee: z.string().nullable(),
  status: z.enum(['success', 'failed', 'pending']),
  timestamp: z.date(),
  classificationType: z.string().nullable(),
  classificationLabel: z.string().nullable(),
  /** Direction from the queried address's perspective */
  direction: z.enum(['in', 'out', 'neutral']).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  /** Unified transfers array with full asset metadata */
  transfers: z.array(transferResponseSchema).optional(),
});

/**
 * PostgreSQL transaction list response schema
 */
export const postgresTransactionListResponseSchema = z.object({
  data: z.array(postgresTransactionSchema),
  pagination: transactionPaginationSchema,
});

/**
 * Get transaction v2 response schema
 * Used for single transaction GET v2 endpoint
 * Key differences from list response:
 * - transfers is required (not optional)
 * - operationId is always present (nullable)
 */
export const getTransactionV2ResponseSchema = postgresTransactionSchema
  .omit({
    transfers: true,
  })
  .extend({
    /** Unified transfers array with full asset metadata */
    transfers: z.array(transferResponseSchema),
    operationId: z.string().nullable(),
  });

/**
 * Create transaction response schema
 */
export const createTransactionResponseSchema = z.object({
  id: z.string(),
});

/**
 * Scan transaction response schema (using passthrough for Blockaid responses)
 */
export const scanTransactionResponseSchema = z.object({
  scan: z.record(z.string(), z.unknown()),
});

// ==================== Validation Helpers ====================

/**
 * Validates that ecosystem matches chain for scan transaction
 */
export function validateEcosystemChainMatch(ecosystem: string, chain: string): boolean {
  if (ecosystem === EcoSystem.EVM && !isEvmChain(chain)) {
    return false;
  }
  if (ecosystem === EcoSystem.SVM && !isSvmChain(chain)) {
    return false;
  }
  return true;
}

// ==================== Type Exports ====================

export type TransactionAddressIdPathParams = z.infer<typeof transactionAddressIdPathParamsSchema>;
export type TransactionListQuery = z.infer<typeof transactionListQuerySchema>;
export type ListTransactionsPathParams = z.infer<typeof listTransactionsPathParamsSchema>;
export type GetTransactionPathParams = z.infer<typeof getTransactionPathParamsSchema>;
export type ScanTransactionPathParams = z.infer<typeof scanTransactionPathParamsSchema>;
export type CreateTransactionPathParams = z.infer<typeof createTransactionPathParamsSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
export type GetTransactionQuery = z.infer<typeof getTransactionQuerySchema>;
export type ScanTransactionBody = z.infer<typeof scanTransactionBodySchema>;
export type CreateTransactionBody = z.infer<typeof createTransactionBodySchema>;
export type TransactionResponse = z.infer<typeof transactionResponseSchema>;
export type TransactionListResponse = z.infer<typeof transactionListResponseSchema>;
export type GetTransactionV2Response = z.infer<typeof getTransactionV2ResponseSchema>;
export type CreateTransactionResponse = z.infer<typeof createTransactionResponseSchema>;
export type ScanTransactionResponse = z.infer<typeof scanTransactionResponseSchema>;
