import { ChainAlias, EcoSystem } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ChainFeatures } from '@/tests/integration/lib/chains.js';
import { deleteVaultAddresses } from '@/tests/integration/utils/deleteVaultAddresses.js';
import {
  buildVaultEndpoint,
  TEST_PAYLOADS,
} from '@/tests/integration/utils/testFixtures.js';
import { type DefaultTestClients, setupTestClients } from '@/tests/utils/dualModeTestClient.js';
import { getAllEvmsChainsForFeature } from '@/tests/integration/utils/chainsList.js';

describe('Create Address Integration Tests ', () => {
  let clients: DefaultTestClients;

  beforeAll(async () => {
    clients = await setupTestClients();
    await deleteVaultAddresses(clients.CLIENT_1.user.vaultId);
  });
  afterAll(async () => {
    await deleteVaultAddresses(clients.CLIENT_1.user.vaultId);
  });

  describe('EVM Chains', async () => {
    const EVM_CHAINS = await getAllEvmsChainsForFeature([ChainFeatures.OVERALL_STATUS]);

    it.each(EVM_CHAINS)('should create an address for chain: $name', async ({ chain }) => {
      const endpoint = buildVaultEndpoint(
        clients.CLIENT_1.user,
        `/addresses/ecosystem/${EcoSystem.EVM}/chain/${chain.Alias}`
      );

      const payload = TEST_PAYLOADS.createAddress.evm(clients.CLIENT_1.user);

      const response = await clients.CLIENT_1.client.post(endpoint, payload);
      // Accept 200 (existing address) or 201 (newly created) - idempotent behavior
      expect([200, 201]).toContain(response.status);
      expect(response.data).toBeDefined();
      // Addresses are stored lowercase in the database
      expect(response.data.address.toLowerCase()).toBe(payload.address!.toLowerCase());
    });
  });

  describe('SOLANA Chains', () => {
    it('should create an address for SOLANA', async () => {
      const endpoint = buildVaultEndpoint(
        clients.CLIENT_1.user,
        `/addresses/ecosystem/${EcoSystem.SVM}/chain/${ChainAlias.SOLANA}`
      );

      const payload = TEST_PAYLOADS.createAddress.solana(clients.CLIENT_1.user);
      const response = await clients.CLIENT_1.client.post(endpoint, payload);
      // Accept 200 (existing address) or 201 (newly created) - idempotent behavior
      expect([200, 201]).toContain(response.status);
      expect(response.data).toBeDefined();
      expect(response.data.address).toBe(payload.address);
    });
  });

  describe('TVM Chains', () => {
    it('should create an address for Tron', async () => {
      const endpoint = buildVaultEndpoint(
        clients.CLIENT_1.user,
        `/addresses/ecosystem/${EcoSystem.TVM}/chain/${ChainAlias.TRON}`
      );

      const payload = TEST_PAYLOADS.createAddress.tvm(clients.CLIENT_1.user);
      const response = await clients.CLIENT_1.client.post(endpoint, payload);
      // Accept 200 (existing address) or 201 (newly created) - idempotent behavior
      expect([200, 201]).toContain(response.status);
      expect(response.data).toBeDefined();
      expect(response.data.address).toBe(payload.address);
    });
  });

  describe('UTXO Chains', () => {
    it('should create an address for Bitcoin', async () => {
      const endpoint = buildVaultEndpoint(
        clients.CLIENT_1.user,
        `/addresses/ecosystem/${EcoSystem.UTXO}/chain/${ChainAlias.BITCOIN}`
      );

      const payload = TEST_PAYLOADS.createAddress.btc(clients.CLIENT_1.user);
      const response = await clients.CLIENT_1.client.post(endpoint, payload);
      // Accept 200 (existing address) or 201 (newly created) - idempotent behavior
      expect([200, 201]).toContain(response.status);
      expect(response.data).toBeDefined();
    });
  });

  describe('XRP Chains', () => {
    it('should create an address for Ripple (XRP)', async () => {
      const endpoint = buildVaultEndpoint(
        clients.CLIENT_1.user,
        `/addresses/ecosystem/${EcoSystem.XRP}/chain/${ChainAlias.XRP}`
      );

      const payload = TEST_PAYLOADS.createAddress.xrp(clients.CLIENT_1.user);
      const response = await clients.CLIENT_1.client.post(endpoint, payload);
      // Accept 200 (existing address) or 201 (newly created) - idempotent behavior
      expect([200, 201]).toContain(response.status);
      expect(response.data).toBeDefined();
      expect(response.data.address).toBe(payload.address);
    });
  });
});
