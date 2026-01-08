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

describe('Fastify App Integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('returns 200 OK', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: 'ok' });
    });
  });

  describe('Chains API', () => {
    it('lists chains without auth', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v2/chains',
      });
      expect(response.statusCode).toBe(200);
      const json = response.json();
      // Response is { data: [...chains] }
      expect(json).toHaveProperty('data');
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
    });
  });

  describe('OpenAPI', () => {
    it('serves OpenAPI spec', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs/json',
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().openapi).toBe('3.1.0');
    });
  });

  describe('Protected Routes', () => {
    it('returns 401 for addresses without auth', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v2/vaults/550e8400-e29b-41d4-a716-446655440000/addresses',
      });
      expect(response.statusCode).toBe(401);
    });

    it('allows access with Bearer token auth', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v2/vaults/550e8400-e29b-41d4-a716-446655440000/addresses',
        headers: {
          Authorization: 'Bearer valid-test-token',
        },
      });
      // May return 200 or other status depending on service, but not 401
      expect(response.statusCode).not.toBe(401);
    });
  });
});
