import type { ChainAlias } from '@/src/core/types.js';

/**
 * Chain-specific reorg thresholds for safe partial reconciliation.
 * Values represent number of blocks to re-process for reorg protection.
 */
const CHAIN_REORG_THRESHOLDS: Partial<Record<ChainAlias, number>> = {
  // EVM chains
  ethereum: 32,
  polygon: 128, // Higher due to reorg frequency
  arbitrum: 32,
  optimism: 32,
  base: 32,
  avalanche: 32,
  fantom: 32,
  bsc: 32,
  // SVM
  solana: 1,
  'solana-devnet': 1,
  // UTXO
  bitcoin: 6,
  'bitcoin-testnet': 6,
  mnee: 6,
  // TVM
  tron: 32,
  'tron-testnet': 32,
  // XRP
  xrp: 1,
  'xrp-testnet': 1,
  // Substrate
  bittensor: 32,
  'bittensor-testnet': 32,
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
 * const threshold = ReorgThreshold.forChain('polygon');
 * // threshold = 128 (Polygon has more frequent reorgs)
 *
 * const safeBlock = ReorgThreshold.calculateSafeFromBlock(1000, 'ethereum');
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
