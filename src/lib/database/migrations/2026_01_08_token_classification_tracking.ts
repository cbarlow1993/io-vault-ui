import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // Add classification tracking columns
  await db.schema
    .alterTable('tokens')
    .addColumn('needs_classification', 'boolean', (col) => col.defaultTo(true).notNull())
    .execute();

  await db.schema
    .alterTable('tokens')
    .addColumn('classification_attempts', 'integer', (col) => col.defaultTo(0).notNull())
    .execute();

  await db.schema
    .alterTable('tokens')
    .addColumn('classification_error', 'text')
    .execute();

  // Create partial index for worker queries
  await sql`
    CREATE INDEX idx_tokens_needs_classification
    ON tokens (needs_classification, classification_attempts)
    WHERE needs_classification = true
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .dropIndex('idx_tokens_needs_classification')
    .execute();

  await db.schema
    .alterTable('tokens')
    .dropColumn('classification_error')
    .execute();

  await db.schema
    .alterTable('tokens')
    .dropColumn('classification_attempts')
    .execute();

  await db.schema
    .alterTable('tokens')
    .dropColumn('needs_classification')
    .execute();
}
