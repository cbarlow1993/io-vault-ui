// packages/chains/tests/unit/xrp/provider.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { XrpChainProvider } from '../../../src/xrp/provider.js';
import { ContractError } from '../../../src/core/errors.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('XrpChainProvider', () => {
  let provider: XrpChainProvider;

  // Valid XRP addresses for testing
  const validAddress = 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh';
  const validAddress2 = 'rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn'; // Known valid mainnet address
  const issuerAddress = 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe';

  beforeEach(() => {
    vi.resetAllMocks();
    provider = new XrpChainProvider('xrp');
  });

  describe('basic properties', () => {
    it('returns correct chainAlias', () => {
      expect(provider.chainAlias).toBe('xrp');
    });

    it('returns correct ecosystem', () => {
      expect(provider.ecosystem).toBe('xrp');
    });
  });

  describe('validateAddress', () => {
    it('validates correct XRP addresses', () => {
      expect(provider.validateAddress(validAddress)).toBe(true);
      expect(provider.validateAddress(validAddress2)).toBe(true);
    });

    it('rejects invalid addresses', () => {
      expect(provider.validateAddress('')).toBe(false);
      expect(provider.validateAddress('invalid')).toBe(false);
      expect(provider.validateAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44e')).toBe(false);
    });
  });

  describe('getNativeBalance', () => {
    it('returns native balance', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            account_data: {
              Account: validAddress,
              Balance: '50000000',
              Sequence: 1,
              OwnerCount: 0,
            },
          },
        }),
      });

      const result = await provider.getNativeBalance(validAddress);

      expect(result.balance).toBe('50000000');
      expect(result.formattedBalance).toBe('50');
      expect(result.symbol).toBe('XRP');
      expect(result.decimals).toBe(6);
      expect(result.isNative).toBe(true);
    });
  });

  describe('getTokenBalance', () => {
    it('returns issued currency balance', async () => {
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
              },
            ],
          },
        }),
      });

      const result = await provider.getTokenBalance(validAddress, `USD:${issuerAddress}`);

      expect(result.symbol).toBe('USD');
      expect(result.isNative).toBe(false);
      expect(result.contractAddress).toBe(`USD:${issuerAddress}`);
    });

    it('throws on invalid token identifier format', async () => {
      await expect(provider.getTokenBalance(validAddress, 'USD')).rejects.toThrow(
        'Invalid token identifier'
      );
    });
  });

  describe('buildNativeTransfer', () => {
    const setupMocksForTransfer = () => {
      // Mock account_info
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            account_data: {
              Account: validAddress,
              Balance: '100000000',
              Sequence: 42,
              OwnerCount: 0,
            },
          },
        }),
      });
      // Mock fee
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            drops: {
              base_fee: '12',
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
      // Mock ledger index
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            ledger_current_index: 85000000,
          },
        }),
      });
    };

    it('builds native XRP transfer', async () => {
      setupMocksForTransfer();

      const tx = await provider.buildNativeTransfer({ from: validAddress, to: validAddress2, value: '1000000' });

      const raw = tx.toRaw();
      expect(raw._chain).toBe('xrp');
      expect(raw.TransactionType).toBe('Payment');
      expect(raw.Account).toBe(validAddress);
      expect(raw.Destination).toBe(validAddress2);
      expect(raw.Amount).toBe('1000000');
      expect(raw.Sequence).toBe(42);
    });

    it('throws on invalid from address', async () => {
      await expect(provider.buildNativeTransfer({ from: 'invalid', to: validAddress2, value: '1000000' })).rejects.toThrow(
        'Invalid XRP address'
      );
    });

    it('throws on invalid to address', async () => {
      await expect(provider.buildNativeTransfer({ from: validAddress, to: 'invalid', value: '1000000' })).rejects.toThrow(
        'Invalid XRP address'
      );
    });

    it('throws when account not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            error: 'actNotFound',
          },
        }),
      });

      await expect(provider.buildNativeTransfer({ from: validAddress, to: validAddress2, value: '1000000' })).rejects.toThrow(
        'Account not found'
      );
    });
  });

  describe('buildTokenTransfer', () => {
    const setupMocksForTransfer = () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            account_data: {
              Account: validAddress,
              Balance: '100000000',
              Sequence: 10,
              OwnerCount: 2,
            },
          },
        }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            drops: {
              base_fee: '12',
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
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            ledger_current_index: 85000000,
          },
        }),
      });
    };

    it('builds issued currency transfer', async () => {
      setupMocksForTransfer();

      const tx = await provider.buildTokenTransfer({
        from: validAddress,
        to: validAddress2,
        contractAddress: `USD:${issuerAddress}`,
        value: '100',
      });

      const raw = tx.toRaw();
      expect(raw.TransactionType).toBe('Payment');
      expect(raw.Amount).toEqual({
        currency: 'USD',
        issuer: issuerAddress,
        value: '100',
      });
    });

    it('throws on invalid token identifier', async () => {
      await expect(
        provider.buildTokenTransfer({ from: validAddress, to: validAddress2, contractAddress: 'invalid', value: '100' })
      ).rejects.toThrow('Invalid token identifier');
    });
  });

  describe('broadcastTransaction', () => {
    it('broadcasts transaction successfully', async () => {
      const tx = (await import('../../../src/xrp/transaction-builder.js')).buildXrpTransfer(
        provider.config,
        validAddress,
        validAddress2,
        1000000n,
        '12',
        1
      );
      const signed = tx.applySignature(['signature123']);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            engine_result: 'tesSUCCESS',
            engine_result_message: 'The transaction was applied.',
            tx_json: {
              hash: 'ABC123DEF456',
            },
          },
        }),
      });

      const result = await signed.broadcast();

      expect(result.hash).toBe('ABC123DEF456');
      expect(result.success).toBe(true);
    });

    it('returns success for tec codes', async () => {
      const tx = (await import('../../../src/xrp/transaction-builder.js')).buildXrpTransfer(
        provider.config,
        validAddress,
        validAddress2,
        1000000n,
        '12',
        1
      );
      const signed = tx.applySignature(['signature123']);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            engine_result: 'tecPATH_DRY',
            engine_result_message: 'Path could not send partial amount.',
            tx_json: { hash: 'ABC123' },
          },
        }),
      });

      const result = await signed.broadcast();
      // tec codes are considered success (transaction applied but with a "claim" result)
      expect(result.success).toBe(true);
    });

    it('returns failure on transaction error', async () => {
      const tx = (await import('../../../src/xrp/transaction-builder.js')).buildXrpTransfer(
        provider.config,
        validAddress,
        validAddress2,
        1000000n,
        '12',
        1
      );
      const signed = tx.applySignature(['signature123']);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            engine_result: 'tefBAD_AUTH',
            engine_result_message: 'Transaction is not properly signed.',
          },
        }),
      });

      const result = await signed.broadcast();
      expect(result.success).toBe(false);
      expect(result.error).toContain('tefBAD_AUTH');
    });
  });

  describe('getTransaction', () => {
    it('returns confirmed status for validated transaction', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            validated: true,
            meta: {
              TransactionResult: 'tesSUCCESS',
            },
            hash: 'ABC123',
          },
        }),
      });

      const result = await provider.getTransaction('ABC123');

      expect(result.normalized.hash).toBe('ABC123');
      expect(result.normalized.status).toBe('confirmed');
    });

    it('returns pending status for unvalidated transaction', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            validated: false,
            hash: 'ABC123',
          },
        }),
      });

      const result = await provider.getTransaction('ABC123');
      expect(result.normalized.status).toBe('pending');
    });

    it('throws error for not found transaction', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          error: 'txnNotFound',
        }),
      });

      await expect(provider.getTransaction('NOTFOUND')).rejects.toThrow('Transaction not found');
    });

    it('returns failed status for failed transaction', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            validated: true,
            meta: {
              TransactionResult: 'tecUNFUNDED_PAYMENT',
            },
            hash: 'ABC123',
          },
        }),
      });

      const result = await provider.getTransaction('ABC123');
      expect(result.normalized.status).toBe('failed');
    });
  });

  describe('estimateFee', () => {
    it('returns estimated fee', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            drops: {
              base_fee: '12',
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

      const fee = await provider.estimateFee();
      expect(fee.slow.fee).toBeDefined();
      expect(fee.standard.fee).toBeDefined();
      expect(fee.fast.fee).toBeDefined();
    });
  });

  describe('XRP-specific methods', () => {
    describe('getAccountInfo', () => {
      it('returns account info', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: {
              account_data: {
                Account: validAddress,
                Balance: '100000000',
                Sequence: 42,
                OwnerCount: 5,
              },
            },
          }),
        });

        const result = await provider.getAccountInfo(validAddress);

        expect(result.exists).toBe(true);
        expect(result.balance).toBe(100000000n);
        expect(result.sequence).toBe(42);
        expect(result.ownerCount).toBe(5);
      });
    });

    describe('getTrustLines', () => {
      it('returns trust lines', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: {
              lines: [
                {
                  account: issuerAddress,
                  currency: 'USD',
                  balance: '100',
                  limit: '1000000',
                },
              ],
            },
          }),
        });

        const result = await provider.getTrustLines(validAddress);

        expect(result).toHaveLength(1);
        expect(result[0].currency).toBe('USD');
      });
    });

    describe('buildTrustSet', () => {
      const setupMocksForTrustSet = () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: {
              account_data: {
                Account: validAddress,
                Balance: '100000000',
                Sequence: 5,
                OwnerCount: 0,
              },
            },
          }),
        });
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: {
              drops: {
                base_fee: '12',
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
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: { ledger_current_index: 85000000 },
          }),
        });
      };

      it('builds trust set transaction', async () => {
        setupMocksForTrustSet();

        const tx = await provider.buildTrustSet(validAddress, 'USD', issuerAddress, '1000000');

        const raw = tx.toRaw();
        expect(raw.TransactionType).toBe('TrustSet');
        expect(raw.LimitAmount).toEqual({
          currency: 'USD',
          issuer: issuerAddress,
          value: '1000000',
        });
      });

      it('throws on invalid from address', async () => {
        await expect(
          provider.buildTrustSet('invalid', 'USD', issuerAddress, '1000000')
        ).rejects.toThrow('Invalid XRP address');
      });

      it('throws on invalid issuer address', async () => {
        await expect(
          provider.buildTrustSet(validAddress, 'USD', 'invalid', '1000000')
        ).rejects.toThrow('Invalid XRP address');
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

        const result = await provider.getLedgerIndex();
        expect(result).toBe(85000000);
      });
    });
  });

  describe('contract operations', () => {
    it('throws ContractError for contractRead', async () => {
      await expect(provider.contractRead()).rejects.toThrow(ContractError);
      await expect(provider.contractRead()).rejects.toThrow('not supported on XRP Ledger');
    });

    it('throws ContractError for contractCall', async () => {
      await expect(provider.contractCall()).rejects.toThrow(ContractError);
    });

    it('throws ContractError for contractDeploy', async () => {
      await expect(provider.contractDeploy()).rejects.toThrow(ContractError);
    });
  });
});
