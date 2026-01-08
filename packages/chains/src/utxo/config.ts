// packages/chains/src/utxo/config.ts

import type { UtxoChainAlias, ChainConfig } from '../core/types.js';

// ============ UTXO Chain Config Interface ============

export interface UtxoChainConfig extends ChainConfig {
  chainAlias: UtxoChainAlias;
  network: 'mainnet' | 'testnet' | 'signet';
  bech32Prefix: string;
  pubKeyHashPrefix: number;
  scriptHashPrefix: number;
  wif: number;
  dustLimit: number; // Minimum satoshis for a valid output
}

// ============ UTXO Chain Configs ============

export const UTXO_CHAIN_CONFIGS: Record<UtxoChainAlias, UtxoChainConfig> = {
  bitcoin: {
    chainAlias: 'bitcoin',
    network: 'mainnet',
    rpcUrl: 'https://blockstream.info/api',
    nativeCurrency: {
      name: 'Bitcoin',
      symbol: 'BTC',
      decimals: 8,
    },
    bech32Prefix: 'bc',
    pubKeyHashPrefix: 0x00,
    scriptHashPrefix: 0x05,
    wif: 0x80,
    dustLimit: 546,
  },
  'bitcoin-testnet': {
    chainAlias: 'bitcoin-testnet',
    network: 'testnet',
    rpcUrl: 'https://blockstream.info/testnet/api',
    nativeCurrency: {
      name: 'Bitcoin',
      symbol: 'tBTC',
      decimals: 8,
    },
    bech32Prefix: 'tb',
    pubKeyHashPrefix: 0x6f,
    scriptHashPrefix: 0xc4,
    wif: 0xef,
    dustLimit: 546,
  },
  'bitcoin-signet': {
    chainAlias: 'bitcoin-signet',
    network: 'signet',
    rpcUrl: 'https://mempool.space/signet/api',
    nativeCurrency: {
      name: 'Bitcoin',
      symbol: 'sBTC',
      decimals: 8,
    },
    bech32Prefix: 'tb',
    pubKeyHashPrefix: 0x6f,
    scriptHashPrefix: 0xc4,
    wif: 0xef,
    dustLimit: 546,
  },
  litecoin: {
    chainAlias: 'litecoin',
    network: 'mainnet',
    rpcUrl: 'https://litecoinspace.org/api',
    nativeCurrency: {
      name: 'Litecoin',
      symbol: 'LTC',
      decimals: 8,
    },
    bech32Prefix: 'ltc',
    pubKeyHashPrefix: 0x30,
    scriptHashPrefix: 0x32,
    wif: 0xb0,
    dustLimit: 5460,
  },
  dogecoin: {
    chainAlias: 'dogecoin',
    network: 'mainnet',
    rpcUrl: 'https://dogechain.info/api/v1',
    nativeCurrency: {
      name: 'Dogecoin',
      symbol: 'DOGE',
      decimals: 8,
    },
    bech32Prefix: '', // Dogecoin doesn't use bech32
    pubKeyHashPrefix: 0x1e,
    scriptHashPrefix: 0x16,
    wif: 0x9e,
    dustLimit: 100000000, // 1 DOGE
  },
};

// ============ Helper Functions ============

export function getUtxoChainConfig(chainAlias: UtxoChainAlias, rpcUrl?: string): UtxoChainConfig {
  const config = UTXO_CHAIN_CONFIGS[chainAlias];
  if (!config) {
    throw new Error(`Unknown UTXO chain alias: ${chainAlias}`);
  }
  return rpcUrl ? { ...config, rpcUrl } : config;
}

export function isValidUtxoChainAlias(alias: string): alias is UtxoChainAlias {
  return alias in UTXO_CHAIN_CONFIGS;
}
