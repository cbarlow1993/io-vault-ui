import type { Chain, ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { getCoinGeckoClient } from './client.js';
import {
  mapChainAliasToCoinGeckoAssetPlatform,
  mapChainAliasToCoinGeckoNativeCoinId,
} from '@/src/lib/chainAliasMapper.js';
import { logger } from '@/utils/powertools.js';

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
    return await client.coins.contract.get(address, { id: platform });
  } catch (error) {
    logger.warn('Failed to fetch token metadata from CoinGecko', {
      chain: chain.Alias,
      address,
      error,
    });
    return null;
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
    logger.warn('Failed to fetch native token metadata from CoinGecko', {
      chain: chain.Alias,
      error,
    });
    return null;
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
    return null;
  }

  try {
    const data = await client.coins.contract.get(address, { id: platform });
    return data.market_data?.current_price?.usd ?? null;
  } catch (error) {
    logger.warn('Failed to fetch token USD price from CoinGecko', {
      chain,
      address,
      error,
    });
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
