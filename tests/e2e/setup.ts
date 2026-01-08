import { e2eConfig, validateConfig } from './utils/config';
import { fetchAuthToken } from './utils/auth';

// Use top-level await to ensure token is fetched before any tests run
// This runs at module load time, guaranteeing the token is available
validateConfig();

const token = await fetchAuthToken(
  e2eConfig.clientId!,
  e2eConfig.clientSecret!,
  e2eConfig.authUrl
);

e2eConfig.authToken = token;
