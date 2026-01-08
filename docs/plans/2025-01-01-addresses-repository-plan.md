# Addresses Repository Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement PostgreSQL address storage with Kysely and repository pattern.

**Architecture:** Repository pattern with Kysely query builder, connection pooling for Lambda/container, CLI migrations for CI/CD.

**Tech Stack:** PostgreSQL, Kysely, pg, @aws-sdk/rds-signer, Fastify plugin

---

## Task 1: Install Dependencies

**Files:**
- Modify: `services/core/package.json`

**Step 1: Install Kysely and PostgreSQL dependencies**

Run:
```bash
cd services/core && npm install kysely pg @aws-sdk/rds-signer && npm install -D @types/pg
```

**Step 2: Verify installation**

Run: `cd services/core && npm ls kysely pg`
Expected: Shows installed versions

**Step 3: Commit**

```bash
git add services/core/package.json services/core/package-lock.json
git commit -m "feat(core): add kysely and postgresql dependencies"
```

---

## Task 2: Update Config Schema

**Files:**
- Modify: `services/core/src/lib/config.ts`
- Modify: `services/core/envs/.env.unit.test`

**Step 1: Add PostgreSQL config to schema**

In `services/core/src/lib/config.ts`, add to the `database` object:

```typescript
database: z.object({
  // Existing fields...
  addressesTable: z.string(),
  transactionsTable: z.string(),
  tokenMetadataTable: z.string(),

  // New PostgreSQL config
  postgres: z
    .object({
      host: z.string(),
      port: z.coerce.number().default(5432),
      name: z.string(),
      user: z.string(),
      password: z.string().optional(),
      useIamAuth: z.coerce.boolean().default(false),
      poolMin: z.coerce.number().default(5),
      poolMax: z.coerce.number().default(20),
    })
    .optional(),
}),
```

Add to `server` object:

```typescript
server: z.object({
  stage: z.enum(['local', 'dev', 'staging', 'prod']),
  runtime: z.enum(['lambda', 'container']).default('container'),
  // ... existing fields
}),
```

Update rawConfig to read new env vars:

```typescript
postgres: process.env.DB_POSTGRES_HOST
  ? {
      host: process.env.DB_POSTGRES_HOST,
      port: process.env.DB_POSTGRES_PORT,
      name: process.env.DB_POSTGRES_NAME,
      user: process.env.DB_POSTGRES_USER,
      password: process.env.DB_POSTGRES_PASSWORD,
      useIamAuth: process.env.DB_POSTGRES_USE_IAM_AUTH,
      poolMin: process.env.DB_POSTGRES_POOL_MIN,
      poolMax: process.env.DB_POSTGRES_POOL_MAX,
    }
  : undefined,
```

**Step 2: Update test env file**

Add to `services/core/envs/.env.unit.test`:

```bash
SERVER_RUNTIME=container
DB_POSTGRES_HOST=localhost
DB_POSTGRES_PORT=5432
DB_POSTGRES_NAME=io_vault_test
DB_POSTGRES_USER=postgres
DB_POSTGRES_PASSWORD=test
```

**Step 3: Run tests to verify config works**

Run: `cd services/core && npm test -- --testPathPattern="config" --passWithNoTests`
Expected: PASS (or no tests if config has no dedicated tests)

**Step 4: Commit**

```bash
git add services/core/src/lib/config.ts services/core/envs/.env.unit.test
git commit -m "feat(core): add postgresql config schema"
```

---

## Task 3: Create Database Types

**Files:**
- Create: `services/core/src/lib/database/types.ts`

**Step 1: Create Kysely database types**

