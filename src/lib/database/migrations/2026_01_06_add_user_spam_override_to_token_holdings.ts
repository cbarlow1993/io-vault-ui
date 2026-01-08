import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('token_holdings')
    .addColumn('user_spam_override', 'varchar(20)')
    .execute();

  await db.schema
    .alterTable('token_holdings')
    .addColumn('override_updated_at', 'timestamptz')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('token_holdings')
    .dropColumn('override_updated_at')
    .execute();

  await db.schema
    .alterTable('token_holdings')
    .dropColumn('user_spam_override')
    .execute();
}
