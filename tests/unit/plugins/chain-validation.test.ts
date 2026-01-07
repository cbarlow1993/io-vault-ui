import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import chainValidationPlugin from '@/src/plugins/chain-validation.js';
import errorHandlerPlugin from '@/src/plugins/error-handler.js';

// Mock the Chain SDK
vi.mock('@iofinnet/io-core-dapp-utils-chains-sdk', () => ({
  Chain: {
    fromAlias: vi.fn().mockImplementation(async (alias: string) => {
      if (alias === 'ethereum') {
        return {
          alias: 'ethereum',
          isEcosystem: (eco: string) => eco === 'evm',
        };
      }
      if (alias === 'unknown') {
        throw new Error('Unknown chain');
      }
      return {
        alias,
        isEcosystem: () => false,
      };
    }),
  },
}));

describe('chainValidationPlugin', () => {
  it('decorates request with resolved chain', async () => {
    const app = Fastify();
    await app.register(errorHandlerPlugin);
    await app.register(chainValidationPlugin);

    let resolvedChain: any;
    app.get('/ecosystem/:ecosystem/chain/:chainAlias', async (request) => {
      resolvedChain = request.chain;
      return { ok: true };
    });

    await app.inject({
      method: 'GET',
      url: '/ecosystem/evm/chain/ethereum',
    });

    expect(resolvedChain).toBeDefined();
    expect(resolvedChain.alias).toBe('ethereum');
  });

  it('returns 400 for invalid ecosystem/chain combo', async () => {
    const app = Fastify();
    await app.register(errorHandlerPlugin);
    await app.register(chainValidationPlugin);

    app.get('/ecosystem/:ecosystem/chain/:chainAlias', async () => ({ ok: true }));

    const response = await app.inject({
      method: 'GET',
      url: '/ecosystem/svm/chain/ethereum',
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 for unknown chain', async () => {
    const app = Fastify();
    await app.register(errorHandlerPlugin);
    await app.register(chainValidationPlugin);

    app.get('/ecosystem/:ecosystem/chain/:chainAlias', async () => ({ ok: true }));

    const response = await app.inject({
      method: 'GET',
      url: '/ecosystem/evm/chain/unknown',
    });

    expect(response.statusCode).toBe(400);
  });

  it('skips validation when no ecosystem/chain params', async () => {
    const app = Fastify();
    await app.register(errorHandlerPlugin);
    await app.register(chainValidationPlugin);

    app.get('/other', async () => ({ ok: true }));

    const response = await app.inject({
      method: 'GET',
      url: '/other',
    });

    expect(response.statusCode).toBe(200);
  });
});
