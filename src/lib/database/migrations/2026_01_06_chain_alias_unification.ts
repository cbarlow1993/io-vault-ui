import { type Kysely, sql } from 'kysely';

/**
 * Chain Alias Unification Migration
 *
 * This migration consolidates the separate `chain` and `network` columns into a single
 * `chain_alias` column across all tables. The chain_alias represents a unique chain
 * identifier (e.g., 'eth', 'eth-sepolia', 'polygon', 'xrp', 'tron').
 *
 * Tables affected:
 * - addresses: rename chain -> chain_alias
 * - tokens: drop network, rename chain -> chain_alias
 * - transactions: drop network, rename chain -> chain_alias
 * - native_transfers: drop network, rename chain -> chain_alias
 * - token_transfers: drop network, rename chain -> chain_alias
 * - token_holdings: drop network, rename chain -> chain_alias
 * - address_transactions: drop network, rename chain -> chain_alias
 * - sync_state: drop network, rename chain -> chain_alias
 * - reconciliation_jobs: drop network, rename chain -> chain_alias
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  // ============================================================
  // 1. ADDRESSES TABLE (no network column, just rename chain)
  // ============================================================

  // Drop the existing unique constraint
  await sql`
    ALTER TABLE addresses
    DROP CONSTRAINT IF EXISTS addresses_address_chain_unique
  `.execute(db);

  // Drop the existing index on vault_id, chain
  await sql`DROP INDEX IF EXISTS idx_addresses_vault_chain`.execute(db);

  // Rename chain to chain_alias
  await sql`
    ALTER TABLE addresses
    RENAME COLUMN chain TO chain_alias
  `.execute(db);

  // Re-create unique constraint with new column name
  await sql`
    ALTER TABLE addresses
    ADD CONSTRAINT addresses_address_chain_alias_unique UNIQUE (address, chain_alias)
  `.execute(db);

  // Re-create index with new column name
  await db.schema
    .createIndex('idx_addresses_vault_chain_alias')
    .on('addresses')
    .columns(['vault_id', 'chain_alias'])
    .execute();

  // ============================================================
  // 2. TOKENS TABLE
  // ============================================================

  // Drop the existing unique constraint
  await sql`
    ALTER TABLE tokens
    DROP CONSTRAINT IF EXISTS tokens_chain_network_address_unique
  `.execute(db);

  // Drop the existing index
  await sql`DROP INDEX IF EXISTS idx_tokens_chain_network`.execute(db);

  // Drop the network column
  await db.schema.alterTable('tokens').dropColumn('network').execute();

  // Rename chain to chain_alias
  await sql`
    ALTER TABLE tokens
    RENAME COLUMN chain TO chain_alias
  `.execute(db);

  // Re-create unique constraint with chain_alias
  await sql`
    ALTER TABLE tokens
    ADD CONSTRAINT tokens_chain_alias_address_unique UNIQUE (chain_alias, address)
  `.execute(db);

  // Create new index
  await db.schema
    .createIndex('idx_tokens_chain_alias')
    .on('tokens')
    .column('chain_alias')
    .execute();

  // ============================================================
  // 3. TRANSACTIONS TABLE
  // ============================================================

  // Drop the existing unique constraint
  await sql`
    ALTER TABLE transactions
    DROP CONSTRAINT IF EXISTS transactions_chain_network_tx_hash_unique
  `.execute(db);

  // Drop the existing index
  await sql`DROP INDEX IF EXISTS idx_transactions_chain_network_timestamp`.execute(db);

  // Drop the network column
  await db.schema.alterTable('transactions').dropColumn('network').execute();

  // Rename chain to chain_alias
  await sql`
    ALTER TABLE transactions
    RENAME COLUMN chain TO chain_alias
  `.execute(db);

  // Re-create unique constraint with chain_alias
  await sql`
    ALTER TABLE transactions
    ADD CONSTRAINT transactions_chain_alias_tx_hash_unique UNIQUE (chain_alias, tx_hash)
  `.execute(db);

  // Create new index
  await db.schema
    .createIndex('idx_transactions_chain_alias_timestamp')
    .on('transactions')
    .columns(['chain_alias', 'timestamp'])
    .execute();

  // ============================================================
  // 4. NATIVE_TRANSFERS TABLE
  // ============================================================

  // Drop the network column
  await db.schema.alterTable('native_transfers').dropColumn('network').execute();

  // Rename chain to chain_alias
  await sql`
    ALTER TABLE native_transfers
    RENAME COLUMN chain TO chain_alias
  `.execute(db);

  // ============================================================
  // 5. TOKEN_TRANSFERS TABLE
  // ============================================================

  // Drop the network column
  await db.schema.alterTable('token_transfers').dropColumn('network').execute();

  // Rename chain to chain_alias
  await sql`
    ALTER TABLE token_transfers
    RENAME COLUMN chain TO chain_alias
  `.execute(db);

  // ============================================================
  // 6. TOKEN_HOLDINGS TABLE
  // ============================================================

  // Drop the existing unique index (uses COALESCE for null token_address)
  await sql`DROP INDEX IF EXISTS idx_token_holdings_unique`.execute(db);

  // Drop the network column
  await db.schema.alterTable('token_holdings').dropColumn('network').execute();

  // Rename chain to chain_alias
  await sql`
    ALTER TABLE token_holdings
    RENAME COLUMN chain TO chain_alias
  `.execute(db);

  // Re-create unique index with chain_alias
  await sql`
    CREATE UNIQUE INDEX idx_token_holdings_unique
    ON token_holdings (address_id, chain_alias, COALESCE(token_address, ''))
  `.execute(db);

  // ============================================================
  // 7. ADDRESS_TRANSACTIONS TABLE
  // ============================================================

  // Drop the network column (no unique constraint involving network)
  await db.schema.alterTable('address_transactions').dropColumn('network').execute();

  // Rename chain to chain_alias
  await sql`
    ALTER TABLE address_transactions
    RENAME COLUMN chain TO chain_alias
  `.execute(db);

  // ============================================================
  // 8. SYNC_STATE TABLE
  // ============================================================

  // Drop the existing unique constraint
  await sql`
    ALTER TABLE sync_state
    DROP CONSTRAINT IF EXISTS sync_state_address_chain_network_unique
  `.execute(db);

  // Drop the network column
  await db.schema.alterTable('sync_state').dropColumn('network').execute();

  // Rename chain to chain_alias
  await sql`
    ALTER TABLE sync_state
    RENAME COLUMN chain TO chain_alias
  `.execute(db);

  // Re-create unique constraint with chain_alias
  await sql`
    ALTER TABLE sync_state
    ADD CONSTRAINT sync_state_address_chain_alias_unique UNIQUE (address_id, chain_alias)
  `.execute(db);

  // ============================================================
  // 9. RECONCILIATION_JOBS TABLE
  // ============================================================

  // Drop the existing index (no unique constraint)
  await sql`DROP INDEX IF EXISTS idx_reconciliation_jobs_address_chain`.execute(db);

  // Drop the network column
  await db.schema.alterTable('reconciliation_jobs').dropColumn('network').execute();

  // Rename chain to chain_alias
  await sql`
    ALTER TABLE reconciliation_jobs
    RENAME COLUMN chain TO chain_alias
  `.execute(db);

  // Re-create index with chain_alias
  await db.schema
    .createIndex('idx_reconciliation_jobs_address_chain_alias')
    .on('reconciliation_jobs')
    .columns(['address', 'chain_alias'])
    .execute();
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // This migration is not reversible as it removes the network column
  // and consolidates chain+network into chain_alias.
  // To rollback, restore from backup or re-run all migrations from scratch.
  throw new Error(
    'Chain alias unification migration cannot be reversed. ' +
      'The network column has been removed and data has been consolidated. ' +
      'Restore from backup if rollback is needed.'
  );
}
