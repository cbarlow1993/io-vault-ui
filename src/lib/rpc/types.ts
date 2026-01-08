export interface RpcClient {
  call<T>(method: string, params: unknown[]): Promise<T>;
  getChain(): string;
  getNetwork(): string;
}

export interface RpcClientConfig {
  chain: string;
  network: string;
  url: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export class RpcError extends Error {
  constructor(
    message: string,
    public readonly chain: string,
    public readonly network: string,
    public readonly method: string,
    public readonly code?: number
  ) {
    super(message);
    this.name = 'RpcError';
  }
}
