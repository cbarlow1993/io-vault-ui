import axios, { type AxiosInstance, type AxiosResponse } from 'axios';

export interface ClientResponse<T> {
  status: number;
  data: T;
}

export interface PollOptions {
  interval?: number;
  timeout?: number;
}

export class E2EClient {
  private client: AxiosInstance;

  constructor(baseUrl: string, authToken: string) {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: { Authorization: `Bearer ${authToken}` },
      validateStatus: () => true, // Don't throw on non-2xx status codes
    });
  }

  private toResponse<T>(response: AxiosResponse<T>): ClientResponse<T> {
    return { status: response.status, data: response.data };
  }

  async get<T>(path: string, params?: Record<string, unknown>): Promise<ClientResponse<T>> {
    const response = await this.client.get<T>(path, { params });
    return this.toResponse(response);
  }

  async post<T>(path: string, body?: unknown): Promise<ClientResponse<T>> {
    const response = await this.client.post<T>(path, body);
    return this.toResponse(response);
  }

  async patch<T>(path: string, body?: unknown): Promise<ClientResponse<T>> {
    const response = await this.client.patch<T>(path, body);
    return this.toResponse(response);
  }

  async delete<T>(path: string): Promise<ClientResponse<T>> {
    const response = await this.client.delete<T>(path);
    return this.toResponse(response);
  }

  async poll<T>(
    fn: () => Promise<T>,
    predicate: (result: T) => boolean,
    options: PollOptions = {}
  ): Promise<T> {
    const { interval = 2000, timeout = 120000 } = options;
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const result = await fn();
      if (predicate(result)) return result;
      await new Promise((r) => setTimeout(r, interval));
    }

    throw new Error(`Poll timeout after ${timeout}ms`);
  }
}
