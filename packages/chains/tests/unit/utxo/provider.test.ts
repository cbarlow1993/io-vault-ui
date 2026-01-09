// packages/chains/tests/unit/utxo/provider.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UtxoChainProvider } from '../../../src/utxo/provider.js';
import { ChainError } from '../../../src/core/errors.js';
import { UtxoSelectionError } from '../../../src/utxo/errors.js';

// Test compressed public key (33 bytes hex)
const TEST_PUBKEY_HEX = '02' + '0'.repeat(62) + '01';

// Valid P2WPKH scriptPubKey (OP_0 <20-byte-hash>)
const TEST_SCRIPT_PUBKEY = '0014' + 'a'.repeat(40);

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

  describe('getNativeBalance', () => {
    it('returns balance from Blockbook API', async () => {
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

      const balance = await provider.getNativeBalance('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');

      expect(balance.balance).toBe('60000000');
      expect(balance.formattedBalance).toBe('0.6');
      expect(balance.symbol).toBe('BTC');
    });
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
            value: '100000000', // 1 BTC
            confirmations: 6,
            scriptPubKey: TEST_SCRIPT_PUBKEY,
            address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          },
        ],
      });

      // Mock fee rate fetch (Blockbook returns BTC/kB)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: '0.00010000', // 10 sat/vB
        }),
      });

      const tx = await provider.buildNativeTransfer({
        from: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
        to: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
        value: '50000000', // 0.5 BTC
        publicKey: TEST_PUBKEY_HEX,
      });

      expect(tx.chainAlias).toBe('bitcoin');
      expect(tx.raw).toBeDefined();
      expect(tx.raw.inputMetadata).toHaveLength(1);
      expect(tx.raw.outputs.length).toBeGreaterThanOrEqual(1);
    });

    it('throws when publicKey is not provided', async () => {
      await expect(
        provider.buildNativeTransfer({
          from: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          to: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
          value: '50000000',
        })
      ).rejects.toThrow('publicKey is required for UTXO transactions');
    });

    it('throws when no UTXOs found', async () => {
      // Mock empty UTXO response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await expect(
        provider.buildNativeTransfer({
          from: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          to: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
          value: '50000000',
          publicKey: TEST_PUBKEY_HEX,
        })
      ).rejects.toThrow(UtxoSelectionError);
    });

    it('throws when insufficient balance', async () => {
      // Mock UTXO with small value
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            txid: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
            vout: 0,
            value: '1000', // 0.00001 BTC
            confirmations: 6,
            scriptPubKey: TEST_SCRIPT_PUBKEY,
            address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          },
        ],
      });

      // Mock fee rate fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: '0.00010000',
        }),
      });

      await expect(
        provider.buildNativeTransfer({
          from: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          to: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
          value: '50000000',
          publicKey: TEST_PUBKEY_HEX,
        })
      ).rejects.toThrow('Insufficient funds');
    });

    it('uses custom UTXOs when provided in overrides', async () => {
      // Mock fee rate fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: '0.00010000',
        }),
      });

      const tx = await provider.buildNativeTransfer({
        from: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
        to: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
        value: '10000',
        publicKey: TEST_PUBKEY_HEX,
        overrides: {
          utxos: [
            {
              // Valid 64-char hex txid
              txid: 'abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234',
              vout: 0,
              value: 100000n,
              scriptPubKey: TEST_SCRIPT_PUBKEY,
              address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
              confirmations: 10,
            },
          ],
        },
      });

      expect(tx.raw.inputMetadata).toHaveLength(1);
    });

    it('uses custom fee rate when provided', async () => {
      // Mock UTXO fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            txid: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
            vout: 0,
            value: '100000000',
            confirmations: 6,
            scriptPubKey: TEST_SCRIPT_PUBKEY,
            address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          },
        ],
      });

      const tx = await provider.buildNativeTransfer({
        from: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
        to: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
        value: '50000000',
        publicKey: TEST_PUBKEY_HEX,
        overrides: {
          feeRate: 50, // 50 sat/vB
        },
      });

      // Fee should be calculated with higher rate
      expect(tx.raw.fee).toBeGreaterThan(0n);
    });
  });

  describe('buildTokenTransfer', () => {
    it('throws ChainError for UTXO chains', async () => {
      await expect(
        provider.buildTokenTransfer({
          from: 'bc1q...',
          to: 'bc1q...',
          contractAddress: 'token',
          value: '100',
        })
      ).rejects.toThrow(ChainError);
    });
  });

  describe('estimateFee', () => {
    it('returns fee estimate with slow/standard/fast tiers', async () => {
      // Mock fee rate fetch (3 parallel requests)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: '0.00025000' }), // 25 sat/vB fast
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: '0.00015000' }), // 15 sat/vB standard
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: '0.00008000' }), // 8 sat/vB slow
      });

      const estimate = await provider.estimateFee();

      expect(estimate.slow).toBeDefined();
      expect(estimate.standard).toBeDefined();
      expect(estimate.fast).toBeDefined();
      expect(estimate.standard.formattedFee).toContain('BTC');
    });

    it('returns valid estimates with fallback rates', async () => {
      // Mock fee rate fetch returning 0 (triggers fallback)
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ result: '-1' }), // Invalid rate triggers fallback
      });

      const estimate = await provider.estimateFee();

      // Should still return valid estimates with minimum rate
      expect(estimate.slow).toBeDefined();
      expect(estimate.standard).toBeDefined();
      expect(estimate.fast).toBeDefined();
    });
  });

  describe('getUtxos', () => {
    it('returns UTXOs from Blockbook API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            txid: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
            vout: 0,
            value: '50000000',
            confirmations: 6,
            scriptPubKey: TEST_SCRIPT_PUBKEY,
            address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          },
        ],
      });

      const utxos = await provider.getUtxos('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');

      expect(utxos).toHaveLength(1);
      expect(utxos[0]!.value).toBe(50000000n);
    });
  });

  describe('getFeeRates', () => {
    it('fetches fee rates from Blockbook API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: '0.00025000' }), // fast
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: '0.00015000' }), // standard
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: '0.00008000' }), // slow
      });

      const rates = await provider.getFeeRates();

      expect(rates.fast).toBeGreaterThan(0);
      expect(rates.standard).toBeGreaterThan(0);
      expect(rates.slow).toBeGreaterThan(0);
      expect(rates.fast).toBeGreaterThanOrEqual(rates.standard);
      expect(rates.standard).toBeGreaterThanOrEqual(rates.slow);
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

      const balance = await provider.getConfirmedBalance('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');

      expect(balance.balance).toBe('50000000');
    });
  });

  describe('broadcastRawTransaction', () => {
    it('broadcasts transaction via Blockbook API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
        }),
      });

      const txid = await provider.broadcastRawTransaction('0100...');

      expect(txid).toBe('abc123def456abc123def456abc123def456abc123def456abc123def456abc1');
    });
  });
});
