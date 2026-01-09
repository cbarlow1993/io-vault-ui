import { describe, expect, it } from 'vitest';
import { ReorgThreshold } from '@/src/domain/value-objects/reorg-threshold.js';
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

describe('ReorgThreshold', () => {
  describe('forChain', () => {
    it('returns correct threshold for Ethereum mainnet', () => {
      expect(ReorgThreshold.forChain('eth-mainnet' as ChainAlias)).toBe(32);
    });

    it('returns correct threshold for Polygon (higher due to reorg frequency)', () => {
      expect(ReorgThreshold.forChain('polygon-mainnet' as ChainAlias)).toBe(128);
    });

    it('returns correct threshold for Polygon Amoy testnet', () => {
      expect(ReorgThreshold.forChain('polygon-amoy' as ChainAlias)).toBe(128);
    });

    it('returns correct threshold for Bitcoin', () => {
      expect(ReorgThreshold.forChain('btc-mainnet' as ChainAlias)).toBe(6);
    });

    it('returns correct threshold for Solana', () => {
      expect(ReorgThreshold.forChain('solana-mainnet' as ChainAlias)).toBe(1);
    });

    it('returns correct threshold for XRP Ledger', () => {
      expect(ReorgThreshold.forChain('xrpl-mainnet' as ChainAlias)).toBe(1);
    });

    it('returns correct threshold for L2 chains', () => {
      expect(ReorgThreshold.forChain('arbitrum-mainnet' as ChainAlias)).toBe(32);
      expect(ReorgThreshold.forChain('optimism-mainnet' as ChainAlias)).toBe(32);
      expect(ReorgThreshold.forChain('base-mainnet' as ChainAlias)).toBe(32);
    });

    it('returns correct threshold for testnets', () => {
      expect(ReorgThreshold.forChain('eth-sepolia' as ChainAlias)).toBe(32);
      expect(ReorgThreshold.forChain('arbitrum-sepolia' as ChainAlias)).toBe(32);
    });

    it('returns default threshold for unknown chains', () => {
      expect(ReorgThreshold.forChain('unknown-chain' as ChainAlias)).toBe(32);
    });
  });

  describe('calculateSafeFromBlock', () => {
    it('calculates safe starting block for Ethereum', () => {
      const checkpoint = 1000;
      expect(ReorgThreshold.calculateSafeFromBlock(checkpoint, 'eth-mainnet' as ChainAlias)).toBe(
        968
      ); // 1000 - 32
    });

    it('calculates safe starting block for Polygon (larger threshold)', () => {
      const checkpoint = 1000;
      expect(
        ReorgThreshold.calculateSafeFromBlock(checkpoint, 'polygon-mainnet' as ChainAlias)
      ).toBe(872); // 1000 - 128
    });

    it('calculates safe starting block for Bitcoin', () => {
      const checkpoint = 100;
      expect(ReorgThreshold.calculateSafeFromBlock(checkpoint, 'btc-mainnet' as ChainAlias)).toBe(
        94
      ); // 100 - 6
    });

    it('returns 0 for blocks near genesis', () => {
      expect(ReorgThreshold.calculateSafeFromBlock(10, 'eth-mainnet' as ChainAlias)).toBe(0);
      expect(ReorgThreshold.calculateSafeFromBlock(31, 'eth-mainnet' as ChainAlias)).toBe(0);
    });

    it('returns 0 for checkpoint of 0', () => {
      expect(ReorgThreshold.calculateSafeFromBlock(0, 'eth-mainnet' as ChainAlias)).toBe(0);
    });

    it('returns exactly 0 when checkpoint equals threshold', () => {
      expect(ReorgThreshold.calculateSafeFromBlock(32, 'eth-mainnet' as ChainAlias)).toBe(0);
      expect(ReorgThreshold.calculateSafeFromBlock(128, 'polygon-mainnet' as ChainAlias)).toBe(0);
    });
  });

  describe('defaultThreshold', () => {
    it('returns 32 as the default threshold', () => {
      expect(ReorgThreshold.defaultThreshold).toBe(32);
    });
  });
});
