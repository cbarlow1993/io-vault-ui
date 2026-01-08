export const e2eConfig = {
  get baseUrl(): string {
    if (process.env.E2E_BASE_URL) return process.env.E2E_BASE_URL;
    const stage = process.env.STAGE || 'local';
    if (stage === 'local') return 'http://localhost:3000';
    throw new Error('E2E_BASE_URL required for non-local stages');
  },

  get authUrl(): string {
    if (process.env.E2E_AUTH_URL) return process.env.E2E_AUTH_URL;
    const stage = process.env.STAGE || 'local';
    if (stage === 'local' || stage === 'dev') {
      return 'https://api.dev.iodevnet.com/v1/auth/accessToken';
    }
    throw new Error('E2E_AUTH_URL required for non-local/dev stages');
  },

  clientId: process.env.E2E_CLIENT_ID,
  clientSecret: process.env.E2E_CLIENT_SECRET,
  vaultId: process.env.E2E_VAULT_ID || 'vliyx8o5wlofpgysbssevey7',
  address: process.env.E2E_ADDRESS || '0x506EcE54C363CcB0356638cFe3E3f3F1386fba2C',
  chainAlias: process.env.E2E_CHAIN_ALIAS || 'polygon',
  ecosystem: 'evm' as const,
  authToken: '',
};

export function validateConfig(): void {
  if (!e2eConfig.clientId) {
    throw new Error('E2E_CLIENT_ID environment variable is required');
  }
  if (!e2eConfig.clientSecret) {
    throw new Error('E2E_CLIENT_SECRET environment variable is required');
  }
}
