// packages/chains/tests/unit/core/types.test.ts
import { describe, it, expect } from 'vitest';
import {
  CHAIN_ECOSYSTEM_MAP,
  type ChainAlias,
} from '../../../src/core/types.js';

describe('Core Types', () => {
  describe('CHAIN_ECOSYSTEM_MAP', () => {
    it('maps ethereum to evm ecosystem', () => {
      expect(CHAIN_ECOSYSTEM_MAP.ethereum).toBe('evm');
    });

    it('maps solana to svm ecosystem', () => {
      expect(CHAIN_ECOSYSTEM_MAP.solana).toBe('svm');
    });

    it('maps bitcoin to utxo ecosystem', () => {
      expect(CHAIN_ECOSYSTEM_MAP.bitcoin).toBe('utxo');
    });

    it('maps tron to tvm ecosystem', () => {
      expect(CHAIN_ECOSYSTEM_MAP.tron).toBe('tvm');
    });

    it('maps xrp to xrp ecosystem', () => {
      expect(CHAIN_ECOSYSTEM_MAP.xrp).toBe('xrp');
    });

    it('maps bittensor to substrate ecosystem', () => {
      expect(CHAIN_ECOSYSTEM_MAP.bittensor).toBe('substrate');
    });

    it('contains exactly 18 chain mappings', () => {
      expect(Object.keys(CHAIN_ECOSYSTEM_MAP).length).toBe(18);
    });
  });

  describe('Type Validation', () => {
    it('ChainAlias type includes all chain aliases', () => {
      const chains: ChainAlias[] = [
        'ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche', 'bsc',
        'solana', 'solana-devnet',
        'bitcoin', 'bitcoin-testnet', 'mnee',
        'tron', 'tron-testnet',
        'xrp', 'xrp-testnet',
        'bittensor', 'bittensor-testnet',
      ];
      expect(chains.length).toBe(18);
    });
  });
});
