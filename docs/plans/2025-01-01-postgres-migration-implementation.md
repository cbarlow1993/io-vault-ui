# PostgreSQL Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate from DynamoDB/Noves to PostgreSQL with direct chain RPC balance fetching and CoinGecko pricing.

**Architecture:** Replace DynamoDB tables with PostgreSQL, remove Noves API calls from the API service (moved to sync service), implement direct RPC balance fetchers using iofinnet nodes, add CoinGecko pricing with PostgreSQL cache.

**Tech Stack:** Fastify, Kysely (PostgreSQL ORM), TypeScript, Vitest, ethers.js (EVM RPC)

---

## Phase 1: Schema & Infrastructure

### Task 1: Create Database Types for New Tables

**Files:**
- Modify: `services/core/src/lib/database/types.ts`

**Step 1: Read the current database types file**

Read `services/core/src/lib/database/types.ts` to understand the existing structure.

**Step 2: Add new table types**

Add the following types to the file:

```typescript
// Token metadata table
export interface TokenTable {
  id: string;
  chain: string;
  network: string;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logo_uri: string | null;
  coingecko_id: string | null;
  is_verified: boolean;
  is_spam: boolean;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

// Token prices cache table
export interface TokenPriceTable {
  id: string;
  coingecko_id: string;
  currency: string;
  price: string;
  price_change_24h: string | null;
  market_cap: string | null;
  fetched_at: ColumnType<Date, string, string>;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

// Transaction table
export interface TransactionTable {
  id: string;
  chain: string;
  network: string;
  tx_hash: string;
  block_number: string;
  block_hash: string;
  tx_index: number | null;
  from_address: string;
  to_address: string | null;
  value: string;
  fee: string | null;
  status: 'success' | 'failed' | 'pending';
  timestamp: ColumnType<Date, string, never>;
  classification_type: string | null;
  classification_label: string | null;
  protocol_name: string | null;
  details: ColumnType<Record<string, unknown> | null, string | null, string | null>;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

// Native transfer table
export interface NativeTransferTable {
  id: string;
  tx_id: string;
  chain: string;
  network: string;
  from_address: string | null;
  to_address: string | null;
  amount: string;
  metadata: ColumnType<Record<string, unknown> | null, string | null, string | null>;
  created_at: ColumnType<Date, string | undefined, never>;
}

// Token transfer table
export interface TokenTransferTable {
  id: string;
  tx_id: string;
  chain: string;
  network: string;
  token_address: string;
  from_address: string | null;
  to_address: string | null;
  amount: string;
  transfer_type: 'transfer' | 'mint' | 'burn' | 'approve';
  metadata: ColumnType<Record<string, unknown> | null, string | null, string | null>;
  created_at: ColumnType<Date, string | undefined, never>;
}

// Token holdings table (modified for native support)
export interface TokenHoldingTable {
  id: string;
  address_id: string;
  chain: string;
  network: string;
  token_address: string | null; // null = native currency
  is_native: boolean;
  balance: string;
  decimals: number;
  name: string;
  symbol: string;
  visibility: 'visible' | 'hidden';
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

// Address transactions (denormalized)
export interface AddressTransactionTable {
  id: string;
  address: string;
  tx_id: string;
  chain: string;
  network: string;
  timestamp: ColumnType<Date, string, never>;
  has_native_transfer: boolean;
  has_token_transfer: boolean;
  total_value: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

// Sync state table
export interface SyncStateTable {
  id: string;
  address_id: string;
  chain: string;
  network: string;
  last_indexed_block: string;
  last_indexed_tx_hash: string | null;
  last_indexed_at: ColumnType<Date, string, string>;
  status: 'pending' | 'syncing' | 'synced' | 'error';
  error_message: string | null;
  retry_count: number;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}
```

**Step 3: Update the Database interface**

Add the new tables to the Database interface:

```typescript
export interface Database {
  addresses: AddressTable;
  address_tokens: AddressTokenTable;
  tokens: TokenTable;
  token_prices: TokenPriceTable;
  transactions: TransactionTable;
  native_transfers: NativeTransferTable;
  token_transfers: TokenTransferTable;
  token_holdings: TokenHoldingTable;
  address_transactions: AddressTransactionTable;
  sync_state: SyncStateTable;
}
```

**Step 4: Commit**

```bash
git add services/core/src/lib/database/types.ts
git commit -m "feat(db): add type definitions for new PostgreSQL tables

Add types for tokens, token_prices, transactions, transfers,
token_holdings, address_transactions, and sync_state tables."
```

---

### Task 2: Create Database Migration

**Files:**
- Create: `services/core/src/lib/database/migrations/2025_01_03_full_schema_migration.ts`

**Step 1: Create the migration file**

