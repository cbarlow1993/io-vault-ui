/**
 * CoinGecko Platform Mapping
 *
 * Maps chainAlias values to CoinGecko platform identifiers.
 * CoinGecko only supports EVM mainnets for token lookups - no testnets, no Solana tokens.
 *
 * @see https://api.coingecko.com/api/v3/asset_platforms for the full list of platforms
 */

/**
 * Maps chainAlias to CoinGecko platform identifier.
 * Only includes EVM mainnets - CoinGecko does not support testnets or non-EVM chains for token lookups.
 */
export const COINGECKO_PLATFORM_MAP: Record<string, string> = {
  // Core EVM mainnets
  eth: 'ethereum',
  polygon: 'polygon-pos',
  arbitrum: 'arbitrum-one',
  optimism: 'optimistic-ethereum',
  base: 'base',
  'avalanche-c': 'avalanche',
  bsc: 'binance-smart-chain',
  fantom: 'fantom',

  // Additional EVM chains
  gnosis: 'xdai',
  'zksync-era': 'zksync',
  metis: 'metis-andromeda',
  fraxtal: 'fraxtal',
  dfk: 'defi-kingdoms-blockchain',
  'metal-l2': 'metal-l2',
  morph: 'morph-l2',
  quai: 'quai-network',
  xdc: 'xdc-network',
  zora: 'zora-network',
  linea: 'linea',
  scroll: 'scroll',
  blast: 'blast',

  // XRP has CoinGecko platform support
  xrp: 'xrp',

  // TVM chain
  tron: 'tron',
};

/**
 * Gets the CoinGecko platform identifier for a chain.
 *
 * @param chainAlias - The internal chain alias (e.g., 'eth', 'polygon')
 * @returns The CoinGecko platform identifier, or undefined if not supported
 *
 * @example
 * getCoinGeckoPlatform('eth') // 'ethereum'
 * getCoinGeckoPlatform('polygon') // 'polygon-pos'
 * getCoinGeckoPlatform('solana') // undefined (not supported)
 */
export function getCoinGeckoPlatform(chainAlias: string): string | undefined {
  return COINGECKO_PLATFORM_MAP[chainAlias];
}

/**
 * Checks if a chain is supported by CoinGecko for token lookups.
 *
 * @param chainAlias - The internal chain alias
 * @returns true if CoinGecko supports token lookups for this chain
 *
 * @example
 * isCoinGeckoSupported('eth') // true
 * isCoinGeckoSupported('solana') // false
 */
export function isCoinGeckoSupported(chainAlias: string): boolean {
  return chainAlias in COINGECKO_PLATFORM_MAP;
}
