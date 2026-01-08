import type { FastifyInstance } from 'fastify';
import { setSpamOverride, deleteSpamOverride, setBulkSpamOverrides } from '@/src/routes/spam/handlers.js';
import {
  spamOverrideParamsSchema,
  spamOverrideBodySchema,
  spamOverrideResponseSchema,
  bulkSpamOverrideParamsSchema,
  bulkSpamOverrideBodySchema,
  bulkSpamOverrideResponseSchema,
  badRequestErrorSchema,
  notFoundErrorSchema,
} from '@/src/routes/spam/schemas.js';

export default async function spamRoutes(fastify: FastifyInstance) {
  // ==================== Single Token Spam Override Routes ====================

  /**
   * PATCH /addresses/:addressId/tokens/:tokenAddress/spam-override
   * Set a spam override for a token
   */
  fastify.patch(
    '/addresses/:addressId/tokens/:tokenAddress/spam-override',
    {
      schema: {
        tags: ['Spam'],
        summary: 'Set spam override for a token',
        description:
          'Marks a token as trusted or spam, overriding the automatic classification. ' +
          'Use "native" as tokenAddress for the native token.',
        params: spamOverrideParamsSchema,
        body: spamOverrideBodySchema,
        response: {
          200: spamOverrideResponseSchema,
          400: badRequestErrorSchema,
          404: notFoundErrorSchema,
        },
      },
    },
    setSpamOverride
  );

  /**
   * DELETE /addresses/:addressId/tokens/:tokenAddress/spam-override
   * Remove a spam override for a token
   */
  fastify.delete(
    '/addresses/:addressId/tokens/:tokenAddress/spam-override',
    {
      schema: {
        tags: ['Spam'],
        summary: 'Remove spam override for a token',
        description:
          'Removes the user spam override, resetting the token to use the global classification. ' +
          'Use "native" as tokenAddress for the native token.',
        params: spamOverrideParamsSchema,
        response: {
          200: spamOverrideResponseSchema,
          400: badRequestErrorSchema,
          404: notFoundErrorSchema,
        },
      },
    },
    deleteSpamOverride
  );

  // ==================== Bulk Spam Override Route ====================

  /**
   * PATCH /addresses/:addressId/tokens/spam-overrides
   * Set multiple spam overrides at once
   */
  fastify.patch(
    '/addresses/:addressId/tokens/spam-overrides',
    {
      schema: {
        tags: ['Spam'],
        summary: 'Set multiple spam overrides',
        description:
          'Sets spam overrides for multiple tokens at once (max 100). ' +
          'Tokens not found will be silently skipped. ' +
          'Use "native" as tokenAddress for the native token.',
        params: bulkSpamOverrideParamsSchema,
        body: bulkSpamOverrideBodySchema,
        response: {
          200: bulkSpamOverrideResponseSchema,
          400: badRequestErrorSchema,
        },
      },
    },
    setBulkSpamOverrides
  );
}
