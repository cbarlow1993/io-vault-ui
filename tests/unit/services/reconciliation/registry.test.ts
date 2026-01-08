import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the @noves/noves-sdk module before importing the registry
vi.mock('@noves/noves-sdk', () => ({
  Translate: {
    evm: vi.fn(() => ({ getTransactions: vi.fn() })),
    svm: vi.fn(() => ({ getTransactions: vi.fn() })),
    utxo: vi.fn(() => ({ getTransactions: vi.fn() })),
    xrpl: vi.fn(() => ({ getTransactions: vi.fn() })),
  },
  TransactionsPage: {
    fromCursor: vi.fn(),
  },
}));

// Import after mocking
import {
  PROVIDER_CONFIG,
  providerRegistry,
  initializeProviders,
  getProviderConfig,
  getProviderForChainAlias,
  getProvidersForChainAlias,
  getSupportedChainAliases,
} from '@/src/services/reconciliation/providers/registry.js';

describe('Provider Registry', () => {
  beforeEach(() => {
    // Clear the registry before each test
    providerRegistry.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('PROVIDER_CONFIG', () => {
    it('should have configuration for eth-mainnet', () => {
      expect(PROVIDER_CONFIG['eth' as ChainAlias]).toBeDefined();
      expect(PROVIDER_CONFIG['eth' as ChainAlias]!.primary).toBe('noves');
    });

    it('should have configuration for polygon-mainnet', () => {
      expect(PROVIDER_CONFIG['polygon' as ChainAlias]).toBeDefined();
      expect(PROVIDER_CONFIG['polygon' as ChainAlias]!.primary).toBe('noves');
    });

    it('should have configuration for solana-mainnet', () => {
      expect(PROVIDER_CONFIG['solana' as ChainAlias]).toBeDefined();
      expect(PROVIDER_CONFIG['solana' as ChainAlias]!.primary).toBe('noves');
    });

    it('should have configuration for btc-mainnet', () => {
      expect(PROVIDER_CONFIG['bitcoin' as ChainAlias]).toBeDefined();
      expect(PROVIDER_CONFIG['bitcoin' as ChainAlias]!.primary).toBe('noves');
    });

    it('should have configuration for xrpl-mainnet', () => {
      expect(PROVIDER_CONFIG['ripple' as ChainAlias]).toBeDefined();
      expect(PROVIDER_CONFIG['ripple' as ChainAlias]!.primary).toBe('noves');
    });
  });

  describe('providerRegistry', () => {
    it('should register and retrieve a provider', () => {
      const mockProvider = {
        name: 'test-provider',
        supportedChainAliases: ['eth' as ChainAlias],
        fetchTransactions: vi.fn(),
        healthCheck: vi.fn(),
      };

      providerRegistry.register(mockProvider);

      expect(providerRegistry.has('test-provider')).toBe(true);
      expect(providerRegistry.get('test-provider')).toBe(mockProvider);
    });

    it('should throw error when getting unregistered provider', () => {
      expect(() => providerRegistry.get('nonexistent')).toThrow(
        'Provider not found: nonexistent'
      );
    });

    it('should return false for unregistered provider', () => {
      expect(providerRegistry.has('nonexistent')).toBe(false);
    });

    it('should return list of registered providers', () => {
      const mockProvider1 = {
        name: 'provider1',
        supportedChainAliases: ['eth' as ChainAlias],
        fetchTransactions: vi.fn(),
        healthCheck: vi.fn(),
      };

      const mockProvider2 = {
        name: 'provider2',
        supportedChainAliases: ['solana' as ChainAlias],
        fetchTransactions: vi.fn(),
        healthCheck: vi.fn(),
      };

      providerRegistry.register(mockProvider1);
      providerRegistry.register(mockProvider2);

      const registered = providerRegistry.getRegisteredProviders();
      expect(registered).toContain('provider1');
      expect(registered).toContain('provider2');
    });

    it('should clear all providers', () => {
      const mockProvider = {
        name: 'test-provider',
        supportedChainAliases: ['eth' as ChainAlias],
        fetchTransactions: vi.fn(),
        healthCheck: vi.fn(),
      };

      providerRegistry.register(mockProvider);
      expect(providerRegistry.has('test-provider')).toBe(true);

      providerRegistry.clear();
      expect(providerRegistry.has('test-provider')).toBe(false);
    });
  });

  describe('initializeProviders', () => {
    it('should register the noves provider', () => {
      expect(providerRegistry.has('noves')).toBe(false);

      initializeProviders({ novesApiKey: 'test-api-key' });

      expect(providerRegistry.has('noves')).toBe(true);
    });

    it('should not re-register if already registered', () => {
      initializeProviders({ novesApiKey: 'first-key' });
      const firstProvider = providerRegistry.get('noves');

      initializeProviders({ novesApiKey: 'second-key' });
      const secondProvider = providerRegistry.get('noves');

      // Should be the same instance
      expect(firstProvider).toBe(secondProvider);
    });
  });

  describe('getProviderConfig', () => {
    it('should return config for supported chain alias', () => {
      const config = getProviderConfig('eth' as ChainAlias);

      expect(config).not.toBeNull();
      expect(config?.primary).toBe('noves');
    });

    it('should return null for unsupported chain alias', () => {
      const config = getProviderConfig('unsupported-chain' as ChainAlias);

      expect(config).toBeNull();
    });
  });

  describe('getProviderForChainAlias', () => {
    beforeEach(() => {
      initializeProviders({ novesApiKey: 'test-api-key' });
    });

    it('should return the primary provider for eth-mainnet', () => {
      const provider = getProviderForChainAlias('eth' as ChainAlias);

      expect(provider).toBeDefined();
      expect(provider.name).toBe('noves');
    });

    it('should return the primary provider for solana-mainnet', () => {
      const provider = getProviderForChainAlias('solana' as ChainAlias);

      expect(provider).toBeDefined();
      expect(provider.name).toBe('noves');
    });

    it('should throw error for unsupported chain alias', () => {
      expect(() => getProviderForChainAlias('unsupported-chain' as ChainAlias)).toThrow(
        'No provider configured for chain alias: unsupported-chain'
      );
    });
  });

  describe('getProvidersForChainAlias', () => {
    beforeEach(() => {
      initializeProviders({ novesApiKey: 'test-api-key' });
    });

    it('should return primary provider in array', () => {
      const providers = getProvidersForChainAlias('eth' as ChainAlias);

      expect(providers).toHaveLength(1);
      expect(providers[0]!.name).toBe('noves');
    });

    it('should throw error for unsupported chain alias', () => {
      expect(() => getProvidersForChainAlias('unsupported-chain' as ChainAlias)).toThrow(
        'No provider configured for chain alias: unsupported-chain'
      );
    });
  });

  describe('getSupportedChainAliases', () => {
    it('should return all supported chain aliases', () => {
      const chainAliases = getSupportedChainAliases();

      expect(chainAliases).toContain('eth' as ChainAlias);
      expect(chainAliases).toContain('polygon' as ChainAlias);
      expect(chainAliases).toContain('arbitrum' as ChainAlias);
      expect(chainAliases).toContain('optimism' as ChainAlias);
      expect(chainAliases).toContain('base' as ChainAlias);
      expect(chainAliases).toContain('solana' as ChainAlias);
      expect(chainAliases).toContain('bitcoin' as ChainAlias);
      expect(chainAliases).toContain('ripple' as ChainAlias);
    });

    it('should return same chain aliases as PROVIDER_CONFIG keys', () => {
      const chainAliases = getSupportedChainAliases();
      const configKeys = Object.keys(PROVIDER_CONFIG);

      expect(chainAliases).toEqual(configKeys);
    });
  });
});
