import { ChainAlias, EcoSystem } from '@iofinnet/io-core-dapp-utils-chains-sdk';

/**
 * Noves Chain Mappings
 *
 * Maps internal chain aliases to Noves API identifiers.
 *
 * @see https://docs.noves.fi/reference/supported-chains
 */

/**
 * Noves ecosystem type used by the Noves SDK.
 */
export type NovesEcosystem = 'evm' | 'svm' | 'utxo' | 'xrpl';

/**
 * Ecosystems that support async job operations.
 * XRPL does not support async jobs.
 */
export const NOVES_ASYNC_JOB_ECOSYSTEMS: NovesEcosystem[] = ['evm', 'svm', 'utxo'];

/**
 * Maps provider chain alias format (e.g., 'eth-mainnet') to Noves chain identifier.
 * Used by NovesProvider for reconciliation.
 *
 * Note: These use the provider-specific chain alias format with '-mainnet' suffix,
 * which differs from the ChainAlias type used elsewhere.
 */
//@ts-expect-error Not listing all available chains here for now
export const NOVES_PROVIDER_CHAIN_MAP: Record<ChainAlias, string> = {
  // EVM Mainnets
  'eth': 'eth',
  'polygon': 'polygon',
  'arbitrum': 'arbitrum',
  'optimism': 'optimism',
  'base': 'base',
  'avalanche-c': 'avalanche',
  'bsc': 'bsc',
  'fantom': 'fantom',
  // Solana
  'solana': 'solana',
  // UTXO chains
  'bitcoin': 'btc',
  'litecoin': 'ltc',
  // XRP Ledger
  'ripple': 'xrpl',
};

/**
 * Maps provider chain alias format to Noves ecosystem.
 * Used by NovesProvider to select the correct SDK client.
 *
 * Note: These use the provider-specific chain alias format with '-mainnet' suffix,
 * which differs from the ChainAlias type used elsewhere.
 */
//@ts-expect-error Not listing all available chains here for now
export const NOVES_PROVIDER_ECOSYSTEM_MAP: Record<ChainAlias, NovesEcosystem> = {
  // EVM Mainnets
  'eth': 'evm',
  'polygon': 'evm',
  'arbitrum': 'evm',
  'optimism': 'evm',
  'base': 'evm',
  'avalanche-c': 'evm',
  'bsc': 'evm',
  'fantom': 'evm',
  // SVM chains (Solana)
  'solana': 'svm',
  // UTXO chains
  'bitcoin': 'utxo',
  'litecoin': 'utxo',
  // XRP Ledger
  'ripple': 'xrpl',
};

/**
 * Maps chainAlias to Noves API chain identifier.
 */
export const NOVES_CHAIN_MAP: Record<ChainAlias, string> = {
  // EVM Mainnets
  eth: 'eth',
  polygon: 'polygon',
  arbitrum: 'arbitrum',
  optimism: 'optimism',
  base: 'base',
  'avalanche-c': 'avalanche',
  bsc: 'bsc',
  fantom: 'fantom',
  // SVM
  solana: 'solana',
  // Non-EVM chains
  bitcoin: 'btc',
  ripple: 'xrpl',
  tron: 'tron',
  bittensor: 'bittensor',
  'bittensor-testnet': 'bittensor-testnet',
  'ripple-testnet': 'xrpl-testnet',
  'solana-testnet': '',
  mnee: '',
  'mnee-testnet': '',
  litecoin: '',
  cardano: '',
  'avalanche-p-chain': '',
  'avalanche-x-chain': '',
  abstract: '',
  'arbitrum-nova': '',
  astar: '',
  berachain: '',
  blast: '',
  celo: '',
  coqnet: '',
  cronos: '',
  degen: '',
  dfk: '',
  'dfk-testnet': '',
  'eth-sepolia': '',
  flame: '',
  'flow-evm': '',
  'fluent-devnet': '',
  fraxtal: '',
  fuse: '',
  gnosis: '',
  ink: '',
  lamina1: '',
  lightlink: '',
  linea: '',
  lukso: '',
  'manta-pacific': '',
  mantle: '',
  matchain: '',
  metal: '',
  metis: '',
  'mint-sepolia': '',
  mode: '',
  'monad-testnet': '',
  moonriver: '',
  morph: '',
  'morph-holesky-testnet': '',
  'orderly-network': '',
  perennial: '',
  'plume-devnet': '',
  'polygon-zkevm': '',
  pulsechain: '',
  quai: '',
  rari: '',
  ronin: '',
  scroll: '',
  'shimmer-evm': '',
  sonic: '',
  'sophon-testnet': '',
  'superposition-testnet': '',
  'superseed-sepolia': '',
  xai: '',
  xdc: '',
  'zksync-era': '',
  zora: ''
};

export const NOVES_ECOSYSTEM_MAP: Record<EcoSystem, string> = {
  [EcoSystem.EVM]: 'evm',
  [EcoSystem.SVM]: 'svm',
  [EcoSystem.UTXO]: 'utxo',
  [EcoSystem.XRP]: 'xrpl',
  [EcoSystem.COSMOS]: 'cosmos',
  [EcoSystem.TVM]: 'tvm',
  [EcoSystem.SUBSTRATE]: 'substrate',
};

/**
 * Gets the Noves chain identifier for a chain alias.
 *
 * @param chainAlias - The internal chain alias
 * @returns The Noves chain identifier, or undefined if not supported
 */
export function getNovesChain(chainAlias: ChainAlias): string | undefined {
  return NOVES_CHAIN_MAP[chainAlias];
}

/**
 * Checks if a chain is supported by Noves.
 *
 * @param chainAlias - The internal chain alias
 * @returns true if Noves supports this chain
 */
export function isNovesSupported(chainAlias: ChainAlias): boolean {
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
