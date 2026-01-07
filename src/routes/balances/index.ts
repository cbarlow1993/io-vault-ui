import type { FastifyInstance } from 'fastify';
import chainValidationPlugin from '@/src/plugins/chain-validation.js';
import { getNativeBalance, getTokenBalances } from '@/src/routes/balances/handlers.js';
import {
  balancePathParamsSchema,
  nativeBalanceResponseSchema,
  tokenBalancePathParamsSchema,
  tokenBalanceQuerySchema,
  tokenBalancesResponseSchema,
} from '@/src/routes/balances/schemas.js';

export default async function balanceRoutes(fastify: FastifyInstance) {
  // Register chain validation plugin for routes that need ecosystem/chain validation
  await fastify.register(chainValidationPlugin);

  // ==================== Native Balance Route ====================

  /**
   * GET /ecosystem/:ecosystem/chain/:chainAlias/address/:address/native
   * Get native balance for an address
   */
  fastify.get(
    '/ecosystem/:ecosystem/chain/:chainAlias/address/:address/native',
    {
      schema: {
        tags: ['Balances'],
        summary: 'Get native balance for an address',
        description:
          'Retrieves the native token balance (ETH, SOL, BTC, etc.) for a specific address on a given chain. Includes USD value conversion and token metadata.',
        params: balancePathParamsSchema,
        response: {
          200: nativeBalanceResponseSchema,
        },
      },
    },
    getNativeBalance
  );

  // ==================== Token Balances Route ====================

  /**
   * GET /ecosystem/:ecosystem/chain/:chainAlias/address/:address/tokens
   * Get token balances for an address
   */
  fastify.get(
    '/ecosystem/:ecosystem/chain/:chainAlias/address/:address/tokens',
    {
      schema: {
        tags: ['Balances'],
        summary: 'Get token balances for an address',
        description:
          'Retrieves all token balances (ERC-20, SPL tokens, etc.) for a specific address on a given chain. Hidden tokens are filtered by default unless showHiddenTokens=true is provided.',
        params: tokenBalancePathParamsSchema,
        querystring: tokenBalanceQuerySchema,
        response: {
          200: tokenBalancesResponseSchema,
        },
      },
    },
    getTokenBalances
  );
}
