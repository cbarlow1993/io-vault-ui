import { z } from 'zod';

export const moduleIdParamsSchema = z.object({
  moduleId: z.string().uuid(),
});

export const moduleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  display_name: z.string(),
  is_active: z.boolean(),
});

export const listModulesResponseSchema = z.object({
  modules: z.array(moduleSchema),
});

export const moduleRoleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  display_name: z.string(),
});

export const listModuleRolesResponseSchema = z.object({
  roles: z.array(moduleRoleSchema),
});

export const moduleActionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  display_name: z.string(),
});

export const listModuleActionsResponseSchema = z.object({
  actions: z.array(moduleActionSchema),
});
