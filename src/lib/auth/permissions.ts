import { z } from 'zod';

/**
 * Access control statements defining all possible permissions in the system.
 * Each key is a resource, and the array contains allowed actions on that resource.
 *
 * TODO: Re-implement permission checking when vault API is integrated
 * This currently only provides types; actual permission checking is disabled.
 */
const statement = {
  user: [
    'create',
    'read',
    'update',
    'delete',
    'list',
    'set-role',
    'ban',
    'impersonate',
  ],
  session: ['create', 'read', 'update', 'delete', 'list', 'revoke'],
  account: ['read', 'update'],
  apps: ['app', 'manager'],
  compliance: [
    'view',
    'reviewL1',
    'reviewL2',
    'manageWatchlist',
    'generateReports',
    'configureAlerts',
    'manageIntegrations',
  ],
  vault: [
    'view',
    'create',
    'update',
    'delete',
    'manageSigners',
    'manageWhitelist',
    'initiateTransactions',
    'approveTransactions',
    'viewAuditLogs',
  ],
} as const;

/**
 * Permission type derived from the statement object.
 * Each permission is a partial record of resource -> action.
 */
export type Permission = {
  [K in keyof typeof statement]?: (typeof statement)[K][number];
};

/**
 * Role type - the available roles in the system.
 */
export type Role = 'admin' | 'user';
export const rolesNames = ['admin', 'user'] as const;
export const zRole: () => z.ZodType<Role> = () => z.enum(rolesNames);

/**
 * Role permissions mapping.
 * TODO: Re-implement with vault API RBAC
 */
const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    // Admin has all permissions
    { user: 'create' },
    { user: 'read' },
    { user: 'update' },
    { user: 'delete' },
    { user: 'list' },
    { user: 'set-role' },
    { user: 'ban' },
    { user: 'impersonate' },
    { session: 'create' },
    { session: 'read' },
    { session: 'update' },
    { session: 'delete' },
    { session: 'list' },
    { session: 'revoke' },
    { account: 'read' },
    { account: 'update' },
    { apps: 'app' },
    { apps: 'manager' },
    { compliance: 'view' },
    { compliance: 'reviewL1' },
    { compliance: 'reviewL2' },
    { compliance: 'manageWatchlist' },
    { compliance: 'generateReports' },
    { compliance: 'configureAlerts' },
    { compliance: 'manageIntegrations' },
    { vault: 'view' },
    { vault: 'create' },
    { vault: 'update' },
    { vault: 'delete' },
    { vault: 'manageSigners' },
    { vault: 'manageWhitelist' },
    { vault: 'initiateTransactions' },
    { vault: 'approveTransactions' },
    { vault: 'viewAuditLogs' },
  ],
  user: [
    // User has basic permissions
    { account: 'update' },
    { apps: 'app' },
    { compliance: 'view' },
    { vault: 'view' },
  ],
};

/**
 * Check if a role has a specific permission.
 * TODO: Re-implement with vault API RBAC
 */
export function checkRolePermission(
  role: Role,
  permission: Permission
): boolean {
  const permissions = rolePermissions[role] || [];
  return permissions.some((p) => {
    const [resource, action] = Object.entries(permission)[0] || [];
    if (!resource || !action) return false;
    const pResource = Object.keys(p)[0];
    const pAction = Object.values(p)[0];
    return pResource === resource && pAction === action;
  });
}

/**
 * Permissions object for backward compatibility.
 * TODO: Remove when better-auth is fully removed
 */
export const permissions = {
  checkRolePermission,
  roles: rolesNames,
};

export type Statement = typeof statement;
