import { Kysely, PostgresDialect } from 'kysely';
import { Pool, type PoolConfig } from 'pg';
import { config } from '@/src/lib/config.js';
import { logger } from '@/utils/powertools.js';
import type { Database, VaultDatabase } from '@/src/lib/database/types.js';

// Module-level cache for connection reuse
let cachedPool: Pool | null = null;
let cachedDb: Kysely<Database> | null = null;

// Vault database cache
let cachedVaultPool: Pool | null = null;
let cachedVaultDb: Kysely<VaultDatabase> | null = null;

function getPoolConfig(): PoolConfig {
  const pgConfig = config.database.postgres;
  if (!pgConfig) {
    throw new Error('PostgreSQL configuration is not defined');
  }

  return {
    host: pgConfig.host,
    port: pgConfig.port,
    database: pgConfig.name,
    user: pgConfig.user,
    password: pgConfig.password,
    max: pgConfig.poolMax ?? 20,
    min: pgConfig.poolMin ?? 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: config.database.pgSslMode === 'require' ? { rejectUnauthorized: false } : false,
  };
}

function getVaultPoolConfig(): PoolConfig {
  const pgConfig = config.database.vaultPostgres;
  if (!pgConfig) {
    throw new Error('Vault PostgreSQL configuration is not defined');
  }

  return {
    host: pgConfig.host,
    port: pgConfig.port,
    database: pgConfig.name,
    user: pgConfig.user,
    password: pgConfig.password,
    max: pgConfig.poolMax ?? 20,
    min: pgConfig.poolMin ?? 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: pgConfig.sslMode === 'require' ? { rejectUnauthorized: false } : false,
  };
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

  cachedPool = new Pool(poolConfig);

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

export async function getVaultDatabase(): Promise<Kysely<VaultDatabase>> {
  if (cachedVaultDb && cachedVaultPool) {
    try {
      await cachedVaultPool.query('SELECT 1');
      return cachedVaultDb;
    } catch {
      logger.warn('Cached vault database connection is dead, recreating');
      await cachedVaultPool.end().catch(() => {});
      cachedVaultPool = null;
      cachedVaultDb = null;
    }
  }

  const poolConfig = getVaultPoolConfig();

  cachedVaultPool = new Pool(poolConfig);

  cachedVaultPool.on('error', (err) => {
    logger.error('Unexpected vault pool error', { error: err });
    cachedVaultPool = null;
    cachedVaultDb = null;
  });

  cachedVaultDb = new Kysely<VaultDatabase>({
    dialect: new PostgresDialect({ pool: cachedVaultPool }),
  });

  logger.info('Vault database connection established');
  return cachedVaultDb;
}

export async function closeDatabase(): Promise<void> {
  if (cachedDb) {
    await cachedDb.destroy();
    cachedDb = null;
    cachedPool = null;
    logger.info('Database connection closed');
  }
}

export async function closeVaultDatabase(): Promise<void> {
  if (cachedVaultDb) {
    await cachedVaultDb.destroy();
    cachedVaultDb = null;
    cachedVaultPool = null;
    logger.info('Vault database connection closed');
  }
}

// For testing: reset cached connections
export function resetDatabaseCache(): void {
  cachedDb = null;
  cachedPool = null;
  cachedVaultDb = null;
  cachedVaultPool = null;
}
