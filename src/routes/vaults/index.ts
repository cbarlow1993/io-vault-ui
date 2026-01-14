import type { FastifyInstance } from 'fastify';
import { createVault } from '@/src/routes/vaults/handlers.js';
import {
  createVaultBodySchema,
  createVaultResponseSchema,
} from '@/src/routes/vaults/schemas.js';

export default async function vaultRoutes(fastify: FastifyInstance) {
  /**
   * POST /
   * Create a new vault with curves
   */
  fastify.post(
    '/',
    {
      schema: {
        tags: ['Vaults'],
        summary: 'Create a vault with curves',
        description:
          'Creates a new vault with the specified elliptic curves for HD wallet derivation. ' +
          'Each curve includes an xpub (extended public key) used for address generation.',
        body: createVaultBodySchema,
        response: {
          201: createVaultResponseSchema,
        },
      },
    },
    createVault
  );
}