```typescript
import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // 1. Create tokens table
  await db.schema
    .createTable('tokens')
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('chain', 'varchar(50)', (col) => col.notNull())
    .addColumn('network', 'varchar(50)', (col) => col.notNull())
    .addColumn('address', 'varchar(255)', (col) => col.notNull())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('symbol', 'varchar(50)', (col) => col.notNull())
    .addColumn('decimals', 'integer', (col) => col.notNull())
    .addColumn('logo_uri', 'text')
    .addColumn('coingecko_id', 'varchar(255)')
    .addColumn('is_verified', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('is_spam', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  await db.schema
    .createIndex('idx_tokens_chain')
    .on('tokens')
    .columns(['chain', 'network'])
    .execute();

  await db.schema
    .createIndex('uq_tokens_chain_address')
    .on('tokens')
    .columns(['chain', 'network', 'address'])
    .unique()
    .execute();

  await db.schema
    .createIndex('idx_tokens_coingecko')
    .on('tokens')
    .column('coingecko_id')
    .execute();

  // 2. Create token_prices table
  await db.schema
    .createTable('token_prices')
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('coingecko_id', 'varchar(255)', (col) => col.notNull())
    .addColumn('currency', 'varchar(10)', (col) => col.notNull())
    .addColumn('price', 'decimal(30,10)', (col) => col.notNull())
    .addColumn('price_change_24h', 'decimal(10,4)')
    .addColumn('market_cap', 'decimal(30,2)')
    .addColumn('fetched_at', 'timestamptz', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  await db.schema
    .createIndex('uq_token_prices_coingecko_currency')
    .on('token_prices')
    .columns(['coingecko_id', 'currency'])
    .unique()
    .execute();

  await db.schema
    .createIndex('idx_token_prices_fetched')
    .on('token_prices')
    .column('fetched_at')
    .execute();

  // 3. Create transactions table
  await db.schema
    .createTable('transactions')
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('chain', 'varchar(50)', (col) => col.notNull())
    .addColumn('network', 'varchar(50)', (col) => col.notNull())
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
    .addColumn('classification_type', 'varchar(50)')
    .addColumn('classification_label', 'text')
    .addColumn('protocol_name', 'varchar(100)')
    .addColumn('details', 'jsonb')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  await db.schema
    .createIndex('uq_transactions_chain_hash')
    .on('transactions')
    .columns(['chain', 'network', 'tx_hash'])
    .unique()
    .execute();

  await db.schema
    .createIndex('idx_transactions_from')
    .on('transactions')
    .column('from_address')
    .execute();

  await db.schema
    .createIndex('idx_transactions_to')
    .on('transactions')
    .column('to_address')
    .execute();

  await db.schema
    .createIndex('idx_transactions_timestamp')
    .on('transactions')
    .columns(['chain', 'network', 'timestamp'])
    .execute();

  // Add check constraint for lowercase addresses
  await sql`ALTER TABLE transactions ADD CONSTRAINT chk_tx_from_lowercase CHECK (from_address = LOWER(from_address))`.execute(db);
  await sql`ALTER TABLE transactions ADD CONSTRAINT chk_tx_to_lowercase CHECK (to_address IS NULL OR to_address = LOWER(to_address))`.execute(db);

  // 4. Create native_transfers table
  await db.schema
    .createTable('native_transfers')
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('tx_id', 'uuid', (col) =>
      col.notNull().references('transactions.id').onDelete('cascade')
    )
    .addColumn('chain', 'varchar(50)', (col) => col.notNull())
    .addColumn('network', 'varchar(50)', (col) => col.notNull())
    .addColumn('from_address', 'varchar(255)')
    .addColumn('to_address', 'varchar(255)')
    .addColumn('amount', 'varchar(100)', (col) => col.notNull())
    .addColumn('metadata', 'jsonb')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  await db.schema
    .createIndex('idx_native_transfers_tx')
    .on('native_transfers')
    .column('tx_id')
    .execute();

  await db.schema
    .createIndex('idx_native_transfers_from')
    .on('native_transfers')
    .column('from_address')
    .execute();

  await db.schema
    .createIndex('idx_native_transfers_to')
    .on('native_transfers')
    .column('to_address')
    .execute();

  // 5. Create token_transfers table
  await db.schema
    .createTable('token_transfers')
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('tx_id', 'uuid', (col) =>
      col.notNull().references('transactions.id').onDelete('cascade')
    )
    .addColumn('chain', 'varchar(50)', (col) => col.notNull())
    .addColumn('network', 'varchar(50)', (col) => col.notNull())
    .addColumn('token_address', 'varchar(255)', (col) => col.notNull())
    .addColumn('from_address', 'varchar(255)')
    .addColumn('to_address', 'varchar(255)')
    .addColumn('amount', 'varchar(100)', (col) => col.notNull())
    .addColumn('transfer_type', 'varchar(20)', (col) => col.notNull())
    .addColumn('metadata', 'jsonb')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  await db.schema
    .createIndex('idx_token_transfers_tx')
    .on('token_transfers')
    .column('tx_id')
    .execute();

  await db.schema
    .createIndex('idx_token_transfers_token')
    .on('token_transfers')
    .column('token_address')
    .execute();

  await db.schema
    .createIndex('idx_token_transfers_from')
    .on('token_transfers')
    .column('from_address')
    .execute();

  await db.schema
    .createIndex('idx_token_transfers_to')
    .on('token_transfers')
    .column('to_address')
    .execute();

  // 6. Create token_holdings table
  await db.schema
    .createTable('token_holdings')
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('address_id', 'uuid', (col) =>
      col.notNull().references('addresses.id').onDelete('cascade')
    )
    .addColumn('chain', 'varchar(50)', (col) => col.notNull())
    .addColumn('network', 'varchar(50)', (col) => col.notNull())
    .addColumn('token_address', 'varchar(255)')
    .addColumn('is_native', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('balance', 'varchar(100)', (col) => col.notNull())
    .addColumn('decimals', 'integer', (col) => col.notNull())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('symbol', 'varchar(50)', (col) => col.notNull())
    .addColumn('visibility', 'varchar(20)', (col) =>
      col.notNull().defaultTo('visible')
    )
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  await db.schema
    .createIndex('idx_token_holdings_address')
    .on('token_holdings')
    .column('address_id')
    .execute();

  await db.schema
    .createIndex('uq_token_holdings_address_token')
    .on('token_holdings')
    .columns(['address_id', 'chain', 'network', 'token_address'])
    .unique()
    .execute();

  // 7. Create address_transactions table
  await db.schema
    .createTable('address_transactions')
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('address', 'varchar(255)', (col) => col.notNull())
    .addColumn('tx_id', 'uuid', (col) =>
      col.notNull().references('transactions.id').onDelete('cascade')
    )
    .addColumn('chain', 'varchar(50)', (col) => col.notNull())
    .addColumn('network', 'varchar(50)', (col) => col.notNull())
    .addColumn('timestamp', 'timestamptz', (col) => col.notNull())
    .addColumn('has_native_transfer', 'boolean', (col) =>
      col.notNull().defaultTo(false)
    )
    .addColumn('has_token_transfer', 'boolean', (col) =>
      col.notNull().defaultTo(false)
    )
    .addColumn('total_value', 'varchar(100)')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  await db.schema
    .createIndex('idx_address_transactions_address')
    .on('address_transactions')
    .columns(['address', 'timestamp'])
    .execute();

  await db.schema
    .createIndex('uq_address_transactions_address_tx')
    .on('address_transactions')
    .columns(['address', 'tx_id'])
    .unique()
    .execute();

  // 8. Create sync_state table
  await db.schema
    .createTable('sync_state')
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('address_id', 'uuid', (col) =>
      col.notNull().references('addresses.id').onDelete('cascade')
    )
    .addColumn('chain', 'varchar(50)', (col) => col.notNull())
    .addColumn('network', 'varchar(50)', (col) => col.notNull())
    .addColumn('last_indexed_block', 'varchar(100)', (col) => col.notNull())
    .addColumn('last_indexed_tx_hash', 'varchar(255)')
    .addColumn('last_indexed_at', 'timestamptz', (col) => col.notNull())
    .addColumn('status', 'varchar(20)', (col) => col.notNull())
    .addColumn('error_message', 'text')
    .addColumn('retry_count', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  await db.schema
    .createIndex('uq_sync_state_address_chain')
    .on('sync_state')
    .columns(['address_id', 'chain', 'network'])
    .unique()
    .execute();

  await db.schema
    .createIndex('idx_sync_state_status')
    .on('sync_state')
    .column('status')
    .execute();

  // 9. Add lowercase constraint to existing addresses table
  await sql`ALTER TABLE addresses ADD CONSTRAINT chk_address_lowercase CHECK (address = LOWER(address))`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Drop constraint from addresses
  await sql`ALTER TABLE addresses DROP CONSTRAINT IF EXISTS chk_address_lowercase`.execute(db);

  // Drop tables in reverse order (respecting FKs)
  await db.schema.dropTable('sync_state').ifExists().execute();
  await db.schema.dropTable('address_transactions').ifExists().execute();
  await db.schema.dropTable('token_holdings').ifExists().execute();
  await db.schema.dropTable('token_transfers').ifExists().execute();
  await db.schema.dropTable('native_transfers').ifExists().execute();
  await db.schema.dropTable('transactions').ifExists().execute();
  await db.schema.dropTable('token_prices').ifExists().execute();
  await db.schema.dropTable('tokens').ifExists().execute();
}
```

**Step 2: Commit**

```bash
git add services/core/src/lib/database/migrations/2025_01_03_full_schema_migration.ts
git commit -m "feat(db): add migration for full PostgreSQL schema

Creates tokens, token_prices, transactions, native_transfers,
token_transfers, token_holdings, address_transactions, sync_state
tables with indexes and FK constraints."
```

---

### Task 3: Create Token Repository

**Files:**
- Create: `services/core/src/repositories/token.repository.ts`
- Modify: `services/core/src/repositories/types.ts`

**Step 1: Add TokenRepository interface to types.ts**

```typescript
// Add to repositories/types.ts

export interface Token {
  id: string;
  chain: string;
  network: string;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoUri: string | null;
  coingeckoId: string | null;
  isVerified: boolean;
  isSpam: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTokenInput {
  chain: string;
  network: string;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoUri?: string | null;
  coingeckoId?: string | null;
  isVerified?: boolean;
  isSpam?: boolean;
}

export interface TokenRepository {
  findById(id: string): Promise<Token | null>;
  findByChainAndAddress(
    chain: string,
    network: string,
    address: string
  ): Promise<Token | null>;
  findVerifiedByChain(chain: string, network: string): Promise<Token[]>;
  findByCoingeckoIds(coingeckoIds: string[]): Promise<Token[]>;
  upsert(input: CreateTokenInput): Promise<Token>;
  upsertMany(inputs: CreateTokenInput[]): Promise<Token[]>;
}
```

**Step 2: Create token.repository.ts**

