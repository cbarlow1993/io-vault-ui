# Vaults API Integration Design

## Overview

Integrate the vaults data table (`src/features/vaults/page-keys.tsx`) with the vault API, replacing mock data with live API calls using the existing oRPC + TanStack Query pattern.

## Architecture

```
src/
├── features/vaults/
│   ├── schema.ts          (NEW - Zod schemas for vaults)
│   └── page-keys.tsx      (UPDATE - replace mock data with useQuery)
├── server/
│   ├── routers/
│   │   └── vaults.ts      (NEW - oRPC procedures + transformation)
│   └── router.ts          (UPDATE - add vaults router)
```

**Data flow:**
1. `page-keys.tsx` calls `useQuery(orpc.vaults.list.queryOptions(...))`
2. oRPC router in `vaults.ts` calls `VaultRepository.list()`
3. Router transforms API response to UI schema with placeholder values
4. Results flow back to the UI

## Data Structure Mapping

### Status Mapping

| API Status | UI Status |
|------------|-----------|
| `draft` | `pending` |
| `active` | `active` |
| `archived` | `revoked` |

### Curve Transformation

| API Field | UI Field | Transformation |
|-----------|----------|----------------|
| `algorithm` | `type` | 'eddsa' → 'EdDSA', 'ecdsa' → 'ECDSA' |
| `curve` | `curve` | 'edwards' → 'ed25519', 'secp256k1' → 'secp256k1', 'nist256p1' → 'secp256r1' |
| `xpub` | `publicKey` | Direct copy |
| ❌ | `fingerprint` | Generated from publicKey (first/last 4 chars) |

### Placeholder Values

Fields not available in API list response:

| UI Field | Placeholder Value |
|----------|-------------------|
| `signers` | `[]` (empty array) |
| `signatureCount` | `0` |
| `lastUsed` | `null` |

## API Requirements

### Query Parameters (existing)

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Page size |
| `cursor` | string | Pagination cursor |
| `order` | 'asc' \| 'desc' | Sort order |
| `status` | 'draft' \| 'active' \| 'archived' | Filter by status |

### Response Fields (per vault)

From API:
- `id`, `name`, `description`, `threshold`
- `status` ('draft' \| 'active' \| 'archived')
- `curves` (array with id, curve, algorithm, xpub, createdAt)
- `createdAt`, `updatedAt`, `createdBy`, `reshareNonce`

## Schema Design

```typescript
// Enums
zVaultStatus = z.enum(['active', 'pending', 'revoked'])
zCurveType = z.enum(['ECDSA', 'EdDSA'])
zDeviceType = z.enum(['server', 'ios', 'android'])

// Curve structure for UI
zVaultCurve = z.object({
  type: zCurveType,
  curve: z.string(),
  publicKey: z.string(),
  fingerprint: z.string(),
})

// Embedded signer (for list view)
zVaultSigner = z.object({
  id: z.string(),
  name: z.string(),
  owner: z.string(),
  deviceType: zDeviceType,
  votingPower: z.number(),
})

// Main vault type
zVault = z.object({
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
})

// List response
zVaultListResponse = z.object({
  data: z.array(zVault),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
})

// Query params
zVaultListParams = z.object({
  limit: z.number().optional(),
  cursor: z.string().optional(),
  status: zVaultStatus.optional(),
  search: z.string().optional(),
})
```

## Implementation Details

### Transformation Functions

```typescript
// Status mapping
function mapApiStatusToUi(status: 'draft' | 'active' | 'archived'): VaultStatus {
  const map = { draft: 'pending', active: 'active', archived: 'revoked' };
  return map[status];
}

function mapUiStatusToApi(status: VaultStatus): 'draft' | 'active' | 'archived' {
  const map = { pending: 'draft', active: 'active', revoked: 'archived' };
  return map[status];
}

// Curve name mapping
function mapCurveName(apiCurve: string): string {
  const map = { edwards: 'ed25519', secp256k1: 'secp256k1', nist256p1: 'secp256r1' };
  return map[apiCurve] ?? apiCurve;
}

// Fingerprint generation
function generateFingerprint(publicKey: string): string {
  const clean = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;
  return `0x${clean.slice(0, 4)}...${clean.slice(-4)}`;
}
```

### Filtering Strategy

- **Status filter:** Mapped to API query param (UI 'pending' → API 'draft')
- **Search filter:** Client-side filtering by name and createdBy

## Files Summary

| File | Action |
|------|--------|
| `src/features/vaults/schema.ts` | CREATE |
| `src/server/routers/vaults.ts` | CREATE |
| `src/server/router.ts` | MODIFY (add vaults router) |
| `src/features/vaults/page-keys.tsx` | MODIFY (replace mock with useQuery) |

## Notes

- Uses same pattern as signers API integration
- Placeholder values used until API provides full data
- Client-side search until API supports text search
- `signatureCount` used instead of full signatures array for efficiency
