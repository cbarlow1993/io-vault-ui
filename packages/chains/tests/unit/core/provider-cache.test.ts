// packages/chains/tests/unit/core/provider-cache.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProviderCache } from '../../../src/core/provider-cache.js';
import type { IChainProvider } from '../../../src/core/interfaces.js';

describe('ProviderCache', () => {
  let cache: ProviderCache;

  beforeEach(() => {
    cache = new ProviderCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createMockProvider = (chainAlias: string): IChainProvider => ({
    chainAlias,
    config: { chainAlias, rpcUrl: '', nativeCurrency: { symbol: 'ETH', decimals: 18 } },
  } as IChainProvider);

  it('caches provider by chainAlias:rpcUrl key', () => {
    const provider = createMockProvider('ethereum');
    cache.set('ethereum', 'https://rpc.example.com', provider);

    const cached = cache.get('ethereum', 'https://rpc.example.com');
    expect(cached).toBe(provider);
  });

  it('returns undefined for uncached provider', () => {
    const cached = cache.get('ethereum', 'https://rpc.example.com');
    expect(cached).toBeUndefined();
  });

  it('returns undefined for expired cache entry', () => {
    const provider = createMockProvider('ethereum');
    cache.set('ethereum', 'https://rpc.example.com', provider);

    // Advance time past cache TTL (5 minutes)
    vi.advanceTimersByTime(6 * 60 * 1000);

    const cached = cache.get('ethereum', 'https://rpc.example.com');
    expect(cached).toBeUndefined();
  });

  it('clear() removes all entries', () => {
    cache.set('ethereum', 'https://rpc1.com', createMockProvider('ethereum'));
    cache.set('polygon', 'https://rpc2.com', createMockProvider('polygon'));

    cache.clear();

    expect(cache.get('ethereum', 'https://rpc1.com')).toBeUndefined();
    expect(cache.get('polygon', 'https://rpc2.com')).toBeUndefined();
  });

  it('clearChain() removes entries for specific chain only', () => {
    cache.set('ethereum', 'https://rpc1.com', createMockProvider('ethereum'));
    cache.set('ethereum', 'https://rpc2.com', createMockProvider('ethereum'));
    cache.set('polygon', 'https://rpc3.com', createMockProvider('polygon'));

    cache.clearChain('ethereum');

    expect(cache.get('ethereum', 'https://rpc1.com')).toBeUndefined();
    expect(cache.get('ethereum', 'https://rpc2.com')).toBeUndefined();
    expect(cache.get('polygon', 'https://rpc3.com')).toBeDefined();
  });
});
