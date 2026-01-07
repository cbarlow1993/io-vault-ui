import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
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

// Test user data
const TEST_ORG_ID = 'org-test-123';
const TEST_USER_ID = 'user-test-456';
const TEST_VAULT_ID = 'vault-test-789';

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
      sub: TEST_USER_ID,
      organisationId: TEST_ORG_ID,
      scope: 'workflows-write workflows-read',
      username: 'testuser',
      client_id: 'test-client',
    },
    protectedHeader: { alg: 'RS256' },
  }),
}));

// Import buildApp after mocking
const { buildApp } = await import('@/src/app.js');

describe('Workflow Routes Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    // Reset vault service mock for each test
    vi.spyOn(app.services.vault, 'getVaultDetails').mockResolvedValue({
      vaultId: TEST_VAULT_ID,
      workspaceId: 'workspace-123',
      organisationId: TEST_ORG_ID,
    });
  });

  const authHeaders = {
    Authorization: 'Bearer valid-test-token',
  };

  describe('POST /v2/workflows - Create Workflow', () => {
    it('creates a new workflow successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v2/workflows',
        headers: authHeaders,
        payload: {
          vaultId: TEST_VAULT_ID,
          chainAlias: 'ethereum',
          marshalledHex: '0xabc123',
          skipReview: false,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body).toHaveProperty('id');
      expect(body.state).toBe('review');
    });

    it('creates workflow with skipReview=true and goes to evaluating_policies', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v2/workflows',
        headers: authHeaders,
        payload: {
          vaultId: TEST_VAULT_ID,
          chainAlias: 'polygon',
          marshalledHex: '0xdef456',
          skipReview: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body).toHaveProperty('id');
      expect(body.state).toBe('evaluating_policies');
    });

    it('rejects request without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v2/workflows',
        payload: {
          vaultId: TEST_VAULT_ID,
          chainAlias: 'ethereum',
          marshalledHex: '0xabc123',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('rejects request for unauthorized vault', async () => {
      // Mock vault service to return a different org
      vi.spyOn(app.services.vault, 'getVaultDetails').mockResolvedValue({
        vaultId: 'other-vault',
        workspaceId: 'workspace-456',
        organisationId: 'other-org-id',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/v2/workflows',
        headers: authHeaders,
        payload: {
          vaultId: 'other-vault',
          chainAlias: 'ethereum',
          marshalledHex: '0xabc123',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('rejects request with missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v2/workflows',
        headers: authHeaders,
        payload: {
          vaultId: TEST_VAULT_ID,
          // missing chainAlias and marshalledHex
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /v2/workflows/:id - Get Workflow', () => {
    let workflowId: string;

    beforeEach(async () => {
      // Create a workflow to test with
      const createResponse = await app.inject({
        method: 'POST',
        url: '/v2/workflows',
        headers: authHeaders,
        payload: {
          vaultId: TEST_VAULT_ID,
          chainAlias: 'ethereum',
          marshalledHex: '0xget-test-123',
          skipReview: false,
        },
      });
      workflowId = createResponse.json().id;
    });

    it('retrieves an existing workflow', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v2/workflows/${workflowId}`,
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe(workflowId);
      expect(body.state).toBe('review');
      expect(body.context).toHaveProperty('vaultId', TEST_VAULT_ID);
      expect(body.context).toHaveProperty('chainAlias', 'ethereum');
      expect(body).toHaveProperty('createdAt');
      expect(body).toHaveProperty('updatedAt');
    });

    it('returns 404 for non-existent workflow', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v2/workflows/00000000-0000-0000-0000-000000000000',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns 400 for invalid UUID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v2/workflows/not-a-uuid',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /v2/workflows/:id/confirm - Confirm Workflow', () => {
    let workflowId: string;

    beforeEach(async () => {
      // Create a workflow in review state
      const createResponse = await app.inject({
        method: 'POST',
        url: '/v2/workflows',
        headers: authHeaders,
        payload: {
          vaultId: TEST_VAULT_ID,
          chainAlias: 'ethereum',
          marshalledHex: '0xconfirm-test',
          skipReview: false,
        },
      });
      workflowId = createResponse.json().id;
    });

    it('confirms a workflow in review state', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v2/workflows/${workflowId}/confirm`,
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe(workflowId);
      expect(body.state).toBe('evaluating_policies');
    });

    it('returns error when confirming workflow not in review state', async () => {
      // Confirm once
      await app.inject({
        method: 'POST',
        url: `/v2/workflows/${workflowId}/confirm`,
        headers: authHeaders,
      });

      // Try to confirm again
      const response = await app.inject({
        method: 'POST',
        url: `/v2/workflows/${workflowId}/confirm`,
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /v2/workflows/:id/approve - Approve Workflow', () => {
    let workflowId: string;

    beforeEach(async () => {
      // Create a workflow and move it to waiting_approval state
      const createResponse = await app.inject({
        method: 'POST',
        url: '/v2/workflows',
        headers: authHeaders,
        payload: {
          vaultId: TEST_VAULT_ID,
          chainAlias: 'ethereum',
          marshalledHex: '0xapprove-test',
          skipReview: true, // Skip to evaluating_policies
        },
      });
      workflowId = createResponse.json().id;

      // Send POLICIES_REQUIRE_APPROVAL to move to waiting_approval
      await app.services.workflowOrchestrator.send(
        workflowId,
        { type: 'POLICIES_REQUIRE_APPROVAL', approvers: [TEST_USER_ID] },
        'test'
      );
    });

    it('approves a workflow in waiting_approval state', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v2/workflows/${workflowId}/approve`,
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe(workflowId);
      expect(body.state).toBe('approved');
    });

    it('returns error when approving workflow not in waiting_approval state', async () => {
      // Approve once
      await app.inject({
        method: 'POST',
        url: `/v2/workflows/${workflowId}/approve`,
        headers: authHeaders,
      });

      // Try to approve again
      const response = await app.inject({
        method: 'POST',
        url: `/v2/workflows/${workflowId}/approve`,
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /v2/workflows/:id/reject - Reject Workflow', () => {
    let workflowId: string;

    beforeEach(async () => {
      // Create a workflow and move it to waiting_approval state
      const createResponse = await app.inject({
        method: 'POST',
        url: '/v2/workflows',
        headers: authHeaders,
        payload: {
          vaultId: TEST_VAULT_ID,
          chainAlias: 'ethereum',
          marshalledHex: '0xreject-test',
          skipReview: true,
        },
      });
      workflowId = createResponse.json().id;

      // Move to waiting_approval
      await app.services.workflowOrchestrator.send(
        workflowId,
        { type: 'POLICIES_REQUIRE_APPROVAL', approvers: [TEST_USER_ID] },
        'test'
      );
    });

    it('rejects a workflow with a reason', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v2/workflows/${workflowId}/reject`,
        headers: authHeaders,
        payload: {
          reason: 'Transaction amount too high',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe(workflowId);
      expect(body.state).toBe('failed');
    });

    it('rejects request without reason', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v2/workflows/${workflowId}/reject`,
        headers: authHeaders,
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /v2/workflows/:id/history - Get Workflow History', () => {
    let workflowId: string;

    beforeEach(async () => {
      // Create a workflow and perform some transitions
      const createResponse = await app.inject({
        method: 'POST',
        url: '/v2/workflows',
        headers: authHeaders,
        payload: {
          vaultId: TEST_VAULT_ID,
          chainAlias: 'ethereum',
          marshalledHex: '0xhistory-test',
          skipReview: false,
        },
      });
      workflowId = createResponse.json().id;

      // Confirm the workflow to add another event
      await app.inject({
        method: 'POST',
        url: `/v2/workflows/${workflowId}/confirm`,
        headers: authHeaders,
      });
    });

    it('retrieves workflow history', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v2/workflows/${workflowId}/history`,
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.workflowId).toBe(workflowId);
      expect(body.history).toBeInstanceOf(Array);
      expect(body.history.length).toBeGreaterThanOrEqual(2); // START + CONFIRM
      expect(body.pagination).toHaveProperty('hasMore');
      expect(body.pagination).toHaveProperty('nextCursor');

      // Check first event structure
      const firstEvent = body.history[0];
      expect(firstEvent).toHaveProperty('id');
      expect(firstEvent).toHaveProperty('event');
      expect(firstEvent).toHaveProperty('fromState');
      expect(firstEvent).toHaveProperty('toState');
      expect(firstEvent).toHaveProperty('timestamp');
    });

    it('supports pagination with limit', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v2/workflows/${workflowId}/history?limit=1`,
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.history.length).toBe(1);
      expect(body.pagination.hasMore).toBe(true);
      expect(body.pagination.nextCursor).toBeTruthy();
    });

    it('returns 404 for non-existent workflow history', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v2/workflows/00000000-0000-0000-0000-000000000000/history',
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Webhook: POST /webhooks/signature', () => {
    let workflowId: string;

    beforeEach(async () => {
      // Create a workflow and move it to waiting_signature state
      const createResponse = await app.inject({
        method: 'POST',
        url: '/v2/workflows',
        headers: authHeaders,
        payload: {
          vaultId: TEST_VAULT_ID,
          chainAlias: 'ethereum',
          marshalledHex: '0xwebhook-test',
          skipReview: true,
        },
      });
      workflowId = createResponse.json().id;

      // Move through states to waiting_signature
      await app.services.workflowOrchestrator.send(
        workflowId,
        { type: 'POLICIES_PASSED' },
        'test'
      );
      await app.services.workflowOrchestrator.send(
        workflowId,
        { type: 'REQUEST_SIGNATURE' },
        'test'
      );
    });

    it('processes signature received webhook', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/signature',
        payload: {
          workflowId,
          requestId: 'req-123',
          success: true,
          signature: '0xsig123abc',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.received).toBe(true);

      // Verify workflow moved to broadcasting state
      const workflow = await app.services.workflowOrchestrator.getById(workflowId);
      expect(workflow?.state).toBe('broadcasting');
    });

    it('processes signature failed webhook', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/signature',
        payload: {
          workflowId,
          requestId: 'req-456',
          success: false,
          error: 'HSM unavailable',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.received).toBe(true);

      // Verify workflow moved to failed state
      const workflow = await app.services.workflowOrchestrator.getById(workflowId);
      expect(workflow?.state).toBe('failed');
    });

    it('handles duplicate webhook idempotently', async () => {
      // Send first webhook
      await app.inject({
        method: 'POST',
        url: '/webhooks/signature',
        payload: {
          workflowId,
          requestId: 'req-dup-123',
          success: true,
          signature: '0xsig123',
        },
      });

      // Send duplicate
      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/signature',
        payload: {
          workflowId,
          requestId: 'req-dup-123',
          success: true,
          signature: '0xsig123',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.received).toBe(true);
      expect(body.duplicate).toBe(true);
    });

    it('ignores webhook for workflow not in waiting_signature state', async () => {
      // Create a new workflow in review state
      const newWorkflowResponse = await app.inject({
        method: 'POST',
        url: '/v2/workflows',
        headers: authHeaders,
        payload: {
          vaultId: TEST_VAULT_ID,
          chainAlias: 'ethereum',
          marshalledHex: '0xwrong-state-test',
          skipReview: false,
        },
      });
      const newWorkflowId = newWorkflowResponse.json().id;

      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/signature',
        payload: {
          workflowId: newWorkflowId,
          requestId: 'req-wrong-state',
          success: true,
          signature: '0xsig',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.received).toBe(true);
      expect(body.ignored).toBe(true);
    });
  });
});