```typescript
import { type Kysely } from 'kysely';
import { v4 as uuidv4 } from 'uuid';
import type { Database } from '../lib/database/types.js';
import type { Token, CreateTokenInput, TokenRepository } from './types.js';

function mapToToken(row: Database['tokens']): Token {
  return {
    id: row.id,
    chain: row.chain,
    network: row.network,
    address: row.address,
    name: row.name,
    symbol: row.symbol,
    decimals: row.decimals,
    logoUri: row.logo_uri,
    coingeckoId: row.coingecko_id,
    isVerified: row.is_verified,
    isSpam: row.is_spam,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

export class PostgresTokenRepository implements TokenRepository {
  constructor(private db: Kysely<Database>) {}

  async findById(id: string): Promise<Token | null> {
    const row = await this.db
      .selectFrom('tokens')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return row ? mapToToken(row) : null;
  }

  async findByChainAndAddress(
    chain: string,
    network: string,
    address: string
  ): Promise<Token | null> {
    const row = await this.db
      .selectFrom('tokens')
      .selectAll()
      .where('chain', '=', chain)
      .where('network', '=', network)
      .where('address', '=', address.toLowerCase())
      .executeTakeFirst();

    return row ? mapToToken(row) : null;
  }

  async findVerifiedByChain(chain: string, network: string): Promise<Token[]> {
    const rows = await this.db
      .selectFrom('tokens')
      .selectAll()
      .where('chain', '=', chain)
      .where('network', '=', network)
      .where('is_verified', '=', true)
      .where('is_spam', '=', false)
      .execute();

    return rows.map(mapToToken);
  }

  async findByCoingeckoIds(coingeckoIds: string[]): Promise<Token[]> {
    if (coingeckoIds.length === 0) return [];

    const rows = await this.db
      .selectFrom('tokens')
      .selectAll()
      .where('coingecko_id', 'in', coingeckoIds)
      .execute();

    return rows.map(mapToToken);
  }

  async upsert(input: CreateTokenInput): Promise<Token> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const row = await this.db
      .insertInto('tokens')
      .values({
        id,
        chain: input.chain,
        network: input.network,
        address: input.address.toLowerCase(),
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
        oc.columns(['chain', 'network', 'address']).doUpdateSet({
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

    return mapToToken(row);
  }

  async upsertMany(inputs: CreateTokenInput[]): Promise<Token[]> {
    if (inputs.length === 0) return [];

    const results: Token[] = [];
    for (const input of inputs) {
      const token = await this.upsert(input);
      results.push(token);
    }
    return results;
  }
}
```

**Step 3: Commit**

```bash
git add services/core/src/repositories/token.repository.ts services/core/src/repositories/types.ts
git commit -m "feat(repo): add TokenRepository for token metadata

Implements CRUD operations for token metadata table with
upsert support and chain/coingecko lookups."
```

---

### Task 4: Create Token Price Repository

**Files:**
- Create: `services/core/src/repositories/token-price.repository.ts`
- Modify: `services/core/src/repositories/types.ts`

**Step 1: Add TokenPriceRepository interface to types.ts**

```typescript
// Add to repositories/types.ts

export interface TokenPrice {
  id: string;
  coingeckoId: string;
  currency: string;
  price: string;
  priceChange24h: string | null;
  marketCap: string | null;
  fetchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTokenPriceInput {
  coingeckoId: string;
  currency: string;
  price: string;
  priceChange24h?: string | null;
  marketCap?: string | null;
}

export interface TokenPriceRepository {
  findByCoingeckoId(coingeckoId: string, currency: string): Promise<TokenPrice | null>;
  findByCoingeckoIds(coingeckoIds: string[], currency: string): Promise<TokenPrice[]>;
  findFreshPrices(coingeckoIds: string[], currency: string, maxAgeSeconds: number): Promise<TokenPrice[]>;
  upsertMany(inputs: CreateTokenPriceInput[]): Promise<void>;
}
```

**Step 2: Create token-price.repository.ts**

```typescript
import { type Kysely, sql } from 'kysely';
import { v4 as uuidv4 } from 'uuid';
import type { Database } from '../lib/database/types.js';
import type { TokenPrice, CreateTokenPriceInput, TokenPriceRepository } from './types.js';

function mapToTokenPrice(row: Database['token_prices']): TokenPrice {
  return {
    id: row.id,
    coingeckoId: row.coingecko_id,
    currency: row.currency,
    price: row.price,
    priceChange24h: row.price_change_24h,
    marketCap: row.market_cap,
    fetchedAt: row.fetched_at as Date,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

export class PostgresTokenPriceRepository implements TokenPriceRepository {
  constructor(private db: Kysely<Database>) {}

  async findByCoingeckoId(
    coingeckoId: string,
    currency: string
  ): Promise<TokenPrice | null> {
    const row = await this.db
      .selectFrom('token_prices')
      .selectAll()
      .where('coingecko_id', '=', coingeckoId)
      .where('currency', '=', currency)
      .executeTakeFirst();

    return row ? mapToTokenPrice(row) : null;
  }

  async findByCoingeckoIds(
    coingeckoIds: string[],
    currency: string
  ): Promise<TokenPrice[]> {
    if (coingeckoIds.length === 0) return [];

    const rows = await this.db
      .selectFrom('token_prices')
      .selectAll()
      .where('coingecko_id', 'in', coingeckoIds)
      .where('currency', '=', currency)
      .execute();

    return rows.map(mapToTokenPrice);
  }

  async findFreshPrices(
    coingeckoIds: string[],
    currency: string,
    maxAgeSeconds: number
  ): Promise<TokenPrice[]> {
    if (coingeckoIds.length === 0) return [];

    const cutoff = new Date(Date.now() - maxAgeSeconds * 1000).toISOString();

    const rows = await this.db
      .selectFrom('token_prices')
      .selectAll()
      .where('coingecko_id', 'in', coingeckoIds)
      .where('currency', '=', currency)
      .where('fetched_at', '>', cutoff)
      .execute();

    return rows.map(mapToTokenPrice);
  }

  async upsertMany(inputs: CreateTokenPriceInput[]): Promise<void> {
    if (inputs.length === 0) return;

    const now = new Date().toISOString();

    for (const input of inputs) {
      await this.db
        .insertInto('token_prices')
        .values({
          id: uuidv4(),
          coingecko_id: input.coingeckoId,
          currency: input.currency,
          price: input.price,
          price_change_24h: input.priceChange24h ?? null,
          market_cap: input.marketCap ?? null,
          fetched_at: now,
          created_at: now,
          updated_at: now,
        })
        .onConflict((oc) =>
          oc.columns(['coingecko_id', 'currency']).doUpdateSet({
            price: input.price,
            price_change_24h: input.priceChange24h ?? null,
            market_cap: input.marketCap ?? null,
            fetched_at: now,
            updated_at: now,
          })
        )
        .execute();
    }
  }
}
```

**Step 3: Commit**

```bash
git add services/core/src/repositories/token-price.repository.ts services/core/src/repositories/types.ts
git commit -m "feat(repo): add TokenPriceRepository for price caching

Implements price cache with freshness checking for CoinGecko
price data with configurable TTL."
```

---

### Task 5: Create Transaction Repository

**Files:**
- Create: `services/core/src/repositories/transaction.repository.ts`
- Modify: `services/core/src/repositories/types.ts`

**Step 1: Add TransactionRepository interface to types.ts**

```typescript
// Add to repositories/types.ts

export interface Transaction {
  id: string;
  chain: string;
  network: string;
  txHash: string;
  blockNumber: string;
  blockHash: string;
  txIndex: number | null;
  fromAddress: string;
  toAddress: string | null;
  value: string;
  fee: string | null;
  status: 'success' | 'failed' | 'pending';
  timestamp: Date;
  classificationType: string | null;
  classificationLabel: string | null;
  protocolName: string | null;
  details: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionRepository {
  findById(id: string): Promise<Transaction | null>;
  findByTxHash(chain: string, network: string, txHash: string): Promise<Transaction | null>;
  findByAddress(
    address: string,
    options?: { chain?: string; network?: string; limit?: number; offset?: number }
  ): Promise<{ data: Transaction[]; total: number }>;
}
```

**Step 2: Create transaction.repository.ts**

