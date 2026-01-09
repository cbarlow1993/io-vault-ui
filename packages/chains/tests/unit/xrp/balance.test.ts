// packages/chains/tests/unit/xrp/balance.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { XrpBalanceFetcher } from '../../../src/xrp/balance.js';
import { getXrpChainConfig } from '../../../src/xrp/config.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('XrpBalanceFetcher', () => {
  const config = getXrpChainConfig('xrp');
  let fetcher: XrpBalanceFetcher;

  // Valid XRP addresses for testing
  const validAddress = 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh';
  const validAddress2 = 'rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn';
  const issuerAddress = 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getNativeBalance', () => {
    it('returns balance for existing account', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            account_data: {
              Account: validAddress,
              Balance: '100000000', // 100 XRP in drops
              Sequence: 1,
              OwnerCount: 0,
            },
          },
        }),
      });

      fetcher = new XrpBalanceFetcher(config);
      const result = await fetcher.getNativeBalance(validAddress);

      expect(result.balance).toBe('100000000');
      expect(result.formattedBalance).toBe('100');
      expect(result.symbol).toBe('XRP');
      expect(result.decimals).toBe(6);
    });

    it('returns zero for non-existent account', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            error: 'actNotFound',
            error_message: 'Account not found.',
          },
        }),
      });

      fetcher = new XrpBalanceFetcher(config);
      const result = await fetcher.getNativeBalance(validAddress2);

      expect(result.balance).toBe('0');
      expect(result.formattedBalance).toBe('0');
    });

    it('throws on invalid address', async () => {
      fetcher = new XrpBalanceFetcher(config);
      await expect(fetcher.getNativeBalance('invalid')).rejects.toThrow('Invalid XRP address');
    });

    it('handles fractional balance correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            account_data: {
              Account: validAddress,
              Balance: '1500000', // 1.5 XRP
              Sequence: 1,
              OwnerCount: 0,
            },
          },
        }),
      });

      fetcher = new XrpBalanceFetcher(config);
      const result = await fetcher.getNativeBalance(validAddress);

      expect(result.balance).toBe('1500000');
      expect(result.formattedBalance).toBe('1.5');
    });
  });

  describe('getAccountInfo', () => {
    it('returns full account info', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            account_data: {
              Account: validAddress,
              Balance: '50000000',
              Sequence: 42,
              OwnerCount: 3,
              Flags: 0,
            },
          },
        }),
      });

      fetcher = new XrpBalanceFetcher(config);
      const result = await fetcher.getAccountInfo(validAddress);

      expect(result.exists).toBe(true);
      expect(result.balance).toBe(50000000n);
      expect(result.sequence).toBe(42);
      expect(result.ownerCount).toBe(3);
    });

    it('returns exists: false for non-existent account', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            error: 'actNotFound',
          },
        }),
      });

      fetcher = new XrpBalanceFetcher(config);
      const result = await fetcher.getAccountInfo(validAddress2);

      expect(result.exists).toBe(false);
      expect(result.balance).toBe(0n);
      expect(result.sequence).toBe(0);
    });
  });

  describe('getTrustLines', () => {
    it('returns trust lines for account', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            lines: [
              {
                account: issuerAddress,
                currency: 'USD',
                balance: '100.50',
                limit: '1000000',
                limit_peer: '0',
                quality_in: 0,
                quality_out: 0,
                no_ripple: true,
              },
              {
                account: issuerAddress,
                currency: 'EUR',
                balance: '50',
                limit: '500000',
                limit_peer: '0',
                quality_in: 0,
                quality_out: 0,
                no_ripple: false,
              },
            ],
          },
        }),
      });

      fetcher = new XrpBalanceFetcher(config);
      const result = await fetcher.getTrustLines(validAddress);

      expect(result).toHaveLength(2);
      expect(result[0].currency).toBe('USD');
      expect(result[0].balance).toBe('100.50');
      expect(result[0].issuer).toBe(issuerAddress);
      expect(result[1].currency).toBe('EUR');
    });

    it('returns empty array for account with no trust lines', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            lines: [],
          },
        }),
      });

      fetcher = new XrpBalanceFetcher(config);
      const result = await fetcher.getTrustLines(validAddress);

      expect(result).toHaveLength(0);
    });
  });

  describe('getIssuedCurrencyBalance', () => {
    it('returns balance for specific issued currency', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            lines: [
              {
                account: issuerAddress,
                currency: 'USD',
                balance: '250.75',
                limit: '1000000',
              },
            ],
          },
        }),
      });

      fetcher = new XrpBalanceFetcher(config);
      const result = await fetcher.getIssuedCurrencyBalance(validAddress, 'USD', issuerAddress);

      expect(result.balance).toBe('250.75');
      expect(result.currency).toBe('USD');
      expect(result.issuer).toBe(issuerAddress);
    });

    it('returns zero for non-existent trust line', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            lines: [],
          },
        }),
      });

      fetcher = new XrpBalanceFetcher(config);
      const result = await fetcher.getIssuedCurrencyBalance(validAddress, 'USD', issuerAddress);

      expect(result.balance).toBe('0');
    });
  });

  describe('getFee', () => {
    it('returns current network fee', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            drops: {
              base_fee: '10',
              median_fee: '5000',
              minimum_fee: '10',
              open_ledger_fee: '12',
            },
            levels: {
              median_level: '128',
              minimum_level: '64',
              open_ledger_level: '256',
              reference_level: '64',
            },
          },
        }),
      });

      fetcher = new XrpBalanceFetcher(config);
      const result = await fetcher.getFee();

      expect(result.baseFee).toBe('10');
      expect(result.openLedgerFee).toBe('12');
      expect(result.loadFactor).toBe(4); // 256 / 64 = 4
    });
  });

  describe('getLedgerIndex', () => {
    it('returns current ledger index', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            ledger_current_index: 85000000,
          },
        }),
      });

      fetcher = new XrpBalanceFetcher(config);
      const result = await fetcher.getLedgerIndex();

      expect(result).toBe(85000000);
    });
  });

  describe('error handling', () => {
    it('throws RpcError on HTTP failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      fetcher = new XrpBalanceFetcher(config);
      await expect(fetcher.getNativeBalance(validAddress)).rejects.toThrow();
    });

    it('throws RpcError on JSON-RPC error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          error: 'unknownCmd',
          error_message: 'Unknown method.',
        }),
      });

      fetcher = new XrpBalanceFetcher(config);
      await expect(fetcher.getLedgerIndex()).rejects.toThrow();
    });
  });
});
