import Coingecko from '@coingecko/coingecko-typescript';
import { config } from '@/src/lib/config.js';

let clientInstance: Coingecko | null = null;

export function getCoinGeckoClient(): Coingecko {
  if (!clientInstance) {
    const apiKey = config.apis.coinGecko.apiKey;

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
