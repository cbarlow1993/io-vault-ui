// packages/chains/tests/unit/evm/balance.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EvmBalanceFetcher } from '../../../src/evm/balance.js';
import type { EvmChainConfig } from '../../../src/evm/config.js';

describe('EvmBalanceFetcher', () => {
  const mockConfig: EvmChainConfig = {
    chainAlias: 'ethereum',
    chainId: 1,
    rpcUrl: 'https://test-rpc.com',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    supportsEip1559: true,
  };

  let fetcher: EvmBalanceFetcher;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    fetcher = new EvmBalanceFetcher(mockConfig);
  });

  describe('getNativeBalance', () => {
    it('returns formatted native balance', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: '0xde0b6b3a7640000', // 1 ETH in wei
        }),
      });

      const result = await fetcher.getNativeBalance('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');

      expect(result.balance).toBe('1000000000000000000');
      expect(result.formattedBalance).toBe('1');
      expect(result.symbol).toBe('ETH');
      expect(result.decimals).toBe(18);
      expect(result.isNative).toBe(true);
    });

    it('handles zero balance', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: '0x0',
        }),
      });

      const result = await fetcher.getNativeBalance('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');

      expect(result.balance).toBe('0');
      expect(result.formattedBalance).toBe('0');
      expect(result.isNative).toBe(true);
    });
  });

  describe('getTokenBalance', () => {
    it('returns formatted token balance', async () => {
      // Mock balanceOf call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: '0x0000000000000000000000000000000000000000000000000000000005f5e100', // 100 USDC
        }),
      });

      // Mock decimals call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 2,
          result: '0x0000000000000000000000000000000000000000000000000000000000000006', // 6 decimals
        }),
      });

      // Mock symbol call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 3,
          result: '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000455534443', // USDC
        }),
      });

      const result = await fetcher.getTokenBalance(
        '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
      );

      expect(result.balance).toBe('100000000');
      expect(result.decimals).toBe(6);
      expect(result.contractAddress).toBe('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
    });
  });
});
