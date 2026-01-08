// packages/chains/tests/unit/core/registry.test.ts
import { describe, it, expect } from 'vitest';
import {
  getEcosystem,
  isValidChainAlias,
  isValidEcosystem,
  getAllChainAliases,
  getChainAliasesByEcosystem,
} from '../../../src/core/registry.js';

describe('Registry', () => {
  describe('getEcosystem', () => {
    it('returns evm for ethereum', () => {
      expect(getEcosystem('ethereum')).toBe('evm');
    });

    it('returns svm for solana', () => {
      expect(getEcosystem('solana')).toBe('svm');
    });

    it('returns utxo for bitcoin', () => {
      expect(getEcosystem('bitcoin')).toBe('utxo');
    });

    it('returns tvm for tron', () => {
      expect(getEcosystem('tron')).toBe('tvm');
    });

    it('returns xrp for xrp', () => {
      expect(getEcosystem('xrp')).toBe('xrp');
    });

    it('returns substrate for bittensor', () => {
      expect(getEcosystem('bittensor')).toBe('substrate');
    });
  });

  describe('isValidChainAlias', () => {
    it('returns true for valid chain aliases', () => {
      expect(isValidChainAlias('ethereum')).toBe(true);
      expect(isValidChainAlias('solana')).toBe(true);
      expect(isValidChainAlias('bitcoin')).toBe(true);
    });

    it('returns false for invalid chain aliases', () => {
      expect(isValidChainAlias('fake-chain')).toBe(false);
      expect(isValidChainAlias('')).toBe(false);
      expect(isValidChainAlias('ETHEREUM')).toBe(false);
    });
  });

  describe('isValidEcosystem', () => {
    it('returns true for valid ecosystems', () => {
      expect(isValidEcosystem('evm')).toBe(true);
      expect(isValidEcosystem('svm')).toBe(true);
      expect(isValidEcosystem('utxo')).toBe(true);
    });

    it('returns false for invalid ecosystems', () => {
      expect(isValidEcosystem('fake')).toBe(false);
      expect(isValidEcosystem('')).toBe(false);
    });
  });

  describe('getAllChainAliases', () => {
    it('returns all 18 chain aliases', () => {
      const aliases = getAllChainAliases();
      expect(aliases.length).toBe(18);
      expect(aliases).toContain('ethereum');
      expect(aliases).toContain('solana');
      expect(aliases).toContain('bitcoin');
    });
  });

  describe('getChainAliasesByEcosystem', () => {
    it('returns all EVM chains for evm ecosystem', () => {
      const evmChains = getChainAliasesByEcosystem('evm');
      expect(evmChains).toContain('ethereum');
      expect(evmChains).toContain('polygon');
      expect(evmChains).toContain('arbitrum');
      expect(evmChains.length).toBe(7);
    });

    it('returns solana chains for svm ecosystem', () => {
      const svmChains = getChainAliasesByEcosystem('svm');
      expect(svmChains).toContain('solana');
      expect(svmChains).toContain('solana-devnet');
      expect(svmChains.length).toBe(2);
    });
  });
});
