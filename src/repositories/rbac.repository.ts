import type { Kysely } from 'kysely';
import type { Database, GlobalRole, ResourceScope } from '@/src/lib/database/types.js';

/**
 * Module role information for a user
 */
export interface UserModuleRoleInfo {
  module: string;
  role: string;
  resourceScope: ResourceScope | null;
}

/**
 * User with their global and module roles
 */
export interface UserWithRoles {
  userId: string;
  organisationId: string;
  globalRole: GlobalRole | null;
  moduleRoles: UserModuleRoleInfo[];
}

/**
 * Module information
 */
export interface ModuleInfo {
  id: string;
  name: string;
  displayName: string;
  isActive: boolean;
}

/**
 * Role information
 */
export interface RoleInfo {
  id: string;
  name: string;
  displayName: string;
}

/**
 * Action information
 */
export interface ActionInfo {
  id: string;
  name: string;
  displayName: string;
}

/**
 * Parameters for assigning a module role
 */
export interface AssignModuleRoleParams {
  userId: string;
  organisationId: string;
  moduleId: string;
  moduleRoleId: string;
  resourceScope: ResourceScope | null;
  grantedBy: string;
}

/**
 * Repository interface for RBAC operations
 */
export interface RbacRepository {
  getUserWithRoles(userId: string, organisationId: string): Promise<UserWithRoles>;
  getModuleRolePermissions(moduleName: string, roleName: string): Promise<string[]>;
  getAllRolePermissions(): Promise<Map<string, string[]>>;
  findModuleByName(name: string): Promise<{ id: string; name: string } | null>;
  findModuleRoleByName(moduleId: string, roleName: string): Promise<{ id: string; name: string } | null>;
  assignGlobalRole(userId: string, organisationId: string, role: GlobalRole, grantedBy: string): Promise<void>;
  removeGlobalRole(userId: string, organisationId: string): Promise<boolean>;
  assignModuleRole(params: AssignModuleRoleParams): Promise<void>;
  removeModuleRole(userId: string, organisationId: string, moduleId: string): Promise<boolean>;
  listModules(): Promise<ModuleInfo[]>;
  listModuleRoles(moduleId: string): Promise<RoleInfo[]>;
  listModuleActions(moduleId: string): Promise<ActionInfo[]>;
}

/**
 * PostgreSQL implementation of the RBAC repository
 */
export class PostgresRbacRepository implements RbacRepository {
  constructor(private db: Kysely<Database>) {}

  /**
   * Get a user's global role and module roles for an organisation
   */
  async getUserWithRoles(userId: string, organisationId: string): Promise<UserWithRoles> {
    // Get global role
    const globalRoleResult = await this.db
      .selectFrom('user_global_roles')
      .selectAll()
      .where('user_id', '=', userId)
      .where('organisation_id', '=', organisationId)
      .executeTakeFirst();

    // Get module roles with module and role names via joins
    const moduleRolesResult = await this.db
      .selectFrom('user_module_roles')
      .innerJoin('modules', 'modules.id', 'user_module_roles.module_id')
      .innerJoin('module_roles', 'module_roles.id', 'user_module_roles.module_role_id')
      .select([
        'modules.name as module_name',
        'module_roles.name as role_name',
        'user_module_roles.resource_scope',
      ])
      .where('user_module_roles.user_id', '=', userId)
      .where('user_module_roles.organisation_id', '=', organisationId)
      .execute();

    return {
      userId,
      organisationId,
      globalRole: (globalRoleResult?.role as GlobalRole) ?? null,
      moduleRoles: moduleRolesResult.map((row) => ({
        module: row.module_name,
        role: row.role_name,
        resourceScope: row.resource_scope,
      })),
    };
  }

  /**
   * Get the list of action names that a module role can perform
   */
  async getModuleRolePermissions(moduleName: string, roleName: string): Promise<string[]> {
    const result = await this.db
      .selectFrom('module_role_permissions')
      .innerJoin('module_roles', 'module_roles.id', 'module_role_permissions.module_role_id')
      .innerJoin('modules', 'modules.id', 'module_roles.module_id')
      .innerJoin('module_actions', 'module_actions.id', 'module_role_permissions.action_id')
      .select(['module_actions.name as action_name'])
      .where('modules.name', '=', moduleName)
      .where('module_roles.name', '=', roleName)
      .execute();

    return result.map((row) => row.action_name);
  }

