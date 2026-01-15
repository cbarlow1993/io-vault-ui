# Module RBAC Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement module-based RBAC with OPA for fine-grained permissions across Treasury and Compliance modules.

**Architecture:** Two-tier role system with global roles (Owner, Billing, Admin) and module-specific roles (Admin, Treasurer, Auditor). OPA evaluates policies via sidecar, with policies compiled from database rules.

**Tech Stack:** Fastify, Kysely, PostgreSQL, OPA (Open Policy Agent), Rego policies, Zod validation

---

## Phase 1: Foundation

### Task 1.1: Create RBAC Database Migration

**Files:**
- Create: `src/lib/database/migrations/2026_01_15_create_rbac_tables.ts`

**Step 1: Write the migration file**

```typescript
import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // Modules table
  await db.schema
    .createTable('modules')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('name', 'varchar(100)', (col) => col.notNull().unique())
    .addColumn('display_name', 'varchar(255)', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`NOW()`)
    )
    .execute();

  // Module actions table
  await db.schema
    .createTable('module_actions')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('module_id', 'uuid', (col) =>
      col.notNull().references('modules.id').onDelete('cascade')
    )
    .addColumn('name', 'varchar(100)', (col) => col.notNull())
    .addColumn('display_name', 'varchar(255)', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`NOW()`)
    )
    .execute();

  await db.schema
    .createIndex('idx_module_actions_module')
    .on('module_actions')
    .column('module_id')
    .execute();

  await db.schema
    .createIndex('idx_module_actions_unique')
    .on('module_actions')
    .columns(['module_id', 'name'])
    .unique()
    .execute();

  // Module roles table
  await db.schema
    .createTable('module_roles')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('module_id', 'uuid', (col) =>
      col.notNull().references('modules.id').onDelete('cascade')
    )
    .addColumn('name', 'varchar(100)', (col) => col.notNull())
    .addColumn('display_name', 'varchar(255)', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`NOW()`)
    )
    .execute();

  await db.schema
    .createIndex('idx_module_roles_module')
    .on('module_roles')
    .column('module_id')
    .execute();

  await db.schema
    .createIndex('idx_module_roles_unique')
    .on('module_roles')
    .columns(['module_id', 'name'])
    .unique()
    .execute();

  // Module role permissions (which actions each role can perform)
  await db.schema
    .createTable('module_role_permissions')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('module_role_id', 'uuid', (col) =>
      col.notNull().references('module_roles.id').onDelete('cascade')
    )
    .addColumn('action_id', 'uuid', (col) =>
      col.notNull().references('module_actions.id').onDelete('cascade')
    )
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`NOW()`)
    )
    .execute();

  await db.schema
    .createIndex('idx_role_permissions_unique')
    .on('module_role_permissions')
    .columns(['module_role_id', 'action_id'])
    .unique()
    .execute();

  // User global roles
  await db.schema
    .createTable('user_global_roles')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('user_id', 'varchar(255)', (col) => col.notNull())
    .addColumn('organisation_id', 'varchar(255)', (col) => col.notNull())
    .addColumn('role', 'varchar(50)', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`NOW()`)
    )
    .addColumn('granted_by', 'varchar(255)')
    .execute();

  await db.schema
    .createIndex('idx_user_global_roles_unique')
    .on('user_global_roles')
    .columns(['user_id', 'organisation_id'])
    .unique()
    .execute();

  await db.schema
    .createIndex('idx_user_global_roles_org')
    .on('user_global_roles')
    .column('organisation_id')
    .execute();

  // User module roles
  await db.schema
    .createTable('user_module_roles')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('user_id', 'varchar(255)', (col) => col.notNull())
    .addColumn('organisation_id', 'varchar(255)', (col) => col.notNull())
    .addColumn('module_id', 'uuid', (col) =>
      col.notNull().references('modules.id').onDelete('cascade')
    )
    .addColumn('module_role_id', 'uuid', (col) =>
      col.notNull().references('module_roles.id').onDelete('cascade')
    )
    .addColumn('resource_scope', 'jsonb')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`NOW()`)
    )
    .addColumn('granted_by', 'varchar(255)', (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex('idx_user_module_roles_unique')
    .on('user_module_roles')
    .columns(['user_id', 'organisation_id', 'module_id'])
    .unique()
    .execute();

  await db.schema
    .createIndex('idx_user_module_roles_user')
    .on('user_module_roles')
    .column('user_id')
    .execute();

  await db.schema
    .createIndex('idx_user_module_roles_org')
    .on('user_module_roles')
    .column('organisation_id')
    .execute();

  // Policy decision audit log
  await db.schema
    .createTable('policy_decisions')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('organisation_id', 'varchar(255)', (col) => col.notNull())
    .addColumn('user_id', 'varchar(255)', (col) => col.notNull())
    .addColumn('module', 'varchar(100)', (col) => col.notNull())
    .addColumn('action', 'varchar(100)', (col) => col.notNull())
    .addColumn('resource', 'jsonb')
    .addColumn('decision', 'varchar(20)', (col) => col.notNull())
    .addColumn('reason', 'text')
    .addColumn('matched_role', 'varchar(100)')
    .addColumn('request_id', 'varchar(255)')
    .addColumn('endpoint', 'varchar(255)')
    .addColumn('evaluation_time_ms', 'integer')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`NOW()`)
    )
    .execute();

  await db.schema
    .createIndex('idx_policy_decisions_org_time')
    .on('policy_decisions')
    .columns(['organisation_id', 'created_at'])
    .execute();

  await db.schema
    .createIndex('idx_policy_decisions_user')
    .on('policy_decisions')
    .column('user_id')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('policy_decisions').execute();
  await db.schema.dropTable('user_module_roles').execute();
  await db.schema.dropTable('user_global_roles').execute();
  await db.schema.dropTable('module_role_permissions').execute();
  await db.schema.dropTable('module_roles').execute();
  await db.schema.dropTable('module_actions').execute();
  await db.schema.dropTable('modules').execute();
}
```

**Step 2: Run migration**

```bash
npm run migrate
```

Expected: Migration completes successfully

**Step 3: Commit**

```bash
git add src/lib/database/migrations/2026_01_15_create_rbac_tables.ts
git commit -m "feat(rbac): add database migration for RBAC tables"
```

---

### Task 1.2: Add RBAC Types to Database Types

**Files:**
- Modify: `src/lib/database/types.ts`

**Step 1: Add RBAC table interfaces to types.ts**

Add to the end of the file, before the last export:

```typescript
// RBAC Module tables
export interface ModuleTable {
  id: Generated<string>;
  name: string;
  display_name: string;
  description: string | null;
  is_active: boolean;
  created_at: Generated<Date>;
}

export interface ModuleActionTable {
  id: Generated<string>;
  module_id: string;
  name: string;
  display_name: string;
  description: string | null;
  created_at: Generated<Date>;
}

export interface ModuleRoleTable {
  id: Generated<string>;
  module_id: string;
  name: string;
  display_name: string;
  description: string | null;
  created_at: Generated<Date>;
}

export interface ModuleRolePermissionTable {
  id: Generated<string>;
  module_role_id: string;
  action_id: string;
  created_at: Generated<Date>;
}

export type GlobalRole = 'owner' | 'billing' | 'admin';

export interface UserGlobalRoleTable {
  id: Generated<string>;
  user_id: string;
  organisation_id: string;
  role: GlobalRole;
  created_at: Generated<Date>;
  granted_by: string | null;
}

export interface ResourceScope {
  vault_ids?: string[];
}

export interface UserModuleRoleTable {
  id: Generated<string>;
  user_id: string;
  organisation_id: string;
  module_id: string;
  module_role_id: string;
  resource_scope: ColumnType<ResourceScope | null, string | null, string | null>;
  created_at: Generated<Date>;
  granted_by: string;
}

export interface PolicyDecisionTable {
  id: Generated<string>;
  organisation_id: string;
  user_id: string;
  module: string;
  action: string;
  resource: ColumnType<Record<string, unknown> | null, string | null, string | null>;
  decision: 'allow' | 'deny';
  reason: string | null;
  matched_role: string | null;
  request_id: string | null;
  endpoint: string | null;
  evaluation_time_ms: number | null;
  created_at: Generated<Date>;
}

// RBAC type helpers
export type Module = Selectable<ModuleTable>;
export type NewModule = Insertable<ModuleTable>;

export type ModuleAction = Selectable<ModuleActionTable>;
export type NewModuleAction = Insertable<ModuleActionTable>;

export type ModuleRole = Selectable<ModuleRoleTable>;
export type NewModuleRole = Insertable<ModuleRoleTable>;

export type ModuleRolePermission = Selectable<ModuleRolePermissionTable>;
export type NewModuleRolePermission = Insertable<ModuleRolePermissionTable>;

export type UserGlobalRole = Selectable<UserGlobalRoleTable>;
export type NewUserGlobalRole = Insertable<UserGlobalRoleTable>;

export type UserModuleRole = Selectable<UserModuleRoleTable>;
export type NewUserModuleRole = Insertable<UserModuleRoleTable>;

export type PolicyDecision = Selectable<PolicyDecisionTable>;
export type NewPolicyDecision = Insertable<PolicyDecisionTable>;
```

**Step 2: Update Database interface**

Add to the `Database` interface:

```typescript
export interface Database {
  // ... existing tables ...
  modules: ModuleTable;
  module_actions: ModuleActionTable;
  module_roles: ModuleRoleTable;
  module_role_permissions: ModuleRolePermissionTable;
  user_global_roles: UserGlobalRoleTable;
  user_module_roles: UserModuleRoleTable;
  policy_decisions: PolicyDecisionTable;
}
```