```typescript
import { type Kysely, sql } from 'kysely';
import type { Database } from '../lib/database/types.js';
import type { Transaction, TransactionRepository } from './types.js';

function mapToTransaction(row: Database['transactions']): Transaction {
  return {
    id: row.id,
    chain: row.chain,
    network: row.network,
    txHash: row.tx_hash,
    blockNumber: row.block_number,
    blockHash: row.block_hash,
    txIndex: row.tx_index,
    fromAddress: row.from_address,
    toAddress: row.to_address,
    value: row.value,
    fee: row.fee,
    status: row.status as 'success' | 'failed' | 'pending',
    timestamp: row.timestamp as Date,
    classificationType: row.classification_type,
    classificationLabel: row.classification_label,
    protocolName: row.protocol_name,
    details: row.details as Record<string, unknown> | null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

export class PostgresTransactionRepository implements TransactionRepository {
  constructor(private db: Kysely<Database>) {}

  async findById(id: string): Promise<Transaction | null> {
    const row = await this.db
      .selectFrom('transactions')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return row ? mapToTransaction(row) : null;
  }

  async findByTxHash(
    chain: string,
    network: string,
    txHash: string
  ): Promise<Transaction | null> {
    const row = await this.db
      .selectFrom('transactions')
      .selectAll()
      .where('chain', '=', chain)
      .where('network', '=', network)
      .where('tx_hash', '=', txHash.toLowerCase())
      .executeTakeFirst();

    return row ? mapToTransaction(row) : null;
  }

  async findByAddress(
    address: string,
    options: { chain?: string; network?: string; limit?: number; offset?: number } = {}
  ): Promise<{ data: Transaction[]; total: number }> {
    const { chain, network, limit = 50, offset = 0 } = options;
    const normalizedAddress = address.toLowerCase();

    let query = this.db
      .selectFrom('address_transactions as at')
      .innerJoin('transactions as t', 't.id', 'at.tx_id')
      .selectAll('t')
      .where('at.address', '=', normalizedAddress);

    if (chain) {
      query = query.where('at.chain', '=', chain);
    }
    if (network) {
      query = query.where('at.network', '=', network);
    }

    const [rows, countResult] = await Promise.all([
      query
        .orderBy('at.timestamp', 'desc')
        .limit(limit)
        .offset(offset)
        .execute(),
      this.db
        .selectFrom('address_transactions')
        .select((eb) => eb.fn.countAll().as('count'))
        .where('address', '=', normalizedAddress)
        .executeTakeFirst(),
    ]);

    return {
      data: rows.map(mapToTransaction),
      total: Number(countResult?.count ?? 0),
    };
  }
}
```

**Step 3: Commit**

```bash
git add services/core/src/repositories/transaction.repository.ts services/core/src/repositories/types.ts
git commit -m "feat(repo): add TransactionRepository for PostgreSQL reads

Implements transaction lookups by ID, hash, and address with
pagination support using address_transactions join table."
```

---

### Task 6: Create Token Holding Repository

**Files:**
- Create: `services/core/src/repositories/token-holding.repository.ts`
- Modify: `services/core/src/repositories/types.ts`

**Step 1: Add TokenHoldingRepository interface to types.ts**

```typescript
// Add to repositories/types.ts

export interface TokenHolding {
  id: string;
  addressId: string;
  chain: string;
  network: string;
  tokenAddress: string | null;
  isNative: boolean;
  balance: string;
  decimals: number;
  name: string;
  symbol: string;
  visibility: 'visible' | 'hidden';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTokenHoldingInput {
  addressId: string;
  chain: string;
  network: string;
  tokenAddress: string | null;
  isNative: boolean;
  balance: string;
  decimals: number;
  name: string;
  symbol: string;
}

export interface TokenHoldingRepository {
  findByAddressId(addressId: string): Promise<TokenHolding[]>;
  findVisibleByAddressId(addressId: string): Promise<TokenHolding[]>;
  upsert(input: CreateTokenHoldingInput): Promise<TokenHolding>;
  updateVisibility(id: string, visibility: 'visible' | 'hidden'): Promise<TokenHolding>;
}
```

**Step 2: Create token-holding.repository.ts**

```typescript
import { type Kysely } from 'kysely';
import { v4 as uuidv4 } from 'uuid';
import type { Database } from '../lib/database/types.js';
import type { TokenHolding, CreateTokenHoldingInput, TokenHoldingRepository } from './types.js';

function mapToTokenHolding(row: Database['token_holdings']): TokenHolding {
  return {
    id: row.id,
    addressId: row.address_id,
    chain: row.chain,
    network: row.network,
    tokenAddress: row.token_address,
    isNative: row.is_native,
    balance: row.balance,
    decimals: row.decimals,
    name: row.name,
    symbol: row.symbol,
    visibility: row.visibility as 'visible' | 'hidden',
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

export class PostgresTokenHoldingRepository implements TokenHoldingRepository {
  constructor(private db: Kysely<Database>) {}

  async findByAddressId(addressId: string): Promise<TokenHolding[]> {
    const rows = await this.db
      .selectFrom('token_holdings')
      .selectAll()
      .where('address_id', '=', addressId)
      .orderBy('is_native', 'desc')
      .orderBy('symbol', 'asc')
      .execute();

    return rows.map(mapToTokenHolding);
  }

  async findVisibleByAddressId(addressId: string): Promise<TokenHolding[]> {
    const rows = await this.db
      .selectFrom('token_holdings')
      .selectAll()
      .where('address_id', '=', addressId)
      .where('visibility', '=', 'visible')
      .orderBy('is_native', 'desc')
      .orderBy('symbol', 'asc')
      .execute();

    return rows.map(mapToTokenHolding);
  }

  async upsert(input: CreateTokenHoldingInput): Promise<TokenHolding> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const row = await this.db
      .insertInto('token_holdings')
      .values({
        id,
        address_id: input.addressId,
        chain: input.chain,
        network: input.network,
        token_address: input.tokenAddress?.toLowerCase() ?? null,
        is_native: input.isNative,
        balance: input.balance,
        decimals: input.decimals,
        name: input.name,
        symbol: input.symbol,
        visibility: 'visible',
        created_at: now,
        updated_at: now,
      })
      .onConflict((oc) =>
        oc.columns(['address_id', 'chain', 'network', 'token_address']).doUpdateSet({
          balance: input.balance,
          decimals: input.decimals,
          name: input.name,
          symbol: input.symbol,
          updated_at: now,
        })
      )
      .returningAll()
      .executeTakeFirstOrThrow();

    return mapToTokenHolding(row);
  }

  async updateVisibility(
    id: string,
    visibility: 'visible' | 'hidden'
  ): Promise<TokenHolding> {
    const row = await this.db
      .updateTable('token_holdings')
      .set({
        visibility,
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return mapToTokenHolding(row);
  }
}
```

**Step 3: Commit**

```bash
git add services/core/src/repositories/token-holding.repository.ts services/core/src/repositories/types.ts
git commit -m "feat(repo): add TokenHoldingRepository for balance tracking

Implements token holding CRUD with native currency support
and visibility toggling for spam filtering."
```

---

## Phase 2: Balance Service

### Task 7: Create RPC Client Interface

**Files:**
- Create: `services/core/src/lib/rpc/types.ts`
- Create: `services/core/src/lib/rpc/client.ts`

**Step 1: Create types.ts**

```typescript
export interface RpcClient {
  call<T>(method: string, params: unknown[]): Promise<T>;
  getChain(): string;
  getNetwork(): string;
}

export interface RpcClientConfig {
  chain: string;
  network: string;
  url: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export class RpcError extends Error {
  constructor(
    message: string,
    public readonly chain: string,
    public readonly network: string,
    public readonly method: string,
    public readonly code?: number
  ) {
    super(message);
    this.name = 'RpcError';
  }
}
```

**Step 2: Create client.ts**

```typescript
import type { RpcClient, RpcClientConfig } from './types.js';
import { RpcError } from './types.js';

export class JsonRpcClient implements RpcClient {
  private requestId = 0;

  constructor(private config: RpcClientConfig) {}

  getChain(): string {
    return this.config.chain;
  }

  getNetwork(): string {
    return this.config.network;
  }

  async call<T>(method: string, params: unknown[]): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs ?? 5000
    );

    try {
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: ++this.requestId,
          method,
          params,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new RpcError(
          `HTTP error: ${response.status}`,
          this.config.chain,
          this.config.network,
          method
        );
      }

      const json = await response.json();

      if (json.error) {
        throw new RpcError(
          json.error.message || 'RPC error',
          this.config.chain,
          this.config.network,
          method,
          json.error.code
        );
      }

      return json.result as T;
    } catch (error) {
      if (error instanceof RpcError) throw error;

      if (error instanceof Error && error.name === 'AbortError') {
        throw new RpcError(
          'Request timeout',
          this.config.chain,
          this.config.network,
          method
        );
      }

      throw new RpcError(
        error instanceof Error ? error.message : 'Unknown error',
        this.config.chain,
        this.config.network,
        method
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
```

**Step 3: Create index.ts**

