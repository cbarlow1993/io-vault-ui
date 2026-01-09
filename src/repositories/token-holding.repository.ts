import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { type Kysely, sql } from 'kysely';
import { v4 as uuidv4 } from 'uuid';
import type { Database, TokenHolding as TokenHoldingRow } from '@/src/lib/database/types.js';
import type { TokenHolding, CreateTokenHoldingInput, TokenHoldingRepository } from '@/src/repositories/types.js';

/**
 * Maps a database token holding row to the repository TokenHolding interface
 */
function mapToTokenHolding(row: TokenHoldingRow): TokenHolding {
  return {
    id: row.id,
    addressId: row.address_id,
    chainAlias: row.chain_alias as ChainAlias,
    tokenAddress: row.token_address,
    isNative: row.is_native,
    balance: row.balance,
    decimals: row.decimals,
    name: row.name,
    symbol: row.symbol,
    visibility: row.visibility,
    userSpamOverride: row.user_spam_override,
    overrideUpdatedAt: row.override_updated_at ? new Date(row.override_updated_at) : null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

export class PostgresTokenHoldingRepository implements TokenHoldingRepository {
  constructor(private db: Kysely<Database>) {}

  async findByAddressId(addressId: string): Promise<TokenHolding[]> {
    const results = await this.db
      .selectFrom('token_holdings')
      .selectAll()
      .where('address_id', '=', addressId)
      .orderBy('is_native', 'desc')
      .orderBy('symbol', 'asc')
      .execute();

    return results.map(mapToTokenHolding);
  }

  async findVisibleByAddressId(addressId: string): Promise<TokenHolding[]> {
    const results = await this.db
      .selectFrom('token_holdings')
      .selectAll()
      .where('address_id', '=', addressId)
      .where('visibility', '=', 'visible')
      .orderBy('is_native', 'desc')
      .orderBy('symbol', 'asc')
      .execute();

    return results.map(mapToTokenHolding);
  }

  async upsert(input: CreateTokenHoldingInput): Promise<TokenHolding> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const tokenAddress = input.tokenAddress ?? null;

    // Use raw SQL for upsert because the unique index uses COALESCE(token_address, '')
    // which requires matching the same expression in ON CONFLICT
    // We use LOWER() for case-insensitive matching on conflict, but store original format
    const result = await sql<TokenHoldingRow>`
      INSERT INTO token_holdings (
        id, address_id, chain_alias, token_address, is_native,
        balance, decimals, name, symbol, visibility, created_at, updated_at
      ) VALUES (
        ${id}, ${input.addressId}, ${input.chainAlias},
        ${tokenAddress}, ${input.isNative}, ${input.balance},
        ${input.decimals}, ${input.name}, ${input.symbol}, 'visible',
        ${now}::timestamptz, ${now}::timestamptz
      )
      ON CONFLICT (address_id, chain_alias, COALESCE(token_address, ''))
      DO UPDATE SET
        balance = EXCLUDED.balance,
        decimals = EXCLUDED.decimals,
        name = EXCLUDED.name,
        symbol = EXCLUDED.symbol,
        is_native = EXCLUDED.is_native,
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `.execute(this.db);

    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to upsert token holding');
    }

    return mapToTokenHolding(row);
  }

  async upsertMany(inputs: CreateTokenHoldingInput[]): Promise<TokenHolding[]> {
    if (inputs.length === 0) {
      return [];
    }

    // Process upserts sequentially to handle conflicts properly
    // Each upsert uses raw SQL with ON CONFLICT for the unique index
    const results: TokenHolding[] = [];
    for (const input of inputs) {
      const holding = await this.upsert(input);
      results.push(holding);
    }

    return results;
  }

  async updateVisibility(
    id: string,
    visibility: 'visible' | 'hidden'
  ): Promise<TokenHolding> {
    const now = new Date().toISOString();

    const result = await this.db
      .updateTable('token_holdings')
      .set({
        visibility,
        updated_at: now,
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return mapToTokenHolding(result);
  }

  async updateSpamOverride(
    addressId: string,
    tokenAddress: string | null,
    override: 'trusted' | 'spam' | null
  ): Promise<TokenHolding | null> {
    const now = new Date();
    const nowString = now.toISOString();

    const result = await this.db
      .updateTable('token_holdings')
      .set({
        user_spam_override: override,
        override_updated_at: override ? now : null,
        updated_at: nowString,
      })
      .where('address_id', '=', addressId)
      .where((eb) =>
        tokenAddress
          ? eb(sql`LOWER(token_address)`, '=', tokenAddress.toLowerCase())
          : eb('token_address', 'is', null)
      )
      .returningAll()
      .executeTakeFirst();

    return result ? mapToTokenHolding(result) : null;
  }

  async updateSpamOverrideBatch(
    addressId: string,
    overrides: Array<{ tokenAddress: string | null; override: 'trusted' | 'spam' | null }>
  ): Promise<TokenHolding[]> {
    const now = new Date();
    const nowString = now.toISOString();

    // Execute all updates in a transaction
    return this.db.transaction().execute(async (trx) => {
      const results: TokenHolding[] = [];

      for (const { tokenAddress, override } of overrides) {
        const result = await trx
          .updateTable('token_holdings')
          .set({
            user_spam_override: override,
            override_updated_at: override ? now : null,
            updated_at: nowString,
          })
          .where('address_id', '=', addressId)
          .where((eb) =>
            tokenAddress
              ? eb(sql`LOWER(token_address)`, '=', tokenAddress.toLowerCase())
              : eb('token_address', 'is', null)
          )
          .returningAll()
          .executeTakeFirst();

        if (result) {
          results.push(mapToTokenHolding(result));
        }
      }

      return results;
    });
  }
}
