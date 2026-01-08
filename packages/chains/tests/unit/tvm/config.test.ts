// packages/chains/tests/unit/tvm/config.test.ts

import { describe, it, expect } from 'vitest';
import {
  TVM_CHAIN_CONFIGS,
  getTvmChainConfig,
  isValidTvmChainAlias,
  getSupportedTvmChains,
} from '../../../src/tvm/config.js';

describe('TVM Chain Config', () => {
  describe('TVM_CHAIN_CONFIGS', () => {
    it('contains tron mainnet config', () => {
      const config = TVM_CHAIN_CONFIGS.tron;
      expect(config.chainAlias).toBe('tron');
      expect(config.network).toBe('mainnet');
      expect(config.nativeCurrency.symbol).toBe('TRX');
      expect(config.nativeCurrency.decimals).toBe(6);
      expect(config.rpcUrl).toContain('trongrid.io');
    });

    it('contains tron testnet config', () => {
      const config = TVM_CHAIN_CONFIGS['tron-testnet'];
      expect(config.chainAlias).toBe('tron-testnet');
      expect(config.network).toBe('testnet');
      expect(config.nativeCurrency.symbol).toBe('TRX');
      expect(config.rpcUrl).toContain('shasta');
    });

    it('has correct properties for all configs', () => {
      for (const [alias, config] of Object.entries(TVM_CHAIN_CONFIGS)) {
        expect(config.chainAlias).toBe(alias);
        expect(config.rpcUrl).toBeDefined();
        expect(config.fullNodeUrl).toBeDefined();
        expect(config.solidityNodeUrl).toBeDefined();
        expect(config.eventServerUrl).toBeDefined();
        expect(config.nativeCurrency).toBeDefined();
        expect(config.tokenPrefix).toBe('T');
      }
    });
  });

  describe('getTvmChainConfig', () => {
    it('returns correct config for tron', () => {
      const config = getTvmChainConfig('tron');
      expect(config.chainAlias).toBe('tron');
      expect(config.network).toBe('mainnet');
    });

    it('returns correct config for tron-testnet', () => {
      const config = getTvmChainConfig('tron-testnet');
      expect(config.chainAlias).toBe('tron-testnet');
      expect(config.network).toBe('testnet');
    });

    it('uses custom RPC URL when provided', () => {
      const customUrl = 'https://custom-tron-node.com';
      const config = getTvmChainConfig('tron', customUrl);
      expect(config.rpcUrl).toBe(customUrl);
      expect(config.fullNodeUrl).toBe(customUrl);
      expect(config.solidityNodeUrl).toBe(customUrl);
    });

    it('throws for unknown chain alias', () => {
      expect(() => getTvmChainConfig('unknown' as any)).toThrow('Unknown TVM chain alias');
    });
  });

  describe('isValidTvmChainAlias', () => {
    it('returns true for valid aliases', () => {
      expect(isValidTvmChainAlias('tron')).toBe(true);
      expect(isValidTvmChainAlias('tron-testnet')).toBe(true);
    });

    it('returns false for invalid aliases', () => {
      expect(isValidTvmChainAlias('ethereum')).toBe(false);
      expect(isValidTvmChainAlias('bitcoin')).toBe(false);
      expect(isValidTvmChainAlias('')).toBe(false);
    });
  });

  describe('getSupportedTvmChains', () => {
    it('returns all supported chain aliases', () => {
      const chains = getSupportedTvmChains();
      expect(chains).toContain('tron');
      expect(chains).toContain('tron-testnet');
      expect(chains.length).toBe(2);
    });
  });
});
