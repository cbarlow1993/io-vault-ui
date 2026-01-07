import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

/**
 * CoinGecko Chain Mappings
 *
 * Maps internal chain aliases to CoinGecko identifiers for:
 * - Asset platforms (for token contract lookups)
 * - Native coin IDs (for native token metadata/pricing)
 *
 * @see https://api.coingecko.com/api/v3/asset_platforms for platform list
 * @see https://api.coingecko.com/api/v3/coins/list for coin IDs
 */

/**
 * Maps chainAlias to CoinGecko asset platform identifier.
 * Used for token contract lookups via /coins/{platform}/contract/{address}
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

  // Non-EVM chains with platform support
  xrp: 'xrp',
  tron: 'tron',
};

/**
 * Maps chainAlias to CoinGecko native coin ID.
 * Used for fetching native token metadata via /coins/{id}
 */
export const COINGECKO_NATIVE_COIN_MAP: Record<string, string> = {
  // Core chains
  eth: 'ethereum',
  polygon: 'polygon-ecosystem-token',
  arbitrum: 'ethereum',
  'arbitrum-nova': 'ethereum',
  optimism: 'ethereum',
  base: 'ethereum',
  'avalanche-c': 'avalanche-2',
  bsc: 'binancecoin',

  // L2s and sidechains (ETH-based)
  'zksync-era': 'ethereum',
  linea: 'ethereum',
  scroll: 'weth',
  blast: 'blast-old',
  zora: 'weth',
  abstract: 'ethereum',
  ink: 'ethereum',
  lightlink: 'ethereum',
  'polygon-zkevm': 'ethereum',
  rari: 'weth',
  'manta-pacific': 'weth',
  morph: 'weth',

  // Alternative L1s
  gnosis: 'xdai',
  fantom: 'fantom',
  cronos: 'crypto-com-chain',
  fuse: 'fuse-network-token',
  lukso: 'lukso-token-2',
  sonic: 'sonic-3',
  berachain: 'berachain-bera',

  // Specialized chains
  dfk: 'defi-kingdoms',
  metis: 'metis-token',
  fraxtal: 'fraxtal',
  quai: 'quai-network',
  xdc: 'xdce-crowd-sale',
  degen: 'degen-base',
  xai: 'xai-blockchain',
  'flow-evm': 'flow',

  // Non-EVM chains
  xrp: 'ripple',
  tron: 'tronix',
  solana: 'solana',
  bitcoin: 'bitcoin',

  // Testnets (map to mainnet equivalents for metadata)
  'sophon-testnet': 'sophon',
  'superseed-sepolia': 'ethereum',
};

/**
 * Gets the CoinGecko asset platform identifier for a chain.
 * Used for token contract lookups.
 *
 * @param chainAlias - The internal chain alias (e.g., 'eth', 'polygon')
 * @returns The CoinGecko platform identifier, or undefined if not supported
 */
export function getCoinGeckoPlatform(chainAlias: string): string | undefined {
  return COINGECKO_PLATFORM_MAP[chainAlias];
}

/**
 * Gets the CoinGecko native coin ID for a chain.
 * Used for fetching native token metadata and pricing.
 *
 * @param chainAlias - The internal chain alias (e.g., 'eth', 'polygon')
 * @returns The CoinGecko coin ID, or undefined if not mapped
 */
export function getCoinGeckoNativeCoinId(chainAlias: string): string | undefined {
  return COINGECKO_NATIVE_COIN_MAP[chainAlias];
}

/**
 * Checks if a chain is supported by CoinGecko for token lookups.
 *
 * @param chainAlias - The internal chain alias
 * @returns true if CoinGecko supports token lookups for this chain
 */
export function isCoinGeckoSupported(chainAlias: string): boolean {
  return chainAlias in COINGECKO_PLATFORM_MAP;
}

/**
 * Maps ChainAlias enum to CoinGecko asset platform.
 * Backwards-compatible function for existing consumers using ChainAlias enum.
 *
 * @param chain - The ChainAlias enum value
 * @returns The CoinGecko platform identifier, or the chain alias if not mapped
 */
export function mapChainAliasToCoinGeckoAssetPlatform(chain: ChainAlias): string {
  return COINGECKO_PLATFORM_MAP[chain] ?? chain;
}

/**
 * Maps ChainAlias enum to CoinGecko native coin ID.
 * Backwards-compatible function for existing consumers using ChainAlias enum.
 *
 * @param chain - The ChainAlias enum value
 * @returns The CoinGecko coin ID, or the chain alias if not mapped
 */
export function mapChainAliasToCoinGeckoNativeCoinId(chain: ChainAlias): string {
  return COINGECKO_NATIVE_COIN_MAP[chain] ?? chain;
}
