import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { type Kysely, sql } from 'kysely';
import type {
  Database,
  Transaction as TransactionRow,
  NativeTransfer as NativeTransferRow,
  TokenTransfer as TokenTransferRow,
} from '@/src/lib/database/types.js';
import type {
  Transaction,
  TransactionWithDomain,
  TransactionRepository,
  TransactionListOptions,
  TransactionListResult,
  NativeTransfer,
  TokenTransfer,
  TokenTransferWithMetadata,
} from '@/src/repositories/types.js';
import { TransactionMapper, AddressMapper } from './mappers/index.js';

/** Native token decimals (ETH, MATIC, etc. all use 18 decimals) */
const NATIVE_TOKEN_DECIMALS = 18;

/**
 * Maps a database transaction row (snake_case) to the Transaction interface (camelCase)
 */
function mapToTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    chainAlias: row.chain_alias as ChainAlias,
    txHash: row.tx_hash,
    blockNumber: row.block_number,
    blockHash: row.block_hash,
    txIndex: row.tx_index,
    fromAddress: row.from_address,
    toAddress: row.to_address,
    value: row.value,
    fee: row.fee,
    status: row.status,
    timestamp: row.timestamp,
    classificationType: row.classification_type,
    classificationLabel: row.classification_label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Maps a database transaction row to TransactionWithDomain, enriching with domain value objects.
 * Preserves all raw string properties for backward compatibility while adding type-safe domain objects.
 */
function mapToTransactionWithDomain(row: TransactionRow): TransactionWithDomain {
  const chainAlias = row.chain_alias as ChainAlias;
  const base = mapToTransaction(row);

  return {
    ...base,
    txHashDomain: TransactionMapper.hashToDomain(row.tx_hash, chainAlias),
    fromAddressDomain: AddressMapper.toDomain({ address: row.from_address, chain_alias: chainAlias }),
    toAddressDomain: row.to_address
      ? AddressMapper.toDomain({ address: row.to_address, chain_alias: chainAlias })
      : null,
    valueDomain: TransactionMapper.amountToDomain(row.value, NATIVE_TOKEN_DECIMALS),
  };
}

/**
 * Maps a database transaction row with direction (from address_transactions join) to Transaction
 */
function mapToTransactionWithDirection(
  row: TransactionRow & { direction?: 'in' | 'out' | 'neutral' }
): Transaction {
  const base = mapToTransaction(row);
  if (row.direction) {
    base.direction = row.direction;
  }
  return base;
}

/**
 * Maps a database native transfer row (snake_case) to the NativeTransfer interface (camelCase)
 */
