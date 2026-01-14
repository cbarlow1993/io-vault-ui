import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { TEST_USERS } from '@/tests/integration/utils/testFixtures.js';
import type { TestUser, TestUsers } from '@/tests/models.js';

// Normalized response interface that works for both inject and HTTP
export interface TestResponse<T = any> {
  status: number;
  data: T;
  headers: Record<string, string | string[] | undefined>;
  path: string;
  queryString: string;
  requestHeaders: Record<string, string | string[] | undefined>;
}

// Test client entry containing user and client
export interface TestClientEntry {
  user: TestUser;
  client: ITestClient;
}

// Type for the default test clients setup
export interface DefaultTestClients {
  CLIENT_1: TestClientEntry;
  CLIENT_2: TestClientEntry;
  [key: string]: TestClientEntry;
}

// Abstract client interface - tests use this uniformly
export interface ITestClient {
  get(path: string, params?: Record<string, any>): Promise<TestResponse>;
  post(path: string, data?: Record<string, any>): Promise<TestResponse>;
  put(path: string, data?: Record<string, any>): Promise<TestResponse>;
  patch(path: string, data?: Record<string, any>): Promise<TestResponse>;
  delete(path: string): Promise<TestResponse>;
}

// Determine test mode from STAGE env var
export function getTestMode(): 'local' | 'remote' {
  const stage = process.env.STAGE || 'local';
  return stage === 'local' ? 'local' : 'remote';
}

export const API_URL = process.env.API_URL || 'http://localhost:3000';
// AUTH_API_URL is used for getting OAuth tokens - always points to cloud service
export const AUTH_API_URL = process.env.AUTH_API_URL || API_URL;

// ==================== Inject Client (Local Mode) ====================

class InjectTestClient implements ITestClient {
  constructor(
    private app: FastifyInstance,
    private accessToken: string
  ) {}

  private normalizeResponse(response: LightMyRequestResponse, path: string, queryString: string, requestHeaders: Record<string, string>): TestResponse {
    let data: any;
    try {
      data = response.json();
    } catch {
      data = response.body;
    }

    return {
      status: response.statusCode,
      data,
      headers: response.headers as Record<string, string | string[] | undefined>,
      path,
      queryString,
      requestHeaders,
    };
  }

  private getAuthHeaders(includeContentType = true): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
    };
    if (includeContentType) {
      headers['content-type'] = 'application/json';
    }
    return headers;
  }

  async get(path: string, params?: Record<string, any>): Promise<TestResponse> {
    const queryString = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : '';
    const response = await this.app.inject({
      method: 'GET',
      url: path + queryString,
      headers: this.getAuthHeaders(false), // No content-type for GET
    });
    return this.normalizeResponse(response, path, queryString, this.getAuthHeaders(false));
  }

  async post(path: string, data?: Record<string, any>): Promise<TestResponse> {
    const response = await this.app.inject({
      method: 'POST',
      url: path,
      headers: this.getAuthHeaders(),
      payload: data,
    });
    return this.normalizeResponse(response, path, '', this.getAuthHeaders());
  }

  async put(path: string, data?: Record<string, any>): Promise<TestResponse> {
    const response = await this.app.inject({
      method: 'PUT',
      url: path,
      headers: this.getAuthHeaders(),
      payload: data,
    });
    return this.normalizeResponse(response, path, '', this.getAuthHeaders());
  }

  async patch(path: string, data?: Record<string, any>): Promise<TestResponse> {
    const response = await this.app.inject({
      method: 'PATCH',
      url: path,
      headers: this.getAuthHeaders(),
      payload: data,
    });
    return this.normalizeResponse(response, path, '', this.getAuthHeaders());
  }

  async delete(path: string): Promise<TestResponse> {
    const response = await this.app.inject({
      method: 'DELETE',
      url: path,
      headers: this.getAuthHeaders(false), // No content-type for DELETE
    });
    return this.normalizeResponse(response, path, '', this.getAuthHeaders(false));
  }
}

// ==================== HTTP Client (Remote Mode) ====================

