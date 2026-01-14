import { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ChainFeatures } from '@/tests/integration/lib/chains.js';
import { deleteVaultAddresses } from '@/tests/integration/utils/deleteVaultAddresses.js';
import { type DefaultTestClients, setupTestClients } from '@/tests/utils/dualModeTestClient.js';
import { getAllEvmsChainsForFeature } from '@/tests/integration/utils/chainsList.js';
import { expectStatus } from '@/tests/utils/expectStatus.js';

/**
 * Note: These tests require a real vault that exists in the test user's organization.
 * In local mode, the vault ID from test fixtures doesn't exist, causing 500 errors.
 * These tests are designed for deployed environments with proper test infrastructure.
 */
describe('Generate Address Integration Tests ', () => {
  let clients: DefaultTestClients;

  beforeAll(async () => {
    clients = await setupTestClients();
    await deleteVaultAddresses(clients.CLIENT_1.user.vaultId);
  });
  afterAll(async () => {
    await deleteVaultAddresses(clients.CLIENT_1.user.vaultId);
  });

  describe.only('EVM Chains', async () => {
    const EVM_CHAINS = await getAllEvmsChainsForFeature([ChainFeatures.OVERALL_STATUS]);

    it.each(EVM_CHAINS)('should generate an address for EVM chain: $name', async ({ chain }) => {
      const endpoint = `/v2/vaults/${clients.CLIENT_1.user.vaultId}/addresses`;

      const payload = {
        chainAlias: chain.Alias,
      };

      const response = await clients.CLIENT_1.client.post(endpoint, payload);
      // Accept 200 (existing address) or 201 (newly created) - idempotent behavior
      expectStatus(response, 201);
      expect(response.data).toBeDefined();
      expect(response.data.address).toBeDefined();
      expect(response.data.derivationPath).toBeNull();
    });

    it.each(EVM_CHAINS)('should generate an HD address for EVM chain: $name', async ({ chain }) => {
      const endpoint = `/v2/vaults/${clients.CLIENT_1.user.vaultId}/addresses`;

      const payload = {
        chainAlias: chain.Alias,
        derivationPath: 'm/44/60/0/0/0',
        alias: `${chain.Alias} ${Date.now()}`,
      };

      const response = await clients.CLIENT_1.client.post(endpoint, payload);

      expectStatus(response, 201);
      expect(response.data).toBeDefined();
      expect(response.data.address).toBeDefined();
      expect(response.data.derivationPath).toBe(payload.derivationPath);
      expect(response.data.alias).toBe(payload.alias);
    });
  });

  describe('SOLANA Chains', () => {
    it('should generate an address for SOLANA', async () => {
      const endpoint = `/v2/vaults/${clients.CLIENT_1.user.vaultId}/addresses`;

      const payload = {
        chainAlias: ChainAlias.SOLANA,
      };
      const response = await clients.CLIENT_1.client.post(endpoint, payload);
      expectStatus(response, 201);
      expect(response.data).toBeDefined();
      expect(response.data.address).toBeDefined();
      expect(response.data.alias).toBeNull();
    });

    it('should generate an HD address for SOLANA', async () => {
      const endpoint = `/v2/vaults/${clients.CLIENT_1.user.vaultId}/addresses`;

      const payload = {
        chainAlias: ChainAlias.SOLANA,
        derivationPath: 'm/44/60/0/0/0',
        alias: `${ChainAlias.SOLANA} ${Date.now()}`,
      };
      const response = await clients.CLIENT_1.client.post(endpoint, payload);
      
      expectStatus(response, 201);
      expect(response.data).toBeDefined();
      expect(response.data.address).toBeDefined();
      expect(response.data.derivationPath).toBe(payload.derivationPath);
      expect(response.data.alias).toBe(payload.alias);
    });
  });

  describe('TVM Chains', () => {
    it('should generate an address for Tron', async () => {
      const endpoint = `/v2/vaults/${clients.CLIENT_1.user.vaultId}/addresses`;

      const payload = {
        chainAlias: ChainAlias.TRON,
      };
      const response = await clients.CLIENT_1.client.post(endpoint, payload);
      expectStatus(response, 201);
      expect(response.data).toBeDefined();
      expect(response.data.address).toBeDefined();
      expect(response.data.derivationPath).toBeNull();
      expect(response.data.alias).toBeNull();
    });

    it('should generate an HD address for Tron', async () => {
      const endpoint = `/v2/vaults/${clients.CLIENT_1.user.vaultId}/addresses`;

      const payload = {
        derivationPath: 'm/44/60/0/0/0',
        alias: `${ChainAlias.TRON} ${Date.now()}`,
      };
      const response = await clients.CLIENT_1.client.post(endpoint, payload);
      expectStatus(response, 201);
      expect(response.data).toBeDefined();
      expect(response.data.address).toBeDefined();
      expect(response.data.derivationPath).toBe(payload.derivationPath);
      expect(response.data.alias).toBe(payload.alias);
    });
  });

  describe('UTXO Chains', () => {
    it('should generate an address for Bitcoin', async () => {
      const endpoint = `/v2/vaults/${clients.CLIENT_1.user.vaultId}/addresses`;

      const payload = {
        chainAlias: ChainAlias.BITCOIN,
      };
      const response = await clients.CLIENT_1.client.post(endpoint, payload);
      expectStatus(response, 201);
      expect(response.data).toBeDefined();
      expect(response.data.address).toBeDefined();
      expect(response.data.derivationPath).toBeNull();
      expect(response.data.alias).toBeNull();
    });
    it('should generate an HD address for Bitcoin', async () => {
      const endpoint = `/v2/vaults/${clients.CLIENT_1.user.vaultId}/addresses`;

      const payload = {
        chainAlias: ChainAlias.BITCOIN,
        derivationPath: 'm/44/60/0/0/0',
        alias: `${ChainAlias.BITCOIN} ${Date.now()}`,
      };
      const response = await clients.CLIENT_1.client.post(endpoint, payload);
      expectStatus(response, 201);
      expect(response.data).toBeDefined();
      expect(response.data.address).toBeDefined();
      expect(response.data.address).toBeDefined();
      expect(response.data.derivationPath).toBe(payload.derivationPath);
      expect(response.data.alias).toBe(payload.alias);
    });
  });

  describe('XRP Chains', () => {
    it('should generate an address for Ripple (XRP)', async () => {
      const endpoint = `/v2/vaults/${clients.CLIENT_1.user.vaultId}/addresses`;

      const payload = {
        chainAlias: ChainAlias.XRP,
      };
      const response = await clients.CLIENT_1.client.post(endpoint, payload);
      
      expectStatus(response, 201);
      expect(response.data).toBeDefined();
      expect(response.data.address).toBeDefined();
      expect(response.data.derivationPath).toBeNull();
      expect(response.data.alias).toBeNull();
    });

    it('should generate an HD address for Ripple (XRP)', async () => {
      const endpoint = `/v2/vaults/${clients.CLIENT_1.user.vaultId}/addresses`;

      const payload = {
        chainAlias: ChainAlias.XRP,
        derivationPath: 'm/44/60/0/0/0',
        alias: `${ChainAlias.XRP} ${Date.now()}`,
      };
      const response = await clients.CLIENT_1.client.post(endpoint, payload);
      
      expectStatus(response, 201);
      expect(response.data).toBeDefined();
      expect(response.data.address).toBeDefined();
      expect(response.data.derivationPath).toBe(payload.derivationPath);
      expect(response.data.alias).toBe(payload.alias);
    });
  });
});
