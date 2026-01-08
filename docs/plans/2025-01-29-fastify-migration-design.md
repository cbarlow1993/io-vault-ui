# Fastify Migration Design

## Overview

Migrate the `services/core` HTTP API from individual Lambda handlers with Middy middleware to a Zod-typed Fastify application that can be deployed as either a single Lambda or a container/server.

## Key Decisions

| Decision | Choice |
|----------|--------|
| Non-HTTP handlers | Keep as separate Lambdas |
| Deployment target | Dual-mode (Lambda and container equally important) |
| Auth/authorization | Flexible layer (Lambda authorizer context OR direct JWT) |
| Middleware approach | Fastify plugin pattern |
| Route organization | Domain-based route plugins |
| Entry points | Separate files with shared app factory |
| Migration strategy | Big bang (all at once) |
| OpenAPI generation | Fastify-native with @fastify/swagger |
| Internal API | Keep as separate Lambda |

## Project Structure

```
services/core/
  src/
    # Fastify application
    app.ts                      # App factory - creates configured Fastify instance
    lambda.ts                   # Lambda entry point (@fastify/aws-lambda)
    server.ts                   # Container/local entry point (fastify.listen)

    # Plugins (middleware replacements)
    plugins/
      index.ts                  # Plugin registration order
      auth.ts                   # JWT validation + Lambda auth context extraction
      chain-validation.ts       # Ecosystem/chain path param validation
      error-handler.ts          # Maps @iofinnet/errors-sdk to HTTP responses
      swagger.ts                # @fastify/swagger + swagger-ui config

    # Routes by domain
    routes/
      index.ts                  # Registers all domain routes with prefixes
      addresses/
        index.ts                # Route definitions + schema bindings
        handlers.ts             # Handler functions (business logic)
        schemas.ts              # Zod schemas for this domain
      transactions/
        index.ts
        handlers.ts
        schemas.ts
      balances/
        index.ts
        handlers.ts
        schemas.ts
      chains/
        index.ts
        handlers.ts
        schemas.ts

    # Existing code (largely unchanged)
    services/                   # Business logic
    lib/                        # Utilities
    types/                      # TypeScript types

  # Non-HTTP Lambda handlers (unchanged)
  src/handlers/
    events/                     # EventBridge handlers
    streams/                    # DynamoDB stream handlers
    step-functions/             # Step function task handlers
    webhooks/                   # Webhook handlers
    internal/                   # Internal API (separate Lambda)
```

## App Factory & Entry Points

### app.ts

```typescript
import Fastify from 'fastify'
import { fastifyAwsPowertools } from 'fastify-aws-powertools'
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod'
import { authPlugin } from './plugins/auth'
import { errorHandlerPlugin } from './plugins/error-handler'
import { swaggerPlugin } from './plugins/swagger'
import { routes } from './routes'

export function buildApp(options?: { logger?: boolean }) {
  const app = Fastify(options).withTypeProvider<ZodTypeProvider>()

  // Zod integration
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  // Core plugins
  app.register(fastifyAwsPowertools)  // Logger, Tracer, Metrics
  app.register(swaggerPlugin)
  app.register(errorHandlerPlugin)
  app.register(authPlugin)

  // Routes
  app.register(routes)

  return app
}
```

### lambda.ts

```typescript
import awsLambdaFastify from '@fastify/aws-lambda'
import { buildApp } from './app'

const app = buildApp()
export const handler = awsLambdaFastify(app, {
  decorateRequest: true,  // Exposes raw Lambda event/context
})
```

### server.ts

```typescript
import { buildApp } from './app'

const app = buildApp({ logger: true })
app.listen({ port: 3000, host: '0.0.0.0' }, (err) => {
  if (err) throw err
})
```

## Plugins

### Auth Plugin

Flexible auth layer that works in both Lambda and container modes:

```typescript
import fp from 'fastify-plugin'
import { FastifyInstance, FastifyRequest } from 'fastify'
import { PaymentRequiredError, AuthorizationError } from '@iofinnet/errors-sdk'

export interface AuthContext {
  organisationId: string
  userId: string
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext
  }
}

const VAULT_ENTITLEMENT_NAME = 'chains-public'

async function authPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('auth', null)

  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    // Skip auth for public routes
    if (isPublicRoute(request.url)) return

    // Mode 1: Lambda with API Gateway authorizer
    const lambdaEvent = (request as any).awsLambda?.event
    if (lambdaEvent?.requestContext?.authorizer?.lambda) {
      const { organisationId, userSub, scope } = lambdaEvent.requestContext.authorizer.lambda

      if (!scope?.includes(VAULT_ENTITLEMENT_NAME)) {
        throw new PaymentRequiredError('not entitled')
      }

      request.auth = { organisationId, userId: userSub }
      return
    }

    // Mode 2: Container/standalone - validate JWT directly
    const token = request.headers.authorization?.replace('Bearer ', '')
    if (!token) throw new AuthorizationError()

    // Full JWT validation: signature (JWKS), expiry, issuer, audience
    const claims = await validateJwt(token)
    request.auth = { organisationId: claims.organisationId, userId: claims.sub }
  })
}

export default fp(authPlugin, { name: 'auth' })
```

