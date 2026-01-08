import { z } from 'zod';

// Helper to properly parse boolean strings from environment variables
const booleanFromString = z
  .union([z.boolean(), z.string()])
  .transform((val) => {
    if (typeof val === 'boolean') return val;
    const lower = val.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'yes';
  });

// Schema definition
const configSchema = z.object({
  server: z.object({
    stage: z.string(),
    port: z.coerce.number().default(3000),
    host: z.string().default('0.0.0.0'),
    runtime: z.enum(['lambda', 'container']).default('container'),
  }),

  database: z.object({
    pgSslMode: z.string().optional(),
    useReadReplica: booleanFromString.default(false),
    databaseProxyUrlSecretId: z.string().optional(),
    databaseProxyReadOnlyUrlSecretId: z.string().optional(),
    postgres: z.object({
      host: z.string(),
      port: z.coerce.number().default(5432),
      name: z.string(),
      user: z.string(),
      password: z.string().optional(),
      useIamAuth: booleanFromString.default(false),
      poolMin: z.coerce.number().default(5),
      poolMax: z.coerce.number().default(20),
      sslMode: z.string().optional(),
    }),
    vaultPostgres: z.object({
      host: z.string(),
      port: z.coerce.number().default(5432),
      name: z.string(),
      user: z.string(),
      password: z.string().optional(),
      useIamAuth: booleanFromString.default(false),
      poolMin: z.coerce.number().default(5),
      poolMax: z.coerce.number().default(20),
      sslMode: z.string().optional(),
    }),
  }),

  apis: z.object({
    adamik: z.object({
      apiKey: z.string().optional(),
    }),
    coinGecko: z.object({
      apiKey: z.string().optional(),
      requestTimeout: z.coerce.number().default(5000),
    }),
    blockaid: z.object({
      apiKey: z.string().optional(),
    }),
    tronscan: z.object({
      apiUrl: z.string().optional(),
      apiKey: z.string().optional(),
    }),
    iofinnetNodes: z.object({
      rpcUrl: z.string().optional(),
    }),
    noves: z.object({
      apiKey: z.string().optional(),
      asyncJobs: z.object({
        enabled: booleanFromString.default(false),
        timeoutHours: z.coerce.number().default(4),
      }),
    }),
  }),

  reconciliation: z.object({
    workerEnabled: booleanFromString.default(false),
    pollingIntervalMs: z.coerce.number().default(5000),
    maxConcurrentJobs: z.coerce.number().default(1),
    scheduler: z.object({
      enabled: booleanFromString.default(false),
      cronSchedule: z.string().default('0 2 * * *'),
    }),
  }),

  tokenClassification: z.object({
    scheduler: z.object({
      enabled: booleanFromString.default(true),
      cronSchedule: z.string().default('*/15 * * * *'),
      batchSize: z.coerce.number().default(50),
      maxAttempts: z.coerce.number().default(5),
    }),
    ttlHours: z.coerce.number().default(720),
  }),

  services: z.object({
    internalTransactionRouterUrl: z.string().optional(),
    slackErrorReportWebhookUrl: z.string().optional(),
  }),

  multiChainWallet: z.object({
    appId: z.string().optional(),
  }),

  auth: z.object({
    jwksUrl: z.string().optional(),
    allowedClientIds: z
      .string()
      .optional()
      .transform((val) => val?.split(',').map((id) => id.trim()).filter(Boolean) ?? []),
  }),

  webhooks: z.object({
    signingService: z.object({
      secret: z.string().optional(),
    }),
  }),
});

