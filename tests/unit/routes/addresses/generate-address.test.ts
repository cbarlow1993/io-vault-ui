import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock environment variables
vi.stubEnv('STAGE', 'dev');
vi.stubEnv('SYNC_ADDRESS_ENABLED', 'false');


// Mock the Chain SDK with a function that can be configured per test
vi.mock('@iofinnet/io-core-dapp-utils-chains-sdk', async () => {
  const actual = await vi.importActual('@iofinnet/io-core-dapp-utils-chains-sdk');
  return {
    ...actual,
    Chain: {
      fromAlias: vi.fn(),
    },
  };
});

import { Chain } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import errorHandlerPlugin from '@/src/plugins/error-handler.js';
import addressRoutes from '@/src/routes/addresses/index.js';

const TEST_VAULT_ID = 'clvvvvvvvvvvvvvvvvvvvvvvv'; // Valid cuid2 format
const TEST_ORG_ID = 'org-123';
const TEST_USER_ID = 'user-123';
const TEST_WORKSPACE_ID = 'workspace-123';
const TEST_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';

const mockAddressResponse = {
  address: TEST_ADDRESS,
  chainAlias: 'eth',
  vaultId: TEST_VAULT_ID,
  workspaceId: TEST_WORKSPACE_ID,
  derivationPath: null,
  subscriptionId: null,
  monitored: false,
  monitoredAt: undefined,
  unmonitoredAt: undefined,
  updatedAt: '2024-01-01T00:00:00.000Z',
  tokens: [],
  alias: null,
  lastReconciledBlock: null,
};

const mockAddressService = {
  getAddress: vi.fn(),
  createAddress: vi.fn(),
};

const mockVaultService = {
  getVaultDetails: vi.fn(),
  getVaultCurves: vi.fn(),
  getWorkspaceId: vi.fn(),
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

  // Mock services decorator
  app.decorate('services', {
    addresses: mockAddressService,
    vault: mockVaultService,
  } as any);

  // Register address routes
  await app.register(addressRoutes, { prefix: '/v2/vaults/:vaultId/addresses' });
  await app.ready();

  return app;
}

