# Integration Test Utilities

This directory contains reusable utilities for integration tests to eliminate code duplication and provide standardized test patterns.

## Key Features

### 🚀 **Simplified Test Setup**

- Pre-configured test users with authentication
- Automated access token management with caching
- Standard test data and addresses for different blockchain ecosystems

### 🔧 **Reusable Components**

- Authenticated API clients
- Common test payloads
- Endpoint builders
- Response validation helpers

### 🛡️ **Built-in Best Practices**

- Access token caching to reduce API calls
- Standardized error handling
- Cross-user permission testing utilities

## Quick Start

### Basic Setup

```typescript
import { describe, it, beforeAll } from "vitest";
import {
  setupTestUsers,
  TEST_PAYLOADS,
  buildVaultEndpoint,
  expectValidTransactionResponse,
} from "../utils/testFixtures";

describe("My Integration Test", () => {
  let clients: Record<string, { user: any; client: any }>;

  beforeAll(async () => {
    // This sets up authenticated clients for both test users
    clients = await setupTestUsers();
  });

  it("should perform some operation", async () => {
    const endpoint = buildVaultEndpoint(
      clients.CLIENT_1.user,
      "/some/endpoint"
    );

    const response = await clients.CLIENT_1.client.post(
      endpoint,
      TEST_PAYLOADS.buildTransaction.mnee
    );

    expectValidTransactionResponse(response);
  });
});
```

## Available Utilities

### Test Users

```typescript
import { TEST_USERS } from "../utils/testFixtures";

// Pre-configured test users with all necessary credentials
const user1 = TEST_USERS.CLIENT_1;
const user2 = TEST_USERS.CLIENT_2;

// Each user has:
// - clientId, clientSecret
// - organisationId, vaultId
// - addresses for different chains (evm, btc, solana)
```

### Authenticated API Clients

```typescript
import {
  createAuthenticatedApiClient,
  setupTestUsers,
} from "../utils/testFixtures";

// Method 1: Setup multiple users at once
const clients = await setupTestUsers();
await clients.CLIENT_1.client.get("/some/endpoint");

// Method 2: Create individual authenticated client
const client = await createAuthenticatedApiClient(TEST_USERS.CLIENT_1);
await client.post("/endpoint", payload);
```

### Test Data

```typescript
import { TEST_ADDRESSES, TEST_PAYLOADS } from "../utils/testFixtures";

// Valid and invalid addresses for different ecosystems
const validBtcAddress = TEST_ADDRESSES.btc.valid;
const invalidEvmAddress = TEST_ADDRESSES.evm.invalid;

// Pre-built payloads for common operations
const mneeTransactionPayload = TEST_PAYLOADS.buildTransaction.mnee;
const xrpTransactionPayload = TEST_PAYLOADS.buildTransaction.xrp;
```

### Endpoint Builders

```typescript
import { buildVaultEndpoint } from "../utils/testFixtures";

// Build vault-specific endpoints
const endpoint = buildVaultEndpoint(
  user,
  "/transactions/utxo/mnee/build-transaction"
);
```

### Response Validation

```typescript
import {
  expectValidApiResponse,
  expectValidTransactionResponse,
  expectErrorResponse,
} from "../utils/testFixtures";

// Validate successful API responses
expectValidApiResponse(response, 200);

// Validate transaction build responses
expectValidTransactionResponse(response);

// Validate error responses
expectErrorResponse(response, 400, "Invalid recipient address");
```

### Permission Testing

```typescript
import {
  testCrossUserPermissions,
  ENDPOINT_PATTERNS,
} from "../utils/testFixtures";

// Test that user2 cannot access user1's resources
await testCrossUserPermissions(
  ENDPOINT_PATTERNS,
  authorizedUser, // user who owns the resource
  unauthorizedUser, // user who should be denied access
  "evm", // ecosystem
  "polygon" // chain
);
```

## Migration Guide

### Before (Original Code)

```typescript
const CLIENT_ID_1 = process.env.CLIENT_ID_1 || "test-client-1";
const CLIENT_SECRET_1 = process.env.CLIENT_SECRET_1 || "test-secret-1";
const CLIENT_ID_1_VAULT_ID =
  process.env.CLIENT_ID_1_VAULT_ID || "test-vault-123";

const getAccessToken = async (clientId: string, clientSecret: string) => {
  const apiClient = createTestApiClient();
  const response = await apiClient.post(`${AUTH_API_URL}/v2/auth/accessToken`, {
    clientId,
    clientSecret,
  });
  return response.data.accessToken;
};

let CLIENT_ID_1_ACCESS_TOKEN: string;

beforeAll(async () => {
  CLIENT_ID_1_ACCESS_TOKEN = await getAccessToken(CLIENT_ID_1, CLIENT_SECRET_1);
});

const response = await apiClient.post(endpoint, payload, {
  headers: {
    Authorization: `Bearer ${CLIENT_ID_1_ACCESS_TOKEN}`,
  },
});

expect(response.status).toBe(201);
expect(response.data).toHaveProperty("serializedTransaction");
expect(response.data).toHaveProperty("marshalledHex");
```

### After (Using Utilities)

```typescript
import {
  setupTestUsers,
  expectValidTransactionResponse,
} from "../utils/testFixtures";

let clients: Record<string, { user: any; client: any }>;

beforeAll(async () => {
  clients = await setupTestUsers();
});

const response = await clients.CLIENT_1.client.post(endpoint, payload);
expectValidTransactionResponse(response);
```

## Benefits

1. **🔄 Eliminates Repetition**: No more copying and pasting the same auth setup across files
2. **⚡ Faster Tests**: Token caching reduces authentication API calls
3. **🛡️ Consistent Patterns**: Standardized error handling and response validation
4. **🧪 Better Test Data**: Centralized test addresses and payloads for all ecosystems
5. **📝 Cleaner Code**: Tests focus on business logic rather than boilerplate
6. **🚀 Easy Maintenance**: Update authentication logic in one place

## Environment Variables

The utilities automatically read from these environment variables:

```bash
# Client 1 (Primary test user)
CLIENT_ID_1=your-client-id-1
CLIENT_SECRET_1=your-client-secret-1
CLIENT_ID_1_ORGANISATION_ID=your-org-id-1
CLIENT_ID_1_VAULT_ID=your-vault-id-1
CLIENT_ID_1_VAULT_EVM_ADDRESS=your-evm-address-1
CLIENT_ID_1_VAULT_BTC_ADDRESS=your-btc-address-1
CLIENT_ID_1_VAULT_SOLANA_ADDRESS=your-solana-address-1

# Client 2 (Secondary test user)
CLIENT_ID_2=your-client-id-2
CLIENT_SECRET_2=your-client-secret-2
CLIENT_ID_2_ORGANISATION_ID=your-org-id-2
CLIENT_ID_2_VAULT_ID=your-vault-id-2
CLIENT_ID_2_VAULT_EVM_ADDRESS=your-evm-address-2
CLIENT_ID_2_VAULT_BTC_ADDRESS=your-btc-address-2
CLIENT_ID_2_VAULT_SOLANA_ADDRESS=your-solana-address-2
```

All variables have sensible defaults for local development.
