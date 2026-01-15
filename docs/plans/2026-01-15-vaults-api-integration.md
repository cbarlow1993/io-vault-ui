# Vaults API Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Connect the vaults data table to the vault API, replacing mock data with live API calls.

**Architecture:** oRPC router procedure calls VaultRepository which fetches from vault API. Router transforms API response (status mapping, curve transformation, placeholder values). Client uses TanStack Query via `orpc.vaults.list.queryOptions()`.

**Tech Stack:** oRPC, TanStack Query, Zod, Clerk auth (getToken), openapi-fetch

---

## Task 1: Create Vault Zod Schemas

**Files:**
- Create: `src/features/vaults/schema.ts`

**Step 1: Create the schema file with all types**

```typescript
import { z } from 'zod';

// Enums
export const zVaultStatus = z.enum(['active', 'pending', 'revoked']);
export const zCurveType = z.enum(['ECDSA', 'EdDSA']);
export const zDeviceType = z.enum(['server', 'ios', 'android']);

// Curve structure for UI display
export const zVaultCurve = z.object({
  type: zCurveType,
  curve: z.string(),
  publicKey: z.string(),
  fingerprint: z.string(),
});

// Embedded signer (simplified for list view)
export const zVaultSigner = z.object({
  id: z.string(),
  name: z.string(),
  owner: z.string(),
  deviceType: zDeviceType,
  votingPower: z.number(),
});

// Main vault type
export const zVault = z.object({
  id: z.string(),
  name: z.string(),
  curves: z.array(zVaultCurve),
  threshold: z.number(),
  signers: z.array(zVaultSigner),
  status: zVaultStatus,
  createdAt: z.string(),
  createdBy: z.string(),
  lastUsed: z.string().nullable(),
  signatureCount: z.number(),
});

// Paginated list response
export const zVaultListResponse = z.object({
  data: z.array(zVault),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

// Query parameters for list endpoint
export const zVaultListParams = z.object({
  limit: z.number().optional(),
  cursor: z.string().optional(),
  status: zVaultStatus.optional(),
  search: z.string().optional(),
});

// Type exports
export type Vault = z.infer<typeof zVault>;
export type VaultCurve = z.infer<typeof zVaultCurve>;
export type VaultSigner = z.infer<typeof zVaultSigner>;
export type VaultStatus = z.infer<typeof zVaultStatus>;
export type CurveType = z.infer<typeof zCurveType>;
export type DeviceType = z.infer<typeof zDeviceType>;
export type VaultListResponse = z.infer<typeof zVaultListResponse>;
export type VaultListParams = z.infer<typeof zVaultListParams>;
```

**Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/features/vaults/schema.ts
git commit -m "feat(vaults): add Zod schemas for vault types"
```

---

## Task 2: Create Vaults oRPC Router

**Files:**
- Create: `src/server/routers/vaults.ts`
- Modify: `src/server/router.ts`

**Step 1: Create the vaults router with transformation layer**

```typescript
import { auth as clerkAuth } from '@clerk/tanstack-react-start/server';
import { ORPCError } from '@orpc/client';

import type { Vault, VaultCurve, VaultStatus } from '@/features/vaults/schema';
import {
  zVaultListParams,
  zVaultListResponse,
} from '@/features/vaults/schema';
import { protectedProcedure } from '@/server/orpc';
import { VaultRepository } from '@/server/vault-api/repositories';

const tags = ['vaults'];

// API status type
type ApiVaultStatus = 'draft' | 'active' | 'archived';

// API curve type from vault-api.d.ts
type ApiCurve = {
  id: string;
  curve: 'edwards' | 'nist256p1' | 'secp256k1';
  algorithm: 'eddsa' | 'ecdsa';
  xpub: string;
  createdAt: string;
};

// API vault type from vault-api.d.ts
type ApiVault = {
  id: string;
  name: string;
  description?: string | null;
  threshold: number;
  status: ApiVaultStatus;
  reshareNonce: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  curves?: ApiCurve[] | null;
};

/**
 * Map API status to UI status.
 * API: draft | active | archived
 * UI: pending | active | revoked
 */
function mapApiStatusToUi(status: ApiVaultStatus): VaultStatus {
  switch (status) {
    case 'draft':
      return 'pending';
    case 'active':
      return 'active';
    case 'archived':
      return 'revoked';
  }
}

/**
 * Map UI status to API status for filtering.
 */
function mapUiStatusToApi(status: VaultStatus): ApiVaultStatus {
  switch (status) {
    case 'pending':
      return 'draft';
    case 'active':
      return 'active';
    case 'revoked':
      return 'archived';
  }
}

