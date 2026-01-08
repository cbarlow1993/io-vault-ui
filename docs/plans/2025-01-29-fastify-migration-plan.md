# Fastify Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate services/core from individual Lambda handlers with Middy to a Zod-typed Fastify application supporting dual deployment (Lambda and container).

**Architecture:** Single Fastify app factory (`buildApp()`) with plugin-based middleware. Two entry points: `lambda.ts` for AWS Lambda via @fastify/aws-lambda, `server.ts` for container/local. Domain-based route plugins for addresses, transactions, balances, chains.

**Tech Stack:** Fastify 5, @fastify/aws-lambda, fastify-type-provider-zod, fastify-aws-powertools, @fastify/swagger

**Design Document:** `docs/plans/2025-01-29-fastify-migration-design.md`

**Pre-existing Test Failures:** 2 tests failing before migration (build-transaction.test.ts, create-transaction-schema.test.ts) - not related to this work.

---

## Phase 1: Foundation Setup

### Task 1: Install Dependencies

**Files:**
- Modify: `services/core/package.json`

**Step 1: Add Fastify dependencies**

```bash
cd services/core && npm install fastify@^5.0.0 @fastify/aws-lambda@^5.0.0 @fastify/swagger@^9.0.0 @fastify/swagger-ui@^5.0.0 fastify-type-provider-zod@^4.0.0 fastify-aws-powertools@^3.0.0 fastify-plugin@^5.0.0
```

**Step 2: Verify installation**

Run: `cd services/core && npm ls fastify`
Expected: Shows fastify@5.x.x installed

**Step 3: Commit**

```bash
git add services/core/package.json services/core/package-lock.json
git commit -m "chore(core): add Fastify dependencies for migration"
```

---

### Task 2: Create App Factory

**Files:**
- Create: `services/core/src/app.ts`
- Test: `services/core/tests/unit/app.test.ts`

**Step 1: Write the failing test**

Create `services/core/tests/unit/app.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildApp } from '../../src/app';

describe('buildApp', () => {
  it('creates a Fastify instance', async () => {
    const app = buildApp();
    expect(app).toBeDefined();
    expect(app.server).toBeDefined();
  });

  it('responds to health check', async () => {
    const app = buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/core && npx vitest run tests/unit/app.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

Create `services/core/src/app.ts`:

```typescript
import Fastify, { FastifyInstance } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';

export interface BuildAppOptions {
  logger?: boolean;
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? false,
  }).withTypeProvider<ZodTypeProvider>();

  // Zod integration
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Health check
  app.get('/health', async () => {
    return { status: 'ok' };
  });

  return app;
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/core && npx vitest run tests/unit/app.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/core/src/app.ts services/core/tests/unit/app.test.ts
git commit -m "feat(core): add Fastify app factory with health check"
```

---

### Task 3: Create Lambda Entry Point

**Files:**
- Create: `services/core/src/lambda.ts`
- Test: `services/core/tests/unit/lambda.test.ts`

**Step 1: Write the failing test**

Create `services/core/tests/unit/lambda.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { handler } from '../../src/lambda';

