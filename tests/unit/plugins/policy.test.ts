import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import policyPlugin from '@/src/plugins/policy.js';
import errorHandlerPlugin from '@/src/plugins/error-handler.js';
import type { PolicyService } from '@/src/services/policy/types.js';

// Create a mock auth plugin that satisfies the dependency
const mockAuthPlugin = fp(
  async (fastify) => {
    fastify.decorateRequest('auth', null);
    fastify.addHook('onRequest', async (request) => {
      request.auth = {
        userId: 'user-1',
        organisationId: 'org-1',
        token: 'test-token',
      };
    });
  },
  { name: 'auth' }
);

describe('Policy Plugin', () => {
  let app: FastifyInstance;
  let mockPolicyService: PolicyService;

  beforeEach(async () => {
    mockPolicyService = {
      checkAccess: vi.fn(),
    };

    app = Fastify();

    // Register mock auth plugin first
    await app.register(mockAuthPlugin);

    await app.register(policyPlugin, {
      policyService: mockPolicyService,
    });
  });

  it('should decorate fastify with policy service', async () => {
    expect(app.policy).toBeDefined();
    expect(app.policy.checkAccess).toBeDefined();
  });

  it('should decorate request with requireAccess helper', async () => {
    app.get('/test', {
      preHandler: async (request) => {
        expect(request.requireAccess).toBeDefined();
      },
    }, async () => ({ ok: true }));

    await app.ready();

    vi.mocked(mockPolicyService.checkAccess).mockResolvedValue({ allowed: true });

    const response = await app.inject({
      method: 'GET',
      url: '/test',
    });

    expect(response.statusCode).toBe(200);
  });

  it('should store policy decision on request after access check', async () => {
    const expectedDecision = { allowed: true, reason: 'Permission granted', matchedRole: 'vaults:admin' };
    vi.mocked(mockPolicyService.checkAccess).mockResolvedValue(expectedDecision);

    let capturedDecision: any;
    app.get('/test', async (request) => {
      await request.requireAccess('vaults', 'create');
      capturedDecision = request.policyDecision;
      return { ok: true };
    });

    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/test',
    });

    expect(response.statusCode).toBe(200);
    expect(capturedDecision).toEqual(expectedDecision);
  });

  it('should call checkAccess with correct parameters', async () => {
    vi.mocked(mockPolicyService.checkAccess).mockResolvedValue({ allowed: true });

    app.get('/test', async (request) => {
      await request.requireAccess('vaults', 'create', { vaultId: 'vault-123' });
      return { ok: true };
    });

    await app.ready();

    await app.inject({
      method: 'GET',
      url: '/test',
    });

    expect(mockPolicyService.checkAccess).toHaveBeenCalledWith({
      userId: 'user-1',
      organisationId: 'org-1',
      module: 'vaults',
      action: 'create',
      resource: { vaultId: 'vault-123' },
    });
  });

  it('should throw OperationForbiddenError when access is denied', async () => {
    // Create a fresh app with error handler for this test
    const testApp = Fastify();
    await testApp.register(errorHandlerPlugin);
    await testApp.register(mockAuthPlugin);
    await testApp.register(policyPlugin, {
      policyService: mockPolicyService,
    });

    vi.mocked(mockPolicyService.checkAccess).mockResolvedValue({
      allowed: false,
      reason: 'No permission for this action',
    });

    testApp.get('/test', async (request) => {
      await request.requireAccess('vaults', 'delete');
      return { ok: true };
    });

    await testApp.ready();

    const response = await testApp.inject({
      method: 'GET',
      url: '/test',
    });

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('No permission for this action');
  });

  it('should throw OperationForbiddenError with default message when no reason provided', async () => {
    // Create a fresh app with error handler for this test
    const testApp = Fastify();
    await testApp.register(errorHandlerPlugin);
    await testApp.register(mockAuthPlugin);
    await testApp.register(policyPlugin, {
      policyService: mockPolicyService,
    });

    vi.mocked(mockPolicyService.checkAccess).mockResolvedValue({
      allowed: false,
    });

    testApp.get('/test', async (request) => {
      await request.requireAccess('vaults', 'delete');
      return { ok: true };
    });

    await testApp.ready();

    const response = await testApp.inject({
      method: 'GET',
      url: '/test',
    });

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Access denied');
  });

  it('should throw OperationForbiddenError when auth context is missing', async () => {
    // Create a new app with auth plugin that doesn't set auth context
    const appWithoutAuth = Fastify();

    // Mock auth plugin that leaves auth as null (simulating unauthenticated request)
    const mockAuthPluginNoAuth = fp(
      async (fastify) => {
        fastify.decorateRequest('auth', null);
        // Don't set auth context - leave it as null
      },
      { name: 'auth' }
    );

    await appWithoutAuth.register(errorHandlerPlugin);
    await appWithoutAuth.register(mockAuthPluginNoAuth);
    await appWithoutAuth.register(policyPlugin, {
      policyService: mockPolicyService,
    });

    appWithoutAuth.get('/test', async (request) => {
      await request.requireAccess('vaults', 'create');
      return { ok: true };
    });

    await appWithoutAuth.ready();

    const response = await appWithoutAuth.inject({
      method: 'GET',
      url: '/test',
    });

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Authentication required');
  });
});
