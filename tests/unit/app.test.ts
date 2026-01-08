import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '@/src/app.js';

vi.stubEnv('STAGE', 'dev');

describe('buildApp', () => {
  it('creates a Fastify instance', async () => {
    const app = buildApp();
    await app.ready();
    expect(app).toBeDefined();
    expect(app.server).toBeDefined();
  });

  it('responds to health check', async () => {
    const app = buildApp();
    await app.ready();
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('exposes swagger docs in dev', async () => {
    const app = buildApp();
    await app.ready();
    const response = await app.inject({
      method: 'GET',
      url: '/docs',
    });
    expect(response.statusCode).toBe(200);
  });
});
