// packages/chains/src/xrp/config.ts

import type { ChainConfig, RpcAuth } from '../core/types.js';

/**
 * XRP Ledger-specific chain configuration
 */
export interface XrpChainConfig extends ChainConfig {
  /** Network type (mainnet or testnet) */
  network: 'mainnet' | 'testnet';
  /** The WebSocket URL for streaming connections */
  websocketUrl: string;
  /** Network ID for signing (0 = mainnet, 1 = testnet) */
  networkId: number;
  /** Reserve base amount in drops */
  reserveBase: bigint;
  /** Reserve increment per object in drops */
  reserveIncrement: bigint;
}

/**
 * XRP chain alias type
 */
export type XrpChainAlias = 'xrp' | 'xrp-testnet';

/**
 * XRP chain configurations
 */
export const XRP_CHAIN_CONFIGS: Record<XrpChainAlias, XrpChainConfig> = {
  xrp: {
    chainAlias: 'xrp',
    chainId: 0,
    network: 'mainnet',
    rpcUrl: 'https://xrplcluster.com',
    websocketUrl: 'wss://xrplcluster.com',
    nativeCurrency: {
      symbol: 'XRP',
      decimals: 6,
    },
    networkId: 0,
    reserveBase: 10_000_000n, // 10 XRP
    reserveIncrement: 2_000_000n, // 2 XRP per object
  },
  'xrp-testnet': {
    chainAlias: 'xrp-testnet',
    chainId: 1,
    network: 'testnet',
    rpcUrl: 'https://s.altnet.rippletest.net:51234',
    websocketUrl: 'wss://s.altnet.rippletest.net:51233',
    nativeCurrency: {
      symbol: 'XRP',
      decimals: 6,
    },
    networkId: 1,
    reserveBase: 10_000_000n, // 10 XRP
    reserveIncrement: 2_000_000n, // 2 XRP per object
  },
};

/**
 * Get XRP chain configuration by alias
 */
export function getXrpChainConfig(
  alias: XrpChainAlias,
  options?: { rpcUrl?: string; auth?: RpcAuth }
): XrpChainConfig {
  const config = XRP_CHAIN_CONFIGS[alias];
  if (!config) {
    throw new Error(`Unknown XRP chain alias: ${alias}`);
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

/**
 * Check if a chain alias is a valid XRP chain
 */
export function isValidXrpChainAlias(alias: string): alias is XrpChainAlias {
  return alias in XRP_CHAIN_CONFIGS;
}

/**
 * Get all supported XRP chain aliases
 */
export function getSupportedXrpChains(): XrpChainAlias[] {
  return Object.keys(XRP_CHAIN_CONFIGS) as XrpChainAlias[];
}
