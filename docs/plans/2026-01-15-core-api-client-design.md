# Core API Client Design

## Overview

Create a new API client for the Core API (multi-chain vault management) following the same pattern as the existing `vault-api` client.

## Configuration

### Type Generation (`redocly.yaml`)

```yaml
apis:
  vault:
    root: ./apiSpec.json
    x-openapi-ts:
      output: ./src/lib/api/vault-api.d.ts
  core:
    root: ./docs/apis/cryptoSpec.json
    x-openapi-ts:
      output: ./src/lib/api/core-api.d.ts
```

### Environment Variable (`src/env/server.ts`)

Add `CORE_API_URL: z.url()` to the server environment schema.

## Directory Structure

```
src/server/core-api/
├── client.ts          # openapi-fetch client pointing to CORE_API_URL
├── errors.ts          # Domain-specific errors
├── types.ts           # Re-exports + type helpers
└── repositories/
    ├── index.ts
    ├── chain.repository.ts
    ├── module.repository.ts
    ├── organisation.repository.ts
    ├── vault.repository.ts
    ├── address.repository.ts
    ├── balance.repository.ts
    ├── transaction.repository.ts
    ├── reconciliation.repository.ts
    ├── workflow.repository.ts
    └── spam-override.repository.ts
```

## Error Classes

- `CoreApiError` - Base error class
- `CoreApiUnauthorizedError` - 401 responses
- `CoreApiForbiddenError` - 403 responses
- `CoreApiValidationError` - 400 responses
- `CoreApiNotFoundError` - 404 responses

## Repository Methods

### ChainRepository
- `list(params?)` - List supported chains

### ModuleRepository
- `list()` - List available modules
- `getRoles(moduleId)` - List roles for a module
- `getActions(moduleId)` - List actions for a module

### OrganisationRepository
- `getUserRoles(orgId, userId)` - Get all roles for a user
- `getGlobalRole(orgId, userId)` - Get user's global role
- `getModuleRoles(orgId, userId)` - Get user's module-level roles
- `setModuleRole(orgId, userId, moduleId, body)` - Set module role

### VaultRepository
- `list(params?)` - List vaults

### AddressRepository
- `list(vaultId, params?)` - List addresses for a vault
- `listByChain(vaultId, ecosystem, chainAlias, params?)` - List addresses by chain
- `get(vaultId, ecosystem, chainAlias, address)` - Get address details
- `create(vaultId, ecosystem, chainAlias, body)` - Create address
- `update(vaultId, ecosystem, chainAlias, address, body)` - Update address
- `startMonitoring(vaultId, ecosystem, chainAlias, address)` - Start monitoring
- `stopMonitoring(vaultId, ecosystem, chainAlias, address)` - Stop monitoring
- `createHdAddress(vaultId, ecosystem, chainAlias, body?)` - Create HD address
- `listHdAddresses(vaultId, ecosystem, chainAlias, params?)` - List HD addresses
- `generate(vaultId, body)` - Generate address from vault curves

### BalanceRepository
- `getNative(ecosystem, chainAlias, address)` - Get native balance
- `getTokens(ecosystem, chainAlias, address)` - Get token balances

### TransactionRepository
- `list(ecosystem, chainAlias, address)` - List transactions
- `get(ecosystem, chainAlias, address, txHash)` - Get transaction details
- `scan(ecosystem, chainAlias, body)` - Scan a transaction
- `buildNative(vaultId, ecosystem, chainAlias, body)` - Build native transaction
- `buildToken(vaultId, ecosystem, chainAlias, body)` - Build token transaction
- `submit(vaultId, ecosystem, chainAlias, body)` - Submit transaction
- `createDurableNonce(vaultId)` - Create Solana durable nonce
- `buildDurableNonceTransaction(vaultId, body)` - Build Solana durable nonce tx

### ReconciliationRepository
- `reconcile(address, chainAlias)` - Trigger reconciliation
- `listJobs(address, chainAlias)` - List reconciliation jobs
- `getJob(jobId)` - Get job status

### WorkflowRepository
- `list(params?)` - List workflows
- `get(id)` - Get workflow details
- `approve(id, body)` - Approve workflow
- `reject(id, body)` - Reject workflow
- `confirm(id, body)` - Confirm workflow
- `review(id)` - Mark as reviewed
- `getHistory(id)` - Get workflow history

### SpamOverrideRepository
- `list(addressId)` - List spam overrides
- `set(addressId, tokenAddress, body)` - Set spam override
