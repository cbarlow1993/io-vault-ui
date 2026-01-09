// packages/chains/tests/integration/balances/utxo.test.ts

import { describe, it, expect } from 'vitest';
import { UtxoBalanceFetcher } from '../../../src/utxo/balance.js';
import { getUtxoChainConfig } from '../../../src/utxo/config.js';

/**
 * UTXO (Bitcoin) Balance Integration Tests
 *
 * These tests make live RPC calls to Blockbook API.
 * Run with: npm run test:integration
 *
 * Note: Uses public Blockbook API endpoints.
 */
describe('UTXO Balance Integration Tests', () => {
  // Well-known Bitcoin addresses
  // Satoshi's genesis address (first mined BTC)
  const SATOSHI_GENESIS = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';

  // Binance Cold Wallet (large holder)
  const BINANCE_COLD = '34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo';

  // Segwit address (bc1q format)
  const SEGWIT_ADDRESS = 'bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97';

  // Use public Blockbook endpoint for Bitcoin mainnet
  const PUBLIC_BLOCKBOOK_URL = 'https://btc1.trezor.io';

  describe('Bitcoin Mainnet', () => {
    const config = getUtxoChainConfig('bitcoin', { rpcUrl: PUBLIC_BLOCKBOOK_URL });
    const fetcher = new UtxoBalanceFetcher(config);

    it('should fetch native BTC balance for Satoshi genesis address', async () => {
      const balance = await fetcher.getNativeBalance(SATOSHI_GENESIS);

      expect(balance).toBeDefined();
      expect(balance.isNative).toBe(true);
      expect(balance.symbol).toBe('BTC');
      expect(balance.decimals).toBe(8);
      expect(typeof balance.balance).toBe('string');
      expect(typeof balance.formattedBalance).toBe('string');

      // Satoshi's genesis address has received many donations
      const balanceValue = BigInt(balance.balance);
      expect(balanceValue).toBeGreaterThan(0n);
    });

    it('should fetch balance for legacy P2PKH address', async () => {
      const balance = await fetcher.getNativeBalance(SATOSHI_GENESIS);

      expect(balance).toBeDefined();
      expect(balance.isNative).toBe(true);
      expect(balance.symbol).toBe('BTC');
    });

    it('should fetch balance for P2SH address', async () => {
      const balance = await fetcher.getNativeBalance(BINANCE_COLD);

      expect(balance).toBeDefined();
      expect(balance.isNative).toBe(true);
      expect(balance.symbol).toBe('BTC');
      expect(typeof balance.balance).toBe('string');
    });

    it('should fetch balance for native SegWit address', async () => {
      const balance = await fetcher.getNativeBalance(SEGWIT_ADDRESS);

      expect(balance).toBeDefined();
      expect(balance.isNative).toBe(true);
      expect(balance.symbol).toBe('BTC');
      expect(typeof balance.balance).toBe('string');
    });

    it('should fetch UTXOs for address', async () => {
      const utxos = await fetcher.getUtxos(SATOSHI_GENESIS);

      expect(utxos).toBeDefined();
      expect(Array.isArray(utxos)).toBe(true);

      // Satoshi's address should have UTXOs
      if (utxos.length > 0) {
        const firstUtxo = utxos[0];
        expect(firstUtxo).toHaveProperty('txid');
        expect(firstUtxo).toHaveProperty('vout');
        expect(firstUtxo).toHaveProperty('value');
        expect(typeof firstUtxo.txid).toBe('string');
        expect(typeof firstUtxo.vout).toBe('number');
        // Value is returned as bigint
        expect(typeof firstUtxo.value).toBe('bigint');
      }
    });

    it('should fetch confirmed balance', async () => {
      const balance = await fetcher.getConfirmedBalance(SATOSHI_GENESIS);

      expect(balance).toBeDefined();
      expect(balance.isNative).toBe(true);
      expect(balance.symbol).toBe('BTC');
      expect(typeof balance.balance).toBe('string');

      const balanceValue = BigInt(balance.balance);
      expect(balanceValue).toBeGreaterThan(0n);
    });

    it('should fetch unconfirmed balance', async () => {
      const balance = await fetcher.getUnconfirmedBalance(SATOSHI_GENESIS);

      expect(balance).toBeDefined();
      expect(balance.isNative).toBe(true);
      expect(balance.symbol).toBe('BTC');
      expect(typeof balance.balance).toBe('string');
      // Unconfirmed balance can be 0
    });

    it('should throw error for token balance (not supported)', async () => {
      await expect(fetcher.getTokenBalance(SATOSHI_GENESIS, 'someContract')).rejects.toThrow(
        'Token balance not supported for UTXO chains'
      );
    });

    it('should handle address with no UTXOs gracefully', async () => {
      // Random valid Bitcoin address unlikely to have balance
      const emptyAddress = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';

      const balance = await fetcher.getNativeBalance(emptyAddress);

      expect(balance).toBeDefined();
      expect(balance.isNative).toBe(true);
      expect(balance.symbol).toBe('BTC');
      // Balance should be defined (could be 0)
      expect(typeof balance.balance).toBe('string');
    });
  });
});