describe('Lambda handler', () => {
  it('exports a handler function', () => {
    expect(handler).toBeDefined();
    expect(typeof handler).toBe('function');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/core && npx vitest run tests/unit/lambda.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

Create `services/core/src/lambda.ts`:

```typescript
import awsLambdaFastify from '@fastify/aws-lambda';
import { buildApp } from './app';

const app = buildApp();

export const handler = awsLambdaFastify(app, {
  decorateRequest: true,
});
```

**Step 4: Run test to verify it passes**

Run: `cd services/core && npx vitest run tests/unit/lambda.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/core/src/lambda.ts services/core/tests/unit/lambda.test.ts
git commit -m "feat(core): add Lambda entry point"
```

---

### Task 4: Create Server Entry Point

**Files:**
- Create: `services/core/src/server.ts`

**Step 1: Write the server entry point**

Create `services/core/src/server.ts`:

```typescript
import { buildApp } from './app';

const app = buildApp({ logger: true });

const start = async () => {
  try {
    const port = parseInt(process.env.PORT ?? '3000', 10);
    const host = process.env.HOST ?? '0.0.0.0';
    await app.listen({ port, host });
    console.log(`Server listening on http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
```

**Step 2: Add npm script for local dev**

Add to `services/core/package.json` scripts:

```json
"dev": "tsx watch src/server.ts",
"start": "node dist/server.js"
```

**Step 3: Verify it starts**

Run: `cd services/core && npm run dev`
Expected: "Server listening on http://0.0.0.0:3000"
(Ctrl+C to stop)

**Step 4: Commit**

```bash
git add services/core/src/server.ts services/core/package.json
git commit -m "feat(core): add server entry point for container/local"
```

---

## Phase 2: Plugins

### Task 5: Create Error Handler Plugin

**Files:**
- Create: `services/core/src/plugins/error-handler.ts`
- Test: `services/core/tests/unit/plugins/error-handler.test.ts`

**Step 1: Write the failing test**

Create `services/core/tests/unit/plugins/error-handler.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { ZodError, z } from 'zod';
import { BadRequestError, NotFoundError, AuthorizationError } from '@iofinnet/errors-sdk';
import errorHandlerPlugin from '../../../src/plugins/error-handler';

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
```

**Step 2: Run test to verify it fails**

Run: `cd services/core && npx vitest run tests/unit/plugins/error-handler.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Create `services/core/src/plugins/error-handler.ts`:

```typescript
import fp from 'fastify-plugin';
import { FastifyInstance, FastifyError } from 'fastify';
import { ZodError } from 'zod';
import { HttpError } from '@iofinnet/errors-sdk';

async function errorHandlerPlugin(fastify: FastifyInstance) {
  fastify.setErrorHandler((error, request, reply) => {
    const logger = request.log;

    // Zod validation errors
    if (error instanceof ZodError) {
      logger.warn({ error: error.issues }, 'Validation error');
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Validation failed',
        details: error.issues,
      });
    }

    // @iofinnet/errors-sdk errors
    if (error instanceof HttpError) {
      const statusCode = error.statusCode ?? 500;
      logger.warn({ error }, `HTTP error: ${statusCode}`);
      return reply.status(statusCode).send({
        error: error.name,
        message: error.message,
      });
    }

    // Fastify validation errors
    if ((error as FastifyError).validation) {
      logger.warn({ error }, 'Fastify validation error');
      return reply.status(400).send({
        error: 'Bad Request',
        message: error.message,
      });
    }

    // Unexpected errors
    logger.error({ error }, 'Unhandled error');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  });
}

export default fp(errorHandlerPlugin, { name: 'error-handler' });
```

**Step 4: Run test to verify it passes**

Run: `cd services/core && npx vitest run tests/unit/plugins/error-handler.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/core/src/plugins/error-handler.ts services/core/tests/unit/plugins/error-handler.test.ts
git commit -m "feat(core): add error handler plugin"
```

---

### Task 6: Create Auth Plugin

**Files:**
- Create: `services/core/src/plugins/auth.ts`
- Test: `services/core/tests/unit/plugins/auth.test.ts`

**Step 1: Write the failing test**

Create `services/core/tests/unit/plugins/auth.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import authPlugin from '../../../src/plugins/auth';

describe('authPlugin', () => {
  it('decorates request with auth property', async () => {
    const app = Fastify();
    await app.register(authPlugin);

    let authContext: any;
    app.get('/test', async (request) => {
      authContext = request.auth;
      return { ok: true };
    });

    // Simulate Lambda event with authorizer context
    await app.inject({
      method: 'GET',
      url: '/test',
      headers: {
        'x-organisation-id': 'org-123',
        'x-user-id': 'user-456',
      },
    });

    // In Lambda mode, auth would come from event; in test we simulate via headers
  });

  it('skips auth for public routes', async () => {
    const app = Fastify();
    await app.register(authPlugin, { publicRoutes: ['/v2/chains', '/health'] });

    app.get('/v2/chains', async () => ({ chains: [] }));

    const response = await app.inject({ method: 'GET', url: '/v2/chains' });
    expect(response.statusCode).toBe(200);
  });

  it('returns 401 for missing auth on protected routes', async () => {
    const app = Fastify();
    await app.register(authPlugin, { publicRoutes: ['/health'] });

    app.get('/protected', async (request) => {
      if (!request.auth) throw new Error('No auth');
      return { ok: true };
    });

    // Without Lambda context or JWT, should fail
    // This tests container mode behavior
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/core && npx vitest run tests/unit/plugins/auth.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Create `services/core/src/plugins/auth.ts`:

```typescript
import fp from 'fastify-plugin';
import { FastifyInstance, FastifyRequest } from 'fastify';
import { AuthorizationError, PaymentRequiredError } from '@iofinnet/errors-sdk';

export interface AuthContext {
  organisationId: string;
  userId: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext | null;
  }
}

export interface AuthPluginOptions {
  publicRoutes?: string[];
}

const VAULT_ENTITLEMENT_NAME = 'chains-public';

function isPublicRoute(url: string, publicRoutes: string[]): boolean {
  const path = url.split('?')[0];
  return publicRoutes.some((route) => {
    if (route.endsWith('*')) {
      return path.startsWith(route.slice(0, -1));
    }
    return path === route;
  });
}

async function authPlugin(
  fastify: FastifyInstance,
  options: AuthPluginOptions = {}
) {
  const publicRoutes = options.publicRoutes ?? ['/health', '/v2/chains'];

  fastify.decorateRequest('auth', null);

  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    // Skip auth for public routes
    if (isPublicRoute(request.url, publicRoutes)) {
      return;
    }

    // Mode 1: Lambda with API Gateway authorizer
    const lambdaEvent = (request as any).awsLambda?.event;
    if (lambdaEvent?.requestContext?.authorizer?.lambda) {
      const { organisationId, userSub, scope } =
        lambdaEvent.requestContext.authorizer.lambda;

      if (!scope?.includes(VAULT_ENTITLEMENT_NAME)) {
        throw new PaymentRequiredError('not entitled');
      }

      request.auth = { organisationId, userId: userSub };
      return;
    }

    // Mode 2: Container/standalone - check for test headers (dev only)
    // In production container mode, implement full JWT validation here
    const orgHeader = request.headers['x-organisation-id'];
    const userHeader = request.headers['x-user-id'];

    if (orgHeader && userHeader) {
      request.auth = {
        organisationId: orgHeader as string,
        userId: userHeader as string,
      };
      return;
    }

    // Mode 3: JWT Bearer token (container mode - TODO: implement full validation)
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      // TODO: Implement full JWT validation with JWKS, expiry, issuer, audience
      // For now, throw to indicate auth required
      throw new AuthorizationError('JWT validation not yet implemented');
    }

    throw new AuthorizationError('Authentication required');
  });
}

