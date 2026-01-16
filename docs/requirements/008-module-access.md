# Module Access Management

**Status:** Draft
**Last Updated:** 2026-01-16

## Overview

Owners and Admins can manage user access to modules (Treasury, Compliance, Tokenisation) through a dedicated Module Access page. Users must be explicitly assigned to modules with a specific role - having a Global role alone grants no module access. Each module defines its own roles via the API, and a user can have access to multiple modules but only one role per module. Workspaces are moved from Global to Treasury as a Treasury-specific feature for scoping access to vaults.

## Architecture

### Two-Layer Access Control Model

**Layer 1 - Global Roles** (Organization-wide, managed via Clerk)
| Role | Description |
|------|-------------|
| Owner | Full organization control, can manage everything |
| Admin | Same permissions as Owner for user/module management |
| Billing | Manages billing, subscriptions, payments |
| Member | Base role, no inherent module access |
| Auditor | Read-only compliance access organization-wide |

**Layer 2 - Module Roles** (Per-module, managed via Core API)
- Modules: Treasury, Compliance, Tokenisation
- Each module defines its own roles via `GET /v2/modules/{moduleId}/roles`
- A user can have access to multiple modules
- A user can only have **one role per module**

**Key Constraint:** Global role alone grants no module access. A user with "Member" global role sees nothing until Owner/Admin assigns them to at least one module.

### Data Flow

```
User → Global Role (from Clerk)
     → Module Assignments (from Core API)
         → Treasury Role + Workspace assignments
         → Compliance Role
         → Tokenisation Role
```

## Functional Requirements

### Module Access Page

| ID | Requirement |
|----|-------------|
| **FR-1** | The system shall provide a Module Access page at `/global/module-access` accessible only to users with Owner or Admin global role |
| **FR-2** | The Module Access page shall display summary cards for each module (Treasury, Compliance, Tokenisation) showing user count and role count |
| **FR-3** | Clicking a module summary card shall filter the users table to show only users with access to that module |
| **FR-4** | The Module Access page shall display a table with columns: User, Global Role, Treasury, Compliance, Tokenisation |
| **FR-5** | The Global Role column shall be read-only (display only, not editable on this page) |
| **FR-6** | Each module column shall display the user's assigned role or "—" if no access |
| **FR-7** | The table shall support filtering by: search (name/email), module, and global role |
| **FR-8** | Users with "pending" invitation status shall appear in the table with a "Pending" badge and muted styling |

### Role Assignment

| ID | Requirement |
|----|-------------|
| **FR-9** | Clicking a module cell shall display an inline dropdown with available roles for that module |
| **FR-10** | The dropdown shall include a "No Access" option to remove module assignment |
| **FR-11** | The dropdown shall fetch roles from `GET /v2/modules/{moduleId}/roles` |
| **FR-12** | The currently assigned role shall be indicated with a checkmark in the dropdown |
| **FR-13** | Selecting a role shall call `POST /v2/organisations/{orgId}/users/{userId}/module-roles` |
| **FR-14** | Selecting "No Access" shall call `DELETE /v2/organisations/{orgId}/users/{userId}/module-roles/{moduleId}` |
| **FR-15** | Role changes shall use optimistic updates with rollback on error |
| **FR-16** | A toast notification shall confirm successful role changes |

### Treasury Workspaces

| ID | Requirement |
|----|-------------|
| **FR-17** | Workspaces shall be moved from `/global/workspaces` to `/treasury/workspaces` |
| **FR-18** | The Workspace list page shall display: Name, Description, Members count, Vaults count, Status |
| **FR-19** | Treasury Admins shall be able to create, edit, and delete workspaces |
| **FR-20** | The Workspace detail page shall have Overview and Members tabs |
| **FR-21** | Only users with Treasury module access can be assigned to a workspace |
| **FR-22** | Treasury Admins shall see all workspaces automatically without explicit assignment |
| **FR-23** | Other Treasury roles (Operator, Signer, Viewer, etc.) shall only see workspaces they are explicitly assigned to |
| **FR-24** | Treasury Admins shall be able to assign users to workspaces with a workspace-specific role |

### Navigation Changes

| ID | Requirement |
|----|-------------|
| **FR-25** | The Global module navigation shall include: Users, Module Access, Roles, Teams, Organization, Billing, Audit Log |
| **FR-26** | The Workspaces link shall be removed from Global module navigation |
| **FR-27** | The Treasury module navigation shall include: Overview, Vaults, Workspaces, Policies, Address Book, Settings |

### Permissions

