import type { FastifyInstance } from 'fastify';
import { listChains } from '@/src/routes/chains/handlers.js';
import { listChainsQuerySchema } from '@/src/routes/chains/schemas.js';

export default async function chainRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Chains'],
        summary: 'List all supported chains',
        description: 'List supported chains and the supported features',
        querystring: listChainsQuerySchema,
      },
    },
    listChains
  );
}