export default fp(authPlugin, { name: 'auth' });
```

**Step 4: Run test to verify it passes**

Run: `cd services/core && npx vitest run tests/unit/plugins/auth.test.ts`
Expected: PASS (or partial - adjust test expectations)

**Step 5: Commit**

```bash
git add services/core/src/plugins/auth.ts services/core/tests/unit/plugins/auth.test.ts
git commit -m "feat(core): add auth plugin with Lambda and container mode support"
```

---

### Task 7: Create Chain Validation Plugin

**Files:**
- Create: `services/core/src/plugins/chain-validation.ts`
- Test: `services/core/tests/unit/plugins/chain-validation.test.ts`

**Step 1: Write the failing test**

Create `services/core/tests/unit/plugins/chain-validation.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import Fastify from 'fastify';
import chainValidationPlugin from '../../../src/plugins/chain-validation';

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
    await app.register(chainValidationPlugin);

    let resolvedChain: any;
    app.get('/ecosystem/:ecosystem/chain/:chain', async (request) => {
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
    await app.register(chainValidationPlugin);

    app.get('/ecosystem/:ecosystem/chain/:chain', async () => ({ ok: true }));

    const response = await app.inject({
      method: 'GET',
      url: '/ecosystem/svm/chain/ethereum', // ethereum is not SVM
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 for unknown chain', async () => {
    const app = Fastify();
    await app.register(chainValidationPlugin);

    app.get('/ecosystem/:ecosystem/chain/:chain', async () => ({ ok: true }));

    const response = await app.inject({
      method: 'GET',
      url: '/ecosystem/evm/chain/unknown',
    });

    expect(response.statusCode).toBe(400);
  });

  it('skips validation when no ecosystem/chain params', async () => {
    const app = Fastify();
    await app.register(chainValidationPlugin);

    app.get('/other', async () => ({ ok: true }));

    const response = await app.inject({
      method: 'GET',
      url: '/other',
    });

    expect(response.statusCode).toBe(200);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/core && npx vitest run tests/unit/plugins/chain-validation.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Create `services/core/src/plugins/chain-validation.ts`:

```typescript
import fp from 'fastify-plugin';
import { FastifyInstance, FastifyRequest } from 'fastify';
import { Chain } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { BadRequestError } from '@iofinnet/errors-sdk';

declare module 'fastify' {
  interface FastifyRequest {
    chain: Chain | null;
  }
}

async function chainValidationPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('chain', null);

  fastify.addHook('preHandler', async (request: FastifyRequest) => {
    const params = request.params as { ecosystem?: string; chain?: string };
    const { ecosystem, chain: alias } = params;

    // Skip if route doesn't have these params
    if (!ecosystem && !alias) {
      return;
    }

    // Both must be present if either is
    if (!ecosystem || !alias) {
      throw new BadRequestError('Both ecosystem and chain are required');
    }

    try {
      const chain = await Chain.fromAlias(alias);

      if (!chain.isEcosystem(ecosystem)) {
        throw new BadRequestError(
          `Chain "${alias}" is not supported for ecosystem "${ecosystem}"`
        );
      }

      request.chain = chain;
    } catch (error) {
      if (error instanceof BadRequestError) {
        throw error;
      }
      throw new BadRequestError(`Unknown chain "${alias}"`);
    }
  });
}

export default fp(chainValidationPlugin, { name: 'chain-validation' });
```

**Step 4: Run test to verify it passes**

Run: `cd services/core && npx vitest run tests/unit/plugins/chain-validation.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/core/src/plugins/chain-validation.ts services/core/tests/unit/plugins/chain-validation.test.ts
git commit -m "feat(core): add chain validation plugin"
```

---

### Task 8: Create Swagger Plugin

**Files:**
- Create: `services/core/src/plugins/swagger.ts`
- Test: `services/core/tests/unit/plugins/swagger.test.ts`

**Step 1: Write the failing test**

Create `services/core/tests/unit/plugins/swagger.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

// Must mock before import
vi.stubEnv('STAGE', 'dev');

describe('swaggerPlugin', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('registers swagger and serves /docs in non-prod', async () => {
    vi.stubEnv('STAGE', 'dev');
    const { default: swaggerPlugin } = await import('../../../src/plugins/swagger');

    const app = Fastify();
    await app.register(swaggerPlugin);
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/docs',
    });

    // Swagger UI returns HTML or redirect
    expect([200, 302]).toContain(response.statusCode);
  });

  it('exposes OpenAPI JSON at /docs/json', async () => {
    vi.stubEnv('STAGE', 'dev');
    const { default: swaggerPlugin } = await import('../../../src/plugins/swagger');

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
```

**Step 2: Run test to verify it fails**

Run: `cd services/core && npx vitest run tests/unit/plugins/swagger.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Create `services/core/src/plugins/swagger.ts`:

```typescript
import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';

async function swaggerPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'io-vault Multi-Chain Core API',
        version: '1.0.0',
        description: 'Core service for multi-chain vault management',
      },
      servers: [
        { url: 'https://api.dev.iodevnet.com', description: 'Development' },
        { url: 'https://api.staging.iodevnet.com', description: 'Staging' },
        { url: 'https://api.iofinnet.com', description: 'Production' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    transform: jsonSchemaTransform,
  });

  // Only enable UI in non-production
  if (process.env.STAGE !== 'prod') {
    await fastify.register(fastifySwaggerUi, {
      routePrefix: '/docs',
    });
  }
}

export default fp(swaggerPlugin, { name: 'swagger' });
```

**Step 4: Run test to verify it passes**

Run: `cd services/core && npx vitest run tests/unit/plugins/swagger.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/core/src/plugins/swagger.ts services/core/tests/unit/plugins/swagger.test.ts
git commit -m "feat(core): add swagger plugin for OpenAPI generation"
```

---

### Task 9: Create Plugins Index

**Files:**
- Create: `services/core/src/plugins/index.ts`

**Step 1: Create plugins index**

Create `services/core/src/plugins/index.ts`:

```typescript
export { default as errorHandlerPlugin } from './error-handler';
export { default as authPlugin } from './auth';
export { default as chainValidationPlugin } from './chain-validation';
export { default as swaggerPlugin } from './swagger';
```

**Step 2: Commit**

```bash
git add services/core/src/plugins/index.ts
git commit -m "feat(core): add plugins index"
```

---

### Task 10: Integrate Plugins into App

**Files:**
- Modify: `services/core/src/app.ts`
- Modify: `services/core/tests/unit/app.test.ts`

**Step 1: Update app.ts to register plugins**

Update `services/core/src/app.ts`:

```typescript
import Fastify, { FastifyInstance } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { fastifyAwsPowertools } from 'fastify-aws-powertools';
import {
  errorHandlerPlugin,
  authPlugin,
  swaggerPlugin,
} from './plugins';

export interface BuildAppOptions {
  logger?: boolean;
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? false,
  }).withTypeProvider<ZodTypeProvider>();

  // Zod integration
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Core plugins
  app.register(fastifyAwsPowertools);
  app.register(swaggerPlugin);
  app.register(errorHandlerPlugin);
  app.register(authPlugin);

  // Health check (public)
  app.get('/health', async () => {
    return { status: 'ok' };
  });

  return app;
}
```

**Step 2: Update tests**

Update `services/core/tests/unit/app.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { buildApp } from '../../src/app';

