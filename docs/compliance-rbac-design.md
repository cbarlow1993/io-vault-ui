# Compliance Module RBAC Design

## Executive Summary

This document outlines the recommended role-based access control (RBAC) design for the Compliance module, ensuring proper separation of duties between vault administration and compliance operations.

---

## Role Scoping Model

Roles are scoped differently depending on the module:

| Module | Scope | Implication |
|--------|-------|-------------|
| **Compliance** | Organization | Role applies to ALL workspaces in the org |
| **Identities** | Organization | Role applies to ALL workspaces in the org |
| **Vaults** | Workspace | Role is specific to a single workspace |
| **Address Book** | Workspace | Role is specific to a single workspace |

### Why This Matters

- A **Compliance Analyst** reviews transactions from ALL workspaces in the organization
- A **Vault Admin** only manages vaults in their assigned workspace(s)
- This prevents workspace-level vault admins from having automatic compliance access
- Compliance has org-wide visibility to detect cross-workspace patterns

## Current State Analysis

### Existing Permission Structure

The codebase uses Better Auth's statement-based permission system:

```typescript
// Current: src/features/auth/permissions.ts
const statement = {
  compliance: [
    'view',
    'reviewL1',
    'reviewL2',
    'manageWatchlist',
    'generateReports',
    'configureAlerts',
    'manageIntegrations',
  ],
} as const;
```

### Current Issues

1. **Only 2 roles exist**: `user` and `admin`
2. **Admin has all permissions**: No separation between vault admin and compliance admin
3. **No maker-checker enforcement**: L1 and L2 reviewers not properly separated
4. **No audit-specific role**: Auditors need read-only access without action capabilities

---

## Recommended Role Structure

### 1. Module-Level Separation

```
┌─────────────────────────────────────────────────────────────┐
│                    Organization Admin                        │
│         (Platform-level, not module-specific)               │
└─────────────────────────────────────────────────────────────┘
              │                              │
              ▼                              ▼
┌─────────────────────────┐    ┌─────────────────────────────┐
│    VAULT MODULE         │    │    COMPLIANCE MODULE        │
├─────────────────────────┤    ├─────────────────────────────┤
│ • Vault Admin           │    │ • Compliance Admin          │
│ • Vault Manager         │    │ • Compliance Officer (L2)   │
│ • Vault Viewer          │    │ • Compliance Analyst (L1)   │
│ • Signer Admin          │    │ • Compliance Viewer         │
│                         │    │ • Compliance Auditor        │
└─────────────────────────┘    └─────────────────────────────┘
```

### 2. Compliance-Specific Roles

| Role | Description | Use Case |
|------|-------------|----------|
| **Compliance Viewer** | Read-only access to all compliance data | Business stakeholders, executives |
| **Compliance Analyst (L1)** | First-line transaction review | Day-to-day transaction screening |
| **Compliance Officer (L2)** | Escalated review, final decisions | Senior compliance staff |
| **Compliance Admin** | Configure rules, thresholds, integrations | Compliance team leads |
| **Compliance Auditor** | Full read access including audit logs | Internal/external auditors |

### 3. Permission Matrix

```
Permission              │ Viewer │ Analyst│ Officer│ Admin │ Auditor
                        │        │  (L1)  │  (L2)  │       │
────────────────────────┼────────┼────────┼────────┼───────┼────────
view                    │   ✓    │   ✓    │   ✓    │   ✓   │   ✓
reviewL1                │        │   ✓    │        │       │
reviewL2                │        │        │   ✓    │       │
escalateToL2            │        │   ✓    │        │       │
addNotes                │        │   ✓    │   ✓    │   ✓   │
manageWatchlist         │        │        │   ✓    │   ✓   │
generateReports         │        │        │   ✓    │   ✓   │   ✓
configureAlerts         │        │        │        │   ✓   │
configureRules          │        │        │        │   ✓   │
manageIntegrations      │        │        │        │   ✓   │
viewAuditLogs           │        │        │        │   ✓   │   ✓
exportData              │        │        │   ✓    │   ✓   │   ✓
```

---

## Implementation Approach

### Step 1: Extend Role Enum

