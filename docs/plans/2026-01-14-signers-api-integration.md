# Signers API Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Connect the signers data table to the vault API, replacing mock data with live API calls.

**Architecture:** oRPC router procedure calls SignerRepository which fetches from vault API. Client uses TanStack Query via `orpc.signers.list.queryOptions()`. Server-side pagination with cursor, filtering by status/type/search.

**Tech Stack:** oRPC, TanStack Query, Zod, Clerk auth (getToken), openapi-fetch

---

## Task 1: Create Signer Zod Schemas

**Files:**
- Create: `src/features/signers/schema.ts`

**Step 1: Create the schema file with all types**

```typescript
import { z } from 'zod';

// Enums
export const zSignerType = z.enum(['ios', 'android', 'virtual']);
export const zSignerStatus = z.enum(['active', 'pending', 'revoked']);

// Signer configuration (for detail view)
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

// Main signer type
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

// Paginated list response
export const zSignerListResponse = z.object({
  data: z.array(zSigner),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

// Query parameters for list endpoint
export const zSignerListParams = z.object({
  limit: z.number().optional(),
  cursor: z.string().optional(),
  status: zSignerStatus.optional(),
  type: zSignerType.optional(),
  search: z.string().optional(),
});

// Type exports
export type Signer = z.infer<typeof zSigner>;
export type SignerConfig = z.infer<typeof zSignerConfig>;
export type SignerType = z.infer<typeof zSignerType>;
export type SignerStatus = z.infer<typeof zSignerStatus>;
export type SignerListResponse = z.infer<typeof zSignerListResponse>;
export type SignerListParams = z.infer<typeof zSignerListParams>;
```

**Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/features/signers/schema.ts
git commit -m "feat(signers): add Zod schemas for signer types"
```

---

## Task 2: Create Signers oRPC Router

**Files:**
- Create: `src/server/routers/signers.ts`
- Modify: `src/server/router.ts`

**Step 1: Create the signers router**

```typescript
import { ORPCError } from '@orpc/client';
import { auth as clerkAuth } from '@clerk/tanstack-react-start/server';

import {
  zSignerListParams,
  zSignerListResponse,
} from '@/features/signers/schema';
import { SignerRepository } from '@/server/vault-api/repositories';
import { protectedProcedure } from '@/server/orpc';

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

      // Get auth token for vault API
      const authState = await clerkAuth();
      const token = await authState.getToken();

      if (!token) {
        throw new ORPCError('UNAUTHORIZED', {
          message: 'No authentication token available',
        });
      }

      const signerRepo = new SignerRepository(token);
      const result = await signerRepo.list({
        limit: input?.limit,
        cursor: input?.cursor,
        // Pass filter params when API supports them
        // status: input?.status,
        // type: input?.type,
        // search: input?.search,
      });

      // TODO: Remove this transformation when API returns full signer data
      // For now, map API response to expected UI format
      return result as unknown as z.infer<typeof zSignerListResponse>;
    }),
};
```

**Step 2: Update the main router to include signers**

Edit `src/server/router.ts`:

```typescript
import { InferRouterInputs, InferRouterOutputs } from '@orpc/server';

import accountRouter from './routers/account';
import billingRouter from './routers/billing';
import configRouter from './routers/config';
import signersRouter from './routers/signers';

export type Router = typeof router;
export type Inputs = InferRouterInputs<typeof router>;
export type Outputs = InferRouterOutputs<typeof router>;
export const router = {
  account: accountRouter,
  billing: billingRouter,
  config: configRouter,
  signers: signersRouter,
};
```

**Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/server/routers/signers.ts src/server/router.ts
git commit -m "feat(signers): add oRPC router for signers list endpoint"
```

---

## Task 3: Update Signers Page to Use API

**Files:**
- Modify: `src/features/signers/page-signers.tsx`

**Step 1: Add imports and query hook**

At the top of the file, add:

```typescript
import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/client';
```

**Step 2: Replace mock data with useQuery**

Inside the `PageSigners` component, replace the mock data usage with:

```typescript
// Fetch signers from API
const {
  data: signersData,
  isLoading,
  isError,
  refetch,
} = useQuery(
  orpc.signers.list.queryOptions({
    limit: 50, // Fetch enough for client-side pagination initially
    status: statusFilter?.id !== 'all' ? (statusFilter?.id as SignerStatus) : undefined,
    type: typeFilter?.id !== 'all' ? (typeFilter?.id as SignerType) : undefined,
    search: search || undefined,
  })
);

// Use fetched data or empty array while loading
const allSigners = signersData?.data ?? [];
```

**Step 3: Update filter logic to work with API data**

Replace the `filteredSigners` useMemo with simpler version (since API does filtering):

