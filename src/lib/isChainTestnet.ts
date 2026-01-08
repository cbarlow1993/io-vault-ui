import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { ALL_CHAINS } from '@/src/lib/chains.js';

export const isChainTestnet = (chain: ChainAlias) => {
  return ALL_CHAINS[chain as keyof typeof ALL_CHAINS].isTestnet;
};
