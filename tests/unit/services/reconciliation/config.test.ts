import { describe, it, expect } from 'vitest';
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { getReorgThreshold } from '@/src/services/reconciliation/config.js';
import { ReorgThreshold } from '@/src/domain/value-objects/index.js';

describe('reconciliation config', () => {
  describe('ReorgThreshold (domain value object)', () => {
    describe('forChain', () => {
      it('should return threshold for eth-mainnet', () => {
        expect(ReorgThreshold.forChain('eth-mainnet' as ChainAlias)).toBe(32);
      });

      it('should return threshold for btc-mainnet', () => {
        expect(ReorgThreshold.forChain('btc-mainnet' as ChainAlias)).toBe(6);
      });

      it('should return threshold for solana-mainnet', () => {
        expect(ReorgThreshold.forChain('solana-mainnet' as ChainAlias)).toBe(1);
      });

      it('should return threshold for polygon-mainnet', () => {
        expect(ReorgThreshold.forChain('polygon-mainnet' as ChainAlias)).toBe(128);
      });

      it('should return default threshold for unknown chain alias', () => {
        expect(ReorgThreshold.forChain('unknown-chain-alias' as ChainAlias)).toBe(32);
      });
    });

    describe('calculateSafeFromBlock', () => {
      it('should subtract threshold from checkpoint', () => {
        expect(ReorgThreshold.calculateSafeFromBlock(1000, 'eth-mainnet' as ChainAlias)).toBe(968);
      });

      it('should return 0 when checkpoint is less than threshold', () => {
        expect(ReorgThreshold.calculateSafeFromBlock(10, 'eth-mainnet' as ChainAlias)).toBe(0);
      });

      it('should use chain-specific threshold', () => {
        // Polygon has 128 block threshold
        expect(ReorgThreshold.calculateSafeFromBlock(200, 'polygon-mainnet' as ChainAlias)).toBe(72);
      });
    });

    describe('defaultThreshold', () => {
      it('should return 32', () => {
        expect(ReorgThreshold.defaultThreshold).toBe(32);
      });
    });
  });

  describe('getReorgThreshold (deprecated)', () => {
    it('should delegate to ReorgThreshold.forChain', () => {
      expect(getReorgThreshold('eth-mainnet' as ChainAlias)).toBe(32);
    });

    it('should return default threshold for unknown chain alias', () => {
      expect(getReorgThreshold('unknown-chain-alias' as ChainAlias)).toBe(32);
    });
  });
});
