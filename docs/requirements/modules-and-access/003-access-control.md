# Access Control Policy Evaluation

**Status:** Accepted
**Last Updated:** 2026-01-15

## Overview

The system enforces fine-grained access control on API endpoints using a policy evaluation service. Access decisions are based on the user's module roles and resource scope. Global roles (owner, admin, billing) control administrative functions like role management, but do not grant automatic access to modules. Policy evaluation can be performed locally or delegated to an OPA (Open Policy Agent) sidecar for complex policy rules.

## Functional Requirements

| ID | Requirement |
|----|-------------|
| **FR-1** | All users must have a module role for the requested module to access it |
| **FR-2** | The module role must grant permission for the requested action |
| **FR-3** | If the role has a resource scope, the requested resource must be within scope |
| **FR-4** | Access decisions are logged for audit purposes |
| **FR-5** | Policy evaluation supports both local evaluation and OPA delegation |
| **FR-6** | Global roles (owner, admin, billing) do not bypass module access checks |

## Policy Decision Flow

```
1. User requests action on module/resource
2. System fetches user's module roles
3. Find module role matching requested module
   - If no role found → DENY
4. Check resource scope
   - If scope restricts vaults and resource not in scope → DENY
5. Check action permission
   - If role doesn't permit action → DENY
6. → ALLOW
```

## Access Control Rules

### Global Role Behavior

| Global Role | Module Access | Administrative Functions |
|-------------|---------------|--------------------------|
| `owner` | Requires module roles | Can assign/remove all roles |
| `admin` | Requires module roles | Can assign/remove module roles |
| `billing` | Requires module roles | Billing-specific admin functions |
| `null` | Requires module roles | No administrative functions |

> **Note:** Global roles control who can manage roles, not who can access modules. An owner without a treasury module role cannot access treasury endpoints.

### Resource Scope Evaluation

| Scope Configuration | Resource Provided | Result |
|---------------------|-------------------|--------|
| `null` | Any | ALLOW |
| `{ vaultIds: [] }` | Any | ALLOW |
| `{ vaultIds: ["v1"] }` | None | ALLOW |
| `{ vaultIds: ["v1"] }` | `v1` | ALLOW |
| `{ vaultIds: ["v1"] }` | `v2` | DENY |

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | User not authenticated | 401 Unauthorized | `UNAUTHORIZED` | |
| **VR-2** | No role for requested module | 403 Forbidden | `ACCESS_DENIED` | |
| **VR-3** | Role lacks permission for action | 403 Forbidden | `ACCESS_DENIED` | |
| **VR-4** | Resource outside permitted scope | 403 Forbidden | `ACCESS_DENIED` | |
| **VR-5** | Access granted | Continue to handler | - | |

## Protected Endpoints

### Treasury Module

| Endpoint | Module | Action |
|----------|--------|--------|
| `GET /vaults` | treasury | view_vaults |
| `POST /vaults` | treasury | create_vault |
| `GET /vaults/:vaultId` | treasury | view_vaults |
| `GET /vaults/:vaultId/addresses` | treasury | view_addresses |
| `POST /vaults/:vaultId/addresses` | treasury | create_address |
| `GET /transactions` | treasury | view_transactions |
| `POST /transactions` | treasury | initiate_transfer |
| `PUT /transactions/:id/review` | treasury | review_transfer |
| `PUT /transactions/:id/approve` | treasury | approve_transfer |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | Policy evaluation must complete within 50ms for local evaluation |
| **NFR-2** | All access decisions must be logged with user, action, resource, and result |
| **NFR-3** | OPA sidecar must be health-checked and fallback to local evaluation if unavailable |
| **NFR-4** | Policy rules must be consistent between local and OPA implementations |

## OPA Integration

The system supports delegating policy evaluation to an OPA sidecar running Rego policies. The OPA policy receives:

**Input:**
```json
{
  "user": {
    "globalRole": "admin" | "billing" | "owner" | null,
    "moduleRoles": [
      {
        "module": "treasury",
        "role": "treasurer",
        "resourceScope": { "vaultIds": ["v1"] } | null
      }
    ]
  },
  "module": "treasury",
  "action": "view_balances",
  "resource": { "vaultId": "v1" }
}
```

**Output:**
```json
{
  "allowed": true | false,
  "reason": "string (optional)",
  "matchedRole": "string (optional)"
}
```

> **Note:** The `globalRole` is included in the input for audit purposes but is not used in access decisions. Only `moduleRoles` determine access.
