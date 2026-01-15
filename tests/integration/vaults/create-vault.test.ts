import { randomUUID } from 'crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type DefaultTestClients, setupTestClients } from '@/tests/utils/dualModeTestClient.js';
import { expectStatus } from '@/tests/utils/expectStatus.js';

describe('Create Vault Integration Tests', () => {
  let clients: DefaultTestClients;

  beforeAll(async () => {
    clients = await setupTestClients();
  });

  describe('POST /v2/vaults', () => {
    describe('Success cases', () => {
      it('should create a vault with secp256k1 curve', async () => {
        const vaultId = `test-vault-${Date.now()}`;
        const workspaceId = 'test-workspace-123';
        const payload = {
          id: vaultId,
          workspaceId,
          curves: [
            {
              algorithm: 'ECDSA',
              curve: 'secp256k1',
              publicKey: '04abc123def456',
              xpub: 'xpub6D4BDPcP2GT577Vvch3R8wDkScZWzQzMMUm3PWbmWvVJrZwQY4VNm9R9X9VjyvqGphSpzmh8oQEGHE65QSAPM7HZZv7HRgWKNwmMSuJqPqg',
            },
          ],
        };
        const response = await clients.CLIENT_1.client.post('/v2/vaults', payload);
        expectStatus(response, 201);
        expect(response.data.id).toBe(vaultId);
        expect(response.data.workspaceId).toBe(workspaceId);
        expect(response.data.organisationId).toBeDefined();
        expect(response.data.createdAt).toBeDefined();
        expect(response.data.curves).toHaveLength(1);
        expect(response.data.curves[0].curve).toBe('secp256k1');
        expect(response.data.curves[0].algorithm).toBe('ECDSA');
        expect(response.data.curves[0].publicKey).toBe('04abc123def456');
      });

      it('should create a vault with ed25519 curve (no xpub)', async () => {
        const vaultId = `test-vault-${Date.now()}-ed`;
        const workspaceId = 'test-workspace-456';
        const payload = {
          id: vaultId,
          workspaceId,
          curves: [
            {
              algorithm: 'EDDSA',
              curve: 'ed25519',
              publicKey: 'def789abc123',
            },
          ],
        };
        const response = await clients.CLIENT_1.client.post('/v2/vaults', payload);
        expectStatus(response, 201);
        expect(response.data.curves[0].curve).toBe('ed25519');
        expect(response.data.curves[0].algorithm).toBe('EDDSA');
        expect(response.data.curves[0].xpub).toBeNull();
      });

      it('should create a vault with multiple curves (secp256k1 and ed25519)', async () => {
        const vaultId = `test-vault-${Date.now()}-multi`;
        const workspaceId = 'test-workspace-789';
        const payload = {
          id: vaultId,
          workspaceId,
          curves: [
            {
              algorithm: 'ECDSA',
              curve: 'secp256k1',
              publicKey: '04abc123',
              xpub: 'xpub6D4BDPcP2GT577Vvch3R8wDkScZWzQzMMUm3PWbmWvVJrZwQY4VNm9R9X9VjyvqGphSpzmh8oQEGHE65QSAPM7HZZv7HRgWKNwmMSuJqPqg',
            },
            {
              algorithm: 'EDDSA',
              curve: 'ed25519',
              publicKey: 'def456',
            },
          ],
        };
        const response = await clients.CLIENT_1.client.post('/v2/vaults', payload);
        expectStatus(response, 201);
        expect(response.data.curves).toHaveLength(2);
      });
    });

    describe('Conflict cases (409)', () => {
      it('should return 409 when vault ID already exists', async () => {
        const vaultId = `test-vault-${Date.now()}-dup`;
        const workspaceId = 'test-workspace-dup';
        const payload = {
          id: vaultId,
          workspaceId,
          curves: [
            {
              algorithm: 'ECDSA',
              curve: 'secp256k1',
              publicKey: '04abc123',
              xpub: 'xpub...',
            },
          ],
        };
        // Create first time - should succeed
        const firstResponse = await clients.CLIENT_1.client.post('/v2/vaults', payload);
        expectStatus(firstResponse, 201);

        // Try to create again - should fail
        const response = await clients.CLIENT_1.client.post('/v2/vaults', payload);
        expectStatus(response, 409);
      });
    });

    describe('Validation cases (400)', () => {
      it('should return 400 for empty curves array', async () => {
        const payload = {
          id: `test-vault-${Date.now()}-empty`,
          workspaceId: 'test-workspace',
          curves: [],
        };
        const response = await clients.CLIENT_1.client.post('/v2/vaults', payload);
        expectStatus(response, 400);
      });

      it('should return 400 for duplicate curve types in request', async () => {
        const payload = {
          id: `test-vault-${Date.now()}-dup-curves`,
          workspaceId: 'test-workspace',
          curves: [
            { algorithm: 'ECDSA', curve: 'secp256k1', publicKey: 'pk1', xpub: 'xpub1...' },
            { algorithm: 'ECDSA', curve: 'secp256k1', publicKey: 'pk2', xpub: 'xpub2...' },
          ],
        };
        const response = await clients.CLIENT_1.client.post('/v2/vaults', payload);
        expectStatus(response, 400);
      });

      it('should return 400 for invalid curve type', async () => {
        const payload = {
          id: `test-vault-${Date.now()}-invalid`,
          workspaceId: 'test-workspace',
          curves: [{ algorithm: 'ECDSA', curve: 'invalid-curve', publicKey: 'pk' }],
        };
        const response = await clients.CLIENT_1.client.post('/v2/vaults', payload);
        expectStatus(response, 400);
      });
    });
  });
});
