// packages/chains/tests/unit/evm/provider.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EvmChainProvider } from '../../../src/evm/provider.js';

describe('EvmChainProvider', () => {
  let provider: EvmChainProvider;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    provider = new EvmChainProvider('ethereum');
  });

  it('has correct chainAlias', () => {
    expect(provider.chainAlias).toBe('ethereum');
  });

  it('has correct config', () => {
    expect(provider.config.chainId).toBe(1);
    expect(provider.config.nativeCurrency.symbol).toBe('ETH');
  });

  describe('buildNativeTransfer', () => {
    it('builds EIP-1559 transaction', async () => {
      // Mock nonce
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jsonrpc: '2.0', id: 1, result: '0x5' }),
      });
      // Mock gas estimate
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jsonrpc: '2.0', id: 2, result: '0x5208' }),
      });
      // Mock fee data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 3,
          result: { baseFeePerGas: '0x2540be400' },
        }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jsonrpc: '2.0', id: 4, result: '0x77359400' }),
      });

      const tx = await provider.buildNativeTransfer({
        from: '0xSender',
        to: '0xRecipient',
        value: '1000000000000000000',
      });

      expect(tx.chainAlias).toBe('ethereum');
      expect(tx.raw).toBeDefined();
    });
  });

  describe('decode', () => {
    it('decodes to raw format', () => {
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

      const raw = provider.decode(serialized, 'raw');

      expect(raw._chain).toBe('evm');
      expect(raw.type).toBe(2);
    });

    it('decodes to normalised format', () => {
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

      const normalised = provider.decode(serialized, 'normalised');

      expect(normalised.chainAlias).toBe('ethereum');
      expect(normalised.type).toBe('native-transfer');
    });
  });
});
