import { auth as clerkAuth } from '@clerk/tanstack-react-start/server';
import { ORPCError } from '@orpc/client';
import { z } from 'zod';

import {
  zAssignModuleRoleInput,
  zModuleRolesResponse,
  zModulesListResponse,
  zRemoveModuleRoleInput,
} from '@/features/settings/schema';
import { ModuleRepository } from '@/server/core-api/repositories/module.repository';
import { OrganisationRepository } from '@/server/core-api/repositories/organisation.repository';
import { protectedProcedure } from '@/server/orpc';

const tags = ['modules'];

export default {
  list: protectedProcedure({ permission: null })
    .route({ method: 'GET', path: '/modules', tags })
    .output(zModulesListResponse)
    .handler(async ({ context }) => {
      context.logger.info('Fetching modules list');

      const authState = await clerkAuth();
      const token = await authState.getToken();

      if (!token) {
        throw new ORPCError('UNAUTHORIZED', {
          message: 'No authentication token available',
        });
      }

      const moduleRepo = new ModuleRepository(token);
      return await moduleRepo.list();
    }),

  getRoles: protectedProcedure({ permission: null })
    .route({ method: 'GET', path: '/modules/{moduleId}/roles', tags })
    .input(z.object({ moduleId: z.string() }))
    .output(zModuleRolesResponse)
    .handler(async ({ context, input }) => {
      context.logger.info(
        { moduleId: input.moduleId },
        'Fetching module roles'
      );

      const authState = await clerkAuth();
      const token = await authState.getToken();

      if (!token) {
        throw new ORPCError('UNAUTHORIZED', {
          message: 'No authentication token available',
        });
      }

      const moduleRepo = new ModuleRepository(token);
      return await moduleRepo.getRoles(input.moduleId);
    }),

  assignRole: protectedProcedure({ permission: null })
    .route({ method: 'POST', path: '/modules/assign-role', tags })
    .input(zAssignModuleRoleInput)
    .output(z.object({ success: z.boolean() }))
    .handler(async ({ context, input }) => {
      context.logger.info(
        { userId: input.userId, moduleId: input.moduleId, role: input.role },
        'Assigning module role'
      );

      const authState = await clerkAuth();
      const token = await authState.getToken();
      const orgId = authState.orgId;

      if (!token || !orgId) {
        throw new ORPCError('UNAUTHORIZED', {
          message: 'No authentication token or organization available',
        });
      }

      const orgRepo = new OrganisationRepository(token);
      await orgRepo.addModuleRole(orgId, input.userId, {
        module_id: input.moduleId,
        role: input.role,
      });

      return { success: true };
    }),

  removeRole: protectedProcedure({ permission: null })
    .route({ method: 'POST', path: '/modules/remove-role', tags })
    .input(zRemoveModuleRoleInput)
    .output(z.object({ success: z.boolean() }))
    .handler(async ({ context, input }) => {
      context.logger.info(
        { userId: input.userId, moduleId: input.moduleId },
        'Removing module role'
      );

      const authState = await clerkAuth();
      const token = await authState.getToken();
      const orgId = authState.orgId;

      if (!token || !orgId) {
        throw new ORPCError('UNAUTHORIZED', {
          message: 'No authentication token or organization available',
        });
      }

      const orgRepo = new OrganisationRepository(token);
      await orgRepo.deleteModuleRole(orgId, input.userId, input.moduleId);

      return { success: true };
    }),
};
