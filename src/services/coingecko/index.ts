import type { Chain, ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { getCoinGeckoClient } from './client.js';
import {
  mapChainAliasToCoinGeckoAssetPlatform,
  mapChainAliasToCoinGeckoNativeCoinId,
} from '@/src/config/chain-mappings/index.js';
import { logger } from '@/utils/powertools.js';
import {
  NotFoundError,
  RateLimitError,
  AuthenticationError,
  APIConnectionError,
  APIConnectionTimeoutError,
} from '@coingecko/coingecko-typescript';

/**
 * Handle CoinGecko SDK errors with proper discrimination and logging.
 * Uses appropriate log levels based on error severity and recoverability.
 *
 * @param error - The error caught from the SDK
 * @param context - Additional context for logging (chain, address, coinIds, etc.)
 * @returns Always returns null to indicate failure
 */
export function handleCoinGeckoError(
  error: unknown,
  context: Record<string, unknown>
): null {
  if (error instanceof NotFoundError) {
    logger.debug('Token not found in CoinGecko', context);
    return null;
  }

  if (error instanceof RateLimitError) {
    // Rate limits are temporary - use warn, not error
    logger.warn('CoinGecko rate limit exceeded', {
      ...context,
      error: error instanceof Error ? error.message : error,
    });
    return null;
  }

  if (error instanceof AuthenticationError) {
    logger.error('CoinGecko authentication failed - check API key', {
      ...context,
      error: error instanceof Error ? error.message : error,
    });
    return null;
  }

  if (error instanceof APIConnectionTimeoutError) {
    logger.warn('CoinGecko request timed out', {
      ...context,
      error: error instanceof Error ? error.message : error,
    });
    return null;
  }

  if (error instanceof APIConnectionError) {
    logger.warn('CoinGecko connection error', {
      ...context,
      error: error instanceof Error ? error.message : error,
    });
    return null;
  }

  logger.warn('Unexpected CoinGecko API error', {
    ...context,
    error: error instanceof Error ? error.message : error,
    errorType: error?.constructor?.name ?? typeof error,
  });
  return null;
}

/** SDK coin data type - inferred from SDK response */
type CoinData = Awaited<ReturnType<ReturnType<typeof getCoinGeckoClient>['coins']['getID']>>;

export type { CoinData };

/**
 * Fetch token metadata by contract address.
 *
 * @param chain - The blockchain chain object
 * @param address - The token contract address
 * @returns Token metadata or null if not found/error
 */
export async function fetchTokenMetadata(
  chain: Chain,
  address: string
): Promise<CoinData | null> {
  if (!address || typeof address !== 'string' || address.trim().length === 0) {
    logger.warn('Invalid address provided to fetchTokenMetadata', { chain: chain.Alias, address });
    return null;
  }

  const client = getCoinGeckoClient();
  const platform = mapChainAliasToCoinGeckoAssetPlatform(chain.Alias);

  if (!platform) {
    logger.warn('Chain not supported by CoinGecko', { chain: chain.Alias });
    return null;
  }

  try {
    // CoinGecko API requires lowercase addresses for contract lookups
    return await client.coins.contract.get(address.toLowerCase(), { id: platform });
  } catch (error) {
    return handleCoinGeckoError(error, { chain: chain.Alias, address });
  }
}

/**
 * Fetch native token metadata by chain
 */
export async function fetchNativeTokenMetadata(chain: Chain): Promise<CoinData | null> {
  const client = getCoinGeckoClient();
  const coinId = mapChainAliasToCoinGeckoNativeCoinId(chain.Alias);

  if (!coinId) {
    logger.warn('Chain native token not mapped in CoinGecko', { chain: chain.Alias });
    return null;
  }

  try {
    return await client.coins.getID(coinId);
  } catch (error) {
    return handleCoinGeckoError(error, { chain: chain.Alias, coinId });
  }
}

/**
 * Fetch native token metadata by chain alias directly
 * This version doesn't require a Chain object, making it compatible with the new chains package.
 *
 * @param chainAlias - The chain alias (e.g., 'ethereum', 'polygon')
 * @returns Token metadata or null if not found/error
 */
export async function fetchNativeTokenMetadataByAlias(chainAlias: ChainAlias): Promise<CoinData | null> {
  const client = getCoinGeckoClient();
  const coinId = mapChainAliasToCoinGeckoNativeCoinId(chainAlias);

  if (!coinId) {
    logger.warn('Chain native token not mapped in CoinGecko', { chainAlias });
    return null;
  }

  try {
    return await client.coins.getID(coinId);
  } catch (error) {
    return handleCoinGeckoError(error, { chainAlias, coinId });
  }
}

/**
 * Get USD price for a token by contract address.
 *
 * @param chain - The chain alias
 * @param address - The token contract address
 * @returns USD price or null if not found/error
 */
export async function getTokenUsdPrice(
  chain: ChainAlias,
  address: string
): Promise<number | null> {
  if (!address || typeof address !== 'string' || address.trim().length === 0) {
    logger.warn('Invalid address provided to getTokenUsdPrice', { chain, address });
    return null;
  }

  const client = getCoinGeckoClient();
  const platform = mapChainAliasToCoinGeckoAssetPlatform(chain);

  if (!platform) {
    logger.warn('Chain not supported by CoinGecko for price lookup', { chain });
    return null;
  }

  try {
    // CoinGecko API requires lowercase addresses for contract lookups
    const data = await client.coins.contract.get(address.toLowerCase(), { id: platform });
    return data.market_data?.current_price?.usd ?? null;
  } catch (error) {
    handleCoinGeckoError(error, { chain, address });
    return null;
  }
}

/**
 * Get USD price for native token by chain
 */
export async function getNativeTokenUsdPrice(chain: Chain): Promise<number | null> {
  const metadata = await fetchNativeTokenMetadata(chain);
  return metadata?.market_data?.current_price?.usd ?? null;
}
