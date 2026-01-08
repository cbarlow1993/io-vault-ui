import type { FastifyInstance } from 'fastify';
import addressRoutes from '@/src/routes/addresses/index.js';
import balanceRoutes from '@/src/routes/balances/index.js';
import chainRoutes from '@/src/routes/chains/index.js';
import reconciliationRoutes from '@/src/routes/reconciliation/index.js';
import spamRoutes from '@/src/routes/spam/index.js';
import transactionRoutes, { transactionRoutesV2, vaultTransactionRoutes } from '@/src/routes/transactions/index.js';
import validateAddressRoutes from '@/src/routes/validate-address.js';
import { workflowRoutes } from '@/src/routes/transactions/workflow/index.js';
import { signatureWebhookRoutes } from '@/src/routes/webhooks/signature.js';

export async function routes(fastify: FastifyInstance) {
  // Public routes (no auth required)
  fastify.register(chainRoutes, { prefix: '/v2/chains' });

  // Protected routes
  fastify.register(addressRoutes, { prefix: '/v2/vaults/:vaultId/addresses' });
  fastify.register(validateAddressRoutes, { prefix: '/v2/addresses' });
  fastify.register(balanceRoutes, { prefix: '/v2/balances' });
  fastify.register(transactionRoutes, { prefix: '/v2/transactions' });
  fastify.register(transactionRoutesV2, { prefix: '/v2/transactions' });
  fastify.register(vaultTransactionRoutes, { prefix: '/v2/vaults/:vaultId/transactions' });
  fastify.register(reconciliationRoutes, { prefix: '/v2/reconciliation' });
  fastify.register(spamRoutes, { prefix: '/v2' });

  // Workflow routes
  fastify.register(workflowRoutes, { prefix: '/v2/workflows' });

  // Webhook routes
  fastify.register(signatureWebhookRoutes, { prefix: '/webhooks' });
}
