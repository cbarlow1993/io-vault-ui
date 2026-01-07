import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

/**
 * Noves Chain Mappings
 *
 * Maps internal chain aliases to Noves API identifiers.
 *
 * @see https://docs.noves.fi/reference/supported-chains
 */

/**
 * Maps chainAlias to Noves API chain identifier.
 */
export const NOVES_CHAIN_MAP: Record<string, string> = {
  // EVM Mainnets
  eth: 'eth',
  polygon: 'polygon',
  arbitrum: 'arbitrum',
  optimism: 'optimism',
  base: 'base',
  'avalanche-c': 'avalanche',
  bsc: 'bsc',
  fantom: 'fantom',

  // EVM Testnets
  'eth-sepolia': 'eth-sepolia',
  'eth-goerli': 'eth-goerli',

  // SVM
  solana: 'solana',
  'solana-devnet': 'solana-devnet',

  // Non-EVM chains
  bitcoin: 'btc',
  xrp: 'xrpl',
};

/**
 * Gets the Noves chain identifier for a chain alias.
 *
 * @param chainAlias - The internal chain alias
 * @returns The Noves chain identifier, or undefined if not supported
 */
export function getNovesChain(chainAlias: string): string | undefined {
  return NOVES_CHAIN_MAP[chainAlias];
}

/**
 * Checks if a chain is supported by Noves.
 *
 * @param chainAlias - The internal chain alias
 * @returns true if Noves supports this chain
 */
export function isNovesSupported(chainAlias: string): boolean {
  return chainAlias in NOVES_CHAIN_MAP;
}

/**
 * Maps ChainAlias enum to Noves chain identifier.
 * Backwards-compatible function for existing consumers using ChainAlias enum.
 *
 * @param chain - The ChainAlias enum value
 * @returns The Noves chain identifier, or the chain alias if not mapped
 */
export function mapChainAliasToNovesChain(chain: ChainAlias): string {
  return NOVES_CHAIN_MAP[chain] ?? chain;
}
