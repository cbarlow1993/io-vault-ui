import { Chain, type ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import chainValidationPlugin from '@/src/plugins/chain-validation.js';

const validateAddressBodySchema = z.object({
  address: z.string().min(1, 'Address is required'),
});

const validateAddressParamsSchema = z.object({
  ecosystem: z.string(),
  chainAlias: z.string(),
});

const validateAddressResponseSchema = z.object({
  valid: z.boolean(),
  address: z.string(),
  chainAlias: z.string(),
  ecosystem: z.string(),
});

export default async function validateAddressRoutes(fastify: FastifyInstance) {
  // Register chain validation plugin
  await fastify.register(chainValidationPlugin);

  /**
   * POST /ecosystem/:ecosystem/chain/:chainAlias/validate
   * Validate an address format for a specific chain
   */
  fastify.post<{
    Params: z.infer<typeof validateAddressParamsSchema>;
    Body: z.infer<typeof validateAddressBodySchema>;
  }>(
    '/ecosystem/:ecosystem/chain/:chainAlias/validate',
    {
      schema: {
        tags: ['Addresses'],
        summary: 'Validate address format',
        description:
          'Validates whether an address is correctly formatted for the specified blockchain. Does not verify ownership or existence on-chain.',
        params: validateAddressParamsSchema,
        body: validateAddressBodySchema,
        response: {
          200: validateAddressResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { ecosystem, chainAlias } = request.params;
      const { address } = request.body;

      // Chain is already validated and available from the chain-validation plugin
      const chain = request.chain ?? (await Chain.fromAlias(chainAlias as ChainAlias));
      const valid = chain.Utils.isAddressValid(address);

      return reply.send({
        valid,
        address,
        chainAlias,
        ecosystem,
      });
    }
  );
}
