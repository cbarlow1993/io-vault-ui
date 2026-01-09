// packages/chains/src/utxo/config.ts

import type { UtxoChainAlias, ChainConfig, RpcAuth } from '../core/types.js';

// ============ UTXO Chain Config Interface ============

export interface UtxoChainConfig extends ChainConfig {
  chainAlias: UtxoChainAlias;
  network: 'mainnet' | 'testnet' | 'signet';
  bech32Prefix: string;
  pubKeyHashPrefix: number;
  scriptHashPrefix: number;
  wif: number;
  dustLimit: number; // Minimum satoshis for a valid output
  taprootSupported: boolean; // Whether P2TR addresses are supported
}

// ============ UTXO Chain Configs ============

export const UTXO_CHAIN_CONFIGS: Record<UtxoChainAlias, UtxoChainConfig> = {
  bitcoin: {
    chainAlias: 'bitcoin',
    network: 'mainnet',
    rpcUrl: 'https://attentive-attentive-liquid.btc.quiknode.pro/de06a76c6f93fa3c0614ded00a2f332963620310/',
    nativeCurrency: {
      symbol: 'BTC',
      decimals: 8,
    },
    bech32Prefix: 'bc',
    pubKeyHashPrefix: 0x00,
    scriptHashPrefix: 0x05,
    wif: 0x80,
    dustLimit: 546,
    taprootSupported: true,
  },
  'bitcoin-testnet': {
    chainAlias: 'bitcoin-testnet',
    network: 'testnet',
    rpcUrl: 'https://testnet-blockbook.example.com/', // Update with actual testnet Blockbook URL
    nativeCurrency: {
      symbol: 'tBTC',
      decimals: 8,
    },
    bech32Prefix: 'tb',
    pubKeyHashPrefix: 0x6f,
    scriptHashPrefix: 0xc4,
    wif: 0xef,
    dustLimit: 546,
    taprootSupported: true,
  },
  mnee: {
    chainAlias: 'mnee',
    network: 'mainnet',
    rpcUrl: 'https://mnee-blockbook.example.com/', // Update with actual MNEE Blockbook URL
    nativeCurrency: {
      symbol: 'MNEE',
      decimals: 8,
    },
    bech32Prefix: 'bc',
    pubKeyHashPrefix: 0x00,
    scriptHashPrefix: 0x05,
    wif: 0x80,
    dustLimit: 546,
    taprootSupported: false, // MNEE may not support Taproot
  },
};

// ============ Helper Functions ============

export function getUtxoChainConfig(
  chainAlias: UtxoChainAlias,
  options?: { rpcUrl?: string; auth?: RpcAuth }
): UtxoChainConfig {
  const config = UTXO_CHAIN_CONFIGS[chainAlias];
  if (!config) {
    throw new Error(`Unknown UTXO chain alias: ${chainAlias}`);
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

export function isValidUtxoChainAlias(alias: string): alias is UtxoChainAlias {
  return alias in UTXO_CHAIN_CONFIGS;
}