Create `services/core/src/lib/rpc/index.ts`:

```typescript
export * from './types.js';
export * from './client.js';
```

**Step 4: Commit**

```bash
git add services/core/src/lib/rpc/
git commit -m "feat(rpc): add JSON-RPC client with timeout handling

Creates reusable RPC client for chain communication with
configurable timeout and proper error handling."
```

---

### Task 8: Create EVM Balance Fetcher

**Files:**
- Create: `services/core/src/services/balances/fetchers/types.ts`
- Create: `services/core/src/services/balances/fetchers/evm.ts`

**Step 1: Create types.ts**

```typescript
export interface RawBalance {
  address: string;
  tokenAddress: string | null; // null = native
  isNative: boolean;
  balance: string; // raw wei/lamports/satoshis
  decimals: number;
  symbol: string;
  name: string;
}

export interface BalanceFetcher {
  getChain(): string;
  getNetwork(): string;
  getNativeBalance(address: string): Promise<RawBalance>;
  getTokenBalances(
    address: string,
    tokens: Array<{ address: string; decimals: number; symbol: string; name: string }>
  ): Promise<RawBalance[]>;
}
```

**Step 2: Create evm.ts**

```typescript
import type { RpcClient } from '../../../lib/rpc/types.js';
import type { BalanceFetcher, RawBalance } from './types.js';

// ERC-20 balanceOf function selector
const BALANCE_OF_SELECTOR = '0x70a08231';

// Multicall3 address (same on most EVM chains)
const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';

// Native currency symbols per chain
const NATIVE_SYMBOLS: Record<string, { symbol: string; name: string; decimals: number }> = {
  ethereum: { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  polygon: { symbol: 'POL', name: 'Polygon', decimals: 18 },
  arbitrum: { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  optimism: { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  base: { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  avalanche: { symbol: 'AVAX', name: 'Avalanche', decimals: 18 },
  bsc: { symbol: 'BNB', name: 'BNB', decimals: 18 },
};

export class EVMBalanceFetcher implements BalanceFetcher {
  constructor(
    private rpc: RpcClient,
    private chain: string,
    private network: string
  ) {}

  getChain(): string {
    return this.chain;
  }

  getNetwork(): string {
    return this.network;
  }

  async getNativeBalance(address: string): Promise<RawBalance> {
    const balance = await this.rpc.call<string>('eth_getBalance', [
      address,
      'latest',
    ]);

    const nativeInfo = NATIVE_SYMBOLS[this.chain] ?? {
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
    };

    return {
      address,
      tokenAddress: null,
      isNative: true,
      balance: BigInt(balance).toString(),
      decimals: nativeInfo.decimals,
      symbol: nativeInfo.symbol,
      name: nativeInfo.name,
    };
  }

  async getTokenBalances(
    address: string,
    tokens: Array<{ address: string; decimals: number; symbol: string; name: string }>
  ): Promise<RawBalance[]> {
    if (tokens.length === 0) return [];

    // Encode balanceOf calls
    const paddedAddress = address.toLowerCase().slice(2).padStart(64, '0');
    const calls = tokens.map((token) => ({
      target: token.address.toLowerCase(),
      callData: BALANCE_OF_SELECTOR + paddedAddress,
    }));

    try {
      // Try multicall first
      const results = await this.multicall(calls);
      return tokens.map((token, i) => ({
        address,
        tokenAddress: token.address.toLowerCase(),
        isNative: false,
        balance: results[i] ?? '0',
        decimals: token.decimals,
        symbol: token.symbol,
        name: token.name,
      }));
    } catch {
      // Fallback to individual calls
      return this.getTokenBalancesIndividual(address, tokens);
    }
  }

  private async multicall(
    calls: Array<{ target: string; callData: string }>
  ): Promise<string[]> {
    // Encode aggregate3 call
    const encoded = this.encodeAggregate3(calls);

    const result = await this.rpc.call<string>('eth_call', [
      { to: MULTICALL3_ADDRESS, data: encoded },
      'latest',
    ]);

    return this.decodeAggregate3Result(result, calls.length);
  }

  private encodeAggregate3(
    calls: Array<{ target: string; callData: string }>
  ): string {
    // aggregate3((address,bool,bytes)[])
    // Function selector: 0x82ad56cb
    const selector = '0x82ad56cb';

    // Each call: (target, allowFailure=true, callData)
    const encodedCalls = calls.map((call) => {
      const target = call.target.slice(2).padStart(64, '0');
      const allowFailure = '0000000000000000000000000000000000000000000000000000000000000001';
      return { target, allowFailure, callData: call.callData };
    });

    // This is a simplified encoding - in production use ethers.js
    // For now, fall back to individual calls
    throw new Error('Multicall encoding not implemented - using fallback');
  }

  private decodeAggregate3Result(result: string, count: number): string[] {
    // Decode (bool success, bytes returnData)[]
    // For now, return zeros - real implementation would parse ABI
    return new Array(count).fill('0');
  }

  private async getTokenBalancesIndividual(
    address: string,
    tokens: Array<{ address: string; decimals: number; symbol: string; name: string }>
  ): Promise<RawBalance[]> {
    const paddedAddress = address.toLowerCase().slice(2).padStart(64, '0');

    const results = await Promise.allSettled(
      tokens.map(async (token) => {
        const result = await this.rpc.call<string>('eth_call', [
          {
            to: token.address.toLowerCase(),
            data: BALANCE_OF_SELECTOR + paddedAddress,
          },
          'latest',
        ]);

        return {
          address,
          tokenAddress: token.address.toLowerCase(),
          isNative: false,
          balance: result === '0x' ? '0' : BigInt(result).toString(),
          decimals: token.decimals,
          symbol: token.symbol,
          name: token.name,
        };
      })
    );

    return results
      .filter((r): r is PromiseFulfilledResult<RawBalance> => r.status === 'fulfilled')
      .map((r) => r.value);
  }
}
```

**Step 3: Create index.ts**

Create `services/core/src/services/balances/fetchers/index.ts`:

```typescript
export * from './types.js';
export * from './evm.js';
```

**Step 4: Commit**

```bash
git add services/core/src/services/balances/fetchers/
git commit -m "feat(balance): add EVM balance fetcher

Implements native and ERC-20 balance fetching via RPC
with fallback from multicall to individual calls."
```

---

### Task 9: Create Pricing Service

**Files:**
- Create: `services/core/src/services/balances/pricing-service.ts`

**Step 1: Create pricing-service.ts**