**Step 3: Run type check**

```bash
npm run typecheck
```

Expected: No type errors

**Step 4: Commit**

```bash
git add src/lib/database/types.ts
git commit -m "feat(rbac): add RBAC table types to database schema"
```

---

### Task 1.3: Create Seed Migration for Treasury and Compliance Modules

**Files:**
- Create: `src/lib/database/migrations/2026_01_15_seed_rbac_modules.ts`

**Step 1: Write the seed migration**

```typescript
import type { Kysely } from 'kysely';
import { sql } from 'kysely';

interface ModuleRow {
  id: string;
  name: string;
}

interface RoleRow {
  id: string;
  name: string;
}

interface ActionRow {
  id: string;
  name: string;
}

export async function up(db: Kysely<unknown>): Promise<void> {
  // Insert Treasury module
  const treasuryModule = await sql<ModuleRow>`
    INSERT INTO modules (name, display_name, description)
    VALUES ('treasury', 'Treasury', 'Treasury management including vaults, transfers, and balances')
    RETURNING id, name
  `.execute(db);

  const treasuryId = treasuryModule.rows[0]!.id;

  // Insert Compliance module
  const complianceModule = await sql<ModuleRow>`
    INSERT INTO modules (name, display_name, description)
    VALUES ('compliance', 'Compliance', 'Compliance management including audit logs, policies, and reports')
    RETURNING id, name
  `.execute(db);

  const complianceId = complianceModule.rows[0]!.id;

  // Treasury actions
  const treasuryActions = [
    { name: 'view_balances', display_name: 'View Balances', description: 'View vault and address balances' },
    { name: 'view_transactions', display_name: 'View Transactions', description: 'View transaction history and status' },
    { name: 'initiate_transfer', display_name: 'Initiate Transfer', description: 'Create new transfer transactions' },
    { name: 'approve_transfer', display_name: 'Approve Transfer', description: 'Approve pending transfers' },
    { name: 'cancel_transfer', display_name: 'Cancel Transfer', description: 'Cancel pending/draft transactions' },
    { name: 'manage_vaults', display_name: 'Manage Vaults', description: 'Create vaults, update settings, manage addresses' },
    { name: 'manage_allowlists', display_name: 'Manage Allowlists', description: 'Add/remove approved destination addresses' },
    { name: 'export_data', display_name: 'Export Data', description: 'Export reports and transaction data' },
  ];

  const treasuryActionRows: ActionRow[] = [];
  for (const action of treasuryActions) {
    const result = await sql<ActionRow>`
      INSERT INTO module_actions (module_id, name, display_name, description)
      VALUES (${treasuryId}, ${action.name}, ${action.display_name}, ${action.description})
      RETURNING id, name
    `.execute(db);
    treasuryActionRows.push(result.rows[0]!);
  }

  // Compliance actions
  const complianceActions = [
    { name: 'view_audit_logs', display_name: 'View Audit Logs', description: 'View all decision/activity logs' },
    { name: 'view_policies', display_name: 'View Policies', description: 'See current policy rules' },
    { name: 'manage_policies', display_name: 'Manage Policies', description: 'Create/edit policy rules' },
    { name: 'view_reports', display_name: 'View Reports', description: 'Access compliance reports' },
    { name: 'export_audit_data', display_name: 'Export Audit Data', description: 'Export audit trails' },
    { name: 'manage_sanctions', display_name: 'Manage Sanctions', description: 'Configure sanctions list settings' },
    { name: 'replay_decisions', display_name: 'Replay Decisions', description: 'Replay past policy decisions for audit' },
    { name: 'approve_transfer', display_name: 'Approve Transfer', description: 'Approve transfers from compliance perspective' },
  ];

  const complianceActionRows: ActionRow[] = [];
  for (const action of complianceActions) {
    const result = await sql<ActionRow>`
      INSERT INTO module_actions (module_id, name, display_name, description)
      VALUES (${complianceId}, ${action.name}, ${action.display_name}, ${action.description})
      RETURNING id, name
    `.execute(db);
    complianceActionRows.push(result.rows[0]!);
  }

  // Create roles for Treasury
  const treasuryRoles = [
    { name: 'admin', display_name: 'Admin', description: 'Full access to all Treasury actions' },
    { name: 'treasurer', display_name: 'Treasurer', description: 'Operational access to Treasury' },
    { name: 'auditor', display_name: 'Auditor', description: 'Read-only access to Treasury' },
  ];

  const treasuryRoleRows: RoleRow[] = [];
  for (const role of treasuryRoles) {
    const result = await sql<RoleRow>`
      INSERT INTO module_roles (module_id, name, display_name, description)
      VALUES (${treasuryId}, ${role.name}, ${role.display_name}, ${role.description})
      RETURNING id, name
    `.execute(db);
    treasuryRoleRows.push(result.rows[0]!);
  }

  // Create roles for Compliance
  const complianceRoles = [
    { name: 'admin', display_name: 'Admin', description: 'Full access to all Compliance actions' },
    { name: 'treasurer', display_name: 'Treasurer', description: 'Limited compliance access' },
    { name: 'auditor', display_name: 'Auditor', description: 'Audit-focused access to Compliance' },
  ];

  const complianceRoleRows: RoleRow[] = [];
  for (const role of complianceRoles) {
    const result = await sql<RoleRow>`
      INSERT INTO module_roles (module_id, name, display_name, description)
      VALUES (${complianceId}, ${role.name}, ${role.display_name}, ${role.description})
      RETURNING id, name
    `.execute(db);
    complianceRoleRows.push(result.rows[0]!);
  }

  // Treasury role permissions mapping
  const treasuryPermissions: Record<string, string[]> = {
    admin: ['view_balances', 'view_transactions', 'initiate_transfer', 'approve_transfer', 'cancel_transfer', 'manage_vaults', 'manage_allowlists', 'export_data'],
    treasurer: ['view_balances', 'view_transactions', 'initiate_transfer', 'cancel_transfer', 'export_data'],
    auditor: ['view_balances', 'view_transactions', 'export_data'],
  };

  for (const [roleName, actionNames] of Object.entries(treasuryPermissions)) {
    const role = treasuryRoleRows.find(r => r.name === roleName)!;
    for (const actionName of actionNames) {
      const action = treasuryActionRows.find(a => a.name === actionName)!;
      await sql`
        INSERT INTO module_role_permissions (module_role_id, action_id)
        VALUES (${role.id}, ${action.id})
      `.execute(db);
    }
  }

  // Compliance role permissions mapping
  const compliancePermissions: Record<string, string[]> = {
    admin: ['view_audit_logs', 'view_policies', 'manage_policies', 'view_reports', 'export_audit_data', 'manage_sanctions', 'replay_decisions', 'approve_transfer'],
    treasurer: ['view_policies', 'view_reports'],
    auditor: ['view_audit_logs', 'view_policies', 'view_reports', 'export_audit_data', 'replay_decisions'],
  };

  for (const [roleName, actionNames] of Object.entries(compliancePermissions)) {
    const role = complianceRoleRows.find(r => r.name === roleName)!;
    for (const actionName of actionNames) {
      const action = complianceActionRows.find(a => a.name === actionName)!;
      await sql`
        INSERT INTO module_role_permissions (module_role_id, action_id)
        VALUES (${role.id}, ${action.id})
      `.execute(db);
    }
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Cascade delete will handle permissions and roles
  await sql`DELETE FROM modules WHERE name IN ('treasury', 'compliance')`.execute(db);
}
```

**Step 2: Run migration**

```bash
npm run migrate
```

Expected: Seed data inserted successfully

**Step 3: Commit**

```bash
git add src/lib/database/migrations/2026_01_15_seed_rbac_modules.ts
git commit -m "feat(rbac): seed Treasury and Compliance modules with roles and permissions"
```

---

### Task 1.4: Create RBAC Repository

**Files:**
- Create: `src/repositories/rbac.repository.ts`
- Create: `tests/unit/repositories/rbac.repository.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/repositories/rbac.repository.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresRbacRepository, type RbacRepository } from '@/src/repositories/rbac.repository.js';

describe('RbacRepository', () => {
  describe('getUserWithRoles', () => {
    it('should return user with global role and module roles', async () => {
      const mockDb = {
        selectFrom: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        selectAll: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn(),
        execute: vi.fn(),
      };

      // Mock global role query
      mockDb.executeTakeFirst.mockResolvedValueOnce({
        id: 'role-1',
        user_id: 'user-1',
        organisation_id: 'org-1',
        role: 'admin',
      });

      // Mock module roles query
      mockDb.execute.mockResolvedValueOnce([
        {
          module_name: 'treasury',
          role_name: 'treasurer',
          resource_scope: null,
        },
      ]);

      const repository = new PostgresRbacRepository(mockDb as any);
      const result = await repository.getUserWithRoles('user-1', 'org-1');

      expect(result).toEqual({
        userId: 'user-1',
        organisationId: 'org-1',
        globalRole: 'admin',
        moduleRoles: [
          {
            module: 'treasury',
            role: 'treasurer',
            resourceScope: null,
          },
        ],
      });
    });

    it('should return null global role if user has no global role', async () => {
      const mockDb = {
        selectFrom: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        selectAll: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockResolvedValueOnce(undefined),
        execute: vi.fn().mockResolvedValueOnce([]),
      };

      const repository = new PostgresRbacRepository(mockDb as any);
      const result = await repository.getUserWithRoles('user-1', 'org-1');

      expect(result.globalRole).toBeNull();
      expect(result.moduleRoles).toEqual([]);
    });
  });

  describe('getModuleRolePermissions', () => {
    it('should return action names for a module role', async () => {
      const mockDb = {
        selectFrom: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValueOnce([
          { action_name: 'view_balances' },
          { action_name: 'initiate_transfer' },
        ]),
      };

      const repository = new PostgresRbacRepository(mockDb as any);
      const result = await repository.getModuleRolePermissions('treasury', 'treasurer');

      expect(result).toEqual(['view_balances', 'initiate_transfer']);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/unit/repositories/rbac.repository.test.ts
```

