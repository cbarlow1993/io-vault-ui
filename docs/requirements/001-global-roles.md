# Global Role Management

**Status:** Accepted
**Last Updated:** 2026-01-15

## Overview

Organisation owners can assign, update, and remove global roles for users within their organisation. Global roles (owner, billing, admin) provide organisation-wide permissions that bypass module-specific access controls. The owner role grants full access to all resources and operations.

## Functional Requirements

| ID | Requirement |
|----|-------------|
| **FR-1** | Only users with the `owner` global role can assign global roles to other users |
| **FR-2** | Only users with the `owner` global role can remove global roles from other users |
| **FR-3** | A user can have at most one global role per organisation |
| **FR-4** | Assigning a global role to a user who already has one replaces the existing role |
| **FR-5** | An owner cannot remove their own owner role (prevents lockout) |
| **FR-6** | Any authenticated user can view another user's roles within the same organisation |
| **FR-7** | Valid global roles are: `owner`, `billing`, `admin` |

## API Endpoints

### PUT /organisations/:orgId/users/:userId/global-role

Assign or update a global role for a user.

**Request Body:**
```json
{
  "role": "owner" | "billing" | "admin"
}
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "user_id": "string",
  "organisation_id": "string",
  "role": "owner" | "billing" | "admin",
  "created_at": "ISO8601 timestamp"
}
```

### DELETE /organisations/:orgId/users/:userId/global-role

Remove a user's global role.

**Response:** 204 No Content

### GET /organisations/:orgId/users/:userId/roles

Get a user's global role and module roles.

**Response (200 OK):**
```json
{
  "user_id": "string",
  "organisation_id": "string",
  "global_role": "owner" | "billing" | "admin" | null,
  "module_roles": [
    {
      "module": "string",
      "role": "string",
      "resource_scope": { "vault_ids": ["string"] } | null
    }
  ]
}
```

## Validation Requirements

| ID | Condition | Response | Error code | Validation error |
|----|-----------|----------|------------|------------------|
| **VR-1** | Requesting user is not owner | 403 Forbidden | `OPERATION_FORBIDDEN` | |
| **VR-2** | Role value not in allowed enum | 400 Bad Request | `VALIDATION_ERROR` | `ENUM_VALUE_INVALID` |
| **VR-3** | Owner attempts to remove own owner role | 403 Forbidden | `OPERATION_FORBIDDEN` | |
| **VR-4** | User has no global role (on DELETE) | 404 Not Found | `NOT_FOUND` | |
| **VR-5** | Valid request | 200 OK / 201 / 204 | - | |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | Role assignment must be idempotent (re-assigning same role has no side effects) |
| **NFR-2** | All role changes must be auditable (who granted, when) |
