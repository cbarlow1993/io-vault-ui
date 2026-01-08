import Fastify from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubEnv('STAGE', 'dev');

describe('swaggerPlugin', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('registers swagger and serves /docs in non-prod', async () => {
    vi.stubEnv('STAGE', 'dev');
    const { default: swaggerPlugin } = await import('@/src/plugins/swagger.js');

    const app = Fastify();
    await app.register(swaggerPlugin);
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/docs',
    });

    expect([200, 302]).toContain(response.statusCode);
  });

  it('exposes OpenAPI JSON at /docs/json', async () => {
    vi.stubEnv('STAGE', 'dev');
    const { default: swaggerPlugin } = await import('@/src/plugins/swagger.js');

    const app = Fastify();
    await app.register(swaggerPlugin);
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/docs/json',
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.openapi).toBe('3.1.0');
    expect(json.info.title).toBe('io-vault Multi-Chain Core API');
  });
});
