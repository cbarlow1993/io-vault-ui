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
      it.todo('should create a vault with secp256k1 curve', async () => {
        // const vaultId = randomUUID();
        // const workspaceId = randomUUID();
        // const payload = {
        //   id: vaultId,
        //   workspaceId,
        //   curves: [
        //     { curveType: 'secp256k1', xpub: 'xpub6D4BDPcP2GT577Vvch3R8wDkScZWzQzMMUm3PWbmWvVJrZwQY4VNm9R9X9VjyvqGphSpzmh8oQEGHE65QSAPM7HZZv7HRgWKNwmMSuJqPqg' },
        //   ],
        // };
        // const response = await clients.CLIENT_1.client.post('/v2/vaults', payload);
        // expectStatus(response, 201);
        // expect(response.data.id).toBe(vaultId);
        // expect(response.data.workspaceId).toBe(workspaceId);
        // expect(response.data.organisationId).toBeDefined();
        // expect(response.data.createdAt).toBeDefined();
        // expect(response.data.curves).toHaveLength(1);
        // expect(response.data.curves[0].curveType).toBe('secp256k1');
      });

      it.todo('should create a vault with ed25519 curve', async () => {
        // const vaultId = randomUUID();
        // const workspaceId = randomUUID();
        // const payload = {
        //   id: vaultId,
        //   workspaceId,
        //   curves: [
        //     { curveType: 'ed25519', xpub: 'edpubXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' },
        //   ],
        // };
        // const response = await clients.CLIENT_1.client.post('/v2/vaults', payload);
        // expectStatus(response, 201);
        // expect(response.data.curves[0].curveType).toBe('ed25519');
      });

      it.todo('should create a vault with multiple curves (secp256k1 and ed25519)', async () => {
        // const vaultId = randomUUID();
        // const workspaceId = randomUUID();
        // const payload = {
        //   id: vaultId,
        //   workspaceId,
        //   curves: [
        //     { curveType: 'secp256k1', xpub: 'xpub6D4BDPcP2GT577...' },
        //     { curveType: 'ed25519', xpub: 'edpubXXXXXXXXXXXXXX...' },
        //   ],
        // };
        // const response = await clients.CLIENT_1.client.post('/v2/vaults', payload);
        // expectStatus(response, 201);
        // expect(response.data.curves).toHaveLength(2);
      });

      it.todo('should return correct response structure with all fields', async () => {
        // Verify response includes:
        // - id (matches request)
        // - workspaceId (matches request)
        // - organisationId (from auth token)
        // - createdAt (ISO datetime string)
        // - curves[] with id, curveType, xpub, createdAt for each
      });

      it.todo('should associate vault with organisation from auth token', async () => {
        // Create vault and verify organisationId matches the authenticated user's org
      });
    });

    describe('Conflict cases (409)', () => {
      it.todo('should return 409 when vault ID already exists', async () => {
        // const vaultId = randomUUID();
        // const workspaceId = randomUUID();
        // const payload = {
        //   id: vaultId,
        //   workspaceId,
        //   curves: [{ curveType: 'secp256k1', xpub: 'xpub...' }],
        // };
        // // Create first time - should succeed
        // await clients.CLIENT_1.client.post('/v2/vaults', payload);
        // // Try to create again - should fail
        // const response = await clients.CLIENT_1.client.post('/v2/vaults', payload);
        // expectStatus(response, 409);
      });

      it.todo('should return 409 when vault exists even with different curves', async () => {
        // Create vault with secp256k1, then try to create same vault ID with ed25519
        // Should return 409 because vault ID already exists
      });
    });

    describe('Validation cases (400)', () => {
      it.todo('should return 400 for invalid UUID in id field', async () => {
        // const payload = {
        //   id: 'not-a-uuid',
        //   workspaceId: randomUUID(),
        //   curves: [{ curveType: 'secp256k1', xpub: 'xpub...' }],
        // };
        // const response = await clients.CLIENT_1.client.post('/v2/vaults', payload);
        // expectStatus(response, 400);
      });

      it.todo('should return 400 for invalid UUID in workspaceId field', async () => {
        // const payload = {
        //   id: randomUUID(),
        //   workspaceId: 'not-a-uuid',
        //   curves: [{ curveType: 'secp256k1', xpub: 'xpub...' }],
        // };
        // const response = await clients.CLIENT_1.client.post('/v2/vaults', payload);
        // expectStatus(response, 400);
      });

      it.todo('should return 400 for empty curves array', async () => {
        // const payload = {
        //   id: randomUUID(),
        //   workspaceId: randomUUID(),
        //   curves: [],
        // };
        // const response = await clients.CLIENT_1.client.post('/v2/vaults', payload);
        // expectStatus(response, 400);
      });

      it.todo('should return 400 for duplicate curve types in request', async () => {
        // const payload = {
        //   id: randomUUID(),
        //   workspaceId: randomUUID(),
        //   curves: [
        //     { curveType: 'secp256k1', xpub: 'xpub1...' },
        //     { curveType: 'secp256k1', xpub: 'xpub2...' },
        //   ],
        // };
        // const response = await clients.CLIENT_1.client.post('/v2/vaults', payload);
        // expectStatus(response, 400);
      });

      it.todo('should return 400 for invalid curve type', async () => {
        // const payload = {
        //   id: randomUUID(),
        //   workspaceId: randomUUID(),
        //   curves: [{ curveType: 'invalid-curve', xpub: 'xpub...' }],
        // };
        // const response = await clients.CLIENT_1.client.post('/v2/vaults', payload);
        // expectStatus(response, 400);
      });

      it.todo('should return 400 for empty xpub', async () => {
        // const payload = {
        //   id: randomUUID(),
        //   workspaceId: randomUUID(),
        //   curves: [{ curveType: 'secp256k1', xpub: '' }],
        // };
        // const response = await clients.CLIENT_1.client.post('/v2/vaults', payload);
        // expectStatus(response, 400);
      });

      it.todo('should return 400 for missing id field', async () => {
        // const payload = {
        //   workspaceId: randomUUID(),
        //   curves: [{ curveType: 'secp256k1', xpub: 'xpub...' }],
        // };
        // const response = await clients.CLIENT_1.client.post('/v2/vaults', payload);
        // expectStatus(response, 400);
      });

      it.todo('should return 400 for missing workspaceId field', async () => {
        // const payload = {
        //   id: randomUUID(),
        //   curves: [{ curveType: 'secp256k1', xpub: 'xpub...' }],
        // };
        // const response = await clients.CLIENT_1.client.post('/v2/vaults', payload);
        // expectStatus(response, 400);
      });

      it.todo('should return 400 for missing curves field', async () => {
        // const payload = {
        //   id: randomUUID(),
        //   workspaceId: randomUUID(),
        // };
        // const response = await clients.CLIENT_1.client.post('/v2/vaults', payload);
        // expectStatus(response, 400);
      });
    });

    describe('Authentication cases (401)', () => {
      it.todo('should return 401 when no auth token provided', async () => {
        // Make request without auth header
        // expectStatus(response, 401);
      });

      it.todo('should return 401 when auth token is invalid', async () => {
        // Make request with invalid/expired auth token
        // expectStatus(response, 401);
      });
    });

    describe('Database constraint cases', () => {
      it.todo('should enforce unique constraint on (vaultId, curve) in VaultCurve table', async () => {
        // This is a database-level constraint test
        // Attempt to insert duplicate (vaultId, curve) combination directly
        // Should be prevented by the unique constraint added in migration
      });
    });

    describe('Transactional behavior', () => {
      it.todo('should rollback vault creation if curve insertion fails', async () => {
        // Test that if curve insertion fails, the vault is also rolled back
        // This ensures atomic transaction behavior
      });
    });
  });
});
