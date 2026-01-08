# E2E Address Reconciliation Test Design

## Overview

End-to-end tests that verify the complete address lifecycle: registration, reconciliation, transaction/balance retrieval, and spam classification. These tests use real API calls with no mocks.

## Directory Structure

```
tests/
├── e2e/
│   ├── vitest.config.ts          # Separate config, no mocks
│   ├── setup.ts                  # E2E-specific setup (auth token fetching)
│   ├── utils/
│   │   ├── config.ts             # Environment config with defaults
│   │   ├── auth.ts               # OAuth token fetching
│   │   └── client.ts             # HTTP client for real API calls
│   └── flows/
│       └── address-reconciliation.test.ts   # The main e2e flow test
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STAGE` | No | `local` | Determines base URL and auth URL defaults |
| `E2E_BASE_URL` | Conditional | Based on STAGE | API base URL (required for non-local stages) |
| `E2E_CLIENT_ID` | Yes | - | OAuth client ID for token fetching |
| `E2E_CLIENT_SECRET` | Yes | - | OAuth client secret for token fetching |
| `E2E_AUTH_URL` | No | Based on STAGE | OAuth token endpoint |
| `E2E_VAULT_ID` | No | `vliyx8o5wlofpgysbssevey7` | Vault ID for testing |
| `E2E_ADDRESS` | No | `0x506EcE54C363CcB0356638cFe3E3f3F1386fba2C` | Address for testing |
| `E2E_CHAIN_ALIAS` | No | `polygon` | Chain alias for testing |

### URL Resolution Logic

**Base URL:**
- If `E2E_BASE_URL` is set → use it
- Else if `STAGE=local` → `http://localhost:3000`
- Else → throw error requiring `E2E_BASE_URL`

**Auth URL:**
- If `E2E_AUTH_URL` is set → use it
- Else if `STAGE=local` or `STAGE=dev` → `https://api.dev.iodevnet.com/v1/auth/accessToken`
- Else → throw error requiring `E2E_AUTH_URL`

## Test Flow

### Address Reconciliation E2E Flow

Sequential test that verifies the complete lifecycle:

#### 1. Register Address
```
POST /v2/vaults/:vaultId/addresses/ecosystem/evm/chain/:chainAlias
```
- Register the address for monitoring
- Accept both 201 (created) and 409 (already exists) as valid

#### 2. Verify Address in List Endpoints
```
GET /v2/vaults/:vaultId/addresses
GET /v2/vaults/:vaultId/addresses/ecosystem/evm/chain/:chainAlias
```
- Verify registered address appears in both lists

#### 3. Start Reconciliation Job
```
POST /v2/reconciliation/addresses/:address/chain/:chainAlias/reconcile
```
- Start reconciliation job
- Store jobId for polling

#### 4. Poll for Completion & Verify Results
```
GET /v2/reconciliation/reconciliation-jobs/:jobId
GET /v2/transactions/ecosystem/evm/chain/:chainAlias/address/:address
```
- Poll until job completes
- Verify transactions exist

#### 5. Verify Token Balances
```
GET /v2/balances/ecosystem/evm/chain/:chainAlias/address/:address/tokens
```
- Verify token balances returned
- Store a token contract address for spam test

#### 6. Mark Token as Spam
```
PATCH /v2/spam/... (endpoint TBD based on implementation)
```
- Mark the stored token as spam
- Store original state for cleanup

#### 7. Verify Spam Filtering
```
GET /v2/balances/.../tokens
GET /v2/balances/.../tokens?showHiddenTokens=true
```
- Without flag: spam token should be hidden
- With flag: spam token should appear with spam indicator

## Implementation Details

### Config Module (`tests/e2e/utils/config.ts`)

