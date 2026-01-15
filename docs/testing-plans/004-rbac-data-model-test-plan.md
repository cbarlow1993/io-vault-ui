# RBAC Data Model - Manual Test Plan

**Related Requirements:** [004-rbac-data-model.md](../requirements/modules-and-access/004-rbac-data-model.md)
**Last Updated:** 2026-01-15

## Prerequisites

- Direct database access (psql or database client)
- Test database with RBAC migrations applied
- Ability to run SQL queries

## Test Cases

### Schema Verification Tests

#### TC-DM-001: All RBAC tables exist

**Covers:** Database schema

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Connect to database | Connection established |
| 2 | Query: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('modules', 'module_actions', 'module_roles', 'module_role_permissions', 'user_global_roles', 'user_module_roles', 'policy_decisions')` | All 7 tables listed |

---

#### TC-DM-002: Modules table has correct columns

**Covers:** FR-1

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Query: `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'modules'` | Columns: id, name, display_name, description, is_active, created_at |
| 2 | Verify `is_active` column exists with boolean type | Column present |
| 3 | Verify `is_active` default is `true` | Default verified |

---

#### TC-DM-003: User global roles unique constraint

**Covers:** FR-6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Insert: `INSERT INTO user_global_roles (user_id, organisation_id, role) VALUES ('user-1', 'org-1', 'admin')` | Row inserted |
| 2 | Insert duplicate: `INSERT INTO user_global_roles (user_id, organisation_id, role) VALUES ('user-1', 'org-1', 'billing')` | Unique constraint violation |
| 3 | Cleanup: Delete test row | Row deleted |

---

#### TC-DM-004: User module roles unique constraint

**Covers:** FR-7

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Get valid module_id and module_role_id from database | IDs obtained |
| 2 | Insert user module role for user-1, org-1, module-1 | Row inserted |
| 3 | Insert duplicate (same user, org, module) | Unique constraint violation |
| 4 | Cleanup: Delete test row | Row deleted |

---

#### TC-DM-005: Global role check constraint

**Covers:** FR-6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Insert: `INSERT INTO user_global_roles (user_id, organisation_id, role) VALUES ('user-test', 'org-test', 'owner')` | Success |
| 2 | Insert: `INSERT INTO user_global_roles (user_id, organisation_id, role) VALUES ('user-test2', 'org-test', 'superadmin')` | Check constraint violation |
| 3 | Cleanup: Delete test rows | Rows deleted |

---

### Foreign Key Constraint Tests

#### TC-DM-006: Module actions reference valid module

**Covers:** NFR-2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Insert action with invalid module_id: `INSERT INTO module_actions (module_id, name, display_name) VALUES ('00000000-0000-0000-0000-000000000000', 'test', 'Test')` | Foreign key violation |

---

#### TC-DM-007: Module roles reference valid module

**Covers:** NFR-2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Insert role with invalid module_id: `INSERT INTO module_roles (module_id, name, display_name) VALUES ('00000000-0000-0000-0000-000000000000', 'test', 'Test')` | Foreign key violation |

---

#### TC-DM-008: Role permissions reference valid role and action

**Covers:** NFR-2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Insert permission with invalid module_role_id | Foreign key violation |
| 2 | Insert permission with invalid action_id | Foreign key violation |

---

### Seed Data Verification Tests

#### TC-DM-009: Treasury module exists and is active

**Covers:** Seed data

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Query: `SELECT * FROM modules WHERE name = 'treasury'` | Row returned |
| 2 | Verify `is_active = true` | Module is active |
| 3 | Verify `display_name = 'Treasury'` | Display name correct |

---

#### TC-DM-010: Treasury actions seeded correctly

**Covers:** Seed data

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Query treasury module actions: `SELECT ma.name FROM module_actions ma JOIN modules m ON ma.module_id = m.id WHERE m.name = 'treasury'` | Actions returned |
| 2 | Verify actions include: view_vaults, create_vault, view_addresses, create_address, view_balances, view_transactions, initiate_transfer, approve_transfer, manage_vaults | All 9 actions present |

---

#### TC-DM-011: Treasury roles seeded correctly

**Covers:** Seed data

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Query treasury module roles: `SELECT mr.name FROM module_roles mr JOIN modules m ON mr.module_id = m.id WHERE m.name = 'treasury'` | Roles returned |
| 2 | Verify roles include: admin, treasurer, auditor | All 3 roles present |

---

#### TC-DM-012: Admin role has all permissions

**Covers:** Seed data

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Query admin role permissions: `SELECT ma.name FROM module_role_permissions mrp JOIN module_roles mr ON mrp.module_role_id = mr.id JOIN module_actions ma ON mrp.action_id = ma.id JOIN modules m ON mr.module_id = m.id WHERE m.name = 'treasury' AND mr.name = 'admin'` | All actions returned |
| 2 | Count matches total treasury actions (9) | Admin has full access |

---

#### TC-DM-013: Treasurer role has correct permissions

**Covers:** Seed data

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Query treasurer permissions (same pattern as above) | Permissions returned |
| 2 | Verify includes: view_vaults, view_addresses, view_balances, view_transactions, initiate_transfer | 5 permissions |
| 3 | Verify excludes: create_vault, create_address, approve_transfer, manage_vaults | Not present |

---

#### TC-DM-014: Auditor role has correct permissions

**Covers:** Seed data

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Query auditor permissions | Permissions returned |
| 2 | Verify includes: view_vaults, view_addresses, view_balances, view_transactions | 4 permissions |
| 3 | Verify excludes: create_*, initiate_transfer, approve_transfer, manage_vaults | Not present |

---

### Resource Scope JSONB Tests

#### TC-DM-015: Resource scope stores valid JSON

**Covers:** FR-7

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Insert user_module_role with `resource_scope = '{"vault_ids": ["v1", "v2"]}'` | Row inserted |
| 2 | Query and verify: `SELECT resource_scope->'vault_ids' FROM user_module_roles WHERE ...` | Returns array ["v1", "v2"] |
| 3 | Cleanup | Row deleted |

---

#### TC-DM-016: Resource scope can be null

**Covers:** FR-6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Insert user_module_role with `resource_scope = NULL` | Row inserted |
| 2 | Query and verify resource_scope is NULL | NULL returned |
| 3 | Cleanup | Row deleted |

---

### Audit Log Tests

#### TC-DM-017: Policy decisions table accepts entries

**Covers:** NFR-4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Insert policy decision: `INSERT INTO policy_decisions (organisation_id, user_id, module, action, decision) VALUES ('org-1', 'user-1', 'treasury', 'view_vaults', 'allow')` | Row inserted |
| 2 | Verify created_at auto-populated | Timestamp present |
| 3 | Verify id auto-generated | UUID present |
| 4 | Cleanup | Row deleted |

---

#### TC-DM-018: Policy decisions stores resource JSON

**Covers:** NFR-4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Insert with resource: `INSERT INTO policy_decisions (..., resource) VALUES (..., '{"vault_id": "v1"}')` | Row inserted |
| 2 | Query: `SELECT resource->>'vault_id' FROM policy_decisions WHERE ...` | Returns "v1" |
| 3 | Cleanup | Row deleted |

---

### Index Verification Tests

#### TC-DM-019: User global roles has index on user_id, organisation_id

**Covers:** NFR-1

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Query: `SELECT indexname FROM pg_indexes WHERE tablename = 'user_global_roles'` | Indexes listed |
| 2 | Verify unique index on (user_id, organisation_id) exists | Index present |

---

#### TC-DM-020: User module roles has index on user_id, organisation_id, module_id

**Covers:** NFR-1

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Query: `SELECT indexname FROM pg_indexes WHERE tablename = 'user_module_roles'` | Indexes listed |
| 2 | Verify unique index on (user_id, organisation_id, module_id) exists | Index present |

---

## Test Data Cleanup

After testing:
1. Delete all test rows created during verification
2. Reset sequences if needed
3. Verify no orphaned data remains
