import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // 1. Add lowercase constraint to existing addresses table
  await sql`
    ALTER TABLE addresses
    ADD CONSTRAINT addresses_address_lowercase_check
    CHECK (address = LOWER(address))
  `.execute(db);

  // 2. Create tokens table
  await db.schema
    .createTable('tokens')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('chain', 'varchar(100)', (col) => col.notNull())
    .addColumn('network', 'varchar(100)', (col) => col.notNull())
    .addColumn('address', 'varchar(255)', (col) => col.notNull())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('symbol', 'varchar(50)', (col) => col.notNull())
    .addColumn('decimals', 'integer', (col) => col.notNull())
    .addColumn('logo_uri', 'text')
    .addColumn('coingecko_id', 'varchar(100)')
    .addColumn('is_verified', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('is_spam', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .addUniqueConstraint('tokens_chain_network_address_unique', ['chain', 'network', 'address'])
    .execute();

  await db.schema.createIndex('idx_tokens_chain_network').on('tokens').columns(['chain', 'network']).execute();
  await db.schema.createIndex('idx_tokens_coingecko_id').on('tokens').column('coingecko_id').execute();

  // 3. Create token_prices table
  await db.schema
    .createTable('token_prices')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('coingecko_id', 'varchar(100)', (col) => col.notNull())
    .addColumn('currency', 'varchar(10)', (col) => col.notNull())
    .addColumn('price', 'decimal(30, 10)', (col) => col.notNull())
    .addColumn('price_change_24h', 'decimal(20, 10)')
    .addColumn('market_cap', 'decimal(30, 2)')
    .addColumn('fetched_at', 'timestamptz', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .addUniqueConstraint('token_prices_coingecko_currency_unique', ['coingecko_id', 'currency'])
    .execute();

  await db.schema.createIndex('idx_token_prices_fetched_at').on('token_prices').column('fetched_at').execute();

  // 4. Create transactions table
  await db.schema
    .createTable('transactions')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('chain', 'varchar(100)', (col) => col.notNull())
    .addColumn('network', 'varchar(100)', (col) => col.notNull())
    .addColumn('tx_hash', 'varchar(255)', (col) => col.notNull())
    .addColumn('block_number', 'varchar(100)', (col) => col.notNull())
    .addColumn('block_hash', 'varchar(255)', (col) => col.notNull())
    .addColumn('tx_index', 'integer')
    .addColumn('from_address', 'varchar(255)', (col) => col.notNull())
    .addColumn('to_address', 'varchar(255)')
    .addColumn('value', 'varchar(100)', (col) => col.notNull())
    .addColumn('fee', 'varchar(100)')
    .addColumn('status', 'varchar(20)', (col) => col.notNull())
    .addColumn('timestamp', 'timestamptz', (col) => col.notNull())
    .addColumn('classification_type', 'varchar(100)')
    .addColumn('classification_label', 'varchar(100)')
    .addColumn('protocol_name', 'varchar(100)')
    .addColumn('details', 'jsonb')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .addUniqueConstraint('transactions_chain_network_tx_hash_unique', ['chain', 'network', 'tx_hash'])
    .execute();

  // Add lowercase constraints for transactions addresses
  await sql`
    ALTER TABLE transactions
    ADD CONSTRAINT transactions_from_address_lowercase_check
    CHECK (from_address = LOWER(from_address))
  `.execute(db);

  await sql`
    ALTER TABLE transactions
    ADD CONSTRAINT transactions_to_address_lowercase_check
    CHECK (to_address IS NULL OR to_address = LOWER(to_address))
  `.execute(db);

  await db.schema
    .createIndex('idx_transactions_from_address')
    .on('transactions')
    .column('from_address')
    .execute();
  await db.schema.createIndex('idx_transactions_to_address').on('transactions').column('to_address').execute();
  await db.schema
    .createIndex('idx_transactions_chain_network_timestamp')
    .on('transactions')
    .columns(['chain', 'network', 'timestamp'])
    .execute();

  // 5. Create native_transfers table
  await db.schema
    .createTable('native_transfers')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('tx_id', 'uuid', (col) => col.notNull().references('transactions.id').onDelete('cascade'))
    .addColumn('chain', 'varchar(100)', (col) => col.notNull())
    .addColumn('network', 'varchar(100)', (col) => col.notNull())
    .addColumn('from_address', 'varchar(255)')
    .addColumn('to_address', 'varchar(255)')
    .addColumn('amount', 'varchar(100)', (col) => col.notNull())
    .addColumn('metadata', 'jsonb')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .execute();

  await db.schema.createIndex('idx_native_transfers_tx_id').on('native_transfers').column('tx_id').execute();
  await db.schema
    .createIndex('idx_native_transfers_from_address')
    .on('native_transfers')
    .column('from_address')
    .execute();
  await db.schema
    .createIndex('idx_native_transfers_to_address')
    .on('native_transfers')
    .column('to_address')
    .execute();

  // 6. Create token_transfers table
  await db.schema
    .createTable('token_transfers')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('tx_id', 'uuid', (col) => col.notNull().references('transactions.id').onDelete('cascade'))
    .addColumn('chain', 'varchar(100)', (col) => col.notNull())
    .addColumn('network', 'varchar(100)', (col) => col.notNull())
    .addColumn('token_address', 'varchar(255)', (col) => col.notNull())
    .addColumn('from_address', 'varchar(255)')
    .addColumn('to_address', 'varchar(255)')
    .addColumn('amount', 'varchar(100)', (col) => col.notNull())
    .addColumn('transfer_type', 'varchar(20)', (col) => col.notNull())
    .addColumn('metadata', 'jsonb')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .execute();

  await db.schema.createIndex('idx_token_transfers_tx_id').on('token_transfers').column('tx_id').execute();
  await db.schema
    .createIndex('idx_token_transfers_token_address')
    .on('token_transfers')
    .column('token_address')
    .execute();
  await db.schema
    .createIndex('idx_token_transfers_from_address')
    .on('token_transfers')
    .column('from_address')
    .execute();
  await db.schema
    .createIndex('idx_token_transfers_to_address')
    .on('token_transfers')
    .column('to_address')
    .execute();

  // 7. Create token_holdings table
  await db.schema
    .createTable('token_holdings')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('address_id', 'uuid', (col) => col.notNull().references('addresses.id').onDelete('cascade'))
    .addColumn('chain', 'varchar(100)', (col) => col.notNull())
    .addColumn('network', 'varchar(100)', (col) => col.notNull())
    .addColumn('token_address', 'varchar(255)')
    .addColumn('is_native', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('balance', 'varchar(100)', (col) => col.notNull())
    .addColumn('decimals', 'integer', (col) => col.notNull())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('symbol', 'varchar(50)', (col) => col.notNull())
    .addColumn('visibility', 'varchar(20)', (col) => col.notNull().defaultTo('visible'))
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .execute();

  await db.schema.createIndex('idx_token_holdings_address_id').on('token_holdings').column('address_id').execute();

  // Create unique constraint - need to handle null token_address specially
  await sql`
    CREATE UNIQUE INDEX idx_token_holdings_unique
    ON token_holdings (address_id, chain, network, COALESCE(token_address, ''))
  `.execute(db);

  // 8. Create address_transactions table
  await db.schema
    .createTable('address_transactions')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('address', 'varchar(255)', (col) => col.notNull())
    .addColumn('tx_id', 'uuid', (col) => col.notNull().references('transactions.id').onDelete('cascade'))
    .addColumn('chain', 'varchar(100)', (col) => col.notNull())
    .addColumn('network', 'varchar(100)', (col) => col.notNull())
    .addColumn('timestamp', 'timestamptz', (col) => col.notNull())
    .addColumn('has_native_transfer', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('has_token_transfer', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('total_value', 'varchar(100)')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .addUniqueConstraint('address_transactions_address_tx_id_unique', ['address', 'tx_id'])
    .execute();

  await db.schema
    .createIndex('idx_address_transactions_address_timestamp')
    .on('address_transactions')
    .columns(['address', 'timestamp'])
    .execute();

  // 9. Create sync_state table
  await db.schema
    .createTable('sync_state')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('address_id', 'uuid', (col) => col.notNull().references('addresses.id').onDelete('cascade'))
    .addColumn('chain', 'varchar(100)', (col) => col.notNull())
    .addColumn('network', 'varchar(100)', (col) => col.notNull())
    .addColumn('last_indexed_block', 'varchar(100)', (col) => col.notNull())
    .addColumn('last_indexed_tx_hash', 'varchar(255)')
    .addColumn('last_indexed_at', 'timestamptz', (col) => col.notNull())
    .addColumn('status', 'varchar(20)', (col) => col.notNull().defaultTo('pending'))
    .addColumn('error_message', 'text')
    .addColumn('retry_count', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .addUniqueConstraint('sync_state_address_chain_network_unique', ['address_id', 'chain', 'network'])
    .execute();

  await db.schema.createIndex('idx_sync_state_status').on('sync_state').column('status').execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Drop tables in reverse order (respecting FK constraints)
  await db.schema.dropTable('sync_state').execute();
  await db.schema.dropTable('address_transactions').execute();
  await db.schema.dropTable('token_holdings').execute();
  await db.schema.dropTable('token_transfers').execute();
  await db.schema.dropTable('native_transfers').execute();
  await db.schema.dropTable('transactions').execute();
  await db.schema.dropTable('token_prices').execute();
  await db.schema.dropTable('tokens').execute();

  // Remove lowercase constraint from addresses table
  await sql`
    ALTER TABLE addresses
    DROP CONSTRAINT addresses_address_lowercase_check
  `.execute(db);
}