```typescript
// src/server/db/generated/enums.ts
export const UserRole = {
  // Platform roles
  user: 'user',
  admin: 'admin',

  // Vault module roles
  vaultAdmin: 'vault_admin',
  vaultManager: 'vault_manager',
  vaultViewer: 'vault_viewer',
  signerAdmin: 'signer_admin',

  // Compliance module roles
  complianceAdmin: 'compliance_admin',
  complianceOfficer: 'compliance_officer',
  complianceAnalyst: 'compliance_analyst',
  complianceViewer: 'compliance_viewer',
  complianceAuditor: 'compliance_auditor',
} as const;
```

### Step 2: Update Permission Statements

```typescript
// src/features/auth/permissions.ts
const statement = {
  // ... existing statements

  compliance: [
    'view',
    'reviewL1',
    'reviewL2',
    'escalateToL2',
    'addNotes',
    'manageWatchlist',
    'generateReports',
    'configureAlerts',
    'configureRules',
    'manageIntegrations',
    'viewAuditLogs',
    'exportData',
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
  ],
} as const;

// Role definitions
const complianceViewer = createAccessControl(statement, {
  compliance: ['view'],
});

const complianceAnalyst = createAccessControl(statement, {
  compliance: ['view', 'reviewL1', 'escalateToL2', 'addNotes'],
});

const complianceOfficer = createAccessControl(statement, {
  compliance: [
    'view',
    'reviewL2',
    'addNotes',
    'manageWatchlist',
    'generateReports',
    'exportData',
  ],
});

const complianceAdmin = createAccessControl(statement, {
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

const complianceAuditor = createAccessControl(statement, {
  compliance: ['view', 'generateReports', 'viewAuditLogs', 'exportData'],
});
```

### Step 3: Multi-Role Support with Scoping

Users have roles at different scopes depending on the module:

```typescript
// Organization-scoped roles (Compliance, Identities)
model UserOrgRole {
  id           String   @id @default(cuid())
  userId       String
  orgId        String
  module       String   // 'compliance' | 'identities'
  role         String   // module-specific role
  assignedBy   String
  assignedAt   DateTime @default(now())

  user         User         @relation(fields: [userId], references: [id])
  organization Organization @relation(fields: [orgId], references: [id])

  @@unique([userId, orgId, module])  // One role per module per org
}

// Workspace-scoped roles (Vaults, Address Book)
model UserWorkspaceRole {
  id           String   @id @default(cuid())
  userId       String
  workspaceId  String
  module       String   // 'vault' | 'addressBook'
  role         String   // module-specific role
  assignedBy   String
  assignedAt   DateTime @default(now())

  user         User      @relation(fields: [userId], references: [id])
  workspace    Workspace @relation(fields: [workspaceId], references: [id])

  @@unique([userId, workspaceId, module])  // One role per module per workspace
}
```

### Example: User Role Assignment

```typescript
// Jane's roles across the organization
const janeRoles = {
  // Org-scoped (same across all workspaces)
  compliance: 'L2 Officer',      // Reviews transactions from ALL workspaces
  identities: 'Viewer',          // Views identities across org

  // Workspace-scoped (can differ per workspace)
  workspaces: {
    'Treasury Operations': {
      vault: 'Admin',            // Full vault control
      addressBook: 'Manager',
    },
    'Investment Portfolio': {
      vault: 'Viewer',           // Read-only in this workspace
      addressBook: 'Viewer',
    },
  },
};
```

---

## Separation of Duties Rules

### 1. Vault Admin ≠ Compliance Admin

A user with `vault_admin` role should NOT automatically have any compliance permissions beyond `view`. This prevents:
- Vault admins from approving their own suspicious transactions
- Conflicts of interest in transaction review

### 2. L1 Reviewer ≠ L2 Reviewer

A user should NOT have both `reviewL1` and `reviewL2` permissions simultaneously:

```typescript
// Enforcement logic
function validateRoleAssignment(userId: string, newRole: ComplianceRole) {
  const currentRoles = getUserComplianceRoles(userId);

  if (newRole === 'compliance_analyst' && currentRoles.includes('compliance_officer')) {
    throw new Error('User cannot be both L1 and L2 reviewer');
  }

  if (newRole === 'compliance_officer' && currentRoles.includes('compliance_analyst')) {
    throw new Error('User cannot be both L1 and L2 reviewer');
  }
}
```

### 3. Self-Review Prevention

Users should not review transactions they initiated:

