import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // Add missing columns to addresses table
  await db.schema
    .alterTable('addresses')
    .addColumn('ecosystem', 'varchar(50)', (col) => col.notNull().defaultTo('evm'))
    .addColumn('workspace_id', 'varchar(100)', (col) => col.notNull().defaultTo(''))
    .addColumn('alias', 'varchar(255)')
    .addColumn('monitored_at', 'timestamptz')
    .addColumn('unmonitored_at', 'timestamptz')
    .execute();

  // Add index for workspace_id queries
  await db.schema
    .createIndex('idx_addresses_workspace_id')
    .on('addresses')
    .column('workspace_id')
    .execute();

  // Add index for ecosystem filtering
  await db.schema
    .createIndex('idx_addresses_vault_chain')
    .on('addresses')
    .columns(['vault_id', 'chain'])
    .execute();

  // Add hidden column to address_tokens table
  await db.schema
    .alterTable('address_tokens')
    .addColumn('hidden', 'boolean', (col) => col.notNull().defaultTo(false))
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Remove hidden column from address_tokens
  await db.schema.alterTable('address_tokens').dropColumn('hidden').execute();

  // Remove indexes
  await db.schema.dropIndex('idx_addresses_vault_chain').execute();
  await db.schema.dropIndex('idx_addresses_workspace_id').execute();

  // Remove columns from addresses
  await db.schema
    .alterTable('addresses')
    .dropColumn('unmonitored_at')
    .dropColumn('monitored_at')
    .dropColumn('alias')
    .dropColumn('workspace_id')
    .dropColumn('ecosystem')
    .execute();
}
