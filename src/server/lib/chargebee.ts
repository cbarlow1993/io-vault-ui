import { ChargeBee } from 'chargebee-typescript';

import { envServer } from '@/env/server';

// Lazy initialization - only configure when billing is enabled
let chargebeeInstance: ChargeBee | null = null;

export const getChargebee = (): ChargeBee => {
  if (!envServer.ENABLE_CHARGEBEE_BILLING) {
    throw new Error('Chargebee billing is not enabled');
  }

  if (!envServer.CHARGEBEE_SITE || !envServer.CHARGEBEE_API_KEY) {
    throw new Error('Chargebee configuration is missing');
  }

  if (!chargebeeInstance) {
    chargebeeInstance = new ChargeBee();
    chargebeeInstance.configure({
      site: envServer.CHARGEBEE_SITE,
      api_key: envServer.CHARGEBEE_API_KEY,
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