Expected: FAIL - module not found

**Step 3: Write the repository implementation**

```typescript
// src/repositories/rbac.repository.ts
import type { Kysely } from 'kysely';
import type { Database, GlobalRole, ResourceScope } from '@/src/lib/database/types.js';

export interface UserModuleRoleInfo {
  module: string;
  role: string;
  resourceScope: ResourceScope | null;
}

export interface UserWithRoles {
  userId: string;
  organisationId: string;
  globalRole: GlobalRole | null;
  moduleRoles: UserModuleRoleInfo[];
}

export interface RbacRepository {
  getUserWithRoles(userId: string, organisationId: string): Promise<UserWithRoles>;
  getModuleRolePermissions(moduleName: string, roleName: string): Promise<string[]>;
  getAllRolePermissions(): Promise<Map<string, string[]>>;
  findModuleByName(name: string): Promise<{ id: string; name: string } | null>;
  findModuleRoleByName(moduleId: string, roleName: string): Promise<{ id: string; name: string } | null>;
  assignGlobalRole(userId: string, organisationId: string, role: GlobalRole, grantedBy: string): Promise<void>;
  removeGlobalRole(userId: string, organisationId: string): Promise<boolean>;
  assignModuleRole(params: {
    userId: string;
    organisationId: string;
    moduleId: string;
    moduleRoleId: string;
    resourceScope: ResourceScope | null;
    grantedBy: string;
  }): Promise<void>;
  removeModuleRole(userId: string, organisationId: string, moduleId: string): Promise<boolean>;
  listModules(): Promise<Array<{ id: string; name: string; displayName: string; description: string | null }>>;
  listModuleRoles(moduleId: string): Promise<Array<{ id: string; name: string; displayName: string; description: string | null }>>;
  listModuleActions(moduleId: string): Promise<Array<{ id: string; name: string; displayName: string; description: string | null }>>;
}

export class PostgresRbacRepository implements RbacRepository {
  constructor(private db: Kysely<Database>) {}

  async getUserWithRoles(userId: string, organisationId: string): Promise<UserWithRoles> {
    // Get global role
    const globalRoleRow = await this.db
      .selectFrom('user_global_roles')
      .selectAll()
      .where('user_id', '=', userId)
      .where('organisation_id', '=', organisationId)
      .executeTakeFirst();

    // Get module roles with module and role names
    const moduleRolesRows = await this.db
      .selectFrom('user_module_roles as umr')
      .innerJoin('modules as m', 'm.id', 'umr.module_id')
      .innerJoin('module_roles as mr', 'mr.id', 'umr.module_role_id')
      .select([
        'm.name as module_name',
        'mr.name as role_name',
        'umr.resource_scope',
      ])
      .where('umr.user_id', '=', userId)
      .where('umr.organisation_id', '=', organisationId)
      .execute();

    return {
      userId,
      organisationId,
      globalRole: (globalRoleRow?.role as GlobalRole) ?? null,
      moduleRoles: moduleRolesRows.map((row) => ({
        module: row.module_name,
        role: row.role_name,
        resourceScope: row.resource_scope,
      })),
    };
  }

  async getModuleRolePermissions(moduleName: string, roleName: string): Promise<string[]> {
    const rows = await this.db
      .selectFrom('module_role_permissions as mrp')
      .innerJoin('module_roles as mr', 'mr.id', 'mrp.module_role_id')
      .innerJoin('modules as m', 'm.id', 'mr.module_id')
      .innerJoin('module_actions as ma', 'ma.id', 'mrp.action_id')
      .select('ma.name as action_name')
      .where('m.name', '=', moduleName)
      .where('mr.name', '=', roleName)
      .execute();

    return rows.map((row) => row.action_name);
  }

  async getAllRolePermissions(): Promise<Map<string, string[]>> {
    const rows = await this.db
      .selectFrom('module_role_permissions as mrp')
      .innerJoin('module_roles as mr', 'mr.id', 'mrp.module_role_id')
      .innerJoin('modules as m', 'm.id', 'mr.module_id')
      .innerJoin('module_actions as ma', 'ma.id', 'mrp.action_id')
      .select([
        'm.name as module_name',
        'mr.name as role_name',
        'ma.name as action_name',
      ])
      .execute();

    const permissionsMap = new Map<string, string[]>();
    for (const row of rows) {
      const key = `${row.module_name}:${row.role_name}`;
      const existing = permissionsMap.get(key) ?? [];
      existing.push(row.action_name);
      permissionsMap.set(key, existing);
    }

    return permissionsMap;
  }

  async findModuleByName(name: string): Promise<{ id: string; name: string } | null> {
    const row = await this.db
      .selectFrom('modules')
      .select(['id', 'name'])
      .where('name', '=', name)
      .where('is_active', '=', true)
      .executeTakeFirst();

    return row ?? null;
  }

  async findModuleRoleByName(moduleId: string, roleName: string): Promise<{ id: string; name: string } | null> {
    const row = await this.db
      .selectFrom('module_roles')
      .select(['id', 'name'])
      .where('module_id', '=', moduleId)
      .where('name', '=', roleName)
      .executeTakeFirst();

    return row ?? null;
  }

  async assignGlobalRole(
    userId: string,
    organisationId: string,
    role: GlobalRole,
    grantedBy: string
  ): Promise<void> {
    await this.db
      .insertInto('user_global_roles')
      .values({
        user_id: userId,
        organisation_id: organisationId,
        role,
        granted_by: grantedBy,
      })
      .onConflict((oc) =>
        oc.columns(['user_id', 'organisation_id']).doUpdateSet({
          role,
          granted_by: grantedBy,
        })
      )
      .execute();
  }

  async removeGlobalRole(userId: string, organisationId: string): Promise<boolean> {
    const result = await this.db
      .deleteFrom('user_global_roles')
      .where('user_id', '=', userId)
      .where('organisation_id', '=', organisationId)
      .executeTakeFirst();

    return (result.numDeletedRows ?? 0n) > 0n;
  }

  async assignModuleRole(params: {
    userId: string;
    organisationId: string;
    moduleId: string;
    moduleRoleId: string;
    resourceScope: ResourceScope | null;
    grantedBy: string;
  }): Promise<void> {
    await this.db
      .insertInto('user_module_roles')
      .values({
        user_id: params.userId,
        organisation_id: params.organisationId,
        module_id: params.moduleId,
        module_role_id: params.moduleRoleId,
        resource_scope: params.resourceScope ? JSON.stringify(params.resourceScope) : null,
        granted_by: params.grantedBy,
      })
      .onConflict((oc) =>
        oc.columns(['user_id', 'organisation_id', 'module_id']).doUpdateSet({
          module_role_id: params.moduleRoleId,
          resource_scope: params.resourceScope ? JSON.stringify(params.resourceScope) : null,
          granted_by: params.grantedBy,
        })
      )
      .execute();
  }

  async removeModuleRole(userId: string, organisationId: string, moduleId: string): Promise<boolean> {
    const result = await this.db
      .deleteFrom('user_module_roles')
      .where('user_id', '=', userId)
      .where('organisation_id', '=', organisationId)
      .where('module_id', '=', moduleId)
      .executeTakeFirst();

    return (result.numDeletedRows ?? 0n) > 0n;
  }

  async listModules(): Promise<Array<{ id: string; name: string; displayName: string; description: string | null }>> {
    const rows = await this.db
      .selectFrom('modules')
      .select(['id', 'name', 'display_name', 'description'])
      .where('is_active', '=', true)
      .execute();

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
    }));
  }

  async listModuleRoles(moduleId: string): Promise<Array<{ id: string; name: string; displayName: string; description: string | null }>> {
    const rows = await this.db
      .selectFrom('module_roles')
      .select(['id', 'name', 'display_name', 'description'])
      .where('module_id', '=', moduleId)
      .execute();

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
    }));
  }

  async listModuleActions(moduleId: string): Promise<Array<{ id: string; name: string; displayName: string; description: string | null }>> {
    const rows = await this.db
      .selectFrom('module_actions')
      .select(['id', 'name', 'display_name', 'description'])
      .where('module_id', '=', moduleId)
      .execute();

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
    }));
  }
}
```

**Step 4: Run tests**

```bash
npm test -- tests/unit/repositories/rbac.repository.test.ts
```

Expected: All tests pass

**Step 5: Commit**

```bash
git add src/repositories/rbac.repository.ts tests/unit/repositories/rbac.repository.test.ts
git commit -m "feat(rbac): add RBAC repository with user roles queries"
```

---

### Task 1.5: Create Policy Service

**Files:**
- Create: `src/services/policy/policy-service.ts`
- Create: `src/services/policy/types.ts`
- Create: `tests/unit/services/policy/policy-service.test.ts`

**Step 1: Create types file**

```typescript
// src/services/policy/types.ts
import type { ResourceScope, GlobalRole } from '@/src/lib/database/types.js';

export interface PolicyInput {
  user: {
    id: string;
    globalRole: GlobalRole | null;
    moduleRoles: Array<{
      module: string;
      role: string;
      resourceScope: ResourceScope | null;
    }>;
  };
  module: string;
  action: string;
  resource: {
    vaultId?: string;
  };
}

export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
  matchedRole?: string;
}

export interface PolicyService {
  checkAccess(params: {
    userId: string;
    organisationId: string;
    module: string;
    action: string;
    resource?: { vaultId?: string };
  }): Promise<PolicyDecision>;
}
```

