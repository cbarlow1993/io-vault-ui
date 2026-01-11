/**
 * EXAMPLE: Extended Permissions Configuration for Compliance Module
 *
 * This file demonstrates how to extend the current permissions.ts
 * to support compliance-specific roles with proper separation of duties.
 *
 * DO NOT use this file directly - it's a reference implementation.
 */

import {
  createAccessControl,
  Role as BetterAuthRole,
} from 'better-auth/plugins/access';
import { adminAc, defaultStatements } from 'better-auth/plugins/admin/access';
import { z } from 'zod';

// =============================================================================
// STEP 1: Extended Statement Definitions
// =============================================================================

const statement = {
  ...defaultStatements,

  // Account permissions (existing)
  account: ['read', 'update'],

  // App access permissions (existing)
  apps: ['app', 'manager'],

  // ==========================================================================
  // VAULT MODULE PERMISSIONS (new)
  // ==========================================================================
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

  // ==========================================================================
  // COMPLIANCE MODULE PERMISSIONS (extended)
  // ==========================================================================
  compliance: [
    // Read access
    'view',
    'viewAuditLogs',

    // Review actions
    'reviewL1', // First-line review
    'reviewL2', // Escalated review
    'escalateToL2', // Escalate transaction

    // Operational actions
    'addNotes',
    'manageWatchlist',
    'generateReports',
    'exportData',

    // Administrative actions
    'configureAlerts',
    'configureRules',
    'manageIntegrations',
  ],
} as const;

const ac = createAccessControl(statement);

// =============================================================================
// STEP 2: Role Definitions
// =============================================================================

// -----------------------------------------------------------------------------
// Platform Roles (existing, modified)
// -----------------------------------------------------------------------------

/**
 * Basic user - minimal access
 */
const user = ac.newRole({
  account: ['update'],
  apps: ['app'],
  // No vault or compliance permissions by default
});

/**
 * Platform admin - manages platform settings, NOT module-specific
 * IMPORTANT: Does NOT automatically get vault or compliance admin
 */
const admin = ac.newRole({
  ...adminAc.statements,
  account: ['update'],
  apps: ['app', 'manager'],
  // Platform admins can VIEW but not ACT on vault/compliance
  vault: ['view'],
  compliance: ['view'],
});

// -----------------------------------------------------------------------------
// Vault Module Roles (new)
// -----------------------------------------------------------------------------

/**
 * Vault Viewer - Read-only access to vault information
 */
const vaultViewer = ac.newRole({
  account: ['update'],
  apps: ['app'],
  vault: ['view'],
});

/**
 * Vault Manager - Can manage vaults but not signers
 */
const vaultManager = ac.newRole({
  account: ['update'],
  apps: ['app', 'manager'],
  vault: [
    'view',
    'create',
    'update',
    'manageWhitelist',
    'initiateTransactions',
  ],
});

/**
 * Vault Admin - Full vault control including signers
 */