```typescript
// Transaction review guard
function canReviewTransaction(userId: string, transaction: Transaction) {
  // Cannot review own transactions
  if (transaction.initiatedBy === userId) {
    return false;
  }

  // L1 reviewer cannot review if they already added notes
  if (hasUserReviewedAsL1(userId, transaction.id)) {
    return false;
  }

  return true;
}
```

### 4. Four-Eyes Principle

Critical compliance actions should require approval from multiple parties:

| Action | Required Approvals |
|--------|-------------------|
| Approve high-risk transaction | L1 + L2 review |
| Add address to watchlist | 1 Compliance Officer |
| Remove from watchlist | 2 Compliance Officers |
| Modify alert thresholds | Compliance Admin + confirmation |
| Export sensitive data | Compliance Admin + audit log |

---

## UI Implementation

### Permission-Based UI Components

```tsx
// Example: Transaction detail page with permission guards
<PageLayout>
  <PageLayoutTopBar
    endActions={
      <div className="flex items-center gap-3">
        <WithPermissions permissions={[{ compliance: 'reviewL1' }]}>
          <button onClick={() => setIsApproveModalOpen(true)}>
            Approve (L1)
          </button>
          <button onClick={() => setIsEscalateModalOpen(true)}>
            Escalate to L2
          </button>
        </WithPermissions>

        <WithPermissions permissions={[{ compliance: 'reviewL2' }]}>
          <button onClick={() => setIsApproveModalOpen(true)}>
            Approve (L2)
          </button>
          <button onClick={() => setIsRejectModalOpen(true)}>
            Reject
          </button>
        </WithPermissions>

        <WithPermissions permissions={[{ compliance: 'addNotes' }]}>
          <button>Add Note</button>
        </WithPermissions>
      </div>
    }
  />
</PageLayout>
```

### Role Indicator in UI

Show users their current compliance role:

```tsx
<PageLayoutTopBar>
  <PageLayoutTopBarTitle>Compliance Dashboard</PageLayoutTopBarTitle>
  <RoleBadge role={userComplianceRole} />
</PageLayoutTopBar>
```

---

## Audit Requirements

### Audit Log Events

All compliance actions should be logged:

```typescript
interface ComplianceAuditEvent {
  id: string;
  timestamp: Date;
  userId: string;
  userRole: ComplianceRole;
  action: ComplianceAction;
  targetType: 'transaction' | 'address' | 'alert' | 'rule' | 'watchlist';
  targetId: string;
  previousState?: object;
  newState?: object;
  ipAddress: string;
  userAgent: string;
}

type ComplianceAction =
  | 'view_transaction'
  | 'approve_l1'
  | 'approve_l2'
  | 'reject'
  | 'escalate'
  | 'add_note'
  | 'add_to_watchlist'
  | 'remove_from_watchlist'
  | 'modify_alert_rule'
  | 'generate_report'
  | 'export_data';
```

### Retention Policy

- Audit logs: Minimum 7 years (regulatory requirement)
- Transaction review history: Permanent
- User role change history: Permanent

---

## Migration Strategy

### Phase 1: Add New Roles (Non-Breaking)
1. Add new role enums to database
2. Add `UserModuleRole` table
3. Update permission statements
4. Default: Existing admins get `compliance_viewer` for backwards compatibility

### Phase 2: Role Assignment UI
1. Add role management UI in Settings
2. Allow org admins to assign compliance-specific roles
3. Implement role validation rules

### Phase 3: Enforce Separation
1. Remove automatic admin → compliance_admin mapping
2. Require explicit compliance role assignment
3. Enable audit logging for all compliance actions

### Phase 4: Advanced Features
1. Role request/approval workflow
2. Temporary elevated permissions with expiry
3. Delegation capabilities for leave coverage

---

## Summary

The key principles for compliance RBAC:

1. **Module isolation**: Vault permissions ≠ Compliance permissions
2. **Role specificity**: 5 distinct compliance roles with clear boundaries
3. **Maker-checker separation**: L1 and L2 reviewers cannot be the same person
4. **Self-review prevention**: Cannot review own transactions
5. **Full audit trail**: Every action logged with context
6. **Four-eyes principle**: Critical actions require multiple approvals

This design ensures regulatory compliance while maintaining operational flexibility.
