import type { PolicyService, PolicyDecision } from './types.js';
import type { RbacRepository, UserModuleRoleInfo } from '@/src/repositories/rbac.repository.js';

/**
 * Local policy service that evaluates access control decisions
 * using the RBAC repository data.
 */
export class LocalPolicyService implements PolicyService {
  constructor(private rbacRepository: RbacRepository) {}

  /**
   * Check if a user has access to perform an action on a module/resource
   */
  async checkAccess(params: {
    userId: string;
    organisationId: string;
    module: string;
    action: string;
    resource?: { vaultId?: string };
  }): Promise<PolicyDecision> {
    const { userId, organisationId, module, action, resource } = params;

    // 1. Fetch user with roles
    const userWithRoles = await this.rbacRepository.getUserWithRoles(userId, organisationId);

    const moduleRole = userWithRoles.moduleRoles.find((role) => role.module === module);

    if (!moduleRole) {
      return {
        allowed: false,
        reason: `No role assigned for module: ${module}`,
      };
    }

    const scopeCheck = this.checkResourceScope(moduleRole, resource);
    if (!scopeCheck.valid) {
      return {
        allowed: false,
        reason: scopeCheck.reason,
      };
    }

    const permissions = await this.rbacRepository.getModuleRolePermissions(module, moduleRole.role);
    const hasPermission = permissions.includes(action);

    // 6. Return decision
    if (hasPermission) {
      return {
        allowed: true,
        reason: 'Permission granted by role',
        matchedRole: `${module}:${moduleRole.role}`,
      };
    }

    return {
      allowed: false,
      reason: `Role ${module}:${moduleRole.role} does not have permission for action: ${action}`,
    };
  }

  /**
   * Check if the resource is within the module role's permitted scope
   *
   * Scope rules:
   * - null scope = module-wide access (no restrictions)
   * - empty vault_ids array = no vault restrictions
   * - vault_ids with values = resource.vaultId must be in the list
   */
  private checkResourceScope(
    moduleRole: UserModuleRoleInfo,
    resource?: { vaultId?: string }
  ): { valid: boolean; reason?: string } {
    const scope = moduleRole.resourceScope;

    // null scope = module-wide access
    if (scope === null) {
      return { valid: true };
    }

    // No resource specified = allow (e.g., list operations that don't target a specific resource)
    if (!resource) {
      return { valid: true };
    }

    // Check vault_ids restriction
    if (scope.vault_ids !== undefined) {
      // Empty array = no vault restrictions
      if (scope.vault_ids.length === 0) {
        return { valid: true };
      }

      // If scope has vault restrictions and resource is specified but has no vaultId
      if (!resource.vaultId) {
        return {
          valid: false,
          reason: 'Resource vaultId required for scoped access',
        };
      }

      // Check if vaultId is in the allowed list
      if (!scope.vault_ids.includes(resource.vaultId)) {
        return {
          valid: false,
          reason: `Resource ${resource.vaultId} is outside of permitted scope`,
        };
      }
    }

    return { valid: true };
  }
}