| ID | Requirement |
|----|-------------|
| **FR-28** | Only users with Owner or Admin global role can view the Module Access page |
| **FR-29** | Only users with Owner or Admin global role can assign or remove module roles |
| **FR-30** | Only Treasury Admins can manage workspace member assignments |
| **FR-31** | Owner and Admin shall have identical permissions for module access management |

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | User does not have Owner or Admin role accessing Module Access page | Redirect to home | `FORBIDDEN` | |
| **VR-2** | Assigning role to non-existent user | 404 Not Found | `USER_NOT_FOUND` | |
| **VR-3** | Assigning non-existent role to user | 400 Bad Request | `VALIDATION_ERROR` | `ENUM_VALUE_INVALID` |
| **VR-4** | Assigning user to non-existent module | 400 Bad Request | `VALIDATION_ERROR` | `REFERENCE_NOT_FOUND` |
| **VR-5** | User already has a role in the target module | Update existing role | - | |
| **VR-6** | Removing module access that doesn't exist | 404 Not Found | `MODULE_ROLE_NOT_FOUND` | |
| **VR-7** | Assigning workspace member without Treasury access | 400 Bad Request | `VALIDATION_ERROR` | `REFERENCE_INVALID` |
| **VR-8** | Successful role assignment | 200 OK | - | |
| **VR-9** | Successful role removal | 200 OK | - | |

### Validation Notes

- When a user loses Treasury module access, their workspace assignments should be automatically removed by the API
- Role changes within a module do not affect workspace assignments (user retains workspace access with new role permissions)

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | Module roles shall be cached client-side after initial fetch to avoid repeated API calls |
| **NFR-2** | The Module Access table shall support pagination for organizations with many users |
| **NFR-3** | Role assignment operations shall complete within 2 seconds |
| **NFR-4** | The page shall display a loading skeleton while fetching initial data |
| **NFR-5** | Optimistic updates shall provide immediate visual feedback before API confirmation |

## UI Specifications

### Module Access Page Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ Module Access                                                       │
├─────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐        │
│ │ Treasury        │ │ Compliance      │ │ Tokenisation    │        │
│ │ 12 users        │ │ 5 users         │ │ 3 users         │        │
│ │ 4 roles         │ │ 3 roles         │ │ 2 roles         │        │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘        │
├─────────────────────────────────────────────────────────────────────┤
│ [Search...] [Module ▼] [Global Role ▼]                              │
├─────────────────────────────────────────────────────────────────────┤
│ User           │ Global Role │ Treasury │ Compliance │ Tokenisation │
│────────────────┼─────────────┼──────────┼────────────┼──────────────│
│ John Smith     │ Admin       │ Admin    │ Analyst    │ —            │
│ Jane Doe       │ Member      │ Operator │ —          │ Viewer       │
│ Bob Wilson     │ Member      │ —        │ —          │ —            │
└─────────────────────────────────────────────────────────────────────┘
```

### Inline Role Dropdown

```
┌──────────────────┐
│ No Access        │  ← Removes assignment
│ ─────────────────│
│ ✓ Admin          │  ← Current role (checkmark)
│   Operator       │
│   Signer         │
│   Viewer         │
└──────────────────┘
```

### Visual States

| State | Appearance |
|-------|------------|
| No access | Muted "—" text |
| Has role | Role name badge |
| Hover | Cell highlights with `hover-subtle` |
| Loading | Subtle spinner in cell |
| Error | Cell flashes red, toast appears |
| Pending user | Row muted, "Pending" badge on user |

## API Integration

### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/v2/modules/` | List available modules |
| GET | `/v2/modules/{moduleId}/roles` | Get roles for a module |
| GET | `/v2/organisations/{orgId}/users/{userId}/roles` | Get user's module assignments |
| POST | `/v2/organisations/{orgId}/users/{userId}/module-roles` | Assign module role |
| DELETE | `/v2/organisations/{orgId}/users/{userId}/module-roles/{moduleId}` | Remove module access |

### Request/Response Examples

**Assign Module Role**
```json
POST /v2/organisations/{orgId}/users/{userId}/module-roles
{
  "module_id": "treasury",
  "role": "operator"
}
```

**Response**
```json
{
  "module_id": "treasury",
  "role": "operator",
  "granted_by": "user_abc123",
  "created_at": "2026-01-16T10:30:00Z"
}
```

## Component Structure

### New Components

```
src/features/settings/
├── page-module-access.tsx          # Main page component
├── components/
│   ├── module-summary-cards.tsx    # Top stats cards
│   ├── module-access-table.tsx     # Users × modules table
│   ├── module-role-cell.tsx        # Clickable cell with dropdown
│   └── module-role-dropdown.tsx    # Inline role selector

src/features/treasury/
├── page-workspaces.tsx             # Workspace list (moved)
├── page-workspace-detail.tsx       # Single workspace view
├── components/
│   ├── workspace-members-table.tsx # Members tab content
│   └── add-workspace-member.tsx    # Modal to add members
```

