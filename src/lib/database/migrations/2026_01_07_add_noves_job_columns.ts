import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('reconciliation_jobs')
    .addColumn('noves_job_id', 'text')
    .execute();

  await db.schema
    .alterTable('reconciliation_jobs')
    .addColumn('noves_next_page_url', 'text')
    .execute();

  await db.schema
    .alterTable('reconciliation_jobs')
    .addColumn('noves_job_started_at', 'timestamptz')
    .execute();

  // Index for finding jobs with active Noves jobs
  await db.schema
    .createIndex('idx_reconciliation_jobs_noves_job_id')
    .on('reconciliation_jobs')
    .column('noves_job_id')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .dropIndex('idx_reconciliation_jobs_noves_job_id')
    .execute();

  await db.schema
    .alterTable('reconciliation_jobs')
    .dropColumn('noves_job_started_at')
    .execute();

  await db.schema
    .alterTable('reconciliation_jobs')
    .dropColumn('noves_next_page_url')
    .execute();

  await db.schema
    .alterTable('reconciliation_jobs')
    .dropColumn('noves_job_id')
    .execute();
}