/**
 * Map API curve name to UI-friendly name.
 */
function mapCurveName(apiCurve: 'edwards' | 'nist256p1' | 'secp256k1'): string {
  switch (apiCurve) {
    case 'edwards':
      return 'ed25519';
    case 'secp256k1':
      return 'secp256k1';
    case 'nist256p1':
      return 'secp256r1';
  }
}

/**
 * Generate a fingerprint from a public key.
 * Format: 0x[first4]...[last4]
 */
function generateFingerprint(publicKey: string): string {
  const clean = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;
  if (clean.length < 8) return `0x${clean}`;
  return `0x${clean.slice(0, 4)}...${clean.slice(-4)}`;
}

/**
 * Transform API curve to UI curve format.
 */
function mapApiCurveToUi(apiCurve: ApiCurve): VaultCurve {
  return {
    type: apiCurve.algorithm === 'eddsa' ? 'EdDSA' : 'ECDSA',
    curve: mapCurveName(apiCurve.curve),
    publicKey: apiCurve.xpub,
    fingerprint: generateFingerprint(apiCurve.xpub),
  };
}

/**
 * Transform API vault response to UI vault format.
 * TODO: Remove placeholder values when API returns full data.
 */
function mapApiVaultToUiVault(apiVault: ApiVault): Vault {
  return {
    id: apiVault.id,
    name: apiVault.name,
    curves: (apiVault.curves ?? []).map(mapApiCurveToUi),
    threshold: apiVault.threshold,
    signers: [], // Placeholder - API doesn't return signers in list
    status: mapApiStatusToUi(apiVault.status),
    createdAt: apiVault.createdAt,
    createdBy: apiVault.createdBy,
    lastUsed: null, // Placeholder - not available in API
    signatureCount: 0, // Placeholder - requires separate API call
  };
}

/**
 * Filter vaults client-side by search term.
 */
function filterVaultsBySearch(vaults: Vault[], search?: string): Vault[] {
  if (!search) return vaults;

  const searchLower = search.toLowerCase();
  return vaults.filter((vault) => {
    const matchesName = vault.name.toLowerCase().includes(searchLower);
    const matchesCreatedBy = vault.createdBy.toLowerCase().includes(searchLower);
    return matchesName || matchesCreatedBy;
  });
}

export default {
  list: protectedProcedure({ permission: null })
    .route({
      method: 'GET',
      path: '/vaults',
      tags,
    })
    .input(zVaultListParams.optional())
    .output(zVaultListResponse)
    .handler(async ({ context, input }) => {
      context.logger.info('Fetching vaults list');

      // Get auth token for vault API
      const authState = await clerkAuth();
      const token = await authState.getToken();

      if (!token) {
        throw new ORPCError('UNAUTHORIZED', {
          message: 'No authentication token available',
        });
      }

      // Map UI status to API status for filtering
      const apiStatus = input?.status ? mapUiStatusToApi(input.status) : undefined;

      const vaultRepo = new VaultRepository(token);
      const result = await vaultRepo.list({
        limit: input?.limit,
        cursor: input?.cursor,
        status: apiStatus,
      });

      // Transform API response to UI format with placeholder values
      const transformedVaults = (result.data as ApiVault[]).map(mapApiVaultToUiVault);

      // Apply client-side search filter
      const filteredVaults = filterVaultsBySearch(transformedVaults, input?.search);

      return {
        data: filteredVaults,
        nextCursor: result.nextCursor ?? null,
        hasMore: result.hasMore,
      };
    }),
};
```

**Step 2: Update the main router to include vaults**

Edit `src/server/router.ts` - add import and register:

```typescript
import vaultsRouter from './routers/vaults';

// In the router object, add:
export const router = {
  account: accountRouter,
  billing: billingRouter,
  config: configRouter,
  signers: signersRouter,
  vaults: vaultsRouter,
};
```

**Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/server/routers/vaults.ts src/server/router.ts
git commit -m "feat(vaults): add oRPC router with API transformation layer"
```

---

## Task 3: Update Vaults Page to Use API

**Files:**
- Modify: `src/features/vaults/page-keys.tsx`

**Step 1: Add imports for API integration**

At the top of the file, add:

```typescript
import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/client';
import type { VaultStatus } from './schema';
```

**Step 2: Replace mock data with useQuery**

Remove the mock data import:

```typescript
// REMOVE this line:
import { allVaults } from './data/vaults';
```

Inside the `PageTreasury6Keys` component, add the query hook after the state declarations:

