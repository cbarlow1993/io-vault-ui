import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('transaction_workflows')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('state', 'varchar(50)', (col) => col.notNull().defaultTo('created'))
    .addColumn('context', 'jsonb', (col) => col.notNull().defaultTo('{}'))
    .addColumn('vault_id', 'varchar(100)', (col) => col.notNull())
    .addColumn('chain_alias', 'varchar(50)', (col) => col.notNull())
    .addColumn('marshalled_hex', 'text', (col) => col.notNull())
    .addColumn('organisation_id', 'varchar(100)', (col) => col.notNull())
    .addColumn('created_by', 'jsonb', (col) => col.notNull())
    .addColumn('tx_hash', 'varchar(255)')
    .addColumn('signature', 'text')
    .addColumn('block_number', 'bigint')
    .addColumn('version', 'integer', (col) => col.notNull().defaultTo(1))
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`NOW()`)
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`NOW()`)
    )
    .addColumn('completed_at', 'timestamptz')
    .execute();

  await db.schema
    .createIndex('idx_workflows_state')
    .on('transaction_workflows')
    .column('state')
    .execute();

  await db.schema
    .createIndex('idx_workflows_org')
    .on('transaction_workflows')
    .column('organisation_id')
    .execute();

  await db.schema
    .createIndex('idx_workflows_vault')
    .on('transaction_workflows')
    .column('vault_id')
    .execute();

  await db.schema
    .createTable('transaction_workflow_events')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('workflow_id', 'uuid', (col) =>
      col.notNull().references('transaction_workflows.id').onDelete('cascade')
    )
    .addColumn('event_type', 'varchar(100)', (col) => col.notNull())
    .addColumn('event_payload', 'jsonb', (col) => col.notNull().defaultTo('{}'))
    .addColumn('from_state', 'varchar(50)', (col) => col.notNull())
    .addColumn('to_state', 'varchar(50)', (col) => col.notNull())
    .addColumn('context_snapshot', 'jsonb', (col) => col.notNull())
    .addColumn('triggered_by', 'varchar(255)')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`NOW()`)
    )
    .execute();

  await db.schema
    .createIndex('idx_events_workflow')
    .on('transaction_workflow_events')
    .column('workflow_id')
    .execute();

  await db.schema
    .createIndex('idx_events_created')
    .on('transaction_workflow_events')
    .column('created_at')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('transaction_workflow_events').execute();
  await db.schema.dropTable('transaction_workflows').execute();
}
