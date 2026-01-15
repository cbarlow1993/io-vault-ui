import type { FastifyInstance } from 'fastify';
import {
  listModules,
  listModuleRoles,
  listModuleActions,
} from '@/src/routes/modules/handlers.js';
import {
  moduleIdParamsSchema,
  listModulesResponseSchema,
  listModuleRolesResponseSchema,
  listModuleActionsResponseSchema,
} from '@/src/routes/modules/schemas.js';

export default async function moduleRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Modules'],
        summary: 'List available modules',
        response: {
          200: listModulesResponseSchema,
        },
      },
    },
    listModules
  );

  fastify.get(
    '/:moduleId/roles',
    {
      schema: {
        tags: ['Modules'],
        summary: 'List roles for a module',
        params: moduleIdParamsSchema,
        response: {
          200: listModuleRolesResponseSchema,
        },
      },
    },
    listModuleRoles
  );

  fastify.get(
    '/:moduleId/actions',
    {
      schema: {
        tags: ['Modules'],
        summary: 'List actions for a module',
        params: moduleIdParamsSchema,
        response: {
          200: listModuleActionsResponseSchema,
        },
      },
    },
    listModuleActions
  );
}