class HttpTestClient implements ITestClient {
  private client: AxiosInstance;

  constructor(accessToken: string, baseURL: string = API_URL) {
    this.client = axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      validateStatus: () => true,
    });
  }

  private normalizeResponse(response: AxiosResponse): TestResponse {
    return {
      status: response.status,
      data: response.data,
      headers: response.headers as Record<string, string | string[] | undefined>,
      path: response.request.path,
      queryString: response.request.query,
      requestHeaders: response.request.headers,
    };
  }

  async get(path: string, params?: Record<string, any>): Promise<TestResponse> {
    const response = await this.client.get(path, { params });
    return this.normalizeResponse(response);
  }

  async post(path: string, data?: Record<string, any>): Promise<TestResponse> {
    const response = await this.client.post(path, data);
    return this.normalizeResponse(response);
  }

  async put(path: string, data?: Record<string, any>): Promise<TestResponse> {
    const response = await this.client.put(path, data);
    return this.normalizeResponse(response);
  }

  async patch(path: string, data?: Record<string, any>): Promise<TestResponse> {
    const response = await this.client.patch(path, data);
    return this.normalizeResponse(response);
  }

  async delete(path: string): Promise<TestResponse> {
    const response = await this.client.delete(path);
    return this.normalizeResponse(response);
  }

  static async getAccessToken(user: TestUser, _baseURL: string): Promise<string> {
    const cacheKey = `${user.clientId}:${user.clientSecret}`;
    const cached = accessTokenCache.get(cacheKey);

    if (cached && cached.expires > Date.now() + 5 * 60 * 1000) {
      return cached.token;
    }

    const response = await axios.post(`${AUTH_API_URL}/v1/auth/accessToken`, {
      clientId: user.clientId,
      clientSecret: user.clientSecret,
    });

    const token = response.data.accessToken;
    accessTokenCache.set(cacheKey, {
      token,
      expires: Date.now() + 55 * 60 * 1000,
    });

    return token;
  }
}

// Token cache
const accessTokenCache = new Map<string, { token: string; expires: number }>();

// ==================== App Instance Management ====================

let appInstance: FastifyInstance | null = null;

async function getOrCreateApp(): Promise<FastifyInstance> {
  if (!appInstance) {
    const { buildApp } = await import('@/src/app.js');
    appInstance = buildApp({ logger: false });
    await appInstance.ready();
  }
  return appInstance;
}

export async function closeApp(): Promise<void> {
  if (appInstance) {
    await appInstance.close();
    appInstance = null;
  }
}

// ==================== Main Setup Function ====================

/**
 * Setup test clients for multiple users.
 * Automatically uses inject (local) or HTTP (remote) based on STAGE.
 * Tests use client.get(), client.post() etc. identically in both modes.
 * Both modes now use proper OAuth token authentication.
 */
export async function setupTestClients(
  users: TestUsers = { CLIENT_1: TEST_USERS.CLIENT_1, CLIENT_2: TEST_USERS.CLIENT_2 }
): Promise<DefaultTestClients> {
  const mode = getTestMode();

  if (mode === 'local') {
    const app = await getOrCreateApp();
    // In local inject mode, use mock token (jose is mocked in vitest.setup.ts)
    // The mock jwtVerify will accept any token and return test user payload
    const entries = await Promise.all(Object.entries(users).map(async ([key, user]) => {
      const token = await HttpTestClient.getAccessToken(user, API_URL);
      return [key, { user, client: new InjectTestClient(app, token) }] as const;
    }));
    return Object.fromEntries(entries) as unknown as DefaultTestClients;
  }

  // Remote mode - get real OAuth tokens from auth service
  const entries = await Promise.all(
    Object.entries(users).map(async ([key, user]) => {
      const token = await HttpTestClient.getAccessToken(user, API_URL);
      return [key, { user, client: new HttpTestClient(token, API_URL) }] as const;
    })
  );

  return Object.fromEntries(entries) as unknown as DefaultTestClients;
}

// Re-export for convenience
export { TEST_USERS } from '@/tests/integration/utils/testFixtures.js';
