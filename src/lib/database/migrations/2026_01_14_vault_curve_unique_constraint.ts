import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE "VaultCurve"
    ADD CONSTRAINT "VaultCurve_vaultId_curve_unique" UNIQUE ("vaultId", "curve")
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE "VaultCurve"
    DROP CONSTRAINT "VaultCurve_vaultId_curve_unique"
  `.execute(db);
}
