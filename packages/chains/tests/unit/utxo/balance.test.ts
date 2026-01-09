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
    it('returns total balance (confirmed + unconfirmed)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          balance: '50000000',
          unconfirmedBalance: '10000000',
          totalReceived: '100000000',
          totalSent: '40000000',
          txs: 15,
          unconfirmedTxs: 1,
        }),
      });

      const balance = await fetcher.getNativeBalance('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');

      expect(balance.balance).toBe('60000000'); // 50000000 + 10000000
      expect(balance.formattedBalance).toBe('0.6');
      expect(balance.symbol).toBe('BTC');
      expect(balance.decimals).toBe(8);
      expect(balance.isNative).toBe(true);
    });

    it('handles zero balance', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          balance: '0',
          unconfirmedBalance: '0',
          totalReceived: '0',
          totalSent: '0',
          txs: 0,
          unconfirmedTxs: 0,
        }),
      });

      const balance = await fetcher.getNativeBalance('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');

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
    it('returns list of UTXOs from Blockbook', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            txid: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
            vout: 0,
            value: '50000000',
            confirmations: 6,
            scriptPubKey: '0014a9f3c4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1',
            address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          },
          {
            txid: 'def456abc123def456abc123def456abc123def456abc123def456abc123def4',
            vout: 1,
            value: '10000000',
            confirmations: 0,
            scriptPubKey: '0014a9f3c4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1',
            address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          },
        ],
      });

      const utxos = await fetcher.getUtxos('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');

      expect(utxos).toHaveLength(2);
      expect(utxos[0]!.txid).toBe('abc123def456abc123def456abc123def456abc123def456abc123def456abc1');
      expect(utxos[0]!.value).toBe(50000000n);
      expect(utxos[0]!.confirmations).toBe(6);
      expect(utxos[0]!.scriptPubKey).toBe('0014a9f3c4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1');
      expect(utxos[1]!.confirmations).toBe(0);
    });

    it('handles empty UTXO list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const utxos = await fetcher.getUtxos('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');
      expect(utxos).toHaveLength(0);
    });
  });

  describe('getConfirmedBalance', () => {
    it('returns only confirmed balance', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          balance: '50000000',
          unconfirmedBalance: '10000000',
          totalReceived: '100000000',
          totalSent: '40000000',
          txs: 15,
          unconfirmedTxs: 1,
        }),
      });

      const balance = await fetcher.getConfirmedBalance('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');

      expect(balance.balance).toBe('50000000'); // Only confirmed balance
      expect(balance.formattedBalance).toBe('0.5');
    });
  });

  describe('getUnconfirmedBalance', () => {
    it('returns only unconfirmed balance', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          balance: '50000000',
          unconfirmedBalance: '10000000',
          totalReceived: '100000000',
          totalSent: '40000000',
          txs: 15,
          unconfirmedTxs: 1,
        }),
      });

      const balance = await fetcher.getUnconfirmedBalance('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');

      expect(balance.balance).toBe('10000000'); // Only unconfirmed balance
      expect(balance.formattedBalance).toBe('0.1');
    });
  });
});
