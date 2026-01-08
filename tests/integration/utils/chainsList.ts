import { Chain, type ChainAlias, EcoSystem } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import {
  ALL_CHAINS,
  ChainFeatures,
  activeFeatureStatuses,
  type ChainWithFeatures,
} from '@/src/lib/chains.js';

interface ChainTestEntry {
  name: string;
  chain: Awaited<ReturnType<typeof Chain.fromAlias>>;
}

/**
 * Get all EVM chains that have active status for specified features
 */
export async function getAllEvmsChainsForFeature(
  features: ChainFeatures[]
): Promise<ChainTestEntry[]> {
  const chains: ChainTestEntry[] = [];

  for (const [alias, config] of Object.entries(ALL_CHAINS) as [ChainAlias, ChainWithFeatures][]) {
    try {
      const chain = await Chain.fromAlias(alias);

      // Only include EVM chains
      if (!chain.isEcosystem(EcoSystem.EVM)) {
        continue;
      }

      // Check if all required features are active
      const hasAllFeatures = features.every((feature) =>
        activeFeatureStatuses.includes(config.features[feature])
      );

      if (hasAllFeatures) {
        chains.push({
          name: alias,
          chain,
        });
      }
    } catch {
      // Skip chains that fail to load
    }
  }

  return chains;
}

/**
 * Get all chains for an ecosystem that have active status for specified features
 */
export async function getChainsForEcosystemAndFeature(
  ecosystem: EcoSystem,
  features: ChainFeatures[]
): Promise<ChainTestEntry[]> {
  const chains: ChainTestEntry[] = [];

  for (const [alias, config] of Object.entries(ALL_CHAINS) as [ChainAlias, ChainWithFeatures][]) {
    try {
      const chain = await Chain.fromAlias(alias);

      if (!chain.isEcosystem(ecosystem)) {
        continue;
      }

      const hasAllFeatures = features.every((feature) =>
        activeFeatureStatuses.includes(config.features[feature])
      );

      if (hasAllFeatures) {
        chains.push({
          name: alias,
          chain,
        });
      }
    } catch {
      // Skip chains that fail to load
    }
  }

  return chains;
}
