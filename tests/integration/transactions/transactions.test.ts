import { ChainAlias, EcoSystem } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { beforeAll, describe, it } from 'vitest';
import { ALL_CHAINS, ChainFeatures, FeatureStatus } from '@/src/lib/chains/index.js';
import { getChainsForEcosystem } from '@/tests/integration/utils/getChainsForEcosystem.js';
import {
  expectValidApiResponse,
  TEST_ADDRESSES,
} from '@/tests/integration/utils/testFixtures.js';
import type { DefaultAuthenticatedClients } from '@/tests/models.js';
import { setupTestUsers } from '@/tests/utils/testApiClient.js';

const isTransactionHistorySupported = (chain: { features: Record<ChainFeatures, FeatureStatus> }) =>
  chain.features[ChainFeatures.TRANSACTION_HISTORY] !== FeatureStatus.NOT_SUPPORTED &&
  chain.features[ChainFeatures.TRANSACTION_HISTORY] !== FeatureStatus.COMING_SOON;

const getSupportedChainsForEcosystem = async (ecosystem: EcoSystem) => {
  const chains = await getChainsForEcosystem(ecosystem);
  return chains
    .filter((chain) =>
      isTransactionHistorySupported(ALL_CHAINS[chain.Alias as keyof typeof ALL_CHAINS])
    )
    .map((chain) => ({ name: chain.Config.name, chain }));
};

describe('Transactions Integration Tests ', () => {
  let clients: DefaultAuthenticatedClients;
  const MAX_PAGE_SIZE = 1; // LEAVE THIS AT 1 ELSE WASTE OF CREDITS

  beforeAll(async () => {
    clients = await setupTestUsers();
  });

  describe('EVM Chains', async () => {
    const TEST_ADDRESS = TEST_ADDRESSES.evm.transactions;
    const EVM_CHAINS = await getSupportedChainsForEcosystem(EcoSystem.EVM);

    it.each(EVM_CHAINS)('should get address transactions for $name', async ({ chain }) => {
      const endpoint = `v1/transactions/ecosystem/${chain.Config.ecosystem}/chain/${chain.Alias}/address/${TEST_ADDRESS}?first=${MAX_PAGE_SIZE}`;

      const response = await clients.CLIENT_1.client.get(endpoint);
      expectValidApiResponse(response, 200);
    });
  });

  // SVM chains may return 503 when Solana RPC is unavailable
  describe('SVM Chains', async () => {
    // const TEST_ADDRESS = TEST_ADDRESSES.solana.transactions;

    const TEST_ADDRESS = '9qjhdEb4dnF89umg3iBkasdTwTmgBYACuGrsUCfb79Td';

    it('should get address transactions for SOLANA', async () => {
      const endpoint = `v1/transactions/ecosystem/${EcoSystem.SVM}/chain/${ChainAlias.SOLANA}/address/${TEST_ADDRESS}?first=${MAX_PAGE_SIZE}`;

      const response = await clients.CLIENT_1.client.get(endpoint);
      // Accept 200 (success)
      expectValidApiResponse(response, 200);
    });
  });

  describe('TVM Chains', () => {
    const TEST_ADDRESS = TEST_ADDRESSES.tron.valid;

    it('should get address transactions for TRON', async () => {
      const endpoint = `v1/transactions/ecosystem/${EcoSystem.TVM}/chain/${ChainAlias.TRON}/address/${TEST_ADDRESS}?first=${MAX_PAGE_SIZE}`;

      const response = await clients.CLIENT_1.client.get(endpoint);
      expectValidApiResponse(response, 200);
    });
  });

  describe('UTXO Chains', () => {
    it('should get address transactions for BTC', async () => {
      const endpoint = `v1/transactions/ecosystem/${EcoSystem.UTXO}/chain/${ChainAlias.BITCOIN}/address/${TEST_ADDRESSES.btc.valid}?first=${MAX_PAGE_SIZE}`;

      const response = await clients.CLIENT_1.client.get(endpoint);
      expectValidApiResponse(response, 200);
    });

    it.skip('should get address transactions for MNEE', async () => {
      const endpoint = `v1/transactions/ecosystem/${EcoSystem.UTXO}/chain/${ChainAlias.MNEE}/address/${TEST_ADDRESSES.mnee.valid}?first=${MAX_PAGE_SIZE}`;

      const response = await clients.CLIENT_1.client.get(endpoint);
      expectValidApiResponse(response, 200);
    });
  });

  describe.todo('pagination', () => {
    it('should paginate transactions', async () => {});
    it('should paginate transactions with a cursor forwards', async () => {});
    it('should paginate transactions with a cursor backwards', async () => {});
    it('should paginate transactions with a limit', async () => {});
    it('should paginate transactions with a cursor and a limit', async () => {});
    it('should paginate transactions with a cursor and a limit and a filter', async () => {});
  });

  describe.todo('filters', () => {
    it('should filter transactions by address', async () => {});
    it('should filter transactions by chain', async () => {});
    it('should filter transactions by type', async () => {});
    it('should filter transactions by amount', async () => {});
    it('should filter transactions by date', async () => {});
  });
});
