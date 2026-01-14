# Signers API Integration Design

## Overview

Integrate the signers data table (`src/features/signers/page-signers.tsx`) with the vault API, replacing mock data with live API calls using the existing oRPC + TanStack Query pattern.

## Architecture

```
src/
├── features/signers/
│   ├── schema.ts          (NEW - Zod schemas for signers)
│   └── page-signers.tsx   (UPDATE - replace mock data with useQuery)
├── server/
│   ├── routers/
│   │   └── signers.ts     (NEW - oRPC procedures)
│   └── router.ts          (UPDATE - add signers router)
```

**Data flow:**
1. `page-signers.tsx` calls `useQuery(orpc.signers.list.queryOptions(...))`
2. oRPC router in `signers.ts` calls `SignerRepository.list()`
3. Repository fetches from vault API with cursor-based pagination
4. Results flow back to the UI

## API Requirements

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Page size |
| `cursor` | string | Pagination cursor |
| `order` | 'asc' \| 'desc' | Sort order |
| `userId` | string | Filter by user |
| `status` | 'active' \| 'pending' \| 'revoked' | Filter by signer status |
| `type` | 'ios' \| 'android' \| 'virtual' | Filter by signer type |
| `search` | string | Search by name, owner, or device info |

### Response Fields (per signer)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Signer display name |
| `owner` | string | Owner name/identifier |
| `type` | 'ios' \| 'android' \| 'virtual' | Device/signer type |
| `version` | string | App/signer version |
| `status` | 'active' \| 'pending' \| 'revoked' | Current status |
| `registeredAt` | string (ISO date) | Registration timestamp |
| `lastSeen` | string \| null | Last activity timestamp |
| `deviceInfo` | string? | Device description |
| `vaultsCount` | number | Number of vaults using this signer |
| `config` | object | Signer configuration |

### Response Envelope

```json
{
  "data": [...signers],
  "nextCursor": "string | null",
  "hasMore": boolean
}
```

## Implementation Details

### 1. Zod Schemas (`src/features/signers/schema.ts`)

```typescript
import { z } from 'zod';

export const zSignerType = z.enum(['ios', 'android', 'virtual']);
export const zSignerStatus = z.enum(['active', 'pending', 'revoked']);

export const zSignerConfig = z.object({
  publicKey: z.string(),
  supportedCurves: z.array(z.string()),
  apiEndpoint: z.string().optional(),
  autoApprove: z.boolean(),
  notificationsEnabled: z.boolean(),
  maxDailySignatures: z.number().optional(),
  allowedNetworks: z.array(z.string()),
  backupEnabled: z.boolean(),
  lastSyncAt: z.string(),
});

export const zSigner = z.object({
  id: z.string(),
  name: z.string(),
  owner: z.string(),
  type: zSignerType,
  version: z.string(),
  status: zSignerStatus,
  registeredAt: z.string(),
  lastSeen: z.string().nullable(),
  deviceInfo: z.string().optional(),
  vaultsCount: z.number(),
  config: zSignerConfig,
});

export const zSignerListResponse = z.object({
  data: z.array(zSigner),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export const zSignerListParams = z.object({
  limit: z.number().optional(),
  cursor: z.string().optional(),
  status: zSignerStatus.optional(),
  type: zSignerType.optional(),
  search: z.string().optional(),
});

export type Signer = z.infer<typeof zSigner>;
export type SignerConfig = z.infer<typeof zSignerConfig>;
export type SignerType = z.infer<typeof zSignerType>;
export type SignerStatus = z.infer<typeof zSignerStatus>;
export type SignerListResponse = z.infer<typeof zSignerListResponse>;
export type SignerListParams = z.infer<typeof zSignerListParams>;
```

### 2. oRPC Router (`src/server/routers/signers.ts`)

```typescript
import { protectedProcedure } from '@/server/orpc';
import { SignerRepository } from '@/server/vault-api/repositories/signer.repository';
import { zSignerListParams, zSignerListResponse } from '@/features/signers/schema';

const tags = ['signers'];

export default {
  list: protectedProcedure({ permission: null })
    .route({
      method: 'GET',
      path: '/signers',
      tags,
    })
    .input(zSignerListParams.optional())
    .output(zSignerListResponse)
    .handler(async ({ context, input }) => {
      context.logger.info('Fetching signers list');

      const signerRepo = new SignerRepository(context.token);
      const result = await signerRepo.list({
        limit: input?.limit,
        cursor: input?.cursor,
        status: input?.status,
        type: input?.type,
        search: input?.search,
      });

      return result;
    }),
};
```

### 3. UI Integration (`page-signers.tsx`)

Key changes:
- Replace `allSigners` import with `useQuery` hook
- Add pagination state management for cursor-based navigation
- Pass loading/error states to DataTable
- Update summary cards to use fetched totals

```typescript
const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
const [cursors, setCursors] = useState<string[]>([]);

const { data, isLoading, isError, refetch } = useQuery(
  orpc.signers.list.queryOptions({
    limit: pagination.pageSize,
    cursor: cursors[pagination.pageIndex - 1],
    status: statusFilter?.id !== 'all' ? statusFilter.id : undefined,
    type: typeFilter?.id !== 'all' ? typeFilter.id : undefined,
    search: debouncedSearch || undefined,
  })
);
```

## Decisions Made

- **Server-side pagination**: Using cursor-based pagination from the API
- **Server-side filtering**: Status and type filters are API query params
- **Server-side search**: Search query sent to API (debounced)
- **Assume API provides all fields**: Implementation assumes API returns all required fields

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/features/signers/schema.ts` | CREATE |
| `src/server/routers/signers.ts` | CREATE |
| `src/server/router.ts` | UPDATE (add signers router) |
| `src/features/signers/page-signers.tsx` | UPDATE (use useQuery) |
