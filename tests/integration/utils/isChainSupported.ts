import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { ChainFeatures } from '@/src/lib/chains.js';
import { isChainFeatureActive } from '@/src/lib/isChainFeatureActive.js';
import { isChainTestnet } from '@/src/lib/isChainTestnet.js';

export const isChainSupportedForTesting = (chain: ChainAlias, feature: ChainFeatures) => {
  return isChainFeatureActive({ chainAlias: chain, feature }) && !isChainTestnet(chain);
};
