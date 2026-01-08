import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import errorHandlerPlugin from '@/src/plugins/error-handler.js';

// Mock environment variables
vi.stubEnv('STAGE', 'dev');

// Hoisted mock functions for repositories
const { mockUpdateSpamOverride, mockUpdateSpamOverrideBatch, mockFindAddressById } = vi.hoisted(() => ({
  mockUpdateSpamOverride: vi.fn(),
  mockUpdateSpamOverrideBatch: vi.fn(),
  mockFindAddressById: vi.fn(),
}));

const TEST_ORG_ID = 'org-123';
const TEST_OTHER_ORG_ID = 'org-456';
const TEST_USER_ID = 'user-123';
const TEST_ADDRESS_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_TOKEN_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

async function createTestApp() {
  const app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Register error handler
  await app.register(errorHandlerPlugin);

  // Mock auth decorator
  app.decorateRequest('auth', null);
  app.addHook('onRequest', async (request) => {
    request.auth = { organisationId: TEST_ORG_ID, userId: TEST_USER_ID, token: 'test-token' };
  });

  // Mock repositories
  app.decorate('repositories', {
    tokenHoldings: {
      updateSpamOverride: mockUpdateSpamOverride,
      updateSpamOverrideBatch: mockUpdateSpamOverrideBatch,
    },
    addresses: {
      findById: mockFindAddressById,
    },
  } as any);

  // Import and register spam routes
  const spamRoutes = await import('@/src/routes/spam/index.js');
  await app.register(spamRoutes.default, { prefix: '/v2' });
  await app.ready();

  return app;
}

// Default address mock that belongs to TEST_ORG_ID
const mockAddressSameOrg = {
  id: TEST_ADDRESS_ID,
  organisation_id: TEST_ORG_ID,
  address: '0x123',
  chain: 'eth',
};

