// packages/chains/src/core/utils.ts

import type { RpcAuth } from './types.js';

/**
 * Build HTTP headers from RpcAuth configuration
 * Supports various authentication methods used by different RPC providers
 */
export function buildAuthHeaders(auth?: RpcAuth): Record<string, string> {
  const headers: Record<string, string> = {};

  if (!auth) {
    return headers;
  }

  // API key in custom header
  if (auth.apiKey) {
    const headerName = auth.apiKeyHeader ?? 'X-API-KEY';
    headers[headerName] = auth.apiKey;
  }

  // Bearer token
  if (auth.bearerToken) {
    headers['Authorization'] = `Bearer ${auth.bearerToken}`;
  }

  // Basic auth
  if (auth.basicAuth) {
    const credentials = Buffer.from(
      `${auth.basicAuth.username}:${auth.basicAuth.password}`
    ).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
  }

  // Custom headers (merged last to allow overrides)
  if (auth.headers) {
    Object.assign(headers, auth.headers);
  }

  return headers;
}

/**
 * Merge default headers with auth headers
 */
export function mergeHeaders(
  defaultHeaders: Record<string, string>,
  auth?: RpcAuth
): Record<string, string> {
  return {
    ...defaultHeaders,
    ...buildAuthHeaders(auth),
  };
}
