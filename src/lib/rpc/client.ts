import { RpcClient, RpcClientConfig, RpcError } from '@/src/lib/rpc/types.js';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: unknown[];
}

interface JsonRpcResponse<T> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

const DEFAULT_TIMEOUT_MS = 5000;

export class JsonRpcClient implements RpcClient {
  private readonly config: RpcClientConfig;
  private requestId = 0;

  constructor(config: RpcClientConfig) {
    this.config = config;
  }

  getChain(): string {
    return this.config.chain;
  }

  getNetwork(): string {
    return this.config.network;
  }

  async call<T>(method: string, params: unknown[]): Promise<T> {
    const timeoutMs = this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: ++this.requestId,
      method,
      params,
    };

    try {
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new RpcError(
          `HTTP error: ${response.status} ${response.statusText}`,
          this.config.chain,
          this.config.network,
          method
        );
      }

      const json = (await response.json()) as JsonRpcResponse<T>;

      if (json.error) {
        throw new RpcError(
          json.error.message,
          this.config.chain,
          this.config.network,
          method,
          json.error.code
        );
      }

      return json.result as T;
    } catch (error) {
      if (error instanceof RpcError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new RpcError(
            `Request timeout after ${timeoutMs}ms`,
            this.config.chain,
            this.config.network,
            method
          );
        }

        throw new RpcError(
          error.message,
          this.config.chain,
          this.config.network,
          method
        );
      }

      throw new RpcError(
        'Unknown error',
        this.config.chain,
        this.config.network,
        method
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
