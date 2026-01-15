# Module System Design

A product/feature module system similar to Atlassian's approach (Jira, Confluence), with distinct modules for Treasury, Compliance, and Global administration.

## Overview

Three peer modules with separate identities, navigation, and visual theming:

| Module | Purpose | Accent Color | Icon |
|--------|---------|--------------|------|
| **Treasury** | Key management, signing, policies | Blue (`blue-600`) | Vault/Wallet |
| **Compliance** | Compliance monitoring, identity verification | Green (`emerald-600`) | Shield |
| **Global** | Org-wide admin: users, roles, billing | Purple (`violet-600`) | Globe |

## Access Control

**Org-level licensing:** Organizations subscribe to modules. Users only see modules their org has licensed.

**Role-based within modules:** Admins assign users roles within enabled modules. Users need both org license AND a role to access a module.

**Global visibility:** Only org admins/owners can access the Global module.

## Feature Mapping

### Treasury Module

- Overview
- Vaults
- Signers
- Policies
  - Whitelists
  - Transactions
- Address Book
- Settings (module-specific)

### Compliance Module

- Overview
- Monitoring
- Identities
- Reports
- Settings (module-specific)

### Global Module

- Users (invite, view, deactivate)
- Roles (define roles and permissions per module)
- Teams (group users)
- Workspaces (create and manage - used by Treasury)
- Organization (name, branding, general settings)
- Billing (subscription, module licensing, invoices)
- Audit Log (cross-module activity history)

## Workspaces

Workspaces are a **Treasury-only concept**. They are created and managed in Global, but only used within Treasury.

- Treasury: User selects Org → Workspace → views Treasury features
- Compliance: User selects Org → views Compliance features (no workspace)
- Global: User selects Org → views Global features (no workspace)

## Navigation Design

### Sidebar Header (Module Switcher)

```
┌─────────────────────────┐
│ [icon] Acme Corp      ▾ │  ← Org name + dropdown trigger
│        Treasury · Main  │  ← Current module + workspace (if applicable)
└─────────────────────────┘
```

### Dropdown Behavior

```
┌─────────────────────────────┐
│ ORGANIZATION                │
│ ┌─────────────────────────┐ │
│ │ Acme Corp             ▾ │ │  ← Org selector (if multi-org)
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ MODULE                      │
│ ○ Treasury              ✓   │  ← Current selection
│ ○ Compliance                │
│ ○ Global                    │
├─────────────────────────────┤
│ WORKSPACE (Treasury only)   │
│ ○ Main                  ✓   │
│ ○ DeFi Operations           │
│ ○ Cold Storage              │
│ + Create Workspace          │  ← Links to Global
└─────────────────────────────┘
```

The workspace section only appears when Treasury is selected.

## Visual Theming

Each module has a distinct accent color that applies to:

- Active sidebar nav item background and text
- Primary buttons
- Links and interactive elements
- Focus rings
- Selected states (checkboxes, radio buttons, tabs)

### CSS Implementation

```css
/* In app.css - module theme variables */
:root {
  --module-accent: theme(colors.blue.600);
  --module-accent-light: theme(colors.blue.50);
  --module-accent-hover: theme(colors.blue.700);
}

[data-module="treasury"] {
  --module-accent: theme(colors.blue.600);
  --module-accent-light: theme(colors.blue.50);
}

[data-module="compliance"] {
  --module-accent: theme(colors.emerald.600);
  --module-accent-light: theme(colors.emerald.50);
}

[data-module="global"] {
  --module-accent: theme(colors.violet.600);
  --module-accent-light: theme(colors.violet.50);
}
```

A `data-module` attribute on a root layout element enables automatic theming. Shared components use CSS variables.

## URL Structure

```
/treasury/overview
/treasury/vaults
/treasury/vaults/:vaultId
/treasury/signers
/treasury/policies/whitelists
/treasury/policies/transactions
/treasury/address-book
/treasury/settings

/compliance/overview
/compliance/monitoring
/compliance/identities
/compliance/reports
/compliance/settings

/global/users
/global/roles
/global/teams
/global/workspaces
/global/organization
/global/billing
/global/audit-log
```

