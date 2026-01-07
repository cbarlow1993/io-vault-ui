import { ChainAlias, EcoSystem } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { beforeAll, describe, it } from 'vitest';
import { ChainFeatures } from '@/src/lib/chains/index.js';
import {
  expectValidApiResponse,
  TEST_ADDRESSES,
} from '@/tests/integration/utils/testFixtures.js';
import type { DefaultAuthenticatedClients } from '@/tests/models.js';
import { setupTestUsers } from '@/tests/utils/testApiClient.js';
import { getAllEvmsChainsForFeature } from '@/tests/utils/chainsList.js';

describe('Token Balances Integration Tests ', () => {
  let clients: DefaultAuthenticatedClients;
  const TEST_ADDRESS_EVM = TEST_ADDRESSES.evm.valid;
  const TEST_ADDRESS_SOLANA = TEST_ADDRESSES.solana.valid;
  const TEST_ADDRESS_UTXO = TEST_ADDRESSES.btc.valid;
  const TEST_ADDRESS_MNEE = TEST_ADDRESSES.mnee.valid;
  const TEST_ADDRESS_TRON = TEST_ADDRESSES.tron.valid;

  beforeAll(async () => {
    clients = await setupTestUsers();
  });

  describe('EVM Chains', async () => {
    const EVM_CHAINS = await getAllEvmsChainsForFeature([ChainFeatures.TOKEN_BALANCES]);
    it.each(EVM_CHAINS)('should get token balances for $name', async ({ chain }) => {
      const endpoint = `v1/balances/ecosystem/${chain.Config.ecosystem}/chain/${chain.Alias}/address/${TEST_ADDRESS_EVM}/tokens?excludeSpam=true`;

      const response = await clients.CLIENT_1.client.get(endpoint);
      expectValidApiResponse(response, 200);
    });
  });

  describe('SVM Chains', () => {
    it('should get token balances for SOLANA', async () => {
      const endpoint = `v1/balances/ecosystem/${EcoSystem.SVM}/chain/${ChainAlias.SOLANA}/address/${TEST_ADDRESS_SOLANA}/tokens?excludeSpam=true`;
      const response = await clients.CLIENT_1.client.get(endpoint);
      expectValidApiResponse(response, 200);
    });
  });

  describe('UTXO Chains', () => {
    it('should get token balances for Bitcoin', async () => {
      const endpoint = `v1/balances/ecosystem/${EcoSystem.UTXO}/chain/${ChainAlias.BITCOIN}/address/${TEST_ADDRESS_UTXO}/tokens?excludeSpam=true`;

      const response = await clients.CLIENT_1.client.get(endpoint);
      expectValidApiResponse(response, 200);
    });

    it('should get token balances for MNEE', async () => {
      const endpoint = `v1/balances/ecosystem/${EcoSystem.UTXO}/chain/${ChainAlias.MNEE}/address/${TEST_ADDRESS_MNEE}/tokens?excludeSpam=true`;
      const response = await clients.CLIENT_1.client.get(endpoint);
      expectValidApiResponse(response, 200);
    });
  });

  describe('TVM Chains', () => {
    it('should get token balances for Tron', async () => {
      const endpoint = `v1/balances/ecosystem/${EcoSystem.TVM}/chain/${ChainAlias.TRON}/address/${TEST_ADDRESS_TRON}/tokens?excludeSpam=true`;

      const response = await clients.CLIENT_1.client.get(endpoint);
      expectValidApiResponse(response, 200);
    });
  });
});
