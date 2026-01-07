import type { Chain, ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { getCoinGeckoClient } from './client.js';
import {
  mapChainAliasToCoinGeckoAssetPlatform,
  mapChainAliasToCoinGeckoNativeCoinId,
} from '@/src/lib/chainAliasMapper.js';
import { logger } from '@/utils/powertools.js';
import {
  NotFoundError,
  RateLimitError,
  AuthenticationError,
  APIConnectionError,
  APIConnectionTimeoutError,
} from '@coingecko/coingecko-typescript';

/** Helper to handle SDK errors with proper discrimination */
function handleCoinGeckoError(
  error: unknown,
  context: Record<string, unknown>
): null {
  if (error instanceof NotFoundError) {
    logger.debug('Token not found in CoinGecko', context);
    return null;
  }

  if (error instanceof RateLimitError) {
    logger.error('CoinGecko rate limit exceeded', {
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

  logger.warn('CoinGecko API error', {
    ...context,
    error: error instanceof Error ? error.message : error,
  });
  return null;
}

/** SDK coin data type - inferred from SDK response */
type CoinData = Awaited<ReturnType<ReturnType<typeof getCoinGeckoClient>['coins']['getID']>>;

export type { CoinData };

/**
 * Fetch token metadata by contract address
 */
export async function fetchTokenMetadata(
  chain: Chain,
  address: string
): Promise<CoinData | null> {
  const client = getCoinGeckoClient();
  const platform = mapChainAliasToCoinGeckoAssetPlatform(chain.Alias);

  if (!platform) {
    logger.warn('Chain not supported by CoinGecko', { chain: chain.Alias });
    return null;
  }

  try {
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
 * Get USD price for a token by contract address
 */
export async function getTokenUsdPrice(
  chain: ChainAlias,
  address: string
): Promise<number | null> {
  const client = getCoinGeckoClient();
  const platform = mapChainAliasToCoinGeckoAssetPlatform(chain);

  if (!platform) {
    logger.warn('Chain not supported by CoinGecko for price lookup', { chain });
    return null;
  }

  try {
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
