import { OperationForbiddenError } from '@iofinnet/errors-sdk';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import type { PolicyService, PolicyDecision } from '@/src/services/policy/types.js';

declare module 'fastify' {
  interface FastifyInstance {
    policy: PolicyService;
  }

  interface FastifyRequest {
    requireAccess: ((module: string, action: string, resource?: { vaultId?: string }) => Promise<void>) | null;
    policyDecision: PolicyDecision | null;
  }
}

export interface PolicyPluginOptions {
  policyService: PolicyService;
}

async function policyPlugin(fastify: FastifyInstance, options: PolicyPluginOptions) {
  const { policyService } = options;

  // Decorate fastify instance with policy service
  fastify.decorate('policy', policyService);

  // Decorate request with requireAccess helper
  fastify.decorateRequest('requireAccess', null);
  fastify.decorateRequest('policyDecision', null);

  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    request.requireAccess = async (
      module: string,
      action: string,
      resource?: { vaultId?: string }
    ) => {
      if (!request.auth) {
        throw new OperationForbiddenError('Authentication required');
      }

      const decision = await policyService.checkAccess({
        userId: request.auth.userId,
        organisationId: request.auth.organisationId,
        module,
        action,
        resource,
      });

      request.policyDecision = decision;

      if (!decision.allowed) {
        throw new OperationForbiddenError(decision.reason ?? 'Access denied');
      }
    };
  });
}

export default fp(policyPlugin, {
  name: 'policy',
  dependencies: ['auth'],
});
