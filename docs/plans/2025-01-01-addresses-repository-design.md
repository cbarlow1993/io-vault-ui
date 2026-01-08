# Addresses Repository Migration Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace DynamoDB address storage with PostgreSQL using Kysely and repository pattern.

**Architecture:** Repository pattern abstracting data access, Kysely for type-safe SQL, connection pooling optimized for both Lambda (RDS Proxy + IAM auth) and container deployments.

**Tech Stack:** PostgreSQL, Kysely, pg (node-postgres), @aws-sdk/rds-signer

---

## 1. PostgreSQL Schema

```sql
-- addresses table
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address VARCHAR(255) NOT NULL,
  chain VARCHAR(100) NOT NULL,
  vault_id VARCHAR(100) NOT NULL,
  organisation_id VARCHAR(100) NOT NULL,
  derivation_path VARCHAR(255),
  is_monitored BOOLEAN NOT NULL DEFAULT false,
  subscription_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(address, chain)
);

-- Indexes to support current GSI query patterns
CREATE INDEX idx_addresses_vault_id ON addresses(vault_id);
CREATE INDEX idx_addresses_subscription_id ON addresses(subscription_id) WHERE subscription_id IS NOT NULL;
CREATE INDEX idx_addresses_vault_monitored ON addresses(vault_id, is_monitored);
CREATE INDEX idx_addresses_org_id ON addresses(organisation_id);

-- address_tokens table (normalizing embedded tokens)
CREATE TABLE address_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address_id UUID NOT NULL REFERENCES addresses(id) ON DELETE CASCADE,
  contract_address VARCHAR(255) NOT NULL,
  symbol VARCHAR(50),
  decimals INTEGER,
  name VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(address_id, contract_address)
);

CREATE INDEX idx_address_tokens_address_id ON address_tokens(address_id);
```

## 2. Repository Interface

```typescript
// src/repositories/types.ts
export interface AddressRepository {
  // Core CRUD
  create(address: CreateAddressInput): Promise<Address>;
  findByAddressAndChain(address: string, chain: string): Promise<Address | null>;
  findById(id: string): Promise<Address | null>;

  // Query patterns (matching current GSI usage)
  findByVaultId(vaultId: string, options?: PaginationOptions): Promise<PaginatedResult<Address>>;
  findBySubscriptionId(subscriptionId: string): Promise<Address[]>;
  findMonitoredByVaultId(vaultId: string): Promise<Address[]>;
  findByOrganisationId(orgId: string, options?: PaginationOptions): Promise<PaginatedResult<Address>>;

  // Monitoring state (transactional)
  setMonitored(addressId: string, subscriptionId: string): Promise<Address>;
  setUnmonitored(addressId: string): Promise<Address>;

  // Token management
  addToken(addressId: string, token: CreateTokenInput): Promise<AddressToken>;
  removeToken(addressId: string, contractAddress: string): Promise<void>;
  findTokensByAddressId(addressId: string): Promise<AddressToken[]>;

  // Bulk operations
  createMany(addresses: CreateAddressInput[]): Promise<Address[]>;
  deleteByVaultId(vaultId: string): Promise<number>;
}
```

## 3. Connection Pool Strategy

### Lambda (Serverless)
- Pool size: 1 (RDS Proxy handles actual pooling)
- Cached across warm invocations
- IAM authentication with token refresh
- Aggressive timeouts (5s connection, 10s idle)

### Container
- Pool size: 5-20 (configurable)
- Password authentication
- Graceful shutdown cleanup
- Standard timeouts (10s connection, 30s idle)

```typescript
// Module-level caching for Lambda warm invocation reuse
let cachedPool: Pool | null = null;
let cachedDb: Kysely<Database> | null = null;

export async function getDatabase(): Promise<Kysely<Database>> {
  if (cachedDb && cachedPool) {
    // Verify connection alive, reuse if healthy
  }
  // Create new pool/db if needed
}
```

## 4. Migrations (CI/CD)

CLI-based migration runner:

```bash
npm run migrate:up      # Apply pending migrations
npm run migrate:down    # Rollback last migration
npm run migrate:status  # Show migration status
```

Migrations run as CI/CD pipeline step before deployment, never at application startup.

## 5. Fastify Integration

```typescript
// src/plugins/database.ts
async function databasePlugin(fastify: FastifyInstance) {
  const db = await getDatabase();

  fastify.decorate('db', db);
  fastify.decorate('repositories', {
    addresses: new PostgresAddressRepository(db),
  });

  // Only close on container shutdown, not Lambda
  if (config.server.runtime !== 'lambda') {
    fastify.addHook('onClose', closeDatabase);
  }
}
```

## 6. Config Schema

```typescript
database: z.object({
  // Existing DynamoDB (keep during migration)
  addressesTable: z.string(),

  // New PostgreSQL config
  postgres: z.object({
    host: z.string(),
    port: z.coerce.number().default(5432),
    name: z.string(),
    user: z.string(),
    password: z.string().optional(),
    useIamAuth: z.coerce.boolean().default(false),
    poolMin: z.coerce.number().default(5),
    poolMax: z.coerce.number().default(20),
  }).optional(),
}),

server: z.object({
  runtime: z.enum(['lambda', 'container']).default('container'),
})
```

## Migration Strategy

Both DynamoDB and PostgreSQL coexist during transition:
1. New repository code uses PostgreSQL
2. Existing DynamoDB code continues working
3. Gradual migration of handlers to use repository
4. Remove DynamoDB code after full migration
