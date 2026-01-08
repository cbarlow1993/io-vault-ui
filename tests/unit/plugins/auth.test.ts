import Fastify from 'fastify';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import authPlugin from '@/src/plugins/auth.js';
import errorHandlerPlugin from '@/src/plugins/error-handler.js';

// Mock jose library for JWT verification
vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => 'mock-jwks'),
  jwtVerify: vi.fn(),
}));

import { jwtVerify } from 'jose';

describe('authPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('decorates request with auth property using JWT Bearer token', async () => {
    // Mock successful JWT verification
    vi.mocked(jwtVerify).mockResolvedValueOnce({
      payload: {
        sub: 'user-456',
        organisationId: 'org-123',
        scope: 'chains-public other-scope',
        username: 'testuser',
        client_id: 'test-client',
      },
      protectedHeader: { alg: 'RS256' },
    } as any);

    const app = Fastify();
    await app.register(errorHandlerPlugin);
    await app.register(authPlugin, {
      jwksUrl: 'https://example.com/.well-known/jwks.json',
    });

    let authContext: any;
    app.get('/test', async (request) => {
      authContext = request.auth;
      return { ok: true };
    });

    const response = await app.inject({
      method: 'GET',
      url: '/test',
      headers: {
        Authorization: 'Bearer valid-test-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(authContext).toEqual({
      organisationId: 'org-123',
      userId: 'user-456',
      token: 'valid-test-token',
    });
  });

  it('skips auth for public routes', async () => {
    const app = Fastify();
    await app.register(errorHandlerPlugin);
    await app.register(authPlugin, { publicRoutes: ['/v2/chains', '/health'] });

    app.get('/v2/chains', async () => ({ chains: [] }));

    const response = await app.inject({ method: 'GET', url: '/v2/chains' });
    expect(response.statusCode).toBe(200);
  });

  it('returns 401 for missing auth on protected routes', async () => {
    const app = Fastify();
    await app.register(errorHandlerPlugin);
    await app.register(authPlugin, { publicRoutes: ['/health'] });

    app.get('/protected', async () => ({ ok: true }));

    const response = await app.inject({ method: 'GET', url: '/protected' });
    expect(response.statusCode).toBe(401);
  });

  it('returns 401 for invalid JWT token', async () => {
    // Mock JWT verification failure
    vi.mocked(jwtVerify).mockRejectedValueOnce(new Error('Invalid token'));

    const app = Fastify();
    await app.register(errorHandlerPlugin);
    await app.register(authPlugin, {
      jwksUrl: 'https://example.com/.well-known/jwks.json',
    });

    app.get('/protected', async () => ({ ok: true }));

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: {
        Authorization: 'Bearer invalid-token',
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 402 when user lacks required entitlement', async () => {
    // Mock JWT verification with missing entitlement
    vi.mocked(jwtVerify).mockResolvedValueOnce({
      payload: {
        sub: 'user-456',
        organisationId: 'org-123',
        scope: 'some-other-scope', // Missing 'chains-public'
        username: 'testuser',
        client_id: 'test-client',
      },
      protectedHeader: { alg: 'RS256' },
    } as any);

    const app = Fastify();
    await app.register(errorHandlerPlugin);
    await app.register(authPlugin, {
      jwksUrl: 'https://example.com/.well-known/jwks.json',
    });

    app.get('/protected', async () => ({ ok: true }));

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: {
        Authorization: 'Bearer valid-token-no-entitlement',
      },
    });

    expect(response.statusCode).toBe(402);
  });

  it('returns 401 when JWKS is not configured but JWT is provided', async () => {
    const app = Fastify();
    await app.register(errorHandlerPlugin);
    await app.register(authPlugin); // No jwksUrl provided

    app.get('/protected', async () => ({ ok: true }));

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: {
        Authorization: 'Bearer some-token',
      },
    });

    expect(response.statusCode).toBe(401);
  });
});
