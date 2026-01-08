import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { describe, it, expect } from 'vitest';
import { getNovesChain, isNovesSupported } from '@/src/config/chain-mappings/noves.js';

describe('noves chain mapping', () => {
  describe('getNovesChain', () => {
    it('returns noves chain id for supported EVM chains', () => {
      expect(getNovesChain('eth')).toBe('eth');
      expect(getNovesChain('polygon')).toBe('polygon');
      expect(getNovesChain('arbitrum')).toBe('arbitrum');
      expect(getNovesChain('avalanche-c')).toBe('avalanche');
    });

    it('returns noves chain id for non-EVM chains', () => {
      expect(getNovesChain('bitcoin')).toBe('btc');
      expect(getNovesChain('ripple')).toBe('xrpl');
    });

    it('returns noves chain id for SVM chains', () => {
      expect(getNovesChain('solana')).toBe('solana');
    });

    it('returns undefined for unsupported chains', () => {
      expect(getNovesChain('unsupported-chain' as ChainAlias)).toBeUndefined();
    });
  });

  describe('isNovesSupported', () => {
    it('returns true for supported chains', () => {
      expect(isNovesSupported('eth')).toBe(true);
      expect(isNovesSupported('polygon')).toBe(true);
      expect(isNovesSupported('bitcoin')).toBe(true);
      expect(isNovesSupported('ripple')).toBe(true);
    });

    it('returns false for unsupported chains', () => {
      expect(isNovesSupported('unsupported-chain' as ChainAlias)).toBe(false);
    });
  });
});
