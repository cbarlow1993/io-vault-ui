// packages/chains/src/svm/config.ts
import type { ChainConfig, SvmChainAlias, RpcAuth } from '../core/types.js';

export interface SvmChainConfig extends ChainConfig {
  chainAlias: SvmChainAlias;
  cluster: 'mainnet-beta' | 'devnet';
}

export const SVM_CHAIN_CONFIGS: Record<SvmChainAlias, SvmChainConfig> = {
  solana: {
    chainAlias: 'solana',
    cluster: 'mainnet-beta',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    nativeCurrency: { symbol: 'SOL', decimals: 9 },
  },
  'solana-devnet': {
    chainAlias: 'solana-devnet',
    cluster: 'devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    nativeCurrency: { symbol: 'SOL', decimals: 9 },
  },
};

export function getSvmChainConfig(
  chainAlias: SvmChainAlias,
  options?: { rpcUrl?: string; auth?: RpcAuth }
): SvmChainConfig {
  const config = SVM_CHAIN_CONFIGS[chainAlias];

  const result = { ...config };

  if (options?.rpcUrl) {
    result.rpcUrl = options.rpcUrl;
  }

  if (options?.auth) {
    result.auth = options.auth;
  }

  return result;
}
