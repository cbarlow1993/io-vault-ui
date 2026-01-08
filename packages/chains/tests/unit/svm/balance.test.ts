// packages/chains/tests/unit/svm/balance.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SvmBalanceFetcher } from '../../../src/svm/balance.js';
import type { SvmChainConfig } from '../../../src/svm/config.js';

describe('SvmBalanceFetcher', () => {
  const mockConfig: SvmChainConfig = {
    chainAlias: 'solana',
    cluster: 'mainnet-beta',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    nativeCurrency: { symbol: 'SOL', decimals: 9 },
  };

  let fetcher: SvmBalanceFetcher;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    fetcher = new SvmBalanceFetcher(mockConfig);
  });

  describe('getNativeBalance', () => {
    it('returns formatted native balance', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: {
            context: { slot: 123456 },
            value: 1000000000, // 1 SOL in lamports
          },
        }),
      });

      const result = await fetcher.getNativeBalance('7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV');

      expect(result.balance).toBe('1000000000');
      expect(result.formattedBalance).toBe('1');
      expect(result.symbol).toBe('SOL');
      expect(result.decimals).toBe(9);
      expect(result.isNative).toBe(true);
    });

    it('handles zero balance', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: {
            context: { slot: 123456 },
            value: 0,
          },
        }),
      });

      const result = await fetcher.getNativeBalance('7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV');

      expect(result.balance).toBe('0');
      expect(result.formattedBalance).toBe('0');
      expect(result.isNative).toBe(true);
    });

    it('handles fractional SOL balance', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: {
            context: { slot: 123456 },
            value: 1500000000, // 1.5 SOL
          },
        }),
      });

      const result = await fetcher.getNativeBalance('7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV');

      expect(result.balance).toBe('1500000000');
      expect(result.formattedBalance).toBe('1.5');
    });
  });

  describe('getTokenBalance', () => {
    it('returns formatted SPL token balance', async () => {
      // Mock getTokenAccountsByOwner
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: {
            context: { slot: 123456 },
            value: [
              {
                pubkey: 'TokenAccountPubkey',
                account: {
                  data: {
                    parsed: {
                      info: {
                        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC mint
                        owner: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
                        tokenAmount: {
                          amount: '100000000', // 100 USDC (6 decimals)
                          decimals: 6,
                          uiAmount: 100,
                          uiAmountString: '100',
                        },
                      },
                      type: 'account',
                    },
                    program: 'spl-token',
                    space: 165,
                  },
                  executable: false,
                  lamports: 2039280,
                  owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                  rentEpoch: 0,
                },
              },
            ],
          },
        }),
      });

      const result = await fetcher.getTokenBalance(
        '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // USDC mint
      );

      expect(result.balance).toBe('100000000');
      expect(result.formattedBalance).toBe('100');
      expect(result.decimals).toBe(6);
      expect(result.contractAddress).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    });

    it('returns zero balance when no token account exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: {
            context: { slot: 123456 },
            value: [], // No token accounts
          },
        }),
      });

      // Mock getMint to get decimals
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 2,
          result: {
            context: { slot: 123456 },
            value: {
              data: {
                parsed: {
                  info: {
                    decimals: 6,
                    freezeAuthority: null,
                    isInitialized: true,
                    mintAuthority: null,
                    supply: '10000000000000',
                  },
                  type: 'mint',
                },
                program: 'spl-token',
                space: 82,
              },
              executable: false,
              lamports: 1461600,
              owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
              rentEpoch: 0,
            },
          },
        }),
      });

      const result = await fetcher.getTokenBalance(
        '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
      );

      expect(result.balance).toBe('0');
      expect(result.formattedBalance).toBe('0');
      expect(result.decimals).toBe(6);
    });

    it('handles token with different decimals', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: {
            context: { slot: 123456 },
            value: [
              {
                pubkey: 'TokenAccountPubkey',
                account: {
                  data: {
                    parsed: {
                      info: {
                        mint: 'So11111111111111111111111111111111111111112', // Wrapped SOL
                        owner: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
                        tokenAmount: {
                          amount: '5000000000', // 5 wrapped SOL (9 decimals)
                          decimals: 9,
                          uiAmount: 5,
                          uiAmountString: '5',
                        },
                      },
                      type: 'account',
                    },
                    program: 'spl-token',
                    space: 165,
                  },
                  executable: false,
                  lamports: 2039280,
                  owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                  rentEpoch: 0,
                },
              },
            ],
          },
        }),
      });

      const result = await fetcher.getTokenBalance(
        '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
        'So11111111111111111111111111111111111111112'
      );

      expect(result.balance).toBe('5000000000');
      expect(result.formattedBalance).toBe('5');
      expect(result.decimals).toBe(9);
    });
  });

  describe('error handling', () => {
    it('throws RpcError on HTTP failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });

      await expect(
        fetcher.getNativeBalance('7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV')
      ).rejects.toThrow('RPC request failed');
    });

    it('throws RpcError on JSON-RPC error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          error: {
            code: -32602,
            message: 'Invalid params',
          },
        }),
      });

      await expect(
        fetcher.getNativeBalance('invalid-address')
      ).rejects.toThrow('Invalid params');
    });
  });
});
