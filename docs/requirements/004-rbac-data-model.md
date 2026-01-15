# RBAC Data Model

**Status:** Accepted
**Last Updated:** 2026-01-15

## Overview

The RBAC (Role-Based Access Control) system uses a two-tier model: global roles for organisation-wide permissions and module roles for fine-grained access control. Modules define available actions and roles, with role-permission mappings determining which actions each role can perform.

## Functional Requirements

| ID | Requirement |
|----|-------------|
| **FR-1** | Modules can be activated or deactivated via `is_active` flag |
| **FR-2** | Inactive modules cannot have roles assigned to users |
| **FR-3** | Each module defines its own set of actions (permissions) |
| **FR-4** | Each module defines its own set of roles |
| **FR-5** | Role-permission mappings define which actions a role can perform |
| **FR-6** | A user can have one global role per organisation |
| **FR-7** | A user can have one module role per module per organisation |
| **FR-8** | Module role assignments track who granted the role |

## Entity Relationships

```
Organisation
    │
    ├── User Global Roles (1:N per user)
    │       └── GlobalRole: owner | billing | admin
    │
    └── User Module Roles (1:N per user per module)
            ├── Module
            │     ├── Actions (1:N)
            │     └── Roles (1:N)
            │           └── Role Permissions (N:M with Actions)
            └── Resource Scope (optional vault restrictions)
```

## Database Schema

### modules

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| name | VARCHAR(100) | NOT NULL, UNIQUE |
| display_name | VARCHAR(255) | NOT NULL |
| description | TEXT | NULLABLE |
| is_active | BOOLEAN | NOT NULL, DEFAULT true |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

### module_actions

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| module_id | UUID | NOT NULL, FK → modules(id) |
| name | VARCHAR(100) | NOT NULL |
| display_name | VARCHAR(255) | NOT NULL |
| description | TEXT | NULLABLE |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

**Unique constraint:** (module_id, name)

### module_roles

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| module_id | UUID | NOT NULL, FK → modules(id) |
| name | VARCHAR(100) | NOT NULL |
| display_name | VARCHAR(255) | NOT NULL |
| description | TEXT | NULLABLE |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

**Unique constraint:** (module_id, name)

### module_role_permissions

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| module_role_id | UUID | NOT NULL, FK → module_roles(id) |
| action_id | UUID | NOT NULL, FK → module_actions(id) |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

**Unique constraint:** (module_role_id, action_id)

### user_global_roles

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id | VARCHAR(255) | NOT NULL |
| organisation_id | VARCHAR(255) | NOT NULL |
| role | VARCHAR(50) | NOT NULL, CHECK (owner, billing, admin) |
| granted_by | VARCHAR(255) | NULLABLE |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

**Unique constraint:** (user_id, organisation_id)

### user_module_roles

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id | VARCHAR(255) | NOT NULL |
| organisation_id | VARCHAR(255) | NOT NULL |
| module_id | UUID | NOT NULL, FK → modules(id) |
| module_role_id | UUID | NOT NULL, FK → module_roles(id) |
| resource_scope | JSONB | NULLABLE |
| granted_by | VARCHAR(255) | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

**Unique constraint:** (user_id, organisation_id, module_id)

### policy_decisions (Audit Log)

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| organisation_id | VARCHAR(255) | NOT NULL |
| user_id | VARCHAR(255) | NOT NULL |
| module | VARCHAR(100) | NOT NULL |
| action | VARCHAR(100) | NOT NULL |
| resource | JSONB | NULLABLE |
| decision | VARCHAR(10) | NOT NULL, CHECK (allow, deny) |
| reason | TEXT | NULLABLE |
| matched_role | VARCHAR(255) | NULLABLE |
| request_id | VARCHAR(255) | NULLABLE |
| endpoint | VARCHAR(500) | NULLABLE |
| evaluation_time_ms | INTEGER | NULLABLE |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

## Seed Data: Treasury Module

### Module

| name | display_name |
|------|--------------|
| treasury | Treasury |

### Actions

| name | display_name |
|------|--------------|
| view_vaults | View Vaults |
| create_vault | Create Vault |
| view_addresses | View Addresses |
| create_address | Create Address |
| view_balances | View Balances |
| view_transactions | View Transactions |
| initiate_transfer | Initiate Transfer |
| approve_transfer | Approve Transfer |
| manage_vaults | Manage Vaults |

### Roles

| name | display_name | Permissions |
|------|--------------|-------------|
| admin | Admin | All actions |
| treasurer | Treasurer | view_vaults, view_addresses, view_balances, view_transactions, initiate_transfer |
| auditor | Auditor | view_vaults, view_addresses, view_balances, view_transactions |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-1** | Indexes on frequently queried columns (user_id, organisation_id, module_id) |
| **NFR-2** | Foreign keys enforce referential integrity |
| **NFR-3** | Unique constraints prevent duplicate role assignments |
| **NFR-4** | Audit log (policy_decisions) retained for compliance |
