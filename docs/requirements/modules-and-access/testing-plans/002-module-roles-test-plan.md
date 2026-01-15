# Module Role Management - Manual Test Plan

**Related Requirements:** [002-module-roles.md](../requirements/modules-and-access/002-module-roles.md)
**Last Updated:** 2026-01-15

## Prerequisites

- Access to test environment with API endpoint
- Test users created:
  - `owner-user`: User with owner global role
  - `admin-user`: User with admin global role
  - `billing-user`: User with billing global role (no assignment rights)
  - `target-user`: User with no roles (target for assignments)
- Test organisation: `test-org-123`
- Test vaults: `vault-1`, `vault-2`, `vault-3`
- Treasury module seeded with roles: `admin`, `treasurer`, `auditor`
- Authentication tokens for each test user

## Test Cases

### TC-MR-001: Owner can assign module role

**Covers:** FR-1

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `owner-user` | Token obtained |
| 2 | POST `/organisations/test-org-123/users/target-user/module-roles` with body `{"moduleId": "treasury", "role": "treasurer"}` | 201 Created |
| 3 | Verify response contains `module: "treasury"`, `role: "treasurer"` | Role assigned correctly |
| 4 | Verify response contains `grantedBy: "owner-user"` | Granter recorded |

---

### TC-MR-002: Admin can assign module role

**Covers:** FR-1

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `admin-user` | Token obtained |
| 2 | POST `/organisations/test-org-123/users/target-user/module-roles` with body `{"moduleId": "treasury", "role": "auditor"}` | 201 Created |
| 3 | Verify response contains `module: "treasury"`, `role: "auditor"` | Role assigned correctly |

---

### TC-MR-003: Billing user cannot assign module role

**Covers:** FR-1, VR-1

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `billing-user` | Token obtained |
| 2 | POST `/organisations/test-org-123/users/target-user/module-roles` with body `{"moduleId": "treasury", "role": "treasurer"}` | 403 Forbidden |
| 3 | Verify error code is `OPERATION_FORBIDDEN` | Error returned correctly |

---

### TC-MR-004: User with no global role cannot assign module role

**Covers:** FR-1, VR-1

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `target-user` (no global role) | Token obtained |
| 2 | POST `/organisations/test-org-123/users/another-user/module-roles` with body `{"moduleId": "treasury", "role": "treasurer"}` | 403 Forbidden |
| 3 | Verify error code is `OPERATION_FORBIDDEN` | Error returned correctly |

---

### TC-MR-005: Assigning module role replaces existing role for same module

**Covers:** FR-3, FR-4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `owner-user` | Token obtained |
| 2 | POST module role `treasurer` for `target-user` | 201 Created |
| 3 | POST module role `auditor` for `target-user` (same module) | 201 Created |
| 4 | GET `/organisations/test-org-123/users/target-user/roles` | Only `auditor` role present (not both) |

---

### TC-MR-006: Assign role with vault scope restriction

**Covers:** FR-5

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `owner-user` | Token obtained |
| 2 | POST with body `{"moduleId": "treasury", "role": "treasurer", "resourceScope": {"vaultIds": ["vault-1", "vault-2"]}}` | 201 Created |
| 3 | Verify response `resourceScope` contains `vaultIds: ["vault-1", "vault-2"]` | Scope recorded correctly |

---

### TC-MR-007: Null resource scope grants module-wide access

**Covers:** FR-6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `owner-user` | Token obtained |
| 2 | POST with body `{"moduleId": "treasury", "role": "treasurer", "resourceScope": null}` | 201 Created |
| 3 | Verify response `resourceScope` is `null` | No restrictions |
| 4 | GET user roles | `resourceScope: null` in module role |

---

### TC-MR-008: Empty vaultIds array grants access to all vaults

**Covers:** FR-7

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `owner-user` | Token obtained |
| 2 | POST with body `{"moduleId": "treasury", "role": "treasurer", "resourceScope": {"vaultIds": []}}` | 201 Created |
| 3 | Verify response `resourceScope` contains `vaultIds: []` | Empty array recorded |

---

### TC-MR-009: Cannot assign role for inactive module

**Covers:** FR-8, VR-2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Deactivate a test module (or use known inactive module) | Module inactive |
| 2 | Authenticate as `owner-user` | Token obtained |
| 3 | POST with body `{"moduleId": "inactive-module", "role": "admin"}` | 404 Not Found |
| 4 | Verify error code is `NOT_FOUND` | Module not found (because inactive) |

---

### TC-MR-010: Cannot assign non-existent role

**Covers:** FR-9, VR-3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `owner-user` | Token obtained |
| 2 | POST with body `{"moduleId": "treasury", "role": "superuser"}` | 404 Not Found |
| 3 | Verify error message mentions role not found | Role validation error |

---

### TC-MR-011: Module lookup by name works

**Covers:** FR-8

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `owner-user` | Token obtained |
| 2 | POST with body `{"moduleId": "treasury", "role": "treasurer"}` (using name) | 201 Created |
| 3 | Verify response `module` is `"treasury"` | Lookup by name succeeded |

---

### TC-MR-012: Module lookup by UUID works

**Covers:** FR-8

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Get treasury module UUID from database | UUID obtained |
| 2 | Authenticate as `owner-user` | Token obtained |
| 3 | POST with body `{"moduleId": "<treasury-uuid>", "role": "treasurer"}` | 201 Created |
| 4 | Verify response `module` is `"treasury"` | Lookup by ID succeeded |

---

### TC-MR-013: Owner can remove module role

**Covers:** FR-2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Setup: Assign `target-user` a treasury role | Role assigned |
| 2 | Authenticate as `owner-user` | Token obtained |
| 3 | DELETE `/organisations/test-org-123/users/target-user/module-roles/treasury` | 204 No Content |
| 4 | GET user roles | Treasury module role no longer present |

---

### TC-MR-014: Admin can remove module role

**Covers:** FR-2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Setup: Assign `target-user` a treasury role | Role assigned |
| 2 | Authenticate as `admin-user` | Token obtained |
| 3 | DELETE `/organisations/test-org-123/users/target-user/module-roles/treasury` | 204 No Content |

---

### TC-MR-015: Remove non-existent module role returns 404

**Covers:** VR-4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Ensure `target-user` has no treasury role | No role |
| 2 | Authenticate as `owner-user` | Token obtained |
| 3 | DELETE `/organisations/test-org-123/users/target-user/module-roles/treasury` | 404 Not Found |
| 4 | Verify error code is `NOT_FOUND` | Error returned correctly |

---

### TC-MR-016: Updating scope on existing role

**Covers:** FR-4, FR-5

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `owner-user` | Token obtained |
| 2 | POST treasurer role with scope `{"vaultIds": ["vault-1"]}` | 201 Created |
| 3 | POST treasurer role with scope `{"vaultIds": ["vault-2", "vault-3"]}` | 201 Created |
| 4 | GET user roles | Scope is `["vault-2", "vault-3"]` (replaced, not merged) |

---

## Test Data Cleanup

After testing, reset test users to initial state:
1. Remove all module roles from `target-user`
2. Re-enable any deactivated modules
