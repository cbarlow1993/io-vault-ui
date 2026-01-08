import { beforeAll } from 'vitest';
import { e2eConfig, validateConfig } from './utils/config';
import { fetchAuthToken } from './utils/auth';

beforeAll(async () => {
  validateConfig();

  const token = await fetchAuthToken(
    e2eConfig.clientId!,
    e2eConfig.clientSecret!,
    e2eConfig.authUrl
  );

  e2eConfig.authToken = token;
});