function mapToNativeTransfer(row: NativeTransferRow): NativeTransfer {
  return {
    id: row.id,
    txId: row.tx_id,
    chainAlias: row.chain_alias as ChainAlias,
    fromAddress: row.from_address,
    toAddress: row.to_address,
    amount: row.amount,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

/**
 * Maps a database token transfer row (snake_case) to the TokenTransfer interface (camelCase)
 */
function mapToTokenTransfer(row: TokenTransferRow): TokenTransfer {
  return {
    id: row.id,
    txId: row.tx_id,
    chainAlias: row.chain_alias as ChainAlias,
    tokenAddress: row.token_address,
    fromAddress: row.from_address,
    toAddress: row.to_address,
    amount: row.amount,
    transferType: row.transfer_type,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

export class PostgresTransactionRepository implements TransactionRepository {
  constructor(private db: Kysely<Database>) {}

  async findById(id: string): Promise<Transaction | null> {
    const result = await this.db
      .selectFrom('transactions')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return result ? mapToTransaction(result) : null;
  }

  async findByTxHash(chainAlias: ChainAlias, txHash: string): Promise<TransactionWithDomain | null> {
    const result = await this.db
      .selectFrom('transactions')
      .selectAll()
      .where('chain_alias', '=', chainAlias)
      .where('tx_hash', '=', txHash.toLowerCase())
      .executeTakeFirst();

    return result ? mapToTransactionWithDomain(result) : null;
  }

  async findByAddress(
    address: string,
    options?: { chainAlias?: ChainAlias; limit?: number; offset?: number }
  ): Promise<{ data: Transaction[]; total: number }> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    const normalizedAddress = address.toLowerCase();

    // Build base query for the join
    let baseQuery = this.db
      .selectFrom('address_transactions as at')
      .innerJoin('transactions as t', 't.id', 'at.tx_id')
      .where(sql`LOWER(at.address)`, '=', normalizedAddress);

    // Apply optional filters
    if (options?.chainAlias) {
      baseQuery = baseQuery.where('at.chain_alias', '=', options.chainAlias);
    }

    // Execute data and count queries in parallel
    const [data, countResult] = await Promise.all([
      baseQuery
        .select([
          't.id',
          't.chain_alias',
          't.tx_hash',
          't.block_number',
          't.block_hash',
          't.tx_index',
          't.from_address',
          't.to_address',
          't.value',
          't.fee',
          't.status',
          't.timestamp',
          't.classification_type',
          't.classification_label',
          't.created_at',
          't.updated_at',
          'at.direction',
        ])
        .orderBy('at.timestamp', 'desc')
        .limit(limit)
        .offset(offset)
        .execute(),
      baseQuery
        .select((eb) => eb.fn.countAll<number>().as('count'))
        .executeTakeFirstOrThrow(),
    ]);

    const total = Number(countResult.count);

    return {
      data: data.map((row) =>
        mapToTransactionWithDirection(row as unknown as TransactionRow & { direction?: 'in' | 'out' | 'neutral' })
      ),
      total,
    };
  }

  async findByChainAliasAndAddress(
    chainAlias: ChainAlias,
    address: string,
    options: TransactionListOptions
  ): Promise<TransactionListResult> {
    const { cursor, limit, sort, direction: directionFilter } = options;
    const sortDirection = sort === 'asc' ? 'asc' : 'desc';
    const normalizedAddress = address.toLowerCase();

    let query = this.db
      .selectFrom('address_transactions as at')
      .innerJoin('transactions as t', 't.id', 'at.tx_id')
      .select([
        't.id',
        't.chain_alias',
        't.tx_hash',
        't.block_number',
        't.block_hash',
        't.tx_index',
        't.from_address',
        't.to_address',
        't.value',
        't.fee',
        't.status',
        't.timestamp',
        't.classification_type',
        't.classification_label',
        't.created_at',
        't.updated_at',
        'at.direction',
      ])
      .where(sql`LOWER(at.address)`, '=', normalizedAddress)
      .where('at.chain_alias', '=', chainAlias);

    // Apply direction filter if provided
    if (directionFilter && directionFilter.length > 0) {
      query = query.where('at.direction', 'in', directionFilter);
    }

    if (cursor) {
      // Use tuple comparison for cursor-based pagination
      // This compares (timestamp, tx_id) tuples for proper ordering
      query = query.where(({ eb, refTuple, tuple }) =>
        eb(
          refTuple('at.timestamp', 'at.tx_id'),
          sort === 'asc' ? '>' : '<',
          tuple(cursor.timestamp, cursor.txId)
        )
      );
    }

    const rows = await query
      .orderBy('at.timestamp', sortDirection)
      .orderBy('at.tx_id', sortDirection)
      .limit(limit + 1)
      .execute();

    const hasMore = rows.length > limit;
    const data = rows.slice(0, limit).map((row) =>
      mapToTransactionWithDirection(row as unknown as TransactionRow & { direction?: 'in' | 'out' | 'neutral' })
    );

    return { data, hasMore };
  }

  async findNativeTransfersByTxIds(txIds: string[]): Promise<NativeTransfer[]> {
    if (txIds.length === 0) return [];

    const rows = await this.db
      .selectFrom('native_transfers')
      .selectAll()
      .where('tx_id', 'in', txIds)
      .execute();

    return rows.map(mapToNativeTransfer);
  }

  async findTokenTransfersByTxIds(txIds: string[]): Promise<TokenTransfer[]> {
    if (txIds.length === 0) return [];

    const rows = await this.db
      .selectFrom('token_transfers')
      .selectAll()
      .where('tx_id', 'in', txIds)
      .execute();

    return rows.map(mapToTokenTransfer);
  }

  async findTokenTransfersWithMetadataByTxIds(txIds: string[]): Promise<TokenTransferWithMetadata[]> {
    if (txIds.length === 0) return [];

    const rows = await this.db
      .selectFrom('token_transfers as tt')
      .leftJoin('tokens as t', (join) =>
        join
          .onRef('t.chain_alias', '=', 'tt.chain_alias')
          .onRef('t.address', '=', 'tt.token_address')
      )
      .select([
        'tt.id',
        'tt.tx_id',
        'tt.chain_alias',
        'tt.token_address',
        'tt.from_address',
        'tt.to_address',
        'tt.amount',
        'tt.transfer_type',
        'tt.metadata',
        'tt.created_at',
        't.name as token_name',
        't.symbol as token_symbol',
        't.decimals as token_decimals',
        't.logo_uri as token_logo_uri',
        't.coingecko_id as token_coingecko_id',
        't.is_verified as token_is_verified',
        't.is_spam as token_is_spam',
      ])
      .where('tt.tx_id', 'in', txIds)
      .execute();

    return rows.map((row) => ({
      id: row.id,
      txId: row.tx_id,
      chainAlias: row.chain_alias as ChainAlias,
      tokenAddress: row.token_address,
      fromAddress: row.from_address,
      toAddress: row.to_address,
      amount: row.amount,
      transferType: row.transfer_type,
      metadata: row.metadata,
      createdAt: row.created_at,
      tokenName: row.token_name,
      tokenSymbol: row.token_symbol,
      tokenDecimals: row.token_decimals,
      tokenLogoUri: row.token_logo_uri,
      tokenCoingeckoId: row.token_coingecko_id,
      tokenIsVerified: row.token_is_verified,
      tokenIsSpam: row.token_is_spam,
    }));
  }
}
