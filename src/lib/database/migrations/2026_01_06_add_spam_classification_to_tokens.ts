import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // Add spam classification columns to tokens table
  await db.schema
    .alterTable('tokens')
    .addColumn('spam_classification', 'jsonb')
    .execute();

  await db.schema
    .alterTable('tokens')
    .addColumn('classification_updated_at', 'timestamptz')
    .execute();

  await db.schema
    .alterTable('tokens')
    .addColumn('classification_ttl_hours', 'integer', (col) => col.defaultTo(720)) // 30 days
    .execute();

  // Create index for finding tokens needing classification refresh
  await db.schema
    .createIndex('idx_tokens_classification_updated_at')
    .on('tokens')
    .column('classification_updated_at')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .dropIndex('idx_tokens_classification_updated_at')
    .execute();

  await db.schema
    .alterTable('tokens')
    .dropColumn('classification_ttl_hours')
    .execute();

  await db.schema
    .alterTable('tokens')
    .dropColumn('classification_updated_at')
    .execute();

  await db.schema
    .alterTable('tokens')
    .dropColumn('spam_classification')
    .execute();
}
