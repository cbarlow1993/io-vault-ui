import { expect } from 'vitest';
import type { TestUser } from '@/tests/models.js';
import { accessTokenCache } from '@/tests/utils/testApiClient.js';

// User/Client configurations

export const TEST_USERS = {
  CLIENT_1: {
    clientId: process.env.CLIENT_ID_1 || 'test-client-1',
    clientSecret: process.env.CLIENT_SECRET_1 || 'test-secret-1',
    organisationId: process.env.CLIENT_ID_1_ORGANISATION_ID || 'test-org-123',
    vaultId: process.env.CLIENT_ID_1_VAULT_ID || 'test-vault-123',
    addresses: {
      evm:
        process.env.CLIENT_ID_1_VAULT_EVM_ADDRESS || '0xA84C9DAe57d6287E0FbDbF7a602A959a7230B712',
      btc:
        process.env.CLIENT_ID_1_VAULT_BTC_ADDRESS || 'bc1qryhgpmfv03qjhhp2dj8nw8g4ewg08jzmgy3cyx',
      solana:
        process.env.CLIENT_ID_1_VAULT_SOLANA_ADDRESS ||
        '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      tvm: process.env.CLIENT_ID_1_VAULT_TVM_ADDRESS || 'TQAhydsqzd2u6pNYVBHgLEswMxuAEsqbmq',
      xrp: process.env.CLIENT_ID_1_VAULT_XRP_ADDRESS || 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    },
  } as TestUser,
  CLIENT_2: {
    clientId: process.env.CLIENT_ID_2 || 'test-client-2',
    clientSecret: process.env.CLIENT_SECRET_2 || 'test-secret-2',
    organisationId: process.env.CLIENT_ID_2_ORGANISATION_ID || 'test-org-456',
    vaultId: process.env.CLIENT_ID_2_VAULT_ID || 'test-vault-456',
    addresses: {
      evm:
        process.env.CLIENT_ID_2_VAULT_EVM_ADDRESS || '0x742d35Cc6aC5d62e4db6eE4c14B12c36E96B6f6d',
      btc:
        process.env.CLIENT_ID_2_VAULT_BTC_ADDRESS || 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      solana:
        process.env.CLIENT_ID_2_VAULT_SOLANA_ADDRESS ||
        '5Jd2q8Z7mQeK3JqK9x8vE4gK1L2n9WaS6cT8rU9V3xY7',
      xrp: process.env.CLIENT_ID_2_VAULT_XRP_ADDRESS || 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
    },
  } as TestUser,
} as const;

// Test addresses for different ecosystems
export const TEST_ADDRESSES = {
  evm: {
    valid: '0xA84C9DAe57d6287E0FbDbF7a602A959a7230B712',
    invalid: 'invalid-evm-address',
    // For transactions testing
    transactions: '0x9B1054d24dC31a54739B6d8950af5a7dbAa56815',
  },
  btc: {
    valid: 'bc1qryhgpmfv03qjhhp2dj8nw8g4ewg08jzmgy3cyx',
    invalid: 'invalid-btc-address',
  },
  cardano: {
    valid:
      'addr1qxp9pemjwnxqxp5lvx4hwzjvz2ycs6eluk5y92q5ev8wqkum4lq3ufe0kgnv3sjddn8dj509gmwpwew8che88evdl7kswrrdlv',
    invalid: 'invalid-cardano-address',
  },
  avalanche_x_chain: {
    valid: '0x1eda8f2DcC0c5Ad287CF411d9Eb37152FA37F6a8',
    invalid: 'invalid-avalanche-c-chain-address',
  },
  avalanche_p_chain: {
    valid: '0x1eda8f2DcC0c5Ad287CF411d9Eb37152FA37F6a8',
    invalid: 'invalid-avalanche-p-chain-address',
  },
  xrp: {
    valid: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    invalid: 'invalid-xrp-address',
  },
  solana: {
    valid: 'Bm7GukF5NNYKqhy476E3SyG7NUU2EaC32Kf8A2eKXpaP',
    invalid: 'invalid-solana-address',
    // For transactions testing
    transactions: '3pjWyeFUPa9Sppf15BAJYim4K2kVZThbLbYzThhLUBbG',
  },
  tron: {
    valid: 'TQAhydsqzd2u6pNYVBHgLEswMxuAEsqbmq',
    invalid: 'invalid-tvm-address',
  },
  cosmos: {
    valid: 'cosmos1sjllsnramtg3ewxqwwrwjxfgc4n4ef9u0tvx7u',
    invalid: 'invalid-cosmos-address',
  },
  mnee: {
    valid: '1G6CB3Ch4zFkPmuhZzEyChQmrQPfi86qk3',
    invalid: 'invalid-mnee-address',
  },
} as const;

/**
 * Helper to build vault endpoints
 */