```typescript
// services/core/src/lib/database/types.ts
import type { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface Database {
  addresses: AddressTable;
  address_tokens: AddressTokenTable;
}

export interface AddressTable {
  id: Generated<string>;
  address: string;
  chain: string;
  vault_id: string;
  organisation_id: string;
  derivation_path: string | null;
  is_monitored: boolean;
  subscription_id: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface AddressTokenTable {
  id: Generated<string>;
  address_id: string;
  contract_address: string;
  symbol: string | null;
  decimals: number | null;
  name: string | null;
  created_at: Generated<Date>;
}

// Type helpers
export type Address = Selectable<AddressTable>;
export type NewAddress = Insertable<AddressTable>;
export type AddressUpdate = Updateable<AddressTable>;

export type AddressToken = Selectable<AddressTokenTable>;
export type NewAddressToken = Insertable<AddressTokenTable>;
```

**Step 2: Create index file**

```typescript
// services/core/src/lib/database/index.ts
export * from './types';
```

**Step 3: Commit**

```bash
git add services/core/src/lib/database/
git commit -m "feat(core): add kysely database types for addresses"
```

---

## Task 4: Create Database Connection Module

**Files:**
- Create: `services/core/src/lib/database/connection.ts`
- Modify: `services/core/src/lib/database/index.ts`

**Step 1: Create connection module**

```typescript
// services/core/src/lib/database/connection.ts
import { Kysely, PostgresDialect } from 'kysely';
import { Pool, type PoolConfig } from 'pg';
import { Signer } from '@aws-sdk/rds-signer';
import { config } from '@/services/core/src/lib/config';
import { logger } from '@/utils/powertools';
import type { Database } from './types';

// Module-level cache for Lambda warm invocation reuse
let cachedPool: Pool | null = null;
let cachedDb: Kysely<Database> | null = null;

function getPoolConfig(): PoolConfig {
  const pgConfig = config.database.postgres;
  if (!pgConfig) {
    throw new Error('PostgreSQL configuration is not defined');
  }

  const isServerless = config.server.runtime === 'lambda';

  const baseConfig: PoolConfig = {
    host: pgConfig.host,
    port: pgConfig.port,
    database: pgConfig.name,
    user: pgConfig.user,
  };

  if (isServerless) {
    return {
      ...baseConfig,
      max: 1,
      min: 0,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
      allowExitOnIdle: false,
      ssl: { rejectUnauthorized: false },
    };
  }

  return {
    ...baseConfig,
    max: pgConfig.poolMax ?? 20,
    min: pgConfig.poolMin ?? 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    password: pgConfig.password,
  };
}

async function getPassword(): Promise<string | (() => Promise<string>)> {
  const pgConfig = config.database.postgres;
  if (!pgConfig) {
    throw new Error('PostgreSQL configuration is not defined');
  }

  if (!pgConfig.useIamAuth) {
    return pgConfig.password ?? '';
  }

  const signer = new Signer({
    hostname: pgConfig.host,
    port: pgConfig.port,
    username: pgConfig.user,
  });

  return () => signer.getAuthToken();
}

export async function getDatabase(): Promise<Kysely<Database>> {
  if (cachedDb && cachedPool) {
    try {
      await cachedPool.query('SELECT 1');
      return cachedDb;
    } catch {
      logger.warn('Cached database connection is dead, recreating');
      await cachedPool.end().catch(() => {});
      cachedPool = null;
      cachedDb = null;
    }
  }

  const poolConfig = getPoolConfig();
  const password = await getPassword();

  cachedPool = new Pool({
    ...poolConfig,
    password,
  });

  cachedPool.on('error', (err) => {
    logger.error('Unexpected pool error', { error: err });
    cachedPool = null;
    cachedDb = null;
  });

  cachedDb = new Kysely<Database>({
    dialect: new PostgresDialect({ pool: cachedPool }),
  });

  logger.info('Database connection established');
  return cachedDb;
}

export async function closeDatabase(): Promise<void> {
  if (cachedDb) {
    await cachedDb.destroy();
    cachedDb = null;
    cachedPool = null;
    logger.info('Database connection closed');
  }
}

// For testing: reset cached connections
export function resetDatabaseCache(): void {
  cachedDb = null;
  cachedPool = null;
}
```