**Step 2: Write the failing test**

```typescript
// tests/unit/services/policy/policy-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalPolicyService } from '@/src/services/policy/policy-service.js';
import type { RbacRepository } from '@/src/repositories/rbac.repository.js';

describe('PolicyService', () => {
  let mockRepository: RbacRepository;
  let service: LocalPolicyService;

  beforeEach(() => {
    mockRepository = {
      getUserWithRoles: vi.fn(),
      getModuleRolePermissions: vi.fn(),
      getAllRolePermissions: vi.fn(),
    } as unknown as RbacRepository;

    service = new LocalPolicyService(mockRepository);
  });

  describe('checkAccess', () => {
    it('should allow access for owner global role', async () => {
      vi.mocked(mockRepository.getUserWithRoles).mockResolvedValue({
        userId: 'user-1',
        organisationId: 'org-1',
        globalRole: 'owner',
        moduleRoles: [],
      });

      const result = await service.checkAccess({
        userId: 'user-1',
        organisationId: 'org-1',
        module: 'treasury',
        action: 'manage_vaults',
      });

      expect(result.allowed).toBe(true);
      expect(result.matchedRole).toBe('owner');
    });

    it('should allow access when user has module role with permission', async () => {
      vi.mocked(mockRepository.getUserWithRoles).mockResolvedValue({
        userId: 'user-1',
        organisationId: 'org-1',
        globalRole: null,
        moduleRoles: [{ module: 'treasury', role: 'treasurer', resourceScope: null }],
      });

      vi.mocked(mockRepository.getModuleRolePermissions).mockResolvedValue([
        'view_balances',
        'initiate_transfer',
      ]);

      const result = await service.checkAccess({
        userId: 'user-1',
        organisationId: 'org-1',
        module: 'treasury',
        action: 'initiate_transfer',
      });

      expect(result.allowed).toBe(true);
      expect(result.matchedRole).toBe('treasury:treasurer');
    });

    it('should deny access when user has no role for module', async () => {
      vi.mocked(mockRepository.getUserWithRoles).mockResolvedValue({
        userId: 'user-1',
        organisationId: 'org-1',
        globalRole: null,
        moduleRoles: [],
      });

      const result = await service.checkAccess({
        userId: 'user-1',
        organisationId: 'org-1',
        module: 'treasury',
        action: 'initiate_transfer',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('no role assigned');
    });

    it('should deny access when role does not have required permission', async () => {
      vi.mocked(mockRepository.getUserWithRoles).mockResolvedValue({
        userId: 'user-1',
        organisationId: 'org-1',
        globalRole: null,
        moduleRoles: [{ module: 'treasury', role: 'auditor', resourceScope: null }],
      });

      vi.mocked(mockRepository.getModuleRolePermissions).mockResolvedValue([
        'view_balances',
        'view_transactions',
      ]);

      const result = await service.checkAccess({
        userId: 'user-1',
        organisationId: 'org-1',
        module: 'treasury',
        action: 'initiate_transfer',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('does not permit');
    });

    it('should respect resource scope restrictions', async () => {
      vi.mocked(mockRepository.getUserWithRoles).mockResolvedValue({
        userId: 'user-1',
        organisationId: 'org-1',
        globalRole: null,
        moduleRoles: [
          {
            module: 'treasury',
            role: 'treasurer',
            resourceScope: { vault_ids: ['vault-1', 'vault-2'] },
          },
        ],
      });

      vi.mocked(mockRepository.getModuleRolePermissions).mockResolvedValue([
        'view_balances',
        'initiate_transfer',
      ]);

      // Access to allowed vault
      const allowedResult = await service.checkAccess({
        userId: 'user-1',
        organisationId: 'org-1',
        module: 'treasury',
        action: 'initiate_transfer',
        resource: { vaultId: 'vault-1' },
      });

      expect(allowedResult.allowed).toBe(true);

      // Access to non-allowed vault
      const deniedResult = await service.checkAccess({
        userId: 'user-1',
        organisationId: 'org-1',
        module: 'treasury',
        action: 'initiate_transfer',
        resource: { vaultId: 'vault-3' },
      });

      expect(deniedResult.allowed).toBe(false);
      expect(deniedResult.reason).toContain('resource scope');
    });
  });
});
```

**Step 3: Run test to verify it fails**

```bash
npm test -- tests/unit/services/policy/policy-service.test.ts
```

Expected: FAIL - module not found

**Step 4: Write the policy service implementation**

```typescript
// src/services/policy/policy-service.ts
import type { RbacRepository, UserModuleRoleInfo } from '@/src/repositories/rbac.repository.js';
import type { PolicyService, PolicyDecision } from './types.js';

export class LocalPolicyService implements PolicyService {
  constructor(private rbacRepository: RbacRepository) {}

  async checkAccess(params: {
    userId: string;
    organisationId: string;
    module: string;
    action: string;
    resource?: { vaultId?: string };
  }): Promise<PolicyDecision> {
    const userWithRoles = await this.rbacRepository.getUserWithRoles(
      params.userId,
      params.organisationId
    );

    // Owner bypasses all checks
    if (userWithRoles.globalRole === 'owner') {
      return { allowed: true, matchedRole: 'owner' };
    }

    // Find module role for requested module
    const moduleRole = userWithRoles.moduleRoles.find(
      (mr) => mr.module === params.module
    );

    if (!moduleRole) {
      return {
        allowed: false,
        reason: `no role assigned for module '${params.module}'`,
      };
    }

    // Check resource scope if specified
    if (!this.isValidScope(moduleRole, params.resource)) {
      return {
        allowed: false,
        reason: `resource scope does not permit access to this resource`,
      };
    }

    // Check action permission
    const permissions = await this.rbacRepository.getModuleRolePermissions(
      params.module,
      moduleRole.role
    );

    if (!permissions.includes(params.action)) {
      return {
        allowed: false,
        reason: `role '${moduleRole.role}' does not permit action '${params.action}'`,
      };
    }

    return {
      allowed: true,
      matchedRole: `${params.module}:${moduleRole.role}`,
    };
  }

  private isValidScope(
    moduleRole: UserModuleRoleInfo,
    resource?: { vaultId?: string }
  ): boolean {
    // No scope restriction = module-wide access
    if (!moduleRole.resourceScope) {
      return true;
    }

    // No resource specified in request = allow (scope check not applicable)
    if (!resource?.vaultId) {
      return true;
    }

    // Check if vault is in allowed list
    const allowedVaults = moduleRole.resourceScope.vault_ids;
    if (allowedVaults && !allowedVaults.includes(resource.vaultId)) {
      return false;
    }

    return true;
  }
}
```

**Step 5: Run tests**

```bash
npm test -- tests/unit/services/policy/policy-service.test.ts
```

Expected: All tests pass

**Step 6: Commit**

```bash
git add src/services/policy/types.ts src/services/policy/policy-service.ts tests/unit/services/policy/policy-service.test.ts
git commit -m "feat(rbac): add policy service for access control evaluation"
```

---

## Phase 2: Middleware Integration

### Task 2.1: Create Policy Middleware Plugin

**Files:**
- Create: `src/plugins/policy.ts`
- Create: `tests/unit/plugins/policy.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/plugins/policy.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import policyPlugin from '@/src/plugins/policy.js';
import type { PolicyService } from '@/src/services/policy/types.js';

describe('Policy Plugin', () => {
  let app: FastifyInstance;
  let mockPolicyService: PolicyService;

  beforeEach(async () => {
    mockPolicyService = {
      checkAccess: vi.fn(),
    };

    app = Fastify();

    // Mock auth context
    app.decorateRequest('auth', null);
    app.addHook('onRequest', async (request) => {
      request.auth = {
        userId: 'user-1',
        organisationId: 'org-1',
        token: 'test-token',
      };
    });

    await app.register(policyPlugin, {
      policyService: mockPolicyService,
    });
  });

  it('should decorate fastify with policy service', async () => {
    expect(app.policy).toBeDefined();
    expect(app.policy.checkAccess).toBeDefined();
  });

  it('should decorate request with requireAccess helper', async () => {
    app.get('/test', {
      preHandler: async (request) => {
        expect(request.requireAccess).toBeDefined();
      },
    }, async () => ({ ok: true }));

    await app.ready();

    vi.mocked(mockPolicyService.checkAccess).mockResolvedValue({ allowed: true });

    const response = await app.inject({
      method: 'GET',
      url: '/test',
    });

    expect(response.statusCode).toBe(200);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/unit/plugins/policy.test.ts
```

Expected: FAIL - module not found

**Step 3: Write the policy plugin**

```typescript
// src/plugins/policy.ts
import { OperationForbiddenError } from '@iofinnet/errors-sdk';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import type { PolicyService, PolicyDecision } from '@/src/services/policy/types.js';

declare module 'fastify' {
  interface FastifyInstance {
    policy: PolicyService;
  }

  interface FastifyRequest {
    requireAccess: (module: string, action: string, resource?: { vaultId?: string }) => Promise<void>;
    policyDecision?: PolicyDecision;
  }
}

export interface PolicyPluginOptions {
  policyService: PolicyService;
}

async function policyPlugin(fastify: FastifyInstance, options: PolicyPluginOptions) {
  const { policyService } = options;

  // Decorate fastify instance with policy service
  fastify.decorate('policy', policyService);

  // Decorate request with requireAccess helper
  fastify.decorateRequest('requireAccess', null);
  fastify.decorateRequest('policyDecision', null);

  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    request.requireAccess = async (
      module: string,
      action: string,
      resource?: { vaultId?: string }
    ) => {
      if (!request.auth) {
        throw new OperationForbiddenError('Authentication required');
      }

      const decision = await policyService.checkAccess({
        userId: request.auth.userId,
        organisationId: request.auth.organisationId,
        module,
        action,
        resource,
      });

      request.policyDecision = decision;

      if (!decision.allowed) {
        throw new OperationForbiddenError(decision.reason ?? 'Access denied');
      }
    };
  });
}

export default fp(policyPlugin, {
  name: 'policy',
  dependencies: ['auth'],
});
```

