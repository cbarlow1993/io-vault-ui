import {
  createAccessControl,
  Role as BetterAuthRole,
} from 'better-auth/plugins/access';
import { adminAc, defaultStatements } from 'better-auth/plugins/admin/access';
import { z } from 'zod';

/**
 * Access control statements defining all possible permissions in the system.
 * Each key is a resource, and the array contains allowed actions on that resource.
 */
const statement = {
  ...defaultStatements,
  account: ['read', 'update'],
  apps: ['app', 'manager'],
  book: ['read', 'create', 'update', 'delete'],
  genre: ['read'],
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

const ac = createAccessControl(statement);

/**
 * Standard user role - basic read access to most resources.
 */
const user = ac.newRole({
  account: ['update'],
  apps: ['app'],
  book: ['read'],
  genre: ['read'],
  compliance: ['view'],
  vault: ['view'],
});

/**
 * Admin role - full access to all resources.
 */
const admin = ac.newRole({
  ...adminAc.statements,
  account: ['update'],
  apps: ['app', 'manager'],
  book: ['read', 'create', 'update', 'delete'],
  genre: ['read'],
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
});

// Define roles first
const roles = {
  admin,
  user,
};

// Then derive the type from the roles object
export type Role = keyof typeof roles;
export const rolesNames = ['admin', 'user'] as const;
export const zRole: () => z.ZodType<Role> = () => z.enum(rolesNames);

export const permissions = {
  ac,
  roles: roles as Record<Role, BetterAuthRole>,
};

export type Statement = typeof statement;