## Routing Structure

```
routes/
├── _app.tsx                    ← Auth guard only
├── _app/
│   ├── _module.tsx             ← Module layout (sidebar, theming)
│   ├── _module/
│   │   ├── treasury/
│   │   │   ├── route.tsx       ← Treasury layout (workspace context)
│   │   │   ├── index.tsx       ← Redirects to /treasury/overview
│   │   │   ├── overview.tsx
│   │   │   ├── vaults/
│   │   │   ├── signers/
│   │   │   └── policies/
│   │   ├── compliance/
│   │   │   ├── route.tsx       ← Compliance layout
│   │   │   ├── index.tsx
│   │   │   ├── overview.tsx
│   │   │   └── identities/
│   │   └── global/
│   │       ├── route.tsx       ← Global layout (admin check)
│   │       ├── index.tsx
│   │       ├── users/
│   │       ├── roles/
│   │       └── billing/
```

### Layout Hierarchy

```
_app.tsx (auth guard)
  └── _module.tsx (module context, sidebar shell)
        └── treasury/route.tsx (workspace context, module permission check)
              └── vaults/index.tsx (page)
```

## State Management

### Module Context

```typescript
type Module = 'treasury' | 'compliance' | 'global';

type ModuleContextValue = {
  currentModule: Module;
  currentWorkspace: Workspace | null;  // Only for Treasury
  availableModules: Module[];          // Based on org license + user roles
  switchModule: (module: Module) => void;
  switchWorkspace: (workspaceId: string) => void;
};
```

### State Persistence

- Last visited module: `localStorage` key `lastModule`
- Last workspace per org: `localStorage` key `lastWorkspace:{orgId}`
- On login: read preferences → validate access → redirect

### Context Providers

| Context | Location | Purpose |
|---------|----------|---------|
| `ModuleProvider` | `_module.tsx` | Current module, switching |
| `WorkspaceProvider` | `treasury/route.tsx` | Current workspace (Treasury only) |
| `OrgProvider` | `_app.tsx` | Current organization |

## Permission System

### Permission Format

```typescript
type Permission = {
  module: 'treasury' | 'compliance' | 'global';
  resource: string;
  action: 'view' | 'create' | 'update' | 'delete' | 'manage';
};

// Examples:
'treasury:vaults:view'
'treasury:vaults:create'
'treasury:policies:manage'
'compliance:identities:view'
'global:users:manage'
'global:billing:view'
```

### Role Structure

```typescript
type Role = {
  id: string;
  name: string;
  module: 'treasury' | 'compliance' | 'global';
  permissions: Permission[];
};
```

**Predefined roles per module:**

- Treasury: Viewer, Operator, Admin
- Compliance: Viewer, Analyst, Admin
- Global: Member, Admin, Owner

### Access Check Flow

```
User tries to access /treasury/vaults
  ↓
1. Org has Treasury licensed? → No → "Module not available"
  ↓ Yes
2. User has any Treasury role? → No → "No access to module"
  ↓ Yes
3. Role includes treasury:vaults:view? → No → 403 page
  ↓ Yes
4. Render page
```

### Component-Level Checks

```tsx
<WithPermission permission="treasury:vaults:create">
  <Button>Create Vault</Button>
</WithPermission>
```

## Migration from Current Structure

| Current Path | New Path | Module |
|--------------|----------|--------|
| `/overview` | `/treasury/overview` | Treasury |
| `/vaults` | `/treasury/vaults` | Treasury |
| `/signers` | `/treasury/signers` | Treasury |
| `/policies/whitelists` | `/treasury/policies/whitelists` | Treasury |
| `/policies/transactions` | `/treasury/policies/transactions` | Treasury |
| `/address-book` | `/treasury/address-book` | Treasury |
| `/compliance` | `/compliance/overview` | Compliance |
| `/identities` | `/compliance/identities` | Compliance |
| `/settings/members` | `/global/users` | Global |
| `/settings/roles` | `/global/roles` | Global |
| `/settings/teams` | `/global/teams` | Global |
| `/settings/workspaces` | `/global/workspaces` | Global |
| `/settings/billing` | `/global/billing` | Global |
| `/settings/audit` | `/global/audit-log` | Global |