**Note**: Container mode JWT validation must include full security: signature verification via JWKS, expiry checks, issuer/audience validation.

### Chain Validation Plugin

Zod handles type validation, hook handles async business logic and enrichment:

```typescript
import fp from 'fastify-plugin'
import { FastifyInstance, FastifyRequest } from 'fastify'
import { Chain } from '@iofinnet/io-core-dapp-utils-chains-sdk'
import { BadRequestError } from '@iofinnet/errors-sdk'

declare module 'fastify' {
  interface FastifyRequest {
    chain: Chain
  }
}

async function chainValidationPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('chain', null)

  fastify.addHook('preHandler', async (request: FastifyRequest) => {
    const { ecosystem, chain: alias } = request.params as {
      ecosystem?: string
      chain?: string
    }

    if (!ecosystem || !alias) return

    const chain = await Chain.fromAlias(alias)
    if (!chain.isEcosystem(ecosystem)) {
      throw new BadRequestError(`Chain "${alias}" not supported for "${ecosystem}"`)
    }
    request.chain = chain
  })
}

export default fp(chainValidationPlugin, { name: 'chain-validation' })
```

### Error Handler Plugin

```typescript
import fp from 'fastify-plugin'
import { FastifyInstance, FastifyError } from 'fastify'
import { ZodError } from 'zod'
import { HttpError } from '@iofinnet/errors-sdk'

async function errorHandlerPlugin(fastify: FastifyInstance) {
  fastify.setErrorHandler((error, request, reply) => {
    const logger = request.log

    // Zod validation errors
    if (error instanceof ZodError) {
      logger.warn({ error: error.issues }, 'Validation error')
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Validation failed',
        details: error.issues,
      })
    }

    // @iofinnet/errors-sdk errors
    if (error instanceof HttpError) {
      const statusCode = error.statusCode ?? 500
      logger.warn({ error }, `HTTP error: ${statusCode}`)
      return reply.status(statusCode).send({
        error: error.name,
        message: error.message,
      })
    }

    // Fastify validation errors
    if ((error as FastifyError).validation) {
      logger.warn({ error }, 'Fastify validation error')
      return reply.status(400).send({
        error: 'Bad Request',
        message: error.message,
      })
    }

    // Unexpected errors
    logger.error({ error }, 'Unhandled error')
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    })
  })
}

export default fp(errorHandlerPlugin, { name: 'error-handler' })
```

### Swagger Plugin

```typescript
import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import { jsonSchemaTransform } from 'fastify-type-provider-zod'

async function swaggerPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifySwagger, {
    openapi: {
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
  })

  if (process.env.STAGE !== 'prod') {
    await fastify.register(fastifySwaggerUi, {
      routePrefix: '/docs',
    })
  }
}

export default fp(swaggerPlugin, { name: 'swagger' })
```

## Route Structure

### routes/index.ts

```typescript
import { FastifyInstance } from 'fastify'
import addressRoutes from './addresses'
import transactionRoutes from './transactions'
import balanceRoutes from './balances'
import chainRoutes from './chains'

export async function routes(fastify: FastifyInstance) {
  // Public routes (no auth)
  fastify.register(chainRoutes, { prefix: '/v2/chains' })

  // Protected routes
  fastify.register(addressRoutes, { prefix: '/v2/vaults/:vaultId/addresses' })
  fastify.register(balanceRoutes, { prefix: '/v2/balances' })
  fastify.register(transactionRoutes, { prefix: '/v2/transactions' })
}
```

### routes/addresses/index.ts

```typescript
import { FastifyInstance } from 'fastify'
import { chainValidationPlugin } from '../../plugins/chain-validation'
import * as handlers from './handlers'
import * as schemas from './schemas'

export default async function addressRoutes(fastify: FastifyInstance) {
  fastify.register(chainValidationPlugin)

  fastify.get('/', {
    schema: {
      tags: ['Addresses'],
      summary: 'List all addresses for vault',
      params: schemas.vaultIdParamsSchema,
      querystring: schemas.listAddressesQuerySchema,
      response: { 200: schemas.addressListResponseSchema },
    },
  }, handlers.listAddresses)

  fastify.post('/ecosystem/:ecosystem/chain/:chain', {
    schema: {
      tags: ['Addresses'],
      summary: 'Create address for vault',
      params: schemas.createAddressParamsSchema,
      body: schemas.createAddressBodySchema,
      response: {
        201: schemas.addressResponseSchema,
        200: schemas.addressResponseSchema,
      },
    },
  }, handlers.createAddress)

  // Additional routes...
}
```

## Handler Migration Pattern

### Before (Middy)

