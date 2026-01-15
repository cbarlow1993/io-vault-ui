# Module Role Management

**Status:** Accepted
**Last Updated:** 2026-01-15

## Overview

Organisation owners and admins can assign module-specific roles to users. Module roles grant fine-grained permissions for specific actions within a module (e.g., treasury, compliance). Roles can optionally be scoped to specific resources (e.g., specific vaults) to further restrict access.

## Functional Requirements

| ID | Requirement |
|----|-------------|
| **FR-1** | Users with `owner` or `admin` global role can assign module roles |
| **FR-2** | Users with `owner` or `admin` global role can remove module roles |
| **FR-3** | A user can have at most one role per module within an organisation |
| **FR-4** | Assigning a module role to a user who already has one for that module replaces the existing role |
| **FR-5** | Module roles can be scoped to specific vaults via `resourceScope.vaultIds` |
| **FR-6** | A null `resourceScope` grants module-wide access (no vault restrictions) |
| **FR-7** | An empty `vaultIds` array grants access to all vaults (equivalent to null scope) |
| **FR-8** | Module must exist and be active for role assignment |
| **FR-9** | Role must exist within the specified module for assignment |

## API Endpoints

### POST /organisations/:orgId/users/:userId/module-roles

Assign a module role to a user.

**Request Body:**
```json
{
  "moduleId": "string (module ID or name)",
  "role": "string (role name)",
  "resourceScope": {
    "vaultIds": ["vault-id-1", "vault-id-2"]
  } | null
}
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "userId": "string",
  "module": "string (module name)",
  "role": "string (role name)",
  "resourceScope": { "vaultIds": ["string"] } | null,
  "grantedBy": "string (granter user ID)",
  "createdAt": "ISO8601 timestamp"
}
```

### DELETE /organisations/:orgId/users/:userId/module-roles/:moduleId

Remove a user's module role.

**Response:** 204 No Content

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | Requesting user is not owner or admin | 403 Forbidden | `OPERATION_FORBIDDEN` | |
| **VR-2** | Module not found or inactive | 404 Not Found | `NOT_FOUND` | |
| **VR-3** | Role not found within module | 404 Not Found | `NOT_FOUND` | |
| **VR-4** | User has no role for module (on DELETE) | 404 Not Found | `NOT_FOUND` | |
| **VR-5** | Valid request | 201 Created / 204 | - | |

## Resource Scope Behavior

| Scope Value | Behavior |
|-------------|----------|
| `null` | Module-wide access, no vault restrictions |
| `{ vaultIds: [] }` | Access to all vaults (no restrictions) |
| `{ vaultIds: ["v1", "v2"] }` | Access restricted to vaults v1 and v2 only |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | Role assignment must be idempotent (re-assigning same role/scope has no side effects) |
| **NFR-2** | All role changes must be auditable (who granted, when) |
| **NFR-3** | Module lookup supports both ID and name for flexibility |
