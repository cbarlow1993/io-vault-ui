import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // await db.schema.alterTable('Vault').dropColumn('name').execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // await db.schema
  //   .alterTable('Vault')
  //   .addColumn('name', 'varchar(255)')
  //   .execute();
}
