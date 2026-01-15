# Access Control Policy Evaluation - Manual Test Plan

**Related Requirements:** [003-access-control.md](../requirements/003-access-control.md)
**Last Updated:** 2026-01-15

## Prerequisites

- Access to test environment with API endpoint
- Test users created with specific roles:
  - `owner-user`: Owner global role
  - `admin-user`: Admin global role (no module roles)
  - `treasurer-user`: Treasury treasurer role (no vault scope)
  - `scoped-treasurer`: Treasury treasurer role scoped to `vault-1` only
  - `auditor-user`: Treasury auditor role
  - `no-role-user`: No roles assigned
- Test organisation: `test-org-123`
- Test vaults: `vault-1`, `vault-2`, `vault-3` (belonging to test-org-123)
- Authentication tokens for each test user

## Test Cases

### Owner Bypass Tests

#### TC-AC-001: Owner can access any vault

**Covers:** FR-1

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `owner-user` | Token obtained |
| 2 | GET `/vaults/vault-1` | 200 OK |
| 3 | GET `/vaults/vault-2` | 200 OK |
| 4 | GET `/vaults/vault-3` | 200 OK |

---

#### TC-AC-002: Owner can perform any action

**Covers:** FR-1

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `owner-user` | Token obtained |
| 2 | GET `/vaults` (view_vaults) | 200 OK |
| 3 | POST `/vaults` (create_vault) | 201 Created (or validation error, not 403) |
| 4 | POST `/vaults/vault-1/addresses` (create_address) | 201 Created (or validation error, not 403) |
| 5 | POST `/transactions` (initiate_transfer) | 201 Created (or validation error, not 403) |

---

### Module Role Required Tests

#### TC-AC-003: User without module role denied access

**Covers:** FR-2, VR-2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `admin-user` (has global admin, no treasury role) | Token obtained |
| 2 | GET `/vaults` | 403 Forbidden |
| 3 | Verify error indicates no role for treasury module | Access denied message |

---

#### TC-AC-004: User with no roles denied access

**Covers:** FR-2, VR-2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `no-role-user` | Token obtained |
| 2 | GET `/vaults` | 403 Forbidden |
| 3 | GET `/vaults/vault-1` | 403 Forbidden |

---

### Action Permission Tests

#### TC-AC-005: Treasurer can view balances

**Covers:** FR-3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `treasurer-user` | Token obtained |
| 2 | GET `/vaults` | 200 OK |
| 3 | GET `/vaults/vault-1` | 200 OK |
| 4 | GET `/vaults/vault-1/addresses` | 200 OK |

---

#### TC-AC-006: Treasurer can initiate transfer

**Covers:** FR-3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `treasurer-user` | Token obtained |
| 2 | POST `/transactions` with valid transfer payload | 201 Created (or validation error, not 403) |

---

#### TC-AC-007: Treasurer cannot approve transfer

**Covers:** FR-3, VR-3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `treasurer-user` | Token obtained |
| 2 | PUT `/transactions/:id/approve` | 403 Forbidden |
| 3 | Verify error indicates role lacks permission | Permission denied message |

---

#### TC-AC-008: Auditor can only view (not initiate)

**Covers:** FR-3, VR-3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `auditor-user` | Token obtained |
| 2 | GET `/vaults` | 200 OK |
| 3 | GET `/transactions` | 200 OK |
| 4 | POST `/transactions` | 403 Forbidden |
| 5 | POST `/vaults` | 403 Forbidden |

---

### Resource Scope Tests

#### TC-AC-009: Scoped user can access allowed vault

**Covers:** FR-4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `scoped-treasurer` (scoped to vault-1) | Token obtained |
| 2 | GET `/vaults/vault-1` | 200 OK |
| 3 | GET `/vaults/vault-1/addresses` | 200 OK |

---

#### TC-AC-010: Scoped user denied access to out-of-scope vault