```typescript
export const e2eConfig = {
  get baseUrl(): string {
    if (process.env.E2E_BASE_URL) return process.env.E2E_BASE_URL;
    const stage = process.env.STAGE || 'local';
    if (stage === 'local') return 'http://localhost:3000';
    throw new Error('E2E_BASE_URL required for non-local stages');
  },

  get authUrl(): string {
    if (process.env.E2E_AUTH_URL) return process.env.E2E_AUTH_URL;
    const stage = process.env.STAGE || 'local';
    if (stage === 'local' || stage === 'dev') {
      return 'https://api.dev.iodevnet.com/v1/auth/accessToken';
    }
    throw new Error('E2E_AUTH_URL required for non-local/dev stages');
  },

  clientId: process.env.E2E_CLIENT_ID,
  clientSecret: process.env.E2E_CLIENT_SECRET,
  vaultId: process.env.E2E_VAULT_ID || 'vliyx8o5wlofpgysbssevey7',
  address: process.env.E2E_ADDRESS || '0x506EcE54C363CcB0356638cFe3E3f3F1386fba2C',
  chainAlias: process.env.E2E_CHAIN_ALIAS || 'polygon',
  ecosystem: 'evm',

  // Set after auth token is fetched
  authToken: '',
};
```

### Auth Module (`tests/e2e/utils/auth.ts`)

```typescript
export async function fetchAuthToken(
  clientId: string,
  clientSecret: string,
  authUrl: string
): Promise<string> {
  const response = await axios.post(authUrl, {
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  return response.data.access_token;
}
```

### HTTP Client (`tests/e2e/utils/client.ts`)

```typescript
export class E2EClient {
  constructor(private baseUrl: string, private authToken: string) {}

  private get headers() {
    return { Authorization: `Bearer ${this.authToken}` };
  }

  async get<T>(path: string, params?: Record<string, any>): Promise<{ status: number; data: T }>;
  async post<T>(path: string, body?: any): Promise<{ status: number; data: T }>;
  async patch<T>(path: string, body?: any): Promise<{ status: number; data: T }>;
  async delete<T>(path: string): Promise<{ status: number; data: T }>;

  async poll<T>(
    fn: () => Promise<T>,
    predicate: (result: T) => boolean,
    options: { interval?: number; timeout?: number } = {}
  ): Promise<T> {
    const { interval = 2000, timeout = 120000 } = options;
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const result = await fn();
      if (predicate(result)) return result;
      await new Promise(r => setTimeout(r, interval));
    }

    throw new Error(`Poll timeout after ${timeout}ms`);
  }
}
```

### Vitest Config (`tests/e2e/vitest.config.ts`)

```typescript
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['tests/e2e/**/*.test.ts'],
    setupFiles: ['tests/e2e/setup.ts'],
    testTimeout: 120000,      // 2 min - reconciliation can be slow
    hookTimeout: 60000,       // 1 min for setup/teardown
    sequence: {
      concurrent: false,      // Tests must run sequentially
    },
    reporters: ['verbose'],
  },
});
```

### Setup File (`tests/e2e/setup.ts`)

```typescript
import { beforeAll } from 'vitest';
import { e2eConfig, validateConfig } from './utils/config';
import { fetchAuthToken } from './utils/auth';

beforeAll(async () => {
  validateConfig();

  const token = await fetchAuthToken(
    e2eConfig.clientId!,
    e2eConfig.clientSecret!,
    e2eConfig.authUrl
  );

  e2eConfig.authToken = token;
});
```

## Cleanup Strategy

- Before modifying spam state, store the original value
- In `afterAll`, restore the original spam state
- Address registration is idempotent (accepts 409 if already exists)

## Running the Tests

```bash
# Local (server must be running on port 3000)
STAGE=local \
E2E_CLIENT_ID=your-client-id \
E2E_CLIENT_SECRET=your-client-secret \
npm run test:e2e

# Against staging
E2E_BASE_URL=https://api-staging.example.com \
E2E_AUTH_URL=https://auth-staging.example.com/v1/auth/accessToken \
E2E_CLIENT_ID=your-client-id \
E2E_CLIENT_SECRET=your-client-secret \
npm run test:e2e

# With custom address/chain
E2E_ADDRESS=0x123... \
E2E_CHAIN_ALIAS=ethereum \
E2E_VAULT_ID=custom-vault-id \
npm run test:e2e
```

## NPM Script

Add to `package.json`:
```json
{
  "scripts": {
    "test:e2e": "vitest run --config tests/e2e/vitest.config.ts"
  }
}
```
