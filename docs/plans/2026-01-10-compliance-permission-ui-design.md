# Compliance Permission UI Design

## Overview

Frontend design for displaying and managing RBAC permissions in the compliance module. Ensures users understand their role, see appropriate actions, and receive clear feedback when access is restricted.

---

## Role Scoping Model

Roles are scoped at different levels:

| Module | Scope | UI Implication |
|--------|-------|----------------|
| **Compliance** | Organization | Same role shown regardless of workspace |
| **Identities** | Organization | Same role shown regardless of workspace |
| **Vaults** | Workspace | Role may change when switching workspaces |
| **Address Book** | Workspace | Role may change when switching workspaces |

---

## 1. Role Indicators

### Location: Profile Dropdown Menu

Role information appears in the NavUser dropdown menu (one click from sidebar footer). Roles are grouped by scope.

```
┌─────────────────────────────────────┐
│  ┌──┐                               │
│  │JD│  J. Doe              ▼        │  ← Click to open
│  └──┘                               │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  ORGANIZATION ROLES                 │  ← Org-scoped (apply everywhere)
│  ┌─────────────────────────────────┐│
│  │ Compliance        L1 Analyst    ││
│  │ Identities        Viewer        ││
│  └─────────────────────────────────┘│
│─────────────────────────────────────│
│  WORKSPACE ROLES                    │  ← Current workspace only
│  Treasury Operations                │  ← Shows active workspace name
│  ┌─────────────────────────────────┐│
│  │ Vaults            Admin         ││
│  │ Address Book      Manager       ││
│  └─────────────────────────────────┘│
│─────────────────────────────────────│
│  👤  Profile                        │
│  🌙  Dark Mode                      │
│─────────────────────────────────────│
│  ↪  Sign Out                        │
└─────────────────────────────────────┘
```

### Visual Styling (treasury-6)

```tsx
// Section header
<div className="text-[10px] font-medium uppercase tracking-wider text-neutral-400 px-2 py-1">
  Your Roles
</div>

// Role rows
<div className="flex justify-between px-2 py-1.5 text-xs">
  <span className="text-neutral-600">Compliance</span>
  <span className="text-neutral-900 font-medium">L1 Analyst</span>
</div>
```

---

## 2. Conditional UI Elements

Actions appear/hide based on role permissions using the existing `WithPermissions` component.

### Transaction Detail Page - Actions by Role

| Role | Visible Actions |
|------|-----------------|
| L1 Analyst | Approve, Reject, Escalate to L2, Request Info |
| L2 Officer | Approve, Reject, Request Info |
| Viewer | None |
| Admin | Configure (no review actions) |
| Auditor | None |

### Dashboard - Visible Sections by Role

| Section | Visible To |
|---------|------------|
| Metrics cards | Everyone with `view` permission |
| Pending queue | L1 + L2 only |
| My reviewed today | L1 + L2 only |
| Alert configuration | Admin only |
| Audit log panel | Admin + Auditor only |

### Implementation Pattern

```tsx
<PageLayoutTopBar
  endActions={
    <div className="flex items-center gap-3">
      <WithPermissions permissions={[{ compliance: 'reviewL1' }]}>
        <Button onClick={() => setIsApproveModalOpen(true)}>Approve</Button>
        <Button onClick={() => setIsRejectModalOpen(true)}>Reject</Button>
        <Button onClick={() => setIsEscalateModalOpen(true)}>Escalate to L2</Button>
      </WithPermissions>

      <WithPermissions permissions={[{ compliance: 'reviewL2' }]}>
        <Button onClick={() => setIsApproveModalOpen(true)}>Approve</Button>
        <Button onClick={() => setIsRejectModalOpen(true)}>Reject</Button>
      </WithPermissions>

      <WithPermissions permissions={[{ compliance: 'addNotes' }]}>
        <Button>Request Info</Button>
      </WithPermissions>
    </div>
  }
/>
```

---

## 3. Permission-Denied States

### 3a. Disabled Buttons with Tooltips

