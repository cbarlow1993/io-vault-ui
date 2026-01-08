import { EcoSystem } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { beforeAll, describe, expect, it } from 'vitest';
import { expectValidApiResponse } from '@/tests/integration/utils/testFixtures.js';
import { type DefaultTestClients, setupTestClients } from '@/tests/utils/dualModeTestClient.js';

describe('List Chains Integration Tests', () => {
  let clients: DefaultTestClients;

  beforeAll(async () => {
    clients = await setupTestClients();
  });

  describe('Basic Functionality', () => {
    it('should get all chains without filters', async () => {
      const endpoint = '/v2/chains';
      const response = await clients.CLIENT_1.client.get(endpoint);

      expectValidApiResponse(response, 200);
      expect(response.data).toHaveProperty('data');
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);

      // Validate chain structure
      const chain = response.data.data[0];
      expect(chain).toHaveProperty('id');
      expect(chain).toHaveProperty('name');
      expect(chain).toHaveProperty('chainAlias');
      expect(chain).toHaveProperty('nativeCurrency');
      expect(chain).toHaveProperty('ecosystem');
      expect(chain).toHaveProperty('features');
      expect(chain).toHaveProperty('isTestnet');
      expect(chain).toHaveProperty('rpcUrls');
    });

    it('should exclude testnets by default', async () => {
      const endpoint = '/v2/chains';
      const response = await clients.CLIENT_1.client.get(endpoint);

      expectValidApiResponse(response, 200);
      const chains = response.data.data;
      const testnetChains = chains.filter((chain: any) => chain.isTestnet === true);
      expect(testnetChains.length).toBe(0);
    });
  });

  describe('Ecosystem Filtering', () => {
    const ecosystems = [
      { ecosystem: EcoSystem.EVM, name: 'EVM' },
      { ecosystem: EcoSystem.SVM, name: 'SVM' },
      { ecosystem: EcoSystem.UTXO, name: 'UTXO' },
      { ecosystem: EcoSystem.XRP, name: 'XRP' },
      { ecosystem: EcoSystem.TVM, name: 'TVM' },
      { ecosystem: EcoSystem.SUBSTRATE, name: 'Substrate' },
    ];

    it.each(ecosystems)('should filter chains by ecosystem: $name', async ({ ecosystem }) => {
      const endpoint = `/v2/chains?ecosystem=${ecosystem}`;
      const response = await clients.CLIENT_1.client.get(endpoint);

      expectValidApiResponse(response, 200);
      const chains = response.data.data;

      // All returned chains should belong to the specified ecosystem
      chains.forEach((chain: any) => {
        expect(chain.ecosystem).toBe(ecosystem);
      });

      // Should have at least one chain for each ecosystem
      expect(chains.length).toBeGreaterThan(0);
    });
  });

  describe('Chain-Specific Filtering', () => {
    // Note: API uses 'chainAlias' query param, not 'chain'
    const testChains = [
      { chainAlias: 'eth', ecosystem: EcoSystem.EVM },
      { chainAlias: 'polygon', ecosystem: EcoSystem.EVM },
      { chainAlias: 'solana', ecosystem: EcoSystem.SVM },
      { chainAlias: 'bitcoin', ecosystem: EcoSystem.UTXO },
      { chainAlias: 'ripple', ecosystem: EcoSystem.XRP },
      { chainAlias: 'tron', ecosystem: EcoSystem.TVM },
    ];

    it.each(testChains)('should filter by specific chain: $chainAlias', async ({ chainAlias, ecosystem }) => {
      const endpoint = `/v2/chains?chainAlias=${chainAlias}`;
      const response = await clients.CLIENT_1.client.get(endpoint);

      expectValidApiResponse(response, 200);
      const chains = response.data.data;

      // Should return exactly one chain
      expect(chains.length).toBe(1);
      expect(chains[0].chainAlias).toBe(chainAlias);
      expect(chains[0].ecosystem).toBe(ecosystem);
    });

    it.each(testChains)(
      'should filter by ecosystem and chain combination: $chainAlias',
      async ({ chainAlias, ecosystem }) => {
        const endpoint = `/v2/chains?ecosystem=${ecosystem}&chainAlias=${chainAlias}`;
        const response = await clients.CLIENT_1.client.get(endpoint);

        expectValidApiResponse(response, 200);
        const chains = response.data.data;

        // Should return exactly one chain
        expect(chains.length).toBe(1);
        expect(chains[0].chainAlias).toBe(chainAlias);
        expect(chains[0].ecosystem).toBe(ecosystem);
      }
    );
  });

  describe('ChainId Filtering', () => {
    it('should filter chains by chainId', async () => {
      // First get all chains to find a valid chainId
      const allChainsResponse = await clients.CLIENT_1.client.get('/v2/chains');
      expectValidApiResponse(allChainsResponse, 200);

      const chains = allChainsResponse.data.data;
      const chainWithId = chains.find((chain: any) => chain.id !== null);

      if (chainWithId) {
        const endpoint = `/v2/chains?chainId=${chainWithId.id}`;
        const response = await clients.CLIENT_1.client.get(endpoint);

        expectValidApiResponse(response, 200);
        const filteredChains = response.data.data;

        // Should return chains with the specified chainId
        expect(filteredChains.length).toBeGreaterThan(0);
        filteredChains.forEach((chain: any) => {
          expect(chain.id).toBe(chainWithId.id);
        });
      }
    });

    it('should return empty array for non-existent chainId', async () => {
      const endpoint = '/v2/chains?chainId=999999';
      const response = await clients.CLIENT_1.client.get(endpoint);

      expectValidApiResponse(response, 200);
      expect(response.data.data).toEqual([]);
    });
  });

  describe('Include Testnets Parameter', () => {
    it('should include testnets when includeTestnets=true', async () => {
      const endpoint = '/v2/chains?includeTestnets=true';
      const response = await clients.CLIENT_1.client.get(endpoint);

      expectValidApiResponse(response, 200);
      const chains = response.data.data;

      // Should have at least one testnet chain
      const testnetChains = chains.filter((chain: any) => chain.isTestnet === true);
      expect(testnetChains.length).toBeGreaterThan(0);
    });

    it('should exclude testnets when includeTestnets=false', async () => {
      const endpoint = '/v2/chains?includeTestnets=false';
      const response = await clients.CLIENT_1.client.get(endpoint);

      expectValidApiResponse(response, 200);
      const chains = response.data.data;

      // Should not have any testnet chains
      const testnetChains = chains.filter((chain: any) => chain.isTestnet === true);
      expect(testnetChains.length).toBe(0);
    });
  });

  describe.todo('AsV1 Parameter', () => {
    it.todo('should include v1 chains when asV1=true and environment is not prod', async () => {});

    it.todo('should work with asV1=false and environment is not prod', async () => {});
  });

  describe('Combined Parameters', () => {
    it('should work with ecosystem and includeTestnets', async () => {
      const endpoint = `/v2/chains?ecosystem=${EcoSystem.EVM}&includeTestnets=true`;
      const response = await clients.CLIENT_1.client.get(endpoint);

      expectValidApiResponse(response, 200);
      const chains = response.data.data;

      // All chains should be EVM
      chains.forEach((chain: any) => {
        expect(chain.ecosystem).toBe(EcoSystem.EVM);
      });

      // Should include both mainnet and testnet EVM chains
      expect(chains.length).toBeGreaterThan(0);
    });

    it('should work with chainAlias and includeTestnets', async () => {
      const endpoint = '/v2/chains?chainAlias=eth&includeTestnets=true';
      const response = await clients.CLIENT_1.client.get(endpoint);

      expectValidApiResponse(response, 200);
      const chains = response.data.data;

      // Should return Ethereum chains (mainnet and testnet)
      chains.forEach((chain: any) => {
        expect(chain.chainAlias).toBe('eth');
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for invalid ecosystem', async () => {
      const endpoint = '/v2/chains?ecosystem=invalid';
      const response = await clients.CLIENT_1.client.get(endpoint);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid chainAlias', async () => {
      const endpoint = '/v2/chains?chainAlias=invalid-chain';
      const response = await clients.CLIENT_1.client.get(endpoint);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid chainId', async () => {
      const endpoint = '/v2/chains?chainId=invalid';
      const response = await clients.CLIENT_1.client.get(endpoint);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid boolean parameters', async () => {
      const endpoint = '/v2/chains?includeTestnets=invalid&asV1=invalid';
      const response = await clients.CLIENT_1.client.get(endpoint);

      console.log('response', response);

      expect(response.status).toBe(400);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty query parameters', async () => {
      const endpoint = '/v2/chains?';
      const response = await clients.CLIENT_1.client.get(endpoint);

      expectValidApiResponse(response, 200);
      expect(response.data.data.length).toBeGreaterThan(0);
    });

    it('should handle very long parameter values', async () => {
      const longValue = 'a'.repeat(1000);
      const endpoint = `/v2/chains?ecosystem=${longValue}`;
      const response = await clients.CLIENT_1.client.get(endpoint);

      expect(response.status).toBe(400);
    });
  });

  describe('Response Structure Validation', () => {
    it('should return properly structured chain objects', async () => {
      const endpoint = '/v2/chains';
      const response = await clients.CLIENT_1.client.get(endpoint);

      expectValidApiResponse(response, 200);
      const chains = response.data.data;

      chains.forEach((chain: any) => {
        // Required fields
        if (chain.ecosystem === EcoSystem.EVM) {
          expect(chain).toHaveProperty('id');
        }
        expect(chain).toHaveProperty('name');
        expect(chain).toHaveProperty('chainAlias');
        expect(chain).toHaveProperty('ecosystem');
        expect(chain).toHaveProperty('features');
        expect(chain).toHaveProperty('isTestnet');

        // Type validation
        expect(typeof chain.name).toBe('string');
        expect(typeof chain.chainAlias).toBe('string');
        expect(typeof chain.ecosystem).toBe('string');
        expect(typeof chain.isTestnet).toBe('boolean');
        expect(typeof chain.features).toBe('object');

        // Native currency structure (if present)
        if (chain.nativeCurrency) {
          expect(chain.nativeCurrency).toHaveProperty('name');
          expect(chain.nativeCurrency).toHaveProperty('symbol');
          expect(chain.nativeCurrency).toHaveProperty('decimals');
        }

        // Block explorers structure (for EVM chains)
        if (chain.blockExplorers) {
          expect(typeof chain.blockExplorers).toBe('object');
        }

        // RPC URLs structure validation
        expect(chain).toHaveProperty('rpcUrls');
        expect(chain.rpcUrls).toHaveProperty('iofinnet');
        expect(chain.rpcUrls.iofinnet).toHaveProperty('http');
        expect(Array.isArray(chain.rpcUrls.iofinnet.http)).toBe(true);
        expect(chain.rpcUrls.iofinnet.http.length).toBeGreaterThan(0);
        expect(typeof chain.rpcUrls.iofinnet.http[0]).toBe('string');
        expect(chain.rpcUrls.iofinnet.http[0]).toContain('https://nodes.iofinnet.com/');
      });
    });
  });
});
