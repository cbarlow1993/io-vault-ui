import { z } from 'zod';

export const globalRoleSchema = z.enum(['owner', 'billing', 'admin']);

export const assignGlobalRoleBodySchema = z.object({
  role: globalRoleSchema,
});

export const globalRoleResponseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  organisation_id: z.string(),
  role: globalRoleSchema,
  created_at: z.string(),
});

export const resourceScopeSchema = z
  .object({
    vault_ids: z.array(z.string()).optional(),
  })
  .nullable();

export const assignModuleRoleBodySchema = z.object({
  module_id: z.string(),
  role: z.string(),
  resource_scope: resourceScopeSchema.optional(),
});

export const moduleRoleAssignmentResponseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  module: z.string(),
  role: z.string(),
  resource_scope: resourceScopeSchema,
  granted_by: z.string(),
  created_at: z.string(),
});

export const userWithRolesResponseSchema = z.object({
  user_id: z.string(),
  organisation_id: z.string(),
  global_role: globalRoleSchema.nullable(),
  module_roles: z.array(
    z.object({
      module: z.string(),
      role: z.string(),
      resource_scope: resourceScopeSchema,
    })
  ),
});

// Params schemas
export const orgUserParamsSchema = z.object({
  orgId: z.string(),
  userId: z.string(),
});

export const orgUserModuleParamsSchema = z.object({
  orgId: z.string(),
  userId: z.string(),
  moduleId: z.string(),
});

// Type exports
export type AssignGlobalRoleBody = z.infer<typeof assignGlobalRoleBodySchema>;
export type AssignModuleRoleBody = z.infer<typeof assignModuleRoleBodySchema>;
export type OrgUserParams = z.infer<typeof orgUserParamsSchema>;
export type OrgUserModuleParams = z.infer<typeof orgUserModuleParamsSchema>;
