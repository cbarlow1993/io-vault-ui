# Vault API Data Layer Design

## Overview

This document describes the architecture for integrating the Vault signing service API into the io-vault-ui application using clean architecture principles.

## Architecture Decision

**Pattern:** Repository pattern with oRPC BFF

**Data flow:**
```
Frontend → oRPC Procedure → Repository → openapi-fetch → Vault API
                ↓                ↓
         ORPCError ← Domain Errors
```

**Key decisions:**
- API calls go through oRPC BFF (not direct from frontend)
- Singleton openapi-fetch client with per-call auth headers
- Domain-specific error classes (decoupled from oRPC)
- User-scoped authentication tokens from session

## File Structure

```
src/server/vault-api/
├── client.ts              # Singleton openapi-fetch client
├── errors.ts              # Domain-specific error classes
├── types.ts               # Re-exports + custom types
└── repositories/
    ├── index.ts           # Barrel export
    ├── vault.repository.ts
    ├── signer.repository.ts
    └── reshare.repository.ts

src/lib/api/
└── vault-api.d.ts         # Generated OpenAPI types (already exists)
```

## Implementation Details

### Client Layer

Singleton openapi-fetch client configured with base URL. Auth token passed per-call via headers.

```typescript
// src/server/vault-api/client.ts
import createClient from 'openapi-fetch';
import type { paths } from '@/lib/api/vault-api';

export const vaultApiClient = createClient<paths>({
  baseUrl: process.env.VAULT_API_URL,
});

export type VaultApiClient = typeof vaultApiClient;
```

### Error Handling

Domain-specific errors that are independent of the transport layer (oRPC). This allows swapping oRPC in the future without changing the Vault API layer.

```typescript
// src/server/vault-api/errors.ts
export class VaultApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'VaultApiError';
  }
}

export class VaultNotFoundError extends VaultApiError {
  constructor(vaultId: string) {
    super(`Vault not found: ${vaultId}`, 'VAULT_NOT_FOUND', 404);
  }
}

export class SignerNotFoundError extends VaultApiError {
  constructor(signerId: string) {
    super(`Signer not found: ${signerId}`, 'SIGNER_NOT_FOUND', 404);
  }
}

export class VaultApiUnauthorizedError extends VaultApiError {
  constructor() {
    super('Unauthorized', 'UNAUTHORIZED', 401);
  }
}
```

### Repository Pattern

Each repository:
- Receives auth token in constructor (instantiated per-request)
- Provides domain-specific methods with full type safety
- Transforms API errors to domain errors

```typescript
// src/server/vault-api/repositories/vault.repository.ts
import { vaultApiClient } from '../client';
import { VaultApiError, VaultNotFoundError } from '../errors';

export class VaultRepository {
  constructor(private readonly token: string) {}

  async list(params?: { limit?: number; cursor?: string }) {
    const { data, error } = await vaultApiClient.GET('/vaults', {
      headers: { Authorization: `Bearer ${this.token}` },
      params: { query: params },
    });

    if (error) {
      throw new VaultApiError(error.message, 'LIST_FAILED', error.status);
    }

    return data;
  }

  async get(id: string) {
    const { data, error } = await vaultApiClient.GET('/vaults/{id}', {
      headers: { Authorization: `Bearer ${this.token}` },
      params: { path: { id } },
    });

    if (error) {
      if (error.status === 404) throw new VaultNotFoundError(id);
      throw new VaultApiError(error.message, 'GET_FAILED', error.status);
    }

    return data;
  }

  async create(body: { name: string; threshold: number }) {
    const { data, error } = await vaultApiClient.POST('/vaults', {
      headers: { Authorization: `Bearer ${this.token}` },
      body,
    });

    if (error) {
      throw new VaultApiError(error.message, 'CREATE_FAILED', error.status);
    }

    return data;
  }
}
```

### oRPC Integration

Repositories are instantiated in oRPC procedures with the user's session token. Domain errors are translated to ORPCError at this layer.

```typescript
// src/server/routers/vaults.ts
import { z } from 'zod';
import { ORPCError } from '@orpc/server';
import { protectedProcedure } from '../orpc';
import { VaultRepository } from '../vault-api/repositories';
import { VaultNotFoundError } from '../vault-api/errors';

export const vaultsRouter = {
  list: protectedProcedure({ permission: 'vaults:read' })
    .input(z.object({ limit: z.number().optional() }))
    .handler(async ({ input, context }) => {
      const vaultRepo = new VaultRepository(context.session.token);
      return vaultRepo.list(input);
    }),

  get: protectedProcedure({ permission: 'vaults:read' })
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const vaultRepo = new VaultRepository(context.session.token);

      try {
        return await vaultRepo.get(input.id);
      } catch (e) {
        if (e instanceof VaultNotFoundError) {
          throw new ORPCError('NOT_FOUND', { message: e.message });
        }
        throw e;
      }
    }),
};
```

## Dependencies

Required package (already installed):
- `openapi-typescript` - Type generation from OpenAPI spec

New package to install:
- `openapi-fetch` - Type-safe fetch client

## Benefits

1. **Type-safe end-to-end** - From OpenAPI spec through to oRPC responses
2. **Decoupled from transport** - Domain errors independent of oRPC
3. **Testable** - Repositories can be tested by mocking the client
4. **Secure** - API hidden behind BFF, auth tokens managed server-side
5. **Maintainable** - Clear separation of concerns per layer

## Implementation Order

1. Install `openapi-fetch`
2. Create `src/server/vault-api/errors.ts`
3. Create `src/server/vault-api/client.ts`
4. Create `src/server/vault-api/types.ts`
5. Create repositories (start with `vault.repository.ts`)
6. Update oRPC routers to use repositories
7. Remove mock data from features
