// packages/chains/tests/unit/svm/config.test.ts
import { describe, it, expect } from 'vitest';
import { SVM_CHAIN_CONFIGS, getSvmChainConfig } from '../../../src/svm/config.js';
import type { SvmChainAlias } from '../../../src/core/types.js';

describe('SVM Chain Configs', () => {
  describe('SVM_CHAIN_CONFIGS', () => {
    it('has config for solana mainnet', () => {
      expect(SVM_CHAIN_CONFIGS.solana).toBeDefined();
      expect(SVM_CHAIN_CONFIGS.solana.chainAlias).toBe('solana');
      expect(SVM_CHAIN_CONFIGS.solana.cluster).toBe('mainnet-beta');
      expect(SVM_CHAIN_CONFIGS.solana.nativeCurrency.symbol).toBe('SOL');
      expect(SVM_CHAIN_CONFIGS.solana.nativeCurrency.decimals).toBe(9);
    });

    it('has config for solana devnet', () => {
      expect(SVM_CHAIN_CONFIGS['solana-devnet']).toBeDefined();
      expect(SVM_CHAIN_CONFIGS['solana-devnet'].chainAlias).toBe('solana-devnet');
      expect(SVM_CHAIN_CONFIGS['solana-devnet'].cluster).toBe('devnet');
      expect(SVM_CHAIN_CONFIGS['solana-devnet'].nativeCurrency.symbol).toBe('SOL');
      expect(SVM_CHAIN_CONFIGS['solana-devnet'].nativeCurrency.decimals).toBe(9);
    });

    it('uses correct default RPC URLs', () => {
      expect(SVM_CHAIN_CONFIGS.solana.rpcUrl).toBe('https://api.mainnet-beta.solana.com');
      expect(SVM_CHAIN_CONFIGS['solana-devnet'].rpcUrl).toBe('https://api.devnet.solana.com');
    });

    it('has config for all 2 SVM chains', () => {
      const chainAliases: SvmChainAlias[] = ['solana', 'solana-devnet'];
      chainAliases.forEach(alias => {
        expect(SVM_CHAIN_CONFIGS[alias]).toBeDefined();
      });
    });
  });

  describe('getSvmChainConfig', () => {
    it('returns config for valid chain alias', () => {
      const config = getSvmChainConfig('solana');
      expect(config.chainAlias).toBe('solana');
      expect(config.cluster).toBe('mainnet-beta');
    });

    it('returns config for devnet', () => {
      const config = getSvmChainConfig('solana-devnet');
      expect(config.chainAlias).toBe('solana-devnet');
      expect(config.cluster).toBe('devnet');
    });

    it('applies rpc override when provided', () => {
      const customRpc = 'https://custom-solana-rpc.example.com';
      const config = getSvmChainConfig('solana', customRpc);
      expect(config.rpcUrl).toBe(customRpc);
    });

    it('preserves other config properties when overriding rpc', () => {
      const customRpc = 'https://custom-solana-rpc.example.com';
      const config = getSvmChainConfig('solana', customRpc);
      expect(config.chainAlias).toBe('solana');
      expect(config.cluster).toBe('mainnet-beta');
      expect(config.nativeCurrency.symbol).toBe('SOL');
      expect(config.nativeCurrency.decimals).toBe(9);
    });
  });
});
