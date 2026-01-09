// packages/chains/src/evm/config.ts
import type { ChainConfig, EvmChainAlias, RpcAuth } from '../core/types.js';

export interface EvmChainConfig extends ChainConfig {
  chainAlias: EvmChainAlias;
  chainId: number;
  supportsEip1559: boolean;
}

export const EVM_CHAIN_CONFIGS: Record<EvmChainAlias, EvmChainConfig> = {
  ethereum: {
    chainAlias: 'ethereum',
    chainId: 1,
    rpcUrl: 'https://nodes.iofinnet.com/internal/eth',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    supportsEip1559: true,
  },
  polygon: {
    chainAlias: 'polygon',
    chainId: 137,
    rpcUrl: 'https://nodes.iofinnet.com/internal/polygon',
    nativeCurrency: { symbol: 'POL', decimals: 18 },
    supportsEip1559: true,
  },
  arbitrum: {
    chainAlias: 'arbitrum',
    chainId: 42161,
    rpcUrl: 'https://nodes.iofinnet.com/internal/arbitrum',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    supportsEip1559: true,
  },
  optimism: {
    chainAlias: 'optimism',
    chainId: 10,
    rpcUrl: 'https://nodes.iofinnet.com/internal/optimism',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    supportsEip1559: true,
  },
  base: {
    chainAlias: 'base',
    chainId: 8453,
    rpcUrl: 'https://nodes.iofinnet.com/internal/base',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    supportsEip1559: true,
  },
  avalanche: {
    chainAlias: 'avalanche',
    chainId: 43114,
    rpcUrl: 'https://nodes.iofinnet.com/internal/avalanche',
    nativeCurrency: { symbol: 'AVAX', decimals: 18 },
    supportsEip1559: true,
  },
  bsc: {
    chainAlias: 'bsc',
    chainId: 56,
    rpcUrl: 'https://nodes.iofinnet.com/internal/bsc',
    nativeCurrency: { symbol: 'BNB', decimals: 18 },
    supportsEip1559: false,
  },
  fantom: {
    chainAlias: 'fantom',
    chainId: 250,
    rpcUrl: 'https://nodes.iofinnet.com/internal/fantom',
    nativeCurrency: { symbol: 'FTM', decimals: 18 },
    supportsEip1559: true,
  },
};

export function getEvmChainConfig(
  chainAlias: EvmChainAlias,
  options?: { rpcUrl?: string; auth?: RpcAuth }
): EvmChainConfig {
  const config = EVM_CHAIN_CONFIGS[chainAlias];

  const result = { ...config };

  if (options?.rpcUrl) {
    result.rpcUrl = options.rpcUrl;
  }

  if (options?.auth) {
    result.auth = options.auth;
  }

  return result;
}
