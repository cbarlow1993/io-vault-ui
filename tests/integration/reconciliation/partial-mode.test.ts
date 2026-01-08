import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TEST_ADDRESSES } from '@/tests/integration/utils/testFixtures.js';
import {
  closeApp,
  type DefaultTestClients,
  setupTestClients,
} from '@/tests/utils/dualModeTestClient.js';

/**
 * Note: These tests require seeded addresses in the PostgreSQL database.
 * The reconciliation endpoints query local database for indexed addresses and transactions.
 * In local mode without seeded data, these tests will return 404 (Address not found).
 */
describe.skip('Reconciliation Partial Mode Integration', () => {
  let clients: DefaultTestClients;

  beforeAll(async () => {
    clients = await setupTestClients();
  });

  afterAll(async () => {
    await closeApp();
  });

  describe('POST /v2/reconciliation/addresses/:address/chains/:chain/reconcile', () => {
    it('should create reconciliation job with partial mode (default)', async () => {
      const address = TEST_ADDRESSES.evm.valid;
      const chain = 'ethereum';

      const response = await clients.CLIENT_1.client.post(
        `/v2/reconciliation/addresses/${address}/chains/${chain}/reconcile`,
        {}
      );

      // 202 Accepted for job creation
      expect(response.status).toBe(202);
      expect(response.data).toHaveProperty('jobId');
      expect(response.data).toHaveProperty('status');
      expect(response.data).toHaveProperty('mode');
      expect(response.data).toHaveProperty('address');
      expect(response.data).toHaveProperty('chain');
      expect(response.data).toHaveProperty('createdAt');

      // Default mode should be partial, but may auto-upgrade to full if no checkpoint exists
      expect(['partial', 'full']).toContain(response.data.mode);
    });

    it('should create reconciliation job with explicit partial mode', async () => {
      const address = TEST_ADDRESSES.evm.valid;
      const chain = 'ethereum';

      const response = await clients.CLIENT_1.client.post(
        `/v2/reconciliation/addresses/${address}/chains/${chain}/reconcile`,
        { mode: 'partial' }
      );

      expect(response.status).toBe(202);
      expect(response.data).toHaveProperty('jobId');
      expect(response.data).toHaveProperty('mode');
      // Will auto-upgrade to 'full' if no checkpoint exists for this address
      expect(['partial', 'full']).toContain(response.data.mode);
    });

    it('should create reconciliation job with full mode', async () => {
      const address = TEST_ADDRESSES.evm.valid;
      const chain = 'ethereum';

      const response = await clients.CLIENT_1.client.post(
        `/v2/reconciliation/addresses/${address}/chains/${chain}/reconcile`,
        { mode: 'full' }
      );

      expect(response.status).toBe(202);
      expect(response.data).toHaveProperty('jobId');
      expect(response.data.mode).toBe('full');
    });

    it('should accept fromBlock and toBlock parameters', async () => {
      const address = TEST_ADDRESSES.evm.valid;
      const chain = 'ethereum';

      const response = await clients.CLIENT_1.client.post(
        `/v2/reconciliation/addresses/${address}/chains/${chain}/reconcile`,
        {
          mode: 'full',
          fromBlock: 18000000,
          toBlock: 18001000,
        }
      );

      expect(response.status).toBe(202);
      expect(response.data).toHaveProperty('jobId');
      expect(response.data.fromBlock).toBe(18000000);
      expect(response.data.toBlock).toBe(18001000);
    });

    it('should accept fromTimestamp and toTimestamp parameters', async () => {
      const address = TEST_ADDRESSES.evm.valid;
      const chain = 'ethereum';

      const fromTimestamp = 1704067200; // 2024-01-01 00:00:00
      const toTimestamp = 1704153600; // 2024-01-02 00:00:00

      const response = await clients.CLIENT_1.client.post(
        `/v2/reconciliation/addresses/${address}/chains/${chain}/reconcile`,
        {
          mode: 'full',
          fromTimestamp,
          toTimestamp,
        }
      );

      expect(response.status).toBe(202);
      expect(response.data).toHaveProperty('jobId');
    });

    it('should return 400 for invalid mode', async () => {
      const address = TEST_ADDRESSES.evm.valid;
      const chain = 'ethereum';

      const response = await clients.CLIENT_1.client.post(
        `/v2/reconciliation/addresses/${address}/chains/${chain}/reconcile`,
        { mode: 'invalid' }
      );

      expect(response.status).toBe(400);
    });

    it('should return 400 for negative fromBlock', async () => {
      const address = TEST_ADDRESSES.evm.valid;
      const chain = 'ethereum';

      const response = await clients.CLIENT_1.client.post(
        `/v2/reconciliation/addresses/${address}/chains/${chain}/reconcile`,
        {
          mode: 'full',
          fromBlock: -1,
        }
      );

      expect(response.status).toBe(400);
    });
  });

  describe('GET /v2/reconciliation/reconciliation-jobs/:jobId', () => {
    it('should retrieve job details after creation', async () => {
      const address = TEST_ADDRESSES.evm.valid;
      const chain = 'ethereum';

      // First create a job
      const createResponse = await clients.CLIENT_1.client.post(
        `/v2/reconciliation/addresses/${address}/chains/${chain}/reconcile`,
        { mode: 'full' }
      );

      expect(createResponse.status).toBe(202);
      const { jobId } = createResponse.data;

      // Then retrieve it
      const getResponse = await clients.CLIENT_1.client.get(
        `/v2/reconciliation/reconciliation-jobs/${jobId}`
      );

      expect(getResponse.status).toBe(200);
      expect(getResponse.data).toHaveProperty('jobId', jobId);
      expect(getResponse.data).toHaveProperty('status');
      expect(getResponse.data).toHaveProperty('mode');
      expect(getResponse.data).toHaveProperty('summary');
      expect(getResponse.data).toHaveProperty('timing');
      expect(getResponse.data.summary).toHaveProperty('transactionsProcessed');
      expect(getResponse.data.summary).toHaveProperty('transactionsAdded');
      expect(getResponse.data.summary).toHaveProperty('discrepanciesFlagged');
    });

    it('should return 404 for non-existent job', async () => {
      const nonExistentJobId = '00000000-0000-0000-0000-000000000000';

      const response = await clients.CLIENT_1.client.get(
        `/v2/reconciliation/reconciliation-jobs/${nonExistentJobId}`
      );

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid job ID format', async () => {
      const response = await clients.CLIENT_1.client.get(
        `/v2/reconciliation/reconciliation-jobs/invalid-uuid`
      );

      expect(response.status).toBe(400);
    });
  });

  describe('GET /v2/reconciliation/addresses/:address/chains/:chain/reconciliation-jobs', () => {
    it('should list jobs for an address', async () => {
      const address = TEST_ADDRESSES.evm.valid;
      const chain = 'ethereum';

      // Create a job first to ensure there's at least one
      await clients.CLIENT_1.client.post(
        `/v2/reconciliation/addresses/${address}/chains/${chain}/reconcile`,
        { mode: 'partial' }
      );

      // List jobs
      const response = await clients.CLIENT_1.client.get(
        `/v2/reconciliation/addresses/${address}/chains/${chain}/reconciliation-jobs`
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('data');
      expect(response.data).toHaveProperty('pagination');
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.pagination).toHaveProperty('total');
      expect(response.data.pagination).toHaveProperty('limit');
      expect(response.data.pagination).toHaveProperty('offset');
      expect(response.data.pagination).toHaveProperty('hasMore');
    });

    it('should respect pagination parameters', async () => {
      const address = TEST_ADDRESSES.evm.valid;
      const chain = 'ethereum';

      const response = await clients.CLIENT_1.client.get(
        `/v2/reconciliation/addresses/${address}/chains/${chain}/reconciliation-jobs`,
        { limit: 5, offset: 0 }
      );

      expect(response.status).toBe(200);
      expect(response.data.pagination.limit).toBe(5);
      expect(response.data.pagination.offset).toBe(0);
    });

    it('should return 400 for invalid limit', async () => {
      const address = TEST_ADDRESSES.evm.valid;
      const chain = 'ethereum';

      const response = await clients.CLIENT_1.client.get(
        `/v2/reconciliation/addresses/${address}/chains/${chain}/reconciliation-jobs`,
        { limit: 150 }
      );

      // Limit exceeds max of 100
      expect(response.status).toBe(400);
    });
  });
});
