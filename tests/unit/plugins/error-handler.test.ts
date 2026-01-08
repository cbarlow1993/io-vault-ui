import { NotFoundError } from '@iofinnet/errors-sdk';
import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import errorHandlerPlugin from '@/src/plugins/error-handler.js';

describe('errorHandlerPlugin', () => {
  it('handles ZodError with 400 status', async () => {
    const app = Fastify();
    await app.register(errorHandlerPlugin);

    app.get('/test', async () => {
      throw new ZodError([{ code: 'custom', path: ['field'], message: 'Invalid' }]);
    });

    const response = await app.inject({ method: 'GET', url: '/test' });
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('Bad Request');
  });

  it('handles HttpError from errors-sdk', async () => {
    const app = Fastify();
    await app.register(errorHandlerPlugin);

    app.get('/test', async () => {
      throw new NotFoundError('Resource not found');
    });

    const response = await app.inject({ method: 'GET', url: '/test' });
    expect(response.statusCode).toBe(404);
  });

  it('handles unknown errors with 500', async () => {
    const app = Fastify();
    await app.register(errorHandlerPlugin);

    app.get('/test', async () => {
      throw new Error('Something went wrong');
    });

    const response = await app.inject({ method: 'GET', url: '/test' });
    expect(response.statusCode).toBe(500);
    expect(response.json().message).toBe('An unexpected error occurred');
  });
});
