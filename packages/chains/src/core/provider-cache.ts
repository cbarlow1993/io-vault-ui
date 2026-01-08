// packages/chains/src/core/provider-cache.ts
import type { ChainAlias } from './types.js';
import type { IChainProvider } from './interfaces.js';

interface CachedEntry {
  provider: IChainProvider;
  createdAt: number;
}

export class ProviderCache {
  private cache = new Map<string, CachedEntry>();
  private readonly maxAge: number;

  constructor(maxAgeMs: number = 5 * 60 * 1000) {
    this.maxAge = maxAgeMs;
  }

  private getKey(chainAlias: ChainAlias, rpcUrl: string): string {
    return `${chainAlias}:${rpcUrl}`;
  }

  get(chainAlias: ChainAlias, rpcUrl: string): IChainProvider | undefined {
    const key = this.getKey(chainAlias, rpcUrl);
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    if (Date.now() - entry.createdAt >= this.maxAge) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.provider;
  }

  set(chainAlias: ChainAlias, rpcUrl: string, provider: IChainProvider): void {
    const key = this.getKey(chainAlias, rpcUrl);
    this.cache.set(key, {
      provider,
      createdAt: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }

  clearChain(chainAlias: ChainAlias): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${chainAlias}:`)) {
        this.cache.delete(key);
      }
    }
  }
}

export const providerCache = new ProviderCache();