**Step 4: Run tests**

```bash
npm test -- tests/unit/plugins/policy.test.ts
```

Expected: All tests pass

**Step 5: Commit**

```bash
git add src/plugins/policy.ts tests/unit/plugins/policy.test.ts
git commit -m "feat(rbac): add policy plugin for access control middleware"
```

---

### Task 2.2: Create requireAccess Prehandler Factory

**Files:**
- Create: `src/middleware/require-access.ts`
- Create: `tests/unit/middleware/require-access.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/middleware/require-access.test.ts
import { describe, it, expect, vi } from 'vitest';
import { requireAccess } from '@/src/middleware/require-access.js';

describe('requireAccess', () => {
  it('should return a preHandler function', () => {
    const handler = requireAccess('treasury', 'view_balances');
    expect(typeof handler).toBe('function');
  });

  it('should call request.requireAccess with module and action', async () => {
    const handler = requireAccess('treasury', 'initiate_transfer');

    const mockRequest = {
      requireAccess: vi.fn().mockResolvedValue(undefined),
      params: {},
    } as any;

    const mockReply = {} as any;

    await handler(mockRequest, mockReply);

    expect(mockRequest.requireAccess).toHaveBeenCalledWith(
      'treasury',
      'initiate_transfer',
      { vaultId: undefined }
    );
  });

  it('should extract vaultId from params', async () => {
    const handler = requireAccess('treasury', 'manage_vaults');

    const mockRequest = {
      requireAccess: vi.fn().mockResolvedValue(undefined),
      params: { vaultId: 'vault-123' },
    } as any;

    const mockReply = {} as any;

    await handler(mockRequest, mockReply);

    expect(mockRequest.requireAccess).toHaveBeenCalledWith(
      'treasury',
      'manage_vaults',
      { vaultId: 'vault-123' }
    );
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/unit/middleware/require-access.test.ts
```

Expected: FAIL - module not found

**Step 3: Write the requireAccess middleware**

```typescript
// src/middleware/require-access.ts
import type { FastifyRequest, FastifyReply } from 'fastify';

type PreHandlerFunction = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

/**
 * Creates a preHandler that checks module/action access.
 * Extracts vaultId from request params if present.
 */
export function requireAccess(module: string, action: string): PreHandlerFunction {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const params = request.params as Record<string, string>;
    const vaultId = params?.vaultId;

    await request.requireAccess(module, action, { vaultId });
  };
}
```

**Step 4: Run tests**

```bash
npm test -- tests/unit/middleware/require-access.test.ts
```

Expected: All tests pass

**Step 5: Commit**

```bash
git add src/middleware/require-access.ts tests/unit/middleware/require-access.test.ts
git commit -m "feat(rbac): add requireAccess preHandler factory"
```

---

### Task 2.3: Integrate Policy Plugin into App

**Files:**
- Modify: `src/app.ts`
- Modify: `src/plugins/database.ts`

**Step 1: Update database plugin to expose rbac repository**

Add to `src/plugins/database.ts`:

```typescript
// Add import
import { PostgresRbacRepository, type RbacRepository } from '@/src/repositories/rbac.repository.js';

// Add to FastifyInstance declaration
declare module 'fastify' {
  interface FastifyInstance {
    // ... existing declarations ...
    rbacRepository: RbacRepository;
  }
}

// In the plugin, after db is created:
const rbacRepository = new PostgresRbacRepository(db);
fastify.decorate('rbacRepository', rbacRepository);
```

**Step 2: Update app.ts to register policy plugin**

```typescript
// Add imports
import policyPlugin from '@/src/plugins/policy.js';
import { LocalPolicyService } from '@/src/services/policy/policy-service.js';

// After database plugin registration, add:
app.register(async (instance) => {
  // Wait for database plugin to be ready
  await instance.ready();

  const policyService = new LocalPolicyService(instance.rbacRepository);
  await instance.register(policyPlugin, { policyService });
});
```

**Step 3: Run type check and tests**

```bash
npm run typecheck
npm test
```

Expected: No errors

**Step 4: Commit**

```bash
git add src/app.ts src/plugins/database.ts
git commit -m "feat(rbac): integrate policy plugin into application"
```

---

### Task 2.4: Add Policy Decision Logging

**Files:**
- Create: `src/services/policy/decision-logger.ts`
- Create: `tests/unit/services/policy/decision-logger.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/services/policy/decision-logger.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PolicyDecisionLogger } from '@/src/services/policy/decision-logger.js';

describe('PolicyDecisionLogger', () => {
  let mockDb: any;
  let logger: PolicyDecisionLogger;

  beforeEach(() => {
    vi.useFakeTimers();

    mockDb = {
      insertInto: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue(undefined),
    };

    logger = new PolicyDecisionLogger(mockDb, { batchSize: 2, flushIntervalMs: 1000 });
  });

  afterEach(() => {
    vi.useRealTimers();
    logger.stop();
  });

  it('should queue decisions and flush when batch size reached', async () => {
    logger.log({
      organisationId: 'org-1',
      userId: 'user-1',
      module: 'treasury',
      action: 'view_balances',
      decision: 'allow',
    });

    expect(mockDb.insertInto).not.toHaveBeenCalled();

    logger.log({
      organisationId: 'org-1',
      userId: 'user-2',
      module: 'treasury',
      action: 'initiate_transfer',
      decision: 'deny',
      reason: 'no permission',
    });

    // Wait for flush
    await vi.advanceTimersByTimeAsync(10);

    expect(mockDb.insertInto).toHaveBeenCalledWith('policy_decisions');
    expect(mockDb.values).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ user_id: 'user-1' }),
        expect.objectContaining({ user_id: 'user-2' }),
      ])
    );
  });

  it('should flush on interval', async () => {
    logger.log({
      organisationId: 'org-1',
      userId: 'user-1',
      module: 'treasury',
      action: 'view_balances',
      decision: 'allow',
    });

    expect(mockDb.insertInto).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);

    expect(mockDb.insertInto).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/unit/services/policy/decision-logger.test.ts
```

Expected: FAIL - module not found

**Step 3: Write the decision logger**

```typescript
// src/services/policy/decision-logger.ts
import type { Kysely } from 'kysely';
import type { Database } from '@/src/lib/database/types.js';

export interface PolicyDecisionLogEntry {
  organisationId: string;
  userId: string;
  module: string;
  action: string;
  resource?: Record<string, unknown>;
  decision: 'allow' | 'deny';
  reason?: string;
  matchedRole?: string;
  requestId?: string;
  endpoint?: string;
  evaluationTimeMs?: number;
}

interface PolicyDecisionLoggerOptions {
  batchSize?: number;
  flushIntervalMs?: number;
}

export class PolicyDecisionLogger {
  private queue: PolicyDecisionLogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private batchSize: number;

  constructor(
    private db: Kysely<Database>,
    options: PolicyDecisionLoggerOptions = {}
  ) {
    this.batchSize = options.batchSize ?? 100;
    const flushIntervalMs = options.flushIntervalMs ?? 5000;

    this.flushInterval = setInterval(() => {
      this.flush();
    }, flushIntervalMs);
  }

  log(entry: PolicyDecisionLogEntry): void {
    this.queue.push(entry);

    if (this.queue.length >= this.batchSize) {
      this.flush();
    }
  }

  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    const batch = this.queue.splice(0, this.batchSize);

    try {
      await this.db
        .insertInto('policy_decisions')
        .values(
          batch.map((entry) => ({
            organisation_id: entry.organisationId,
            user_id: entry.userId,
            module: entry.module,
            action: entry.action,
            resource: entry.resource ? JSON.stringify(entry.resource) : null,
            decision: entry.decision,
            reason: entry.reason ?? null,
            matched_role: entry.matchedRole ?? null,
            request_id: entry.requestId ?? null,
            endpoint: entry.endpoint ?? null,
            evaluation_time_ms: entry.evaluationTimeMs ?? null,
          }))
        )
        .execute();
    } catch (error) {
      // Log error but don't throw - decision logging is not critical path
      console.error('Failed to flush policy decisions:', error);
      // Re-queue failed items (up to limit to prevent memory leak)
      if (this.queue.length < 1000) {
        this.queue.unshift(...batch);
      }
    }
  }
}
```

**Step 4: Run tests**

```bash
npm test -- tests/unit/services/policy/decision-logger.test.ts
```

Expected: All tests pass

**Step 5: Commit**

```bash
git add src/services/policy/decision-logger.ts tests/unit/services/policy/decision-logger.test.ts
git commit -m "feat(rbac): add async policy decision logger for audit trail"
```

---

## Phase 3: Role Management API

### Task 3.1: Create Module Routes - List Modules

**Files:**
- Create: `src/routes/modules/index.ts`
- Create: `src/routes/modules/handlers.ts`
- Create: `src/routes/modules/schemas.ts`

**Step 1: Create schemas**

