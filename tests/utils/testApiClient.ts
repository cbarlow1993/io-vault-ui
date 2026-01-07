import axios, { type AxiosInstance } from 'axios';
import { expect } from 'vitest';
import { TEST_USERS } from '@/tests/integration/utils/testFixtures.js';
import type { DefaultAuthenticatedClients, TestUser, TestUsers } from '@/tests/models.js';
import type {
  BatchCreateHDAddressesParams,
  CreateHDAddressParams,
  CreateHDAddressResponse,
  CreateHexResponse,
  FromHexParams,
  GetBalanceParams,
  GetTransactionsParams,
  GetTransactionsResponse,
  ListChainAddressesParams,
  ListChainAddressesResponse,
  ListVaultAddressesParams,
  ListVaultAddressesResponse,
  NativeBalanceResponse,
  NativeHexParams,
  PageInfo,
  RegisterAddressParams,
  RegisterAddressResponse,
  Signature,
  SignatureResponse,
  TokenBalanceResponse,
  TokenHexParams,
} from '@/tests/utils/apiModels.js';

// Constants
export const API_URL = process.env.API_URL || 'http://localhost:3000';
// AUTH_API_URL is used for getting OAuth tokens - always points to cloud service
export const AUTH_API_URL = process.env.AUTH_API_URL || API_URL;

export class APITestClient {
  public client: AxiosInstance;

  constructor(accessToken: string, baseURL: string = API_URL) {
    this.client = this.createTestApiClient(accessToken, baseURL);
  }