```typescript
import type { TokenPriceRepository, CreateTokenPriceInput } from '../../repositories/types.js';

export interface TokenPriceInfo {
  coingeckoId: string;
  price: number;
  priceChange24h: number | null;
  marketCap: number | null;
  isStale: boolean;
}

export interface PricingServiceConfig {
  apiKey?: string;
  baseUrl?: string;
  cacheTtlSeconds?: number;
}

export class PricingService {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly cacheTtlSeconds: number;

  constructor(
    private readonly priceRepository: TokenPriceRepository,
    config: PricingServiceConfig = {}
  ) {
    this.baseUrl = config.baseUrl ?? 'https://api.coingecko.com/api/v3';
    this.apiKey = config.apiKey;
    this.cacheTtlSeconds = config.cacheTtlSeconds ?? 60;
  }

  async getPrices(
    coingeckoIds: string[],
    currency: string = 'usd'
  ): Promise<Map<string, TokenPriceInfo>> {
    if (coingeckoIds.length === 0) {
      return new Map();
    }

    const uniqueIds = [...new Set(coingeckoIds)];
    const result = new Map<string, TokenPriceInfo>();

    // Check cache first
    const cachedPrices = await this.priceRepository.findFreshPrices(
      uniqueIds,
      currency,
      this.cacheTtlSeconds
    );

    const cachedIds = new Set<string>();
    for (const cached of cachedPrices) {
      cachedIds.add(cached.coingeckoId);
      result.set(cached.coingeckoId, {
        coingeckoId: cached.coingeckoId,
        price: parseFloat(cached.price),
        priceChange24h: cached.priceChange24h ? parseFloat(cached.priceChange24h) : null,
        marketCap: cached.marketCap ? parseFloat(cached.marketCap) : null,
        isStale: false,
      });
    }

    // Fetch missing prices from CoinGecko
    const missingIds = uniqueIds.filter((id) => !cachedIds.has(id));
    if (missingIds.length > 0) {
      try {
        const freshPrices = await this.fetchFromCoinGecko(missingIds, currency);

        // Update cache
        const cacheInputs: CreateTokenPriceInput[] = [];
        for (const [id, price] of freshPrices) {
          result.set(id, { ...price, isStale: false });
          cacheInputs.push({
            coingeckoId: id,
            currency,
            price: price.price.toString(),
            priceChange24h: price.priceChange24h?.toString() ?? null,
            marketCap: price.marketCap?.toString() ?? null,
          });
        }

        if (cacheInputs.length > 0) {
          await this.priceRepository.upsertMany(cacheInputs);
        }
      } catch (error) {
        // On error, try to get stale prices
        const stalePrices = await this.priceRepository.findByCoingeckoIds(
          missingIds,
          currency
        );

        for (const stale of stalePrices) {
          result.set(stale.coingeckoId, {
            coingeckoId: stale.coingeckoId,
            price: parseFloat(stale.price),
            priceChange24h: stale.priceChange24h ? parseFloat(stale.priceChange24h) : null,
            marketCap: stale.marketCap ? parseFloat(stale.marketCap) : null,
            isStale: true,
          });
        }
      }
    }

    return result;
  }

  private async fetchFromCoinGecko(
    ids: string[],
    currency: string
  ): Promise<Map<string, Omit<TokenPriceInfo, 'isStale'>>> {
    const result = new Map<string, Omit<TokenPriceInfo, 'isStale'>>();

    // CoinGecko limits to 250 IDs per request
    const batches = this.chunk(ids, 250);

    for (const batch of batches) {
      const url = new URL(`${this.baseUrl}/simple/price`);
      url.searchParams.set('ids', batch.join(','));
      url.searchParams.set('vs_currencies', currency);
      url.searchParams.set('include_24hr_change', 'true');
      url.searchParams.set('include_market_cap', 'true');

      const headers: Record<string, string> = {
        Accept: 'application/json',
      };

      if (this.apiKey) {
        headers['x-cg-demo-api-key'] = this.apiKey;
      }

      const response = await fetch(url.toString(), { headers });

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();

      for (const id of batch) {
        const priceData = data[id];
        if (priceData) {
          result.set(id, {
            coingeckoId: id,
            price: priceData[currency] ?? 0,
            priceChange24h: priceData[`${currency}_24h_change`] ?? null,
            marketCap: priceData[`${currency}_market_cap`] ?? null,
          });
        }
      }
    }

    return result;
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}
```

**Step 2: Commit**

```bash
git add services/core/src/services/balances/pricing-service.ts
git commit -m "feat(balance): add PricingService for CoinGecko integration

Implements price fetching with PostgreSQL cache, configurable
TTL, and graceful degradation to stale prices on API failure."
```

---

### Task 10: Create Balance Service

**Files:**
- Create: `services/core/src/services/balances/balance-service.ts`

**Step 1: Create balance-service.ts**

```typescript
import type { AddressRepository, TokenHoldingRepository, TokenRepository } from '../../repositories/types.js';
import type { BalanceFetcher, RawBalance } from './fetchers/types.js';
import type { PricingService, TokenPriceInfo } from './pricing-service.js';

export interface EnrichedBalance {
  tokenAddress: string | null;
  isNative: boolean;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  formattedBalance: string;
  usdPrice: number | null;
  usdValue: number | null;
  priceChange24h: number | null;
  isPriceStale: boolean;
  logoUri: string | null;
  coingeckoId: string | null;
}

export interface BalanceServiceConfig {
  currency?: string;
}

export class BalanceService {
  private readonly currency: string;

  constructor(
    private readonly addressRepository: AddressRepository,
    private readonly tokenRepository: TokenRepository,
    private readonly tokenHoldingRepository: TokenHoldingRepository,
    private readonly pricingService: PricingService,
    private readonly fetcherFactory: (chain: string, network: string) => BalanceFetcher | null,
    config: BalanceServiceConfig = {}
  ) {
    this.currency = config.currency ?? 'usd';
  }

  async getBalances(addressId: string): Promise<EnrichedBalance[]> {
    // Get address details
    const address = await this.addressRepository.findById(addressId);
    if (!address) {
      throw new Error(`Address not found: ${addressId}`);
    }

    // Get balance fetcher for this chain
    const fetcher = this.fetcherFactory(address.chain, 'mainnet');
    if (!fetcher) {
      throw new Error(`No balance fetcher for chain: ${address.chain}`);
    }

    // Get known token holdings (for token list hints)
    const holdings = await this.tokenHoldingRepository.findVisibleByAddressId(addressId);

    // Get verified tokens for this chain
    const verifiedTokens = await this.tokenRepository.findVerifiedByChain(
      address.chain,
      'mainnet'
    );

    // Combine known holdings with verified tokens
    const tokenMap = new Map<string, { address: string; decimals: number; symbol: string; name: string; coingeckoId: string | null; logoUri: string | null }>();

    for (const holding of holdings) {
      if (holding.tokenAddress) {
        tokenMap.set(holding.tokenAddress, {
          address: holding.tokenAddress,
          decimals: holding.decimals,
          symbol: holding.symbol,
          name: holding.name,
          coingeckoId: null,
          logoUri: null,
        });
      }
    }

    for (const token of verifiedTokens) {
      if (!tokenMap.has(token.address)) {
        tokenMap.set(token.address, {
          address: token.address,
          decimals: token.decimals,
          symbol: token.symbol,
          name: token.name,
          coingeckoId: token.coingeckoId,
          logoUri: token.logoUri,
        });
      } else {
        // Enrich existing with coingecko/logo info
        const existing = tokenMap.get(token.address)!;
        existing.coingeckoId = token.coingeckoId;
        existing.logoUri = token.logoUri;
      }
    }

    // Fetch balances from chain
    const [nativeBalance, tokenBalances] = await Promise.all([
      fetcher.getNativeBalance(address.address),
      fetcher.getTokenBalances(address.address, Array.from(tokenMap.values())),
    ]);

    const allBalances: RawBalance[] = [nativeBalance, ...tokenBalances];

    // Filter out zero balances
    const nonZeroBalances = allBalances.filter((b) => b.balance !== '0');

    // Collect coingecko IDs for pricing
    const coingeckoIds: string[] = [];
    const nativeCoingeckoId = this.getNativeCoingeckoId(address.chain);
    if (nativeCoingeckoId) {
      coingeckoIds.push(nativeCoingeckoId);
    }

    for (const balance of nonZeroBalances) {
      if (balance.tokenAddress) {
        const token = tokenMap.get(balance.tokenAddress);
        if (token?.coingeckoId) {
          coingeckoIds.push(token.coingeckoId);
        }
      }
    }

    // Fetch prices
    const prices = await this.pricingService.getPrices(coingeckoIds, this.currency);

    // Enrich balances with prices
    return nonZeroBalances.map((balance) => {
      const coingeckoId = balance.isNative
        ? nativeCoingeckoId
        : tokenMap.get(balance.tokenAddress!)?.coingeckoId;

      const price = coingeckoId ? prices.get(coingeckoId) : undefined;
      const token = balance.tokenAddress ? tokenMap.get(balance.tokenAddress) : undefined;

      const formattedBalance = this.formatBalance(balance.balance, balance.decimals);
      const usdValue = price ? parseFloat(formattedBalance) * price.price : null;

      return {
        tokenAddress: balance.tokenAddress,
        isNative: balance.isNative,
        symbol: balance.symbol,
        name: balance.name,
        decimals: balance.decimals,
        balance: balance.balance,
        formattedBalance,
        usdPrice: price?.price ?? null,
        usdValue,
        priceChange24h: price?.priceChange24h ?? null,
        isPriceStale: price?.isStale ?? true,
        logoUri: token?.logoUri ?? null,
        coingeckoId: coingeckoId ?? null,
      };
    });
  }

  private formatBalance(balance: string, decimals: number): string {
    const value = BigInt(balance);
    const divisor = BigInt(10 ** decimals);
    const integerPart = value / divisor;
    const fractionalPart = value % divisor;

    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    const trimmedFractional = fractionalStr.slice(0, 8).replace(/0+$/, '');

    if (trimmedFractional === '') {
      return integerPart.toString();
    }

    return `${integerPart}.${trimmedFractional}`;
  }

  private getNativeCoingeckoId(chain: string): string | null {
    const mapping: Record<string, string> = {
      ethereum: 'ethereum',
      polygon: 'polygon-ecosystem-token',
      arbitrum: 'ethereum',
      optimism: 'ethereum',
      base: 'ethereum',
      avalanche: 'avalanche-2',
      bsc: 'binancecoin',
      solana: 'solana',
      bitcoin: 'bitcoin',
      tron: 'tron',
      xrp: 'ripple',
    };

    return mapping[chain] ?? null;
  }
}
```

