// packages/chains/tests/unit/tvm/balance.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TvmBalanceFetcher } from '../../../src/tvm/balance.js';
import { getTvmChainConfig } from '../../../src/tvm/config.js';

describe('TvmBalanceFetcher', () => {
  let fetcher: TvmBalanceFetcher;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    const config = getTvmChainConfig('tron');
    fetcher = new TvmBalanceFetcher(config);
  });

  describe('getNativeBalance', () => {
    it('returns formatted TRX balance', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              address: 'TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW',
              balance: 1000000, // 1 TRX
            },
          ],
          success: true,
        }),
      });

      const balance = await fetcher.getNativeBalance('TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW');

      expect(balance.balance).toBe('1000000');
      expect(balance.formattedBalance).toBe('1');
      expect(balance.symbol).toBe('TRX');
      expect(balance.decimals).toBe(6);
      expect(balance.isNative).toBe(true);
    });

    it('handles zero balance for new accounts', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          success: true,
        }),
      });

      const balance = await fetcher.getNativeBalance('TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW');

      expect(balance.balance).toBe('0');
      expect(balance.formattedBalance).toBe('0');
    });

    it('throws on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetcher.getNativeBalance('TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW')).rejects.toThrow('Failed to fetch native balance');
    });
  });

  describe('getTokenBalance', () => {
    it('returns formatted TRC20 token balance', async () => {
      // Mock triggerConstantContract for balanceOf
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: { result: true },
          constant_result: ['0000000000000000000000000000000000000000000000000000000000989680'], // 10000000
        }),
      });

      // Mock triggerConstantContract for decimals
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: { result: true },
          constant_result: ['0000000000000000000000000000000000000000000000000000000000000006'], // 6 decimals
        }),
      });

      // Mock triggerConstantContract for symbol
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: { result: true },
          constant_result: [
            '0000000000000000000000000000000000000000000000000000000000000020' +
              '0000000000000000000000000000000000000000000000000000000000000004' +
              '5553445400000000000000000000000000000000000000000000000000000000',
          ], // "USDT"
        }),
      });

      const balance = await fetcher.getTokenBalance(
        'TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW',
        'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' // USDT contract
      );

      expect(balance.balance).toBe('10000000');
      expect(balance.decimals).toBe(6);
      expect(balance.contractAddress).toBe('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t');
    });

    it('handles contract call failures gracefully', async () => {
      // Mock failed balance call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: { result: false, message: 'Contract not found' },
        }),
      });

      // Mock decimals
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: { result: false },
        }),
      });

      // Mock symbol
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: { result: false },
        }),
      });

      const balance = await fetcher.getTokenBalance('TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW', 'TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs');

      expect(balance.balance).toBe('0');
      expect(balance.decimals).toBe(18); // Default
      expect(balance.symbol).toBe('TRC20'); // Default
    });
  });

  describe('getAccountResources', () => {
    it('returns bandwidth and energy info', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              free_net_usage: 100,
              free_net_limit: 600,
              net_usage: 50,
              net_limit: 1000,
              account_resource: {
                energy_usage: 5000,
                energy_limit: 100000,
              },
            },
          ],
          success: true,
        }),
      });

      const resources = await fetcher.getAccountResources('TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW');

      expect(resources.freeNetUsed).toBe(100);
      expect(resources.freeNetLimit).toBe(600);
      expect(resources.netUsed).toBe(50);
      expect(resources.netLimit).toBe(1000);
      expect(resources.energyUsed).toBe(5000);
      expect(resources.energyLimit).toBe(100000);
    });

    it('returns defaults for new accounts', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          success: true,
        }),
      });

      const resources = await fetcher.getAccountResources('TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW');

      expect(resources.freeNetLimit).toBe(600); // Default free bandwidth
      expect(resources.energyLimit).toBe(0);
    });
  });

  describe('getTrc20Balances', () => {
    it('returns all TRC20 token balances', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              trc20: [{ TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t: '1000000' }, { TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs: '500' }],
            },
          ],
          success: true,
        }),
      });

      const balances = await fetcher.getTrc20Balances('TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW');

      expect(balances).toHaveLength(2);
      expect(balances[0]).toEqual({
        contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        balance: '1000000',
      });
      expect(balances[1]).toEqual({
        contractAddress: 'TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs',
        balance: '500',
      });
    });

    it('returns empty array for accounts with no tokens', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{}],
          success: true,
        }),
      });

      const balances = await fetcher.getTrc20Balances('TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW');
      expect(balances).toEqual([]);
    });
  });
});
