import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('addresses')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('address', 'varchar(255)', (col) => col.notNull())
    .addColumn('chain', 'varchar(100)', (col) => col.notNull())
    .addColumn('vault_id', 'varchar(100)', (col) => col.notNull())
    .addColumn('organisation_id', 'varchar(100)', (col) => col.notNull())
    .addColumn('derivation_path', 'varchar(255)')
    .addColumn('is_monitored', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('subscription_id', 'varchar(100)')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .addUniqueConstraint('addresses_address_chain_unique', ['address', 'chain'])
    .execute();

  await db.schema.createIndex('idx_addresses_vault_id').on('addresses').column('vault_id').execute();
  await db.schema
    .createIndex('idx_addresses_subscription_id')
    .on('addresses')
    .column('subscription_id')
    .execute();
  await db.schema
    .createIndex('idx_addresses_org_id')
    .on('addresses')
    .column('organisation_id')
    .execute();

  await db.schema
    .createTable('address_tokens')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('address_id', 'uuid', (col) => col.notNull().references('addresses.id').onDelete('cascade'))
    .addColumn('contract_address', 'varchar(255)', (col) => col.notNull())
    .addColumn('symbol', 'varchar(50)')
    .addColumn('decimals', 'integer')
    .addColumn('name', 'varchar(255)')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .addUniqueConstraint('address_tokens_unique', ['address_id', 'contract_address'])
    .execute();

  await db.schema
    .createIndex('idx_address_tokens_address_id')
    .on('address_tokens')
    .column('address_id')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('address_tokens').execute();
  await db.schema.dropTable('addresses').execute();
}
