// packages/chains/tests/unit/evm/config.test.ts
import { describe, it, expect } from 'vitest';
import { EVM_CHAIN_CONFIGS, getEvmChainConfig } from '../../../src/evm/config.js';
import type { EvmChainAlias } from '../../../src/core/types.js';

describe('EVM Chain Configs', () => {
  describe('EVM_CHAIN_CONFIGS', () => {
    it('has config for ethereum', () => {
      expect(EVM_CHAIN_CONFIGS.ethereum).toBeDefined();
      expect(EVM_CHAIN_CONFIGS.ethereum.chainId).toBe(1);
      expect(EVM_CHAIN_CONFIGS.ethereum.nativeCurrency.symbol).toBe('ETH');
    });

    it('has config for polygon', () => {
      expect(EVM_CHAIN_CONFIGS.polygon).toBeDefined();
      expect(EVM_CHAIN_CONFIGS.polygon.chainId).toBe(137);
      expect(EVM_CHAIN_CONFIGS.polygon.nativeCurrency.symbol).toBe('POL');
    });

    it('has config for arbitrum', () => {
      expect(EVM_CHAIN_CONFIGS.arbitrum).toBeDefined();
      expect(EVM_CHAIN_CONFIGS.arbitrum.chainId).toBe(42161);
    });

    it('has config for all 7 EVM chains', () => {
      const chainAliases: EvmChainAlias[] = [
        'ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche', 'bsc'
      ];
      chainAliases.forEach(alias => {
        expect(EVM_CHAIN_CONFIGS[alias]).toBeDefined();
      });
    });
  });

  describe('getEvmChainConfig', () => {
    it('returns config for valid chain alias', () => {
      const config = getEvmChainConfig('ethereum');
      expect(config.chainAlias).toBe('ethereum');
      expect(config.chainId).toBe(1);
    });

    it('applies rpc override when provided', () => {
      const customRpc = 'https://custom-rpc.example.com';
      const config = getEvmChainConfig('ethereum', customRpc);
      expect(config.rpcUrl).toBe(customRpc);
    });
  });
});
