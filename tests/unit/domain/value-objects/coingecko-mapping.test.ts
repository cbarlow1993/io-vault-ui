import { describe, expect, it } from 'vitest';
import {
  getNativeCoingeckoId,
  hasCoingeckoMapping,
  getSupportedChains,
  NATIVE_COINGECKO_IDS,
} from '@/src/domain/value-objects/index.js';
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

describe('coingecko-mapping', () => {
  describe('getNativeCoingeckoId', () => {
    it('returns correct ID for ethereum', () => {
      expect(getNativeCoingeckoId('ethereum')).toBe('ethereum');
    });

    it('returns correct ID for polygon', () => {
      expect(getNativeCoingeckoId('polygon')).toBe('polygon-ecosystem-token');
    });

    it('returns correct ID for L2s using ETH', () => {
      expect(getNativeCoingeckoId('arbitrum')).toBe('ethereum');
      expect(getNativeCoingeckoId('optimism')).toBe('ethereum');
      expect(getNativeCoingeckoId('base')).toBe('ethereum');
    });

    it('returns correct ID for solana', () => {
      expect(getNativeCoingeckoId('solana')).toBe('solana');
    });

    it('returns correct ID for bitcoin', () => {
      expect(getNativeCoingeckoId('bitcoin')).toBe('bitcoin');
    });

    it('returns correct ID for bsc', () => {
      expect(getNativeCoingeckoId('bsc')).toBe('binancecoin');
    });

    it('returns correct ID for avalanche', () => {
      expect(getNativeCoingeckoId('avalanche')).toBe('avalanche-2');
    });

    it('returns correct ID for tron', () => {
      expect(getNativeCoingeckoId('tron')).toBe('tron');
    });

    it('returns correct ID for xrp', () => {
      expect(getNativeCoingeckoId('xrp')).toBe('ripple');
    });

    it('returns null for unknown chain', () => {
      expect(getNativeCoingeckoId('unknown-chain' as ChainAlias)).toBeNull();
    });

    // Testnets
    it('maps testnets to mainnet IDs', () => {
      expect(getNativeCoingeckoId('ethereum-sepolia')).toBe('ethereum');
      expect(getNativeCoingeckoId('solana-devnet')).toBe('solana');
      expect(getNativeCoingeckoId('polygon-amoy')).toBe('polygon-ecosystem-token');
      expect(getNativeCoingeckoId('arbitrum-sepolia')).toBe('ethereum');
      expect(getNativeCoingeckoId('optimism-sepolia')).toBe('ethereum');
      expect(getNativeCoingeckoId('base-sepolia')).toBe('ethereum');
      expect(getNativeCoingeckoId('avalanche-fuji')).toBe('avalanche-2');
      expect(getNativeCoingeckoId('bsc-testnet')).toBe('binancecoin');
    });
  });

  describe('hasCoingeckoMapping', () => {
    it('returns true for supported chains', () => {
      expect(hasCoingeckoMapping('ethereum')).toBe(true);
      expect(hasCoingeckoMapping('polygon')).toBe(true);
      expect(hasCoingeckoMapping('solana')).toBe(true);
      expect(hasCoingeckoMapping('bitcoin')).toBe(true);
    });

    it('returns false for unsupported chains', () => {
      expect(hasCoingeckoMapping('unknown-chain')).toBe(false);
    });
  });

  describe('getSupportedChains', () => {
    it('returns array of all supported chains', () => {
      const chains = getSupportedChains();
      expect(chains).toContain('ethereum');
      expect(chains).toContain('polygon');
      expect(chains).toContain('solana');
      expect(chains).toContain('bitcoin');
      expect(Array.isArray(chains)).toBe(true);
    });

    it('matches keys in NATIVE_COINGECKO_IDS', () => {
      const chains = getSupportedChains();
      expect(chains.length).toBe(Object.keys(NATIVE_COINGECKO_IDS).length);
    });
  });

  describe('NATIVE_COINGECKO_IDS', () => {
    it('contains both mainnet and testnet chains', () => {
      // Mainnet
      expect(NATIVE_COINGECKO_IDS['ethereum']).toBeDefined();
      // Testnet
      expect(NATIVE_COINGECKO_IDS['ethereum-sepolia']).toBeDefined();
    });
  });
});