describe('Spam Override Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // By default, mock address lookup to return address belonging to same org
    mockFindAddressById.mockResolvedValue(mockAddressSameOrg);
  });

  describe('PATCH /v2/addresses/:addressId/tokens/:tokenAddress/spam-override', () => {
    it('sets a spam override for a token as trusted', async () => {
      const app = await createTestApp();
      const now = new Date();

      mockUpdateSpamOverride.mockResolvedValueOnce({
        id: 'holding-123',
        addressId: TEST_ADDRESS_ID,
        tokenAddress: TEST_TOKEN_ADDRESS.toLowerCase(),
        userSpamOverride: 'trusted',
        overrideUpdatedAt: now,
        updatedAt: now,
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/v2/addresses/${TEST_ADDRESS_ID}/tokens/${TEST_TOKEN_ADDRESS}/spam-override`,
        payload: { override: 'trusted' },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data).toEqual({
        tokenAddress: TEST_TOKEN_ADDRESS.toLowerCase(),
        userOverride: 'trusted',
        updatedAt: expect.any(String),
      });
      expect(mockUpdateSpamOverride).toHaveBeenCalledWith(
        TEST_ADDRESS_ID,
        TEST_TOKEN_ADDRESS.toLowerCase(),
        'trusted'
      );
    });

    it('sets a spam override for a token as spam', async () => {
      const app = await createTestApp();
      const now = new Date();

      mockUpdateSpamOverride.mockResolvedValueOnce({
        id: 'holding-123',
        addressId: TEST_ADDRESS_ID,
        tokenAddress: TEST_TOKEN_ADDRESS.toLowerCase(),
        userSpamOverride: 'spam',
        overrideUpdatedAt: now,
        updatedAt: now,
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/v2/addresses/${TEST_ADDRESS_ID}/tokens/${TEST_TOKEN_ADDRESS}/spam-override`,
        payload: { override: 'spam' },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.userOverride).toBe('spam');
    });

    it('handles native token address', async () => {
      const app = await createTestApp();
      const now = new Date();

      mockUpdateSpamOverride.mockResolvedValueOnce({
        id: 'holding-123',
        addressId: TEST_ADDRESS_ID,
        tokenAddress: null,
        userSpamOverride: 'trusted',
        overrideUpdatedAt: now,
        updatedAt: now,
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/v2/addresses/${TEST_ADDRESS_ID}/tokens/native/spam-override`,
        payload: { override: 'trusted' },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.tokenAddress).toBe('native');
      expect(mockUpdateSpamOverride).toHaveBeenCalledWith(
        TEST_ADDRESS_ID,
        null, // native token is stored as null
        'trusted'
      );
    });

    it('returns 404 when token holding not found', async () => {
      const app = await createTestApp();

      mockUpdateSpamOverride.mockResolvedValueOnce(null);

      const response = await app.inject({
        method: 'PATCH',
        url: `/v2/addresses/${TEST_ADDRESS_ID}/tokens/${TEST_TOKEN_ADDRESS}/spam-override`,
        payload: { override: 'trusted' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('validates addressId is a UUID', async () => {
      const app = await createTestApp();

      const response = await app.inject({
        method: 'PATCH',
        url: `/v2/addresses/invalid-uuid/tokens/${TEST_TOKEN_ADDRESS}/spam-override`,
        payload: { override: 'trusted' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('validates override value', async () => {
      const app = await createTestApp();

      const response = await app.inject({
        method: 'PATCH',
        url: `/v2/addresses/${TEST_ADDRESS_ID}/tokens/${TEST_TOKEN_ADDRESS}/spam-override`,
        payload: { override: 'invalid' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('DELETE /v2/addresses/:addressId/tokens/:tokenAddress/spam-override', () => {
    it('removes a spam override for a token', async () => {
      const app = await createTestApp();
      const now = new Date();

      mockUpdateSpamOverride.mockResolvedValueOnce({
        id: 'holding-123',
        addressId: TEST_ADDRESS_ID,
        tokenAddress: TEST_TOKEN_ADDRESS.toLowerCase(),
        userSpamOverride: null,
        overrideUpdatedAt: null,
        updatedAt: now,
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/v2/addresses/${TEST_ADDRESS_ID}/tokens/${TEST_TOKEN_ADDRESS}/spam-override`,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data).toEqual({
        tokenAddress: TEST_TOKEN_ADDRESS.toLowerCase(),
        userOverride: null,
        updatedAt: expect.any(String),
      });
      expect(mockUpdateSpamOverride).toHaveBeenCalledWith(
        TEST_ADDRESS_ID,
        TEST_TOKEN_ADDRESS.toLowerCase(),
        null
      );
    });

    it('handles native token address', async () => {
      const app = await createTestApp();
      const now = new Date();

      mockUpdateSpamOverride.mockResolvedValueOnce({
        id: 'holding-123',
        addressId: TEST_ADDRESS_ID,
        tokenAddress: null,
        userSpamOverride: null,
        overrideUpdatedAt: null,
        updatedAt: now,
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/v2/addresses/${TEST_ADDRESS_ID}/tokens/native/spam-override`,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.tokenAddress).toBe('native');
      expect(mockUpdateSpamOverride).toHaveBeenCalledWith(
        TEST_ADDRESS_ID,
        null,
        null
      );
    });

    it('returns 404 when token holding not found', async () => {
      const app = await createTestApp();

      mockUpdateSpamOverride.mockResolvedValueOnce(null);

      const response = await app.inject({
        method: 'DELETE',
        url: `/v2/addresses/${TEST_ADDRESS_ID}/tokens/${TEST_TOKEN_ADDRESS}/spam-override`,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /v2/addresses/:addressId/tokens/spam-overrides (Bulk)', () => {
    it('sets multiple spam overrides at once', async () => {
      const app = await createTestApp();
      const now = new Date();
      const token2 = '0xdac17f958d2ee523a2206206994597c13d831ec7';

      // Now uses batch method for atomic updates
      mockUpdateSpamOverrideBatch.mockResolvedValueOnce([
        {
          id: 'holding-1',
          addressId: TEST_ADDRESS_ID,
          tokenAddress: TEST_TOKEN_ADDRESS.toLowerCase(),
          userSpamOverride: 'trusted',
          overrideUpdatedAt: now,
          updatedAt: now,
        },
        {
          id: 'holding-2',
          addressId: TEST_ADDRESS_ID,
          tokenAddress: token2.toLowerCase(),
          userSpamOverride: 'spam',
          overrideUpdatedAt: now,
          updatedAt: now,
        },
      ]);

      const response = await app.inject({
        method: 'PATCH',
        url: `/v2/addresses/${TEST_ADDRESS_ID}/tokens/spam-overrides`,
        payload: {
          overrides: [
            { tokenAddress: TEST_TOKEN_ADDRESS, override: 'trusted' },
            { tokenAddress: token2, override: 'spam' },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.updated).toHaveLength(2);
      expect(data.updated[0]).toEqual({
        tokenAddress: TEST_TOKEN_ADDRESS.toLowerCase(),
        userOverride: 'trusted',
        updatedAt: expect.any(String),
      });
      expect(data.updated[1]).toEqual({
        tokenAddress: token2.toLowerCase(),
        userOverride: 'spam',
        updatedAt: expect.any(String),
      });
    });

    it('handles native token in bulk update', async () => {
      const app = await createTestApp();
      const now = new Date();

      // Now uses batch method for atomic updates
      mockUpdateSpamOverrideBatch.mockResolvedValueOnce([
        {
          id: 'holding-1',
          addressId: TEST_ADDRESS_ID,
          tokenAddress: null,
          userSpamOverride: 'trusted',
          overrideUpdatedAt: now,
          updatedAt: now,
        },
      ]);

      const response = await app.inject({
        method: 'PATCH',
        url: `/v2/addresses/${TEST_ADDRESS_ID}/tokens/spam-overrides`,
        payload: {
          overrides: [{ tokenAddress: 'native', override: 'trusted' }],
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.updated[0].tokenAddress).toBe('native');
      expect(mockUpdateSpamOverrideBatch).toHaveBeenCalledWith(
        TEST_ADDRESS_ID,
        [{ tokenAddress: null, override: 'trusted' }]
      );
    });

    it('skips not found tokens in bulk update and returns only successful updates', async () => {
      const app = await createTestApp();
      const now = new Date();
      const token2 = '0xdac17f958d2ee523a2206206994597c13d831ec7';

      // Batch method returns only the token that was found
      mockUpdateSpamOverrideBatch.mockResolvedValueOnce([
        {
          id: 'holding-1',
          addressId: TEST_ADDRESS_ID,
          tokenAddress: TEST_TOKEN_ADDRESS.toLowerCase(),
          userSpamOverride: 'trusted',
          overrideUpdatedAt: now,
          updatedAt: now,
        },
      ]);

      const response = await app.inject({
        method: 'PATCH',
        url: `/v2/addresses/${TEST_ADDRESS_ID}/tokens/spam-overrides`,
        payload: {
          overrides: [
            { tokenAddress: TEST_TOKEN_ADDRESS, override: 'trusted' },
            { tokenAddress: token2, override: 'spam' },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.updated).toHaveLength(1);
      expect(data.updated[0].tokenAddress).toBe(TEST_TOKEN_ADDRESS.toLowerCase());
    });

    it('validates overrides array is not empty', async () => {
      const app = await createTestApp();

      const response = await app.inject({
        method: 'PATCH',
        url: `/v2/addresses/${TEST_ADDRESS_ID}/tokens/spam-overrides`,
        payload: { overrides: [] },
      });

      expect(response.statusCode).toBe(400);
    });

    it('validates override values in bulk', async () => {
      const app = await createTestApp();

      const response = await app.inject({
        method: 'PATCH',
        url: `/v2/addresses/${TEST_ADDRESS_ID}/tokens/spam-overrides`,
        payload: {
          overrides: [{ tokenAddress: TEST_TOKEN_ADDRESS, override: 'invalid' }],
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Authorization', () => {
    describe('setSpamOverride authorization', () => {
      it('rejects when address belongs to different organisation', async () => {
        const app = await createTestApp();

        // Mock address belonging to a different organisation
        mockFindAddressById.mockResolvedValueOnce({
          id: TEST_ADDRESS_ID,
          organisation_id: TEST_OTHER_ORG_ID, // Different org
          address: '0x123',
          chain: 'eth',
        });

        const response = await app.inject({
          method: 'PATCH',
          url: `/v2/addresses/${TEST_ADDRESS_ID}/tokens/${TEST_TOKEN_ADDRESS}/spam-override`,
          payload: { override: 'trusted' },
        });

        expect(response.statusCode).toBe(403);
        expect(mockUpdateSpamOverride).not.toHaveBeenCalled();
      });

      it('allows when address belongs to same organisation', async () => {
        const app = await createTestApp();
        const now = new Date();

        // Mock address belonging to the same organisation
        mockFindAddressById.mockResolvedValueOnce({
          id: TEST_ADDRESS_ID,
          organisation_id: TEST_ORG_ID, // Same org
          address: '0x123',
          chain: 'eth',
        });

        mockUpdateSpamOverride.mockResolvedValueOnce({
          id: 'holding-123',
          addressId: TEST_ADDRESS_ID,
          tokenAddress: TEST_TOKEN_ADDRESS.toLowerCase(),
          userSpamOverride: 'trusted',
          overrideUpdatedAt: now,
          updatedAt: now,
        });

        const response = await app.inject({
          method: 'PATCH',
          url: `/v2/addresses/${TEST_ADDRESS_ID}/tokens/${TEST_TOKEN_ADDRESS}/spam-override`,
          payload: { override: 'trusted' },
        });

        expect(response.statusCode).toBe(200);
        expect(mockUpdateSpamOverride).toHaveBeenCalled();
      });

      it('returns 404 when address not found', async () => {
        const app = await createTestApp();

        mockFindAddressById.mockResolvedValueOnce(null);

        const response = await app.inject({
          method: 'PATCH',
          url: `/v2/addresses/${TEST_ADDRESS_ID}/tokens/${TEST_TOKEN_ADDRESS}/spam-override`,
          payload: { override: 'trusted' },
        });

        expect(response.statusCode).toBe(404);
        expect(mockUpdateSpamOverride).not.toHaveBeenCalled();
      });
    });

    describe('deleteSpamOverride authorization', () => {
      it('rejects when address belongs to different organisation', async () => {
        const app = await createTestApp();

        // Mock address belonging to a different organisation
        mockFindAddressById.mockResolvedValueOnce({
          id: TEST_ADDRESS_ID,
          organisation_id: TEST_OTHER_ORG_ID, // Different org
          address: '0x123',
          chain: 'eth',
        });

        const response = await app.inject({
          method: 'DELETE',
          url: `/v2/addresses/${TEST_ADDRESS_ID}/tokens/${TEST_TOKEN_ADDRESS}/spam-override`,
        });

        expect(response.statusCode).toBe(403);
        expect(mockUpdateSpamOverride).not.toHaveBeenCalled();
      });

      it('allows when address belongs to same organisation', async () => {
        const app = await createTestApp();
        const now = new Date();

        // Mock address belonging to the same organisation
        mockFindAddressById.mockResolvedValueOnce({
          id: TEST_ADDRESS_ID,
          organisation_id: TEST_ORG_ID, // Same org
          address: '0x123',
          chain: 'eth',
        });

        mockUpdateSpamOverride.mockResolvedValueOnce({
          id: 'holding-123',
          addressId: TEST_ADDRESS_ID,
          tokenAddress: TEST_TOKEN_ADDRESS.toLowerCase(),
          userSpamOverride: null,
          overrideUpdatedAt: null,
          updatedAt: now,
        });

        const response = await app.inject({
          method: 'DELETE',
          url: `/v2/addresses/${TEST_ADDRESS_ID}/tokens/${TEST_TOKEN_ADDRESS}/spam-override`,
        });

        expect(response.statusCode).toBe(200);
        expect(mockUpdateSpamOverride).toHaveBeenCalled();
      });

      it('returns 404 when address not found', async () => {
        const app = await createTestApp();

        mockFindAddressById.mockResolvedValueOnce(null);

        const response = await app.inject({
          method: 'DELETE',
          url: `/v2/addresses/${TEST_ADDRESS_ID}/tokens/${TEST_TOKEN_ADDRESS}/spam-override`,
        });

        expect(response.statusCode).toBe(404);
        expect(mockUpdateSpamOverride).not.toHaveBeenCalled();
      });
    });

    describe('setBulkSpamOverrides authorization', () => {
      it('rejects when address belongs to different organisation', async () => {
        const app = await createTestApp();

        // Mock address belonging to a different organisation
        mockFindAddressById.mockResolvedValueOnce({
          id: TEST_ADDRESS_ID,
          organisation_id: TEST_OTHER_ORG_ID, // Different org
          address: '0x123',
          chain: 'eth',
        });

        const response = await app.inject({
          method: 'PATCH',
          url: `/v2/addresses/${TEST_ADDRESS_ID}/tokens/spam-overrides`,
          payload: {
            overrides: [{ tokenAddress: TEST_TOKEN_ADDRESS, override: 'trusted' }],
          },
        });

        expect(response.statusCode).toBe(403);
        expect(mockUpdateSpamOverride).not.toHaveBeenCalled();
      });

      it('allows when address belongs to same organisation', async () => {
        const app = await createTestApp();
        const now = new Date();

        // Mock address belonging to the same organisation
        mockFindAddressById.mockResolvedValueOnce({
          id: TEST_ADDRESS_ID,
          organisation_id: TEST_ORG_ID, // Same org
          address: '0x123',
          chain: 'eth',
        });

        // Now uses batch method for atomic updates
        mockUpdateSpamOverrideBatch.mockResolvedValueOnce([
          {
            id: 'holding-1',
            addressId: TEST_ADDRESS_ID,
            tokenAddress: TEST_TOKEN_ADDRESS.toLowerCase(),
            userSpamOverride: 'trusted',
            overrideUpdatedAt: now,
            updatedAt: now,
          },
        ]);

        const response = await app.inject({
          method: 'PATCH',
          url: `/v2/addresses/${TEST_ADDRESS_ID}/tokens/spam-overrides`,
          payload: {
            overrides: [{ tokenAddress: TEST_TOKEN_ADDRESS, override: 'trusted' }],
          },
        });

        expect(response.statusCode).toBe(200);
        expect(mockUpdateSpamOverrideBatch).toHaveBeenCalled();
      });

      it('returns 404 when address not found', async () => {
        const app = await createTestApp();

        mockFindAddressById.mockResolvedValueOnce(null);

        const response = await app.inject({
          method: 'PATCH',
          url: `/v2/addresses/${TEST_ADDRESS_ID}/tokens/spam-overrides`,
          payload: {
            overrides: [{ tokenAddress: TEST_TOKEN_ADDRESS, override: 'trusted' }],
          },
        });

        expect(response.statusCode).toBe(404);
        expect(mockUpdateSpamOverrideBatch).not.toHaveBeenCalled();
      });
    });
  });

  describe('setBulkSpamOverrides atomicity', () => {
    it('uses batch method for atomic updates', async () => {
      const app = await createTestApp();
      const now = new Date();

      // Setup mocks
      mockFindAddressById.mockResolvedValue({
        id: TEST_ADDRESS_ID,
        organisation_id: TEST_ORG_ID,
      });

      const mockBatchResult = [
        { tokenAddress: '0x' + 'a'.repeat(40), userSpamOverride: 'trusted', updatedAt: now },
        { tokenAddress: '0x' + 'b'.repeat(40), userSpamOverride: 'spam', updatedAt: now },
      ];

      mockUpdateSpamOverrideBatch.mockResolvedValue(mockBatchResult);

      const response = await app.inject({
        method: 'PATCH',
        url: `/v2/addresses/${TEST_ADDRESS_ID}/tokens/spam-overrides`,
        payload: {
          overrides: [
            { tokenAddress: '0x' + 'A'.repeat(40), override: 'trusted' },
            { tokenAddress: '0x' + 'B'.repeat(40), override: 'spam' },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      expect(mockUpdateSpamOverrideBatch).toHaveBeenCalledOnce();
      expect(mockUpdateSpamOverrideBatch).toHaveBeenCalledWith(
        TEST_ADDRESS_ID,
        expect.arrayContaining([
          expect.objectContaining({ tokenAddress: '0x' + 'a'.repeat(40), override: 'trusted' }),
          expect.objectContaining({ tokenAddress: '0x' + 'b'.repeat(40), override: 'spam' }),
        ])
      );

      // Should NOT call the individual updateSpamOverride method
      expect(mockUpdateSpamOverride).not.toHaveBeenCalled();
    });

    it('returns all successfully updated tokens from batch', async () => {
      const app = await createTestApp();
      const now = new Date();

      mockFindAddressById.mockResolvedValue({
        id: TEST_ADDRESS_ID,
        organisation_id: TEST_ORG_ID,
      });

      const mockBatchResult = [
        { tokenAddress: '0x' + 'a'.repeat(40), userSpamOverride: 'trusted', updatedAt: now },
        { tokenAddress: null, userSpamOverride: 'spam', updatedAt: now },
      ];

      mockUpdateSpamOverrideBatch.mockResolvedValue(mockBatchResult);

      const response = await app.inject({
        method: 'PATCH',
        url: `/v2/addresses/${TEST_ADDRESS_ID}/tokens/spam-overrides`,
        payload: {
          overrides: [
            { tokenAddress: '0x' + 'A'.repeat(40), override: 'trusted' },
            { tokenAddress: 'native', override: 'spam' },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.updated).toHaveLength(2);
      expect(data.updated[0].tokenAddress).toBe('0x' + 'a'.repeat(40));
      expect(data.updated[1].tokenAddress).toBe('native');
    });

    it('handles empty batch result (no tokens found)', async () => {
      const app = await createTestApp();

      mockFindAddressById.mockResolvedValue({
        id: TEST_ADDRESS_ID,
        organisation_id: TEST_ORG_ID,
      });

      mockUpdateSpamOverrideBatch.mockResolvedValue([]);

      const response = await app.inject({
        method: 'PATCH',
        url: `/v2/addresses/${TEST_ADDRESS_ID}/tokens/spam-overrides`,
        payload: {
          overrides: [
            { tokenAddress: '0x' + 'a'.repeat(40), override: 'trusted' },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.updated).toHaveLength(0);
    });
  });
});
