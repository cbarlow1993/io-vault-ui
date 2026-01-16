import { z } from 'zod';

// Module definition from API
export const zModule = z.object({
  id: z.string().uuid(),
  name: z.string(),
  display_name: z.string(),
  is_active: z.boolean(),
});

export type Module = z.infer<typeof zModule>;

// Module role definition from API
export const zModuleRole = z.object({
  id: z.string().uuid(),
  name: z.string(),
  display_name: z.string(),
});

export type ModuleRole = z.infer<typeof zModuleRole>;

// User's module assignment
export const zUserModuleAssignment = z.object({
  module_id: z.string(),
  role: z.string(),
  granted_by: z.string().optional(),
  created_at: z.string().optional(),
});

export type UserModuleAssignment = z.infer<typeof zUserModuleAssignment>;

// Response schemas
export const zModulesListResponse = z.object({
  modules: z.array(zModule),
});

export const zModuleRolesResponse = z.object({
  roles: z.array(zModuleRole),
});

// Input schemas for mutations
export const zAssignModuleRoleInput = z.object({
  userId: z.string(),
  moduleId: z.string(),
  role: z.string(),
});

export type AssignModuleRoleInput = z.infer<typeof zAssignModuleRoleInput>;

export const zRemoveModuleRoleInput = z.object({
  userId: z.string(),
  moduleId: z.string(),
});

export type RemoveModuleRoleInput = z.infer<typeof zRemoveModuleRoleInput>;