// Load and validate config
function loadConfig() {
  const result = configSchema.safeParse({
    server: {
      stage: process.env.STAGE,
      port: process.env.PORT,
      host: process.env.HOST,
      runtime: process.env.SERVER_RUNTIME,
    },
    database: {
      pgSslMode: process.env.PGSSLMODE,
      useReadReplica: process.env.USE_READ_REPLICA,
      databaseProxyUrlSecretId: process.env.DATABASE_PROXY_URL_SECRET_ID,
      databaseProxyReadOnlyUrlSecretId: process.env.DATABASE_PROXY_READ_ONLY_URL_SECRET_ID,
      postgres: {
        host: process.env.DB_POSTGRES_HOST,
        port: process.env.DB_POSTGRES_PORT,
        name: process.env.DB_POSTGRES_NAME,
        user: process.env.DB_POSTGRES_USER,
        password: process.env.DB_POSTGRES_PASSWORD,
        useIamAuth: process.env.DB_POSTGRES_USE_IAM_AUTH,
        poolMin: process.env.DB_POSTGRES_POOL_MIN,
        poolMax: process.env.DB_POSTGRES_POOL_MAX,
        sslMode: process.env.DB_POSTGRES_SSLMODE,
      },
      vaultPostgres: {
        host: process.env.DB_VAULT_POSTGRES_HOST,
        port: process.env.DB_VAULT_POSTGRES_PORT,
        name: process.env.DB_VAULT_POSTGRES_NAME,
        user: process.env.DB_VAULT_POSTGRES_USER,
        password: process.env.DB_VAULT_POSTGRES_PASSWORD,
        useIamAuth: process.env.DB_VAULT_POSTGRES_USE_IAM_AUTH,
        poolMin: process.env.DB_VAULT_POSTGRES_POOL_MIN,
        poolMax: process.env.DB_VAULT_POSTGRES_POOL_MAX,
        sslMode: process.env.DB_VAULT_POSTGRES_SSLMODE,
      },
    },
    apis: {
      adamik: {
        apiKey: process.env.ADAMIK_API_KEY,
      },
      coinGecko: {
        apiKey: process.env.COIN_GECKO_API_KEY,
        requestTimeout: process.env.COIN_GECKO_REQUEST_TIMEOUT,
      },
      blockaid: {
        apiKey: process.env.BLOCKAID_API_KEY,
      },
      tronscan: {
        apiUrl: process.env.TRON_SCAN_API_URL,
        apiKey: process.env.TRON_SCAN_API_KEY,
      },
      iofinnetNodes: {
        rpcUrl: process.env.IOFINNET_NODES_RPC_URL,
      },
      noves: {
        apiKey: process.env.NOVES_API_KEY,
        asyncJobs: {
          enabled: process.env.NOVES_ASYNC_JOBS_ENABLED,
          timeoutHours: process.env.NOVES_JOB_TIMEOUT_HOURS,
        },
      },
    },
    reconciliation: {
      workerEnabled: process.env.RECONCILIATION_WORKER_ENABLED,
      pollingIntervalMs: process.env.RECONCILIATION_POLLING_INTERVAL_MS,
      maxConcurrentJobs: process.env.RECONCILIATION_MAX_CONCURRENT_JOBS,
      scheduler: {
        enabled: process.env.RECONCILIATION_SCHEDULER_ENABLED,
        cronSchedule: process.env.RECONCILIATION_CRON_SCHEDULE,
      },
    },
    tokenClassification: {
      scheduler: {
        enabled: process.env.TOKEN_CLASSIFICATION_SCHEDULER_ENABLED,
        cronSchedule: process.env.TOKEN_CLASSIFICATION_CRON_SCHEDULE,
        batchSize: process.env.TOKEN_CLASSIFICATION_BATCH_SIZE,
        maxAttempts: process.env.TOKEN_CLASSIFICATION_MAX_ATTEMPTS,
      },
      ttlHours: process.env.TOKEN_CLASSIFICATION_TTL_HOURS,
    },
    services: {
      internalTransactionRouterUrl: process.env.INTERNAL_TRANSACTION_ROUTER_URL,
      slackErrorReportWebhookUrl: process.env.SLACK_ERROR_REPORT_WEBHOOK_URL,
    },
    multiChainWallet: {
      appId: process.env.MULTI_CHAIN_WALLET_APP_ID,
    },
    auth: {
      jwksUrl: process.env.AUTH_JWKS_URL,
      allowedClientIds: process.env.AUTH_ALLOWED_CLIENT_IDS,
    },
    webhooks: {
      signingService: {
        secret: process.env.WEBHOOK_SIGNING_SERVICE_SECRET,
      },
    },
  });

  if (!result.success) {
    console.error('❌ Invalid configuration:');
    console.error(z.treeifyError(result.error));
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();
export type Config = z.infer<typeof configSchema>;
