// packages/chains/tests/unit/utxo/balance.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UtxoBalanceFetcher } from '../../../src/utxo/balance.js';
import { getUtxoChainConfig } from '../../../src/utxo/config.js';
import { ChainError } from '../../../src/core/errors.js';

describe('UtxoBalanceFetcher', () => {
  let fetcher: UtxoBalanceFetcher;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    fetcher = new UtxoBalanceFetcher(getUtxoChainConfig('bitcoin'));
  });

  describe('getNativeBalance', () => {
    it('returns balance from chain_stats and mempool_stats', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
          chain_stats: {
            funded_txo_count: 10,
            funded_txo_sum: 100000000,
            spent_txo_count: 5,
            spent_txo_sum: 50000000,
            tx_count: 15,
          },
          mempool_stats: {
            funded_txo_count: 1,
            funded_txo_sum: 10000000,
            spent_txo_count: 0,
            spent_txo_sum: 0,
            tx_count: 1,
          },
        }),
      });

      const balance = await fetcher.getNativeBalance('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2');

      expect(balance.balance).toBe('60000000'); // 50000000 + 10000000
      expect(balance.formattedBalance).toBe('0.6');
      expect(balance.symbol).toBe('BTC');
      expect(balance.decimals).toBe(8);
    });

    it('handles zero balance', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
          chain_stats: {
            funded_txo_count: 0,
            funded_txo_sum: 0,
            spent_txo_count: 0,
            spent_txo_sum: 0,
            tx_count: 0,
          },
          mempool_stats: {
            funded_txo_count: 0,
            funded_txo_sum: 0,
            spent_txo_count: 0,
            spent_txo_sum: 0,
            tx_count: 0,
          },
        }),
      });

      const balance = await fetcher.getNativeBalance('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2');

      expect(balance.balance).toBe('0');
      expect(balance.formattedBalance).toBe('0');
    });
  });

  describe('getTokenBalance', () => {
    it('throws ChainError for UTXO chains', async () => {
      await expect(fetcher.getTokenBalance('addr', 'token')).rejects.toThrow(ChainError);
      await expect(fetcher.getTokenBalance('addr', 'token')).rejects.toThrow(
        'Token balance not supported for UTXO chains'
      );
    });
  });

  describe('getUtxos', () => {
    it('returns list of UTXOs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            txid: 'abc123',
            vout: 0,
            status: { confirmed: true, block_height: 700000 },
            value: 50000000,
          },
          {
            txid: 'def456',
            vout: 1,
            status: { confirmed: false },
            value: 10000000,
          },
        ],
      });

      const utxos = await fetcher.getUtxos('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2');

      expect(utxos).toHaveLength(2);
      expect(utxos[0]!.txid).toBe('abc123');
      expect(utxos[0]!.value).toBe(50000000n);
      expect(utxos[0]!.confirmations).toBe(1);
      expect(utxos[1]!.confirmations).toBe(0);
    });

    it('handles empty UTXO list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const utxos = await fetcher.getUtxos('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2');
      expect(utxos).toHaveLength(0);
    });
  });

  describe('getConfirmedBalance', () => {
    it('returns only confirmed balance', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
          chain_stats: {
            funded_txo_sum: 100000000,
            spent_txo_sum: 50000000,
          },
          mempool_stats: {
            funded_txo_sum: 10000000,
            spent_txo_sum: 0,
          },
        }),
      });

      const balance = await fetcher.getConfirmedBalance('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2');

      expect(balance.balance).toBe('50000000'); // Only chain_stats
    });
  });

  describe('getPendingBalance', () => {
    it('returns only mempool balance', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
          chain_stats: {
            funded_txo_sum: 100000000,
            spent_txo_sum: 50000000,
          },
          mempool_stats: {
            funded_txo_sum: 10000000,
            spent_txo_sum: 0,
          },
        }),
      });

      const balance = await fetcher.getPendingBalance('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2');

      expect(balance.balance).toBe('10000000'); // Only mempool_stats
    });
  });
});
