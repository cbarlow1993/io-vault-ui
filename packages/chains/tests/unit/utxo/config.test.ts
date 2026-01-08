// packages/chains/tests/unit/utxo/config.test.ts

import { describe, it, expect } from 'vitest';
import {
  UTXO_CHAIN_CONFIGS,
  getUtxoChainConfig,
  isValidUtxoChainAlias,
} from '../../../src/utxo/config.js';

describe('UTXO Chain Config', () => {
  describe('UTXO_CHAIN_CONFIGS', () => {
    it('contains bitcoin mainnet config', () => {
      const config = UTXO_CHAIN_CONFIGS['bitcoin'];
      expect(config.chainAlias).toBe('bitcoin');
      expect(config.network).toBe('mainnet');
      expect(config.nativeCurrency.symbol).toBe('BTC');
      expect(config.nativeCurrency.decimals).toBe(8);
      expect(config.bech32Prefix).toBe('bc');
      expect(config.pubKeyHashPrefix).toBe(0x00);
    });

    it('contains bitcoin testnet config', () => {
      const config = UTXO_CHAIN_CONFIGS['bitcoin-testnet'];
      expect(config.chainAlias).toBe('bitcoin-testnet');
      expect(config.network).toBe('testnet');
      expect(config.nativeCurrency.symbol).toBe('tBTC');
      expect(config.bech32Prefix).toBe('tb');
      expect(config.pubKeyHashPrefix).toBe(0x6f);
    });

    it('contains bitcoin signet config', () => {
      const config = UTXO_CHAIN_CONFIGS['bitcoin-signet'];
      expect(config.chainAlias).toBe('bitcoin-signet');
      expect(config.network).toBe('signet');
      expect(config.nativeCurrency.symbol).toBe('sBTC');
    });

    it('contains litecoin config', () => {
      const config = UTXO_CHAIN_CONFIGS['litecoin'];
      expect(config.chainAlias).toBe('litecoin');
      expect(config.nativeCurrency.symbol).toBe('LTC');
      expect(config.bech32Prefix).toBe('ltc');
    });

    it('contains dogecoin config', () => {
      const config = UTXO_CHAIN_CONFIGS['dogecoin'];
      expect(config.chainAlias).toBe('dogecoin');
      expect(config.nativeCurrency.symbol).toBe('DOGE');
      expect(config.dustLimit).toBe(100000000); // 1 DOGE
    });
  });

  describe('getUtxoChainConfig', () => {
    it('returns config for valid chain alias', () => {
      const config = getUtxoChainConfig('bitcoin');
      expect(config.chainAlias).toBe('bitcoin');
      expect(config.nativeCurrency.symbol).toBe('BTC');
    });

    it('allows custom RPC URL override', () => {
      const customRpc = 'https://custom-btc-node.example.com';
      const config = getUtxoChainConfig('bitcoin', customRpc);
      expect(config.rpcUrl).toBe(customRpc);
      expect(config.chainAlias).toBe('bitcoin');
    });

    it('throws for unknown chain alias', () => {
      expect(() => getUtxoChainConfig('unknown' as any)).toThrow('Unknown UTXO chain alias');
    });
  });

  describe('isValidUtxoChainAlias', () => {
    it('returns true for valid UTXO chains', () => {
      expect(isValidUtxoChainAlias('bitcoin')).toBe(true);
      expect(isValidUtxoChainAlias('bitcoin-testnet')).toBe(true);
      expect(isValidUtxoChainAlias('litecoin')).toBe(true);
      expect(isValidUtxoChainAlias('dogecoin')).toBe(true);
    });

    it('returns false for invalid chains', () => {
      expect(isValidUtxoChainAlias('ethereum')).toBe(false);
      expect(isValidUtxoChainAlias('solana')).toBe(false);
      expect(isValidUtxoChainAlias('unknown')).toBe(false);
    });
  });
});
