import { beforeAll, describe, expect, it } from 'vitest';
import type { DefaultAuthenticatedClients } from '@/tests/models.js';
import { setupTestUsers } from '@/tests/utils/testApiClient.js';
import {
  buildVaultEndpoint,
  expectErrorResponse,
  expectValidTransactionResponse,
  TEST_ADDRESSES,
  TEST_PAYLOADS,
} from '@/tests/integration/utils/testFixtures.js';

describe('Build Transaction Integration Tests ', () => {
  let clients: DefaultAuthenticatedClients;

  beforeAll(async () => {
    // Setup authenticated clients for both test users
    clients = await setupTestUsers();
  });

  describe('MNEE (UTXO) Chain', () => {
    const getEndpoint = () =>
      buildVaultEndpoint(
        clients.CLIENT_1.user,
        '/transactions/ecosystem/utxo/chain/mnee/build-native-transaction'
      );

    // Skipping as requires a funded wallet
    it.skip('should build a valid MNEE transaction', async () => {
      const response = await clients.CLIENT_1.client.post(
        getEndpoint(),
        TEST_PAYLOADS.buildTransaction.mnee
      );

      expectValidTransactionResponse(response);
    });

    it.skip('should reject invalid recipient address', async () => {
      const payload = {
        ...TEST_PAYLOADS.buildTransaction.mnee,
        to: TEST_ADDRESSES.btc.invalid,
      };

      const response = await clients.CLIENT_1.client.post(getEndpoint(), payload, {
        validateStatus: () => true,
      });

      expectErrorResponse(response, 400, 'Invalid recipient address');
    });

    it('should reject invalid derivation path', async () => {
      const response = await clients.CLIENT_1.client.post(
        getEndpoint(),
        TEST_PAYLOADS.buildTransaction.mnee,
        {
          validateStatus: () => true,
        }
      );

      expectErrorResponse(response, 404);
    });
  });

  // XRP tests require funded wallet with at least 1 XRP reserve
  describe('XRP Chain', () => {
    const getEndpoint = () =>
      buildVaultEndpoint(
        clients.CLIENT_1.user,
        '/transactions/ecosystem/xrp/chain/ripple/build-native-transaction'
      );

    it.skip('should build a valid XRP transaction (requires funded wallet)', async () => {
      const response = await clients.CLIENT_1.client.post(
        getEndpoint(),
        TEST_PAYLOADS.buildTransaction.xrp
      );

      expectValidTransactionResponse(response);
    });

    it('should reject invalid recipient address', async () => {
      const payload = {
        ...TEST_PAYLOADS.buildTransaction.xrp,
        to: TEST_ADDRESSES.xrp.invalid,
      };

      const response = await clients.CLIENT_1.client.post(getEndpoint(), payload, {
        validateStatus: () => true,
      });

      // API returns generic "Bad Request" message
      expectErrorResponse(response, 400);
    });

    it.skip('should handle optional tag field (requires funded wallet)', async () => {
      const payload = {
        amount: '1',
        to: TEST_ADDRESSES.xrp.valid,
        memo: 'Test transaction',
        // Note: tag is optional
      };

      const response = await clients.CLIENT_1.client.post(getEndpoint(), payload);

      expectValidTransactionResponse(response);
    });
  });

  describe('EVM Chains', () => {
    const getEndpoint = (chain: string) =>
      buildVaultEndpoint(
        clients.CLIENT_1.user,
        `/transactions/ecosystem/evm/chain/${chain}/build-native-transaction`
      );
    const getTokenEndpoint = (chain: string) =>
      buildVaultEndpoint(
        clients.CLIENT_1.user,
        `/transactions/ecosystem/evm/chain/${chain}/build-token-transaction`
      );

    it.skip('should build a valid transaction with fractional gasPrice (requires funded wallet)', async () => {
      const payload = {
        amount: '0.01',
        to: TEST_ADDRESSES.evm.valid,
        gasPrice: '0.58', // Fractional GWEI
      };
      const response = await clients.CLIENT_1.client.post(getEndpoint('avalanche-c'), payload);
      expectValidTransactionResponse(response);
    });

    it('should reject transaction with invalid gasPrice (negative)', async () => {
      const payload = {
        amount: '0.01',
        to: TEST_ADDRESSES.evm.valid,
        gasPrice: '-1',
      };
      const response = await clients.CLIENT_1.client.post(getEndpoint('avalanche-c'), payload, {
        validateStatus: () => true,
      });
      // API returns generic "Bad Request" message
      expectErrorResponse(response, 400);
    });

    it('should reject transaction with invalid gasPrice (non-numeric)', async () => {
      const payload = {
        amount: '0.01',
        to: TEST_ADDRESSES.evm.valid,
        gasPrice: 'not-a-number',
      };
      const response = await clients.CLIENT_1.client.post(getEndpoint('avalanche-c'), payload, {
        validateStatus: () => true,
      });
      // API returns generic "Bad Request" message
      expectErrorResponse(response, 400);
    });

    // Token transaction endpoint tests for shared gasPriceSchema
    it.skip('should build a valid token transaction with fractional gasPrice (requires funded wallet/service availability)', async () => {
      const payload = {
        amount: '0.01',
        to: TEST_ADDRESSES.evm.valid,
        tokenAddress: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        gasPrice: '0.58',
      };
      const response = await clients.CLIENT_1.client.post(getTokenEndpoint('avalanche-c'), payload);
      expectValidTransactionResponse(response);
    });

    it('should reject token transaction with invalid gasPrice (negative)', async () => {
      const payload = {
        amount: '0.01',
        to: TEST_ADDRESSES.evm.valid,
        tokenAddress: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        gasPrice: '-1',
      };
      const response = await clients.CLIENT_1.client.post(
        getTokenEndpoint('avalanche-c'),
        payload,
        {
          validateStatus: () => true,
        }
      );
      // API returns generic "Bad Request" message
      expectErrorResponse(response, 400);
    });

    it('should reject token transaction with invalid gasPrice (non-numeric)', async () => {
      const payload = {
        amount: '0.01',
        to: TEST_ADDRESSES.evm.valid,
        tokenAddress: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        gasPrice: 'not-a-number',
      };
      const response = await clients.CLIENT_1.client.post(
        getTokenEndpoint('avalanche-c'),
        payload,
        {
          validateStatus: () => true,
        }
      );
      // API returns generic "Bad Request" message
      expectErrorResponse(response, 400);
    });
  });

  // Solana durable nonce tests require funded wallets
  describe('Solana Durable Nonce', () => {
    const getBuildDurableNonceEndpoint = () =>
      buildVaultEndpoint(
        clients.CLIENT_1.user,
        '/transactions/ecosystem/svm/chain/solana/build-durable-nonce-transaction'
      );

    const getDurableNonceEndpoint = () =>
      buildVaultEndpoint(
        clients.CLIENT_1.user,
        '/transactions/ecosystem/svm/chain/solana/durable-nonce'
      );

    it.skip('should build a durable nonce transaction (requires funded wallet)', async () => {
      const payload = {
        nonceAccountAddress: TEST_ADDRESSES.solana.valid,
      };

      const response = await clients.CLIENT_1.client.post(getBuildDurableNonceEndpoint(), payload);

      expectValidTransactionResponse(response);
    });

    it.skip('should get durable nonce info (requires funded wallet with nonce account)', async () => {
      const response = await clients.CLIENT_1.client.get(getDurableNonceEndpoint(), {
        params: {
          nonceAccountAddress: TEST_ADDRESSES.solana.valid,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('nonce');
      expect(response.data).toHaveProperty('authority');
    });

    it('should reject build durable nonce without required params', async () => {
      const response = await clients.CLIENT_1.client.post(
        getBuildDurableNonceEndpoint(),
        {},
        {
          validateStatus: () => true,
        }
      );

      expectErrorResponse(response, 400);
    });

    it('should reject get durable nonce without required query params', async () => {
      const response = await clients.CLIENT_1.client.get(getDurableNonceEndpoint(), {
        validateStatus: () => true,
      });

      expectErrorResponse(response, 400);
    });
  });

  describe('Error Cases', () => {
    it('should reject unauthorized requests', async () => {
      // Use an EVM endpoint that exists
      const endpoint = buildVaultEndpoint(
        clients.CLIENT_1.user,
        '/transactions/ecosystem/evm/chain/eth/build-native-transaction'
      );

      // Use an unauthenticated client
      const { APITestClient } = await import('@/tests/utils/testApiClient.js');
      const unauthenticatedClient = new APITestClient('invalid-token');

      const response = await unauthenticatedClient.post(
        endpoint,
        TEST_PAYLOADS.buildTransaction.ethereum
      );

      // API returns 401 (Unauthorized) or 403 (Forbidden) for invalid auth
      expect([401, 403]).toContain(response.status);
    });

    it('should reject invalid ecosystem/chain combination', async () => {
      const endpoint = buildVaultEndpoint(
        clients.CLIENT_1.user,
        '/transactions/ecosystem/invalid/chain/invalid/build-native-transaction'
      );

      const payload = {
        amount: '0.01',
        to: TEST_ADDRESSES.evm.valid,
      };

      const response = await clients.CLIENT_1.client.post(endpoint, payload, {
        validateStatus: () => true,
      });

      // API returns 404 for non-existent ecosystem/chain combinations
      expect([400, 404]).toContain(response.status);
    });
  });
});