  private createTestApiClient(accessToken: string, baseURL: string) {
    return axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      validateStatus: () => true, // Don't throw on non-200 status codes
    });
  }

  private static async getAccessToken(user: TestUser, _baseURL: string): Promise<string> {
    const cacheKey = `${user.clientId}:${user.clientSecret}`;
    const cached = accessTokenCache.get(cacheKey);

    // Check if we have a valid cached token (with 5-minute buffer)
    if (cached && cached.expires > Date.now() + 5 * 60 * 1000) {
      return cached.token;
    }

    // Always use AUTH_API_URL for token retrieval (cloud auth service)
    const response = await axios.post(`${AUTH_API_URL}/v1/auth/accessToken`, {
      clientId: user.clientId,
      clientSecret: user.clientSecret,
    });

    const token = response.data.accessToken;

    // Cache token for 4 minutes (assuming 5-minute expiry with 1-minute buffer)
    accessTokenCache.set(cacheKey, {
      token,
      expires: Date.now() + 4 * 60 * 1000,
    });

    return token;
  }

  public static async createAuthenticatedApiClient(user: TestUser, baseURL: string = API_URL) {
    const accessToken = await APITestClient.getAccessToken(user, baseURL);
    return new APITestClient(accessToken, baseURL);
  }

  // need these for retro compatibility, but should be removed in the future
  async get(path: string, params?: Record<string, any>, config?: Record<string, any>) {
    return this.client.get(path, { params, ...config });
  }

  async post(path: string, data?: Record<string, any>, config?: Record<string, any>) {
    return this.client.post(path, data, config);
  }

  async put(path: string, data?: Record<string, any>, config?: Record<string, any>) {
    return this.client.put(path, data, config);
  }

  async delete(path: string, config?: Record<string, any>) {
    return this.client.delete(path, config);
  }

  async createTransactionHex(params: TokenHexParams | NativeHexParams): Promise<CreateHexResponse> {
    const path = `/v1/vaults/${
      params.vaultId
    }/transactions/ecosystem/${params.ecosystem.toLowerCase()}/chain/${params.chain.toLowerCase()}/build-${
      params.type
    }-transaction`;
    const { to, derivationPath, amount } = params;
    const transferData: Record<string, string | number | undefined> = {
      to,
      derivationPath,
      amount,
    };
    if (params.type === 'token') {
      transferData.tokenAddress = params.contract;
      transferData.decimals = params.decimals;
    }
    const hexResponse = await this.client.post(path, transferData);
    expect(
      hexResponse.status,
      `Failed to ${params.type} build transaction for ${params.chain} on ${
        params.ecosystem
      }, \npath: ${path}, \ndata: ${JSON.stringify(transferData)}\n response status: ${hexResponse.status} \n response body: ${JSON.stringify(hexResponse.data, null, 2)}`
    ).toBe(201);
    const hexData = hexResponse.data;
    expect(hexData).toHaveProperty('serializedTransaction');
    expect(hexData).toHaveProperty('marshalledHex');
    return hexData as CreateHexResponse;
  }

  async createTransactionFromHex(params: FromHexParams): Promise<string> {
    const transactionPath = `/v1/vaults/${
      params.vaultId
    }/transactions/ecosystem/${params.ecosystem.toLowerCase()}/chain/${params.chain.toLowerCase()}/transaction`;
    const transactionResponse = await this.client.post(transactionPath, params.hexInfo);
    expect(transactionResponse.status).toBe(201);
    const transactionData = transactionResponse.data;
    expect(transactionData).toHaveProperty('id');
    console.log(
      `Transfer for ${params.chain} on ${params.ecosystem} with id ${transactionData.id}.`
    );
    return transactionData.id;
  }

  async createHDAddress(params: CreateHDAddressParams): Promise<CreateHDAddressResponse> {
    const createUrl = `/v1/vaults/${
      params.vaultId
    }/addresses/ecosystem/${params.ecosystem.toLowerCase()}/chain/${params.chain.toLowerCase()}/hd-addresses`;
    console.log('createUrl', createUrl);
    let { derivationPath } = params;
    if (!derivationPath) {
      const nowStr = Date.now().toString();
      const mid = Math.floor(nowStr.length / 2);
      derivationPath = `m/44/0/0/${nowStr.slice(0, mid)}/${nowStr.slice(mid)}`;
    }

    const createResponse = await this.client.post(createUrl, { derivationPath });
    expect(
      createResponse.status,
      `HD address creation failed\n url:${createUrl} body: ${JSON.stringify({ derivationPath }, null, 2)}`
    ).toBe(201);
    const createdAddress = createResponse.data;
    return createdAddress as CreateHDAddressResponse;
  }

  async registerAddress(params: RegisterAddressParams): Promise<RegisterAddressResponse> {
    const registerUrl = `/v1/vaults/${
      params.vaultId
    }/addresses/ecosystem/${params.ecosystem.toLowerCase()}/chain/${params.chain.toLowerCase()}`;
    const requestBody = { address: params.address, derivationPath: params.derivationPath };
    const registerResponse = await this.client.post(registerUrl, requestBody);
    expect(
      registerResponse.status,
      `HD address registration failed\n url:${registerUrl} body: ${JSON.stringify(requestBody, null, 2)}`
    ).toBe(201);
    const registeredAddress = registerResponse.data;
    expect(registeredAddress).toHaveProperty('workspaceId');
    expect(registeredAddress).toHaveProperty('vaultId');
    expect(registeredAddress).toHaveProperty('address');
    expect(registeredAddress).toHaveProperty('chain');
    expect(registeredAddress).toHaveProperty('derivationPath');
    expect(registeredAddress).toHaveProperty('updatedAt');
    expect(registeredAddress).toHaveProperty('subscriptionId');
    expect(registeredAddress).toHaveProperty('tokens');
    expect(registeredAddress.vaultId).toBe(params.vaultId);
    expect(registeredAddress.address).toBe(params.address);
    expect(registeredAddress.chain).toBe(params.chain.toLowerCase());
    expect(registeredAddress.derivationPath).toBe(params.derivationPath);
    return registeredAddress as RegisterAddressResponse;
  }

  async listVaultAddresses(params: ListVaultAddressesParams): Promise<ListVaultAddressesResponse> {
    const vaultAddressesUrl = `/v1/vaults/${params.vaultId}/addresses`;
    const vaultAddressesResponse = await this.client.get(vaultAddressesUrl, {
      params: { after: params.after, first: 100 },
    });
    expect(
      vaultAddressesResponse.status,
      `Failed to list addresses for vault ${params.vaultId}\n url: ${vaultAddressesUrl}`
    ).toBe(200);
    const vaultAddresses = vaultAddressesResponse.data;
    expect(vaultAddresses.data).toBeInstanceOf(Array);
    expect(vaultAddresses).toHaveProperty('pageInfo');
    return vaultAddresses as ListVaultAddressesResponse;
  }

  async listChainAddresses(params: ListChainAddressesParams): Promise<ListChainAddressesResponse> {
    const chainAddressesUrl = `/v1/vaults/${
      params.vaultId
    }/addresses/ecosystem/${params.ecosystem.toLowerCase()}/chain/${params.chain.toLowerCase()}/hd-addresses`;
    const chainAddressesResponse = await this.client.get(chainAddressesUrl, {
      params: { after: params.after, first: 100 },
    });
    expect(
      chainAddressesResponse.status,
      `Failed to list addresses for vault ${
        params.vaultId
      } and chain ${params.chain.toLowerCase()}\n url: ${chainAddressesUrl}`
    ).toBe(200);
    const chainAddresses = chainAddressesResponse.data;
    expect(chainAddresses.data).toBeInstanceOf(Array);
    expect(chainAddresses).toHaveProperty('pageInfo');
    return chainAddresses as ListChainAddressesResponse;
  }

  async batchCreateHDAddresses(
    params: BatchCreateHDAddressesParams
  ): Promise<CreateHDAddressResponse[]> {
    const batchCreateUrl = `/v1/vaults/${
      params.vaultId
    }/addresses/ecosystem/${params.ecosystem.toLowerCase()}/chain/${params.chain.toLowerCase()}/hd-addresses/bulk`;
    const requestBody = { indexFrom: params.indexFrom, indexTo: params.indexTo };

    if (!params.indexFrom || !params.indexTo) {
      requestBody.indexTo = Math.floor(Math.random() * 2104967295);
      requestBody.indexFrom = requestBody.indexTo - 5;
    }

    const batchResponse = await this.client.post(batchCreateUrl, requestBody);
    expect(
      batchResponse.status,
      `HD address batch creation failed\n url:${batchCreateUrl} body: ${JSON.stringify(requestBody, null, 2)}`
    ).toBe(201);
    const createdAddresses = batchResponse.data;
    expect(
      createdAddresses.data,
      `Expected HD Addresses instead got ${createdAddresses}`
    ).toBeInstanceOf(Array);
    return createdAddresses.data as CreateHDAddressResponse[];
  }

  async getTransactions(params: GetTransactionsParams): Promise<GetTransactionsResponse> {
    const transactionsUrl = `/v1/transactions/ecosystem/${params.ecosystem.toLowerCase()}/chain/${params.chain.toLowerCase()}/address/${params.address}`;
    console.log(`Fetching transactions from: ${transactionsUrl}`);
    const queryParams: Record<string, any> = {};

    if (params.after) {
      queryParams.after = params.after;
    }
    if (params.first) {
      queryParams.first = params.first;
    }

    const transactionsResponse = await this.client.get(transactionsUrl, {
      params: queryParams,
    });

    expect(
      transactionsResponse.status,
      `Failed to get transactions for address ${params.address} on ${params.chain}\n url: ${transactionsUrl}, ${JSON.stringify(queryParams, null, 2)}\n response body: ${JSON.stringify(transactionsResponse.data, null, 2)}`
    ).toBe(200);

    const transactions = transactionsResponse.data;
    return transactions as GetTransactionsResponse;
  }

  async getBalance(
    params: GetBalanceParams,
    attempt = 0
  ): Promise<NativeBalanceResponse | TokenBalanceResponse> {
    const MAX_ATTEMPTS = 3;
    const balanceUrl = `/v1/balances/ecosystem/${params.ecosystem.toLowerCase()}/chain/${params.chain.toLowerCase()}/address/${params.address}/${params.type}`;
    const balanceResponse = await this.client.get(balanceUrl);

    if (balanceResponse.status !== 200 && attempt < MAX_ATTEMPTS) {
      console.warn(
        `Retrying getBalance for ${params.chain} on ${params.ecosystem}, attempt ${attempt + 1}`
      );
      await new Promise((resolve) => setTimeout(resolve, 20_000));
      return this.getBalance(params, attempt + 1);
    }

    expect(
      balanceResponse.status,
      `Failed to get ${params.type} balance for address ${params.address} on ${params.chain}\n url: ${balanceUrl}\n response body: ${JSON.stringify(balanceResponse.data, null, 2)}`
    ).toBe(200);

    const balanceData = balanceResponse.data;

    if (params.type === 'native') {
      return balanceData as NativeBalanceResponse;
    } else {
      return balanceData as TokenBalanceResponse;
    }
  }

  // this assumes the transaction is new and will show up on the first page
  async getRegisteredAddress(params: {
    vaultId: string;
    ecosystem: string;
    chain: string;
    address: string;
  }): Promise<RegisterAddressResponse> {
    const addressUrl = `/v1/vaults/${params.vaultId}/addresses/ecosystem/${params.ecosystem.toLowerCase()}/chain/${params.chain.toLowerCase()}/address/${params.address}`;
    console.log(`Fetching address details from: ${addressUrl}`);

    const addressResponse = await this.client.get(addressUrl);

    expect(
      addressResponse.status,
      `Failed to get address details for ${params.address} in vault ${params.vaultId}\n url: ${addressUrl}\n response body: ${JSON.stringify(addressResponse.data, null, 2)}`
    ).toBe(200);

    const addressData = addressResponse.data;
    expect(addressData).toHaveProperty('workspaceId');
    expect(addressData).toHaveProperty('vaultId');
    expect(addressData).toHaveProperty('address');
    expect(addressData).toHaveProperty('chain');
    expect(addressData).toHaveProperty('derivationPath');
    expect(addressData).toHaveProperty('updatedAt');
    expect(addressData).toHaveProperty('subscriptionId');
    expect(addressData).toHaveProperty('tokens');

    return addressData as RegisterAddressResponse;
  }

  async pollForSubscriptionId(
    params: {
      vaultId: string;
      ecosystem: string;
      chain: string;
      address: string;
    },
    timeoutMs = 120_000,
    intervalMs = 5_000
  ): Promise<RegisterAddressResponse | undefined> {
    const startTime = Date.now();
    let lastResponse: RegisterAddressResponse | undefined;

    while (Date.now() - startTime < timeoutMs) {
      lastResponse = await this.getRegisteredAddress(params);

      if (lastResponse.subscriptionId !== null && lastResponse.subscriptionId !== undefined) {
        console.log(`Subscription ID found: ${lastResponse.subscriptionId}`);
        return lastResponse;
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    console.warn(
      `No subscription ID found for address ${params.address} within the specified timeframe, last response: ${JSON.stringify(lastResponse, null, 2)}`
    );
    return undefined;
  }

  async getSignatures(
    vaultId: string,
    params: { attempt: number; after?: string } = { attempt: 0 }
  ): Promise<SignatureResponse> {
    const signaturesUrl = `/v1/vaults/${vaultId}/signatures`;
    const signaturesResponse = await this.client.get(signaturesUrl, {
      params: { after: params.after },
    });
    if (signaturesResponse.status !== 200 && params.attempt < 3) {
      console.warn('Failed to get signatures, attempt number: ', params.attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return this.getSignatures(vaultId, { attempt: params.attempt + 1, after: params.after });
    }
    expect(
      signaturesResponse.status,
      `Failed to get signatures for vault ${vaultId}\n url: ${signaturesUrl}`
    ).toBe(200);
    const signatures = signaturesResponse.data.data;
    expect(signatures).toBeInstanceOf(Array);
    return signaturesResponse.data as SignatureResponse;
  }

  // this assumes the transaction is new and will show up on the first page
  async pollForTransactionFinalState(
    params: {
      vaultId: string;
      operationId: string;
    },
    timeoutMs = 120_000,
    intervalMs = 5_000
  ): Promise<Signature | undefined> {
    const startTime = Date.now();
    let lastResponse: SignatureResponse | undefined;
    let after: string | undefined;
    const MAX_PAGES = 5;
    let currentPage = 1;
    const finalStatuses = ['COMPLETED', 'FAILED'];

    while (Date.now() - startTime < timeoutMs) {
      console.log(`Polling for signature with id ${params.operationId} in vault ${params.vaultId}`);
      lastResponse = await this.getSignatures(params.vaultId, { attempt: 0, after });
      if (lastResponse?.data.length > 0) {
        const signature = lastResponse.data.find((s) => s.id === params.operationId);
        // found the signature on this page
        if (signature) {
          //signature is on a final state
          if (finalStatuses.includes(signature.status)) {
            //signature has tags
            if (signature.tags && signature.tags.length > 0) {
              console.log(
                `Found Signature with id ${params.operationId} with tags:`,
                JSON.stringify(signature.tags, null, 2)
              );
              // tags are either transaction hash (broadcasted) or nonce error
              const importantTag = signature.tags.find(
                (tag) =>
                  tag.name === 'transaction-hash' ||
                  (tag.name === 'error' && tag.value.includes('nonce too low'))
              );
              if (importantTag) {
                return signature;
              }
            }
          }
          // signature was not found on this page
        } else {
          // there's a next page and we haven't reached the max pages
          if (lastResponse.pageInfo.endCursor && currentPage < MAX_PAGES) {
            after = lastResponse.pageInfo.endCursor;
            currentPage++;
            // there's no next page or we've reached max pages
          } else {
            after = undefined;
            currentPage = 1;
          }
        }
        /* if the signature was found but not in final state or with incorrect tags, the page should not change and will be polled
        if the signature was not found on this page, the page should have changed to next or reset to 1
        wait a few seconds and try again */
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    console.warn(
      `No Signature with id ${params.operationId} was found in final state within ${timeoutMs / 1000} seconds, last response: ${JSON.stringify(lastResponse, null, 2)}`
    );
    return undefined;
  }

  async poll<T, E>(
    howToFind: (params: E) => Promise<T>,
    params: E,
    howToCheck: (element: T) => boolean | T,
    timeoutMs = 60_000,
    intervalMs = 5_000
  ): Promise<T | undefined> {
    const startTime = Date.now();
    let lastResponse: T | undefined;
    const how = howToFind.bind(this);
    const check = howToCheck.bind(this);

    while (Date.now() - startTime < timeoutMs) {
      lastResponse = await how(params);
      if (Array.isArray(lastResponse)) {
        const found = lastResponse.find((element) => check(element));
        if (found) {
          return found;
        }
      } else if (check(lastResponse)) {
        return lastResponse;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    console.warn(
      `No element found within the specified timeframe, last response: ${JSON.stringify(lastResponse, null, 2)}`
    );
    return undefined;
  }

  async findInPagination<T, E>(
    howToFind: (params: E) => Promise<{ data: T[]; pageInfo: PageInfo }>,
    params: E,
    whatToFind: Partial<T>
  ): Promise<T | undefined> {
    let found = false;
    let hasNextPage = true;
    let nextCursor: string | undefined;
    while (hasNextPage && !found) {
      const f = howToFind.bind(this);
      const response = await f({ ...params, after: nextCursor });
      expect(response).toHaveProperty('data');
      expect(response.data).toBeInstanceOf(Array);
      const it = response.data.find((item: T) => {
        found = true;
        Object.keys(whatToFind).forEach((k) => {
          const key = k as keyof T;
          if (key !== 'subscriptionId') {
            // ignore subscriptionId for now, its not needed until gas station is implemented
            if (item[key] !== whatToFind[key]) {
              found = false;
            }
          }
        });
        return found;
      });
      if (it) {
        return it;
      }
      if (response.pageInfo.hasNextPage) {
        hasNextPage = response.pageInfo.hasNextPage;
        nextCursor = response.pageInfo.endCursor as string;
      } else {
        return undefined;
      }
    }
    return undefined;
  }
}

/**
 * Setup function to get authenticated clients for multiple users
 */
export const setupTestUsers = async (
  users: TestUsers = { CLIENT_1: TEST_USERS.CLIENT_1, CLIENT_2: TEST_USERS.CLIENT_2 }
): Promise<DefaultAuthenticatedClients> => {
  const clients = await Promise.all(
    Object.entries(users).map(async ([key, user]) => ({
      key,
      client: await APITestClient.createAuthenticatedApiClient(user, API_URL),
    }))
  );

  return clients.reduce(
    (acc, { key, client }) => {
      const user = users[key]!;
      acc[key] = { user, client };
      return acc;
    },
    {} as DefaultAuthenticatedClients
  );
};

// Cache for access tokens
// todo remove
export const accessTokenCache = new Map<string, { token: string; expires: number }>();
