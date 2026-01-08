import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // Create reconciliation_jobs table
  await db.schema
    .createTable('reconciliation_jobs')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('address', 'varchar(255)', (col) => col.notNull())
    .addColumn('chain', 'varchar(50)', (col) => col.notNull())
    .addColumn('network', 'varchar(50)', (col) => col.notNull())
    .addColumn('status', 'varchar(20)', (col) => col.notNull().defaultTo('pending'))
    .addColumn('provider', 'varchar(50)', (col) => col.notNull())
    .addColumn('from_timestamp', 'timestamptz')
    .addColumn('to_timestamp', 'timestamptz')
    .addColumn('last_processed_cursor', 'text')
    .addColumn('processed_count', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('transactions_added', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('transactions_soft_deleted', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('discrepancies_flagged', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('errors_count', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`NOW()`)
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`NOW()`)
    )
    .addColumn('started_at', 'timestamptz')
    .addColumn('completed_at', 'timestamptz')
    .execute();

  // Create indexes for reconciliation_jobs
  await db.schema
    .createIndex('idx_reconciliation_jobs_address_chain')
    .on('reconciliation_jobs')
    .columns(['address', 'chain'])
    .execute();

  await db.schema
    .createIndex('idx_reconciliation_jobs_status')
    .on('reconciliation_jobs')
    .column('status')
    .execute();

  await db.schema
    .createIndex('idx_reconciliation_jobs_created_at')
    .on('reconciliation_jobs')
    .column('created_at')
    .execute();

  // Create reconciliation_audit_log table
  await db.schema
    .createTable('reconciliation_audit_log')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('job_id', 'uuid', (col) =>
      col.notNull().references('reconciliation_jobs.id').onDelete('cascade')
    )
    .addColumn('transaction_hash', 'varchar(255)', (col) => col.notNull())
    .addColumn('action', 'varchar(20)', (col) => col.notNull())
    .addColumn('before_snapshot', 'jsonb')
    .addColumn('after_snapshot', 'jsonb')
    .addColumn('discrepancy_fields', sql`text[]`)
    .addColumn('error_message', 'text')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`NOW()`)
    )
    .execute();

  // Create indexes for reconciliation_audit_log
  await db.schema
    .createIndex('idx_reconciliation_audit_log_job_id')
    .on('reconciliation_audit_log')
    .column('job_id')
    .execute();

  await db.schema
    .createIndex('idx_reconciliation_audit_log_action')
    .on('reconciliation_audit_log')
    .column('action')
    .execute();

  // Add soft-delete columns to transactions table
  await db.schema
    .alterTable('transactions')
    .addColumn('deleted_at', 'timestamptz')
    .execute();

  await db.schema
    .alterTable('transactions')
    .addColumn('deletion_reason', 'varchar(50)')
    .execute();

  await db.schema
    .createIndex('idx_transactions_deleted_at')
    .on('transactions')
    .column('deleted_at')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Remove soft-delete index and columns from transactions
  await db.schema
    .dropIndex('idx_transactions_deleted_at')
    .execute();

  await db.schema
    .alterTable('transactions')
    .dropColumn('deletion_reason')
    .execute();

  await db.schema
    .alterTable('transactions')
    .dropColumn('deleted_at')
    .execute();

  // Drop reconciliation tables (audit_log first due to FK constraint)
  await db.schema.dropTable('reconciliation_audit_log').execute();
  await db.schema.dropTable('reconciliation_jobs').execute();
}
