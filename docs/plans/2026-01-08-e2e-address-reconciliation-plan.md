# E2E Address Reconciliation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create e2e tests that verify the complete address lifecycle with real API calls.

**Architecture:** New `tests/e2e/` directory with Vitest config, HTTP client using axios, OAuth token fetching via client credentials, and a sequential test flow covering registration → listing → reconciliation → balances → spam.

**Tech Stack:** Vitest, axios, TypeScript

---

## Task 0: Prerequisite - Add ID to Address Response

The spam endpoint requires `addressId` (UUID) but address responses don't include it. Update the formatter.

**Files:**
- Modify: `src/services/addresses/postgres-formatter.ts:11-27`

**Step 1: Update formatter to include id**

```typescript
export function formatAddressFromPostgres(
  address: Address,
  tokens: AddressToken[] = []
): Addresses.Address {
  return {
    id: address.id,  // Add this line
    address: address.address,
    chainAlias: address.chain_alias,
    vaultId: address.vault_id,
    workspaceId: address.workspace_id,
    derivationPath: address.derivation_path ?? null,
    subscriptionId: address.subscription_id ?? null,
    monitored: address.is_monitored,
    monitoredAt: address.monitored_at?.toISOString(),
    unmonitoredAt: address.unmonitored_at?.toISOString(),
    updatedAt: address.updated_at.toISOString(),
    tokens: tokens.map(formatTokenFromPostgres),
    alias: address.alias ?? null,
    lastReconciledBlock: address.last_reconciled_block !== null && address.last_reconciled_block !== undefined
      ? Number(address.last_reconciled_block)
      : null,
  };
}
```

**Step 2: Verify types allow this**

The `addressResponseSchema` has `.passthrough()` so extra fields are allowed.

**Step 3: Commit**

```bash
git add src/services/addresses/postgres-formatter.ts
git commit -m "feat(addresses): include id in address response"
```

---

## Task 1: Create E2E Directory Structure

**Files:**
- Create: `tests/e2e/vitest.config.ts`
- Create: `tests/e2e/setup.ts`
- Create: `tests/e2e/utils/config.ts`
- Create: `tests/e2e/utils/auth.ts`
- Create: `tests/e2e/utils/client.ts`

**Step 1: Create vitest config**

Create `tests/e2e/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['tests/e2e/**/*.test.ts'],
    setupFiles: ['tests/e2e/setup.ts'],
    testTimeout: 120000,
    hookTimeout: 60000,
    sequence: {
      concurrent: false,
    },
    reporters: ['verbose'],
  },
});
```

**Step 2: Commit**

```bash
git add tests/e2e/vitest.config.ts
git commit -m "chore(e2e): add vitest configuration"
```

---

## Task 2: Create Config Module

**Files:**
- Create: `tests/e2e/utils/config.ts`

**Step 1: Create config module**

Create `tests/e2e/utils/config.ts`:

```typescript
/**
 * E2E Test Configuration
 *
 * Environment variables with defaults for flexible test execution.
 */

function getBaseUrl(): string {
  if (process.env.E2E_BASE_URL) {
    return process.env.E2E_BASE_URL;
  }

  const stage = process.env.STAGE || 'local';
  if (stage === 'local') {
    return 'http://localhost:3000';
  }

  throw new Error(
    'E2E_BASE_URL environment variable is required for non-local stages'
  );
}

function getAuthUrl(): string {
  if (process.env.E2E_AUTH_URL) {
    return process.env.E2E_AUTH_URL;
  }

  const stage = process.env.STAGE || 'local';
  if (stage === 'local' || stage === 'dev') {
    return 'https://api.dev.iodevnet.com/v1/auth/accessToken';
  }

  throw new Error(
    'E2E_AUTH_URL environment variable is required for non-local/dev stages'
  );
}

export const e2eConfig = {
  get baseUrl(): string {
    return getBaseUrl();
  },

  get authUrl(): string {
    return getAuthUrl();
  },

  get clientId(): string {
    const clientId = process.env.E2E_CLIENT_ID;
    if (!clientId) {
      throw new Error('E2E_CLIENT_ID environment variable is required');
    }
    return clientId;
  },

  get clientSecret(): string {
    const clientSecret = process.env.E2E_CLIENT_SECRET;
    if (!clientSecret) {
      throw new Error('E2E_CLIENT_SECRET environment variable is required');
    }
    return clientSecret;
  },

  vaultId: process.env.E2E_VAULT_ID || 'vliyx8o5wlofpgysbssevey7',
  address: process.env.E2E_ADDRESS || '0x506EcE54C363CcB0356638cFe3E3f3F1386fba2C',
  chainAlias: process.env.E2E_CHAIN_ALIAS || 'polygon',
  ecosystem: 'evm' as const,

  // Auth token is set after fetching
  authToken: '',
};

/**
 * Validates required configuration is present.
 * Throws early if missing required values.
 */
export function validateConfig(): void {
  // Access getters to trigger validation
  e2eConfig.baseUrl;
  e2eConfig.authUrl;
  e2eConfig.clientId;
  e2eConfig.clientSecret;
}
```

