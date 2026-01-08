import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

// Mock environment variables before importing the app
vi.stubEnv('STAGE', 'local');
vi.stubEnv('NOVES_API_KEY', 'test-noves-api-key');
vi.stubEnv('BLOCKAID_API_KEY', 'test-blockaid-api-key');
vi.stubEnv('COIN_GECKO_API_KEY', 'test-coingecko-api-key');
vi.stubEnv('COIN_GECKO_REQUEST_TIMEOUT', '5000');
vi.stubEnv('IOFINNET_NODES_RPC_URL', 'https://nodes.test.iofinnet.com');
vi.stubEnv('ADDRESSES_TABLE', 'test-addresses-table');
vi.stubEnv('TRANSACTIONS_TABLE', 'test-transactions-table');
vi.stubEnv('TOKEN_METADATA_TABLE', 'test-token-metadata-table');
vi.stubEnv('TRANSACTION_SYNC_QUEUE_URL', 'https://sqs.test/queue');
vi.stubEnv('TRON_SCAN_API_URL', 'https://api.tronscan.test');
vi.stubEnv('TRON_SCAN_API_KEY', 'test-tronscan-api-key');
vi.stubEnv('SYNC_ADDRESS_ENABLED', 'false');
vi.stubEnv('INTERNAL_TRANSACTION_ROUTER_URL', 'https://internal.router.test');
vi.stubEnv('AUTH_JWKS_URL', 'https://example.com/.well-known/jwks.json');
// Database configuration
vi.stubEnv('DB_POSTGRES_HOST', 'localhost');
vi.stubEnv('DB_POSTGRES_PORT', '5432');
vi.stubEnv('DB_POSTGRES_NAME', 'io_vault_test');
vi.stubEnv('DB_POSTGRES_USER', 'postgres');
vi.stubEnv('DB_POSTGRES_PASSWORD', 'test');
// Token classification configuration
vi.stubEnv('TOKEN_CLASSIFICATION_SCHEDULER_ENABLED', 'true');
vi.stubEnv('TOKEN_CLASSIFICATION_SCHEDULER_CRON', '*/15 * * * *');

// Mock external clients that require API keys
vi.mock('@/src/lib/clients/index.js', () => ({
  NovesEVMClient: {},
  NovesSVMClient: {},
  NovesUTXOClient: {},
  NovesCOSMOSClient: {},
  NovesTVMClient: {},
  NovesPOLKADOTClient: {},
  NovesXRPClient: {},
  blockaidClient: vi.fn(() => ({})),
}));

// Mock jose library for JWT verification
vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => 'mock-jwks'),
  jwtVerify: vi.fn().mockResolvedValue({
    payload: {
      sub: 'user-456',
      organisationId: 'org-123',
      scope: 'chains-public other-scope',
      username: 'testuser',
      client_id: 'test-client',
    },
    protectedHeader: { alg: 'RS256' },
  }),
}));

// Import buildApp after mocking
const { buildApp } = await import('@/src/app.js');

describe('Token Classification Worker Integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should have token classification cron registered', async () => {
    // Verify plugin is registered by checking Fastify's internal plugin registry
    expect(app.hasPlugin('token-classification-cron')).toBe(true);
  });

  it('should have database plugin registered (dependency)', async () => {
    expect(app.hasPlugin('database')).toBe(true);
  });

  it('should start with health check working', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });
});
