// packages/chains/tests/unit/xrp/config.test.ts

import { describe, it, expect } from 'vitest';
import {
  XRP_CHAIN_CONFIGS,
  getXrpChainConfig,
  isValidXrpChainAlias,
  getSupportedXrpChains,
} from '../../../src/xrp/config.js';

describe('XRP Chain Config', () => {
  describe('XRP_CHAIN_CONFIGS', () => {
    it('contains xrp mainnet config', () => {
      const config = XRP_CHAIN_CONFIGS.xrp;
      expect(config.chainAlias).toBe('xrp');
      expect(config.network).toBe('mainnet');
      expect(config.nativeCurrency.symbol).toBe('XRP');
      expect(config.nativeCurrency.decimals).toBe(6);
      expect(config.rpcUrl).toContain('xrplcluster.com');
      expect(config.websocketUrl).toBeDefined();
      expect(config.networkId).toBe(0);
      expect(config.reserveBase).toBe(10_000_000n);
      expect(config.reserveIncrement).toBe(2_000_000n);
    });

    it('contains xrp testnet config', () => {
      const config = XRP_CHAIN_CONFIGS['xrp-testnet'];
      expect(config.chainAlias).toBe('xrp-testnet');
      expect(config.network).toBe('testnet');
      expect(config.nativeCurrency.symbol).toBe('XRP');
      expect(config.rpcUrl).toContain('rippletest.net');
      expect(config.networkId).toBe(1);
    });

    it('has correct properties for all configs', () => {
      for (const [alias, config] of Object.entries(XRP_CHAIN_CONFIGS)) {
        expect(config.chainAlias).toBe(alias);
        expect(config.rpcUrl).toBeDefined();
        expect(config.websocketUrl).toBeDefined();
        expect(config.nativeCurrency).toBeDefined();
        expect(config.reserveBase).toBeGreaterThan(0n);
        expect(config.reserveIncrement).toBeGreaterThan(0n);
      }
    });
  });

  describe('getXrpChainConfig', () => {
    it('returns correct config for xrp', () => {
      const config = getXrpChainConfig('xrp');
      expect(config.chainAlias).toBe('xrp');
      expect(config.network).toBe('mainnet');
    });

    it('returns correct config for xrp-testnet', () => {
      const config = getXrpChainConfig('xrp-testnet');
      expect(config.chainAlias).toBe('xrp-testnet');
      expect(config.network).toBe('testnet');
    });

    it('uses custom RPC URL when provided', () => {
      const customUrl = 'https://custom-xrp-node.com';
      const config = getXrpChainConfig('xrp', { rpcUrl: customUrl });
      expect(config.rpcUrl).toBe(customUrl);
    });

    it('throws for unknown chain alias', () => {
      expect(() => getXrpChainConfig('unknown' as any)).toThrow('Unknown XRP chain alias');
    });
  });

  describe('isValidXrpChainAlias', () => {
    it('returns true for valid aliases', () => {
      expect(isValidXrpChainAlias('xrp')).toBe(true);
      expect(isValidXrpChainAlias('xrp-testnet')).toBe(true);
    });

    it('returns false for invalid aliases', () => {
      expect(isValidXrpChainAlias('ethereum')).toBe(false);
      expect(isValidXrpChainAlias('bitcoin')).toBe(false);
      expect(isValidXrpChainAlias('')).toBe(false);
    });
  });

  describe('getSupportedXrpChains', () => {
    it('returns all supported chain aliases', () => {
      const chains = getSupportedXrpChains();
      expect(chains).toContain('xrp');
      expect(chains).toContain('xrp-testnet');
      expect(chains.length).toBe(2);
    });
  });
});
