import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import errorHandlerPlugin from '@/src/plugins/error-handler.js';
import addressRoutes from '@/src/routes/addresses/index.js';

// Mock environment variables
vi.stubEnv('STAGE', 'dev');
vi.stubEnv('SYNC_ADDRESS_ENABLED', 'false');

// Mock the Address validation
vi.mock('@/src/services/addresses/address.js', () => ({
  Address: {
    validateAgainstVault: vi.fn().mockResolvedValue(undefined),
  },
}));

import { Address } from '@/src/services/addresses/address.js';

const TEST_VAULT_ID = 'clvvvvvvvvvvvvvvvvvvvvvvv'; // Valid cuid2 format
const TEST_ORG_ID = 'org-123';
const TEST_USER_ID = 'user-123';
const TEST_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';

// Mock address for list responses (no tokens)
const mockAddressListItem = {
  address: TEST_ADDRESS,
  chainAlias: 'eth',
  vaultId: TEST_VAULT_ID,
  workspaceId: 'workspace-123',
  derivationPath: null,
  subscriptionId: null,
  monitored: true,
  monitoredAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  alias: null,
  lastReconciledBlock: 0,
};

// Mock address for single address responses (includes tokens)
const mockAddress = {
  ...mockAddressListItem,
  tokens: [],
};

async function createTestApp() {
  const app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Register error handler to properly convert errors to status codes
  await app.register(errorHandlerPlugin);

  // Mock auth decorator
  app.decorateRequest('auth', null);
  app.addHook('onRequest', async (request) => {
    request.auth = { organisationId: TEST_ORG_ID, userId: TEST_USER_ID, token: 'test-token' };
  });

  // Mock services decorator (used by handlers via request.server.services)
  app.decorate('services', {
    addresses: {
      getAllForVault: vi.fn().mockResolvedValue({ items: [], hasMore: false }),
      getAllForVaultAndChain: vi.fn().mockResolvedValue({ items: [], hasMore: false }),
      getAddress: vi.fn(),
      createAddress: vi.fn(),
      monitorAddress: vi.fn(),
      unmonitorAddress: vi.fn(),
      updateAlias: vi.fn(),
      updateAssetVisibility: vi.fn(),
    },
    vault: {
      getVaultDetails: vi.fn().mockResolvedValue({
        vaultId: TEST_VAULT_ID,
        workspaceId: 'workspace-123',
        organisationId: TEST_ORG_ID,
      }),
      getWorkspaceId: vi.fn().mockResolvedValue('workspace-123'),
      getVaultCurves: vi.fn().mockResolvedValue({
        vaultId: TEST_VAULT_ID,
        curves: [],
      }),
    },
  } as any);

  // Register address routes with vaultId as a path parameter in the prefix
  await app.register(addressRoutes, { prefix: '/v2/vaults/:vaultId/addresses' });
  await app.ready();

  return app;
}

