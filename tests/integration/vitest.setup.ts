import { Chain } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { afterAll, vi } from 'vitest';
import { closeApp, getTestMode } from '@/tests/utils/dualModeTestClient.js';

// Mock jose library for local inject mode - provides JWT verification without real JWKS
if (getTestMode() === 'local') {
  vi.mock('jose', () => ({
    createRemoteJWKSet: vi.fn(() => 'mock-jwks'),
    jwtVerify: vi.fn().mockResolvedValue({
      payload: {
        sub: 'test-user-id',
        organisationId: 'test-org-id',
        scope: 'chains-public',
        username: 'testuser',
        client_id: 'test-client',
      },
      protectedHeader: { alg: 'RS256' },
    }),
  }));
}

Chain.setAuthContext({
  apiBearerToken: 'api-bearer-token',
  rpcBearerToken: 'rpc-bearer-token',
  iofinnetApiEndpoint: 'https://api.iofinnet.com',
  iofinnetRpcApiEndpoint: 'https://rpc.iofinnet.com',
});

// Cleanup app instance after all tests complete (for local inject mode)
afterAll(async () => {
  if (getTestMode() === 'local') {
    await closeApp();
  }
});