// Stub env for swagger
vi.stubEnv('STAGE', 'dev');

describe('buildApp', () => {
  it('creates a Fastify instance', async () => {
    const app = buildApp();
    await app.ready();
    expect(app).toBeDefined();
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

  it('has swagger docs available', async () => {
    const app = buildApp();
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/docs/json',
    });

    expect(response.statusCode).toBe(200);
  });
});
```

**Step 3: Run tests**

Run: `cd services/core && npx vitest run tests/unit/app.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add services/core/src/app.ts services/core/tests/unit/app.test.ts
git commit -m "feat(core): integrate all plugins into app factory"
```

---

## Phase 3: Routes - Chains (Simplest First)

### Task 11: Create Chains Route

**Files:**
- Create: `services/core/src/routes/chains/index.ts`
- Create: `services/core/src/routes/chains/handlers.ts`
- Create: `services/core/src/routes/chains/schemas.ts`
- Test: `services/core/tests/unit/routes/chains/chains.test.ts`

**Step 1: Write the failing test**

Create `services/core/tests/unit/routes/chains/chains.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';
import chainRoutes from '../../../../src/routes/chains';

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
    const data = response.json();
    expect(Array.isArray(data)).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/core && npx vitest run tests/unit/routes/chains/chains.test.ts`
Expected: FAIL

**Step 3: Create schemas**

Create `services/core/src/routes/chains/schemas.ts`:

```typescript
import { z } from 'zod';

export const chainSchema = z.object({
  alias: z.string(),
  name: z.string(),
  ecosystem: z.string(),
  isTestnet: z.boolean(),
  nativeCurrency: z.object({
    symbol: z.string(),
    decimals: z.number(),
  }).optional(),
});

export const listChainsResponseSchema = z.array(chainSchema);

export type Chain = z.infer<typeof chainSchema>;
```

**Step 4: Create handlers**

Create `services/core/src/routes/chains/handlers.ts`:

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { getSupportedChains } from '@/services/core/src/services/chains';

export async function listChains(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  const chains = await getSupportedChains();
  return reply.send(chains);
}
```

**Step 5: Create route plugin**

Create `services/core/src/routes/chains/index.ts`:

```typescript
import { FastifyInstance } from 'fastify';
import { listChainsResponseSchema } from './schemas';
import { listChains } from './handlers';

export default async function chainRoutes(fastify: FastifyInstance) {
  fastify.get('/', {
    schema: {
      tags: ['Chains'],
      summary: 'List all supported chains',
      response: {
        200: listChainsResponseSchema,
      },
    },
  }, listChains);
}
```

**Step 6: Run test to verify it passes**

Run: `cd services/core && npx vitest run tests/unit/routes/chains/chains.test.ts`
Expected: PASS

