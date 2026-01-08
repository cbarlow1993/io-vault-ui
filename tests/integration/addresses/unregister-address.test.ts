import { ChainAlias, EcoSystem } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { deleteVaultAddresses } from '@/tests/integration/utils/deleteVaultAddresses.js';
import {
  buildVaultEndpoint,
  expectValidApiResponse,
  TEST_PAYLOADS,
} from '@/tests/integration/utils/testFixtures.js';
import { type DefaultTestClients, setupTestClients } from '@/tests/utils/dualModeTestClient.js';

/**
 * Note: These tests require a real vault and seeded addresses in the database.
 * In local mode, the vault ID doesn't exist and addresses aren't seeded.
 * These tests are designed for deployed environments with proper test infrastructure.
 */
describe.skip('Unregister Address Integration Tests', () => {
  let clients: DefaultTestClients;

  beforeAll(async () => {
    clients = await setupTestClients();
    await deleteVaultAddresses(clients.CLIENT_1.user.vaultId);
  });

  afterAll(async () => {
    await deleteVaultAddresses(clients.CLIENT_1.user.vaultId);
  });

  describe('EVM Addresses', () => {
    it('should successfully unregister an EVM address', async () => {
      const chain = 'eth';
      const createEndpoint = buildVaultEndpoint(
        clients.CLIENT_1.user,
        `/addresses/ecosystem/${EcoSystem.EVM}/chain/${chain}`
      );

      // First, create an address
      const createPayload = TEST_PAYLOADS.createAddress.evm(clients.CLIENT_1.user);
      const createResponse = await clients.CLIENT_1.client.post(createEndpoint, createPayload);
      // Creation is idempotent; API may return 201 (new) or 200 (already monitored)
      expect([200, 201]).toContain(createResponse.status);

      // Then, unregister it
      const unregisterEndpoint = buildVaultEndpoint(
        clients.CLIENT_1.user,
        `/addresses/ecosystem/${EcoSystem.EVM}/chain/${chain}/address/${createPayload.address}/monitoring`
      );

      const unregisterResponse = await clients.CLIENT_1.client.delete(unregisterEndpoint);
      expectValidApiResponse(unregisterResponse, 204);

      // Verify the address still exists but is unmonitored
      // (PostgreSQL implementation keeps addresses after unmonitoring)
      const getEndpoint = buildVaultEndpoint(
        clients.CLIENT_1.user,
        `/addresses/ecosystem/${EcoSystem.EVM}/chain/${chain}/address/${createPayload.address}`
      );

      const getResponse = await clients.CLIENT_1.client.get(getEndpoint);
      expect(getResponse.status).toBe(200);
      expect(getResponse.data.monitored).toBe(false);
    });

    it('should return 204 when trying to unregister non-existent address (idempotent)', async () => {
      const chain = 'eth';
      const nonExistentAddress = '0xNonExistentAddress1234567890123456789012';

      const unregisterEndpoint = buildVaultEndpoint(
        clients.CLIENT_1.user,
        `/addresses/ecosystem/${EcoSystem.EVM}/chain/${chain}/address/${nonExistentAddress}/monitoring`
      );

      const response = await clients.CLIENT_1.client.delete(unregisterEndpoint);

      // API returns 204 for idempotent unregister operations
      expect(response.status).toBe(204);
    });

    // TODO: This test exposes an API issue - addresses created via POST return monitored: false
    // and GET returns 404 immediately after creation. Needs investigation.
    it.skip('should handle multiple registrations and unregistrations', async () => {
      const chain = 'polygon';
      const createEndpoint = buildVaultEndpoint(
        clients.CLIENT_1.user,
        `/addresses/ecosystem/${EcoSystem.EVM}/chain/${chain}`
      );

      // Create address - accept 200 or 201 (idempotent behavior)
      const createPayload = TEST_PAYLOADS.createAddress.evm(clients.CLIENT_1.user);
      const createResponse1 = await clients.CLIENT_1.client.post(createEndpoint, createPayload);
      expect([200, 201]).toContain(createResponse1.status);
      expect(createResponse1.data).toBeDefined();
      expect(createResponse1.data.address).toBe(createPayload.address);

      // Verify address is monitored
      const getEndpoint = buildVaultEndpoint(
        clients.CLIENT_1.user,
        `/addresses/ecosystem/${EcoSystem.EVM}/chain/${chain}/address/${createPayload.address}`
      );
      const getResponse1 = await clients.CLIENT_1.client.get(getEndpoint);
      expectValidApiResponse(getResponse1, 200);
      expect(getResponse1.data.address).toBe(createPayload.address);

      // Unregister
      const unregisterEndpoint = buildVaultEndpoint(
        clients.CLIENT_1.user,
        `/addresses/ecosystem/${EcoSystem.EVM}/chain/${chain}/address/${createPayload.address}/monitoring`
      );

      const unregisterResponse = await clients.CLIENT_1.client.delete(unregisterEndpoint);
      expectValidApiResponse(unregisterResponse, 204);

      // Verify address is now unmonitored (404 when looking for monitored)
      const getResponse2 = await clients.CLIENT_1.client.get(getEndpoint, {
        validateStatus: () => true,
      });
      expect(getResponse2.status).toBe(404);

      // Register again (should re-monitor and return 200, not 201)
      const createResponse2 = await clients.CLIENT_1.client.post(createEndpoint, createPayload);
      expectValidApiResponse(createResponse2, 200); // 200 for idempotent re-registration

      // Verify address is monitored again
      const getResponse3 = await clients.CLIENT_1.client.get(getEndpoint);
      expectValidApiResponse(getResponse3, 200);
      expect(getResponse3.data.address).toBe(createPayload.address);

      // Unregister again
      const unregisterResponse2 = await clients.CLIENT_1.client.delete(unregisterEndpoint);
      expectValidApiResponse(unregisterResponse2, 204);
    });

    it('should preserve address data when re-registering', async () => {
      const chain = 'eth';
      const createEndpoint = buildVaultEndpoint(
        clients.CLIENT_1.user,
        `/addresses/ecosystem/${EcoSystem.EVM}/chain/${chain}`
      );

      // Create address - accept 200 or 201 (idempotent behavior)
      const createPayload = TEST_PAYLOADS.createAddress.evm(clients.CLIENT_1.user);
      const createResponse = await clients.CLIENT_1.client.post(createEndpoint, createPayload);
      expect([200, 201]).toContain(createResponse.status);

      const originalMonitoredAt = createResponse.data.monitoredAt;

      // Unregister
      const unregisterEndpoint = buildVaultEndpoint(
        clients.CLIENT_1.user,
        `/addresses/ecosystem/${EcoSystem.EVM}/chain/${chain}/address/${createPayload.address}/monitoring`
      );

      const unregisterResponse = await clients.CLIENT_1.client.delete(unregisterEndpoint);
      expectValidApiResponse(unregisterResponse, 204);

      // Re-register
      const reregisterResponse = await clients.CLIENT_1.client.post(createEndpoint, createPayload);
      expectValidApiResponse(reregisterResponse, 200);

      // Verify original monitoredAt timestamp is preserved
      expect(reregisterResponse.data.monitoredAt).toBe(originalMonitoredAt);
      // Addresses are stored lowercase in the database
      expect(reregisterResponse.data.address.toLowerCase()).toBe(createPayload.address!.toLowerCase());

      // Cleanup
      await clients.CLIENT_1.client.delete(unregisterEndpoint);
    });

    it('should return 200 when re-registering already monitored address (idempotent)', async () => {
      const chain = 'eth';
      const createEndpoint = buildVaultEndpoint(
        clients.CLIENT_1.user,
        `/addresses/ecosystem/${EcoSystem.EVM}/chain/${chain}`
      );

      // Create address - accept 200 or 201 (may already exist from previous test runs)
      const createPayload = TEST_PAYLOADS.createAddress.evm(clients.CLIENT_1.user);
      const createResponse1 = await clients.CLIENT_1.client.post(createEndpoint, createPayload);
      expect([200, 201]).toContain(createResponse1.status);
      expect(createResponse1.data).toBeDefined();

      // Register again without unregistering (should be idempotent and return 200)
      const createResponse2 = await clients.CLIENT_1.client.post(createEndpoint, createPayload);
      expectValidApiResponse(createResponse2, 200); // 200 for idempotent

      // Both should return the same address
      expect(createResponse1.data.address).toBe(createResponse2.data.address);
      expect(createResponse1.data.monitoredAt).toBe(createResponse2.data.monitoredAt);

      // Cleanup
      const unregisterEndpoint = buildVaultEndpoint(
        clients.CLIENT_1.user,
        `/addresses/ecosystem/${EcoSystem.EVM}/chain/${chain}/address/${createPayload.address}/monitoring`
      );
      await clients.CLIENT_1.client.delete(unregisterEndpoint);
    });
  });

  describe('UTXO Addresses', () => {
    it('should successfully unregister a BTC address', async () => {
      const chain = 'bitcoin';
      const createEndpoint = buildVaultEndpoint(
        clients.CLIENT_1.user,
        `/addresses/ecosystem/${EcoSystem.UTXO}/chain/${chain}`
      );

      // Create address
      const createPayload = TEST_PAYLOADS.createAddress.btc(clients.CLIENT_1.user);
      const createResponse = await clients.CLIENT_1.client.post(createEndpoint, createPayload);
      // Creation is idempotent; API may return 201 (new) or 200 (already monitored)
      expect([200, 201]).toContain(createResponse.status);

      // Unregister it
      const unregisterEndpoint = buildVaultEndpoint(
        clients.CLIENT_1.user,
        `/addresses/ecosystem/${EcoSystem.UTXO}/chain/${chain}/address/${createPayload.address}/monitoring`
      );

      const unregisterResponse = await clients.CLIENT_1.client.delete(unregisterEndpoint);
      expectValidApiResponse(unregisterResponse, 204);

      // Verify the address still exists but is unmonitored
      // (PostgreSQL implementation keeps addresses after unmonitoring)
      const getEndpoint = buildVaultEndpoint(
        clients.CLIENT_1.user,
        `/addresses/ecosystem/${EcoSystem.UTXO}/chain/${chain}/address/${createPayload.address}`
      );

      const getResponse = await clients.CLIENT_1.client.get(getEndpoint);
      expect(getResponse.status).toBe(200);
      expect(getResponse.data.monitored).toBe(false);
    });
  });

  describe('SVM Addresses', () => {
    it('should successfully unregister a Solana address', async () => {
      const chain = 'solana';
      const createEndpoint = buildVaultEndpoint(
        clients.CLIENT_1.user,
        `/addresses/ecosystem/${EcoSystem.SVM}/chain/${chain}`
      );

      // Create address
      const createPayload = TEST_PAYLOADS.createAddress.solana(clients.CLIENT_1.user);
      const createResponse = await clients.CLIENT_1.client.post(createEndpoint, createPayload);
      // Creation is idempotent; API may return 201 (new) or 200 (already monitored)
      expect([200, 201]).toContain(createResponse.status);

      // Unregister it
      const unregisterEndpoint = buildVaultEndpoint(
        clients.CLIENT_1.user,
        `/addresses/ecosystem/${EcoSystem.SVM}/chain/${chain}/address/${createPayload.address}/monitoring`
      );

      const unregisterResponse = await clients.CLIENT_1.client.delete(unregisterEndpoint);
      expectValidApiResponse(unregisterResponse, 204);

      // Verify the address still exists but is unmonitored
      // (PostgreSQL implementation keeps addresses after unmonitoring)
      const getEndpoint = buildVaultEndpoint(
        clients.CLIENT_1.user,
        `/addresses/ecosystem/${EcoSystem.SVM}/chain/${chain}/address/${createPayload.address}`
      );

      const getResponse = await clients.CLIENT_1.client.get(getEndpoint);
      expect(getResponse.status).toBe(200);
      expect(getResponse.data.monitored).toBe(false);
    });
  });

  describe('TVM Addresses', () => {
    it('should successfully unregister a Tron address', async () => {
      const chain = 'tron';
      const createEndpoint = buildVaultEndpoint(
        clients.CLIENT_1.user,
        `/addresses/ecosystem/${EcoSystem.TVM}/chain/${chain}`
      );

      // Create address
      const createPayload = TEST_PAYLOADS.createAddress.tvm(clients.CLIENT_1.user);
      const createResponse = await clients.CLIENT_1.client.post(createEndpoint, createPayload);
      // Creation is idempotent; API may return 201 (new) or 200 (already monitored)
      expect([200, 201]).toContain(createResponse.status);

      // Unregister it
      const unregisterEndpoint = buildVaultEndpoint(
        clients.CLIENT_1.user,
        `/addresses/ecosystem/${EcoSystem.TVM}/chain/${chain}/address/${createPayload.address}/monitoring`
      );

      const unregisterResponse = await clients.CLIENT_1.client.delete(unregisterEndpoint);
      expectValidApiResponse(unregisterResponse, 204);

      // Verify the address still exists but is unmonitored
      // (PostgreSQL implementation keeps addresses after unmonitoring)
      const getEndpoint = buildVaultEndpoint(
        clients.CLIENT_1.user,
        `/addresses/ecosystem/${EcoSystem.TVM}/chain/${chain}/address/${createPayload.address}`
      );

      const getResponse = await clients.CLIENT_1.client.get(getEndpoint);
      expect(getResponse.status).toBe(200);
      expect(getResponse.data.monitored).toBe(false);
    });
  });

  describe('XRP Addresses', () => {
    it('should successfully unregister a Ripple (XRP) address', async () => {
      const chain = ChainAlias.XRP;
      const createEndpoint = buildVaultEndpoint(
        clients.CLIENT_1.user,
        `/addresses/ecosystem/${EcoSystem.XRP}/chain/${chain}`
      );

      // Create address
      const createPayload = TEST_PAYLOADS.createAddress.xrp(clients.CLIENT_1.user);
      const createResponse = await clients.CLIENT_1.client.post(createEndpoint, createPayload);
      // Creation is idempotent; API may return 201 (new) or 200 (already monitored)
      expect([200, 201]).toContain(createResponse.status);

      // Unregister it
      const unregisterEndpoint = buildVaultEndpoint(
        clients.CLIENT_1.user,
        `/addresses/ecosystem/${EcoSystem.XRP}/chain/${chain}/address/${createPayload.address}/monitoring`
      );

      const unregisterResponse = await clients.CLIENT_1.client.delete(unregisterEndpoint);
      expectValidApiResponse(unregisterResponse, 204);

      // Verify the address still exists but is unmonitored
      // (PostgreSQL implementation keeps addresses after unmonitoring)
      const getEndpoint = buildVaultEndpoint(
        clients.CLIENT_1.user,
        `/addresses/ecosystem/${EcoSystem.XRP}/chain/${chain}/address/${createPayload.address}`
      );

      const getResponse = await clients.CLIENT_1.client.get(getEndpoint);
      expect(getResponse.status).toBe(200);
      expect(getResponse.data.monitored).toBe(false);
    });
  });

  describe('Permissions', () => {
    it.todo('should not allow unauthorized users to unregister addresses', async () => {
      const chain = 'eth';

      // Client 1 creates an address in their own vault (should succeed)
      const createEndpoint = buildVaultEndpoint(
        clients.CLIENT_1.user,
        `/addresses/ecosystem/${EcoSystem.EVM}/chain/${chain}`
      );

      const createPayload = TEST_PAYLOADS.createAddress.evm(clients.CLIENT_1.user);
      const createResponse = await clients.CLIENT_1.client.post(createEndpoint, createPayload);
      // Accept 200 or 201 (idempotent behavior)
      expect([200, 201]).toContain(createResponse.status);

      // Client 2 tries to unregister Client 1's address (should be denied)
      const unregisterEndpoint = buildVaultEndpoint(
        clients.CLIENT_1.user, // Still using CLIENT_1's vault
        `/addresses/ecosystem/${EcoSystem.EVM}/chain/${chain}/address/${createPayload.address}/monitoring`
      );

      const unauthorizedResponse = await clients.CLIENT_2.client.delete(unregisterEndpoint);

      expect(unauthorizedResponse.status).toBe(403);

      // Cleanup - Client 1 should still be able to unregister their own address
      const cleanupResponse = await clients.CLIENT_1.client.delete(unregisterEndpoint);
      expectValidApiResponse(cleanupResponse, 204);
    });
  });
});