### Data Hooks

```typescript
// Module access
useModules()                      // List modules with roles
useModuleAccessList()             // All users with assignments
useAssignModuleRole()             // Mutation
useRemoveModuleRole()             // Mutation

// Workspaces
useWorkspaces()                   // List workspaces
useWorkspaceMembers(workspaceId)  // Members of a workspace
useAssignWorkspaceMember()        // Mutation
```

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| User with no module access | Shows in table with "—" in all columns, can log in but sees empty module switcher |
| Removing last module access | Allowed, user returns to having only Global role |
| Self-assignment | Owner/Admin can modify their own module access |
| Pending invitations | Appear in table with muted styling, can pre-assign module access |
| Treasury access removed | Workspace assignments automatically removed by API |
| Role change within module | Workspace assignments remain, inherit new role permissions |

## Open Questions

1. Should there be bulk assignment functionality (assign multiple users to a module at once)?
2. Should there be a confirmation dialog when removing module access, especially for Treasury (which cascades to workspace removal)?
3. Should audit log entries be created for module access changes?

---

## Test Plan

### Unit Tests

| Test ID | Component | Test Case |
|---------|-----------|-----------|
| **UT-1** | `module-summary-cards` | Renders correct user and role counts for each module |
| **UT-2** | `module-summary-cards` | Clicking a card calls filter callback with module ID |
| **UT-3** | `module-role-cell` | Displays "—" when user has no access |
| **UT-4** | `module-role-cell` | Displays role badge when user has access |
| **UT-5** | `module-role-dropdown` | Renders all roles from API plus "No Access" option |
| **UT-6** | `module-role-dropdown` | Shows checkmark on currently assigned role |
| **UT-7** | `module-access-table` | Filters by search term (name/email) |
| **UT-8** | `module-access-table` | Filters by module |
| **UT-9** | `module-access-table` | Filters by global role |
| **UT-10** | `module-access-table` | Shows pending badge for pending users |

### Browser Tests

| Test ID | Feature | Test Case |
|---------|---------|-----------|
| **BT-1** | Module Access Page | Page renders with summary cards and table |
| **BT-2** | Module Access Page | Clicking module card filters table |
| **BT-3** | Role Assignment | Clicking cell opens dropdown |
| **BT-4** | Role Assignment | Selecting role updates cell optimistically |
| **BT-5** | Role Assignment | Selecting "No Access" clears cell |
| **BT-6** | Role Assignment | Toast appears after successful change |
| **BT-7** | Role Assignment | Error toast appears on API failure |
| **BT-8** | Permissions | Non-admin users redirected from page |
| **BT-9** | Workspaces | Workspace list renders at `/treasury/workspaces` |
| **BT-10** | Workspaces | Workspace detail shows members tab |

### E2E Tests

| Test ID | Flow | Test Case |
|---------|------|-----------|
| **E2E-1** | Module Access | Admin can navigate to Module Access page |
| **E2E-2** | Module Access | Admin can assign Treasury role to a user |
| **E2E-3** | Module Access | Admin can change existing module role |
| **E2E-4** | Module Access | Admin can remove module access |
| **E2E-5** | Module Access | Member role cannot access Module Access page |
| **E2E-6** | Module Access | Assigned user sees module in navigation |
| **E2E-7** | Workspaces | Treasury Admin can view all workspaces |
| **E2E-8** | Workspaces | Treasury Operator only sees assigned workspaces |
| **E2E-9** | Workspaces | Treasury Admin can assign member to workspace |
| **E2E-10** | Workspaces | Removing Treasury access removes workspace assignments |

### Integration Tests

| Test ID | Integration | Test Case |
|---------|-------------|-----------|
| **IT-1** | Core API | `GET /v2/modules/` returns module list |
| **IT-2** | Core API | `GET /v2/modules/{id}/roles` returns roles |
| **IT-3** | Core API | `POST module-roles` assigns role correctly |
| **IT-4** | Core API | `DELETE module-roles` removes role correctly |
| **IT-5** | Core API | Assigning to non-existent module returns 400 |
| **IT-6** | Core API | Assigning invalid role returns 400 |
| **IT-7** | Clerk | User list syncs with Clerk organization members |
| **IT-8** | Clerk | Pending invitations appear in user list |

### Accessibility Tests

| Test ID | Component | Test Case |
|---------|-----------|-----------|
| **A11Y-1** | Module Access Table | Table is keyboard navigable |
| **A11Y-2** | Role Dropdown | Dropdown can be opened and navigated with keyboard |
| **A11Y-3** | Role Dropdown | Selected role is announced by screen reader |
| **A11Y-4** | Toast Notifications | Toast messages are announced by screen reader |
| **A11Y-5** | Summary Cards | Cards have appropriate ARIA labels |
