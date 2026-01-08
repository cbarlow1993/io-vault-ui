// packages/chains/tests/unit/api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getChainProvider,
  getNativeBalance,
  buildNativeTransfer,
  decodeTransaction,
  parseTransaction,
} from '../../src/api.js';

describe('Public API', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  describe('getChainProvider', () => {
    it('returns EVM provider for ethereum', () => {
      const provider = getChainProvider('ethereum');
      expect(provider.chainAlias).toBe('ethereum');
    });

    it('throws for unsupported chain', () => {
      expect(() => getChainProvider('fake-chain' as any)).toThrow('Unsupported chain');
    });
  });

  describe('getNativeBalance', () => {
    it('delegates to chain provider', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: '0xde0b6b3a7640000',
        }),
      });

      const balance = await getNativeBalance('ethereum', '0x742d35Cc6634C0532925a3b844Bc454e4438f44e');

      expect(balance.balance).toBe('1000000000000000000');
      expect(balance.symbol).toBe('ETH');
    });
  });

  describe('decodeTransaction', () => {
    it('decodes EVM transaction to normalised format', () => {
      const serialized = JSON.stringify({
        type: 2,
        chainId: 1,
        nonce: 0,
        to: '0xRecipient',
        value: '1000000000000000000',
        data: '0x',
        gasLimit: '21000',
        maxFeePerGas: '50000000000',
        maxPriorityFeePerGas: '2000000000',
      });

      const result = decodeTransaction('ethereum', serialized, 'normalised');

      expect(result.chainAlias).toBe('ethereum');
      expect(result.type).toBe('native-transfer');
    });
  });

  describe('parseTransaction', () => {
    it('reconstructs UnsignedTransaction from serialized', () => {
      const serialized = JSON.stringify({
        type: 2,
        chainId: 1,
        nonce: 0,
        to: '0xRecipient',
        value: '1000000000000000000',
        data: '0x',
        gasLimit: '21000',
        maxFeePerGas: '50000000000',
        maxPriorityFeePerGas: '2000000000',
      });

      const tx = parseTransaction('ethereum', serialized);

      expect(tx.chainAlias).toBe('ethereum');
      expect(typeof tx.rebuild).toBe('function');
      expect(typeof tx.getSigningPayload).toBe('function');
    });
  });
});
