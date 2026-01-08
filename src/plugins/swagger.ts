import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';
import { config } from '@/src/lib/config.js';

async function swaggerPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'io-vault Multi-Chain Core API',
        version: '1.0.0',
        description: 'Core service for multi-chain vault management',
      },
      servers: [
        { url: 'https://api.dev.iodevnet.com', description: 'Development' },
        { url: 'https://api.staging.iodevnet.com', description: 'Staging' },
        { url: 'https://api.iofinnet.com', description: 'Production' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    transform: jsonSchemaTransform,
  });

  if (config.server.stage !== 'prod') {
    await fastify.register(fastifySwaggerUi, {
      routePrefix: '/docs',
    });
  }
}

export default fp(swaggerPlugin, { name: 'swagger' });
