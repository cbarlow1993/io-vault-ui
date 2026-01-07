import { EcoSystem } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { z } from '@/utils/openZod.js';
import { vaultIdSchema } from '@/services/common.js';
import { supportedChains } from '@/src/lib/chains.js';
import { simpleDerivationPathSchema } from '@/src/lib/schemas/derivation-path.js';

// ==================== Validation Helpers ====================

/**
 * Schema for amount validation.
 * Must be a numeric string or "MAX" (case-insensitive).
 */
export const amountSchema = z.string().refine(
  (val) => val.toUpperCase() === 'MAX' || !Number.isNaN(Number(val)),
  {
    message: 'Amount must be a numeric string or "MAX"',
  }
);

/**
 * Schema for gasPrice validation.
 * Must be a non-negative number string or undefined/null.
 */
export const gasPriceSchema = z
  .string()
  .nullish()
  .refine(
    (val) =>
      val === undefined ||
      val === null ||
      (val.trim() !== '' && !Number.isNaN(Number(val)) && Number(val) >= 0),
    {
      message: 'Invalid gasPrice: must be a non-negative number',
      path: ['gasPrice'],
    }
  );

// ==================== Path Parameter Schemas ====================

/**
 * Schema for build transaction path parameters.
 * Used for: POST /vaults/:vaultId/transactions/ecosystem/:ecosystem/chain/:chainAlias/build-*
 */
export const buildTransactionPathParamsSchema = z.object({
  vaultId: vaultIdSchema,
  ecosystem: z.nativeEnum(EcoSystem),
  chainAlias: supportedChains,
});

/**
 * Schema for SVM durable nonce path parameters.
 * Used for: GET/POST /vaults/:vaultId/transactions/ecosystem/svm/chain/solana/durable-nonce
 */
export const svmDurableNoncePathParamsSchema = z.object({
  vaultId: vaultIdSchema,
});

// ==================== Base Body Schemas ====================

/**
 * Base transaction body schema.
 * Contains common fields for all transaction types.
 */
export const baseTransactionBodySchema = z.object({
  amount: amountSchema,
  to: z.string(),
  derivationPath: simpleDerivationPathSchema.nullish(),
});

// ==================== EVM Body Schemas ====================

/**
 * EVM native transaction body schema.
 * Extends base with EVM-specific fields for native transfers.
 */
export const evmNativeBodySchema = baseTransactionBodySchema.extend({
  gasPrice: gasPriceSchema,
  gasLimit: z.string().nullish(),
  data: z.string().nullish(),
  nonce: z.number().nullish(),
  type: z.enum(['legacy', 'eip1559']).nullish(),
  maxFeePerGas: z.string().nullish(),
  maxPriorityFeePerGas: z.string().nullish(),
});

/**
 * EVM token transaction body schema.
 * Extends EVM native with tokenAddress for token transfers.
 */
export const evmTokenBodySchema = evmNativeBodySchema.extend({
  tokenAddress: z.string(),
});

// ==================== SVM Body Schemas ====================

/**
 * SVM native transaction body schema.
 * Extends base with optional nonceAccount for durable nonce transactions.
 */
export const svmNativeBodySchema = baseTransactionBodySchema.extend({
  nonceAccount: z.string().optional(),
});

/**
 * SVM token transaction body schema.
 * Extends SVM native with tokenAddress for token transfers.
 */
export const svmTokenBodySchema = svmNativeBodySchema.extend({
  tokenAddress: z.string(),
});

// ==================== TVM Body Schemas ====================

/**
 * TVM native transaction body schema.
 * Same as base transaction body.
 */
export const tvmNativeBodySchema = baseTransactionBodySchema;

/**
 * TVM token transaction body schema.
 * Extends TVM native with tokenAddress for token transfers.
 */
export const tvmTokenBodySchema = tvmNativeBodySchema.extend({
  tokenAddress: z.string(),
});

// ==================== UTXO Body Schemas ====================

/**
 * UTXO native transaction body schema.
 * Extends base with optional feeRate for fee estimation.
 */
export const utxoNativeBodySchema = baseTransactionBodySchema.extend({
  feeRate: z.number().nullish(),
});

// ==================== XRP Body Schemas ====================

/**
 * XRP native transaction body schema.
 * Extends base with optional memo and destination tag.
 */
export const xrpNativeBodySchema = baseTransactionBodySchema.extend({
  memo: z.string().optional(),
  tag: z.string().optional(),
});

// ==================== Substrate Body Schemas ====================

/**
 * Substrate native transaction body schema.
 * Same as base transaction body.
 */
export const substrateNativeBodySchema = baseTransactionBodySchema;

// ==================== SVM Durable Nonce Schemas ====================

/**
 * SVM durable nonce body schema.
 * Used for creating durable nonce accounts.
 */
export const svmDurableNonceBodySchema = z
  .object({
    derivationPath: simpleDerivationPathSchema,
  })
  .nullish();

/**
 * SVM durable nonce query schema.
 * Used for GET durable nonce endpoint.
 */
export const svmDurableNonceQuerySchema = z.object({
  derivationPath: simpleDerivationPathSchema.optional(),
});

// ==================== Response Schemas ====================

/**
 * Single EIP-712 detail item schema.
 */
export const eip712DetailsItemSchema = z.object({
  name: z.string(),
  type: z.string(),
  value: z.string(),
});

/**
 * Collection of EIP-712 detail items.
 */
export const eip712TransactionDetailsSchema = z.array(eip712DetailsItemSchema);

/**
 * Build transaction response schema.
 * Returns the marshalled hex and transaction details.
 */
export const buildTransactionResponseSchema = z.object({
  marshalledHex: z.string(),
  details: eip712TransactionDetailsSchema,
});

/**
 * Durable nonce response schema.
 * Returns nonce account details for SVM durable nonce transactions.
 */
export const durableNonceResponseSchema = z.object({
  nonceAccount: z.string(),
  nonce: z.string(),
  authority: z.string(),
});

// ==================== Type Exports ====================

export type BuildTransactionPathParams = z.infer<typeof buildTransactionPathParamsSchema>;
export type SvmDurableNoncePathParams = z.infer<typeof svmDurableNoncePathParamsSchema>;

export type BaseTransactionBody = z.infer<typeof baseTransactionBodySchema>;
export type EvmNativeBody = z.infer<typeof evmNativeBodySchema>;
export type EvmTokenBody = z.infer<typeof evmTokenBodySchema>;
export type SvmNativeBody = z.infer<typeof svmNativeBodySchema>;
export type SvmTokenBody = z.infer<typeof svmTokenBodySchema>;
export type TvmNativeBody = z.infer<typeof tvmNativeBodySchema>;
export type TvmTokenBody = z.infer<typeof tvmTokenBodySchema>;
export type UtxoNativeBody = z.infer<typeof utxoNativeBodySchema>;
export type XrpNativeBody = z.infer<typeof xrpNativeBodySchema>;
export type SubstrateNativeBody = z.infer<typeof substrateNativeBodySchema>;
export type SvmDurableNonceBody = z.infer<typeof svmDurableNonceBodySchema>;
export type SvmDurableNonceQuery = z.infer<typeof svmDurableNonceQuerySchema>;

export type Eip712DetailsItem = z.infer<typeof eip712DetailsItemSchema>;
export type Eip712TransactionDetails = z.infer<typeof eip712TransactionDetailsSchema>;
export type BuildTransactionResponse = z.infer<typeof buildTransactionResponseSchema>;
export type DurableNonceResponse = z.infer<typeof durableNonceResponseSchema>;
