import { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { TokenScanSupportedChain } from '@blockaid/client/resources/evm/evm.js';

/**
 * Blockaid Chain Mapping
 *
 * Maps internal chain aliases to Blockaid's expected chain identifiers.
 * Used for transaction scanning and token scanning.
 *
 * @see https://docs.blockaid.io/reference/supported-chains
 */

/**
 * Maps internal chain alias to Blockaid's transaction scan chain format.
 *
 * @param chain - The internal ChainAlias enum value
 * @returns Blockaid chain identifier string
 */
export const mapChainToBlockaidChain = (chain: ChainAlias): string => {
  switch (chain) {
    case ChainAlias.ETH:
      return 'ethereum';
    case ChainAlias.ETH_SEPOLIA:
      return 'ethereum-sepolia';
    case ChainAlias.AVALANCHE_C:
      return 'avalanche';
    case ChainAlias.ZKSYNC_ERA:
      return 'zksync';
    case ChainAlias.SOLANA:
      return 'mainnet';
    // If not a special case, return as is (Blockaid expects the same string)
    default:
      return chain;
  }
};

/**
 * Chain mapping for Blockaid token scan API.
 * Maps internal chain aliases to Blockaid's TokenScanSupportedChain type.
 */
export const BLOCKAID_TOKEN_SCAN_CHAIN_MAP: Record<string, TokenScanSupportedChain> = {
  // EVM Mainnets
  eth: 'ethereum',
  polygon: 'polygon',
  arbitrum: 'arbitrum',
  optimism: 'optimism',
  base: 'base',
  bsc: 'bsc',
  'avalanche-c': 'avalanche',
  'zksync-era': 'zksync',
  linea: 'linea',
  scroll: 'scroll',
  blast: 'blast',
  zora: 'zora',
  abstract: 'abstract',
  ink: 'ink',
  ronin: 'ronin',

  // Non-EVM chains
  solana: 'solana',
  sui: 'sui',
  stellar: 'stellar',
  hedera: 'hedera',
  bitcoin: 'bitcoin',
};

/**
 * Maps internal chain alias to Blockaid token scan supported chain.
 *
 * @param chain - Internal chain alias (e.g., 'eth', 'polygon', 'avalanche-c')
 * @returns Blockaid TokenScanSupportedChain or null if unsupported
 */
export const mapChainToBlockaidTokenScanChain = (chain: ChainAlias): TokenScanSupportedChain | null => {
  return BLOCKAID_TOKEN_SCAN_CHAIN_MAP[chain] ?? null;
};

/**
 * Checks if a chain is supported by Blockaid for token scanning.
 *
 * @param chainAlias - Internal chain alias
 * @returns true if Blockaid supports token scanning for this chain
 */
export function isBlockaidTokenScanSupported(chainAlias: ChainAlias): boolean {
  return chainAlias in BLOCKAID_TOKEN_SCAN_CHAIN_MAP;
}