**Step 2: Commit**

```bash
git add services/core/src/services/balances/balance-service.ts
git commit -m "feat(balance): add BalanceService orchestrating chain + pricing

Combines RPC balance fetching with CoinGecko pricing, using
token_holdings and tokens tables for token discovery."
```

---

### Task 11: Create Transaction Service

**Files:**
- Create: `services/core/src/services/transactions/postgres-service.ts`

**Step 1: Create postgres-service.ts**

```typescript
import type { TransactionRepository, Transaction } from '../../repositories/types.js';

export interface TransactionListOptions {
  chain?: string;
  network?: string;
  limit?: number;
  offset?: number;
}

export interface TransactionListResult {
  transactions: Transaction[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export class PostgresTransactionService {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  async getTransaction(id: string): Promise<Transaction | null> {
    return this.transactionRepository.findById(id);
  }

  async getTransactionByHash(
    chain: string,
    network: string,
    txHash: string
  ): Promise<Transaction | null> {
    return this.transactionRepository.findByTxHash(chain, network, txHash);
  }

  async listByAddress(
    address: string,
    options: TransactionListOptions = {}
  ): Promise<TransactionListResult> {
    const limit = Math.min(options.limit ?? 50, 100);
    const offset = options.offset ?? 0;

    const result = await this.transactionRepository.findByAddress(address, {
      chain: options.chain,
      network: options.network,
      limit,
      offset,
    });

    return {
      transactions: result.data,
      pagination: {
        total: result.total,
        limit,
        offset,
        hasMore: offset + result.data.length < result.total,
      },
    };
  }
}
```

**Step 2: Commit**

```bash
git add services/core/src/services/transactions/postgres-service.ts
git commit -m "feat(tx): add PostgresTransactionService for transaction reads

Implements transaction listing from PostgreSQL with pagination,
replacing Noves API reads."
```

---

## Phase 3: Integration

### Task 12: Update Database Plugin

**Files:**
- Modify: `services/core/src/plugins/database.ts`

**Step 1: Read current database plugin**

Read `services/core/src/plugins/database.ts` to understand the current structure.

**Step 2: Add new repositories and services**

Add the new repositories and services to the plugin:

```typescript
// Add imports
import { PostgresTokenRepository } from '../repositories/token.repository.js';
import { PostgresTokenPriceRepository } from '../repositories/token-price.repository.js';
import { PostgresTransactionRepository } from '../repositories/transaction.repository.js';
import { PostgresTokenHoldingRepository } from '../repositories/token-holding.repository.js';
import { BalanceService } from '../services/balances/balance-service.js';
import { PricingService } from '../services/balances/pricing-service.js';
import { PostgresTransactionService } from '../services/transactions/postgres-service.js';
import { EVMBalanceFetcher } from '../services/balances/fetchers/evm.js';
import { JsonRpcClient } from '../lib/rpc/client.js';

// Update repositories interface
declare module 'fastify' {
  interface FastifyInstance {
    repositories: {
      addresses: AddressRepository;
      tokens: TokenRepository;
      tokenPrices: TokenPriceRepository;
      transactions: TransactionRepository;
      tokenHoldings: TokenHoldingRepository;
    };
    services: {
      addresses: PostgresAddressService;
      balances: BalanceService;
      transactions: PostgresTransactionService;
    };
  }
}

// In the plugin registration, add:
const tokenRepository = new PostgresTokenRepository(db);
const tokenPriceRepository = new PostgresTokenPriceRepository(db);
const transactionRepository = new PostgresTransactionRepository(db);
const tokenHoldingRepository = new PostgresTokenHoldingRepository(db);

const pricingService = new PricingService(tokenPriceRepository, {
  apiKey: config.apis.coingecko?.apiKey,
  cacheTtlSeconds: 60,
});

const fetcherFactory = (chain: string, network: string) => {
  const rpcUrl = config.apis.iofinnetNodes?.[chain];
  if (!rpcUrl) return null;

  const rpc = new JsonRpcClient({ chain, network, url: rpcUrl, timeoutMs: 5000 });

  // Return appropriate fetcher based on chain ecosystem
  // For now, only EVM
  return new EVMBalanceFetcher(rpc, chain, network);
};

const balanceService = new BalanceService(
  addressRepository,
  tokenRepository,
  tokenHoldingRepository,
  pricingService,
  fetcherFactory
);

const transactionService = new PostgresTransactionService(transactionRepository);

fastify.decorate('repositories', {
  addresses: addressRepository,
  tokens: tokenRepository,
  tokenPrices: tokenPriceRepository,
  transactions: transactionRepository,
  tokenHoldings: tokenHoldingRepository,
});

fastify.decorate('services', {
  addresses: addressService,
  balances: balanceService,
  transactions: transactionService,
});
```

**Step 3: Commit**

```bash
git add services/core/src/plugins/database.ts
git commit -m "feat(plugin): wire up new repositories and services

Adds token, tokenPrice, transaction, tokenHolding repositories
and balance, transaction services to Fastify."
```

---

### Task 13: Update Balance Route Handlers

**Files:**
- Modify: `services/core/src/routes/balances/handlers.ts`

**Step 1: Read current balance handlers**

Read `services/core/src/routes/balances/handlers.ts` to understand the current implementation.

**Step 2: Update to use new BalanceService**

Replace Noves calls with BalanceService calls:

```typescript
// Update getTokenBalances handler
export async function getTokenBalances(
  request: FastifyRequest<{ Params: { addressId: string } }>,
  reply: FastifyReply
) {
  const { addressId } = request.params;

  try {
    const balances = await request.server.services.balances.getBalances(addressId);

    return reply.send({
      balances: balances.map((b) => ({
        tokenAddress: b.tokenAddress,
        symbol: b.symbol,
        name: b.name,
        decimals: b.decimals,
        balance: b.formattedBalance,
        rawBalance: b.balance,
        usdPrice: b.usdPrice,
        usdValue: b.usdValue,
        priceChange24h: b.priceChange24h,
        logoUri: b.logoUri,
        isNative: b.isNative,
      })),
    });
  } catch (error) {
    request.log.error({ error, addressId }, 'Failed to fetch balances');
    return reply.status(500).send({ error: 'Failed to fetch balances' });
  }
}
```

**Step 3: Commit**

```bash
git add services/core/src/routes/balances/handlers.ts
git commit -m "feat(routes): update balance handlers to use BalanceService

Replaces Noves API calls with direct chain RPC fetching
via BalanceService."
```

---

### Task 14: Update Transaction Route Handlers

**Files:**
- Modify: `services/core/src/routes/transactions/handlers.ts`

**Step 1: Read current transaction handlers**

Read `services/core/src/routes/transactions/handlers.ts` to understand the current implementation.

**Step 2: Update to use PostgresTransactionService**

Replace Noves/DynamoDB calls with PostgresTransactionService:

```typescript
// Update listTransactions handler
export async function listTransactions(
  request: FastifyRequest<{
    Params: { addressId: string };
    Querystring: { limit?: number; offset?: number; chain?: string };
  }>,
  reply: FastifyReply
) {
  const { addressId } = request.params;
  const { limit, offset, chain } = request.query;

  // Get address to get the actual address string
  const address = await request.server.services.addresses.getAddressById(addressId);
  if (!address) {
    return reply.status(404).send({ error: 'Address not found' });
  }

  const result = await request.server.services.transactions.listByAddress(
    address.address,
    { limit, offset, chain }
  );

  return reply.send({
    transactions: result.transactions,
    pagination: result.pagination,
  });
}
```

**Step 3: Remove create/sync transaction handlers**

