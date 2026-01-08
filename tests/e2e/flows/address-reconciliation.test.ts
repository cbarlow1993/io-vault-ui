import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { e2eConfig } from '../utils/config';
import { E2EClient, type ClientResponse } from '../utils/client';

/**
 * Address Reconciliation E2E Test
 *
 * Tests the complete address lifecycle:
 * 1. Register address
 * 2. Verify address in list endpoints
 * 3. Start reconciliation job
 * 4. Poll for job completion
 * 5. Verify token balances
 * 6. Mark token as spam
 * 7. Verify spam filtering
 */
describe.sequential('Address Reconciliation Flow', () => {
  let client: E2EClient;

  // Shared state across tests
  let addressId: string | null = null;
  let jobId: string | null = null;
  let tokenContractAddress: string | null = null;
  let originalSpamOverride: string | null = null;

  beforeAll(() => {
    client = new E2EClient(e2eConfig.baseUrl, e2eConfig.authToken);
  });

  afterAll(async () => {
    // Cleanup: restore original spam state if it was changed
    if (addressId && tokenContractAddress && originalSpamOverride !== null) {
      try {
        // Delete the spam override to restore original state
        await client.delete(
          `/v2/spam/addresses/${addressId}/tokens/${tokenContractAddress}/spam-override`
        );
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  // ==================== 1. Register Address ====================
  it('should register address or confirm it exists', async () => {
    const { vaultId, address, chainAlias, ecosystem } = e2eConfig;

    const response = await client.post<{ id?: string; message?: string }>(
      `/v2/vaults/${vaultId}/addresses/ecosystem/${ecosystem}/chain/${chainAlias}`,
      { address, monitor: true }
    );

    // Accept 201 (created) or 409 (already exists) as success
    expect([201, 409]).toContain(response.status);

    if (response.status === 201 && response.data.id) {
      addressId = response.data.id;
    }
  });

  // ==================== 2. Verify Address in List Endpoints ====================
  it('should find address in vault addresses list', async () => {
    const { vaultId, address } = e2eConfig;

    const response = await client.get<{
      data: Array<{ id: string; address: string; chainAlias: string }>;
    }>(`/v2/vaults/${vaultId}/addresses`);

    expect(response.status).toBe(200);
    expect(response.data.data).toBeDefined();
    expect(Array.isArray(response.data.data)).toBe(true);

    // Find the registered address (case-insensitive)
    const found = response.data.data.find(
      (a) => a.address.toLowerCase() === address.toLowerCase()
    );

    expect(found).toBeDefined();

    // Store addressId if not already set
    if (found && !addressId) {
      addressId = found.id;
    }
  });

  it('should find address in chain-filtered addresses list', async () => {
    const { vaultId, address, chainAlias, ecosystem } = e2eConfig;

    const response = await client.get<{
      data: Array<{ id: string; address: string; chainAlias: string }>;
    }>(`/v2/vaults/${vaultId}/addresses/ecosystem/${ecosystem}/chain/${chainAlias}`);

    expect(response.status).toBe(200);
    expect(response.data.data).toBeDefined();
    expect(Array.isArray(response.data.data)).toBe(true);

    // Find the registered address (case-insensitive)
    const found = response.data.data.find(
      (a) => a.address.toLowerCase() === address.toLowerCase()
    );

    expect(found).toBeDefined();

    // Store addressId if not already set
    if (found && !addressId) {
      addressId = found.id;
    }
  });

  // ==================== 3. Start Reconciliation Job ====================
  it('should start reconciliation job', async () => {
    const { address, chainAlias } = e2eConfig;

    const response = await client.post<{ jobId: string; status: string }>(
      `/v2/reconciliation/addresses/${address}/chain/${chainAlias}/reconcile`
    );

    // Accept 200 (existing job) or 201 (new job)
    expect([200, 201]).toContain(response.status);
    expect(response.data.jobId).toBeDefined();

    jobId = response.data.jobId;
  });

  // ==================== 4. Poll for Reconciliation Completion ====================
  it('should complete reconciliation job', async () => {
    expect(jobId).not.toBeNull();

    // Poll until job completes
    const result = await client.poll<ClientResponse<{ status: string }>>(
      () => client.get(`/v2/reconciliation/reconciliation-jobs/${jobId}`),
      (response) => response.data.status === 'completed' || response.data.status === 'failed',
      { interval: 3000, timeout: 180000 } // 3s interval, 3min timeout
    );

    expect(result.status).toBe(200);
    expect(result.data.status).toBe('completed');
  });

  it('should have transactions after reconciliation', async () => {
    const { address, chainAlias, ecosystem } = e2eConfig;

    const response = await client.get<{
      data: Array<{ txHash: string }>;
    }>(`/v2/transactions/ecosystem/${ecosystem}/chain/${chainAlias}/address/${address}`);

    expect(response.status).toBe(200);
    expect(response.data.data).toBeDefined();
    expect(Array.isArray(response.data.data)).toBe(true);
    // Note: We don't require transactions to exist, just that the endpoint returns properly
  });

  // ==================== 5. Verify Token Balances ====================
  it('should return token balances', async () => {
    const { address, chainAlias, ecosystem } = e2eConfig;

    const response = await client.get<{
      data: Array<{ address: string; symbol: string; balance: string }>;
    }>(`/v2/balances/ecosystem/${ecosystem}/chain/${chainAlias}/address/${address}/tokens`);

    expect(response.status).toBe(200);
    expect(response.data.data).toBeDefined();
    expect(Array.isArray(response.data.data)).toBe(true);

    // Store first non-native token contract address for spam test
    const tokens = response.data.data.filter((t) => t.address !== 'native');
    if (tokens.length > 0 && tokens[0]) {
      tokenContractAddress = tokens[0].address;
    }
  });

  // ==================== 6. Mark Token as Spam ====================
  it('should mark token as spam', async function () {
    if (!addressId || !tokenContractAddress) {
      console.log('Skipping spam test: no addressId or no tokens available');
      return;
    }

    // First, get the current state to store for cleanup
    // The DELETE endpoint returns the current state

    // Set spam override
    const response = await client.patch<{
      tokenAddress: string;
      userOverride: string | null;
      updatedAt: string;
    }>(
      `/v2/spam/addresses/${addressId}/tokens/${tokenContractAddress}/spam-override`,
      { override: 'spam' }
    );

    expect(response.status).toBe(200);
    expect(response.data.tokenAddress).toBeDefined();
    expect(response.data.userOverride).toBe('spam');

    // Mark that we changed the spam state (for cleanup)
    originalSpamOverride = 'changed';
  });

  // ==================== 7. Verify Spam Filtering ====================
  it('should filter spam token by default', async function () {
    if (!tokenContractAddress || !originalSpamOverride) {
      console.log('Skipping spam filtering test: no token was marked as spam');
      return;
    }

    const { address, chainAlias, ecosystem } = e2eConfig;

    // Without showHiddenTokens flag - spam token should NOT appear
    const response = await client.get<{
      data: Array<{ address: string }>;
    }>(`/v2/balances/ecosystem/${ecosystem}/chain/${chainAlias}/address/${address}/tokens`);

    expect(response.status).toBe(200);

    const spamToken = response.data.data.find(
      (t) => t.address.toLowerCase() === tokenContractAddress!.toLowerCase()
    );

    // Token should be filtered out
    expect(spamToken).toBeUndefined();
  });

  it('should show spam token with showHiddenTokens flag', async function () {
    if (!tokenContractAddress || !originalSpamOverride) {
      console.log('Skipping spam visibility test: no token was marked as spam');
      return;
    }

    const { address, chainAlias, ecosystem } = e2eConfig;

    // With showHiddenTokens=true flag - spam token SHOULD appear
    const response = await client.get<{
      data: Array<{ address: string; userSpamOverride?: boolean }>;
    }>(
      `/v2/balances/ecosystem/${ecosystem}/chain/${chainAlias}/address/${address}/tokens`,
      { showHiddenTokens: 'true' }
    );

    expect(response.status).toBe(200);

    const spamToken = response.data.data.find(
      (t) => t.address.toLowerCase() === tokenContractAddress!.toLowerCase()
    );

    // Token should be visible when showHiddenTokens is true
    expect(spamToken).toBeDefined();
  });
});