For actions visible but not allowed (e.g., self-review prevention):

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        disabled
        className="h-7 px-3 text-xs font-medium text-neutral-300 cursor-not-allowed"
      >
        Approve
      </button>
    </TooltipTrigger>
    <TooltipContent className="max-w-[200px] rounded-none text-xs">
      You cannot review transactions you initiated
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### 3b. Empty State for Filtered Content

When a section exists but user has no actionable items:

```
┌─────────────────────────────────────────────────────────────────────┐
│ PENDING REVIEW                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                    ┌─────────────────────┐                          │
│                    │   No transactions   │                          │
│                    │   require your      │                          │
│                    │   review            │                          │
│                    │                     │                          │
│                    │   L2 reviews are    │                          │
│                    │   handled by        │                          │
│                    │   Compliance        │                          │
│                    │   Officers          │                          │
│                    └─────────────────────┘                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3c. Full Page Access Denial

When navigating to a route without permission:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Compliance / Settings                                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                         ┌───────────┐                               │
│                         │    🔒     │                               │
│                         └───────────┘                               │
│                                                                     │
│                    ACCESS RESTRICTED                                │
│                                                                     │
│         You don't have permission to access                         │
│         Compliance Settings.                                        │
│                                                                     │
│         Your role: L1 Analyst                                       │
│         Required: Compliance Admin                                  │
│                                                                     │
│                   [ ← Back to Dashboard ]                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Styling (treasury-6)

```tsx
// Access denied page
<div className="flex flex-col items-center justify-center py-16">
  <LockIcon className="size-8 text-neutral-300" />
  <h2 className="mt-4 text-xs font-semibold uppercase tracking-wider text-neutral-900">
    Access Restricted
  </h2>
  <p className="mt-2 text-sm text-neutral-600">
    You don't have permission to access Compliance Settings.
  </p>
  <div className="mt-4 text-xs text-neutral-500">
    <p>Your role: L1 Analyst</p>
    <p>Required: Compliance Admin</p>
  </div>
  <Link
    to="/compliance"
    className="mt-6 h-7 border border-neutral-200 px-3 text-xs font-medium"
  >
    ← Back to Dashboard
  </Link>
