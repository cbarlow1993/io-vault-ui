import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // Add direction column
  await db.schema
    .alterTable('address_transactions')
    .addColumn('direction', 'varchar(10)', (col) => col.notNull().defaultTo('neutral'))
    .execute();

  // Index for filtering by direction
  await db.schema
    .createIndex('idx_address_transactions_direction')
    .on('address_transactions')
    .columns(['direction'])
    .execute();

  // Composite index for common query pattern
  await db.schema
    .createIndex('idx_address_transactions_address_direction_timestamp')
    .on('address_transactions')
    .columns(['address', 'direction', 'timestamp'])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex('idx_address_transactions_address_direction_timestamp').execute();
  await db.schema.dropIndex('idx_address_transactions_direction').execute();
  await db.schema.alterTable('address_transactions').dropColumn('direction').execute();
}