**Step 7: Commit**

```bash
git add services/core/src/routes/chains/
git add services/core/tests/unit/routes/chains/
git commit -m "feat(core): add chains route"
```

---

### Task 12: Create Routes Index and Register in App

**Files:**
- Create: `services/core/src/routes/index.ts`
- Modify: `services/core/src/app.ts`

**Step 1: Create routes index**

Create `services/core/src/routes/index.ts`:

```typescript
import { FastifyInstance } from 'fastify';
import chainRoutes from './chains';

export async function routes(fastify: FastifyInstance) {
  // Public routes (no auth required)
  fastify.register(chainRoutes, { prefix: '/v2/chains' });

  // Protected routes will be added here:
  // fastify.register(addressRoutes, { prefix: '/v2/vaults/:vaultId/addresses' });
  // fastify.register(balanceRoutes, { prefix: '/v2/balances' });
  // fastify.register(transactionRoutes, { prefix: '/v2/transactions' });
}
```

**Step 2: Update app.ts to register routes**

Update `services/core/src/app.ts` to add:

```typescript
import { routes } from './routes';

// After plugin registration, add:
app.register(routes);
```

**Step 3: Test the full app**

Run: `cd services/core && npx vitest run tests/unit/app.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add services/core/src/routes/index.ts services/core/src/app.ts
git commit -m "feat(core): register routes in app"
```

---

## Phase 4: Migrate Address Routes

### Task 13: Create Address Schemas

**Files:**
- Create: `services/core/src/routes/addresses/schemas.ts`

**Step 1: Create address schemas**

Create `services/core/src/routes/addresses/schemas.ts`:

```typescript
import { z } from 'zod';

// Shared components
const ecosystemEnum = z.enum(['evm', 'svm', 'tvm', 'utxo', 'xrp', 'substrate']);
const addressString = z.string().min(1);

// Path params
export const vaultIdParamsSchema = z.object({
  vaultId: z.string().uuid(),
});

export const addressPathParamsSchema = vaultIdParamsSchema.extend({
  ecosystem: ecosystemEnum,
  chain: z.string().min(1),
});

export const fullAddressParamsSchema = addressPathParamsSchema.extend({
  address: addressString,
});

// Query params
export const listAddressesQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50).optional(),
  cursor: z.string().optional(),
});

// Request bodies
export const createAddressBodySchema = z.object({
  address: addressString,
  derivationPath: z.string().nullable().optional(),
  monitor: z.boolean().default(false),
  alias: z.string().nullable().optional(),
});

export const updateAddressBodySchema = z.object({
  alias: z.string().nullable().optional(),
});

// Response schemas
export const addressResponseSchema = z.object({
  address: addressString,
  chain: z.string(),
  vaultId: z.string().uuid(),
  workspaceId: z.string(),
  organisationId: z.string(),
  status: z.enum(['monitored', 'unmonitored']),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  alias: z.string().nullable().optional(),
  derivationPath: z.string().nullable().optional(),
  ecosystem: z.string(),
});

export const addressListResponseSchema = z.object({
  items: z.array(addressResponseSchema),
  cursor: z.string().nullable().optional(),
});

// Type exports
export type VaultIdParams = z.infer<typeof vaultIdParamsSchema>;
export type AddressPathParams = z.infer<typeof addressPathParamsSchema>;
export type FullAddressParams = z.infer<typeof fullAddressParamsSchema>;
export type ListAddressesQuery = z.infer<typeof listAddressesQuerySchema>;
export type CreateAddressBody = z.infer<typeof createAddressBodySchema>;
export type UpdateAddressBody = z.infer<typeof updateAddressBodySchema>;
```

**Step 2: Commit**

```bash
git add services/core/src/routes/addresses/schemas.ts
git commit -m "feat(core): add address route schemas"
```

---

### Task 14: Create Address Handlers

**Files:**
- Create: `services/core/src/routes/addresses/handlers.ts`

**Step 1: Create address handlers**

Create `services/core/src/routes/addresses/handlers.ts`:

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { StatusCode } from '@iofinnet/http-sdk';
import { InternalServerError } from '@iofinnet/errors-sdk';
import { Address } from '@/services/core/src/services/addresses/address';
import { getAddressItem } from '@/services/core/src/services/addresses/ddb';
import { formatAddressFromDynamoDB } from '@/services/core/src/services/addresses/formatter';
import {
  createAddress as createAddressDb,
  remonitorAddress,
} from '@/services/core/src/services/addresses/index';
import { AddressKeys, Status } from '@/services/core/src/services/addresses/keys';
import { startPipelines } from '@/services/core/src/services/addresses/pipelines';
import { getWorkspaceId } from '@/services/core/src/services/vaults/vaults';
import { getEnvironmentVariable } from '@/utils/getEnvironmentVariable';
import { tryCatch } from '@/utils/try-catch';
import { logger } from '@/utils/powertools';
import type {
  VaultIdParams,
  AddressPathParams,
  FullAddressParams,
  ListAddressesQuery,
  CreateAddressBody,
  UpdateAddressBody,
} from './schemas';

const SYNC_ADDRESS_ENABLED = getEnvironmentVariable('SYNC_ADDRESS_ENABLED');

