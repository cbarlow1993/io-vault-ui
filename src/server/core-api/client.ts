import createClient from 'openapi-fetch';

import type { paths } from '@/lib/api/core-api';

import { envServer } from '@/env/server';

/**
 * Singleton openapi-fetch client for the Core API.
 * Auth token is passed per-call via headers in repositories.
 */
export const coreApiClient = createClient<paths>({
  baseUrl: envServer.CORE_API_URL,
});

export type CoreApiClient = typeof coreApiClient;
