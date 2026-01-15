# Module-Based RBAC Design

**Date:** 2026-01-15
**Status:** Approved
**Author:** Architecture Session

## Overview

A policy system using Open Policy Agent (OPA) providing module-based access control with a two-tier role system. Users have global roles at the organization level and module-specific roles for feature areas like Treasury and Compliance.

## Requirements

- **Two-tier roles** - Global roles (Owner, Billing, Admin) and module roles (Admin, Treasurer, Auditor)
- **Module-based access** - Feature areas (Treasury, Compliance) with custom actions per module
- **Resource scoping** - Module-wide access by default, optional restriction to specific resources (e.g., specific vaults)
- **Least privilege** - Global Admin can assign roles but doesn't inherit module access
- **Extensible** - New modules and actions can be added via database configuration

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Organization                            │
├─────────────────────────────────────────────────────────────┤
│  Global Roles: Owner, Billing, Admin                        │
│                                                              │
│  ┌─────────────────┐    ┌─────────────────┐                 │
│  │    Treasury     │    │   Compliance    │                 │
│  │     Module      │    │     Module      │                 │
│  ├─────────────────┤    ├─────────────────┤                 │
│  │ Module Roles:   │    │ Module Roles:   │                 │
│  │ - Admin         │    │ - Admin         │                 │
│  │ - Treasurer     │    │ - Treasurer     │                 │
│  │ - Auditor       │    │ - Auditor       │                 │
│  ├─────────────────┤    ├─────────────────┤                 │
│  │ Scope:          │    │ Scope:          │                 │
│  │ - All vaults    │    │ - Module-wide   │                 │
│  │ - OR specific   │    │ - OR specific   │                 │
│  │   vault(s)      │    │   resource(s)   │                 │
│  └─────────────────┘    └─────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

### Global Roles

| Role | Powers |
|------|--------|
| **Owner** | Full organization access, manages global roles, implicit access to all modules |
| **Billing** | Billing/subscription management only, no module access unless granted |
| **Admin** | Can assign module roles to users, no implicit module access |

### Module Roles

| Role | Description |
|------|-------------|
| **Admin** | Full access to all actions within the module |
| **Treasurer** | Operational access (initiate, view, export) but no approvals or management |
| **Auditor** | Read-only access for audit and compliance purposes |

## Module Definitions

### Treasury Module

| Action | Admin | Treasurer | Auditor |
|--------|-------|-----------|---------|
| view_balances | ✓ | ✓ | ✓ |
| view_transactions | ✓ | ✓ | ✓ |
| initiate_transfer | ✓ | ✓ | ✗ |
| approve_transfer | ✓ | ✗ | ✗ |
| cancel_transfer | ✓ | ✓ | ✗ |
| manage_vaults | ✓ | ✗ | ✗ |
| manage_allowlists | ✓ | ✗ | ✗ |
| export_data | ✓ | ✓ | ✓ |

### Compliance Module

| Action | Admin | Treasurer | Auditor |
|--------|-------|-----------|---------|
| view_audit_logs | ✓ | ✗ | ✓ |
| view_policies | ✓ | ✓ | ✓ |
| manage_policies | ✓ | ✗ | ✗ |
| view_reports | ✓ | ✓ | ✓ |
| export_audit_data | ✓ | ✗ | ✓ |
| manage_sanctions | ✓ | ✗ | ✗ |
| replay_decisions | ✓ | ✗ | ✓ |
| approve_transfer | ✓ | ✗ | ✗ |

## Database Schema

