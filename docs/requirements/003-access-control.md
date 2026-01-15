# Access Control Policy Evaluation

**Status:** Accepted
**Last Updated:** 2026-01-15

## Overview

The system enforces fine-grained access control on API endpoints using a policy evaluation service. Access decisions are based on the user's global role, module roles, and resource scope. Policy evaluation can be performed locally or delegated to an OPA (Open Policy Agent) sidecar for complex policy rules.

## Functional Requirements

| ID | Requirement |
|----|-------------|
| **FR-1** | Users with `owner` global role bypass all access checks and have full access |
| **FR-2** | Non-owner users must have a module role for the requested module |
| **FR-3** | The module role must grant permission for the requested action |
| **FR-4** | If the role has a resource scope, the requested resource must be within scope |
| **FR-5** | Access decisions are logged for audit purposes |
| **FR-6** | Policy evaluation supports both local evaluation and OPA delegation |

## Policy Decision Flow

```
1. User requests action on module/resource
2. System fetches user's global role and module roles
3. If user is owner → ALLOW (bypass all checks)
4. Find module role matching requested module
   - If no role found → DENY
5. Check resource scope
   - If scope restricts vaults and resource not in scope → DENY
6. Check action permission
   - If role doesn't permit action → DENY
7. → ALLOW
```

## Access Control Rules

### Global Role Bypass

| Global Role | Effect |
|-------------|--------|
| `owner` | Full access to all modules, actions, and resources |
| `admin` | No bypass; requires module roles for access |
| `billing` | No bypass; requires module roles for access |
| `null` | No bypass; requires module roles for access |

### Resource Scope Evaluation

| Scope Configuration | Resource Provided | Result |
|---------------------|-------------------|--------|
| `null` | Any | ALLOW |
| `{ vault_ids: [] }` | Any | ALLOW |
| `{ vault_ids: ["v1"] }` | None | ALLOW |
| `{ vault_ids: ["v1"] }` | `v1` | ALLOW |
| `{ vault_ids: ["v1"] }` | `v2` | DENY |

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
    "global_role": "admin" | "billing" | "owner" | null,
    "module_roles": [
      {
        "module": "treasury",
        "role": "treasurer",
        "resource_scope": { "vault_ids": ["v1"] } | null
      }
    ]
  },
  "module": "treasury",
  "action": "view_balances",
  "resource": { "vault_id": "v1" }
}
```

**Output:**
```json
{
  "allowed": true | false,
  "reason": "string (optional)",
  "matched_role": "string (optional)"
}
```
