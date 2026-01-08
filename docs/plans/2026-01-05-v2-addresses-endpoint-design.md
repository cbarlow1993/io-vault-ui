# Design: POST /v2/vaults/:vaultId/addresses

## Overview

A new endpoint to generate and save addresses in a single operation, with optional HD derivation path support.

## Endpoint

```
POST /v2/vaults/:vaultId/addresses
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `vaultId` | string (UUID or CUID) | The vault to generate an address for |

### Request Body

```typescript
{
  chainAlias: string;         // required - e.g., "ethereum", "bitcoin"
  derivationPath?: string;    // optional - e.g., "m/44/60/0/0/0"
  monitor?: boolean;          // optional - start monitoring, default false
  alias?: string;             // optional - human-readable name
}
```

### Response (201 Created)

```typescript
{
  address: string;
  chain: string;
  vaultId: string;
  workspaceId: string;
  derivationPath: string | null;
  subscriptionId: string | null;
  monitored: boolean;
  monitoredAt?: string;
  unmonitoredAt?: string;
  updatedAt: string;
  tokens: Token[];
  alias: string | null;
}
```

### Errors

| Status | Condition |
|--------|-----------|
| 400 | Invalid chainAlias or derivationPath format |
| 403 | Organisation mismatch (auth org does not match vault org) |
| 404 | Vault not found or no curves for vault |
| 409 | Address already exists for this chain |

## Flow

1. **Auth** - Extract `organisationId` from JWT
2. **Vault lookup** - Fetch vault metadata to get `workspaceId` and vault's `organisationId`
3. **Authorization** - Validate auth org matches vault org (return 403 if mismatch)
4. **Resolve chain** - Get chain config from `chainAlias` via `Chain.fromAlias()`
5. **Get curves** - Fetch curves via `getVaultCurves(vaultId)`
6. **Generate address** - Use `chain.loadWallet(vault)` and derive if `derivationPath` provided
7. **Check duplicate** - Return 409 if address+chain already exists
8. **Save** - Insert into `addresses` table
9. **Monitor** (optional) - If `monitor: true`, set up transaction monitoring
10. **Response** - Return full address object

## File Structure

```
services/core/src/routes/
├── v2/
│   └── addresses/
│       ├── index.ts        # Route registration
│       ├── handlers.ts     # Request handler
│       └── schemas.ts      # Zod/JSON schemas
```

## Dependencies

- `Address.generate()` - existing address generation logic
- `getVaultCurves()` - fetch cryptographic curves for vault
- `Chain.fromAlias()` - resolve chain configuration
- `Vault.getWorkspaceId()` - get workspace from vault
- `addressRepository.create()` - persist address to database
- `setMonitored()` - enable transaction monitoring (optional)
