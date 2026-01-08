import { z } from 'zod';

// Solana-specific request body schema
export const solanaScanTransactionBodySchema = z.object({
  encoding: z.enum(['base58', 'base64']),
  options: z
    .array(z.enum(['validation', 'simulation']))
    .min(1)
    .default(['simulation', 'validation']),
  account_address: z
    .string()
    .regex(
      /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
      'Solana account address must be a valid base58 string between 32-44 characters'
    ),
  transactions: z
    .array(
      z
        .string()
        .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, 'Solana transaction must be a valid base58 string')
        .min(32, 'Solana transaction must be at least 32 characters')
    )
    .min(1, 'At least one transaction is required'),
  metadata: z.object({
    url: z.string().nullable(),
  }),
  method: z.string().default('signAllTransactions'),
});

// Solana-specific response schema for Blockaid scan result
export const solanaBlockaidScanResponseSchema = z.object({
  encoding: z.string(),
  status: z.enum(['SUCCESS', 'ERROR']),
  result: z
    .object({
      simulation: z
        .object({
          logs: z.array(z.string()).optional(),
          accounts: z
            .array(
              z.object({
                address: z.string(),
                before: z.string(),
                after: z.string(),
              })
            )
            .optional(),
          error: z.string().optional(),
        })
        .nullable(),
      validation: z
        .object({
          isValid: z.boolean(),
          reason: z.string().optional(),
        })
        .nullable(),
    })
    .nullable(),
  error: z.string().nullable().optional(),
  error_details: z
    .object({
      api_error: z
        .object({
          code: z.string().optional(),
          message: z.string().optional(),
        })
        .optional(),
      instruction_error: z
        .object({
          index: z.number().optional(),
          message: z.string().optional(),
        })
        .optional(),
      transaction_error: z
        .object({
          code: z.string().optional(),
          message: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  request_id: z.string(),
});

export type SolanaScanTransactionBody = z.infer<typeof solanaScanTransactionBodySchema>;
export type SolanaBlockaidScanResponse = z.infer<typeof solanaBlockaidScanResponseSchema>;