  /**
   * Get all role permissions as a map of "module:role" -> action names
   */
  async getAllRolePermissions(): Promise<Map<string, string[]>> {
    const result = await this.db
      .selectFrom('module_role_permissions')
      .innerJoin('module_roles', 'module_roles.id', 'module_role_permissions.module_role_id')
      .innerJoin('modules', 'modules.id', 'module_roles.module_id')
      .innerJoin('module_actions', 'module_actions.id', 'module_role_permissions.action_id')
      .select([
        'modules.name as module_name',
        'module_roles.name as role_name',
        'module_actions.name as action_name',
      ])
      .execute();

    const permissionsMap = new Map<string, string[]>();

    for (const row of result) {
      const key = `${row.module_name}:${row.role_name}`;
      const existing = permissionsMap.get(key) ?? [];
      existing.push(row.action_name);
      permissionsMap.set(key, existing);
    }

    return permissionsMap;
  }

  /**
   * Find a module by name
   */
  async findModuleByName(name: string): Promise<{ id: string; name: string } | null> {
    const result = await this.db
      .selectFrom('modules')
      .select(['id', 'name'])
      .where('name', '=', name)
      .executeTakeFirst();

    return result ?? null;
  }

  /**
   * Find a module role by name within a module
   */
  async findModuleRoleByName(
    moduleId: string,
    roleName: string
  ): Promise<{ id: string; name: string } | null> {
    const result = await this.db
      .selectFrom('module_roles')
      .select(['id', 'name'])
      .where('module_id', '=', moduleId)
      .where('name', '=', roleName)
      .executeTakeFirst();

    return result ?? null;
  }

  /**
   * Assign a global role to a user in an organisation
   */
  async assignGlobalRole(
    userId: string,
    organisationId: string,
    role: GlobalRole,
    grantedBy: string
  ): Promise<void> {
    await this.db
      .insertInto('user_global_roles')
      .values({
        user_id: userId,
        organisation_id: organisationId,
        role,
        granted_by: grantedBy,
      })
      .onConflict((oc) =>
        oc.columns(['user_id', 'organisation_id']).doUpdateSet({
          role,
          granted_by: grantedBy,
        })
      )
      .executeTakeFirst();
  }

  /**
   * Remove a global role from a user in an organisation
   * @returns true if a role was removed, false if no role existed
   */
  async removeGlobalRole(userId: string, organisationId: string): Promise<boolean> {
    const result = await this.db
      .deleteFrom('user_global_roles')
      .where('user_id', '=', userId)
      .where('organisation_id', '=', organisationId)
      .executeTakeFirst();

    return (result?.numDeletedRows ?? 0n) > 0n;
  }

  /**
   * Assign a module role to a user
   */
  async assignModuleRole(params: AssignModuleRoleParams): Promise<void> {
    await this.db
      .insertInto('user_module_roles')
      .values({
        user_id: params.userId,
        organisation_id: params.organisationId,
        module_id: params.moduleId,
        module_role_id: params.moduleRoleId,
        resource_scope: params.resourceScope ? JSON.stringify(params.resourceScope) : null,
        granted_by: params.grantedBy,
      })
      .onConflict((oc) =>
        oc.columns(['user_id', 'organisation_id', 'module_id']).doUpdateSet({
          module_role_id: params.moduleRoleId,
          resource_scope: params.resourceScope ? JSON.stringify(params.resourceScope) : null,
          granted_by: params.grantedBy,
        })
      )
      .executeTakeFirst();
  }

  /**
   * Remove a module role from a user
   * @returns true if a role was removed, false if no role existed
   */
  async removeModuleRole(
    userId: string,
    organisationId: string,
    moduleId: string
  ): Promise<boolean> {
    const result = await this.db
      .deleteFrom('user_module_roles')
      .where('user_id', '=', userId)
      .where('organisation_id', '=', organisationId)
      .where('module_id', '=', moduleId)
      .executeTakeFirst();

    return (result?.numDeletedRows ?? 0n) > 0n;
  }

  /**
   * List all modules
   */
  async listModules(): Promise<ModuleInfo[]> {
    const result = await this.db
      .selectFrom('modules')
      .select(['id', 'name', 'display_name', 'is_active'])
      .execute();

    return result.map((row) => ({
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      isActive: row.is_active,
    }));
  }

  /**
   * List all roles for a module
   */
  async listModuleRoles(moduleId: string): Promise<RoleInfo[]> {
    const result = await this.db
      .selectFrom('module_roles')
      .select(['id', 'name', 'display_name'])
      .where('module_id', '=', moduleId)
      .execute();

    return result.map((row) => ({
      id: row.id,
      name: row.name,
      displayName: row.display_name,
    }));
  }

  /**
   * List all actions for a module
   */
  async listModuleActions(moduleId: string): Promise<ActionInfo[]> {
    const result = await this.db
      .selectFrom('module_actions')
      .select(['id', 'name', 'display_name'])
      .where('module_id', '=', moduleId)
      .execute();

    return result.map((row) => ({
      id: row.id,
      name: row.name,
      displayName: row.display_name,
    }));
  }
}