```sql
-- Available modules in the system
CREATE TABLE modules (
    id              UUID PRIMARY KEY,
    name            VARCHAR(100) UNIQUE NOT NULL,  -- 'treasury', 'compliance'
    display_name    VARCHAR(255) NOT NULL,
    description     TEXT,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Actions available per module
CREATE TABLE module_actions (
    id              UUID PRIMARY KEY,
    module_id       UUID NOT NULL REFERENCES modules(id),
    name            VARCHAR(100) NOT NULL,  -- 'initiate_transfer'
    display_name    VARCHAR(255) NOT NULL,
    description     TEXT,
    UNIQUE(module_id, name)
);

-- Role templates per module (admin, treasurer, auditor)
CREATE TABLE module_roles (
    id              UUID PRIMARY KEY,
    module_id       UUID NOT NULL REFERENCES modules(id),
    name            VARCHAR(100) NOT NULL,  -- 'admin', 'treasurer', 'auditor'
    display_name    VARCHAR(255) NOT NULL,
    description     TEXT,
    UNIQUE(module_id, name)
);

-- Which actions each module role can perform
CREATE TABLE module_role_permissions (
    id              UUID PRIMARY KEY,
    module_role_id  UUID NOT NULL REFERENCES module_roles(id),
    action_id       UUID NOT NULL REFERENCES module_actions(id),
    UNIQUE(module_role_id, action_id)
);

-- User's global role within an organization
CREATE TABLE user_global_roles (
    id              UUID PRIMARY KEY,
    user_id         UUID NOT NULL,
    organisation_id UUID NOT NULL,
    role            VARCHAR(50) NOT NULL,  -- 'owner', 'billing', 'admin'
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, organisation_id)
);

-- User's module role assignments
CREATE TABLE user_module_roles (
    id              UUID PRIMARY KEY,
    user_id         UUID NOT NULL,
    organisation_id UUID NOT NULL,
    module_id       UUID NOT NULL REFERENCES modules(id),
    module_role_id  UUID NOT NULL REFERENCES module_roles(id),
    resource_scope  JSONB,  -- null = all, or {"vault_ids": ["uuid1", "uuid2"]}
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    granted_by      UUID NOT NULL,
    UNIQUE(user_id, organisation_id, module_id)
);

-- Indexes
CREATE INDEX idx_user_global_roles_user ON user_global_roles(user_id);
CREATE INDEX idx_user_global_roles_org ON user_global_roles(organisation_id);
CREATE INDEX idx_user_module_roles_user ON user_module_roles(user_id);
CREATE INDEX idx_user_module_roles_org ON user_module_roles(organisation_id);
CREATE INDEX idx_user_module_roles_module ON user_module_roles(module_id);
```

## OPA Policy Structure

### Main Access Policy

```rego
# policies/rbac/access.rego

package rbac.access

import rego.v1

default allow := false
default decision := {"allowed": false, "reason": "no matching policy"}

# Owner bypasses all checks
decision := {"allowed": true, "role": "owner"} if {
    input.user.global_role == "owner"
}

# Check module access
decision := result if {
    input.user.global_role != "owner"
    module_access := has_module_access(input.user, input.module, input.action)
    result := module_access
}

has_module_access(user, module, action) := {"allowed": true, "role": role_name} if {
    some assignment in user.module_roles
    assignment.module == module

    # Check resource scope
    valid_scope(assignment, input.resource)

    # Check action permission
    some permission in data.role_permissions[assignment.role]
    permission == action

    role_name := assignment.role
}

has_module_access(user, module, action) := {"allowed": false, "reason": reason} if {
    not has_any_module_role(user, module)
    reason := sprintf("no role assigned for module '%s'", [module])
}

has_module_access(user, module, action) := {"allowed": false, "reason": reason} if {
    has_any_module_role(user, module)
    not has_action_permission(user, module, action)
    reason := sprintf("role does not permit action '%s'", [action])
}

# Scope validation
valid_scope(assignment, resource) if {
    assignment.resource_scope == null  # Module-wide access
}

valid_scope(assignment, resource) if {
    assignment.resource_scope.vault_ids
    resource.vault_id in assignment.resource_scope.vault_ids
}

# Helper functions
has_any_module_role(user, module) if {
    some assignment in user.module_roles
    assignment.module == module
}

has_action_permission(user, module, action) if {
    some assignment in user.module_roles
    assignment.module == module
    some permission in data.role_permissions[assignment.role]
    permission == action
}
```

### Policy Input Structure

```typescript
interface PolicyInput {
  user: {
    id: string;
    global_role: 'owner' | 'billing' | 'admin' | null;
    module_roles: Array<{
      module: string;
      role: string;
      resource_scope: { vault_ids?: string[] } | null;
    }>;
  };
  module: string;      // 'treasury' | 'compliance'
  action: string;      // 'initiate_transfer', 'view_balances', etc.
  resource: {
    vault_id?: string;
    // other resource identifiers as needed
  };
}
```

## Fastify Integration

### Policy Client Service

```typescript
// src/services/policy/policy-client.ts

interface PolicyClient {
  checkAccess(params: {
    userId: string;
    organisationId: string;
    module: string;
    action: string;
    resource?: { vaultId?: string };
  }): Promise<{ allowed: boolean; reason?: string }>;
}

export class OpaPolicyClient implements PolicyClient {
  constructor(private opaUrl: string, private userRepository: UserRepository) {}

  async checkAccess(params: CheckAccessParams): Promise<AccessResult> {
    const user = await this.userRepository.getUserWithRoles(
      params.userId,
      params.organisationId
    );

    const input: PolicyInput = {
      user: {
        id: user.id,
        global_role: user.globalRole,
        module_roles: user.moduleRoles,
      },
      module: params.module,
      action: params.action,
      resource: params.resource ?? {},
    };

    const response = await fetch(`${this.opaUrl}/v1/data/rbac/access/decision`, {
      method: 'POST',
      body: JSON.stringify({ input }),
    });

    return response.json().result;
  }
}
```