```typescript
// src/routes/modules/schemas.ts
import { z } from 'zod';

export const moduleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  display_name: z.string(),
  description: z.string().nullable(),
});

export const listModulesResponseSchema = z.object({
  modules: z.array(moduleSchema),
});

export const moduleRoleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  display_name: z.string(),
  description: z.string().nullable(),
});

export const listModuleRolesResponseSchema = z.object({
  roles: z.array(moduleRoleSchema),
});

export const moduleActionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  display_name: z.string(),
  description: z.string().nullable(),
});

export const listModuleActionsResponseSchema = z.object({
  actions: z.array(moduleActionSchema),
});
```

**Step 2: Create handlers**

```typescript
// src/routes/modules/handlers.ts
import type { FastifyRequest, FastifyReply } from 'fastify';
import { NotFoundError } from '@iofinnet/errors-sdk';

export async function listModules(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const modules = await request.server.rbacRepository.listModules();

  reply.send({
    modules: modules.map((m) => ({
      id: m.id,
      name: m.name,
      display_name: m.displayName,
      description: m.description,
    })),
  });
}

export async function listModuleRoles(
  request: FastifyRequest<{ Params: { moduleId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { moduleId } = request.params;

  const roles = await request.server.rbacRepository.listModuleRoles(moduleId);

  if (roles.length === 0) {
    // Check if module exists
    const modules = await request.server.rbacRepository.listModules();
    const moduleExists = modules.some((m) => m.id === moduleId);
    if (!moduleExists) {
      throw new NotFoundError(`Module not found: ${moduleId}`);
    }
  }

  reply.send({
    roles: roles.map((r) => ({
      id: r.id,
      name: r.name,
      display_name: r.displayName,
      description: r.description,
    })),
  });
}

export async function listModuleActions(
  request: FastifyRequest<{ Params: { moduleId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { moduleId } = request.params;

  const actions = await request.server.rbacRepository.listModuleActions(moduleId);

  if (actions.length === 0) {
    const modules = await request.server.rbacRepository.listModules();
    const moduleExists = modules.some((m) => m.id === moduleId);
    if (!moduleExists) {
      throw new NotFoundError(`Module not found: ${moduleId}`);
    }
  }

  reply.send({
    actions: actions.map((a) => ({
      id: a.id,
      name: a.name,
      display_name: a.displayName,
      description: a.description,
    })),
  });
}
```

**Step 3: Create route registration**

```typescript
// src/routes/modules/index.ts
import type { FastifyInstance } from 'fastify';
import {
  listModules,
  listModuleRoles,
  listModuleActions,
} from './handlers.js';
import {
  listModulesResponseSchema,
  listModuleRolesResponseSchema,
  listModuleActionsResponseSchema,
} from './schemas.js';

export default async function moduleRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Modules'],
        summary: 'List available modules',
        response: {
          200: listModulesResponseSchema,
        },
      },
    },
    listModules
  );

  fastify.get(
    '/:moduleId/roles',
    {
      schema: {
        tags: ['Modules'],
        summary: 'List roles for a module',
        response: {
          200: listModuleRolesResponseSchema,
        },
      },
    },
    listModuleRoles
  );

  fastify.get(
    '/:moduleId/actions',
    {
      schema: {
        tags: ['Modules'],
        summary: 'List actions for a module',
        response: {
          200: listModuleActionsResponseSchema,
        },
      },
    },
    listModuleActions
  );
}
```

**Step 4: Register routes in main routes file**

Add to `src/routes/index.ts`:

```typescript
import moduleRoutes from './modules/index.js';

// In the routes function:
fastify.register(moduleRoutes, { prefix: '/v2/modules' });
```

**Step 5: Run type check**

```bash
npm run typecheck
```

Expected: No errors

**Step 6: Commit**

```bash
git add src/routes/modules/
git commit -m "feat(rbac): add module listing API endpoints"
```

---

### Task 3.2: Create User Role Management Routes

**Files:**
- Create: `src/routes/organisations/roles/index.ts`
- Create: `src/routes/organisations/roles/handlers.ts`
- Create: `src/routes/organisations/roles/schemas.ts`

**Step 1: Create schemas**

```typescript
// src/routes/organisations/roles/schemas.ts
import { z } from 'zod';

export const globalRoleSchema = z.enum(['owner', 'billing', 'admin']);

export const assignGlobalRoleBodySchema = z.object({
  role: globalRoleSchema,
});

export const globalRoleResponseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  organisation_id: z.string(),
  role: globalRoleSchema,
  created_at: z.string(),
});

export const resourceScopeSchema = z.object({
  vault_ids: z.array(z.string()).optional(),
}).nullable();

export const assignModuleRoleBodySchema = z.object({
  module_id: z.string(),
  role: z.string(),
  resource_scope: resourceScopeSchema.optional(),
});

export const moduleRoleAssignmentResponseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  module: z.string(),
  role: z.string(),
  resource_scope: resourceScopeSchema,
  granted_by: z.string(),
  created_at: z.string(),
});

export const userWithRolesResponseSchema = z.object({
  user_id: z.string(),
  organisation_id: z.string(),
  global_role: globalRoleSchema.nullable(),
  module_roles: z.array(
    z.object({
      module: z.string(),
      role: z.string(),
      resource_scope: resourceScopeSchema,
    })
  ),
});

export const listModuleRolesResponseSchema = z.object({
  module_roles: z.array(
    z.object({
      id: z.string().uuid(),
      module: z.string(),
      role: z.string(),
      resource_scope: resourceScopeSchema,
      granted_by: z.string(),
      created_at: z.string(),
    })
  ),
});
```

**Step 2: Create handlers**

```typescript
// src/routes/organisations/roles/handlers.ts
import type { FastifyRequest, FastifyReply } from 'fastify';
import { NotFoundError, OperationForbiddenError } from '@iofinnet/errors-sdk';
import type { GlobalRole } from '@/src/lib/database/types.js';
import { requireAccess } from '@/src/middleware/require-access.js';

interface AssignGlobalRoleParams {
  orgId: string;
  userId: string;
}

interface AssignGlobalRoleBody {
  role: GlobalRole;
}

export async function assignGlobalRole(
  request: FastifyRequest<{
    Params: AssignGlobalRoleParams;
    Body: AssignGlobalRoleBody;
  }>,
  reply: FastifyReply
): Promise<void> {
  const { orgId, userId } = request.params;
  const { role } = request.body;

  // Only owner can assign global roles
  const currentUser = await request.server.rbacRepository.getUserWithRoles(
    request.auth!.userId,
    orgId
  );

  if (currentUser.globalRole !== 'owner') {
    throw new OperationForbiddenError('Only organization owner can assign global roles');
  }

  await request.server.rbacRepository.assignGlobalRole(
    userId,
    orgId,
    role,
    request.auth!.userId
  );

  const updatedUser = await request.server.rbacRepository.getUserWithRoles(userId, orgId);

  reply.status(200).send({
    id: 'generated', // Would come from actual row
    user_id: userId,
    organisation_id: orgId,
    role: updatedUser.globalRole,
    created_at: new Date().toISOString(),
  });
}

export async function removeGlobalRole(
  request: FastifyRequest<{ Params: AssignGlobalRoleParams }>,
  reply: FastifyReply
): Promise<void> {
  const { orgId, userId } = request.params;

  // Only owner can remove global roles
  const currentUser = await request.server.rbacRepository.getUserWithRoles(
    request.auth!.userId,
    orgId
  );

  if (currentUser.globalRole !== 'owner') {
    throw new OperationForbiddenError('Only organization owner can remove global roles');
  }

  const removed = await request.server.rbacRepository.removeGlobalRole(userId, orgId);

  if (!removed) {
    throw new NotFoundError('User does not have a global role');
  }

  reply.status(204).send();
}

interface AssignModuleRoleParams {
  orgId: string;
  userId: string;
}

interface AssignModuleRoleBody {
  module_id: string;
  role: string;
  resource_scope?: { vault_ids?: string[] } | null;
}

export async function assignModuleRole(
  request: FastifyRequest<{
    Params: AssignModuleRoleParams;
    Body: AssignModuleRoleBody;
  }>,
  reply: FastifyReply
): Promise<void> {
  const { orgId, userId } = request.params;
  const { module_id, role, resource_scope } = request.body;

  // Owner or Admin can assign module roles
  const currentUser = await request.server.rbacRepository.getUserWithRoles(
    request.auth!.userId,
    orgId
  );

  if (currentUser.globalRole !== 'owner' && currentUser.globalRole !== 'admin') {
    throw new OperationForbiddenError('Only owner or admin can assign module roles');
  }

  // Validate module exists
  const modules = await request.server.rbacRepository.listModules();
  const module = modules.find((m) => m.id === module_id || m.name === module_id);
  if (!module) {
    throw new NotFoundError(`Module not found: ${module_id}`);
  }

  // Validate role exists for this module
  const moduleRole = await request.server.rbacRepository.findModuleRoleByName(
    module.id,
    role
  );
  if (!moduleRole) {
    throw new NotFoundError(`Role '${role}' not found for module '${module.name}'`);
  }

  await request.server.rbacRepository.assignModuleRole({
    userId,
    organisationId: orgId,
    moduleId: module.id,
    moduleRoleId: moduleRole.id,
    resourceScope: resource_scope ?? null,
    grantedBy: request.auth!.userId,
  });

  reply.status(201).send({
    id: 'generated',
    user_id: userId,
    module: module.name,
    role: role,
    resource_scope: resource_scope ?? null,
    granted_by: request.auth!.userId,
    created_at: new Date().toISOString(),
  });
}

export async function removeModuleRole(
  request: FastifyRequest<{
    Params: { orgId: string; userId: string; moduleId: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const { orgId, userId, moduleId } = request.params;

  // Owner or Admin can remove module roles
  const currentUser = await request.server.rbacRepository.getUserWithRoles(
    request.auth!.userId,
    orgId
  );

  if (currentUser.globalRole !== 'owner' && currentUser.globalRole !== 'admin') {
    throw new OperationForbiddenError('Only owner or admin can remove module roles');
  }

  const removed = await request.server.rbacRepository.removeModuleRole(
    userId,
    orgId,
    moduleId
  );

  if (!removed) {
    throw new NotFoundError('User does not have this module role');
  }

  reply.status(204).send();
}

export async function getUserRoles(
  request: FastifyRequest<{ Params: { orgId: string; userId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { orgId, userId } = request.params;

  const userWithRoles = await request.server.rbacRepository.getUserWithRoles(
    userId,
    orgId
  );

  reply.send({
    user_id: userWithRoles.userId,
    organisation_id: userWithRoles.organisationId,
    global_role: userWithRoles.globalRole,
    module_roles: userWithRoles.moduleRoles.map((mr) => ({
      module: mr.module,
      role: mr.role,
      resource_scope: mr.resourceScope,
    })),
  });
}
```

