import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

/**
 * Chain-specific reorg thresholds for safe partial reconciliation.
 * Values represent number of blocks to re-process for reorg protection.
 */
const CHAIN_REORG_THRESHOLDS: Record<string, number> = {
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

const DEFAULT_THRESHOLD = 32;

/**
 * Value object for chain-specific reorg thresholds.
 *
 * Encapsulates the business logic for determining how far back
 * to re-process blocks during partial reconciliation to handle
 * potential chain reorganizations.
 *
 * @example
 * const threshold = ReorgThreshold.forChain('polygon-mainnet');
 * // threshold = 128 (Polygon has more frequent reorgs)
 *
 * const safeBlock = ReorgThreshold.calculateSafeFromBlock(1000, 'eth-mainnet');
 * // safeBlock = 968 (1000 - 32)
 */
export class ReorgThreshold {
  /**
   * Get the reorg threshold for a specific chain.
   */
  static forChain(chainAlias: ChainAlias): number {
    return CHAIN_REORG_THRESHOLDS[chainAlias] ?? DEFAULT_THRESHOLD;
  }

  /**
   * Calculate a safe starting block given a checkpoint and chain.
   * Returns the checkpoint minus the reorg threshold, minimum 0.
   */
  static calculateSafeFromBlock(checkpoint: number, chainAlias: ChainAlias): number {
    const threshold = ReorgThreshold.forChain(chainAlias);
    return Math.max(0, checkpoint - threshold);
  }

  /**
   * Get the default threshold for unknown chains.
   */
  static get defaultThreshold(): number {
    return DEFAULT_THRESHOLD;
  }
}