**Step 2: Commit**

```bash
git add tests/e2e/utils/config.ts
git commit -m "feat(e2e): add config module with environment defaults"
```

---

## Task 3: Create Auth Module

**Files:**
- Create: `tests/e2e/utils/auth.ts`

**Step 1: Create auth module**

Create `tests/e2e/utils/auth.ts`:

```typescript
import axios from 'axios';

interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Fetches an OAuth access token using client credentials grant.
 */
export async function fetchAuthToken(
  clientId: string,
  clientSecret: string,
  authUrl: string
): Promise<string> {
  try {
    const response = await axios.post<AuthResponse>(
      authUrl,
      {
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.data.access_token) {
      throw new Error('No access_token in auth response');
    }

    return response.data.access_token;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Failed to fetch auth token: ${message}`);
    }
    throw error;
  }
}
```

**Step 2: Commit**

```bash
git add tests/e2e/utils/auth.ts
git commit -m "feat(e2e): add OAuth token fetching module"
```

---

## Task 4: Create HTTP Client

**Files:**
- Create: `tests/e2e/utils/client.ts`

**Step 1: Create HTTP client**

Create `tests/e2e/utils/client.ts`:

```typescript
import axios, { type AxiosInstance, type AxiosError } from 'axios';

export interface ApiResponse<T = unknown> {
  status: number;
  data: T;
  headers: Record<string, string>;
}

export interface PollOptions {
  interval?: number;
  timeout?: number;
}

/**
 * E2E HTTP client for making authenticated API requests.
 */
export class E2EClient {
  private client: AxiosInstance;