// GET /v2/vaults/:vaultId/addresses
export async function listAddresses(
  request: FastifyRequest<{ Params: VaultIdParams; Querystring: ListAddressesQuery }>,
  reply: FastifyReply
) {
  const { vaultId } = request.params;
  const { limit, cursor } = request.query;
  const { organisationId } = request.auth!;

  // Reuse existing service logic
  const { listAddressesByVault } = await import(
    '@/services/core/src/services/addresses/index'
  );

  const result = await listAddressesByVault({
    vaultId,
    organisationId,
    limit,
    cursor,
  });

  return reply.send(result);
}

// POST /v2/vaults/:vaultId/addresses/ecosystem/:ecosystem/chain/:chain
export async function createAddress(
  request: FastifyRequest<{ Params: AddressPathParams; Body: CreateAddressBody }>,
  reply: FastifyReply
) {
  const { address, derivationPath, monitor = false, alias } = request.body;
  const { vaultId, ecosystem } = request.params;
  const { organisationId } = request.auth!;
  const chain = request.chain!;
  const chainAlias = chain.alias;

  const [{ data: workspaceId, error: workspaceIdError }, { error: validationError }] =
    await Promise.all([
      tryCatch(getWorkspaceId(vaultId, true)),
      tryCatch(
        Address.validateAgainstVault({
          chainAlias,
          address,
          derivationPath,
          vaultId,
        })
      ),
    ]);

  if (validationError) {
    logger.error('Error validating address', {
      error: validationError,
      address,
      chainAlias,
      vaultId,
    });
    throw validationError;
  }

  if (!workspaceId || workspaceIdError) {
    logger.error('Error getting workspace id', { error: workspaceIdError, vaultId });
    throw workspaceIdError ?? new Error('Error getting workspace id');
  }

  const status = monitor ? Status.MONITORED : Status.UNMONITORED;

  // Fetch existing address variants
  const [monitored, unmonitored] = await Promise.all([
    getAddressItem({
      PK: AddressKeys.pk(address),
      SK: AddressKeys.sk(chainAlias, Status.MONITORED),
    }),
    getAddressItem({
      PK: AddressKeys.pk(address),
      SK: AddressKeys.sk(chainAlias, Status.UNMONITORED),
    }),
  ]);

  const monitoredAddress = monitored ? formatAddressFromDynamoDB(monitored) : undefined;
  const unmonitoredAddress = unmonitored ? formatAddressFromDynamoDB(unmonitored) : undefined;

  let addressRecord: any;
  let isNew = false;
  let shouldMonitor = false;

  const input = {
    address,
    chain: chainAlias,
    vaultId,
    workspaceId,
    organisationId,
    derivationPath,
    ecosystem,
    alias,
  };

  if (status === Status.MONITORED) {
    if (monitoredAddress) {
      addressRecord = monitoredAddress;
    } else if (unmonitoredAddress) {
      addressRecord = await remonitorAddress({ address, chain: chainAlias });
      shouldMonitor = true;
    } else {
      addressRecord = await createAddressDb({ input, monitored: Status.MONITORED });
      isNew = true;
      shouldMonitor = true;
    }
  } else {
    if (unmonitoredAddress) {
      addressRecord = unmonitoredAddress;
    } else if (monitoredAddress) {
      addressRecord = monitoredAddress;
    } else {
      addressRecord = await createAddressDb({ input, monitored: Status.UNMONITORED });
      isNew = true;
    }
  }

  if (!addressRecord) {
    throw new InternalServerError('Failed to create or retrieve address record');
  }

  if (shouldMonitor && SYNC_ADDRESS_ENABLED === 'true') {
    await startPipelines({
      enableSync: true,
      address,
      chainAlias,
      ecosystem,
    });
  }

  const statusCode = isNew ? 201 : 200;
  return reply.status(statusCode).send(addressRecord);
}

// GET /v2/vaults/:vaultId/addresses/ecosystem/:ecosystem/chain/:chain/address/:address
export async function getAddressDetails(
  request: FastifyRequest<{ Params: FullAddressParams }>,
  reply: FastifyReply
) {
  const { vaultId, address } = request.params;
  const chain = request.chain!;

  const { getAddressDetails: getDetails } = await import(
    '@/services/core/src/services/addresses/index'
  );

  const result = await getDetails({
    address,
    chain: chain.alias,
    vaultId,
  });

  return reply.send(result);
}

// Additional handlers: updateAddress, monitorAddress, unmonitorAddress...
// These follow the same pattern - extract params from request, call service, return response
```

**Step 2: Commit**

```bash
git add services/core/src/routes/addresses/handlers.ts
git commit -m "feat(core): add address route handlers"
```

---

### Task 15: Create Address Routes

**Files:**
- Create: `services/core/src/routes/addresses/index.ts`
- Test: `services/core/tests/unit/routes/addresses/addresses.test.ts`

**Step 1: Write the failing test**

Create `services/core/tests/unit/routes/addresses/addresses.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';
import addressRoutes from '../../../../src/routes/addresses';
import authPlugin from '../../../../src/plugins/auth';
import chainValidationPlugin from '../../../../src/plugins/chain-validation';
import errorHandlerPlugin from '../../../../src/plugins/error-handler';

