import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

/**
 * Chain alias-specific reorg thresholds for safe partial reconciliation.
 * These values represent the number of blocks to re-process for reorg protection.
 */
export const CHAIN_ALIAS_REORG_THRESHOLDS: Record<string, number> = {
  // EVM Mainnets
  'eth-mainnet': 32,
  'polygon-mainnet': 128,
  'arbitrum-mainnet': 32,
  'optimism-mainnet': 32,
  'base-mainnet': 32,
  'avalanche-mainnet': 32,
  'bsc-mainnet': 32,
  'fantom-mainnet': 32,
  // EVM Testnets
  'eth-sepolia': 32,
  'eth-holesky': 32,
  'polygon-amoy': 128,
  'arbitrum-sepolia': 32,
  'optimism-sepolia': 32,
  'base-sepolia': 32,
  // UTXO chains
  'btc-mainnet': 6,
  'btc-testnet': 6,
  'ltc-mainnet': 6,
  'doge-mainnet': 6,
  // Solana
  'solana-mainnet': 1,
  'solana-devnet': 1,
  // XRP Ledger
  'xrpl-mainnet': 1,
  'xrpl-testnet': 1,
};

/**
 * Default reorg threshold for unknown chain aliases.
 */
const DEFAULT_REORG_THRESHOLD = 32;

/**
 * Gets the reorg threshold for a given chain alias.
 * Returns default threshold if chain alias is not configured.
 */
export function getReorgThreshold(chainAlias: ChainAlias): number {
  return CHAIN_ALIAS_REORG_THRESHOLDS[chainAlias] ?? DEFAULT_REORG_THRESHOLD;
}

/**
 * Rate limiting configuration for reconciliation worker.
 */
export const RECONCILIATION_RATE_LIMIT = {
  tokensPerInterval: 1,
  interval: 'second' as const,
};
