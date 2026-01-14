import Chargebee from 'chargebee';

import { envServer } from '@/env/server';

// Lazy initialization - only configure when billing is enabled
let chargebeeInstance: Chargebee | null = null;

export const getChargebee = (): Chargebee => {
  if (!envServer.ENABLE_CHARGEBEE_BILLING) {
    throw new Error('Chargebee billing is not enabled');
  }

  if (!envServer.CHARGEBEE_SITE || !envServer.CHARGEBEE_API_KEY) {
    throw new Error('Chargebee configuration is missing');
  }

  if (!chargebeeInstance) {
    chargebeeInstance = new Chargebee({
      site: envServer.CHARGEBEE_SITE,
      apiKey: envServer.CHARGEBEE_API_KEY,
    });
  }

  return chargebeeInstance;
};

// Helper to check if billing is enabled
export const isBillingEnabled = (): boolean => {
  return envServer.ENABLE_CHARGEBEE_BILLING;
};

// Guard function for billing procedures
export const assertBillingEnabled = (): void => {
  if (!envServer.ENABLE_CHARGEBEE_BILLING) {
    throw new Error('Billing is not enabled');
  }
};
