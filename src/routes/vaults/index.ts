import type { FastifyInstance } from 'fastify';
import { createVault } from '@/src/routes/vaults/handlers.js';
import { requireAccess } from '@/src/middleware/require-access.js';
import {
  createVaultBodySchema,
  createVaultResponseSchema,
} from '@/src/routes/vaults/schemas.js';

export default async function vaultRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/',
    {
      preHandler: [requireAccess('treasury', 'manage_vaults')],
      schema: {
        tags: ['Vaults'],
        summary: 'Create a vault with curves',
        description:
          'Creates a new vault with the specified elliptic curves for HD wallet derivation. ' +
          'Requires treasury:manage_vaults permission.',
        body: createVaultBodySchema,
        response: {
          201: createVaultResponseSchema,
        },
      },
    },
    createVault
  );
}