export const buildVaultEndpoint = (
  user: TestUser,
  path: string,
  ecosystem?: string,
  chain?: string
): string => {
  let endpoint = `/v1/vaults/${user.vaultId}${path}`;

  if (ecosystem) {
    endpoint = endpoint.replace('{ecosystem}', ecosystem);
  }
  if (chain) {
    endpoint = endpoint.replace('{chain}', chain);
  }

  return endpoint;
};

/**
 * Common test payloads for different operations
 */
export const TEST_PAYLOADS = {
  buildTransaction: {
    mnee: {
      amount: '0.001',
      to: TEST_ADDRESSES.btc.valid,
      memo: 'Test transaction',
    },
    xrp: {
      amount: '1',
      to: TEST_ADDRESSES.xrp.valid,
      tag: '12345',
      memo: 'Test transaction',
    },
    ethereum: {
      amount: '0.01',
      to: TEST_ADDRESSES.evm.valid,
      memo: 'Test transaction',
    },
  },
  createAddress: {
    evm: (user: TestUser) => ({
      address: user.addresses.evm,
    }),
    btc: (user: TestUser) => ({
      address: user.addresses.btc,
    }),
    solana: (user: TestUser) => ({
      address: user.addresses.solana,
    }),
    tvm: (user: TestUser) => ({
      address: user.addresses.tvm,
    }),
    xrp: (user: TestUser) => ({
      address: user.addresses.xrp,
    }),
  },
} as const;

/**
 * Common endpoint patterns used across tests
 */
export const ENDPOINT_PATTERNS = [
  {
    endpoint: '/v1/vaults/{vaultId}/addresses/{ecosystem}/{chain}/hd-addresses',
    method: 'POST',
  },
  {
    endpoint: '/v1/vaults/{vaultId}/addresses/{ecosystem}/{chain}/hd-addresses/bulk',
    method: 'POST',
  },
  {
    endpoint: '/v1/vaults/{vaultId}/addresses/ecosystem/{ecosystem}/chain/{chain}/hd-addresses',
    method: 'GET',
  },
  {
    endpoint: '/v1/vaults/{vaultId}/addresses/ecosystem/{ecosystem}/chain/{chain}',
    method: 'POST',
  },
  {
    endpoint: '/v1/vaults/{vaultId}/addresses',
    method: 'GET',
  },
  {
    endpoint: '/v1/vaults/{vaultId}/addresses/ecosystem/{ecosystem}/chain/{chain}',
    method: 'GET',
  },
  {
    endpoint: '/v1/vaults/{vaultId}/balances/ecosystem/{ecosystem}/chain/{chain}/{address}',
    method: 'GET',
  },
] as const;

/**
 * Test helper to validate standard API responses
 */
export const expectValidApiResponse = (response: any, expectedStatus = 200) => {
  if (response.status !== expectedStatus) {
    console.log(response.data);
  }
  expect(response.status).toBe(expectedStatus);

  if (expectedStatus >= 200 && expectedStatus < 300) {
    expect(response.data).toBeDefined();
  }
};

/**
 * Test helper to validate transaction build responses
 */
export const expectValidTransactionResponse = (response: any) => {
  expectValidApiResponse(response, 201);
  expect(response.data).toHaveProperty('serializedTransaction');
  expect(response.data).toHaveProperty('marshalledHex');
  expect(typeof response.data.serializedTransaction).toBe('string');
  expect(typeof response.data.marshalledHex).toBe('string');
};

/**
 * Test helper to validate error responses
 */
export const expectErrorResponse = (
  response: any,
  expectedStatus: number,
  expectedMessage?: string
) => {
  expect(response.status).toBe(expectedStatus);

  if (expectedMessage) {
    expect(response.data).toHaveProperty('message', expectedMessage);
  }
};

/**
 * Test helper for permission tests - tests that user2 cannot access user1's resources
 */
export const testCrossUserPermissions = async (
  endpoints: typeof ENDPOINT_PATTERNS,
  authorizedUser: TestUser,
  unauthorizedUser: TestUser,
  ecosystem = 'evm',
  chain = 'polygon'
) => {
  const unauthorizedClient = await createAuthenticatedApiClient(unauthorizedUser);

  return Promise.all(
    endpoints.map(async ({ endpoint, method }) => {
      const url = endpoint
        .replace('{vaultId}', authorizedUser.vaultId)
        .replace('{ecosystem}', ecosystem)
        .replace('{chain}', chain);

      const response = await (unauthorizedClient as any)[method.toLowerCase()](url, undefined, {
        validateStatus: () => true,
      });

      expectErrorResponse(response, 404);
      return { endpoint, method, status: response.status };
    })
  );
};

/**
 * Clear access token cache (useful for cleanup in tests)
 */
export const clearAccessTokenCache = () => {
  accessTokenCache.clear();
};

/**
 * Create an authenticated API client for cross-user permission testing
 */
const createAuthenticatedApiClient = async (user: TestUser) => {
  const { APITestClient, API_URL } = await import('@/tests/utils/testApiClient.js');
  return APITestClient.createAuthenticatedApiClient(user, API_URL);
};
