import { ChainAlias, EcoSystem } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { beforeAll, describe, it } from 'vitest';
import { ChainFeatures } from '@/src/lib/chains.js';
import {
  expectValidApiResponse,
  TEST_ADDRESSES,
} from '@/tests/integration/utils/testFixtures.js';
import { setupTestClients, type DefaultTestClients } from '@/tests/utils/dualModeTestClient.js';
import { getAllEvmsChainsForFeature } from '@/tests/utils/chainsList.js';

/**
 * Note: These tests require registered addresses in the PostgreSQL database.
 * The token balance endpoint queries local database for indexed addresses and their holdings.
 * In local mode without seeded data, these tests will return 404 (Address not found).
 */
describe.skip('Token Balances Integration Tests ', () => {
  let clients: DefaultTestClients;
  const TEST_ADDRESS_EVM = TEST_ADDRESSES.evm.valid;
  const TEST_ADDRESS_SOLANA = TEST_ADDRESSES.solana.valid;
  const TEST_ADDRESS_UTXO = TEST_ADDRESSES.btc.valid;
  const TEST_ADDRESS_MNEE = TEST_ADDRESSES.mnee.valid;
  const TEST_ADDRESS_TRON = TEST_ADDRESSES.tron.valid;

  beforeAll(async () => {
    clients = await setupTestClients();
  });

  describe('EVM Chains', async () => {
    const EVM_CHAINS = await getAllEvmsChainsForFeature([ChainFeatures.TOKEN_BALANCES]);
    it.each(EVM_CHAINS)('should get token balances for $name', async ({ chain }) => {
      const endpoint = `v2/balances/ecosystem/${chain.Config.ecosystem}/chain/${chain.Alias}/address/${TEST_ADDRESS_EVM}/tokens`;

      const response = await clients.CLIENT_1.client.get(endpoint);
      expectValidApiResponse(response, 200);
    });
  });

  describe('SVM Chains', () => {
    it('should get token balances for SOLANA', async () => {
      const endpoint = `v2/balances/ecosystem/${EcoSystem.SVM}/chain/${ChainAlias.SOLANA}/address/${TEST_ADDRESS_SOLANA}/tokens`;
      const response = await clients.CLIENT_1.client.get(endpoint);
      expectValidApiResponse(response, 200);
    });
  });

  describe('UTXO Chains', () => {
    it('should get token balances for Bitcoin', async () => {
      const endpoint = `v2/balances/ecosystem/${EcoSystem.UTXO}/chain/${ChainAlias.BITCOIN}/address/${TEST_ADDRESS_UTXO}/tokens`;

      const response = await clients.CLIENT_1.client.get(endpoint);
      expectValidApiResponse(response, 200);
    });

    it('should get token balances for MNEE', async () => {
      const endpoint = `v2/balances/ecosystem/${EcoSystem.UTXO}/chain/${ChainAlias.MNEE}/address/${TEST_ADDRESS_MNEE}/tokens`;
      const response = await clients.CLIENT_1.client.get(endpoint);
      expectValidApiResponse(response, 200);
    });
  });

  describe('TVM Chains', () => {
    it('should get token balances for Tron', async () => {
      const endpoint = `v2/balances/ecosystem/${EcoSystem.TVM}/chain/${ChainAlias.TRON}/address/${TEST_ADDRESS_TRON}/tokens`;

      const response = await clients.CLIENT_1.client.get(endpoint);
      expectValidApiResponse(response, 200);
    });
  });
});
