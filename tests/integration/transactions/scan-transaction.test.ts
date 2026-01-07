import { beforeAll, describe, expect, it } from 'vitest';
import type { DefaultAuthenticatedClients } from '@/tests/models.js';
import { setupTestUsers } from '@/tests/utils/testApiClient.js';

/**
 * Scan Transaction Integration Tests
 *
 * These tests are conditionally executed based on the "run additional tests" GitHub label.
 *
 * To run these tests:
 * 1. Set the environment variable: RUN_ADDITIONAL_TESTS=true
 * 2. Or add the "run additional tests" label to your GitHub PR
 *
 */
// Only run these tests if the "run additional tests" label is present
const shouldRunAdditionalTests = process.env.RUN_ADDITIONAL_TESTS === 'true';

(shouldRunAdditionalTests ? describe : describe.skip)('Scan Transaction Integration Tests', () => {
  let clients: DefaultAuthenticatedClients;

  beforeAll(async () => {
    clients = await setupTestUsers();
  });

  describe('EVM Transaction Scanning', () => {
    it('should return 200 and result for valid EVM transaction scan request', async () => {
      const endpoint = 'v1/transactions/ecosystem/evm/chain/eth/scan-transaction';

      const payload = {
        options: ['validation'],
        data: {
          from: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        },
        account_address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        metadata: {
          domain: 'https://app.example.com',
        },
      };

      const response = await clients.CLIENT_1.client.post(endpoint, payload);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('result');
    });

    it('should return 400 for invalid EVM transaction scan request', async () => {
      const endpoint = 'v1/transactions/ecosystem/evm/chain/eth/scan-transaction';

      // Invalid payload: missing required fields
      const payload = {
        account_address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        // Missing metadata.domain and data object
      };

      expect(
        (
          await clients.CLIENT_1.client.post(endpoint, payload, {
            validateStatus: () => true,
          })
        ).status
      ).toBe(400);
    });
  });

  // Seems like our api key does not have this for now, so skipping
  describe.skip('SVM Transaction Scanning', () => {
    it('should handle SVM transaction scan request', async () => {
      const endpoint = 'v1/transactions/ecosystem/svm/chain/solana/scan-transaction';

      const payload = {
        options: ['validation', 'simulation'],
        encoding: 'base58',
        transactions: [
          'vxBNpvao9QJmLKXUThbbjRnxm3ufu4Wku97kHd5a67FDjSqeHwcPrBKTjAHp4ECr61eWwoxvUEVTuu',
        ],
        account_address: '86xCnPeV69n6t3DnyGvkKobf9FdN2H9oiVDdaMpo2MMY',
        method: 'signAllTransactions',
        metadata: {
          url: 'https://app.example.com',
        },
      };

      const response = await clients.CLIENT_1.client.post(endpoint, payload);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('result');
    });

    it('should return 400 for invalid SVM transaction scan request', async () => {
      const endpoint = 'v1/transactions/ecosystem/svm/chain/solana/scan-transaction';

      // Invalid payload: missing transactions field
      const payload = {
        account_address: '86xCnPeV69n6t3',
        method: 'signAllTransactions',
        encoding: 'base58',
      };

      expect(
        (
          await clients.CLIENT_1.client.post(endpoint, payload, {
            validateStatus: () => true,
          })
        ).status
      ).toBe(400);
    });
  });

  describe('Error Handling', () => {
    it('should reject request without transaction', async () => {
      const endpoint = 'v1/transactions/ecosystem/evm/chain/eth/scan-transaction';

      const payload = {
        // Missing required fields: data, account_address, metadata.domain
        options: ['validation'],
      };

      expect(
        (
          await clients.CLIENT_1.client.post(endpoint, payload, {
            validateStatus: () => true,
          })
        ).status
      ).toBe(400);
    });

    it('should reject request with invalid chain for ecosystem', async () => {
      const endpoint = 'v1/transactions/ecosystem/evm/chain/solana/scan-transaction';

      const payload = {
        options: ['validation'],
        data: {
          from: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          data: '0x1234567890abcdef',
          value: '0x0',
        },
        account_address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        metadata: {
          domain: 'https://app.example.com',
        },
      };

      expect(
        (
          await clients.CLIENT_1.client.post(endpoint, payload, {
            validateStatus: () => true,
          })
        ).status
      ).toBe(400);
    });
  });

  describe('Optional Fields', () => {
    it('should accept request without optional fields', async () => {
      const endpoint = 'v1/transactions/ecosystem/evm/chain/eth/scan-transaction';

      const payload = {
        options: ['validation'],
        data: {
          from: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          data: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          value: '0x0',
        },
        account_address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        metadata: {
          domain: 'https://app.example.com',
        },
      };

      expect(
        (
          await clients.CLIENT_1.client.post(endpoint, payload, {
            validateStatus: () => true,
          })
        ).status
      ).toBe(200);
    });
  });
});