const vaultAdmin = ac.newRole({
  account: ['update'],
  apps: ['app', 'manager'],
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

// -----------------------------------------------------------------------------
// Compliance Module Roles (new)
// -----------------------------------------------------------------------------

/**
 * Compliance Viewer - Read-only access
 * Use case: Executives, stakeholders who need visibility
 */
const complianceViewer = ac.newRole({
  account: ['update'],
  apps: ['app'],
  compliance: ['view'],
});

/**
 * Compliance Analyst (L1) - First-line transaction review
 * Use case: Day-to-day transaction screening
 *
 * CANNOT:
 * - Perform L2 review (separation of duties)
 * - Manage watchlist
 * - Configure alerts/rules
 */
const complianceAnalyst = ac.newRole({
  account: ['update'],
  apps: ['app', 'manager'],
  compliance: ['view', 'reviewL1', 'escalateToL2', 'addNotes'],
});

/**
 * Compliance Officer (L2) - Escalated review and decisions
 * Use case: Senior compliance staff, final approvers
 *
 * CANNOT:
 * - Perform L1 review (separation of duties)
 * - Configure rules/integrations (admin only)
 */
const complianceOfficer = ac.newRole({
  account: ['update'],
  apps: ['app', 'manager'],
  compliance: [
    'view',
    'reviewL2',
    'addNotes',
    'manageWatchlist',
    'generateReports',
    'exportData',
  ],
});

/**
 * Compliance Admin - Configure compliance module
 * Use case: Compliance team leads, system configuration
 *
 * CANNOT:
 * - Perform L1 or L2 review (separation of duties)
 * - This prevents admins from both setting rules AND reviewing transactions
 */
const complianceAdmin = ac.newRole({
  account: ['update'],
  apps: ['app', 'manager'],
  compliance: [
    'view',
    'addNotes',
    'manageWatchlist',
    'generateReports',
    'configureAlerts',
    'configureRules',
    'manageIntegrations',
    'viewAuditLogs',
    'exportData',
  ],
});

/**
 * Compliance Auditor - Full read access for audit purposes
 * Use case: Internal/external auditors
 *
 * CANNOT:
 * - Take any action (review, approve, reject)
 * - Modify any configuration
 * - Full read-only with export capability
 */
const complianceAuditor = ac.newRole({
  account: ['update'],
  apps: ['app'],
  compliance: ['view', 'viewAuditLogs', 'generateReports', 'exportData'],
});

// =============================================================================
// STEP 3: Role Registry
// =============================================================================

export const rolesNames = [
  // Platform roles
  'admin',
  'user',
  // Vault roles
  'vaultViewer',
  'vaultManager',
  'vaultAdmin',
  // Compliance roles
  'complianceViewer',
  'complianceAnalyst',
  'complianceOfficer',
  'complianceAdmin',
  'complianceAuditor',
] as const;

export type Role = (typeof rolesNames)[number];

const roles = {
  // Platform
  admin,
  user,
  // Vault
  vaultViewer,
  vaultManager,
  vaultAdmin,
  // Compliance
  complianceViewer,
  complianceAnalyst,
  complianceOfficer,
  complianceAdmin,
  complianceAuditor,
} satisfies Record<Role, BetterAuthRole>;

export const permissions = {
  ac,
  roles,
};

// =============================================================================
// STEP 4: Role Validation Utilities
// =============================================================================

/**
 * Validates that a user doesn't have conflicting roles
 * (e.g., cannot be both L1 and L2 reviewer)
 */
export function validateRoleCombination(roles: Role[]): {
  valid: boolean;
  error?: string;
} {
  const hasL1 = roles.includes('complianceAnalyst');
  const hasL2 = roles.includes('complianceOfficer');

  if (hasL1 && hasL2) {
    return {
      valid: false,
      error:
        'User cannot have both L1 (Analyst) and L2 (Officer) compliance roles. This violates separation of duties.',
    };
  }

  // Compliance Admin should not also be a reviewer
  const hasComplianceAdmin = roles.includes('complianceAdmin');
  if (hasComplianceAdmin && (hasL1 || hasL2)) {
    return {
      valid: false,
      error:
        'Compliance Admin cannot also be a reviewer. This violates separation of duties.',
    };
  }

  return { valid: true };
}

/**
 * Gets the effective compliance role for a user
 * (handles multi-role scenarios)
 */
export function getEffectiveComplianceRole(roles: Role[]): Role | null {
  // Priority order for compliance roles
  const complianceRolePriority: Role[] = [
    'complianceAdmin',
    'complianceOfficer',
    'complianceAnalyst',
    'complianceAuditor',
    'complianceViewer',
  ];

  for (const role of complianceRolePriority) {
    if (roles.includes(role)) {
      return role;
    }
  }

  return null;
}

// =============================================================================
// STEP 5: Permission Check Helpers
// =============================================================================

export type CompliancePermission = (typeof statement.compliance)[number];
export type VaultPermission = (typeof statement.vault)[number];

/**
 * Check if user can perform a compliance action
 */
export function canPerformComplianceAction(
  userRoles: Role[],
  action: CompliancePermission
): boolean {
  for (const roleName of userRoles) {
    const role = roles[roleName];
    const compliancePerms = role.statements.compliance;
    if (compliancePerms && compliancePerms.includes(action)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if user can review a specific transaction
 * Includes self-review prevention
 */
export function canReviewTransaction(
  userId: string,
  userRoles: Role[],
  transaction: {
    initiatedBy: string;
    status: 'pending_l1' | 'pending_l2' | string;
    reviewedByL1?: string;
  }
): { canReview: boolean; reason?: string } {
  // Self-review prevention
  if (transaction.initiatedBy === userId) {
    return {
      canReview: false,
      reason: 'Cannot review transactions you initiated',
    };
  }

  // Check if already reviewed as L1
  if (
    transaction.status === 'pending_l2' &&
    transaction.reviewedByL1 === userId
  ) {
    return {
      canReview: false,
      reason: 'Cannot perform L2 review on transactions you reviewed as L1',
    };
  }

  // Check permission based on transaction status
  if (transaction.status === 'pending_l1') {
    if (!canPerformComplianceAction(userRoles, 'reviewL1')) {
      return {
        canReview: false,
        reason: 'You do not have L1 review permission',
      };
    }
  } else if (transaction.status === 'pending_l2') {
    if (!canPerformComplianceAction(userRoles, 'reviewL2')) {
      return {
        canReview: false,
        reason: 'You do not have L2 review permission',
      };
    }
  }

  return { canReview: true };
}

// =============================================================================
// STEP 6: UI Permission Types
// =============================================================================

/**
 * Permission object format for WithPermissions component
 */
export type PermissionCheck =
  | { compliance: CompliancePermission }
  | { vault: VaultPermission }
  | { apps: 'app' | 'manager' };

/**
 * Common permission checks for UI components
 */
export const COMPLIANCE_UI_PERMISSIONS = {
  canViewDashboard: { compliance: 'view' } as PermissionCheck,
  canReviewL1: { compliance: 'reviewL1' } as PermissionCheck,
  canReviewL2: { compliance: 'reviewL2' } as PermissionCheck,
  canEscalate: { compliance: 'escalateToL2' } as PermissionCheck,
  canAddNotes: { compliance: 'addNotes' } as PermissionCheck,
  canManageWatchlist: { compliance: 'manageWatchlist' } as PermissionCheck,
  canGenerateReports: { compliance: 'generateReports' } as PermissionCheck,
  canConfigureAlerts: { compliance: 'configureAlerts' } as PermissionCheck,
  canConfigureRules: { compliance: 'configureRules' } as PermissionCheck,
  canViewAuditLogs: { compliance: 'viewAuditLogs' } as PermissionCheck,
  canExportData: { compliance: 'exportData' } as PermissionCheck,
};