**Step 3: Create route registration**

```typescript
// src/routes/organisations/roles/index.ts
import type { FastifyInstance } from 'fastify';
import {
  assignGlobalRole,
  removeGlobalRole,
  assignModuleRole,
  removeModuleRole,
  getUserRoles,
} from './handlers.js';
import {
  assignGlobalRoleBodySchema,
  globalRoleResponseSchema,
  assignModuleRoleBodySchema,
  moduleRoleAssignmentResponseSchema,
  userWithRolesResponseSchema,
} from './schemas.js';

export default async function organisationRoleRoutes(fastify: FastifyInstance) {
  // Global role management
  fastify.put(
    '/:orgId/users/:userId/global-role',
    {
      schema: {
        tags: ['Roles'],
        summary: 'Assign global role to user',
        body: assignGlobalRoleBodySchema,
        response: {
          200: globalRoleResponseSchema,
        },
      },
    },
    assignGlobalRole
  );

  fastify.delete(
    '/:orgId/users/:userId/global-role',
    {
      schema: {
        tags: ['Roles'],
        summary: 'Remove global role from user',
      },
    },
    removeGlobalRole
  );

  // Module role management
  fastify.post(
    '/:orgId/users/:userId/module-roles',
    {
      schema: {
        tags: ['Roles'],
        summary: 'Assign module role to user',
        body: assignModuleRoleBodySchema,
        response: {
          201: moduleRoleAssignmentResponseSchema,
        },
      },
    },
    assignModuleRole
  );

  fastify.delete(
    '/:orgId/users/:userId/module-roles/:moduleId',
    {
      schema: {
        tags: ['Roles'],
        summary: 'Remove module role from user',
      },
    },
    removeModuleRole
  );

  // Get user roles
  fastify.get(
    '/:orgId/users/:userId/roles',
    {
      schema: {
        tags: ['Roles'],
        summary: 'Get user roles',
        response: {
          200: userWithRolesResponseSchema,
        },
      },
    },
    getUserRoles
  );
}
```

**Step 4: Register routes**

Add to `src/routes/index.ts`:

```typescript
import organisationRoleRoutes from './organisations/roles/index.js';

// In the routes function:
fastify.register(organisationRoleRoutes, { prefix: '/v2/organisations' });
```

**Step 5: Run type check**

```bash
npm run typecheck
```

Expected: No errors

**Step 6: Commit**

```bash
git add src/routes/organisations/
git commit -m "feat(rbac): add user role management API endpoints"
```

---

## Phase 4: OPA Sidecar Deployment

### Task 4.1: Create OPA Rego Policies

**Files:**
- Create: `policies/rbac/access.rego`
- Create: `policies/rbac/access_test.rego`

**Step 1: Write the main policy**

```rego
# policies/rbac/access.rego

package rbac.access

import rego.v1

default decision := {"allowed": false, "reason": "no matching policy"}

# Owner bypasses all checks
decision := {"allowed": true, "matched_role": "owner"} if {
    input.user.global_role == "owner"
}

# Check module access for non-owners
decision := result if {
    input.user.global_role != "owner"
    result := check_module_access
}

check_module_access := {"allowed": true, "matched_role": role_key} if {
    some assignment in input.user.module_roles
    assignment.module == input.module

    # Check resource scope
    valid_scope(assignment)

    # Check action permission
    role_key := sprintf("%s:%s", [assignment.module, assignment.role])
    some action in data.role_permissions[role_key]
    action == input.action
}

check_module_access := {"allowed": false, "reason": reason} if {
    not has_module_role
    reason := sprintf("no role assigned for module '%s'", [input.module])
}

check_module_access := {"allowed": false, "reason": reason} if {
    has_module_role
    not has_action_permission
    reason := sprintf("role does not permit action '%s'", [input.action])
}

# Scope validation
valid_scope(assignment) if {
    assignment.resource_scope == null
}

valid_scope(assignment) if {
    not assignment.resource_scope.vault_ids
}

valid_scope(assignment) if {
    assignment.resource_scope.vault_ids
    not input.resource.vault_id
}

valid_scope(assignment) if {
    assignment.resource_scope.vault_ids
    input.resource.vault_id in assignment.resource_scope.vault_ids
}

# Helper predicates
has_module_role if {
    some assignment in input.user.module_roles
    assignment.module == input.module
}

has_action_permission if {
    some assignment in input.user.module_roles
    assignment.module == input.module
    role_key := sprintf("%s:%s", [assignment.module, assignment.role])
    some action in data.role_permissions[role_key]
    action == input.action
}
```

**Step 2: Write policy tests**

```rego
# policies/rbac/access_test.rego

package rbac.access_test

import rego.v1

import data.rbac.access

# Test data
role_permissions := {
    "treasury:admin": ["view_balances", "initiate_transfer", "approve_transfer", "manage_vaults"],
    "treasury:treasurer": ["view_balances", "initiate_transfer"],
    "treasury:auditor": ["view_balances"],
}

test_owner_allowed if {
    result := access.decision with input as {
        "user": {"global_role": "owner", "module_roles": []},
        "module": "treasury",
        "action": "manage_vaults",
        "resource": {}
    } with data.role_permissions as role_permissions

    result.allowed == true
    result.matched_role == "owner"
}

test_treasurer_can_view_balances if {
    result := access.decision with input as {
        "user": {
            "global_role": null,
            "module_roles": [{"module": "treasury", "role": "treasurer", "resource_scope": null}]
        },
        "module": "treasury",
        "action": "view_balances",
        "resource": {}
    } with data.role_permissions as role_permissions

    result.allowed == true
}

test_treasurer_cannot_manage_vaults if {
    result := access.decision with input as {
        "user": {
            "global_role": null,
            "module_roles": [{"module": "treasury", "role": "treasurer", "resource_scope": null}]
        },
        "module": "treasury",
        "action": "manage_vaults",
        "resource": {}
    } with data.role_permissions as role_permissions

    result.allowed == false
}

test_no_role_denied if {
    result := access.decision with input as {
        "user": {"global_role": null, "module_roles": []},
        "module": "treasury",
        "action": "view_balances",
        "resource": {}
    } with data.role_permissions as role_permissions

    result.allowed == false
    contains(result.reason, "no role assigned")
}

test_scope_restriction_allowed if {
    result := access.decision with input as {
        "user": {
            "global_role": null,
            "module_roles": [{
                "module": "treasury",
                "role": "treasurer",
                "resource_scope": {"vault_ids": ["vault-1", "vault-2"]}
            }]
        },
        "module": "treasury",
        "action": "view_balances",
        "resource": {"vault_id": "vault-1"}
    } with data.role_permissions as role_permissions

    result.allowed == true
}

test_scope_restriction_denied if {
    result := access.decision with input as {
        "user": {
            "global_role": null,
            "module_roles": [{
                "module": "treasury",
                "role": "treasurer",
                "resource_scope": {"vault_ids": ["vault-1", "vault-2"]}
            }]
        },
        "module": "treasury",
        "action": "view_balances",
        "resource": {"vault_id": "vault-3"}
    } with data.role_permissions as role_permissions

    result.allowed == false
}
```

**Step 3: Run OPA tests**

```bash
opa test policies/ -v
```

Expected: All tests pass

**Step 4: Commit**

```bash
git add policies/
git commit -m "feat(rbac): add OPA Rego policies for access control"
```

---

### Task 4.2: Create OPA Client Service

**Files:**
- Create: `src/services/policy/opa-client.ts`
- Create: `tests/unit/services/policy/opa-client.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/services/policy/opa-client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpaClient } from '@/src/services/policy/opa-client.js';

describe('OpaClient', () => {
  let client: OpaClient;

  beforeEach(() => {
    global.fetch = vi.fn();
    client = new OpaClient('http://localhost:8181');
  });

  it('should call OPA API with correct input', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        result: { allowed: true, matched_role: 'treasury:admin' },
      }),
    } as Response);

    const result = await client.evaluate({
      user: {
        id: 'user-1',
        globalRole: null,
        moduleRoles: [{ module: 'treasury', role: 'admin', resourceScope: null }],
      },
      module: 'treasury',
      action: 'view_balances',
      resource: {},
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8181/v1/data/rbac/access/decision',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );

    expect(result.allowed).toBe(true);
    expect(result.matchedRole).toBe('treasury:admin');
  });

  it('should handle OPA errors gracefully', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);

    await expect(
      client.evaluate({
        user: { id: 'user-1', globalRole: null, moduleRoles: [] },
        module: 'treasury',
        action: 'view_balances',
        resource: {},
      })
    ).rejects.toThrow('OPA request failed');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/unit/services/policy/opa-client.test.ts
```

Expected: FAIL - module not found

**Step 3: Write the OPA client**

