import { beforeAll, describe, it } from 'vitest';
import {
  ENDPOINT_PATTERNS,
  testCrossUserPermissions,
} from '@/tests/integration/utils/testFixtures.js';
import { setupTestClients, type DefaultTestClients } from '@/tests/utils/dualModeTestClient.js';

// TODO: Re-enable this test when we have permit enabled

describe.skip('Permissions Integration Tests ', () => {
  let clients: DefaultTestClients;

  beforeAll(async () => {
    clients = await setupTestClients();
  });

  describe('Cross-User Permission Tests', () => {
    it("should deny CLIENT_2 access to CLIENT_1's vault resources", async () => {
      // Test that CLIENT_2 cannot access CLIENT_1's vault resources
      await testCrossUserPermissions(
        ENDPOINT_PATTERNS,
        clients.CLIENT_1.user, // authorized user (vault owner)
        clients.CLIENT_2.user, // unauthorized user
        'evm',
        'polygon'
      );
    });

    it("should deny CLIENT_1 access to CLIENT_2's vault resources", async () => {
      // Test that CLIENT_1 cannot access CLIENT_2's vault resources
      await testCrossUserPermissions(
        ENDPOINT_PATTERNS,
        clients.CLIENT_2.user, // authorized user (vault owner)
        clients.CLIENT_1.user, // unauthorized user
        'evm',
        'polygon'
      );
    });
  });
});