```typescript
// Fetch vaults from API
const {
  data: vaultsData,
  isLoading,
  isError,
  refetch,
} = useQuery(
  orpc.vaults.list.queryOptions({
    limit: 50, // Fetch enough for client-side pagination initially
    status:
      statusFilter?.id !== 'all'
        ? (statusFilter?.id as VaultStatus)
        : undefined,
    search: search || undefined,
  })
);

// Use fetched data or empty array while loading
const allVaults = vaultsData?.data ?? [];
```

**Step 3: Update filteredVaults to use API data**

Replace the existing `filteredVaults` useMemo with a simpler version (server handles filtering):

```typescript
// Data is already filtered server-side by status and search
const filteredVaults = allVaults;
```

**Step 4: Update the table to handle signatures count**

In the table body, update the signatures cell to use `signatureCount` instead of `signatures.length`:

```typescript
// Change from:
{vault.signatures.length}

// To:
{vault.signatureCount}
```

**Step 5: Add loading and error states to the table**

Update the table body to show loading/error states:

```typescript
<tbody className="divide-y divide-neutral-100">
  {isLoading ? (
    <tr>
      <td colSpan={7} className="px-3 py-8 text-center text-neutral-500">
        Loading vaults...
      </td>
    </tr>
  ) : isError ? (
    <tr>
      <td colSpan={7} className="px-3 py-8 text-center text-neutral-500">
        <div className="flex flex-col items-center gap-2">
          <span>Failed to load vaults</span>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-brand-500 hover:underline"
          >
            Retry
          </button>
        </div>
      </td>
    </tr>
  ) : paginatedVaults.length === 0 ? (
    <tr>
      <td colSpan={7} className="px-3 py-8 text-center text-neutral-500">
        No vaults found matching your filters.
      </td>
    </tr>
  ) : (
    paginatedVaults.map((vault) => (
      // ... existing row rendering
    ))
  )}
</tbody>
```

**Step 6: Update summary cards to handle loading state**

```typescript
{/* Summary Cards */}
<div className="grid grid-cols-4 gap-px bg-neutral-200">
  <div className="bg-white p-3">
    <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
      Total Vaults
    </p>
    <p className="mt-1 text-lg font-semibold text-neutral-900 tabular-nums">
      {isLoading ? '—' : allVaults.length}
    </p>
  </div>
  <div className="bg-white p-3">
    <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
      Active
    </p>
    <p className="mt-1 text-lg font-semibold text-positive-600 tabular-nums">
      {isLoading ? '—' : allVaults.filter((v) => v.status === 'active').length}
    </p>
  </div>
  <div className="bg-white p-3">
    <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
      Pending
    </p>
    <p className="mt-1 text-lg font-semibold text-warning-600 tabular-nums">
      {isLoading ? '—' : allVaults.filter((v) => v.status === 'pending').length}
    </p>
  </div>
  <div className="bg-white p-3">
    <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
      Revoked
    </p>
    <p className="mt-1 text-lg font-semibold text-neutral-500 tabular-nums">
      {isLoading ? '—' : allVaults.filter((v) => v.status === 'revoked').length}
    </p>
  </div>
</div>
```

**Step 7: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 8: Commit**

```bash
git add src/features/vaults/page-keys.tsx
git commit -m "feat(vaults): connect data table to API via useQuery"
```

---

## Task 4: Test the Integration

**Step 1: Start the dev server**

Run: `npm run dev`
Expected: Server starts without errors

**Step 2: Navigate to vaults page**

Open browser to `/vaults`
Expected:
- Loading state shows briefly
- If API returns data: table displays vaults
- If API returns error: error state shows with retry button

**Step 3: Test filters**

- Change status filter to "Active"
- Change status filter to "Pending"
- Type in search box

Expected: Table updates (may show loading state during refetch)

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(vaults): complete API integration for vaults table"
```

---

## Files Summary

| File | Action |
|------|--------|
| `src/features/vaults/schema.ts` | CREATE |
| `src/server/routers/vaults.ts` | CREATE |
| `src/server/router.ts` | MODIFY (add vaults router) |
| `src/features/vaults/page-keys.tsx` | MODIFY (replace mock with useQuery) |

---

## Notes

- The vault API returns different status values than the UI expects. The router maps them: 'draft'→'pending', 'archived'→'revoked'.
- Curve structure is transformed: algorithm→type, xpub→publicKey, fingerprint is generated.
- Placeholder values are used for: signers (empty array), signatureCount (0), lastUsed (null).
- Search is done server-side in the router (filters by name and createdBy).
- Status filtering uses the API's status parameter with mapped values.
- The `allVaults` mock data import is removed and replaced with API data.