describe('Address Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /v2/vaults/:vaultId/addresses', () => {
    it('returns paginated list of addresses for vault', async () => {
      const app = await createTestApp();

      // Mock the PostgreSQL service response (list items don't include tokens)
      (app.services as any).addresses.getAllForVault.mockResolvedValueOnce({
        items: [mockAddressListItem],
        total: 1,
        hasMore: false,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/v2/vaults/${TEST_VAULT_ID}/addresses`,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('supports pagination parameters', async () => {
      const app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: `/v2/vaults/${TEST_VAULT_ID}/addresses?first=10`,
      });

      expect(response.statusCode).toBe(200);
    });

    it('supports monitored filter', async () => {
      const app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: `/v2/vaults/${TEST_VAULT_ID}/addresses?monitored=true`,
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('GET /v2/vaults/:vaultId/addresses/ecosystem/:ecosystem/chain/:chain', () => {
    it('returns addresses filtered by chain', async () => {
      const app = await createTestApp();

      // Mock the PostgreSQL service response (list items don't include tokens)
      (app.services as any).addresses.getAllForVaultAndChain.mockResolvedValueOnce({
        items: [mockAddressListItem],
        total: 1,
        hasMore: false,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/v2/vaults/${TEST_VAULT_ID}/addresses/ecosystem/evm/chain/eth`,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
    });

    it('validates ecosystem and chain parameters', async () => {
      const app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: `/v2/vaults/${TEST_VAULT_ID}/addresses/ecosystem/invalid/chain/invalid`,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /v2/vaults/:vaultId/addresses/ecosystem/:ecosystem/chain/:chain', () => {
    it('creates a new address', async () => {
      const app = await createTestApp();

      vi.mocked(Address.validateAgainstVault).mockResolvedValueOnce(undefined);
      // Mock services.addresses.getAddress to return null (address doesn't exist)
      (app.services as any).addresses.getAddress.mockResolvedValueOnce(null);
      // Mock services.addresses.createAddress to return the new address
      (app.services as any).addresses.createAddress.mockResolvedValueOnce(mockAddress);

      const response = await app.inject({
        method: 'POST',
        url: `/v2/vaults/${TEST_VAULT_ID}/addresses/ecosystem/evm/chain/eth`,
        payload: {
          address: TEST_ADDRESS,
          monitor: false,
        },
      });

      expect(response.statusCode).toBe(201);
      const data = response.json();
      expect(data.address).toBe(TEST_ADDRESS);
    });

    it('returns 409 if address already exists', async () => {
      const app = await createTestApp();

      vi.mocked(Address.validateAgainstVault).mockResolvedValueOnce(undefined);
      // Mock services.addresses.getAddress to return the existing address
      (app.services as any).addresses.getAddress.mockResolvedValueOnce(mockAddress);

      const response = await app.inject({
        method: 'POST',
        url: `/v2/vaults/${TEST_VAULT_ID}/addresses/ecosystem/evm/chain/eth`,
        payload: {
          address: TEST_ADDRESS,
          monitor: true,
        },
      });

      expect(response.statusCode).toBe(409);
    });

    it('validates required fields', async () => {
      const app = await createTestApp();

      const response = await app.inject({
        method: 'POST',
        url: `/v2/vaults/${TEST_VAULT_ID}/addresses/ecosystem/evm/chain/eth`,
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /v2/vaults/:vaultId/addresses/ecosystem/:ecosystem/chain/:chain/address/:address', () => {
    it('returns address details', async () => {
      const app = await createTestApp();

      // Mock services.addresses.getAddress to return the address
      (app.services as any).addresses.getAddress.mockResolvedValueOnce(mockAddress);

      const response = await app.inject({
        method: 'GET',
        url: `/v2/vaults/${TEST_VAULT_ID}/addresses/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}`,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.address).toBe(TEST_ADDRESS);
    });

    it('returns 404 when address not found', async () => {
      const app = await createTestApp();

      // Mock services.addresses.getAddress to return null
      (app.services as any).addresses.getAddress.mockResolvedValueOnce(null);

      const response = await app.inject({
        method: 'GET',
        url: `/v2/vaults/${TEST_VAULT_ID}/addresses/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}`,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /v2/vaults/:vaultId/addresses/ecosystem/:ecosystem/chain/:chain/address/:address', () => {
    it('updates address alias', async () => {
      const app = await createTestApp();

      const updatedAddress = { ...mockAddress, alias: 'My Wallet' };
      // Mock services.addresses.updateAlias to return the updated address
      (app.services as any).addresses.updateAlias.mockResolvedValueOnce(updatedAddress);

      const response = await app.inject({
        method: 'PATCH',
        url: `/v2/vaults/${TEST_VAULT_ID}/addresses/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}`,
        payload: {
          alias: 'My Wallet',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.alias).toBe('My Wallet');
    });

    it('updates hidden assets', async () => {
      const app = await createTestApp();

      // Mock services.addresses.updateAssetVisibility to return the address
      (app.services as any).addresses.updateAssetVisibility.mockResolvedValueOnce(mockAddress);

      const response = await app.inject({
        method: 'PATCH',
        url: `/v2/vaults/${TEST_VAULT_ID}/addresses/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}`,
        payload: {
          addToHiddenAssets: ['0xtoken1'],
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('POST /v2/vaults/:vaultId/addresses/ecosystem/:ecosystem/chain/:chain/address/:address/monitoring', () => {
    it('starts monitoring an unmonitored address', async () => {
      const app = await createTestApp();

      const unmonitoredAddress = {
        ...mockAddress,
        monitored: false,
        vaultId: TEST_VAULT_ID,
        organisationId: TEST_ORG_ID,
      };

      // Mock services.addresses.getAddress to return an unmonitored address
      (app.services as any).addresses.getAddress.mockResolvedValueOnce(unmonitoredAddress);
      (app.services as any).addresses.monitorAddress.mockResolvedValueOnce({
        ...mockAddress,
        monitored: true,
      });

      const response = await app.inject({
        method: 'POST',
        url: `/v2/vaults/${TEST_VAULT_ID}/addresses/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/monitoring`,
      });

      expect(response.statusCode).toBe(200);
    });

    it('returns existing monitored address idempotently', async () => {
      const app = await createTestApp();

      const monitoredAddress = {
        ...mockAddress,
        monitored: true,
        vaultId: TEST_VAULT_ID,
        organisationId: TEST_ORG_ID,
      };

      // Mock services.addresses.getAddress to return a monitored address
      (app.services as any).addresses.getAddress.mockResolvedValueOnce(monitoredAddress);

      const response = await app.inject({
        method: 'POST',
        url: `/v2/vaults/${TEST_VAULT_ID}/addresses/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/monitoring`,
      });

      expect(response.statusCode).toBe(200);
    });

    it('returns 404 when address does not exist', async () => {
      const app = await createTestApp();

      // Mock services.addresses.getAddress to return null
      (app.services as any).addresses.getAddress.mockResolvedValueOnce(null);

      const response = await app.inject({
        method: 'POST',
        url: `/v2/vaults/${TEST_VAULT_ID}/addresses/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/monitoring`,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /v2/vaults/:vaultId/addresses/ecosystem/:ecosystem/chain/:chain/address/:address/monitoring', () => {
    it('stops monitoring an address', async () => {
      const app = await createTestApp();

      const monitoredAddress = {
        ...mockAddress,
        monitored: true,
        vaultId: TEST_VAULT_ID,
        organisationId: TEST_ORG_ID,
      };

      // Mock services.addresses.getAddress to return a monitored address
      (app.services as any).addresses.getAddress.mockResolvedValueOnce(monitoredAddress);
      (app.services as any).addresses.unmonitorAddress.mockResolvedValueOnce(undefined);

      const response = await app.inject({
        method: 'DELETE',
        url: `/v2/vaults/${TEST_VAULT_ID}/addresses/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/monitoring`,
      });

      expect(response.statusCode).toBe(204);
    });

    it('returns 204 idempotently when address does not exist', async () => {
      const app = await createTestApp();

      // Mock services.addresses.getAddress to return null (address doesn't exist)
      (app.services as any).addresses.getAddress.mockResolvedValueOnce(null);

      const response = await app.inject({
        method: 'DELETE',
        url: `/v2/vaults/${TEST_VAULT_ID}/addresses/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/monitoring`,
      });

      expect(response.statusCode).toBe(204);
    });

    it('returns 204 idempotently when address is already unmonitored', async () => {
      const app = await createTestApp();

      const unmonitoredAddress = {
        ...mockAddress,
        monitored: false,
        vaultId: TEST_VAULT_ID,
        organisationId: TEST_ORG_ID,
      };

      // Mock services.addresses.getAddress to return an unmonitored address
      (app.services as any).addresses.getAddress.mockResolvedValueOnce(unmonitoredAddress);

      const response = await app.inject({
        method: 'DELETE',
        url: `/v2/vaults/${TEST_VAULT_ID}/addresses/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/monitoring`,
      });

      expect(response.statusCode).toBe(204);
    });

    it('returns 403 when vault belongs to different organisation', async () => {
      const app = await createTestApp();

      // Mock vault to belong to a different organisation via the services decorator
      (app.services as any).vault.getVaultDetails.mockResolvedValueOnce({
        vaultId: TEST_VAULT_ID,
        workspaceId: 'workspace-123',
        organisationId: 'other-org-id', // Different from TEST_ORG_ID
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/v2/vaults/${TEST_VAULT_ID}/addresses/ecosystem/evm/chain/eth/address/${TEST_ADDRESS}/monitoring`,
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
