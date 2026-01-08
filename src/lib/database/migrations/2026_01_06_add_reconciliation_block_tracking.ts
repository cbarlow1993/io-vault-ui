import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // Add last_reconciled_block to addresses table
  await db.schema
    .alterTable('addresses')
    .addColumn('last_reconciled_block', 'bigint')
    .execute();

  // Add block tracking columns to reconciliation_jobs table
  await db.schema
    .alterTable('reconciliation_jobs')
    .addColumn('mode', 'varchar(10)', (col) => col.notNull().defaultTo('full'))
    .execute();

  await db.schema
    .alterTable('reconciliation_jobs')
    .addColumn('from_block', 'bigint')
    .execute();

  await db.schema
    .alterTable('reconciliation_jobs')
    .addColumn('to_block', 'bigint')
    .execute();

  await db.schema
    .alterTable('reconciliation_jobs')
    .addColumn('final_block', 'bigint')
    .execute();

  // Create indexes for commonly queried columns
  await db.schema
    .createIndex('idx_reconciliation_jobs_mode')
    .on('reconciliation_jobs')
    .column('mode')
    .execute();

  await db.schema
    .createIndex('idx_reconciliation_jobs_from_block')
    .on('reconciliation_jobs')
    .column('from_block')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Drop indexes first
  await db.schema.dropIndex('idx_reconciliation_jobs_from_block').execute();
  await db.schema.dropIndex('idx_reconciliation_jobs_mode').execute();

  await db.schema
    .alterTable('reconciliation_jobs')
    .dropColumn('final_block')
    .execute();

  await db.schema
    .alterTable('reconciliation_jobs')
    .dropColumn('to_block')
    .execute();

  await db.schema
    .alterTable('reconciliation_jobs')
    .dropColumn('from_block')
    .execute();

  await db.schema
    .alterTable('reconciliation_jobs')
    .dropColumn('mode')
    .execute();

  await db.schema
    .alterTable('addresses')
    .dropColumn('last_reconciled_block')
    .execute();
}
