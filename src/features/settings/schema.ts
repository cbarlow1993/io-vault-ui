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

// User with roles response from /v2/organisations/{orgId}/roles/users
export const zUserModuleRoleInfo = z.object({
  role: z.string(),
  resource_scope: z
    .object({
      vault_ids: z.array(z.string()).optional(),
    })
    .nullable(),
});

export const zUserWithRoles = z.object({
  user_id: z.string(),
  global_role: z.enum(['owner', 'billing', 'admin']),
  module_roles: z.record(z.string(), zUserModuleRoleInfo),
});

export type UserWithRoles = z.infer<typeof zUserWithRoles>;

export const zUsersWithRolesResponse = z.object({
  users: z.array(zUserWithRoles),
});

export type UsersWithRolesResponse = z.infer<typeof zUsersWithRolesResponse>;
