import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // Remove protocol_name and details columns from transactions table
  await db.schema.alterTable('transactions').dropColumn('protocol_name').execute();
  await db.schema.alterTable('transactions').dropColumn('details').execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Re-add protocol_name and details columns
  await db.schema
    .alterTable('transactions')
    .addColumn('protocol_name', 'varchar(255)')
    .execute();

  await db.schema
    .alterTable('transactions')
    .addColumn('details', 'jsonb')
    .execute();
}
