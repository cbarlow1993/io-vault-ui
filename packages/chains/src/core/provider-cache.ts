// packages/chains/src/core/provider-cache.ts
import type { ChainAlias } from './types.js';
import type { IChainProvider } from './interfaces.js';

/**
 * Simple cache for provider instances.
 * Providers are stateless (config + fetch), so no TTL needed.
 */
export class ProviderCache {
  private cache = new Map<string, IChainProvider>();

  private getKey(chainAlias: ChainAlias, rpcUrl: string): string {
    return `${chainAlias}:${rpcUrl}`;
  }

  get(chainAlias: ChainAlias, rpcUrl: string): IChainProvider | undefined {
    return this.cache.get(this.getKey(chainAlias, rpcUrl));
  }

  set(chainAlias: ChainAlias, rpcUrl: string, provider: IChainProvider): void {
    this.cache.set(this.getKey(chainAlias, rpcUrl), provider);
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
