// packages/chains/src/evm/config.ts
import type { ChainConfig, EvmChainAlias } from '../core/types.js';

export interface EvmChainConfig extends ChainConfig {
  chainAlias: EvmChainAlias;
  chainId: number;
  supportsEip1559: boolean;
}

export const EVM_CHAIN_CONFIGS: Record<EvmChainAlias, EvmChainConfig> = {
  ethereum: {
    chainAlias: 'ethereum',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    supportsEip1559: true,
  },
  polygon: {
    chainAlias: 'polygon',
    chainId: 137,
    rpcUrl: 'https://polygon.llamarpc.com',
    nativeCurrency: { symbol: 'POL', decimals: 18 },
    supportsEip1559: true,
  },
  arbitrum: {
    chainAlias: 'arbitrum',
    chainId: 42161,
    rpcUrl: 'https://arbitrum.llamarpc.com',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    supportsEip1559: true,
  },
  optimism: {
    chainAlias: 'optimism',
    chainId: 10,
    rpcUrl: 'https://optimism.llamarpc.com',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    supportsEip1559: true,
  },
  base: {
    chainAlias: 'base',
    chainId: 8453,
    rpcUrl: 'https://base.llamarpc.com',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    supportsEip1559: true,
  },
  avalanche: {
    chainAlias: 'avalanche',
    chainId: 43114,
    rpcUrl: 'https://avalanche.public-rpc.com',
    nativeCurrency: { symbol: 'AVAX', decimals: 18 },
    supportsEip1559: true,
  },
  bsc: {
    chainAlias: 'bsc',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    nativeCurrency: { symbol: 'BNB', decimals: 18 },
    supportsEip1559: false,
  },
};

export function getEvmChainConfig(
  chainAlias: EvmChainAlias,
  rpcUrl?: string
): EvmChainConfig {
  const config = EVM_CHAIN_CONFIGS[chainAlias];
  if (rpcUrl) {
    return { ...config, rpcUrl };
  }
  return config;
}