**Step 2: Update index exports**

```typescript
// services/core/src/lib/database/index.ts
export * from './types';
export { getDatabase, closeDatabase, resetDatabaseCache } from './connection';
```

**Step 3: Commit**

```bash
git add services/core/src/lib/database/
git commit -m "feat(core): add database connection module with Lambda/container pooling"
```

---

## Task 5: Create Migration Infrastructure

**Files:**
- Create: `services/core/src/lib/database/migrations/2025_01_01_create_addresses.ts`
- Create: `services/core/scripts/migrate.ts`
- Modify: `services/core/package.json`

**Step 1: Create first migration**

```typescript
// services/core/src/lib/database/migrations/2025_01_01_create_addresses.ts
import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('addresses')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('address', 'varchar(255)', (col) => col.notNull())
    .addColumn('chain', 'varchar(100)', (col) => col.notNull())
    .addColumn('vault_id', 'varchar(100)', (col) => col.notNull())
    .addColumn('organisation_id', 'varchar(100)', (col) => col.notNull())
    .addColumn('derivation_path', 'varchar(255)')
    .addColumn('is_monitored', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('subscription_id', 'varchar(100)')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .addUniqueConstraint('addresses_address_chain_unique', ['address', 'chain'])
    .execute();

  await db.schema.createIndex('idx_addresses_vault_id').on('addresses').column('vault_id').execute();
  await db.schema
    .createIndex('idx_addresses_subscription_id')
    .on('addresses')
    .column('subscription_id')
    .execute();
  await db.schema
    .createIndex('idx_addresses_org_id')
    .on('addresses')
    .column('organisation_id')
    .execute();

  await db.schema
    .createTable('address_tokens')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('address_id', 'uuid', (col) => col.notNull().references('addresses.id').onDelete('cascade'))
    .addColumn('contract_address', 'varchar(255)', (col) => col.notNull())
    .addColumn('symbol', 'varchar(50)')
    .addColumn('decimals', 'integer')
    .addColumn('name', 'varchar(255)')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
    .addUniqueConstraint('address_tokens_unique', ['address_id', 'contract_address'])
    .execute();

  await db.schema
    .createIndex('idx_address_tokens_address_id')
    .on('address_tokens')
    .column('address_id')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('address_tokens').execute();
  await db.schema.dropTable('addresses').execute();
}
```

**Step 2: Create migration CLI script**

```typescript
// services/core/scripts/migrate.ts
import { Kysely, Migrator, FileMigrationProvider, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { promises as fs } from 'fs';
import path from 'path';

async function main() {
  const command = process.argv[2];

  if (!['up', 'down', 'status'].includes(command)) {
    console.log('Usage: migrate <up|down|status>');
    process.exit(1);
  }

  const pool = new Pool({
    host: process.env.DB_POSTGRES_HOST,
    port: parseInt(process.env.DB_POSTGRES_PORT || '5432'),
    database: process.env.DB_POSTGRES_NAME,
    user: process.env.DB_POSTGRES_USER,
    password: process.env.DB_POSTGRES_PASSWORD,
  });

  const db = new Kysely<unknown>({
    dialect: new PostgresDialect({ pool }),
  });

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, '../src/lib/database/migrations'),
    }),
  });

  try {
    switch (command) {
      case 'up': {
        const { results, error } = await migrator.migrateToLatest();
        results?.forEach((r) => {
          console.log(`${r.status}: ${r.migrationName}`);
        });
        if (error) throw error;
        if (!results?.length) console.log('No pending migrations');
        break;
      }

      case 'down': {
        const { results, error } = await migrator.migrateDown();
        results?.forEach((r) => {
          console.log(`Rolled back: ${r.migrationName}`);
        });
        if (error) throw error;
        if (!results?.length) console.log('No migrations to rollback');
        break;
      }

      case 'status': {
        const migrations = await migrator.getMigrations();
        migrations.forEach((m) => {
          const status = m.executedAt ? `✓ ${m.executedAt.toISOString()}` : '○ pending';
          console.log(`${status} - ${m.name}`);
        });
        break;
      }
    }
  } finally {
    await db.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

**Step 3: Add npm scripts to package.json**

Add to scripts section:
```json
"migrate:up": "ts-node scripts/migrate.ts up",
"migrate:down": "ts-node scripts/migrate.ts down",
"migrate:status": "ts-node scripts/migrate.ts status"
```

**Step 4: Commit**

```bash
git add services/core/src/lib/database/migrations/ services/core/scripts/migrate.ts services/core/package.json
git commit -m "feat(core): add kysely migration infrastructure"
```

---

## Task 6: Create Repository Interface and Types

**Files:**
- Create: `services/core/src/repositories/types.ts`
- Create: `services/core/src/repositories/index.ts`

**Step 1: Create repository types**

```typescript
// services/core/src/repositories/types.ts
import type { Address, AddressToken, NewAddress, NewAddressToken } from '@/services/core/src/lib/database';

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

