import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // 1. modules - Available modules (treasury, compliance)
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

  // 2. module_actions - Actions per module (view_balances, initiate_transfer, etc.)
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

  // Unique constraint: (module_id, name)
  await db.schema
    .createIndex('idx_module_actions_unique')
    .on('module_actions')
    .columns(['module_id', 'name'])
    .unique()
    .execute();

  // 3. module_roles - Roles per module (admin, treasurer, auditor)
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

  // Unique constraint: (module_id, name)
  await db.schema
    .createIndex('idx_module_roles_unique')
    .on('module_roles')
    .columns(['module_id', 'name'])
    .unique()
    .execute();

  // 4. module_role_permissions - Maps roles to allowed actions
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
    .createIndex('idx_role_permissions_role')
    .on('module_role_permissions')
    .column('module_role_id')
    .execute();

  await db.schema
    .createIndex('idx_role_permissions_action')
    .on('module_role_permissions')
    .column('action_id')
    .execute();

  // Unique constraint to prevent duplicate role-action mappings
  await db.schema
    .createIndex('idx_role_permissions_unique')
    .on('module_role_permissions')
    .columns(['module_role_id', 'action_id'])
    .unique()
    .execute();

  // 5. user_global_roles - User's org-level role (owner, billing, admin)
  await db.schema
    .createTable('user_global_roles')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('user_id', 'varchar(255)', (col) => col.notNull())
    .addColumn('organisation_id', 'varchar(100)', (col) => col.notNull())
    .addColumn('role', 'varchar(50)', (col) => col.notNull())
    .addColumn('granted_by', 'varchar(255)')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`NOW()`)
    )
    .execute();

  await db.schema
    .createIndex('idx_user_global_roles_user')
    .on('user_global_roles')
    .column('user_id')
    .execute();

  await db.schema
    .createIndex('idx_user_global_roles_org')
    .on('user_global_roles')
    .column('organisation_id')
    .execute();

  // Unique constraint: (user_id, organisation_id)
  await db.schema
    .createIndex('idx_user_global_roles_unique')
    .on('user_global_roles')
    .columns(['user_id', 'organisation_id'])
    .unique()
    .execute();

  // 6. user_module_roles - User's module-specific role assignments
  await db.schema
    .createTable('user_module_roles')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('user_id', 'varchar(255)', (col) => col.notNull())
    .addColumn('organisation_id', 'varchar(100)', (col) => col.notNull())
    .addColumn('module_id', 'uuid', (col) =>
      col.notNull().references('modules.id').onDelete('cascade')
    )
    .addColumn('module_role_id', 'uuid', (col) =>
      col.notNull().references('module_roles.id').onDelete('cascade')
    )
    .addColumn('resource_scope', 'jsonb')
    .addColumn('granted_by', 'varchar(255)', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`NOW()`)
    )
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

  await db.schema
    .createIndex('idx_user_module_roles_module')
    .on('user_module_roles')
    .column('module_id')
    .execute();

  // Unique constraint: (user_id, organisation_id, module_id)
  await db.schema
    .createIndex('idx_user_module_roles_unique')
    .on('user_module_roles')
    .columns(['user_id', 'organisation_id', 'module_id'])
    .unique()
    .execute();

  // 7. policy_decisions - Audit log for policy decisions
  await db.schema
    .createTable('policy_decisions')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('user_id', 'varchar(255)', (col) => col.notNull())
    .addColumn('organisation_id', 'varchar(100)', (col) => col.notNull())
    .addColumn('module', 'varchar(100)', (col) => col.notNull())
    .addColumn('action', 'varchar(100)', (col) => col.notNull())
    .addColumn('resource', 'jsonb')
    .addColumn('decision', 'varchar(20)', (col) => col.notNull())
    .addColumn('reason', 'text')
    .addColumn('matched_role', 'varchar(255)')
    .addColumn('request_id', 'varchar(255)')
    .addColumn('endpoint', 'varchar(255)')
    .addColumn('evaluation_time_ms', 'integer')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`NOW()`)
    )
    .execute();

  await db.schema
    .createIndex('idx_policy_decisions_user')
    .on('policy_decisions')
    .column('user_id')
    .execute();

  await db.schema
    .createIndex('idx_policy_decisions_org')
    .on('policy_decisions')
    .column('organisation_id')
    .execute();

  await db.schema
    .createIndex('idx_policy_decisions_module')
    .on('policy_decisions')
    .column('module')
    .execute();

  await db.schema
    .createIndex('idx_policy_decisions_created')
    .on('policy_decisions')
    .column('created_at')
    .execute();

  await db.schema
    .createIndex('idx_policy_decisions_decision')
    .on('policy_decisions')
    .column('decision')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Drop tables in reverse order to respect foreign key constraints
  await db.schema.dropTable('policy_decisions').execute();
  await db.schema.dropTable('user_module_roles').execute();
  await db.schema.dropTable('user_global_roles').execute();
  await db.schema.dropTable('module_role_permissions').execute();
  await db.schema.dropTable('module_roles').execute();
  await db.schema.dropTable('module_actions').execute();
  await db.schema.dropTable('modules').execute();
}
