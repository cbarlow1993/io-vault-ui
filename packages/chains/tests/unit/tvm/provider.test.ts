// packages/chains/tests/unit/tvm/provider.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TvmChainProvider } from '../../../src/tvm/provider.js';
import { CONTRACT_TYPES } from '../../../src/tvm/utils.js';

describe('TvmChainProvider', () => {
  let provider: TvmChainProvider;
  let mockFetch: ReturnType<typeof vi.fn>;

  const mockBlockResponse = {
    blockID: '0000000002fa4c1e8a3d4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e',
    block_header: {
      raw_data: {
        number: 50000000,
        txTrieRoot: 'abc123',
        witness_address: 'def456',
        parentHash: 'parent123',
        version: 1,
        timestamp: Date.now(),
      },
      witness_signature: 'sig123',
    },
  };

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    provider = new TvmChainProvider('tron');
  });

  describe('constructor', () => {
    it('creates provider with default RPC URL', () => {
      const p = new TvmChainProvider('tron');
      expect(p.chainAlias).toBe('tron');
      expect(p.config.rpcUrl).toContain('trongrid.io');
    });

    it('creates provider with custom RPC URL', () => {
      const customUrl = 'https://custom-tron-node.com';
      const p = new TvmChainProvider('tron', customUrl);
      expect(p.config.rpcUrl).toBe(customUrl);
    });

    it('creates testnet provider', () => {
      const p = new TvmChainProvider('tron-testnet');
      expect(p.chainAlias).toBe('tron-testnet');
      expect(p.config.network).toBe('testnet');
    });
  });

  describe('getNativeBalance', () => {
    it('returns TRX balance', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ address: 'TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW', balance: 1000000 }],
          success: true,
        }),
      });

      const balance = await provider.getNativeBalance('TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW');

      expect(balance.symbol).toBe('TRX');
      expect(balance.decimals).toBe(6);
      expect(balance.isNative).toBe(true);
    });
  });

  describe('getTokenBalance', () => {
    it('returns TRC20 token balance', async () => {
      // Mock balanceOf call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: { result: true },
          constant_result: ['0000000000000000000000000000000000000000000000000000000000989680'],
        }),
      });

      // Mock decimals call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: { result: true },
          constant_result: ['0000000000000000000000000000000000000000000000000000000000000006'],
        }),
      });

      // Mock symbol call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: { result: true },
          constant_result: [
            '0000000000000000000000000000000000000000000000000000000000000020' +
              '0000000000000000000000000000000000000000000000000000000000000004' +
              '5553445400000000000000000000000000000000000000000000000000000000',
          ],
        }),
      });

      const balance = await provider.getTokenBalance(
        'TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW',
        'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
      );

      expect(balance.decimals).toBe(6);
      expect(balance.contractAddress).toBe('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t');
    });
  });

  describe('buildNativeTransfer', () => {
    it('builds TRX transfer transaction', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBlockResponse,
      });

      const tx = await provider.buildNativeTransfer({
        from: 'TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW',
        to: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        value: '1000000', // 1 TRX in SUN
      });

      expect(tx).toBeDefined();
      const raw = tx.toRaw();
      expect(raw.rawData.contract[0].type).toBe(CONTRACT_TYPES.TRANSFER);
    });

    it('parses decimal TRX value', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBlockResponse,
      });

      const tx = await provider.buildNativeTransfer({
        from: 'TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW',
        to: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        value: '1.5', // 1.5 TRX
      });

      expect(tx).toBeDefined();
      const normalised = tx.toNormalised();
      expect(normalised.value).toBe('1500000'); // 1.5 TRX in SUN
    });

    it('applies overrides', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBlockResponse,
      });

      const tx = await provider.buildNativeTransfer({
        from: 'TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW',
        to: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        value: '1000000',
        overrides: { feeLimit: 50000000 },
      });

      const raw = tx.toRaw();
      expect(raw.rawData.feeLimit).toBe(50000000);
    });
  });

  describe('buildTokenTransfer', () => {
    it('builds TRC20 transfer transaction', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBlockResponse,
      });

      const tx = await provider.buildTokenTransfer({
        from: 'TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW',
        to: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        contractAddress: 'TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs', // Valid TRON address
        value: '1000000',
      });

      expect(tx).toBeDefined();
      const raw = tx.toRaw();
      expect(raw.rawData.contract[0].type).toBe(CONTRACT_TYPES.TRIGGER_SMART_CONTRACT);
    });

    it('sets default fee limit for TRC20', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBlockResponse,
      });

      const tx = await provider.buildTokenTransfer({
        from: 'TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW',
        to: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        contractAddress: 'TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs',
        value: '1000000',
      });

      const raw = tx.toRaw();
      expect(raw.rawData.feeLimit).toBe(100_000_000); // 100 TRX default
    });
  });

  describe('decode', () => {
    it('decodes raw transaction', () => {
      const txData = {
        txID: 'abc123',
        rawData: {
          contract: [
            {
              type: CONTRACT_TYPES.TRANSFER,
              parameter: {
                value: {
                  owner_address: '41' + 'a'.repeat(40),
                  to_address: '41' + 'b'.repeat(40),
                  amount: 1000000,
                },
                type_url: 'type.googleapis.com/protocol.TransferContract',
              },
            },
          ],
          refBlockBytes: '4c1e',
          refBlockHash: '8a3d4b5c',
          expiration: Date.now() + 60000,
          timestamp: Date.now(),
        },
        rawDataHex: 'deadbeef',
      };

      const raw = provider.decode(JSON.stringify(txData), 'raw');
      expect(raw.txID).toBe('abc123');
    });

    it('decodes normalised transaction', () => {
      const txData = {
        txID: 'abc123',
        rawData: {
          contract: [
            {
              type: CONTRACT_TYPES.TRANSFER,
              parameter: {
                value: {
                  owner_address: '41' + 'a'.repeat(40),
                  to_address: '41' + 'b'.repeat(40),
                  amount: 1000000,
                },
                type_url: 'type.googleapis.com/protocol.TransferContract',
              },
            },
          ],
          refBlockBytes: '4c1e',
          refBlockHash: '8a3d4b5c',
          expiration: Date.now() + 60000,
          timestamp: Date.now(),
        },
        rawDataHex: 'deadbeef',
      };

      const normalised = provider.decode(JSON.stringify(txData), 'normalised');
      expect(normalised.chainAlias).toBe('tron');
      expect(normalised.type).toBe('native-transfer');
    });

    it('throws on invalid JSON', () => {
      expect(() => provider.decode('invalid json', 'raw')).toThrow('Invalid transaction data');
    });
  });

  describe('estimateFee', () => {
    it('returns fee estimates', async () => {
      const estimate = await provider.estimateFee();

      expect(estimate.slow).toBeDefined();
      expect(estimate.standard).toBeDefined();
      expect(estimate.fast).toBeDefined();

      // Slow/standard should be bandwidth cost
      expect(estimate.slow.fee).toBe('270000'); // 270 * 1000 SUN
      expect(estimate.standard.fee).toBe('270000');

      // Fast includes energy cost
      expect(BigInt(estimate.fast.fee)).toBeGreaterThan(BigInt(estimate.standard.fee));
    });

    it('includes formatted fees with symbol', async () => {
      const estimate = await provider.estimateFee();

      expect(estimate.slow.formattedFee).toContain('TRX');
      expect(estimate.standard.formattedFee).toContain('TRX');
      expect(estimate.fast.formattedFee).toContain('TRX');
    });
  });

  describe('estimateGas', () => {
    it('estimates energy for contract call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: { result: true },
          energy_used: 50000,
        }),
      });

      const energy = await provider.estimateGas({
        from: 'TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW',
        contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        data: '0xa9059cbb' + '0'.repeat(128),
      });

      expect(energy).toBe('50000');
    });

    it('returns default on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const energy = await provider.estimateGas({
        from: 'TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW',
        contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        data: '0xa9059cbb' + '0'.repeat(128),
      });

      expect(energy).toBe('30000'); // Default
    });
  });

  describe('contractRead', () => {
    it('reads contract data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: { result: true },
          constant_result: ['0000000000000000000000000000000000000000000000000000000000000006'],
        }),
      });

      const result = await provider.contractRead({
        contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        data: '0x313ce567', // decimals()
      });

      expect(result.data).toBe(
        '0x0000000000000000000000000000000000000000000000000000000000000006'
      );
    });

    it('throws on contract read failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: { result: false, message: 'Contract not found' },
        }),
      });

      await expect(
        provider.contractRead({
          contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // Valid address
          data: '0x313ce567',
        })
      ).rejects.toThrow('Contract read failed');
    });
  });

  describe('contractCall', () => {
    it('builds contract call transaction', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBlockResponse,
      });

      const tx = await provider.contractCall({
        from: 'TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW',
        contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        data: '0xa9059cbb' + '0'.repeat(128),
      });

      expect(tx).toBeDefined();
      const raw = tx.toRaw();
      expect(raw.rawData.contract[0].type).toBe(CONTRACT_TYPES.TRIGGER_SMART_CONTRACT);
    });

    it('includes call value when specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBlockResponse,
      });

      const tx = await provider.contractCall({
        from: 'TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW',
        contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        data: '0xdeadbeef',
        value: '1000000',
      });

      const raw = tx.toRaw();
      expect(raw.rawData.contract[0].parameter.value.call_value).toBe(1000000);
    });
  });

  describe('contractDeploy', () => {
    it('builds contract deploy transaction', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBlockResponse,
      });

      const result = await provider.contractDeploy({
        from: 'TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW',
        bytecode: '0x608060405234801561001057600080fd5b50',
      });

      expect(result.transaction).toBeDefined();
      expect(result.expectedAddress).toBeDefined();
      expect(result.expectedAddress.startsWith('T')).toBe(true);

      const raw = result.transaction.toRaw();
      expect(raw.rawData.contract[0].type).toBe(CONTRACT_TYPES.CREATE_SMART_CONTRACT);
      expect(raw.rawData.feeLimit).toBe(1_000_000_000); // 1000 TRX for deploy
    });

    it('includes constructor args', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBlockResponse,
      });

      const result = await provider.contractDeploy({
        from: 'TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW',
        bytecode: '0x608060405234801561001057600080fd5b50',
        constructorArgs: '0x000000000000000000000000000000000000000000000000000000000000000a',
      });

      expect(result.transaction).toBeDefined();
    });
  });

  describe('getLatestBlock', () => {
    it('fetches latest block', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBlockResponse,
      });

      const block = await provider.getLatestBlock();

      expect(block.blockID).toBe(mockBlockResponse.blockID);
      expect(block.block_header.raw_data.number).toBe(50000000);
    });

    it('throws on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(provider.getLatestBlock()).rejects.toThrow('Failed to fetch block');
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

      const resources = await provider.getAccountResources('TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW');

      expect(resources.freeNetUsed).toBe(100);
      expect(resources.freeNetLimit).toBe(600);
      expect(resources.energyUsed).toBe(5000);
      expect(resources.energyLimit).toBe(100000);
    });
  });

  describe('getTrc20Balances', () => {
    it('returns all TRC20 balances', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              trc20: [
                { TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t: '1000000' },
                { TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs: '500' },
              ],
            },
          ],
          success: true,
        }),
      });

      const balances = await provider.getTrc20Balances('TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW');

      expect(balances).toHaveLength(2);
      expect(balances[0].contractAddress).toBe('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t');
      expect(balances[0].balance).toBe('1000000');
    });
  });
});
