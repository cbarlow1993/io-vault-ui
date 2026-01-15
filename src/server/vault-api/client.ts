import createClient from 'openapi-fetch';

import type { paths } from '@/lib/api/vault-api';

import { envServer } from '@/env/server';

/**
 * Singleton openapi-fetch client for the Vault API.
 * Auth token is passed per-call via headers in repositories.
 */
export const vaultApiClient = createClient<paths>({
  baseUrl: envServer.VAULT_API_URL,
});

export type VaultApiClient = typeof vaultApiClient;
