import { describe, expect, it } from 'vitest';
import { ReorgThreshold } from '@/src/domain/value-objects/reorg-threshold.js';
import type { ChainAlias } from '@/src/core/types.js';

describe('ReorgThreshold', () => {
  describe('forChain', () => {
    it('returns correct threshold for Ethereum', () => {
      expect(ReorgThreshold.forChain('ethereum')).toBe(32);
    });

    it('returns correct threshold for Polygon (higher due to reorg frequency)', () => {
      expect(ReorgThreshold.forChain('polygon')).toBe(128);
    });

    it('returns correct threshold for Bitcoin', () => {
      expect(ReorgThreshold.forChain('bitcoin')).toBe(6);
    });

    it('returns correct threshold for Solana', () => {
      expect(ReorgThreshold.forChain('solana')).toBe(1);
    });

    it('returns default threshold for unknown chains', () => {
      expect(ReorgThreshold.forChain('unknown-chain' as ChainAlias)).toBe(32);
    });
  });

  describe('calculateSafeFromBlock', () => {
    it('calculates safe starting block', () => {
      const checkpoint = 1000;
      const chain: ChainAlias = 'ethereum';
      expect(ReorgThreshold.calculateSafeFromBlock(checkpoint, chain)).toBe(968); // 1000 - 32
    });

    it('returns 0 for blocks near genesis', () => {
      expect(ReorgThreshold.calculateSafeFromBlock(10, 'ethereum')).toBe(0);
    });

    it('returns 0 for checkpoint of 0', () => {
      expect(ReorgThreshold.calculateSafeFromBlock(0, 'ethereum')).toBe(0);
    });
  });
});