**Module-specific settings:**

- `/treasury/settings` - Treasury-specific config
- `/compliance/settings` - Compliance-specific config
- `/global/organization` - Org-wide settings (name, branding)

Old paths should redirect to new locations during transition period.

## Components to Build

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `ModuleSwitcher` | `src/layout/shell/` | Dropdown for org/module/workspace selection |
| `ModuleProvider` | `src/components/module/` | Context provider for current module |
| `ModuleSidebar` | `src/layout/shell/` | Sidebar that renders nav based on current module |
| `ModuleGuard` | `src/features/auth/` | Route guard checking module access |
| `WorkspaceProvider` | `src/features/treasury/` | Context for current workspace (Treasury only) |

### Modified Components

| Component | Changes |
|-----------|---------|
| `nav-sidebar.tsx` | Replace hardcoded nav with module-aware `ModuleSidebar` |
| `org-switcher.tsx` | Replace with new `ModuleSwitcher` |
| `guard-authenticated.tsx` | Add module access check integration |
| `permissions.ts` | Restructure to module-scoped permissions |
| `_app.tsx` | Add `ModuleProvider` wrapper |

### Configuration

```typescript
// src/config/modules.ts
export const moduleConfig = {
  treasury: {
    name: 'Treasury',
    icon: Vault,
    accent: 'blue',
    navItems: [
      { label: 'Overview', path: '/treasury/overview', icon: LayoutDashboard },
      { label: 'Vaults', path: '/treasury/vaults', icon: Vault },
      { label: 'Signers', path: '/treasury/signers', icon: Users },
      {
        label: 'Policies',
        icon: Shield,
        children: [
          { label: 'Whitelists', path: '/treasury/policies/whitelists' },
          { label: 'Transactions', path: '/treasury/policies/transactions' },
        ]
      },
      { label: 'Address Book', path: '/treasury/address-book', icon: BookOpen },
      { label: 'Settings', path: '/treasury/settings', icon: Settings },
    ],
    defaultPath: '/treasury/overview',
  },
  compliance: {
    name: 'Compliance',
    icon: ShieldCheck,
    accent: 'emerald',
    navItems: [
      { label: 'Overview', path: '/compliance/overview', icon: LayoutDashboard },
      { label: 'Monitoring', path: '/compliance/monitoring', icon: Activity },
      { label: 'Identities', path: '/compliance/identities', icon: Users },
      { label: 'Reports', path: '/compliance/reports', icon: FileText },
      { label: 'Settings', path: '/compliance/settings', icon: Settings },
    ],
    defaultPath: '/compliance/overview',
  },
  global: {
    name: 'Global',
    icon: Globe,
    accent: 'violet',
    navItems: [
      { label: 'Users', path: '/global/users', icon: Users },
      { label: 'Roles', path: '/global/roles', icon: Shield },
      { label: 'Teams', path: '/global/teams', icon: Users2 },
      { label: 'Workspaces', path: '/global/workspaces', icon: Folders },
      { label: 'Organization', path: '/global/organization', icon: Building },
      { label: 'Billing', path: '/global/billing', icon: CreditCard },
      { label: 'Audit Log', path: '/global/audit-log', icon: ScrollText },
    ],
    defaultPath: '/global/users',
  },
};
```

## Default Landing Experience

On login, users land on their **last visited module**:

1. Read `lastModule` from localStorage
2. Validate user still has access to that module
3. If valid: redirect to last path in that module
4. If invalid: redirect to first available module's default path
5. For Treasury: also restore last workspace from `lastWorkspace:{orgId}`
