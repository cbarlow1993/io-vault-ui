// packages/chains/tests/unit/api.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getChainProvider,
  configure,
  isEvmProvider,
  isSvmProvider,
  isUtxoProvider,
  isTvmProvider,
  isXrpProvider,
  isSubstrateProvider,
} from '../../src/api.js';
import { providerCache } from '../../src/core/provider-cache.js';
import { getAllChainAliases, getChainAliasesByEcosystem } from '../../src/core/registry.js';

describe('Public API', () => {
  beforeEach(() => {
    // Clear provider cache before each test
    providerCache.clear();
  });

  describe('getChainProvider', () => {
    describe('resolves provider for all chain aliases', () => {
      const allChains = getAllChainAliases();

      it.each(allChains)('returns provider for %s', (chainAlias) => {
        const provider = getChainProvider(chainAlias);
        expect(provider).toBeDefined();
        expect(provider.chainAlias).toBe(chainAlias);
        expect(provider.config).toBeDefined();
      });
    });

    describe('EVM chains', () => {
      const evmChains = getChainAliasesByEcosystem('evm');

      it.each(evmChains)('returns EVM provider for %s', (chainAlias) => {
        const provider = getChainProvider(chainAlias);
        expect(isEvmProvider(provider)).toBe(true);
      });
    });

    describe('SVM chains', () => {
      const svmChains = getChainAliasesByEcosystem('svm');

      it.each(svmChains)('returns SVM provider for %s', (chainAlias) => {
        const provider = getChainProvider(chainAlias);
        expect(isSvmProvider(provider)).toBe(true);
      });
    });

    describe('UTXO chains', () => {
      const utxoChains = getChainAliasesByEcosystem('utxo');

      it.each(utxoChains)('returns UTXO provider for %s', (chainAlias) => {
        const provider = getChainProvider(chainAlias);
        expect(isUtxoProvider(provider)).toBe(true);
      });
    });

    describe('TVM chains', () => {
      const tvmChains = getChainAliasesByEcosystem('tvm');

      it.each(tvmChains)('returns TVM provider for %s', (chainAlias) => {
        const provider = getChainProvider(chainAlias);
        expect(isTvmProvider(provider)).toBe(true);
      });
    });

    describe('XRP chains', () => {
      const xrpChains = getChainAliasesByEcosystem('xrp');

      it.each(xrpChains)('returns XRP provider for %s', (chainAlias) => {
        const provider = getChainProvider(chainAlias);
        expect(isXrpProvider(provider)).toBe(true);
      });
    });

    describe('Substrate chains', () => {
      const substrateChains = getChainAliasesByEcosystem('substrate');

      it.each(substrateChains)('returns Substrate provider for %s', (chainAlias) => {
        const provider = getChainProvider(chainAlias);
        expect(isSubstrateProvider(provider)).toBe(true);
      });
    });

    it('throws for unsupported chain', () => {
      expect(() => getChainProvider('fake-chain' as any)).toThrow('Unsupported chain');
    });

    it('caches providers', () => {
      const provider1 = getChainProvider('ethereum');
      const provider2 = getChainProvider('ethereum');
      expect(provider1).toBe(provider2);
    });

    it('creates different providers for different RPC URLs', () => {
      const provider1 = getChainProvider('ethereum');
      const provider2 = getChainProvider('ethereum', 'https://custom-rpc.example.com');
      expect(provider1).not.toBe(provider2);
    });
  });

  describe('configure', () => {
    afterEach(() => {
      // Reset config
      configure({ rpcOverrides: {} });
      providerCache.clear();
    });

    it('applies global RPC overrides', () => {
      const customRpc = 'https://custom-ethereum-rpc.example.com';
      configure({ rpcOverrides: { ethereum: customRpc } });

      const provider = getChainProvider('ethereum');
      expect(provider.config.rpcUrl).toBe(customRpc);
    });
  });

  describe('provider type guards', () => {
    it('isEvmProvider returns true for EVM provider', () => {
      const provider = getChainProvider('ethereum');
      expect(isEvmProvider(provider)).toBe(true);
      expect(isSvmProvider(provider)).toBe(false);
    });

    it('isSvmProvider returns true for SVM provider', () => {
      const provider = getChainProvider('solana');
      expect(isSvmProvider(provider)).toBe(true);
      expect(isEvmProvider(provider)).toBe(false);
    });

    it('isUtxoProvider returns true for UTXO provider', () => {
      const provider = getChainProvider('bitcoin');
      expect(isUtxoProvider(provider)).toBe(true);
      expect(isEvmProvider(provider)).toBe(false);
    });

    it('isTvmProvider returns true for TVM provider', () => {
      const provider = getChainProvider('tron');
      expect(isTvmProvider(provider)).toBe(true);
      expect(isEvmProvider(provider)).toBe(false);
    });

    it('isXrpProvider returns true for XRP provider', () => {
      const provider = getChainProvider('xrp');
      expect(isXrpProvider(provider)).toBe(true);
      expect(isEvmProvider(provider)).toBe(false);
    });

    it('isSubstrateProvider returns true for Substrate provider', () => {
      const provider = getChainProvider('bittensor');
      expect(isSubstrateProvider(provider)).toBe(true);
      expect(isEvmProvider(provider)).toBe(false);
    });
  });

  describe('provider has required methods', () => {
    it('EVM provider has getNativeBalance method', () => {
      const provider = getChainProvider('ethereum');
      expect(typeof provider.getNativeBalance).toBe('function');
    });

    it('SVM provider has getNativeBalance method', () => {
      const provider = getChainProvider('solana');
      expect(typeof provider.getNativeBalance).toBe('function');
    });

    it('UTXO provider has getNativeBalance method', () => {
      const provider = getChainProvider('bitcoin');
      expect(typeof provider.getNativeBalance).toBe('function');
    });

    it('TVM provider has getNativeBalance method', () => {
      const provider = getChainProvider('tron');
      expect(typeof provider.getNativeBalance).toBe('function');
    });

    it('XRP provider has getNativeBalance method', () => {
      const provider = getChainProvider('xrp');
      expect(typeof provider.getNativeBalance).toBe('function');
    });

    it('Substrate provider has getNativeBalance method', () => {
      const provider = getChainProvider('bittensor');
      expect(typeof provider.getNativeBalance).toBe('function');
    });
  });
});
