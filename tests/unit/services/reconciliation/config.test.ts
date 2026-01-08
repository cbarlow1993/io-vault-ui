import { describe, it, expect } from 'vitest';
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { getReorgThreshold, CHAIN_ALIAS_REORG_THRESHOLDS } from '@/src/services/reconciliation/config.js';

describe('reconciliation config', () => {
  describe('CHAIN_ALIAS_REORG_THRESHOLDS', () => {
    it('should have threshold for eth', () => {
      expect(CHAIN_ALIAS_REORG_THRESHOLDS['eth' as ChainAlias]).toBe(32);
    });

    it('should have threshold for bitcoin', () => {
      expect(CHAIN_ALIAS_REORG_THRESHOLDS['bitcoin' as ChainAlias]).toBe(6);
    });

    it('should have threshold for solana', () => {
      expect(CHAIN_ALIAS_REORG_THRESHOLDS['solana' as ChainAlias]).toBe(1);
    });

    it('should have threshold for polygon', () => {
      expect(CHAIN_ALIAS_REORG_THRESHOLDS['polygon' as ChainAlias]).toBe(128);
    });
  });

  describe('getReorgThreshold', () => {
    it('should return configured threshold for known chain alias', () => {
      expect(getReorgThreshold('eth' as ChainAlias)).toBe(32);
    });

    it('should return default threshold for unknown chain alias', () => {
      expect(getReorgThreshold('unknown-chain-alias' as ChainAlias)).toBe(32);
    });
  });
});