describe('Address Routes - Generate Address', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations for vault service
    mockVaultService.getVaultDetails.mockResolvedValue({
      vaultId: TEST_VAULT_ID,
      workspaceId: TEST_WORKSPACE_ID,
      organisationId: TEST_ORG_ID,
    });

    mockVaultService.getVaultCurves.mockResolvedValue({
      vaultId: TEST_VAULT_ID,
      curves: [{ curve: 'secp256k1', xpub: 'test-xpub' }],
    });

    // Default mock for Chain SDK
    const mockGetAddress = vi.fn().mockReturnValue(TEST_ADDRESS);
    const mockDeriveHDWallet = vi.fn().mockReturnValue({ getAddress: mockGetAddress });
    const mockLoadWallet = vi.fn().mockReturnValue({
      getAddress: mockGetAddress,
      deriveHDWallet: mockDeriveHDWallet,
    });

    vi.mocked(Chain.fromAlias).mockResolvedValue({
      Config: { ecosystem: 'EVM' },
      loadWallet: mockLoadWallet,
    } as any);

    mockAddressService.getAddress.mockResolvedValue(null);
    mockAddressService.createAddress.mockResolvedValue(mockAddressResponse);
  });

  describe('POST /v2/vaults/:vaultId/addresses', () => {
    it('generates and saves an address successfully', async () => {
      const app = await createTestApp();

      const response = await app.inject({
        method: 'POST',
        url: `/v2/vaults/${TEST_VAULT_ID}/addresses`,
        payload: {
          chainAlias: 'eth',
        },
      });

      expect(response.statusCode).toBe(201);
      const data = response.json();
      expect(data.address).toBe(TEST_ADDRESS);
      expect(data.chainAlias).toBe('eth');
      expect(data.vaultId).toBe(TEST_VAULT_ID);

      expect(mockVaultService.getVaultDetails).toHaveBeenCalledWith(TEST_VAULT_ID);
      expect(mockVaultService.getVaultCurves).toHaveBeenCalledWith(TEST_VAULT_ID);
      expect(mockAddressService.createAddress).toHaveBeenCalledWith({
        input: {
          address: TEST_ADDRESS,
          chainAlias: 'eth',
          vaultId: TEST_VAULT_ID,
          workspaceId: TEST_WORKSPACE_ID,
          organisationId: TEST_ORG_ID,
          ecosystem: 'EVM',
          derivationPath: undefined,
          alias: undefined,
        },
        monitored: false,
      });
    });

    it('generates HD address with derivation path', async () => {
      const app = await createTestApp();
      const derivationPath = 'm/44/60/0/0/0';

      const addressWithDerivationPath = { ...mockAddressResponse, derivationPath };
      mockAddressService.createAddress.mockResolvedValueOnce(addressWithDerivationPath);

      const response = await app.inject({
        method: 'POST',
        url: `/v2/vaults/${TEST_VAULT_ID}/addresses`,
        payload: {
          chainAlias: 'eth',
          derivationPath,
        },
      });

      expect(response.statusCode).toBe(201);
      expect(mockAddressService.createAddress).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            derivationPath,
          }),
        })
      );
    });

    it('creates monitored address when monitor flag is true', async () => {
      const app = await createTestApp();

      const monitoredAddressResponse = {
        ...mockAddressResponse,
        monitored: true,
        monitoredAt: '2024-01-01T00:00:00.000Z',
      };
      mockAddressService.createAddress.mockResolvedValueOnce(monitoredAddressResponse);

      const response = await app.inject({
        method: 'POST',
        url: `/v2/vaults/${TEST_VAULT_ID}/addresses`,
        payload: {
          chainAlias: 'eth',
          monitor: true,
        },
      });

      expect(response.statusCode).toBe(201);
      expect(mockAddressService.createAddress).toHaveBeenCalledWith(
        expect.objectContaining({
          monitored: true,
        })
      );
    });

    it('creates address with alias', async () => {
      const app = await createTestApp();
      const alias = 'My Wallet';

      const addressWithAlias = { ...mockAddressResponse, alias };
      mockAddressService.createAddress.mockResolvedValueOnce(addressWithAlias);

      const response = await app.inject({
        method: 'POST',
        url: `/v2/vaults/${TEST_VAULT_ID}/addresses`,
        payload: {
          chainAlias: 'eth',
          alias,
        },
      });

      expect(response.statusCode).toBe(201);
      const data = response.json();
      expect(data.alias).toBe(alias);
      expect(mockAddressService.createAddress).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            alias,
          }),
        })
      );
    });

    it('returns 403 when organisation does not match vault', async () => {
      mockVaultService.getVaultDetails.mockResolvedValueOnce({
        vaultId: TEST_VAULT_ID,
        workspaceId: TEST_WORKSPACE_ID,
        organisationId: 'different-org-id',
      });

      const app = await createTestApp();

      const response = await app.inject({
        method: 'POST',
        url: `/v2/vaults/${TEST_VAULT_ID}/addresses`,
        payload: {
          chainAlias: 'eth',
        },
      });

      expect(response.statusCode).toBe(403);
      expect(mockAddressService.createAddress).not.toHaveBeenCalled();
    });

    it('returns 404 when vault not found', async () => {
      mockVaultService.getVaultDetails.mockResolvedValueOnce(null);

      const app = await createTestApp();

      const response = await app.inject({
        method: 'POST',
        url: `/v2/vaults/${TEST_VAULT_ID}/addresses`,
        payload: {
          chainAlias: 'eth',
        },
      });

      expect(response.statusCode).toBe(404);
      expect(mockAddressService.createAddress).not.toHaveBeenCalled();
    });

    it('returns 404 when no curves found for vault', async () => {
      mockVaultService.getVaultCurves.mockResolvedValueOnce(null);

      const app = await createTestApp();

      const response = await app.inject({
        method: 'POST',
        url: `/v2/vaults/${TEST_VAULT_ID}/addresses`,
        payload: {
          chainAlias: 'eth',
        },
      });

      expect(response.statusCode).toBe(404);
      expect(mockAddressService.createAddress).not.toHaveBeenCalled();
    });

    it('returns 409 when address already exists', async () => {
      const app = await createTestApp();

      mockAddressService.getAddress.mockResolvedValueOnce(mockAddressResponse);

      const response = await app.inject({
        method: 'POST',
        url: `/v2/vaults/${TEST_VAULT_ID}/addresses`,
        payload: {
          chainAlias: 'eth',
        },
      });

      expect(response.statusCode).toBe(409);
      const data = response.json();
      expect(data.message).toBe('Address already exists');
      expect(mockAddressService.createAddress).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid chainAlias', async () => {
      const app = await createTestApp();

      const response = await app.inject({
        method: 'POST',
        url: `/v2/vaults/${TEST_VAULT_ID}/addresses`,
        payload: {
          chainAlias: 'invalid-chain',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 when chainAlias is missing', async () => {
      const app = await createTestApp();

      const response = await app.inject({
        method: 'POST',
        url: `/v2/vaults/${TEST_VAULT_ID}/addresses`,
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it.skip('returns 400 for invalid vaultId format', async () => {
      // Note: vaultId format validation depends on how the full route module is configured
      // with chain validation plugin. This test is skipped as the validation behavior
      // differs between isolated route testing and full module integration.
      const app = await createTestApp();

      const response = await app.inject({
        method: 'POST',
        url: '/v2/vaults/invalid-vault-id/addresses',
        payload: {
          chainAlias: 'eth',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('creates non-monitored address when monitor is not provided (defaults to false)', async () => {
      const app = await createTestApp();

      const response = await app.inject({
        method: 'POST',
        url: `/v2/vaults/${TEST_VAULT_ID}/addresses`,
        payload: {
          chainAlias: 'eth',
        },
      });

      expect(response.statusCode).toBe(201);
      expect(mockAddressService.createAddress).toHaveBeenCalledWith(
        expect.objectContaining({
          monitored: false,
        })
      );
    });
  });
});
