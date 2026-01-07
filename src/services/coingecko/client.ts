import Coingecko from '@coingecko/coingecko-typescript';
import { config } from '@/src/lib/config.js';
import { logger } from '@/utils/powertools.js';

let clientInstance: Coingecko | null = null;
let hasLoggedDemoWarning = false;

export function getCoinGeckoClient(): Coingecko {
  if (!clientInstance) {
    const apiKey = config.apis.coinGecko.apiKey;

    if (!apiKey && !hasLoggedDemoWarning) {
      logger.warn('CoinGecko API key not configured - using demo mode with rate limits');
      hasLoggedDemoWarning = true;
    }

    clientInstance = new Coingecko({
      proAPIKey: apiKey,
      timeout: config.apis.coinGecko.requestTimeout,
    });
  }
  return clientInstance;
}

/** Reset client instance - only for testing */
export function resetCoinGeckoClient(): void {
  clientInstance = null;
}