export interface CreateAddressInput {
  address: string;
  chain: string;
  vaultId: string;
  organisationId: string;
  derivationPath?: string;
}

export interface CreateTokenInput {
  contractAddress: string;
  symbol?: string;
  decimals?: number;
  name?: string;
}

export interface AddressRepository {
  // Core CRUD
  create(input: CreateAddressInput): Promise<Address>;
  findById(id: string): Promise<Address | null>;
  findByAddressAndChain(address: string, chain: string): Promise<Address | null>;

  // Query patterns
  findByVaultId(vaultId: string, options?: PaginationOptions): Promise<PaginatedResult<Address>>;
  findBySubscriptionId(subscriptionId: string): Promise<Address[]>;
  findMonitoredByVaultId(vaultId: string): Promise<Address[]>;
  findByOrganisationId(organisationId: string, options?: PaginationOptions): Promise<PaginatedResult<Address>>;

  // Monitoring state
  setMonitored(id: string, subscriptionId: string): Promise<Address>;
  setUnmonitored(id: string): Promise<Address>;

  // Token management
  addToken(addressId: string, token: CreateTokenInput): Promise<AddressToken>;
  removeToken(addressId: string, contractAddress: string): Promise<void>;
  findTokensByAddressId(addressId: string): Promise<AddressToken[]>;

  // Bulk operations
  createMany(inputs: CreateAddressInput[]): Promise<Address[]>;
  deleteByVaultId(vaultId: string): Promise<number>;
}
```

**Step 2: Create index file**

```typescript
// services/core/src/repositories/index.ts
export * from './types';
```

**Step 3: Commit**

```bash
git add services/core/src/repositories/
git commit -m "feat(core): add address repository interface"
```

---

## Task 7: Implement PostgreSQL Address Repository

**Files:**
- Create: `services/core/src/repositories/address.repository.ts`
- Modify: `services/core/src/repositories/index.ts`

**Step 1: Create repository implementation**

```typescript
// services/core/src/repositories/address.repository.ts
import type { Kysely } from 'kysely';
import type { Database, Address, AddressToken } from '@/services/core/src/lib/database';
import type {
  AddressRepository,
  CreateAddressInput,
  CreateTokenInput,
  PaginatedResult,
  PaginationOptions,
} from './types';

export class PostgresAddressRepository implements AddressRepository {
  constructor(private db: Kysely<Database>) {}

