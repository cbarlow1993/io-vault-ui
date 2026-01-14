# POST /v2/vaults Endpoint Design

## Overview

Add a new endpoint to create a vault with its associated elliptic curves for HD wallet derivation.

## API Contract

**Endpoint:** `POST /v2/vaults`

**Request body:**
```json
{
  "id": "vault-uuid",
  "workspaceId": "workspace-uuid",
  "curves": [
    { "curveType": "secp256k1", "xpub": "xpub6D4B..." },
    { "curveType": "ed25519", "xpub": "edpub..." }
  ]
}
```

**Headers:** Authorization token (organisationId extracted from `request.auth`)

**Success Response (201):**
```json
{
  "id": "vault-uuid",
  "workspaceId": "workspace-uuid",
  "organisationId": "org-uuid",
  "createdAt": "2026-01-14T10:30:00Z",
  "curves": [
    { "id": "curve-uuid-1", "curveType": "secp256k1", "xpub": "xpub6D4B...", "createdAt": "..." },
    { "id": "curve-uuid-2", "curveType": "ed25519", "xpub": "edpub...", "createdAt": "..." }
  ]
}
```

**Error Responses:**
- `409 Conflict` - Vault with this ID already exists
- `400 Bad Request` - Validation errors (invalid curve type, duplicate curve types in request, missing fields)

## Database Changes

**Migration 1: Remove `name` column from Vault table**
```sql
ALTER TABLE "Vault" DROP COLUMN "name";
```

**Migration 2: Add unique constraint on VaultCurve**
```sql
ALTER TABLE "VaultCurve" ADD CONSTRAINT "VaultCurve_vaultId_curve_unique" UNIQUE ("vaultId", "curve");
```

**TypeScript type updates:**
- Remove `name` from `VaultTable` interface in `/src/lib/database/types.ts`
- Update Vault domain entity

## File Structure

**New files:**
```
src/routes/vaults/
  ├── index.ts       # Route registration
  ├── handlers.ts    # createVault handler
  └── schemas.ts     # Zod validation schemas
```

**Modified files:**
- `src/routes/index.ts` - Register new vault routes
- `src/lib/database/types.ts` - Remove `name` from VaultTable
- `src/repositories/vault.repository.ts` - Add `createVault` and `createVaultCurves` methods
- `src/domain/entities/vault/vault.ts` - Remove `name` from Vault entity

## Implementation

**Handler flow:**
1. Validate request body (Zod schema)
2. Extract `organisationId` from auth token
3. Check if vault exists → 409 if yes
4. Insert Vault row (without name)
5. Insert VaultCurve rows for each curve
6. Return 201 with full vault + curves

Steps 4-5 wrapped in a database transaction for atomicity.

## Validation

**Zod schema:**
```typescript
const curveSchema = z.object({
  curveType: z.enum(['secp256k1', 'ed25519']),
  xpub: z.string().min(1),
});

const createVaultBodySchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  curves: z.array(curveSchema).min(1).refine(
    (curves) => new Set(curves.map(c => c.curveType)).size === curves.length,
    { message: 'Duplicate curve types not allowed' }
  ),
});
```

**Error handling:**
- Duplicate curve types in request → 400 Bad Request (Zod refine)
- Vault already exists → 409 Conflict (check before insert)
- Database constraint violation on `(vaultId, curve)` → 409 Conflict (fallback)
- Invalid UUID format → 400 Bad Request (Zod validation)

## Constraints

- Only one curve per type allowed per vault (max one secp256k1, one ed25519)
- At least one curve required
- Client provides xpub for each curve
- organisationId derived from auth token
