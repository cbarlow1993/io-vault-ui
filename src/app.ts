import Fastify, { type FastifyInstance } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { config } from '@/src/lib/config.js';
import authPlugin from '@/src/plugins/auth.js';
import databasePlugin from '@/src/plugins/database.js';
import errorHandlerPlugin from '@/src/plugins/error-handler.js';
import reconciliationCronPlugin from '@/src/plugins/reconciliation-cron.js';
import reconciliationWorkerPlugin from '@/src/plugins/reconciliation-worker.js';
import swaggerPlugin from '@/src/plugins/swagger.js';
import { routes } from '@/src/routes/index.js';

export interface BuildAppOptions {
  logger?: boolean;
  /** JWKS endpoint URL for JWT signature verification */
  jwksUrl?: string;
  /** List of allowed OAuth client IDs (comma-separated in env var) */
  allowedClientIds?: string[];
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? false,
  }).withTypeProvider<ZodTypeProvider>();

  // Zod integration
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Use config for allowed client IDs if not provided via options
  const allowedClientIds = options.allowedClientIds ?? config.auth.allowedClientIds;

  // Core plugins
  app.register(swaggerPlugin);
  app.register(errorHandlerPlugin);
  app.register(databasePlugin);
  app.register(authPlugin, {
    publicRoutes: ['/health', '/v2/chains', '/docs', '/docs/*'],
    jwksUrl: options.jwksUrl ?? config.auth.jwksUrl,
    allowedClientIds: allowedClientIds.length > 0 ? allowedClientIds : undefined,
  });

  // Routes
  app.register(routes);

  // Reconciliation worker (optional, controlled by config)
  if (config.reconciliation.workerEnabled) {
    app.register(reconciliationWorkerPlugin, {
      pollingIntervalMs: config.reconciliation.pollingIntervalMs,
    });
  }

  // Reconciliation cron scheduler (optional, controlled by config)
  app.register(reconciliationCronPlugin);

  // Health check (public)
  app.get('/health', async () => {
    return { status: 'ok' };
  });

  return app;
}