```typescript
// Filter by search locally (API may not support full text search initially)
const filteredSigners = useMemo(() => {
  if (!search) return allSigners;

  const searchLower = search.toLowerCase();
  return allSigners.filter((signer) => {
    return (
      signer.name.toLowerCase().includes(searchLower) ||
      signer.owner.toLowerCase().includes(searchLower) ||
      signer.version.toLowerCase().includes(searchLower) ||
      (signer.deviceInfo?.toLowerCase().includes(searchLower) ?? false)
    );
  });
}, [allSigners, search]);
```

**Step 4: Pass loading/error states to DataTable**

Update the DataTable component:

```typescript
<DataTable
  columns={columns}
  data={filteredSigners}
  getRowId={(row) => row.id}
  onRowClick={(row) =>
    navigate({
      to: '/signers/$signerId',
      params: { signerId: row.id },
    })
  }
  pageSizeOptions={[5, 10, 25, 50]}
  isLoading={isLoading}
  isError={isError}
  onRetry={() => refetch()}
/>
```

**Step 5: Update summary cards to use fetched data**

Update the summary cards section:

```typescript
{/* Summary Cards */}
<div className="grid grid-cols-4 gap-px bg-neutral-200">
  <div className="bg-white p-3">
    <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
      Total Signers
    </p>
    <p className="mt-1 text-lg font-semibold text-neutral-900 tabular-nums">
      {isLoading ? '—' : allSigners.length}
    </p>
  </div>
  <div className="bg-white p-3">
    <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
      iOS
    </p>
    <p className="mt-1 text-lg font-semibold text-neutral-900 tabular-nums">
      {isLoading ? '—' : allSigners.filter((s) => s.type === 'ios').length}
    </p>
  </div>
  <div className="bg-white p-3">
    <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
      Android
    </p>
    <p className="mt-1 text-lg font-semibold text-neutral-900 tabular-nums">
      {isLoading ? '—' : allSigners.filter((s) => s.type === 'android').length}
    </p>
  </div>
  <div className="bg-white p-3">
    <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
      Virtual
    </p>
    <p className="mt-1 text-lg font-semibold text-neutral-900 tabular-nums">
      {isLoading ? '—' : allSigners.filter((s) => s.type === 'virtual').length}
    </p>
  </div>
</div>
```

**Step 6: Remove unused mock data import**

Remove from imports:

```typescript
// REMOVE this line:
import { allSigners, ... } from './data/signers';

// KEEP these imports from data/signers:
import {
  getSignerHealthStatus,
  isVersionOutdated,
  LATEST_VERSIONS,
  type RegisteredSigner,
  type SignerType,
} from './data/signers';
```

**Step 7: Add type imports from schema**

```typescript
import type { SignerStatus, SignerType as SchemaSignerType } from './schema';
```

**Step 8: Verify the app compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 9: Commit**

```bash
git add src/features/signers/page-signers.tsx
git commit -m "feat(signers): connect data table to API via useQuery"
```

---

## Task 4: Update Type Compatibility

**Files:**
- Modify: `src/features/signers/data/signers.ts`

**Step 1: Export type alias for compatibility**

The existing `RegisteredSigner` type in `data/signers.ts` should match the schema. Add at the bottom:

```typescript
// Re-export for compatibility with existing components
export type { Signer as ApiSigner } from '../schema';
```

**Step 2: Verify types match**

Run: `npx tsc --noEmit`
Expected: No errors (types should be structurally compatible)

**Step 3: Commit**

```bash
git add src/features/signers/data/signers.ts
git commit -m "refactor(signers): add type compatibility export"
```

---

## Task 5: Test the Integration

**Step 1: Start the dev server**

Run: `npm run dev`
Expected: Server starts without errors

**Step 2: Navigate to signers page**

Open browser to `/signers`
Expected:
- Loading state shows briefly
- If API returns data: table displays signers
- If API returns error: error state shows with retry button

**Step 3: Test filters**

- Change status filter to "Active"
- Change type filter to "iOS"
- Type in search box

Expected: Table updates (may show loading state during refetch)

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(signers): complete API integration for signers table"
```

---

## Files Summary

| File | Action |
|------|--------|
| `src/features/signers/schema.ts` | CREATE |
| `src/server/routers/signers.ts` | CREATE |
| `src/server/router.ts` | MODIFY (add signers router) |
| `src/features/signers/page-signers.tsx` | MODIFY (replace mock with useQuery) |
| `src/features/signers/data/signers.ts` | MODIFY (optional type export) |

---

## Notes

- The vault API may not return all fields initially. The router has a TODO comment for when API response transformation is needed.
- Search is done client-side until API supports it.
- Status/type filtering is passed to API but may need client-side fallback.
- The `RegisteredSigner` type from `data/signers.ts` is kept for backward compatibility with existing helper functions.