**Covers:** FR-4, VR-4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `scoped-treasurer` (scoped to vault-1) | Token obtained |
| 2 | GET `/vaults/vault-2` | 403 Forbidden |
| 3 | Verify error mentions vault outside scope | Scope violation message |
| 4 | GET `/vaults/vault-3` | 403 Forbidden |

---

#### TC-AC-011: Null scope allows all vaults

**Covers:** FR-4 (scope behavior)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `treasurer-user` (null scope) | Token obtained |
| 2 | GET `/vaults/vault-1` | 200 OK |
| 3 | GET `/vaults/vault-2` | 200 OK |
| 4 | GET `/vaults/vault-3` | 200 OK |

---

#### TC-AC-012: Empty vault_ids array allows all vaults

**Covers:** FR-4 (scope behavior)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Setup: Assign user treasury role with `{"vault_ids": []}` | Role assigned |
| 2 | Authenticate as that user | Token obtained |
| 3 | GET `/vaults/vault-1` | 200 OK |
| 4 | GET `/vaults/vault-2` | 200 OK |
| 5 | GET `/vaults/vault-3` | 200 OK |

---

#### TC-AC-013: List operations work without specific vault

**Covers:** FR-4 (scope behavior)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `scoped-treasurer` (scoped to vault-1) | Token obtained |
| 2 | GET `/vaults` (list all vaults) | 200 OK (filtered to scope) |
| 3 | GET `/transactions` (list transactions) | 200 OK |

---

### Authentication Tests

#### TC-AC-014: Unauthenticated request rejected

**Covers:** VR-1

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | GET `/vaults` without Authorization header | 401 Unauthorized |
| 2 | Verify error code is `UNAUTHORIZED` | Auth error returned |

---

#### TC-AC-015: Invalid token rejected

**Covers:** VR-1

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | GET `/vaults` with invalid/expired token | 401 Unauthorized |
| 2 | Verify error code is `UNAUTHORIZED` | Auth error returned |

---

### Audit Logging Tests

#### TC-AC-016: Access decision is logged

**Covers:** FR-5, NFR-2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `treasurer-user` | Token obtained |
| 2 | GET `/vaults/vault-1` | 200 OK |
| 3 | Check `policy_decisions` table in database | Entry exists with decision: allow |
| 4 | Verify entry has user_id, module, action, resource | All fields populated |

---

#### TC-AC-017: Denied access is logged

**Covers:** FR-5, NFR-2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `auditor-user` | Token obtained |
| 2 | POST `/transactions` | 403 Forbidden |
| 3 | Check `policy_decisions` table | Entry exists with decision: deny |
| 4 | Verify entry has reason for denial | Reason populated |

---

### Cross-Module Isolation Tests

#### TC-AC-018: Treasury role doesn't grant compliance access

**Covers:** FR-2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as `treasurer-user` (treasury role only) | Token obtained |
| 2 | Access compliance module endpoint (if exists) | 403 Forbidden |
| 3 | Verify error indicates no role for compliance | Module isolation enforced |

---

## Edge Case Tests

#### TC-AC-019: Multiple module roles - correct one applied

**Covers:** FR-2, FR-3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Setup: User has treasury:auditor and compliance:admin | Roles assigned |
| 2 | Authenticate as that user | Token obtained |
| 3 | POST `/transactions` (treasury action) | 403 Forbidden (auditor can't initiate) |
| 4 | Access compliance endpoint (if exists) | 200 OK (admin can access) |

---

#### TC-AC-020: Concurrent access doesn't interfere

**Covers:** NFR-1

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Authenticate as multiple users concurrently | Tokens obtained |
| 2 | Make simultaneous requests to `/vaults/vault-1` | Each request evaluated independently |
| 3 | Verify scoped user denied, unscoped user allowed | Correct decisions for each |

---

## Test Data Cleanup

After testing:
1. Reset user roles to initial test state
2. Review and optionally clear policy_decisions audit log
