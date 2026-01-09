import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

/**
 * Centralized mapping from chain aliases to CoinGecko IDs for native currencies.
 *
 * Consolidates duplicate mappings from:
 * - src/services/balances/balance-service.ts:387-402 (getNativeCoingeckoId)
 * - src/services/transactions/transfer-enricher.ts:92-111 (getNativeCoingeckoId)
 *
 * This single source of truth prevents the two implementations from drifting
 * out of sync and makes it easy to add new chains.
 */
export const NATIVE_COINGECKO_IDS: Readonly<Record<string, string>> = {
  // ===== Mainnet chains =====
  ethereum: 'ethereum',
  polygon: 'polygon-ecosystem-token',
  arbitrum: 'ethereum',
  optimism: 'ethereum',
  base: 'ethereum',
  avalanche: 'avalanche-2',
  bsc: 'binancecoin',
  solana: 'solana',
  bitcoin: 'bitcoin',
  tron: 'tron',
  xrp: 'ripple',
  fantom: 'fantom',
  bittensor: 'bittensor',

  // ===== Testnets (map to mainnet for pricing) =====
  'ethereum-sepolia': 'ethereum',
  'solana-devnet': 'solana',
  'polygon-amoy': 'polygon-ecosystem-token',
  'arbitrum-sepolia': 'ethereum',
  'optimism-sepolia': 'ethereum',
  'base-sepolia': 'ethereum',
  'avalanche-fuji': 'avalanche-2',
  'bsc-testnet': 'binancecoin',
  'bitcoin-testnet': 'bitcoin',
  'tron-testnet': 'tron',
  'xrp-testnet': 'ripple',
  'bittensor-testnet': 'bittensor',
} as const;

/**
 * Get the CoinGecko ID for a chain's native currency.
 *
 * @param chainAlias - The chain alias (e.g., 'ethereum', 'polygon')
 * @returns CoinGecko ID or null if not mapped
 *
 * @example
 * getNativeCoingeckoId('ethereum'); // 'ethereum'
 * getNativeCoingeckoId('polygon'); // 'polygon-ecosystem-token'
 * getNativeCoingeckoId('unknown-chain'); // null
 */
export function getNativeCoingeckoId(chainAlias: ChainAlias | string): string | null {
  return NATIVE_COINGECKO_IDS[chainAlias] ?? null;
}

/**
 * Check if a chain has a known CoinGecko mapping for its native currency.
 *
 * @param chainAlias - The chain alias
 * @returns true if the chain has a mapping
 */
export function hasCoingeckoMapping(chainAlias: ChainAlias | string): boolean {
  return chainAlias in NATIVE_COINGECKO_IDS;
}

/**
 * Get all supported chain aliases that have CoinGecko mappings.
 *
 * @returns Array of chain aliases with mappings
 */
export function getSupportedChains(): string[] {
  return Object.keys(NATIVE_COINGECKO_IDS);
}
