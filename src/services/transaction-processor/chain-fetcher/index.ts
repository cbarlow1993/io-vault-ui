import {
  type ChainAlias,
  EvmChainAliases,
  SvmChainAliases,
} from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { ChainFetcher, RawTransaction } from '@/src/services/transaction-processor/types.js';
import { EvmChainFetcher } from '@/src/services/transaction-processor/chain-fetcher/evm-fetcher.js';
import { SvmChainFetcher } from '@/src/services/transaction-processor/chain-fetcher/svm-fetcher.js';

// Chain type helpers using SDK chain aliases
const evmAliases = Object.values(EvmChainAliases) as string[];
const svmAliases = Object.values(SvmChainAliases) as string[];

function isEvmChain(chainAlias: ChainAlias): boolean {
  return evmAliases.includes(chainAlias);
}

function isSvmChain(chainAlias: ChainAlias): boolean {
  return svmAliases.includes(chainAlias);
}

export { EvmChainFetcher } from '@/src/services/transaction-processor/chain-fetcher/evm-fetcher.js';
export { SvmChainFetcher } from '@/src/services/transaction-processor/chain-fetcher/svm-fetcher.js';

export interface ChainFetcherRegistryConfig {
  evmRpcUrls: Record<string, string>;
  svmRpcUrls: Record<string, string>;
}

export class ChainFetcherRegistry implements ChainFetcher {
  private readonly evmFetcher: EvmChainFetcher;
  private readonly svmFetcher: SvmChainFetcher;

  constructor(config: ChainFetcherRegistryConfig) {
    this.evmFetcher = new EvmChainFetcher({ rpcUrls: config.evmRpcUrls });
    this.svmFetcher = new SvmChainFetcher({ rpcUrls: config.svmRpcUrls });
  }

  async fetch(chainAlias: ChainAlias, txHash: string): Promise<RawTransaction> {
    if (isEvmChain(chainAlias)) {
      return this.evmFetcher.fetch(chainAlias, txHash);
    }

    if (isSvmChain(chainAlias)) {
      return this.svmFetcher.fetch(chainAlias, txHash);
    }

    throw new Error(`No fetcher found for chain: ${chainAlias}`);
  }
}
