/**
 * Request-scoped Chain SDK auth context using AsyncLocalStorage
 *
 * The Chain SDK uses a global module-level authContext variable, which causes
 * race conditions in concurrent server environments (Fastify). This module
 * provides request-scoped auth context using Node.js AsyncLocalStorage.
 *
 * Usage:
 * 1. Wrap handler execution with runWithChainAuth(token, async () => { ... })
 * 2. All Chain SDK operations within that callback will use the scoped token
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { Chain, type AuthContext } from '@iofinnet/io-core-dapp-utils-chains-sdk';

interface ChainAuthStore {
  apiBearerToken: string;
  rpcBearerToken: string;
}

// AsyncLocalStorage for request-scoped auth context
const authStorage = new AsyncLocalStorage<ChainAuthStore>();

// Store original SDK methods
const originalSetAuthContext = Chain.setAuthContext.bind(Chain);
const originalGetAuthContext = Chain.getAuthContext.bind(Chain);

// Track if we've patched the SDK
let isPatched = false;

/**
 * Patches the Chain SDK to use AsyncLocalStorage for auth context.
 * Called automatically on first use.
 */
function patchChainSdk(): void {
  if (isPatched) return;

  // Override getAuthContext to check AsyncLocalStorage first
  Chain.getAuthContext = (): AuthContext | undefined => {
    const store = authStorage.getStore();
    if (store) {
      // Get base config from original context, then override with request-scoped tokens
      const baseContext = originalGetAuthContext();
      if (!baseContext) {
        return undefined;
      }
      return {
        ...baseContext,
        apiBearerToken: store.apiBearerToken,
        rpcBearerToken: store.rpcBearerToken,
      };
    }
    // Fall back to global context if not in a request scope
    return originalGetAuthContext();
  };

  // Override requireAuthContext similarly
  const originalRequireAuthContext = Chain.requireAuthContext.bind(Chain);
  Chain.requireAuthContext = (): AuthContext => {
    const store = authStorage.getStore();
    if (store) {
      const baseContext = originalGetAuthContext();
      if (!baseContext) {
        return originalRequireAuthContext(); // This will throw if not configured
      }
      return {
        ...baseContext,
        apiBearerToken: store.apiBearerToken,
        rpcBearerToken: store.rpcBearerToken,
      };
    }
    return originalRequireAuthContext();
  };

  isPatched = true;
}

/**
 * Runs an async function with request-scoped Chain SDK auth context.
 * All Chain SDK operations within the callback will use the provided token.
 *
 * @param token - The bearer token for this request
 * @param fn - The async function to execute with scoped auth
 * @returns The result of the function
 *
 * @example
 * ```typescript
 * const result = await runWithChainAuth(request.auth?.token, async () => {
 *   const { wallet, chain } = await walletFactory.createWallet(vaultId, chainAlias);
 *   return routeNativeTransaction(ecosystem, chainAlias, params, walletFactory);
 * });
 * ```
 */
export async function runWithChainAuth<T>(
  token: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  // Ensure SDK is patched
  patchChainSdk();

  const store: ChainAuthStore = {
    apiBearerToken: token ?? '',
    rpcBearerToken: token ?? '',
  };

  return authStorage.run(store, fn);
}

/**
 * Sets the global Chain SDK auth context (for initialization/fallback).
 * Prefer using runWithChainAuth for request-scoped auth.
 */
export function setGlobalChainAuth(token?: string): void {
  originalSetAuthContext({
    apiBearerToken: token ?? '',
    rpcBearerToken: token ?? '',
  });
}