// Mock services
vi.mock('@/services/core/src/services/addresses/index', () => ({
  listAddressesByVault: vi.fn().mockResolvedValue({ items: [], cursor: null }),
  createAddress: vi.fn().mockResolvedValue({
    address: '0x123',
    chain: 'ethereum',
    vaultId: '550e8400-e29b-41d4-a716-446655440000',
    status: 'monitored',
  }),
}));

vi.mock('@iofinnet/io-core-dapp-utils-chains-sdk', () => ({
  Chain: {
    fromAlias: vi.fn().mockResolvedValue({
      alias: 'ethereum',
      isEcosystem: () => true,
    }),
  },
}));

describe('Address Routes', () => {
  const buildTestApp = async () => {
    const app = Fastify().withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    await app.register(errorHandlerPlugin);
    await app.register(authPlugin, { publicRoutes: [] });
    await app.register(addressRoutes, { prefix: '/v2/vaults/:vaultId/addresses' });

    return app;
  };

  it('GET /v2/vaults/:vaultId/addresses returns address list', async () => {
    const app = await buildTestApp();
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/v2/vaults/550e8400-e29b-41d4-a716-446655440000/addresses',
      headers: {
        'x-organisation-id': 'org-123',
        'x-user-id': 'user-456',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty('items');
  });

  it('POST requires authentication', async () => {
    const app = await buildTestApp();
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/v2/vaults/550e8400-e29b-41d4-a716-446655440000/addresses/ecosystem/evm/chain/ethereum',
      payload: { address: '0x123' },
      // No auth headers
    });

    expect(response.statusCode).toBe(401);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/core && npx vitest run tests/unit/routes/addresses/addresses.test.ts`
Expected: FAIL

**Step 3: Create route plugin**

Create `services/core/src/routes/addresses/index.ts`:

```typescript
import { FastifyInstance } from 'fastify';
import { chainValidationPlugin } from '../../plugins';
import * as handlers from './handlers';
import * as schemas from './schemas';

export default async function addressRoutes(fastify: FastifyInstance) {
  // Apply chain validation to routes that need it
  fastify.register(async (scopedFastify) => {
    scopedFastify.register(chainValidationPlugin);

    // Create address
    scopedFastify.post('/ecosystem/:ecosystem/chain/:chain', {
      schema: {
        tags: ['Addresses'],
        summary: 'Create address for vault',
        params: schemas.addressPathParamsSchema,
        body: schemas.createAddressBodySchema,
        response: {
          200: schemas.addressResponseSchema,
          201: schemas.addressResponseSchema,
        },
      },
    }, handlers.createAddress);

    // Get address details
    scopedFastify.get('/ecosystem/:ecosystem/chain/:chain/address/:address', {
      schema: {
        tags: ['Addresses'],
        summary: 'Get address details',
        params: schemas.fullAddressParamsSchema,
        response: {
          200: schemas.addressResponseSchema,
        },
      },
    }, handlers.getAddressDetails);

    // List addresses with chain filter
    scopedFastify.get('/ecosystem/:ecosystem/chain/:chain', {
      schema: {
        tags: ['Addresses'],
        summary: 'List addresses filtered by chain',
        params: schemas.addressPathParamsSchema,
        querystring: schemas.listAddressesQuerySchema,
        response: {
          200: schemas.addressListResponseSchema,
        },
      },
    }, handlers.listAddressesWithFilter);
  });

  // Routes without chain validation
  fastify.get('/', {
    schema: {
      tags: ['Addresses'],
      summary: 'List all addresses for vault',
      params: schemas.vaultIdParamsSchema,
      querystring: schemas.listAddressesQuerySchema,
      response: {
        200: schemas.addressListResponseSchema,
      },
    },
  }, handlers.listAddresses);
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/core && npx vitest run tests/unit/routes/addresses/addresses.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/core/src/routes/addresses/index.ts services/core/tests/unit/routes/addresses/
git commit -m "feat(core): add address routes"
```

---

### Task 16: Register Address Routes in App

**Files:**
- Modify: `services/core/src/routes/index.ts`

**Step 1: Update routes index**

Update `services/core/src/routes/index.ts`:

```typescript
import { FastifyInstance } from 'fastify';
import chainRoutes from './chains';
import addressRoutes from './addresses';

export async function routes(fastify: FastifyInstance) {
  // Public routes (no auth required)
  fastify.register(chainRoutes, { prefix: '/v2/chains' });

  // Protected routes
  fastify.register(addressRoutes, { prefix: '/v2/vaults/:vaultId/addresses' });
}
```

**Step 2: Test full app**

Run: `cd services/core && npx vitest run tests/unit/app.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add services/core/src/routes/index.ts
git commit -m "feat(core): register address routes in app"
```

---

## Phase 5: Continue with Remaining Routes

### Task 17-20: Balance Routes

Follow the same pattern as Tasks 13-16 for:
- `services/core/src/routes/balances/schemas.ts`
- `services/core/src/routes/balances/handlers.ts`
- `services/core/src/routes/balances/index.ts`

Key endpoints:
- `GET /v2/balances/ecosystem/:ecosystem/chain/:chain/address/:address/native`
- `GET /v2/balances/ecosystem/:ecosystem/chain/:chain/address/:address/tokens`

---

### Task 21-24: Transaction Routes

Follow the same pattern for:
- `services/core/src/routes/transactions/schemas.ts`
- `services/core/src/routes/transactions/handlers.ts`
- `services/core/src/routes/transactions/index.ts`

Key endpoints:
- `GET /v2/transactions/ecosystem/:ecosystem/chain/:chain/address/:address`
- `GET /v2/transactions/ecosystem/:ecosystem/chain/:chain/address/:address/transaction/:transactionHash`
- `POST /v2/vaults/:vaultId/transactions/ecosystem/:ecosystem/chain/:chain/build-native-transaction`
- `POST /v2/vaults/:vaultId/transactions/ecosystem/:ecosystem/chain/:chain/build-token-transaction`
- `POST /v2/vaults/:vaultId/transactions/ecosystem/:ecosystem/chain/:chain/transaction`
- `POST /v2/transactions/ecosystem/:ecosystem/chain/:chain/scan-transaction`

---

## Phase 6: Update Serverless Configuration

### Task 25: Update serverless.ts

**Files:**
- Modify: `services/core/resources/functions.ts`
- Modify: `services/core/serverless.ts`

**Step 1: Create single HTTP Lambda function**

Update `services/core/resources/functions.ts` to replace individual HTTP functions with single Lambda:

```typescript
const HTTP_API_LAMBDA: AWS['functions'] = {
  api: {
    handler: 'src/lambda.handler',
    timeout: 29,
    memorySize: 1024,
    environment: {
      ...sharedDBEnv,
      NOVES_API_KEY: '${param:NOVES_API_KEY}',
      TATUM_API_KEY: '${param:TATUM_API_KEY}',
      BLOCKAID_API_KEY: '${param:BLOCKAID_API_KEY}',
      ADAMIK_API_KEY: '${param:ADAMIK_API_KEY}',
      SYNC_ADDRESS_TRANSACTIONS_SF_ARN: '${param:SYNC_ADDRESS_TRANSACTIONS_SF_ARN}',
      ADD_TATUM_SUBSCRIPTION_SF_ARN: '${param:ADD_TATUM_SUBSCRIPTION_SF_ARN}',
      INTERNAL_TRANSACTION_ROUTER_URL: '${param:INTERNAL_TRANSACTION_ROUTER_URL}',
      TOKEN_METADATA_TABLE: { Ref: 'TokenMetadataTable' },
      TRANSACTIONS_TABLE: { Ref: 'TransactionsTable2' },
    },
    events: [
      {
        httpApi: {
          method: '*',
          path: '/{proxy+}',
          authorizer,
        },
      },
      {
        httpApi: {
          method: 'GET',
          path: '/v2/chains',
        },
      },
      {
        httpApi: {
          method: 'GET',
          path: '/health',
        },
      },
    ],
  },
};

// Keep non-HTTP handlers unchanged
export const functions: AWS['functions'] = {
  ...HTTP_API_LAMBDA,
  ...EVENT_BRIDGE_APIS,
  ...STREAM_HANDLERS,
  ...STEP_FUNCTION_LAMBDAS,
  ...INTERNAL_APIS,  // Keep internal API separate
  ...ERROR_MONITORING,
};
```

**Step 2: Test build**

Run: `cd services/core && npm run build` (or equivalent)
Expected: Build succeeds

**Step 3: Commit**

```bash
git add services/core/resources/functions.ts services/core/serverless.ts
git commit -m "feat(core): update serverless config for single Fastify Lambda"
```

---

## Phase 7: Integration Testing

### Task 26: Create Integration Test

**Files:**
- Create: `services/core/tests/integration/fastify-app.test.ts`

**Step 1: Write integration test**

Create `services/core/tests/integration/fastify-app.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app';
import type { FastifyInstance } from 'fastify';

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
    });
  });

  describe('Chains API', () => {
    it('lists chains without auth', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v2/chains',
      });
      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.json())).toBe(true);
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
});
```

**Step 2: Run integration test**

Run: `cd services/core && npx vitest run tests/integration/fastify-app.test.ts -c tests/integration/vitest.config.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add services/core/tests/integration/fastify-app.test.ts
git commit -m "test(core): add Fastify app integration tests"
```

---

## Phase 8: Cleanup

### Task 27: Remove Old Handler Files

**After all routes are migrated and tested**, remove the old individual handler files:

```bash
# List files to remove (don't execute until migration complete)
# rm -rf services/core/src/handlers/addresses/*.ts  # Keep [address] subfolder pattern
# rm -rf services/core/src/handlers/balances/*.ts
# rm -rf services/core/src/handlers/chains/*.ts
# rm -rf services/core/src/handlers/transactions/*.ts (except build-transaction subfolder)
```

**Note:** Keep `handlers/events/`, `handlers/streams/`, `handlers/step-functions/`, `handlers/webhooks/`, `handlers/internal/` - these are non-HTTP handlers that stay as individual Lambdas.

---

## Verification Checklist

Before considering migration complete:

- [ ] All unit tests pass: `npm run test:unit`
- [ ] All integration tests pass: `npm run test:integration`
- [ ] Local server starts: `npm run dev` → curl endpoints
- [ ] OpenAPI spec generated: `GET /docs/json`
- [ ] Swagger UI works: `GET /docs` in browser
- [ ] Lambda handler exports correctly
- [ ] Serverless deploy succeeds to dev
- [ ] Smoke test deployed endpoints
