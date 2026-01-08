import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { type Kysely, sql } from 'kysely';
import { v4 as uuidv4 } from 'uuid';
import type { Database, Token as TokenRow } from '@/src/lib/database/types.js';
import type { Token, CreateTokenMetadataInput, TokenRepository } from '@/src/repositories/types.js';

/**
 * Maps a database token row to the repository Token interface
 */
function mapToToken(row: TokenRow): Token {
  return {
    id: row.id,
    chainAlias: row.chain_alias as ChainAlias,
    address: row.address,
    name: row.name,
    symbol: row.symbol,
    decimals: row.decimals,
    logoUri: row.logo_uri,
    coingeckoId: row.coingecko_id,
    isVerified: row.is_verified,
    isSpam: row.is_spam,
    spamClassification: row.spam_classification ?? null,
    classificationUpdatedAt: row.classification_updated_at as Date | null,
    classificationTtlHours: row.classification_ttl_hours ?? 720,
    needsClassification: row.needs_classification,
    classificationAttempts: row.classification_attempts,
    classificationError: row.classification_error,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

export class PostgresTokenRepository implements TokenRepository {
  constructor(private db: Kysely<Database>) {}

  async findById(id: string): Promise<Token | null> {
    const result = await this.db
      .selectFrom('tokens')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return result ? mapToToken(result) : null;
  }

  async findByChainAliasAndAddress(
    chainAlias: ChainAlias,
    address: string
  ): Promise<Token | null> {
    const result = await this.db
      .selectFrom('tokens')
      .selectAll()
      .where('chain_alias', '=', chainAlias)
      .where(sql`LOWER(address)`, '=', address.toLowerCase())
      .executeTakeFirst();

    return result ? mapToToken(result) : null;
  }

  async findVerifiedByChainAlias(chainAlias: ChainAlias): Promise<Token[]> {
    const results = await this.db
      .selectFrom('tokens')
      .selectAll()
      .where('chain_alias', '=', chainAlias)
      .where('is_verified', '=', true)
      .where('is_spam', '=', false)
      .execute();

    return results.map(mapToToken);
  }

  async findByCoingeckoIds(coingeckoIds: string[]): Promise<Token[]> {
    if (coingeckoIds.length === 0) {
      return [];
    }

    const results = await this.db
      .selectFrom('tokens')
      .selectAll()
      .where('coingecko_id', 'in', coingeckoIds)
      .execute();

    return results.map(mapToToken);
  }

  async upsert(input: CreateTokenMetadataInput): Promise<Token> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const result = await this.db
      .insertInto('tokens')
      .values({
        id,
        chain_alias: input.chainAlias,
        address: input.address,
        name: input.name,
        symbol: input.symbol,
        decimals: input.decimals,
        logo_uri: input.logoUri ?? null,
        coingecko_id: input.coingeckoId ?? null,
        is_verified: input.isVerified ?? false,
        is_spam: input.isSpam ?? false,
        created_at: now,
        updated_at: now,
      })
      .onConflict((oc) =>
        oc.columns(['chain_alias', 'address']).doUpdateSet({
          name: input.name,
          symbol: input.symbol,
          decimals: input.decimals,
          logo_uri: input.logoUri ?? null,
          coingecko_id: input.coingeckoId ?? null,
          is_verified: input.isVerified ?? false,
          is_spam: input.isSpam ?? false,
          updated_at: now,
        })
      )
      .returningAll()
      .executeTakeFirstOrThrow();

    return mapToToken(result);
  }

  async upsertMany(inputs: CreateTokenMetadataInput[]): Promise<Token[]> {
    if (inputs.length === 0) {
      return [];
    }

    // Process upserts sequentially to handle conflicts properly
    const results: Token[] = [];
    for (const input of inputs) {
      const token = await this.upsert(input);
      results.push(token);
    }

    return results;
  }

  async findNeedingClassification(options: {
    limit: number;
    maxAttempts: number;
  }): Promise<Token[]> {
    const results = await this.db
      .selectFrom('tokens')
      .selectAll()
      .where('needs_classification', '=', true)
      .where('classification_attempts', '<', options.maxAttempts)
      .orderBy(sql`classification_updated_at ASC NULLS FIRST`)
      .orderBy('created_at', 'asc')
      .limit(options.limit)
      .execute();

    return results.map(mapToToken);
  }

  /**
   * Marks tokens for re-classification when their cached classification has expired.
   * Uses the per-token `classification_ttl_hours` column to determine expiration.
   *
   * @param _ttlHours - Unused. TTL is determined by each token's classification_ttl_hours column.
   *                    Parameter kept for interface consistency.
   * @returns Number of tokens marked for re-classification
   */
  async refreshExpiredClassifications(_ttlHours: number): Promise<number> {
    const result = await this.db
      .updateTable('tokens')
      .set({
        needs_classification: true,
        classification_attempts: 0,
      })
      .where('needs_classification', '=', false)
      .where(
        sql`classification_updated_at + (classification_ttl_hours * interval '1 hour') < NOW()`
      )
      .executeTakeFirst();

    return Number(result.numUpdatedRows ?? 0);
  }
}
