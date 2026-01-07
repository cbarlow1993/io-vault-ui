import { UserInputError } from '@iofinnet/errors-sdk';
import { Chain, type ChainAlias, type EcoSystem } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyRequest {
    chain: Chain | null;
  }
}

async function chainValidationPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('chain', null);

  fastify.addHook('preHandler', async (request: FastifyRequest) => {
    const params = request.params as { ecosystem?: string; chainAlias?: string };
    const { ecosystem, chainAlias: alias } = params;

    // Skip if route doesn't have these params
    if (!ecosystem && !alias) {
      return;
    }

    // Both must be present if either is
    if (!ecosystem || !alias) {
      throw new UserInputError('Both ecosystem and chainAlias are required');
    }

    try {
      const chain = await Chain.fromAlias(alias as ChainAlias);

      if (!chain.isEcosystem(ecosystem as EcoSystem)) {
        throw new UserInputError(`Chain "${alias}" is not supported for ecosystem "${ecosystem}"`);
      }

      request.chain = chain;
    } catch (error) {
      if (error instanceof UserInputError) {
        throw error;
      }
      throw new UserInputError(`Unknown chain "${alias}"`);
    }
  });
}

export default fp(chainValidationPlugin, { name: 'chain-validation' });