  constructor(baseUrl: string, authToken: string) {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      validateStatus: () => true, // Don't throw on non-2xx
    });
  }

  async get<T = unknown>(
    path: string,
    params?: Record<string, unknown>
  ): Promise<ApiResponse<T>> {
    const response = await this.client.get<T>(path, { params });
    return {
      status: response.status,
      data: response.data,
      headers: response.headers as Record<string, string>,
    };
  }

  async post<T = unknown>(
    path: string,
    body?: Record<string, unknown>
  ): Promise<ApiResponse<T>> {
    const response = await this.client.post<T>(path, body);
    return {
      status: response.status,
      data: response.data,
      headers: response.headers as Record<string, string>,
    };
  }

  async patch<T = unknown>(
    path: string,
    body?: Record<string, unknown>
  ): Promise<ApiResponse<T>> {
    const response = await this.client.patch<T>(path, body);
    return {
      status: response.status,
      data: response.data,
      headers: response.headers as Record<string, string>,
    };
  }

  async delete<T = unknown>(path: string): Promise<ApiResponse<T>> {
    const response = await this.client.delete<T>(path);
    return {
      status: response.status,
      data: response.data,
      headers: response.headers as Record<string, string>,
    };
  }

  /**
   * Polls a function until a predicate is satisfied or timeout occurs.
   */
  async poll<T>(
    fn: () => Promise<T>,
    predicate: (result: T) => boolean,
    options: PollOptions = {}
  ): Promise<T> {
    const { interval = 2000, timeout = 120000 } = options;
    const start = Date.now();
    let lastResult: T;

    while (Date.now() - start < timeout) {
      lastResult = await fn();
      if (predicate(lastResult)) {
        return lastResult;
      }
      await this.sleep(interval);
    }

    throw new Error(
      `Poll timeout after ${timeout}ms. Last result: ${JSON.stringify(lastResult!)}`
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

**Step 2: Commit**

```bash
git add tests/e2e/utils/client.ts
git commit -m "feat(e2e): add HTTP client with polling support"
```

---

## Task 5: Create Setup File

**Files:**
- Create: `tests/e2e/setup.ts`

**Step 1: Create setup file**

Create `tests/e2e/setup.ts`:

```typescript
import { beforeAll } from 'vitest';
import { e2eConfig, validateConfig } from './utils/config.js';
import { fetchAuthToken } from './utils/auth.js';

beforeAll(async () => {
  console.log('🔧 E2E Setup: Validating configuration...');
  validateConfig();

  console.log('🔑 E2E Setup: Fetching auth token...');
  const token = await fetchAuthToken(
    e2eConfig.clientId,
    e2eConfig.clientSecret,
    e2eConfig.authUrl
  );

  e2eConfig.authToken = token;
  console.log('✅ E2E Setup: Auth token acquired');
  console.log(`📍 E2E Setup: Base URL: ${e2eConfig.baseUrl}`);
  console.log(`📍 E2E Setup: Vault ID: ${e2eConfig.vaultId}`);
  console.log(`📍 E2E Setup: Address: ${e2eConfig.address}`);
  console.log(`📍 E2E Setup: Chain: ${e2eConfig.chainAlias}`);
});
```

**Step 2: Commit**

```bash
git add tests/e2e/setup.ts
git commit -m "feat(e2e): add test setup with auth token fetching"
```

---

## Task 6: Add NPM Script

**Files:**
- Modify: `package.json`

**Step 1: Add test:e2e script**

Add to the `scripts` section in `package.json`:

```json
"test:e2e": "vitest run --config tests/e2e/vitest.config.ts"
```

**Step 2: Commit**

```bash
git add package.json
git commit -m "chore: add test:e2e npm script"
```

---

## Task 7: Create E2E Test File

**Files:**
- Create: `tests/e2e/flows/address-reconciliation.test.ts`

**Step 1: Create the test file**

Create `tests/e2e/flows/address-reconciliation.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { e2eConfig } from '../utils/config.js';
import { E2EClient } from '../utils/client.js';

/**
 * E2E Test: Address Reconciliation Flow
 *
 * Tests the complete address lifecycle:
 * 1. Register address for monitoring
 * 2. Verify address appears in list endpoints
 * 3. Start reconciliation job
 * 4. Poll for job completion
 * 5. Verify transactions exist
 * 6. Verify token balances
 * 7. Mark a token as spam
 * 8. Verify spam filtering
 * 9. Cleanup: restore original spam state
 */
describe('Address Reconciliation E2E Flow', () => {
  let client: E2EClient;

  // Shared state across tests
  let addressId: string;
  let reconciliationJobId: string;
  let tokenAddressForSpamTest: string;
  let originalSpamOverride: string | null;

  // Build endpoint paths
  const vaultPath = `/v2/vaults/${e2eConfig.vaultId}`;
  const addressPath = `${vaultPath}/addresses/ecosystem/${e2eConfig.ecosystem}/chain/${e2eConfig.chainAlias}`;
  const fullAddressPath = `${addressPath}/address/${e2eConfig.address}`;
  const reconcilePath = `/v2/reconciliation/addresses/${e2eConfig.address}/chain/${e2eConfig.chainAlias}/reconcile`;
  const transactionsPath = `/v2/transactions/ecosystem/${e2eConfig.ecosystem}/chain/${e2eConfig.chainAlias}/address/${e2eConfig.address}`;
  const tokenBalancesPath = `/v2/balances/ecosystem/${e2eConfig.ecosystem}/chain/${e2eConfig.chainAlias}/address/${e2eConfig.address}/tokens`;

  beforeAll(() => {
    client = new E2EClient(e2eConfig.baseUrl, e2eConfig.authToken);
  });

  afterAll(async () => {
    // Cleanup: restore original spam state if we modified it
    if (addressId && tokenAddressForSpamTest) {
      try {
        if (originalSpamOverride === null) {
          // Remove the override we added
          await client.delete(
            `/v2/addresses/${addressId}/tokens/${tokenAddressForSpamTest}/spam-override`
          );
        } else {
          // Restore original override
          await client.patch(
            `/v2/addresses/${addressId}/tokens/${tokenAddressForSpamTest}/spam-override`,
            { override: originalSpamOverride }
          );
        }
        console.log('✅ Cleanup: Restored original spam state');
      } catch (error) {
        console.warn('⚠️ Cleanup: Failed to restore spam state', error);
      }
    }
  });

  // ==================== 1. Register Address ====================

  it('should register the address for monitoring', async () => {
    const response = await client.post<{ id: string; address: string; monitored: boolean }>(
      addressPath,
      {
        address: e2eConfig.address,
        monitor: true,
      }
    );

    // Accept both 201 (created) and 200/409 (already exists)
    expect([200, 201, 409]).toContain(response.status);

    if (response.status === 201 || response.status === 200) {
      expect(response.data.address.toLowerCase()).toBe(e2eConfig.address.toLowerCase());
      addressId = response.data.id;
    }

    // If 409, we need to get the address details to get the ID
    if (response.status === 409 || !addressId) {
      const detailsResponse = await client.get<{ id: string }>(fullAddressPath);
      expect(detailsResponse.status).toBe(200);
      addressId = detailsResponse.data.id;
    }

    expect(addressId).toBeDefined();
    console.log(`📍 Address ID: ${addressId}`);
  });

  // ==================== 2. Verify Address in Lists ====================

  it('should return the address in vault addresses list', async () => {
    const response = await client.get<{
      data: Array<{ address: string; chainAlias: string }>;
    }>(`${vaultPath}/addresses`);

    expect(response.status).toBe(200);
    expect(response.data.data).toBeDefined();

    const found = response.data.data.find(
      (a) => a.address.toLowerCase() === e2eConfig.address.toLowerCase()
    );
    expect(found).toBeDefined();
    expect(found?.chainAlias).toBe(e2eConfig.chainAlias);
  });

  it('should return the address in chain-specific list', async () => {
    const response = await client.get<{
      data: Array<{ address: string }>;
    }>(addressPath);

    expect(response.status).toBe(200);
    expect(response.data.data).toBeDefined();

    const found = response.data.data.find(
      (a) => a.address.toLowerCase() === e2eConfig.address.toLowerCase()
    );
    expect(found).toBeDefined();
  });

  // ==================== 3. Start Reconciliation ====================

  it('should start a reconciliation job', async () => {
    const response = await client.post<{
      jobId: string;
      status: string;
      mode: string;
    }>(reconcilePath, {
      mode: 'partial',
    });

    expect(response.status).toBe(201);
    expect(response.data.jobId).toBeDefined();
    expect(response.data.status).toBe('pending');

    reconciliationJobId = response.data.jobId;
    console.log(`📍 Reconciliation Job ID: ${reconciliationJobId}`);
  });

  // ==================== 4. Poll for Completion ====================

  it('should complete the reconciliation job', async () => {
    const jobPath = `/v2/reconciliation/reconciliation-jobs/${reconciliationJobId}`;

    const result = await client.poll<{ data: { status: string; summary?: { transactionsProcessed: number } } }>(
      () => client.get(jobPath),
      (response) => {
        const status = response.data.status;
        return status === 'completed' || status === 'failed';
      },
      { interval: 3000, timeout: 180000 } // 3 minutes max for reconciliation
    );

    expect(result.data.status).toBe('completed');
    console.log(`✅ Reconciliation completed. Transactions processed: ${result.data.summary?.transactionsProcessed}`);
  });

  // ==================== 5. Verify Transactions ====================

  it('should return transactions for the address', async () => {
    const response = await client.get<{
      data: Array<{ hash: string; timestamp: string }>;
    }>(transactionsPath);

    expect(response.status).toBe(200);
    expect(response.data.data).toBeDefined();
    expect(Array.isArray(response.data.data)).toBe(true);

    // The address should have some transactions after reconciliation
    console.log(`📊 Found ${response.data.data.length} transactions`);
  });

  // ==================== 6. Verify Token Balances ====================

  it('should return token balances', async () => {
    const response = await client.get<{
      data: Array<{ address: string; symbol: string; balance: string }>;
    }>(tokenBalancesPath);

    expect(response.status).toBe(200);
    expect(response.data.data).toBeDefined();
    expect(Array.isArray(response.data.data)).toBe(true);

    console.log(`📊 Found ${response.data.data.length} tokens`);

    // Store first token for spam test (if any tokens exist)
    if (response.data.data.length > 0) {
      tokenAddressForSpamTest = response.data.data[0].address;
      console.log(`📍 Token for spam test: ${tokenAddressForSpamTest}`);
    }
  });

  // ==================== 7. Mark Token as Spam ====================

  it('should mark a token as spam', async () => {
    // Skip if no tokens available
    if (!tokenAddressForSpamTest) {
      console.log('⏭️ Skipping spam test - no tokens available');
      return;
    }

    // First, get current state to store for cleanup
    const currentResponse = await client.get<{
      data: Array<{ address: string; userOverride?: string | null }>;
    }>(`${tokenBalancesPath}?showHiddenTokens=true`);

    const currentToken = currentResponse.data.data.find(
      (t) => t.address.toLowerCase() === tokenAddressForSpamTest.toLowerCase()
    );
    originalSpamOverride = currentToken?.userOverride ?? null;

    // Mark as spam
    const response = await client.patch<{
      tokenAddress: string;
      userOverride: string;
    }>(
      `/v2/addresses/${addressId}/tokens/${tokenAddressForSpamTest}/spam-override`,
      { override: 'spam' }
    );

    expect(response.status).toBe(200);
    expect(response.data.userOverride).toBe('spam');
  });

  // ==================== 8. Verify Spam Filtering ====================

  it('should hide spam token from default balance response', async () => {
    // Skip if no tokens available
    if (!tokenAddressForSpamTest) {
      console.log('⏭️ Skipping spam verification - no tokens available');
      return;
    }

    const response = await client.get<{
      data: Array<{ address: string }>;
    }>(tokenBalancesPath);

    expect(response.status).toBe(200);

    // Token should be hidden (not in default response)
    const found = response.data.data.find(
      (t) => t.address.toLowerCase() === tokenAddressForSpamTest.toLowerCase()
    );
    expect(found).toBeUndefined();
  });

  it('should show spam token when explicitly requested', async () => {
    // Skip if no tokens available
    if (!tokenAddressForSpamTest) {
      console.log('⏭️ Skipping spam verification - no tokens available');
      return;
    }

    const response = await client.get<{
      data: Array<{ address: string }>;
    }>(`${tokenBalancesPath}?showHiddenTokens=true`);

    expect(response.status).toBe(200);

    // Token should be visible when showHiddenTokens=true
    const found = response.data.data.find(
      (t) => t.address.toLowerCase() === tokenAddressForSpamTest.toLowerCase()
    );
    expect(found).toBeDefined();
  });
});
```

**Step 2: Commit**

```bash
git add tests/e2e/flows/address-reconciliation.test.ts
git commit -m "feat(e2e): add address reconciliation flow test"
```

---

## Task 8: Create Index Exports (Optional)

**Files:**
- Create: `tests/e2e/utils/index.ts`

**Step 1: Create index file**

Create `tests/e2e/utils/index.ts`:

```typescript
export { e2eConfig, validateConfig } from './config.js';
export { fetchAuthToken } from './auth.js';
export { E2EClient, type ApiResponse, type PollOptions } from './client.js';
```

**Step 2: Commit**

```bash
git add tests/e2e/utils/index.ts
git commit -m "chore(e2e): add utils index exports"
```

---

## Running the Tests

After implementation, run the tests:

```bash
# Set required environment variables
export E2E_CLIENT_ID=your-client-id
export E2E_CLIENT_SECRET=your-client-secret

# Run against local server (must be running on port 3000)
STAGE=local npm run test:e2e

# Or run against a specific environment
E2E_BASE_URL=https://your-api.example.com npm run test:e2e

# With custom address/chain
E2E_ADDRESS=0x123... E2E_CHAIN_ALIAS=ethereum npm run test:e2e
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 0 | Add ID to address response | `src/services/addresses/postgres-formatter.ts` |
| 1 | Create vitest config | `tests/e2e/vitest.config.ts` |
| 2 | Create config module | `tests/e2e/utils/config.ts` |
| 3 | Create auth module | `tests/e2e/utils/auth.ts` |
| 4 | Create HTTP client | `tests/e2e/utils/client.ts` |
| 5 | Create setup file | `tests/e2e/setup.ts` |
| 6 | Add npm script | `package.json` |
| 7 | Create e2e test | `tests/e2e/flows/address-reconciliation.test.ts` |
| 8 | Create index exports | `tests/e2e/utils/index.ts` |
