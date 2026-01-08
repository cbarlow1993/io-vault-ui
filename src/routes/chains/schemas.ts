import { EcoSystem } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { z } from 'zod';
import { supportedChains } from '@/src/lib/chains.js';

export const chainSchema = z
  .object({
    id: z.number().nullable(),
    name: z.string(),
    chainAlias: z.string(),
    ecosystem: z.string(),
    nativeCurrency: z.object({
      name: z.string(),
      symbol: z.string(),
      decimals: z.number(),
    }),
    rpcUrls: z.object({
      iofinnet: z.object({
        http: z.array(z.string()),
      }),
    }),
    blockExplorers: z.any().optional(),
    features: z.record(z.string(), z.string()),
    isTestnet: z.boolean(),
  })
  .passthrough();

// Helper for boolean query parameters - validates "true" or "false" strings
const booleanQueryParam = z
  .enum(['true', 'false'])
  .transform((val) => val === 'true')
  .optional();

export const listChainsQuerySchema = z.object({
  ecosystem: z.enum(EcoSystem).optional(),
  chainAlias: supportedChains.optional(),
  chainId: z.coerce.number().optional(),
  includeTestnets: booleanQueryParam,
  asV1: booleanQueryParam,
});

export const listChainsResponseSchema = z.object({
  data: z.array(chainSchema),
});

export type Chain = z.infer<typeof chainSchema>;
export type ListChainsQuery = z.infer<typeof listChainsQuerySchema>;
