// packages/chains/src/substrate/config.ts

import type { SubstrateChainAlias, RpcAuth } from '../core/types.js';

export interface SubstrateChainConfig {
  chainAlias: SubstrateChainAlias;
  ss58Prefix: number;
  rpcUrl: string;
  nativeCurrency: {
    symbol: string;
    decimals: number;
  };
  genesisHash?: string;
  specVersion?: number;
  transactionVersion?: number;
  signatureScheme: 'sr25519' | 'ed25519';
  /** RPC authentication configuration */
  auth?: RpcAuth;
}

const SUBSTRATE_CHAIN_CONFIGS: Record<SubstrateChainAlias, SubstrateChainConfig> = {
  bittensor: {
    chainAlias: 'bittensor',
    ss58Prefix: 42,
    rpcUrl: 'wss://entrypoint-finney.opentensor.ai:443',
    nativeCurrency: {
      symbol: 'TAO',
      decimals: 9,
    },
    genesisHash: '0x2f0555cc76fc2840a25a6ea3b9637146806f1f44b090c175ffde2a7e5ab36c03',
    signatureScheme: 'sr25519',
  },
  'bittensor-testnet': {
    chainAlias: 'bittensor-testnet',
    ss58Prefix: 42,
    rpcUrl: 'wss://test.finney.opentensor.ai:443',
    nativeCurrency: {
      symbol: 'TAO',
      decimals: 9,
    },
    signatureScheme: 'sr25519',
  },
};

export function getSubstrateChainConfig(
  chainAlias: SubstrateChainAlias,
  options?: { rpcUrl?: string; auth?: RpcAuth }
): SubstrateChainConfig {
  const config = SUBSTRATE_CHAIN_CONFIGS[chainAlias];
  if (!config) {
    throw new Error(`Unknown substrate chain: ${chainAlias}`);
  }

  const result = { ...config };

  if (options?.rpcUrl) {
    result.rpcUrl = options.rpcUrl;
  }

  if (options?.auth) {
    result.auth = options.auth;
  }

  return result;
}

export function isSubstrateChainAlias(alias: string): alias is SubstrateChainAlias {
  return alias in SUBSTRATE_CHAIN_CONFIGS;
}

export function getSubstrateChainAliases(): SubstrateChainAlias[] {
  return Object.keys(SUBSTRATE_CHAIN_CONFIGS) as SubstrateChainAlias[];
}