### Route-Level Decorator

```typescript
// src/decorators/require-access.ts

export function requireAccess(module: string, action: string) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const result = await request.server.policy.checkAccess({
      userId: request.auth.userId,
      organisationId: request.auth.organisationId,
      module,
      action,
      resource: { vaultId: request.params.vaultId },
    });

    if (!result.allowed) {
      throw new ForbiddenError(result.reason ?? 'Access denied');
    }
  };
}
```

### Usage in Routes

```typescript
// src/routes/vaults/index.ts

server.post('/vaults/:vaultId/transfers', {
  preHandler: [requireAccess('treasury', 'initiate_transfer')],
  handler: createTransferHandler,
});

server.post('/vaults/:vaultId/transfers/:transferId/approve', {
  preHandler: [requireAccess('treasury', 'approve_transfer')],
  handler: approveTransferHandler,
});
```

## Role Management API

### Endpoints

```
# Global Roles (Owner only)
PUT    /v2/organisations/:orgId/users/:userId/global-role
DELETE /v2/organisations/:orgId/users/:userId/global-role
GET    /v2/organisations/:orgId/users                      # List users with roles

# Module Roles (Owner or Global Admin)
POST   /v2/organisations/:orgId/users/:userId/module-roles
PUT    /v2/organisations/:orgId/users/:userId/module-roles/:moduleId
DELETE /v2/organisations/:orgId/users/:userId/module-roles/:moduleId
GET    /v2/organisations/:orgId/users/:userId/module-roles

# Module Configuration (read-only for clients)
GET    /v2/modules                                         # List available modules
GET    /v2/modules/:moduleId/roles                         # List roles for a module
GET    /v2/modules/:moduleId/actions                       # List actions for a module
```

### Assign Module Role Request

```typescript
// POST /v2/organisations/:orgId/users/:userId/module-roles
interface AssignModuleRoleRequest {
  module_id: string;
  role: 'admin' | 'treasurer' | 'auditor';
  resource_scope?: {
    vault_ids?: string[];  // Optional: restrict to specific vaults
  };
}

// Response
interface AssignModuleRoleResponse {
  id: string;
  user_id: string;
  module: string;
  role: string;
  resource_scope: { vault_ids?: string[] } | null;
  granted_by: string;
  created_at: string;
}
```

### Example: Grant Treasury Treasurer for specific vaults

```json
POST /v2/organisations/org-123/users/user-456/module-roles
{
  "module_id": "treasury",
  "role": "treasurer",
  "resource_scope": {
    "vault_ids": ["vault-aaa", "vault-bbb"]
  }
}
```

## Access Resolution Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Access Check Request                      │
│  user_id, org_id, module, action, resource                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                 ┌────────────────────────┐
                 │  Is user Owner?        │
                 └────────────────────────┘
                    │                │
                   Yes               No
                    │                │
                    ▼                ▼
              ┌──────────┐   ┌────────────────────────┐
              │  ALLOW   │   │  Has module role?      │
              └──────────┘   └────────────────────────┘
                                  │              │
                                 Yes             No
                                  │              │
                                  ▼              ▼
                    ┌──────────────────┐   ┌──────────┐
                    │  Valid scope?    │   │   DENY   │
                    └──────────────────┘   └──────────┘
                         │          │
                        Yes         No
                         │          │
                         ▼          ▼
              ┌──────────────────┐  ┌──────────┐
              │  Has action      │  │   DENY   │
              │  permission?     │  └──────────┘
              └──────────────────┘
                   │          │
                  Yes         No
                   │          │
                   ▼          ▼
              ┌──────────┐  ┌──────────┐
              │  ALLOW   │  │   DENY   │
              └──────────┘  └──────────┘
```

## Implementation Phases

### Phase 1: Foundation
- Database migrations for all RBAC tables
- Seed modules, actions, and role permissions for Treasury & Compliance
- OPA client service implementation
- Basic Rego policies

### Phase 2: Middleware Integration
- `requireAccess` decorator/preHandler
- Integrate with existing routes
- User roles repository (fetch user with global + module roles)
- Decision logging for audit

### Phase 3: Role Management API
- Global role assignment endpoints (Owner only)
- Module role assignment endpoints (Owner + Global Admin)
- Module/role/action listing endpoints

### Phase 4: OPA Sidecar Deployment
- Bundle server for policy distribution
- OPA sidecar configuration
- Replace direct Rego evaluation with sidecar calls

### Phase 5: Extensibility
- Admin UI for role management (optional)
- Add new modules via database configuration
- Resource scope expansion (beyond vault_ids)
