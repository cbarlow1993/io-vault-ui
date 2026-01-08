import { z } from 'zod';

// EVM-specific request body schema
export const evmScanTransactionBodySchema = z.object({
  options: z
    .array(z.enum(['validation', 'simulation', 'gas_estimation', 'events']))
    .min(1)
    .default(['validation']),
  metadata: z
    .object({
      domain: z.string(),
    })
    .required(),
  block: z
    .union([
      z.literal('latest'),
      z.number().int().positive(),
      z.string().regex(/^0x[a-fA-F0-9]+$/, 'Block must be a valid hex string starting with 0x'),
    ])
    .default('latest'),
  simulate_with_estimated_gas: z.boolean().default(false),
  account_address: z
    .string()
    .regex(
      /^0x[a-fA-F0-9]{40}$/,
      'EVM account address must be a valid 40-character hex string starting with 0x'
    ),
  data: z.object({
    from: z
      .string()
      .regex(
        /^0x[a-fA-F0-9]{40}$/,
        'EVM from address must be a valid 40-character hex string starting with 0x'
      ),
    to: z
      .string()
      .regex(/^0x[a-fA-F0-9]*$/, 'EVM to address must be a valid hex string starting with 0x')
      .optional(),
    data: z
      .string()
      .regex(
        /^0[Xx][a-fA-F0-9]*$/,
        'EVM transaction data must be a valid hex string starting with 0x'
      )
      .optional(),
    value: z
      .string()
      .regex(
        /^0x[a-fA-F0-9]*$/,
        'EVM transaction value must be a valid hex string starting with 0x'
      )
      .optional(),
    gas: z
      .string()
      .regex(/^0x[a-fA-F0-9]*$/, 'EVM gas must be a valid hex string starting with 0x')
      .optional(),
    gas_price: z
      .string()
      .regex(/^0x[a-fA-F0-9]*$/, 'EVM gas price must be a valid hex string starting with 0x')
      .optional(),
    authorization_list: z
      .array(
        z.object({
          address: z
            .string()
            .regex(
              /^0x[a-fA-F0-9]{40}$/,
              'Authorization address must be a valid 40-character hex string starting with 0x'
            ),
          chainld: z.string().optional(),
          nonce: z.string().optional(),
          yParity: z.string().optional(),
          r: z.string().optional(),
          s: z.string().optional(),
          eoa: z.string().optional(),
        })
      )
      .optional(),
  }),
});

// EVM-specific response schema for Blockaid scan result
export const evmBlockaidScanResponseSchema = z.object({
  result: z.object({
    action: z.string(),
    reason: z.string().optional(),
    details: z
      .object({
        attackType: z.string().optional(),
        severity: z.string().optional(),
        description: z.string().optional(),
      })
      .optional(),
  }),
  simulation: z
    .object({
      error: z.string().optional(),
      balanceChanges: z
        .array(
          z.object({
            address: z.string(),
            before: z.string(),
            after: z.string(),
          })
        )
        .optional(),
      gasUsed: z.string().optional(),
      gasLimit: z.string().optional(),
      gasPrice: z.string().optional(),
      fee: z.string().optional(),
    })
    .optional(),
});

export type EVMScanTransactionBody = z.infer<typeof evmScanTransactionBodySchema>;
export type EVMBlockaidScanResponse = z.infer<typeof evmBlockaidScanResponseSchema>;