Remove or disable:
- `createTransaction` - moved to sync service
- `syncTransaction` - moved to sync service

**Step 4: Commit**

```bash
git add services/core/src/routes/transactions/handlers.ts
git commit -m "feat(routes): update transaction handlers to use PostgreSQL

Replaces Noves/DynamoDB reads with PostgresTransactionService.
Removes create/sync endpoints (moved to sync service)."
```

---

## Phase 4: Cleanup

### Task 15: Remove DynamoDB Address Code

**Files:**
- Delete: `services/core/src/services/addresses/ddb.ts`
- Delete: `services/core/src/services/addresses/keys.ts`
- Delete: `services/core/src/services/addresses/formatter.ts`
- Modify: `services/core/src/services/addresses/index.ts` (remove DynamoDB exports)

**Step 1: Delete DynamoDB address files**

```bash
rm services/core/src/services/addresses/ddb.ts
rm services/core/src/services/addresses/keys.ts
rm services/core/src/services/addresses/formatter.ts
```

**Step 2: Update index.ts to only export PostgreSQL service**

**Step 3: Commit**

```bash
git add -A services/core/src/services/addresses/
git commit -m "refactor(addresses): remove DynamoDB address code

Removes ddb.ts, keys.ts, formatter.ts. Addresses now
exclusively use PostgreSQL via postgres-service.ts."
```

---

### Task 16: Remove Noves Integration

**Files:**
- Delete: `services/core/src/services/transactions/noves.ts`
- Delete: `services/core/src/services/transactions/ddb.ts`
- Delete: `services/core/src/services/transactions/keys.ts`
- Delete: `services/core/src/services/balances/noves.ts`
- Delete: `services/core/src/services/balances/metadata/ddb.ts`
- Modify: `services/core/src/lib/clients.ts` (remove Noves client exports)

**Step 1: Delete Noves and DynamoDB transaction files**

```bash
rm services/core/src/services/transactions/noves.ts
rm services/core/src/services/transactions/ddb.ts
rm services/core/src/services/transactions/keys.ts
rm services/core/src/services/balances/noves.ts
rm -rf services/core/src/services/balances/metadata/
```

**Step 2: Update clients.ts to remove Noves exports**

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: remove Noves and DynamoDB transaction/balance code

Removes noves.ts, ddb.ts from transactions and balances.
These features now use PostgreSQL + direct chain RPC."
```

---

### Task 17: Update Configuration

**Files:**
- Modify: `services/core/src/lib/config.ts`

**Step 1: Read current config**

Read `services/core/src/lib/config.ts`.

**Step 2: Remove DynamoDB and Noves config**

Remove:
```typescript
database: {
  addressesTable: ...
  transactionsTable: ...
  tokenMetadataTable: ...
}

apis: {
  noves: ...
}
```

Keep:
```typescript
database: {
  postgres: { ... }
}

apis: {
  coingecko: { ... }
  iofinnetNodes: { ... }
}
```

**Step 3: Commit**

```bash
git add services/core/src/lib/config.ts
git commit -m "refactor(config): remove DynamoDB and Noves configuration

Removes addressesTable, transactionsTable, tokenMetadataTable,
and noves API config. Keeps postgres and coingecko config."
```

---

### Task 18: Update Package Dependencies

**Files:**
- Modify: `services/core/package.json`

**Step 1: Remove unused dependencies**

Remove from dependencies:
- `@aws-sdk/client-dynamodb`
- `@aws-sdk/lib-dynamodb`
- `@noves/noves-sdk`

**Step 2: Commit**

```bash
git add services/core/package.json
git commit -m "chore(deps): remove DynamoDB and Noves SDK dependencies

No longer needed after migration to PostgreSQL + direct RPC."
```

---

### Task 19: Run npm install and verify build

**Step 1: Install updated dependencies**

```bash
cd services/core && npm install
```

**Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

**Step 3: Fix any type errors**

**Step 4: Commit fixes if any**

```bash
git add -A
git commit -m "fix: resolve type errors after dependency cleanup"
```

---

## Phase 5: Testing

### Task 20: Add Token Repository Unit Tests

**Files:**
- Create: `services/core/tests/unit/repositories/token.repository.test.ts`

**Step 1: Create test file**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresTokenRepository } from '../../../src/repositories/token.repository.js';

describe('PostgresTokenRepository', () => {
  // Mock Kysely database
  const mockDb = {
    selectFrom: vi.fn().mockReturnThis(),
    selectAll: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    executeTakeFirst: vi.fn(),
    execute: vi.fn(),
    insertInto: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflict: vi.fn().mockReturnThis(),
    returningAll: vi.fn().mockReturnThis(),
    executeTakeFirstOrThrow: vi.fn(),
  };

  let repository: PostgresTokenRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new PostgresTokenRepository(mockDb as any);
  });

  describe('findByChainAndAddress', () => {
    it('should return token when found', async () => {
      const mockToken = {
        id: 'test-id',
        chain: 'ethereum',
        network: 'mainnet',
        address: '0xtoken',
        name: 'Test Token',
        symbol: 'TEST',
        decimals: 18,
        logo_uri: null,
        coingecko_id: 'test-token',
        is_verified: true,
        is_spam: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.executeTakeFirst.mockResolvedValue(mockToken);

      const result = await repository.findByChainAndAddress(
        'ethereum',
        'mainnet',
        '0xTOKEN'
      );

      expect(result).toEqual({
        id: 'test-id',
        chain: 'ethereum',
        network: 'mainnet',
        address: '0xtoken',
        name: 'Test Token',
        symbol: 'TEST',
        decimals: 18,
        logoUri: null,
        coingeckoId: 'test-token',
        isVerified: true,
        isSpam: false,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should return null when not found', async () => {
      mockDb.executeTakeFirst.mockResolvedValue(undefined);

      const result = await repository.findByChainAndAddress(
        'ethereum',
        'mainnet',
        '0xnotfound'
      );

      expect(result).toBeNull();
    });

    it('should lowercase the address', async () => {
      mockDb.executeTakeFirst.mockResolvedValue(undefined);

      await repository.findByChainAndAddress('ethereum', 'mainnet', '0xABC');

      expect(mockDb.where).toHaveBeenCalledWith('address', '=', '0xabc');
    });
  });
});
```

**Step 2: Run tests**

```bash
cd services/core && npm run test:unit -- --grep "TokenRepository"
```

**Step 3: Commit**

```bash
git add services/core/tests/unit/repositories/
git commit -m "test(repo): add TokenRepository unit tests"
```

---

### Task 21: Add Balance Service Unit Tests

**Files:**
- Create: `services/core/tests/unit/services/balances/balance-service.test.ts`

**Step 1: Create test file with mocked dependencies**

**Step 2: Test balance fetching and price enrichment**

**Step 3: Run tests**

**Step 4: Commit**

```bash
git add services/core/tests/unit/services/balances/
git commit -m "test(balance): add BalanceService unit tests"
```

---

### Task 22: Add Integration Tests

**Files:**
- Create: `services/core/tests/integration/balances/get-balances.test.ts`

**Step 1: Create integration test for balance endpoint**

**Step 2: Run integration tests**

```bash
cd services/core && npm run test:integration:balances
```

**Step 3: Commit**

```bash
git add services/core/tests/integration/balances/
git commit -m "test(integration): add balance endpoint integration tests"
```

---

### Task 23: Final Verification

**Step 1: Run all unit tests**

```bash
npm run test:unit
```

**Step 2: Run linting**

```bash
npm run lint
```

**Step 3: Run TypeScript check**

```bash
cd services/core && npx tsc --noEmit
```

**Step 4: Verify migration runs**

```bash
cd services/core && npm run migrate:up
```

**Step 5: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final cleanup and verification"
```

---

## Summary

This plan implements the full PostgreSQL migration in 23 tasks:

1. **Tasks 1-6**: Schema & Infrastructure (types, migration, repositories)
2. **Tasks 7-11**: Balance Service (RPC client, fetchers, pricing, orchestration)
3. **Tasks 12-14**: Integration (plugin wiring, route handler updates)
4. **Tasks 15-19**: Cleanup (remove DynamoDB, Noves, update config/deps)
5. **Tasks 20-23**: Testing & Verification

Each task is a focused unit of work with clear inputs, outputs, and commit points.
