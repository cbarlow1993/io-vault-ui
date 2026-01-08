import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { ProviderConfig, TransactionProvider } from '@/src/services/reconciliation/providers/types.js';
import { NovesProvider } from '@/src/services/reconciliation/providers/noves-provider.js';

/**
 * Provider configuration mapping chain aliases to their preferred providers.
 * The primary provider is used first, with fallbacks tried in order if the primary fails.
 * Note: Not all chains are supported for reconciliation - this is a partial mapping.
 */
export const PROVIDER_CONFIG: Partial<Record<ChainAlias, ProviderConfig>> = {
  // EVM Chains - Mainnets
  eth: { primary: 'noves', fallbacks: [] },
  polygon: { primary: 'noves', fallbacks: [] },
  arbitrum: { primary: 'noves', fallbacks: [] },
  optimism: { primary: 'noves', fallbacks: [] },
  base: { primary: 'noves', fallbacks: [] },
  'avalanche-c': { primary: 'noves', fallbacks: [] },
  bsc: { primary: 'noves', fallbacks: [] },
  fantom: { primary: 'noves', fallbacks: [] },

  // Solana
  solana: { primary: 'noves', fallbacks: [] },
  // UTXO Chains
  bitcoin: { primary: 'noves', fallbacks: [] },
  litecoin: { primary: 'noves', fallbacks: [] },
  // XRP Ledger
  ripple: { primary: 'noves', fallbacks: [] },
  mantle: { primary: 'noves', fallbacks: [] },
  matchain: { primary: 'noves', fallbacks: [] },
  metal: { primary: 'noves', fallbacks: [] },
  metis: { primary: 'noves', fallbacks: [] },
  'mint-sepolia': { primary: 'noves', fallbacks: [] },
  mode: { primary: 'noves', fallbacks: [] },
  'monad-testnet': { primary: 'noves', fallbacks: [] },
  moonriver: { primary: 'noves', fallbacks: [] },
  morph: { primary: 'noves', fallbacks: [] },
  'morph-holesky-testnet': { primary: 'noves', fallbacks: [] },
  'orderly-network': { primary: 'noves', fallbacks: [] },
  perennial: { primary: 'noves', fallbacks: [] },
  'plume-devnet': { primary: 'noves', fallbacks: [] },
  'polygon-zkevm': { primary: 'noves', fallbacks: [] },
  pulsechain: { primary: 'noves', fallbacks: [] },
  quai: { primary: 'noves', fallbacks: [] },
  rari: { primary: 'noves', fallbacks: [] },
  ronin: { primary: 'noves', fallbacks: [] },
  scroll: { primary: 'noves', fallbacks: [] },
  'shimmer-evm': { primary: 'noves', fallbacks: [] },
  sonic: { primary: 'noves', fallbacks: [] },
  'sophon-testnet': { primary: 'noves', fallbacks: [] },
  'superposition-testnet': { primary: 'noves', fallbacks: [] },
  'superseed-sepolia': { primary: 'noves', fallbacks: [] },
  xai: { primary: 'noves', fallbacks: [] },
  xdc: { primary: 'noves', fallbacks: [] },
  'zksync-era': { primary: 'noves', fallbacks: [] },
  zora: { primary: 'noves', fallbacks: [] },
  'bittensor-testnet': { primary: 'noves', fallbacks: [] },
  'ripple-testnet': { primary: 'noves', fallbacks: [] },
  'solana-testnet': { primary: 'noves', fallbacks: [] },
  mnee: { primary: 'noves', fallbacks: [] },
  'mnee-testnet': { primary: 'noves', fallbacks: [] },
  
  cardano: { primary: 'noves', fallbacks: [] },
  'avalanche-p-chain': { primary: 'noves', fallbacks: [] },
  'avalanche-x-chain': { primary: 'noves', fallbacks: [] },
  abstract: { primary: 'noves', fallbacks: [] },
  'arbitrum-nova': { primary: 'noves', fallbacks: [] },
  astar: { primary: 'noves', fallbacks: [] },
  berachain: { primary: 'noves', fallbacks: [] },
  blast: { primary: 'noves', fallbacks: [] },
  celo: { primary: 'noves', fallbacks: [] },
  coqnet: { primary: 'noves', fallbacks: [] },
  'dfk-testnet': { primary: 'noves', fallbacks: [] },
  'eth-sepolia': { primary: 'noves', fallbacks: [] },
  flame: { primary: 'noves', fallbacks: [] },
  'flow-evm': { primary: 'noves', fallbacks: [] },
  'fluent-devnet': { primary: 'noves', fallbacks: [] }
};

/**
 * Registry of all available transaction providers.
 * Providers are instantiated lazily and cached.
 */
class ProviderRegistry {
  private providers: Map<string, TransactionProvider> = new Map();

  /**
   * Registers a provider instance with the registry.
   */
  register(provider: TransactionProvider): void {
    this.providers.set(provider.name, provider);
  }

  /**
   * Gets a provider by name.
   * @throws Error if the provider is not registered
   */
  get(name: string): TransactionProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider not found: ${name}`);
    }
    return provider;
  }

  /**
   * Checks if a provider is registered.
   */
  has(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Gets all registered provider names.
   */
  getRegisteredProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Clears all registered providers (useful for testing).
   */
  clear(): void {
    this.providers.clear();
  }
}

/**
 * Global provider registry instance.
 */
export const providerRegistry = new ProviderRegistry();

/**
 * Initializes the provider registry with default providers.
 * This should be called during application startup.
 *
 * @param config - Configuration object with API keys
 */
export function initializeProviders(config: { novesApiKey: string }): void {
  if (!providerRegistry.has('noves')) {
    providerRegistry.register(new NovesProvider(config.novesApiKey));
  }
}

/**
 * Gets the provider configuration for a specific chain alias.
 *
 * @param chainAlias - The chain alias identifier
 * @returns The provider configuration, or null if the chain alias is not supported
 */
export function getProviderConfig(chainAlias: ChainAlias): ProviderConfig | null {
  return PROVIDER_CONFIG[chainAlias] ?? null;
}

/**
 * Gets the primary provider for a specific chain alias.
 *
 * @param chainAlias - The chain alias identifier
 * @returns The primary TransactionProvider for the chain alias
 * @throws Error if the chain alias is not supported or the provider is not registered
 */
export function getProviderForChainAlias(chainAlias: ChainAlias): TransactionProvider {
  const config = getProviderConfig(chainAlias);
  if (!config) {
    throw new Error(`No provider configured for chain alias: ${chainAlias}`);
  }

  return providerRegistry.get(config.primary);
}

/**
 * Gets all providers for a chain alias (primary and fallbacks).
 *
 * @param chainAlias - The chain alias identifier
 * @returns Array of TransactionProviders in priority order
 * @throws Error if the chain alias is not supported
 */
export function getProvidersForChainAlias(chainAlias: ChainAlias): TransactionProvider[] {
  const config = getProviderConfig(chainAlias);
  if (!config) {
    throw new Error(`No provider configured for chain alias: ${chainAlias}`);
  }

  const providers: TransactionProvider[] = [providerRegistry.get(config.primary)];

  for (const fallbackName of config.fallbacks) {
    if (providerRegistry.has(fallbackName)) {
      providers.push(providerRegistry.get(fallbackName));
    }
  }

  return providers;
}

/**
 * Gets all supported chain aliases across all registered providers.
 */
export function getSupportedChainAliases(): ChainAlias[] {
  return Object.keys(PROVIDER_CONFIG) as ChainAlias[];
}
