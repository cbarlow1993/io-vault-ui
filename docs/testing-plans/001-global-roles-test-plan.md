# Global Role Management - Manual Test Plan

**Related Requirements:** [001-global-roles.md](../requirements/modules-and-access/001-global-roles.md)
**Last Updated:** 2026-01-15

## Prerequisites

- Access to test environment with API endpoint
- Test users created:
  - `owner-user`: User with owner global role
  - `admin-user`: User with admin global role
  - `target-user`: User with no roles (target for assignments)
- Test organisation: `test-org-123`
- Authentication tokens for each test user

## Test Cases

### TC-GR-001: Owner can assign global role

**Covers:** FR-1, VR-5

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `owner-user` | Token obtained |
| 2 | PUT `/organisations/test-org-123/users/target-user/global-role` with body `{"role": "admin"}` | 200 OK |
| 3 | Verify response contains `role: "admin"` | Role assigned correctly |
| 4 | GET `/organisations/test-org-123/users/target-user/roles` | Response shows `globalRole: "admin"` |

---

### TC-GR-002: Non-owner cannot assign global role

**Covers:** FR-1, VR-1

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `admin-user` | Token obtained |
| 2 | PUT `/organisations/test-org-123/users/target-user/global-role` with body `{"role": "billing"}` | 403 Forbidden |
| 3 | Verify error code is `OPERATION_FORBIDDEN` | Error returned correctly |
| 4 | Verify error message mentions "owner" | Message indicates owner required |

---

### TC-GR-003: Assigning role replaces existing role

**Covers:** FR-3, FR-4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `owner-user` | Token obtained |
| 2 | PUT `/organisations/test-org-123/users/target-user/global-role` with body `{"role": "admin"}` | 200 OK |
| 3 | PUT `/organisations/test-org-123/users/target-user/global-role` with body `{"role": "billing"}` | 200 OK |
| 4 | GET `/organisations/test-org-123/users/target-user/roles` | Response shows `globalRole: "billing"` (not admin) |

---

### TC-GR-004: Invalid role value rejected

**Covers:** FR-7, VR-2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `owner-user` | Token obtained |
| 2 | PUT `/organisations/test-org-123/users/target-user/global-role` with body `{"role": "superadmin"}` | 400 Bad Request |
| 3 | Verify error code is `VALIDATION_ERROR` | Validation error returned |

---

### TC-GR-005: Owner can remove global role

**Covers:** FR-2, VR-5

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `owner-user` | Token obtained |
| 2 | Ensure `target-user` has a global role (assign if needed) | Role exists |
| 3 | DELETE `/organisations/test-org-123/users/target-user/global-role` | 204 No Content |
| 4 | GET `/organisations/test-org-123/users/target-user/roles` | Response shows `globalRole: null` |

---

### TC-GR-006: Non-owner cannot remove global role

**Covers:** FR-2, VR-1

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `admin-user` | Token obtained |
| 2 | DELETE `/organisations/test-org-123/users/target-user/global-role` | 403 Forbidden |
| 3 | Verify error code is `OPERATION_FORBIDDEN` | Error returned correctly |

---

### TC-GR-007: Owner cannot remove own owner role

**Covers:** FR-5, VR-3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `owner-user` | Token obtained |
| 2 | DELETE `/organisations/test-org-123/users/owner-user/global-role` | 403 Forbidden |
| 3 | Verify error message mentions "own owner role" | Lockout prevention message |
| 4 | GET `/organisations/test-org-123/users/owner-user/roles` | Owner role still present |

---

### TC-GR-008: Remove non-existent role returns 404

**Covers:** VR-4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `owner-user` | Token obtained |
| 2 | Ensure `target-user` has no global role | No role assigned |
| 3 | DELETE `/organisations/test-org-123/users/target-user/global-role` | 404 Not Found |
| 4 | Verify error code is `NOT_FOUND` | Error returned correctly |

---

### TC-GR-009: Get user roles returns complete role information

**Covers:** FR-6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as any user in organisation | Token obtained |
| 2 | Setup: Assign `target-user` global role `admin` and module role for treasury | Roles assigned |
| 3 | GET `/organisations/test-org-123/users/target-user/roles` | 200 OK |
| 4 | Verify response has `userId`, `organisationId`, `globalRole`, `moduleRoles` | All fields present |
| 5 | Verify `globalRole` is `"admin"` | Global role correct |
| 6 | Verify `moduleRoles` array contains treasury role | Module roles included |

---

### TC-GR-010: Valid global role values

**Covers:** FR-7

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `owner-user` | Token obtained |
| 2 | PUT with `{"role": "owner"}` | 200 OK |
| 3 | PUT with `{"role": "billing"}` | 200 OK |
| 4 | PUT with `{"role": "admin"}` | 200 OK |

---

## Test Data Cleanup

After testing, reset test users to initial state:
1. Remove global roles from `target-user`
2. Ensure `owner-user` retains owner role
