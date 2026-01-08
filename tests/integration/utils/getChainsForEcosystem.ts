import { Chain, type ChainAlias, type EcoSystem } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { ALL_CHAINS } from '@/src/lib/chains.js';

export const getChainsForEcosystem = async (ecosystem: EcoSystem) => {
  const allChainAliases = Object.keys(ALL_CHAINS) as ChainAlias[];
  const chains = await Promise.all(
    allChainAliases.map(async (chainAlias) => Chain.fromAlias(chainAlias))
  );
  return chains.filter((chain) => chain.isEcosystem(ecosystem));
};
