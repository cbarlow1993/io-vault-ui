import { EcoSystem } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { ChainFeatures } from '@/src/lib/chains.js';
import { getChainsForEcosystem } from '@/tests/integration/utils/getChainsForEcosystem.js';
import { isChainSupportedForTesting } from '@/tests/integration/utils/isChainSupported.js';

export const EVM_CHAINS = (await getChainsForEcosystem(EcoSystem.EVM)).map((chain) => ({
  name: chain.Config.name,
  chain,
}));

export const getAllEvmsChainsForFeature = (chainFeatures: ChainFeatures[]) => {
  return EVM_CHAINS.filter((chain) =>
    chainFeatures.every((feature) => isChainSupportedForTesting(chain.chain.Alias, feature))
  ).map((chain) => ({ name: chain.chain.Config.name, chain: chain.chain }));
};