```typescript
// src/services/policy/opa-client.ts
import type { PolicyInput, PolicyDecision } from './types.js';

export class OpaClient {
  constructor(private baseUrl: string) {}

  async evaluate(input: PolicyInput): Promise<PolicyDecision> {
    const opaInput = {
      input: {
        user: {
          id: input.user.id,
          global_role: input.user.globalRole,
          module_roles: input.user.moduleRoles.map((mr) => ({
            module: mr.module,
            role: mr.role,
            resource_scope: mr.resourceScope,
          })),
        },
        module: input.module,
        action: input.action,
        resource: input.resource,
      },
    };

    const response = await fetch(
      `${this.baseUrl}/v1/data/rbac/access/decision`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opaInput),
      }
    );

    if (!response.ok) {
      throw new Error(`OPA request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const result = data.result;

    return {
      allowed: result.allowed,
      reason: result.reason,
      matchedRole: result.matched_role,
    };
  }
}
```

**Step 4: Run tests**

```bash
npm test -- tests/unit/services/policy/opa-client.test.ts
```

Expected: All tests pass

**Step 5: Commit**

```bash
git add src/services/policy/opa-client.ts tests/unit/services/policy/opa-client.test.ts
git commit -m "feat(rbac): add OPA client for policy evaluation"
```

---

### Task 4.3: Create Docker Compose for OPA Sidecar

**Files:**
- Modify: `docker-compose.yml`
- Create: `opa-config.yaml`

**Step 1: Create OPA config file**

```yaml
# opa-config.yaml
services:
  bundle-server:
    url: http://bundle-server:8080

bundles:
  rbac:
    service: bundle-server
    resource: /bundles/rbac.tar.gz
    polling:
      min_delay_seconds: 30
      max_delay_seconds: 60

decision_logs:
  console: true
```

**Step 2: Update docker-compose.yml**

Add to `docker-compose.yml`:

```yaml
  opa-sidecar:
    image: openpolicyagent/opa:latest
    command:
      - "run"
      - "--server"
      - "--addr=0.0.0.0:8181"
      - "--config-file=/config/opa.yaml"
      - "/policies"
    volumes:
      - ./opa-config.yaml:/config/opa.yaml
      - ./policies:/policies
    ports:
      - "8181:8181"
    networks:
      - app-network
```

**Step 3: Add OPA config to environment**

Add to `src/lib/config.ts`:

```typescript
opa: z.object({
  url: z.string().default('http://localhost:8181'),
  enabled: booleanFromString.default(false),
}),
```

**Step 4: Commit**

```bash
git add docker-compose.yml opa-config.yaml src/lib/config.ts
git commit -m "feat(rbac): add OPA sidecar docker configuration"
```

---

### Task 4.4: Create OPA-Backed Policy Service

**Files:**
- Create: `src/services/policy/opa-policy-service.ts`
- Create: `tests/unit/services/policy/opa-policy-service.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/services/policy/opa-policy-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpaPolicyService } from '@/src/services/policy/opa-policy-service.js';
import type { OpaClient } from '@/src/services/policy/opa-client.js';
import type { RbacRepository } from '@/src/repositories/rbac.repository.js';

describe('OpaPolicyService', () => {
  let mockOpaClient: OpaClient;
  let mockRepository: RbacRepository;
  let service: OpaPolicyService;

  beforeEach(() => {
    mockOpaClient = {
      evaluate: vi.fn(),
    } as unknown as OpaClient;

    mockRepository = {
      getUserWithRoles: vi.fn(),
    } as unknown as RbacRepository;

    service = new OpaPolicyService(mockOpaClient, mockRepository);
  });

  it('should fetch user roles and call OPA client', async () => {
    vi.mocked(mockRepository.getUserWithRoles).mockResolvedValue({
      userId: 'user-1',
      organisationId: 'org-1',
      globalRole: null,
      moduleRoles: [{ module: 'treasury', role: 'admin', resourceScope: null }],
    });

    vi.mocked(mockOpaClient.evaluate).mockResolvedValue({
      allowed: true,
      matchedRole: 'treasury:admin',
    });

    const result = await service.checkAccess({
      userId: 'user-1',
      organisationId: 'org-1',
      module: 'treasury',
      action: 'view_balances',
    });

    expect(mockRepository.getUserWithRoles).toHaveBeenCalledWith('user-1', 'org-1');
    expect(mockOpaClient.evaluate).toHaveBeenCalled();
    expect(result.allowed).toBe(true);
  });

  it('should fall back to local evaluation when OPA is unavailable', async () => {
    vi.mocked(mockRepository.getUserWithRoles).mockResolvedValue({
      userId: 'user-1',
      organisationId: 'org-1',
      globalRole: 'owner',
      moduleRoles: [],
    });

    vi.mocked(mockOpaClient.evaluate).mockRejectedValue(new Error('Connection refused'));

    const result = await service.checkAccess({
      userId: 'user-1',
      organisationId: 'org-1',
      module: 'treasury',
      action: 'view_balances',
    });

    // Should still work because owner bypasses checks
    expect(result.allowed).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/unit/services/policy/opa-policy-service.test.ts
```

Expected: FAIL - module not found

**Step 3: Write the OPA policy service**

```typescript
// src/services/policy/opa-policy-service.ts
import type { RbacRepository } from '@/src/repositories/rbac.repository.js';
import type { OpaClient } from './opa-client.js';
import type { PolicyService, PolicyDecision } from './types.js';
import { logger } from '@/utils/powertools.js';

export class OpaPolicyService implements PolicyService {
  constructor(
    private opaClient: OpaClient,
    private rbacRepository: RbacRepository
  ) {}

  async checkAccess(params: {
    userId: string;
    organisationId: string;
    module: string;
    action: string;
    resource?: { vaultId?: string };
  }): Promise<PolicyDecision> {
    const userWithRoles = await this.rbacRepository.getUserWithRoles(
      params.userId,
      params.organisationId
    );

    try {
      return await this.opaClient.evaluate({
        user: {
          id: userWithRoles.userId,
          globalRole: userWithRoles.globalRole,
          moduleRoles: userWithRoles.moduleRoles,
        },
        module: params.module,
        action: params.action,
        resource: params.resource ?? {},
      });
    } catch (error) {
      logger.warn('OPA evaluation failed, falling back to local evaluation', { error });
      return this.localFallback(userWithRoles, params);
    }
  }

  private localFallback(
    userWithRoles: Awaited<ReturnType<RbacRepository['getUserWithRoles']>>,
    params: { module: string; action: string }
  ): PolicyDecision {
    // Owner bypass
    if (userWithRoles.globalRole === 'owner') {
      return { allowed: true, matchedRole: 'owner' };
    }

    // For other roles, deny by default during OPA outage
    // This is a safe fallback - operations can be retried
    return {
      allowed: false,
      reason: 'Policy evaluation unavailable, please retry',
    };
  }
}
```

**Step 4: Run tests**

```bash
npm test -- tests/unit/services/policy/opa-policy-service.test.ts
```

Expected: All tests pass

**Step 5: Commit**

```bash
git add src/services/policy/opa-policy-service.ts tests/unit/services/policy/opa-policy-service.test.ts
git commit -m "feat(rbac): add OPA-backed policy service with local fallback"
```

---

## Phase 5: Route Integration Examples

### Task 5.1: Add Access Control to Vault Routes

**Files:**
- Modify: `src/routes/vaults/index.ts`

**Step 1: Update vault routes with access control**

```typescript
// src/routes/vaults/index.ts
import type { FastifyInstance } from 'fastify';
import { createVault } from '@/src/routes/vaults/handlers.js';
import { requireAccess } from '@/src/middleware/require-access.js';
import {
  createVaultBodySchema,
  createVaultResponseSchema,
} from '@/src/routes/vaults/schemas.js';

export default async function vaultRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/',
    {
      preHandler: [requireAccess('treasury', 'manage_vaults')],
      schema: {
        tags: ['Vaults'],
        summary: 'Create a vault with curves',
        description:
          'Creates a new vault with the specified elliptic curves for HD wallet derivation. ' +
          'Requires treasury:manage_vaults permission.',
        body: createVaultBodySchema,
        response: {
          201: createVaultResponseSchema,
        },
      },
    },
    createVault
  );
}
```

**Step 2: Run type check**

```bash
npm run typecheck
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/routes/vaults/index.ts
git commit -m "feat(rbac): add access control to vault routes"
```

---

### Task 5.2: Add Access Control to Transaction Routes

**Files:**
- Modify: `src/routes/transactions/index.ts`

**Step 1: Update transaction routes with access control**

```typescript
// Add preHandler to transaction routes that need access control

// For listing transactions
preHandler: [requireAccess('treasury', 'view_transactions')]

// For building transactions
preHandler: [requireAccess('treasury', 'initiate_transfer')]

// For workflow approval
preHandler: [requireAccess('treasury', 'approve_transfer')]
```

**Step 2: Run type check**

```bash
npm run typecheck
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/routes/transactions/
git commit -m "feat(rbac): add access control to transaction routes"
```

---

## Summary

This implementation plan covers all 5 phases:

1. **Phase 1: Foundation** - Database migrations, types, repository, and policy service
2. **Phase 2: Middleware Integration** - Policy plugin, requireAccess factory, app integration, decision logging
3. **Phase 3: Role Management API** - Module listing endpoints, user role assignment endpoints
4. **Phase 4: OPA Sidecar Deployment** - Rego policies, OPA client, Docker configuration, OPA-backed service
5. **Phase 5: Route Integration** - Adding access control to existing routes

Each task follows TDD with:
- Failing test first
- Minimal implementation
- Verification
- Commit

Total estimated tasks: ~20 implementation steps
