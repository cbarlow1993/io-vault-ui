import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { describe, it, expect } from 'vitest';
import { getCoinGeckoPlatform, isCoinGeckoSupported, COINGECKO_PLATFORM_MAP } from '@/src/config/chain-mappings/coingecko.js';

describe('coingecko chain mapping', () => {
  describe('getCoinGeckoPlatform', () => {
    it('returns coingecko platform id for supported chains', () => {
      // Core EVM chains
      expect(getCoinGeckoPlatform('eth')).toBe('ethereum');
      expect(getCoinGeckoPlatform('polygon')).toBe('polygon-pos');
      expect(getCoinGeckoPlatform('arbitrum')).toBe('arbitrum-one');
      expect(getCoinGeckoPlatform('optimism')).toBe('optimistic-ethereum');
      expect(getCoinGeckoPlatform('base')).toBe('base');
      expect(getCoinGeckoPlatform('avalanche-c')).toBe('avalanche');
      expect(getCoinGeckoPlatform('bsc')).toBe('binance-smart-chain');
      expect(getCoinGeckoPlatform('fantom')).toBe('fantom');
    });

    it('returns coingecko platform id for additional supported chains', () => {
      // Additional chains from chainAliasMapper
      expect(getCoinGeckoPlatform('gnosis')).toBe('xdai');
      expect(getCoinGeckoPlatform('zksync-era')).toBe('zksync');
      expect(getCoinGeckoPlatform('metis')).toBe('metis-andromeda');
      expect(getCoinGeckoPlatform('fraxtal')).toBe('fraxtal');
    });

    it('returns undefined for unsupported chains', () => {
      expect(getCoinGeckoPlatform('solana')).toBeUndefined();
      expect(getCoinGeckoPlatform('bitcoin')).toBeUndefined();
      expect(getCoinGeckoPlatform('unknown-chain' as ChainAlias)).toBeUndefined();
    });

    it('returns undefined for testnets', () => {
      expect(getCoinGeckoPlatform('eth-sepolia')).toBeUndefined();
      expect(getCoinGeckoPlatform('goerli' as ChainAlias)).toBeUndefined();
      expect(getCoinGeckoPlatform('polygon-mumbai' as ChainAlias)).toBeUndefined();
    });
  });

  describe('isCoinGeckoSupported', () => {
    it('returns true for supported chains', () => {
      expect(isCoinGeckoSupported('eth')).toBe(true);
      expect(isCoinGeckoSupported('polygon')).toBe(true);
      expect(isCoinGeckoSupported('arbitrum')).toBe(true);
    });

    it('returns false for unsupported chains', () => {
      expect(isCoinGeckoSupported('solana')).toBe(false);
      expect(isCoinGeckoSupported('bitcoin')).toBe(false);
    });

    it('returns false for testnets', () => {
      expect(isCoinGeckoSupported('eth-sepolia')).toBe(false);
      expect(isCoinGeckoSupported('goerli' as ChainAlias)).toBe(false);
    });
  });

  describe('COINGECKO_PLATFORM_MAP', () => {
    it('contains all expected EVM mainnets', () => {
      const expectedChains = [
        'ethereum',
        'polygon',
        'arbitrum',
        'optimism',
        'base',
        'avalanche',
        'avalanche_c',
        'bsc',
        'fantom',
        'gnosis',
        'zksync_era',
        'metis',
        'fraxtal',
        'dfk',
        'metal',
        'morph',
        'quai',
        'xdc',
        'zora',
        'xrp',
      ];

      for (const chain of expectedChains) {
        expect(COINGECKO_PLATFORM_MAP).toHaveProperty(chain);
      }
    });

    it('does not contain Solana or testnets', () => {
      expect(COINGECKO_PLATFORM_MAP).not.toHaveProperty('solana');
      expect(COINGECKO_PLATFORM_MAP).not.toHaveProperty('sepolia');
      expect(COINGECKO_PLATFORM_MAP).not.toHaveProperty('goerli');
    });
  });
});
