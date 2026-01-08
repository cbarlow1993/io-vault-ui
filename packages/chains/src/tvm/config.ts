// packages/chains/src/tvm/config.ts

import type { TvmChainAlias, ChainConfig } from '../core/types.js';

// ============ TVM Chain Config Interface ============

export interface TvmChainConfig extends ChainConfig {
  chainAlias: TvmChainAlias;
  network: 'mainnet' | 'testnet';
  fullNodeUrl: string;
  solidityNodeUrl: string;
  eventServerUrl: string;
  // TRC20/TRC721 contract prefixes
  tokenPrefix: string;
}

// ============ TVM Chain Configurations ============

export const TVM_CHAIN_CONFIGS: Record<TvmChainAlias, TvmChainConfig> = {
  tron: {
    chainAlias: 'tron',
    network: 'mainnet',
    rpcUrl: 'https://api.trongrid.io',
    fullNodeUrl: 'https://api.trongrid.io',
    solidityNodeUrl: 'https://api.trongrid.io',
    eventServerUrl: 'https://api.trongrid.io',
    nativeCurrency: {
      symbol: 'TRX',
      decimals: 6,
    },
    tokenPrefix: 'T',
  },
  'tron-testnet': {
    chainAlias: 'tron-testnet',
    network: 'testnet',
    rpcUrl: 'https://api.shasta.trongrid.io',
    fullNodeUrl: 'https://api.shasta.trongrid.io',
    solidityNodeUrl: 'https://api.shasta.trongrid.io',
    eventServerUrl: 'https://api.shasta.trongrid.io',
    nativeCurrency: {
      symbol: 'TRX',
      decimals: 6,
    },
    tokenPrefix: 'T',
  },
};

// ============ Helper Functions ============

/**
 * Get TVM chain configuration by alias
 */
export function getTvmChainConfig(chainAlias: TvmChainAlias, rpcUrl?: string): TvmChainConfig {
  const config = TVM_CHAIN_CONFIGS[chainAlias];
  if (!config) {
    throw new Error(`Unknown TVM chain alias: ${chainAlias}`);
  }

  if (rpcUrl) {
    return {
      ...config,
      rpcUrl,
      fullNodeUrl: rpcUrl,
      solidityNodeUrl: rpcUrl,
      eventServerUrl: rpcUrl,
    };
  }

  return { ...config };
}

/**
 * Check if a chain alias is a valid TVM chain
 */
export function isValidTvmChainAlias(chainAlias: string): chainAlias is TvmChainAlias {
  return chainAlias in TVM_CHAIN_CONFIGS;
}

/**
 * Get all supported TVM chain aliases
 */
export function getSupportedTvmChains(): TvmChainAlias[] {
  return Object.keys(TVM_CHAIN_CONFIGS) as TvmChainAlias[];
}