</div>
```

---

## 4. Role Management UI

Admin interface for assigning roles to users. Separated by scope.

### 4a. Organization Roles (Settings / Organization / Team)

For org-scoped modules (Compliance, Identities):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Settings / Organization / Team                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ ORGANIZATION MEMBERS                                            [+ Invite]  │
│ Roles apply to all workspaces in Acme Corporation                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ NAME              │ COMPLIANCE      │ IDENTITIES        │ ACTIONS          │
├───────────────────┼─────────────────┼───────────────────┼──────────────────┤
│ Jane Smith        │ L2 Officer      │ Admin             │ [Edit]           │
│ jane@company.com  │                 │                   │                  │
├───────────────────┼─────────────────┼───────────────────┼──────────────────┤
│ Bob Johnson       │ L1 Analyst      │ Viewer            │ [Edit]           │
│ bob@company.com   │                 │                   │                  │
├───────────────────┼─────────────────┼───────────────────┼──────────────────┤
│ Alice Chen        │ Admin           │ —                 │ [Edit]           │
│ alice@company.com │                 │                   │                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4b. Workspace Roles (Settings / Workspace / Team)

For workspace-scoped modules (Vaults, Address Book):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Settings / Workspace / Team                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ WORKSPACE MEMBERS                                               [+ Invite]  │
│ Treasury Operations                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ NAME              │ VAULTS          │ ADDRESS BOOK      │ ACTIONS          │
├───────────────────┼─────────────────┼───────────────────┼──────────────────┤
│ Jane Smith        │ Admin           │ Manager           │ [Edit]           │
│ jane@company.com  │                 │                   │                  │
├───────────────────┼─────────────────┼───────────────────┼──────────────────┤
│ Bob Johnson       │ Viewer          │ Viewer            │ [Edit]           │
│ bob@company.com   │                 │                   │                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

Note: Same user (Jane) can have different vault roles in different workspaces.

### 4c. Edit Organization Roles Modal

For editing org-scoped roles (Compliance, Identities):

```
┌─────────────────────────────────────────────────────────────────┐
│  EDIT ORGANIZATION ROLES                                    ✕   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Jane Smith                                                     │
│  jane@company.com                                               │
│                                                                 │
│  These roles apply to all workspaces in Acme Corporation        │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  COMPLIANCE                                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ L2 Officer                                            ▼ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  IDENTITIES                                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Admin                                                 ▼ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                        [Cancel]              [Save Changes]     │
└─────────────────────────────────────────────────────────────────┘
```

### 4d. Edit Workspace Roles Modal

For editing workspace-scoped roles (Vaults, Address Book):

```
┌─────────────────────────────────────────────────────────────────┐
│  EDIT WORKSPACE ROLES                                       ✕   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Jane Smith                                                     │
│  jane@company.com                                               │
│                                                                 │
│  Roles for: Treasury Operations                                 │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  VAULTS                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Admin                                                 ▼ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ADDRESS BOOK                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Manager                                               ▼ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                        [Cancel]              [Save Changes]     │
└─────────────────────────────────────────────────────────────────┘
```

### 4e. Role Selection Dropdown with Descriptions

```
┌─────────────────────────────────────────────────────────────────┐
│  None                                                           │
│  No compliance access                                           │
├─────────────────────────────────────────────────────────────────┤
│  Viewer                                                         │
│  Read-only access to compliance data                            │
├─────────────────────────────────────────────────────────────────┤
│  L1 Analyst                                                     │
│  First-line transaction review                                  │
├─────────────────────────────────────────────────────────────────┤
│  L2 Officer                                                ✓    │
│  Escalated review, final decisions                              │
├─────────────────────────────────────────────────────────────────┤
│  Admin                                                          │
│  Configure rules, alerts, integrations                          │
├─────────────────────────────────────────────────────────────────┤
│  Auditor                                                        │
│  Full read access including audit logs                          │
└─────────────────────────────────────────────────────────────────┘
```

### 4f. Conflict Validation

| Conflict | Message |
|----------|---------|
| L1 + L2 | "Cannot assign both L1 Analyst and L2 Officer. Separation of duties requires different reviewers." |
| Admin + L1/L2 | "Compliance Admin cannot also be a reviewer. This prevents rule-setters from reviewing transactions." |
| Self-demotion | "You cannot remove your own Admin role. Another admin must make this change." |

### Warning Display

```tsx
<div className="border border-warning-200 bg-warning-50 p-3">
  <div className="flex items-start gap-2">
    <AlertTriangleIcon className="size-4 text-warning-600 shrink-0 mt-0.5" />
    <div>
      <p className="text-xs font-medium text-warning-700">Role conflict detected</p>
      <p className="text-xs text-warning-600 mt-0.5">
        Cannot assign both L1 Analyst and L2 Officer. Separation of duties requires different reviewers.
      </p>
    </div>
  </div>
</div>
```

---

## Component Summary

| Component | Location | Purpose |
|-----------|----------|---------|
| `RoleBadgeSection` | NavUser dropdown | Display user's roles per module |
| `WithPermissions` | Existing | Conditional rendering based on permissions |
| `DisabledActionTooltip` | Transaction detail | Disabled buttons with explanations |
| `EmptyPermissionState` | Dashboard sections | Empty state when no actionable items |
| `AccessDeniedPage` | Route guard | Full page access denial |
| `TeamMemberTable` | Settings/Team | List users with role columns |
| `EditRolesModal` | Settings/Team | Modal for editing user roles |
| `RoleSelect` | EditRolesModal | Dropdown with role descriptions |
| `RoleConflictWarning` | EditRolesModal | Validation error display |

---

## Related Documents

- [Compliance RBAC Design](../compliance-rbac-design.md) - Role definitions and permission matrix
- [Compliance Permissions Example](../compliance-permissions-example.ts) - TypeScript implementation reference