```typescript
const baseHandler = async (event: CreateAddressSchema): Promise<APIGatewayProxyResultV2> => {
  const { address, derivationPath, monitor, alias } = event.body
  const { vaultId, chain: chainAlias, ecosystem } = event.pathParameters
  const { organisationId } = event.requestIdentity
  // ... business logic
  return formatResponse(statusCode, addressRecord)
}

export const handler = wrapHttpHandler({
  handler: baseHandler,
  zodSchema: createAddressSchema,
  permitParams: { ... },
})
```

### After (Fastify)

```typescript
import { FastifyRequest, FastifyReply } from 'fastify'
import { CreateAddressParams, CreateAddressBody } from './schemas'

interface CreateAddressRequest {
  Params: CreateAddressParams
  Body: CreateAddressBody
}

export async function createAddress(
  request: FastifyRequest<CreateAddressRequest>,
  reply: FastifyReply
) {
  const { address, derivationPath, monitor = false, alias } = request.body
  const { vaultId, ecosystem } = request.params
  const { organisationId, userId } = request.auth  // From auth plugin
  const chain = request.chain  // From chain-validation plugin

  // ... existing business logic (unchanged)

  const statusCode = isNew ? 201 : 200
  return reply.status(statusCode).send(addressRecord)
}
```

## Schema Organization

### routes/addresses/schemas.ts

```typescript
import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

const ecosystemEnum = z.enum(['evm', 'svm', 'tvm', 'utxo', 'xrp', 'substrate'])
const addressString = z.string().min(1).openapi({ example: '0x1234...' })

export const vaultIdParamsSchema = z.object({
  vaultId: z.string().uuid().openapi({ description: 'Vault identifier' }),
})

export const createAddressParamsSchema = vaultIdParamsSchema.extend({
  ecosystem: ecosystemEnum,
  chain: z.string().min(1).openapi({ example: 'ethereum' }),
})

export type CreateAddressParams = z.infer<typeof createAddressParamsSchema>

export const createAddressBodySchema = z.object({
  address: addressString,
  derivationPath: z.string().nullable().optional(),
  monitor: z.boolean().default(false),
  alias: z.string().nullable().optional(),
}).openapi({ ref: 'CreateAddressBody' })

export type CreateAddressBody = z.infer<typeof createAddressBodySchema>

export const addressResponseSchema = z.object({
  address: addressString,
  chain: z.string(),
  vaultId: z.string().uuid(),
  status: z.enum(['monitored', 'unmonitored']),
  createdAt: z.string().datetime(),
  alias: z.string().nullable(),
}).openapi({ ref: 'Address' })

export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.array(z.any()).optional(),
}).openapi({ ref: 'Error' })
```

## Serverless Configuration

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
      // ... other vars
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
          path: '/v2/chains',  // Public route
        },
      },
    ],
  },
}

// Non-HTTP handlers unchanged
const EVENT_BRIDGE_APIS: AWS['functions'] = { /* ... */ }
const STREAM_HANDLERS: AWS['functions'] = { /* ... */ }
const STEP_FUNCTION_LAMBDAS: AWS['functions'] = { /* ... */ }

export const functions: AWS['functions'] = {
  ...HTTP_API_LAMBDA,
  ...EVENT_BRIDGE_APIS,
  ...STREAM_HANDLERS,
  ...STEP_FUNCTION_LAMBDAS,
  ...ERROR_MONITORING,
}
```

## New Dependencies

```json
{
  "fastify": "^5.0.0",
  "@fastify/aws-lambda": "^5.0.0",
  "@fastify/swagger": "^9.0.0",
  "@fastify/swagger-ui": "^5.0.0",
  "fastify-type-provider-zod": "^4.0.0",
  "fastify-aws-powertools": "^3.0.0",
  "fastify-plugin": "^5.0.0"
}
```

## Testing Strategy

```typescript
import { buildApp } from '../src/app'

describe('POST /v2/vaults/:vaultId/addresses/:ecosystem/:chain', () => {
  const app = buildApp()

  it('creates address successfully', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v2/vaults/123/addresses/ecosystem/evm/chain/ethereum',
      headers: { authorization: 'Bearer <token>' },
      payload: { address: '0x...', monitor: true },
    })

    expect(response.statusCode).toBe(201)
  })
})
```

## Container Deployment

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist/ ./dist/
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

## What Changes vs What Stays

### Changes

| Component | Before | After |
|-----------|--------|-------|
| HTTP handlers | ~30 individual Lambdas | Single Fastify Lambda |
| Middleware | Middy + wrapHttpHandler | Fastify plugins |
| Validation | @aws-lambda-powertools/parser | fastify-type-provider-zod |
| OpenAPI | zod-to-openapi script | @fastify/swagger (runtime) |
| Logging | Custom powertools wrapper | fastify-aws-powertools |

### Stays the Same

- Services layer (business logic)
- DynamoDB operations
- External integrations (Noves, Tatum, Blockaid)
- Step Functions, EventBridge, Streams handlers
- Internal API (separate Lambda)
