---
name: orpc-patterns
description: Use when implementing API endpoints with oRPC, creating routers, or setting up RPC-based APIs in TypeScript projects
---

# oRPC Patterns

## Overview

Patterns for building type-safe RPC APIs with oRPC, including router structure, middleware, error handling, and client integration.

## Router Structure

```typescript
// src/server/routers/[resource].ts
import { protectedProcedure, publicProcedure } from '../orpc';
import { z } from 'zod';

const tags = ['Resource']; // OpenAPI tags

export const resourceRouter = {
  // List endpoint
  list: protectedProcedure()
    .route({ method: 'GET', path: '/resources', tags })
    .input(z.object({
      page: z.number().optional().default(1),
      limit: z.number().optional().default(20),
      search: z.string().optional(),
    }))
    .output(z.object({
      items: z.array(zResource),
      total: z.number(),
    }))
    .handler(async ({ input, context }) => {
      const repository = new ResourceRepository(context.auth.token);
      return repository.list(input);
    }),

  // Get single item
  get: protectedProcedure()
    .route({ method: 'GET', path: '/resources/{id}', tags })
    .input(z.object({ id: z.string() }))
    .output(zResource)
    .handler(async ({ input, context }) => {
      const repository = new ResourceRepository(context.auth.token);
      return repository.get(input.id);
    }),

  // Create
  create: protectedProcedure()
    .route({ method: 'POST', path: '/resources', tags })
    .input(zResourceCreate)
    .output(zResource)
    .handler(async ({ input, context }) => {
      const repository = new ResourceRepository(context.auth.token);
      return repository.create(input);
    }),
};
```

## Middleware Stack

```typescript
// src/server/orpc.ts
import { ORPCError } from '@orpc/server';

// Base procedure with logging
const baseProcedure = createProcedure()
  .use(async ({ next, path }) => {
    const start = performance.now();
    const result = await next();
    const duration = performance.now() - start;
    console.log(`${path} took ${duration}ms`);
    return result;
  });

// Protected procedure with auth
export const protectedProcedure = () =>
  baseProcedure.use(async ({ next, context }) => {
    const session = await getSession();
    if (!session?.userId) {
      throw new ORPCError('UNAUTHORIZED');
    }
    return next({
      context: { ...context, auth: session },
    });
  });
```

## Error Handling

```typescript
// src/server/[domain]/errors.ts
export class DomainError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND');
  }
}

// In handler
.handler(async ({ input }) => {
  const result = await repository.get(input.id);
  if (!result) {
    throw new NotFoundError('Resource', input.id);
  }
  return result;
});
```

## Repository Pattern

```typescript
// src/server/[domain]/repository.ts
export class ResourceRepository {
  constructor(private token: string) {}

  async list(params: ListParams) {
    const response = await apiClient.GET('/resources', {
      params: { query: params },
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!response.data) {
      throw new ApiError('Failed to fetch resources');
    }

    return this.transformList(response.data);
  }

  private transformList(data: ApiResponse): UIResponse {
    // Transform API format to UI format
    return {
      items: data.items.map(this.transformItem),
      total: data.total,
    };
  }
}
```

## Client Integration

```typescript
// src/lib/orpc/client.ts
import { createORPCReactQueryUtils } from '@orpc/react-query';

export const orpc = createORPCReactQueryUtils<Router>();

// In component
const { data } = orpc.resources.list.useQuery({
  input: { page: 1 },
});

// Mutation
const createMutation = orpc.resources.create.useMutation();
await createMutation.mutateAsync({ name: 'New Resource' });
```

## Quick Reference

| Pattern | Use For |
|---------|---------|
| `protectedProcedure()` | Endpoints requiring auth |
| `publicProcedure()` | Public endpoints |
| `.input(schema)` | Request validation |
| `.output(schema)` | Response validation |
| `.route({ method, path })` | REST mapping |
| Repository class | External API integration |

## Common Mistakes

1. **Missing auth check** - Use `protectedProcedure()` for protected routes
2. **No input validation** - Always use `.input()` with Zod schema
3. **Exposing internal errors** - Map to user-friendly messages
4. **No transformation layer** - Keep API and UI types separate
