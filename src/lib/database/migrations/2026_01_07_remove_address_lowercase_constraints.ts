import { type Kysely, sql } from 'kysely';

/**
 * Remove lowercase constraints from address fields.
 *
 * Some blockchain addresses are case-sensitive (XRP, TVM/TRON) and others
 * use mixed case for checksum validation (EVM ERC-55). Storing addresses
 * in their original format preserves this information.
 *
 * After this migration, addresses are stored as-is and lookups should use
 * case-insensitive comparisons (LOWER() function).
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  // Remove lowercase constraint from addresses table
  await sql`
    ALTER TABLE addresses
    DROP CONSTRAINT IF EXISTS addresses_address_lowercase_check
  `.execute(db);

  // Remove lowercase constraints from transactions table
  await sql`
    ALTER TABLE transactions
    DROP CONSTRAINT IF EXISTS transactions_from_address_lowercase_check
  `.execute(db);

  await sql`
    ALTER TABLE transactions
    DROP CONSTRAINT IF EXISTS transactions_to_address_lowercase_check
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Re-add lowercase constraint to addresses table
  await sql`
    ALTER TABLE addresses
    ADD CONSTRAINT addresses_address_lowercase_check
    CHECK (address = LOWER(address))
  `.execute(db);

  // Re-add lowercase constraints to transactions table
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
}
