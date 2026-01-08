import axios, { type AxiosResponse } from 'axios';

interface ClientResponse<T> {
  status: number;
  data: T;
}

interface PollOptions {
  interval?: number;
  timeout?: number;
}

export class E2EClient {
  constructor(
    private baseUrl: string,
    private authToken: string
  ) {}

  private get headers() {
    return { Authorization: `Bearer ${this.authToken}` };
  }

  private toResponse<T>(response: AxiosResponse<T>): ClientResponse<T> {
    return { status: response.status, data: response.data };
  }

  async get<T>(path: string, params?: Record<string, unknown>): Promise<ClientResponse<T>> {
    const response = await axios.get<T>(`${this.baseUrl}${path}`, {
      headers: this.headers,
      params,
    });
    return this.toResponse(response);
  }

  async post<T>(path: string, body?: unknown): Promise<ClientResponse<T>> {
    const response = await axios.post<T>(`${this.baseUrl}${path}`, body, {
      headers: this.headers,
    });
    return this.toResponse(response);
  }

  async patch<T>(path: string, body?: unknown): Promise<ClientResponse<T>> {
    const response = await axios.patch<T>(`${this.baseUrl}${path}`, body, {
      headers: this.headers,
    });
    return this.toResponse(response);
  }

  async delete<T>(path: string): Promise<ClientResponse<T>> {
    const response = await axios.delete<T>(`${this.baseUrl}${path}`, {
      headers: this.headers,
    });
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