  async create(input: CreateAddressInput): Promise<Address> {
    const result = await this.db
      .insertInto('addresses')
      .values({
        address: input.address,
        chain: input.chain,
        vault_id: input.vaultId,
        organisation_id: input.organisationId,
        derivation_path: input.derivationPath ?? null,
        is_monitored: false,
        subscription_id: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  }

  async findById(id: string): Promise<Address | null> {
    const result = await this.db
      .selectFrom('addresses')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return result ?? null;
  }

  async findByAddressAndChain(address: string, chain: string): Promise<Address | null> {
    const result = await this.db
      .selectFrom('addresses')
      .selectAll()
      .where('address', '=', address)
      .where('chain', '=', chain)
      .executeTakeFirst();

    return result ?? null;
  }

  async findByVaultId(vaultId: string, options?: PaginationOptions): Promise<PaginatedResult<Address>> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const [data, countResult] = await Promise.all([
      this.db
        .selectFrom('addresses')
        .selectAll()
        .where('vault_id', '=', vaultId)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute(),
      this.db
        .selectFrom('addresses')
        .select((eb) => eb.fn.countAll().as('count'))
        .where('vault_id', '=', vaultId)
        .executeTakeFirst(),
    ]);

    const total = Number(countResult?.count ?? 0);

    return {
      data,
      total,
      hasMore: offset + data.length < total,
    };
  }

  async findBySubscriptionId(subscriptionId: string): Promise<Address[]> {
    return this.db
      .selectFrom('addresses')
      .selectAll()
      .where('subscription_id', '=', subscriptionId)
      .execute();
  }

  async findMonitoredByVaultId(vaultId: string): Promise<Address[]> {
    return this.db
      .selectFrom('addresses')
      .selectAll()
      .where('vault_id', '=', vaultId)
      .where('is_monitored', '=', true)
      .execute();
  }

  async findByOrganisationId(
    organisationId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Address>> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const [data, countResult] = await Promise.all([
      this.db
        .selectFrom('addresses')
        .selectAll()
        .where('organisation_id', '=', organisationId)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute(),
      this.db
        .selectFrom('addresses')
        .select((eb) => eb.fn.countAll().as('count'))
        .where('organisation_id', '=', organisationId)
        .executeTakeFirst(),
    ]);

    const total = Number(countResult?.count ?? 0);

    return {
      data,
      total,
      hasMore: offset + data.length < total,
    };
  }

  async setMonitored(id: string, subscriptionId: string): Promise<Address> {
    const result = await this.db
      .updateTable('addresses')
      .set({
        is_monitored: true,
        subscription_id: subscriptionId,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  }

  async setUnmonitored(id: string): Promise<Address> {
    const result = await this.db
      .updateTable('addresses')
      .set({
        is_monitored: false,
        subscription_id: null,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  }

  async addToken(addressId: string, token: CreateTokenInput): Promise<AddressToken> {
    const result = await this.db
      .insertInto('address_tokens')
      .values({
        address_id: addressId,
        contract_address: token.contractAddress,
        symbol: token.symbol ?? null,
        decimals: token.decimals ?? null,
        name: token.name ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  }

  async removeToken(addressId: string, contractAddress: string): Promise<void> {
    await this.db
      .deleteFrom('address_tokens')
      .where('address_id', '=', addressId)
      .where('contract_address', '=', contractAddress)
      .execute();
  }

  async findTokensByAddressId(addressId: string): Promise<AddressToken[]> {
    return this.db
      .selectFrom('address_tokens')
      .selectAll()
      .where('address_id', '=', addressId)
      .execute();
  }

  async createMany(inputs: CreateAddressInput[]): Promise<Address[]> {
    if (inputs.length === 0) return [];

    const values = inputs.map((input) => ({
      address: input.address,
      chain: input.chain,
      vault_id: input.vaultId,
      organisation_id: input.organisationId,
      derivation_path: input.derivationPath ?? null,
      is_monitored: false,
      subscription_id: null,
    }));

    return this.db.insertInto('addresses').values(values).returningAll().execute();
  }

  async deleteByVaultId(vaultId: string): Promise<number> {
    const result = await this.db
      .deleteFrom('addresses')
      .where('vault_id', '=', vaultId)
      .executeTakeFirst();

    return Number(result.numDeletedRows);
  }
}
```

**Step 2: Update index exports**

```typescript
// services/core/src/repositories/index.ts
export * from './types';
export { PostgresAddressRepository } from './address.repository';
```

**Step 3: Commit**

```bash
git add services/core/src/repositories/
git commit -m "feat(core): implement postgres address repository"
```

---

## Task 8: Create Database Fastify Plugin

**Files:**
- Create: `services/core/src/plugins/database.ts`

**Step 1: Create database plugin**

```typescript
// services/core/src/plugins/database.ts
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import type { Kysely } from 'kysely';
import { getDatabase, closeDatabase, type Database } from '@/services/core/src/lib/database';
import { PostgresAddressRepository } from '@/services/core/src/repositories';
import type { AddressRepository } from '@/services/core/src/repositories';
import { config } from '@/services/core/src/lib/config';
import { logger } from '@/utils/powertools';

declare module 'fastify' {
  interface FastifyInstance {
    db: Kysely<Database>;
    repositories: {
      addresses: AddressRepository;
    };
  }
}

async function databasePlugin(fastify: FastifyInstance) {
  // Skip if PostgreSQL is not configured
  if (!config.database.postgres) {
    logger.info('PostgreSQL not configured, skipping database plugin');
    return;
  }

  const db = await getDatabase();

  fastify.decorate('db', db);
  fastify.decorate('repositories', {
    addresses: new PostgresAddressRepository(db),
  });

  // Only close on container shutdown, not Lambda
  if (config.server.runtime !== 'lambda') {
    fastify.addHook('onClose', async () => {
      await closeDatabase();
    });
  }

  logger.info('Database plugin initialized');
}

export default fp(databasePlugin, { name: 'database' });
```

**Step 2: Commit**

```bash
git add services/core/src/plugins/database.ts
git commit -m "feat(core): add database fastify plugin"
```

---

## Task 9: Create Repository Unit Tests

**Files:**
- Create: `services/core/src/repositories/__tests__/address.repository.test.ts`

**Step 1: Create test file**

```typescript
// services/core/src/repositories/__tests__/address.repository.test.ts
import { Kysely } from 'kysely';
import { PostgresAddressRepository } from '../address.repository';
import type { Database } from '@/services/core/src/lib/database';

// Mock Kysely for unit tests
const createMockDb = () => {
  const mockExecute = jest.fn();
  const mockExecuteTakeFirst = jest.fn();
  const mockExecuteTakeFirstOrThrow = jest.fn();

  const chainable = {
    selectAll: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    returningAll: jest.fn().mockReturnThis(),
    execute: mockExecute,
    executeTakeFirst: mockExecuteTakeFirst,
    executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
  };

  return {
    selectFrom: jest.fn().mockReturnValue(chainable),
    insertInto: jest.fn().mockReturnValue(chainable),
    updateTable: jest.fn().mockReturnValue(chainable),
    deleteFrom: jest.fn().mockReturnValue(chainable),
    _mocks: { mockExecute, mockExecuteTakeFirst, mockExecuteTakeFirstOrThrow, chainable },
  } as unknown as Kysely<Database> & { _mocks: typeof chainable };
};

describe('PostgresAddressRepository', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let repository: PostgresAddressRepository;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = new PostgresAddressRepository(mockDb as unknown as Kysely<Database>);
  });

  describe('create', () => {
    it('should insert a new address and return it', async () => {
      const input = {
        address: '0x123',
        chain: 'ETH',
        vaultId: 'vault-1',
        organisationId: 'org-1',
        derivationPath: "m/44'/60'/0'/0/0",
      };

      const expectedAddress = {
        id: 'uuid-1',
        ...input,
        vault_id: input.vaultId,
        organisation_id: input.organisationId,
        derivation_path: input.derivationPath,
        is_monitored: false,
        subscription_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb._mocks.mockExecuteTakeFirstOrThrow.mockResolvedValue(expectedAddress);

      const result = await repository.create(input);

      expect(mockDb.insertInto).toHaveBeenCalledWith('addresses');
      expect(result).toEqual(expectedAddress);
    });
  });

  describe('findById', () => {
    it('should return address when found', async () => {
      const expectedAddress = {
        id: 'uuid-1',
        address: '0x123',
        chain: 'ETH',
      };

      mockDb._mocks.mockExecuteTakeFirst.mockResolvedValue(expectedAddress);

      const result = await repository.findById('uuid-1');

      expect(mockDb.selectFrom).toHaveBeenCalledWith('addresses');
      expect(result).toEqual(expectedAddress);
    });

    it('should return null when not found', async () => {
      mockDb._mocks.mockExecuteTakeFirst.mockResolvedValue(undefined);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('setMonitored', () => {
    it('should update monitoring status and subscription', async () => {
      const updatedAddress = {
        id: 'uuid-1',
        is_monitored: true,
        subscription_id: 'sub-123',
      };

      mockDb._mocks.mockExecuteTakeFirstOrThrow.mockResolvedValue(updatedAddress);

      const result = await repository.setMonitored('uuid-1', 'sub-123');

      expect(mockDb.updateTable).toHaveBeenCalledWith('addresses');
      expect(result.is_monitored).toBe(true);
      expect(result.subscription_id).toBe('sub-123');
    });
  });

  describe('deleteByVaultId', () => {
    it('should delete all addresses for a vault and return count', async () => {
      mockDb._mocks.mockExecuteTakeFirst.mockResolvedValue({ numDeletedRows: BigInt(5) });

      const result = await repository.deleteByVaultId('vault-1');

      expect(mockDb.deleteFrom).toHaveBeenCalledWith('addresses');
      expect(result).toBe(5);
    });
  });
});
```

**Step 2: Run tests**

Run: `cd services/core && npm test -- --testPathPattern="address.repository" --passWithNoTests`
Expected: PASS

**Step 3: Commit**

```bash
git add services/core/src/repositories/__tests__/
git commit -m "test(core): add address repository unit tests"
```

---

## Task 10: Add Docker Compose for Local PostgreSQL

**Files:**
- Create: `docker-compose.yml` (or modify if exists)
- Create: `services/core/envs/.env.local`

**Step 1: Create/update docker-compose.yml**

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: io-vault-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: localdev
      POSTGRES_DB: io_vault
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

**Step 2: Create local env file**

```bash
# services/core/envs/.env.local
STAGE=local
SERVER_RUNTIME=container

# PostgreSQL
DB_POSTGRES_HOST=localhost
DB_POSTGRES_PORT=5432
DB_POSTGRES_NAME=io_vault
DB_POSTGRES_USER=postgres
DB_POSTGRES_PASSWORD=localdev
DB_POSTGRES_USE_IAM_AUTH=false
DB_POSTGRES_POOL_MIN=2
DB_POSTGRES_POOL_MAX=10

# Existing DynamoDB config (keep during migration)
ADDRESSES_TABLE=addresses-local
# ... other existing env vars
```

**Step 3: Commit**

```bash
git add docker-compose.yml services/core/envs/.env.local
git commit -m "feat(core): add docker compose for local postgresql"
```

---

## Summary

After completing all tasks you will have:

1. **Dependencies**: Kysely, pg, @aws-sdk/rds-signer installed
2. **Config**: Extended with PostgreSQL settings and runtime mode
3. **Database Types**: Kysely type definitions for addresses schema
4. **Connection Module**: Lambda/container-aware pooling with IAM auth support
5. **Migrations**: CLI-based runner for CI/CD with initial addresses schema
6. **Repository**: Full `AddressRepository` interface and PostgreSQL implementation
7. **Fastify Plugin**: Database plugin injecting repository into request context
8. **Tests**: Unit tests for repository methods
9. **Local Dev**: Docker Compose for PostgreSQL

The existing DynamoDB code remains untouched - handlers can be migrated incrementally to use the new repository.
