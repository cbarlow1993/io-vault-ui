import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { describe, expect, it, vi } from 'vitest';
import chainRoutes from '@/src/routes/chains/index.js';

vi.stubEnv('STAGE', 'dev');

describe('GET /v2/chains', () => {
  it('returns list of supported chains', async () => {
    const app = Fastify().withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    await app.register(chainRoutes, { prefix: '/v2/chains' });
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/v2/chains',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('returns chains with correct structure', async () => {
    const app = Fastify().withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    await app.register(chainRoutes, { prefix: '/v2/chains' });
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/v2/chains',
    });

    expect(response.statusCode).toBe(200);
    const { data } = response.json();
    expect(data.length).toBeGreaterThan(0);

    const chain = data[0];
    expect(chain).toHaveProperty('id');
    expect(chain).toHaveProperty('name');
    expect(chain).toHaveProperty('chainAlias');
    expect(chain).toHaveProperty('ecosystem');
    expect(chain).toHaveProperty('isTestnet');
    expect(chain).toHaveProperty('features');
    expect(chain).toHaveProperty('nativeCurrency');
    expect(chain).toHaveProperty('rpcUrls');
  });

  it('excludes testnets by default', async () => {
    const app = Fastify().withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    await app.register(chainRoutes, { prefix: '/v2/chains' });
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/v2/chains',
    });

    expect(response.statusCode).toBe(200);
    const { data } = response.json();
    const testnetChains = data.filter((chain: any) => chain.isTestnet === true);
    expect(testnetChains.length).toBe(0);
  });

  it('includes testnets when includeTestnets=true', async () => {
    const app = Fastify().withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    await app.register(chainRoutes, { prefix: '/v2/chains' });
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/v2/chains?includeTestnets=true',
    });

    expect(response.statusCode).toBe(200);
    const { data } = response.json();
    const testnetChains = data.filter((chain: any) => chain.isTestnet === true);
    expect(testnetChains.length).toBeGreaterThan(0);
  });

  it('filters chains by ecosystem', async () => {
    const app = Fastify().withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    await app.register(chainRoutes, { prefix: '/v2/chains' });
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/v2/chains?ecosystem=evm',
    });

    expect(response.statusCode).toBe(200);
    const { data } = response.json();
    expect(data.length).toBeGreaterThan(0);
    data.forEach((chain: any) => {
      expect(chain.ecosystem).toBe('evm');
    });
  });

  it('filters chains by specific chain alias', async () => {
    const app = Fastify().withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    await app.register(chainRoutes, { prefix: '/v2/chains' });
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/v2/chains?chain=eth',
    });

    expect(response.statusCode).toBe(200);
    const { data } = response.json();
    expect(data.length).toBe(1);
    expect(data[0].chainAlias).toBe('eth');
  });

  it('filters chains by chainId', async () => {
    const app = Fastify().withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    await app.register(chainRoutes, { prefix: '/v2/chains' });
    await app.ready();

    // Ethereum mainnet chainId is 1
    const response = await app.inject({
      method: 'GET',
      url: '/v2/chains?chainId=1',
    });

    expect(response.statusCode).toBe(200);
    const { data } = response.json();
    expect(data.length).toBeGreaterThan(0);
    data.forEach((chain: any) => {
      expect(chain.id).toBe(1);
    });
  });

  it('returns rpcUrls for each chain', async () => {
    const app = Fastify().withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    await app.register(chainRoutes, { prefix: '/v2/chains' });
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/v2/chains',
    });

    expect(response.statusCode).toBe(200);
    const { data } = response.json();

    data.forEach((chain: any) => {
      expect(chain).toHaveProperty('rpcUrls');
      expect(chain.rpcUrls).toHaveProperty('iofinnet');
      expect(chain.rpcUrls.iofinnet).toHaveProperty('http');
      expect(Array.isArray(chain.rpcUrls.iofinnet.http)).toBe(true);
      expect(chain.rpcUrls.iofinnet.http[0]).toContain('https://nodes.iofinnet.com/');
    });
  });
});
