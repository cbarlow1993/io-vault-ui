// packages/chains/tests/unit/utxo/provider.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UtxoChainProvider } from '../../../src/utxo/provider.js';
import { ChainError } from '../../../src/core/errors.js';

describe('UtxoChainProvider', () => {
  let provider: UtxoChainProvider;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    provider = new UtxoChainProvider('bitcoin');
  });

  it('initializes with valid chain alias', () => {
    expect(provider.chainAlias).toBe('bitcoin');
    expect(provider.config.network).toBe('mainnet');
    expect(provider.config.nativeCurrency.decimals).toBe(8);
  });

  it('initializes testnet with custom RPC', () => {
    const testnetProvider = new UtxoChainProvider('bitcoin-testnet', 'https://custom-api.com');
    expect(testnetProvider.chainAlias).toBe('bitcoin-testnet');
    expect(testnetProvider.config.rpcUrl).toBe('https://custom-api.com');
  });

  describe('buildNativeTransfer', () => {
    it('creates correct transaction for BTC transfer', async () => {
      // Mock UTXO fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            txid: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
            vout: 0,
            status: { confirmed: true },
            value: 100000000, // 1 BTC
          },
        ],
      });

      // Mock fee rate fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          fastestFee: 20,
          halfHourFee: 10,
          hourFee: 5,
          economyFee: 2,
          minimumFee: 1,
        }),
      });

      const tx = await provider.buildNativeTransfer({
        from: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
        to: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
        value: '50000000', // 0.5 BTC
      });

      expect(tx.chainAlias).toBe('bitcoin');
      expect(tx.raw).toBeDefined();
      expect(tx.raw.inputs).toHaveLength(1);
      expect(tx.raw.outputs.length).toBeGreaterThanOrEqual(1);
    });

    it('throws when insufficient UTXOs', async () => {
      // Mock empty UTXO response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await expect(
        provider.buildNativeTransfer({
          from: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          to: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
          value: '50000000',
        })
      ).rejects.toThrow('No UTXOs found');
    });
  });

  describe('buildTokenTransfer', () => {
    it('throws ChainError for UTXO chains', async () => {
      await expect(
        provider.buildTokenTransfer({
          from: 'bc1q...',
          to: '1Bv...',
          contractAddress: 'token',
          value: '100',
        })
      ).rejects.toThrow(ChainError);
    });
  });

  describe('decode', () => {
    it('decodes serialized transaction to normalised format', () => {
      const serialized = JSON.stringify({
        version: 2,
        inputs: [
          {
            txid: 'abc123',
            vout: 0,
            sequence: 0xffffffff,
            value: '100000000',
          },
        ],
        outputs: [
          { value: '50000000', address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2' },
        ],
        locktime: 0,
        fee: '1000',
      });

      const normalised = provider.decode(serialized, 'normalised');

      expect(normalised.chainAlias).toBe('bitcoin');
      expect(normalised.type).toBe('native-transfer');
      expect(normalised.symbol).toBe('BTC');
    });

    it('decodes to raw format', () => {
      const serialized = JSON.stringify({
        version: 2,
        inputs: [{ txid: 'abc', vout: 0, sequence: 0xffffffff, value: '1000' }],
        outputs: [{ value: '500', address: '1Addr' }],
        locktime: 0,
      });

      const raw = provider.decode(serialized, 'raw');

      expect(raw._chain).toBe('utxo');
      expect(raw.version).toBe(2);
    });
  });

  describe('estimateFee', () => {
    it('returns fee estimate with slow/standard/fast tiers', async () => {
      // Mock fee rate fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          fastestFee: 20,
          halfHourFee: 10,
          hourFee: 5,
          economyFee: 2,
          minimumFee: 1,
        }),
      });

      const estimate = await provider.estimateFee();

      expect(estimate.slow).toBeDefined();
      expect(estimate.standard).toBeDefined();
      expect(estimate.fast).toBeDefined();
      expect(estimate.standard.formattedFee).toContain('BTC');
    });

    it('uses default rates when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const estimate = await provider.estimateFee();

      // Should still return valid estimates
      expect(estimate.slow).toBeDefined();
      expect(estimate.standard).toBeDefined();
      expect(estimate.fast).toBeDefined();
    });
  });

  describe('contract methods', () => {
    it('contractRead throws ChainError', async () => {
      await expect(
        provider.contractRead({ contractAddress: 'addr', method: 'test', args: [] })
      ).rejects.toThrow(ChainError);
    });

    it('contractCall throws ChainError', async () => {
      await expect(
        provider.contractCall({ from: 'addr', contractAddress: 'addr', data: '0x' })
      ).rejects.toThrow(ChainError);
    });

    it('contractDeploy throws ChainError', async () => {
      await expect(
        provider.contractDeploy({ from: 'addr', bytecode: '0x' })
      ).rejects.toThrow(ChainError);
    });
  });

  describe('getFeeRates', () => {
    it('fetches from mempool.space API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          fastestFee: 25,
          halfHourFee: 15,
          hourFee: 8,
          economyFee: 3,
          minimumFee: 1,
        }),
      });

      const rates = await provider.getFeeRates();

      expect(rates.fastestFee).toBe(25);
      expect(rates.halfHourFee).toBe(15);
      expect(rates.hourFee).toBe(8);
    });
  });
});
