import {
  CHAIN_ECOSYSTEM_MAP,
  EvmBalanceFetcher,
  getEvmChainConfig,
  SvmBalanceFetcher,
  getSvmChainConfig,
  UtxoBalanceFetcher,
  getUtxoChainConfig,
  TvmBalanceFetcher,
  getTvmChainConfig,
  type ChainAlias,
  type EvmChainAlias,
  type SvmChainAlias,
  type UtxoChainAlias,
  type TvmChainAlias,
} from '@io-vault/chains';
import { ChainsBalanceFetcherAdapter } from './chains-adapter.js';
import type { BalanceFetcher } from './types.js';

/**
 * Creates a BalanceFetcher for the given chain using the chains package.
 * Returns null if the chain is not supported.
 */
export function createBalanceFetcher(
  chainAlias: string,
  network: string,
  rpcUrl: string
): BalanceFetcher | null {
  const ecosystem = CHAIN_ECOSYSTEM_MAP[chainAlias as ChainAlias];
  if (!ecosystem) return null;

  switch (ecosystem) {
    case 'evm': {
      const config = getEvmChainConfig(chainAlias as EvmChainAlias, { rpcUrl });
      const fetcher = new EvmBalanceFetcher(config);
      return new ChainsBalanceFetcherAdapter(fetcher, chainAlias, network, ecosystem);
    }
    case 'svm': {
      const config = getSvmChainConfig(chainAlias as SvmChainAlias, { rpcUrl });
      const fetcher = new SvmBalanceFetcher(config);
      return new ChainsBalanceFetcherAdapter(fetcher, chainAlias, network, ecosystem);
    }
    case 'utxo': {
      const config = getUtxoChainConfig(chainAlias as UtxoChainAlias, { rpcUrl });
      const fetcher = new UtxoBalanceFetcher(config);
      return new ChainsBalanceFetcherAdapter(fetcher, chainAlias, network, ecosystem);
    }
    case 'tvm': {
      const config = getTvmChainConfig(chainAlias as TvmChainAlias, { rpcUrl });
      const fetcher = new TvmBalanceFetcher(config);
      return new ChainsBalanceFetcherAdapter(fetcher, chainAlias, network, ecosystem);
    }
    default:
      // xrp, substrate not yet supported
      return null;
  }
}
