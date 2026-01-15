import type { FastifyInstance } from 'fastify';
import {
  assignGlobalRole,
  removeGlobalRole,
  assignModuleRole,
  removeModuleRole,
  getUserRoles,
} from './handlers.js';
import {
  assignGlobalRoleBodySchema,
  globalRoleResponseSchema,
  assignModuleRoleBodySchema,
  moduleRoleAssignmentResponseSchema,
  userWithRolesResponseSchema,
  orgUserParamsSchema,
  orgUserModuleParamsSchema,
} from './schemas.js';

export default async function organisationRoleRoutes(fastify: FastifyInstance) {
  // Global role management
  fastify.put(
    '/:orgId/users/:userId/global-role',
    {
      schema: {
        tags: ['Roles'],
        summary: 'Assign global role to user',
        params: orgUserParamsSchema,
        body: assignGlobalRoleBodySchema,
        response: {
          200: globalRoleResponseSchema,
        },
      },
    },
    assignGlobalRole
  );

  fastify.delete(
    '/:orgId/users/:userId/global-role',
    {
      schema: {
        tags: ['Roles'],
        summary: 'Remove global role from user',
        params: orgUserParamsSchema,
      },
    },
    removeGlobalRole
  );

  // Module role management
  fastify.post(
    '/:orgId/users/:userId/module-roles',
    {
      schema: {
        tags: ['Roles'],
        summary: 'Assign module role to user',
        params: orgUserParamsSchema,
        body: assignModuleRoleBodySchema,
        response: {
          201: moduleRoleAssignmentResponseSchema,
        },
      },
    },
    assignModuleRole
  );

  fastify.delete(
    '/:orgId/users/:userId/module-roles/:moduleId',
    {
      schema: {
        tags: ['Roles'],
        summary: 'Remove module role from user',
        params: orgUserModuleParamsSchema,
      },
    },
    removeModuleRole
  );

  // Get user roles
  fastify.get(
    '/:orgId/users/:userId/roles',
    {
      schema: {
        tags: ['Roles'],
        summary: 'Get user roles',
        params: orgUserParamsSchema,
        response: {
          200: userWithRolesResponseSchema,
        },
      },
    },
    getUserRoles
  );
}
