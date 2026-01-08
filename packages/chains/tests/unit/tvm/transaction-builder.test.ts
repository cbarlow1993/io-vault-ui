// packages/chains/tests/unit/tvm/transaction-builder.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  UnsignedTvmTransaction,
  buildTrxTransfer,
  buildTrc20Transfer,
  type TvmTransactionData,
  type BlockInfo,
} from '../../../src/tvm/transaction-builder.js';
import { getTvmChainConfig } from '../../../src/tvm/config.js';
import { CONTRACT_TYPES } from '../../../src/tvm/utils.js';

describe('TVM Transaction Builder', () => {
  const config = getTvmChainConfig('tron');

  const mockBlockInfo: BlockInfo = {
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

  describe('UnsignedTvmTransaction', () => {
    let txData: TvmTransactionData;

    beforeEach(() => {
      txData = {
        txID: 'abc123def456',
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
          refBlockHash: '8a3d4b5c6d7e8f9a',
          expiration: Date.now() + 60000,
          timestamp: Date.now(),
        },
        rawDataHex: 'deadbeef',
      };
    });

    describe('getSigningPayload', () => {
      it('returns correct signing payload for TRX transfer', () => {
        const tx = new UnsignedTvmTransaction(config, txData);
        const payload = tx.getSigningPayload();

        expect(payload.chainAlias).toBe('tron');
        expect(payload.algorithm).toBe('secp256k1');
        expect(payload.data).toHaveLength(1);
        expect(payload.data[0]).toBe(txData.txID);
      });
    });

    describe('applySignature', () => {
      it('returns signed transaction with signature array', () => {
        const tx = new UnsignedTvmTransaction(config, txData);
        const signatures = ['aabbccdd' + '0'.repeat(120)]; // Array of signatures

        const signed = tx.applySignature(signatures);

        expect(signed).toBeDefined();
      });

      it('handles signature with 0x prefix', () => {
        const tx = new UnsignedTvmTransaction(config, txData);
        const signatures = ['0xaabbccdd' + '0'.repeat(120)];

        const signed = tx.applySignature(signatures);
        expect(signed).toBeDefined();
      });

      it('throws when no signatures provided', () => {
        const tx = new UnsignedTvmTransaction(config, txData);

        expect(() => tx.applySignature([])).toThrow('At least one signature is required');
      });
    });

    describe('rebuild', () => {
      it('rebuilds with new fee limit', () => {
        const tx = new UnsignedTvmTransaction(config, txData);
        const rebuilt = tx.rebuild({ feeLimit: 200000000 });

        expect(rebuilt).toBeInstanceOf(UnsignedTvmTransaction);
        const raw = rebuilt.toRaw();
        expect(raw.rawData.feeLimit).toBe(200000000);
      });

      it('preserves original data when no overrides', () => {
        const tx = new UnsignedTvmTransaction(config, txData);
        const rebuilt = tx.rebuild({});

        expect(rebuilt.toRaw().txID).toBe(txData.txID);
      });
    });

    describe('serialized', () => {
      it('returns JSON string', () => {
        const tx = new UnsignedTvmTransaction(config, txData);
        const serialized = tx.serialized;

        expect(typeof serialized).toBe('string');
        const parsed = JSON.parse(serialized);
        expect(parsed.txID).toBe(txData.txID);
      });
    });

    describe('toNormalised', () => {
      it('returns normalised transaction format', () => {
        const tx = new UnsignedTvmTransaction(config, txData);
        const normalised = tx.toNormalised();

        expect(normalised.chainAlias).toBe('tron');
        expect(normalised.type).toBe('native-transfer');
        expect(normalised.from).toBeDefined();
        expect(normalised.to).toBeDefined();
        expect(normalised.value).toBe('1000000');
      });

      it('handles TRC20 transfer type', () => {
        const trc20TxData: TvmTransactionData = {
          ...txData,
          rawData: {
            ...txData.rawData,
            contract: [
              {
                type: CONTRACT_TYPES.TRIGGER_SMART_CONTRACT,
                parameter: {
                  value: {
                    owner_address: '41' + 'a'.repeat(40),
                    contract_address: '41' + 'c'.repeat(40),
                    data: 'a9059cbb' + '0'.repeat(128), // transfer selector
                    call_value: 0,
                  },
                  type_url: 'type.googleapis.com/protocol.TriggerSmartContract',
                },
              },
            ],
            feeLimit: 100000000,
          },
        };

        const tx = new UnsignedTvmTransaction(config, trc20TxData);
        const normalised = tx.toNormalised();

        expect(normalised.type).toBe('token-transfer');
      });

      it('handles contract call type', () => {
        const contractCallTxData: TvmTransactionData = {
          ...txData,
          rawData: {
            ...txData.rawData,
            contract: [
              {
                type: CONTRACT_TYPES.TRIGGER_SMART_CONTRACT,
                parameter: {
                  value: {
                    owner_address: '41' + 'a'.repeat(40),
                    contract_address: '41' + 'c'.repeat(40),
                    data: 'deadbeef' + '0'.repeat(56), // non-transfer selector
                    call_value: 0,
                  },
                  type_url: 'type.googleapis.com/protocol.TriggerSmartContract',
                },
              },
            ],
            feeLimit: 100000000,
          },
        };

        const tx = new UnsignedTvmTransaction(config, contractCallTxData);
        const normalised = tx.toNormalised();

        expect(normalised.type).toBe('contract-call');
      });
    });

    describe('toRaw', () => {
      it('returns raw TRON transaction format', () => {
        const tx = new UnsignedTvmTransaction(config, txData);
        const raw = tx.toRaw();

        expect(raw.txID).toBe(txData.txID);
        expect(raw.rawData).toBeDefined();
        expect(raw.rawData.contract).toHaveLength(1);
      });
    });
  });

  describe('buildTrxTransfer', () => {
    it('builds TRX transfer transaction', () => {
      const from = 'TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW';
      const to = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
      const amount = 1000000n;

      const tx = buildTrxTransfer(config, from, to, amount, mockBlockInfo);

      expect(tx).toBeInstanceOf(UnsignedTvmTransaction);
      const raw = tx.toRaw();
      expect(raw.rawData.contract[0].type).toBe(CONTRACT_TYPES.TRANSFER);
    });

    it('sets correct expiration time', () => {
      const before = Date.now();
      const tx = buildTrxTransfer(
        config,
        'TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW',
        'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        1000000n,
        mockBlockInfo
      );
      const after = Date.now();

      const raw = tx.toRaw();
      // Expiration should be ~1 hour from now
      expect(raw.rawData.expiration).toBeGreaterThan(before);
      expect(raw.rawData.expiration).toBeLessThanOrEqual(after + 60 * 60 * 1000 + 1000);
    });

    it('uses ref block from block info', () => {
      const tx = buildTrxTransfer(
        config,
        'TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW',
        'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        1000000n,
        mockBlockInfo
      );

      const raw = tx.toRaw();
      expect(raw.rawData.refBlockBytes).toBeDefined();
      expect(raw.rawData.refBlockHash).toBeDefined();
    });
  });

  describe('buildTrc20Transfer', () => {
    it('builds TRC20 transfer transaction', () => {
      const from = 'TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW';
      const to = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
      const contract = 'TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs'; // Valid TRON address
      const amount = 1000000n;
      const feeLimit = 100000000;

      const tx = buildTrc20Transfer(config, from, to, contract, amount, mockBlockInfo, feeLimit);

      expect(tx).toBeInstanceOf(UnsignedTvmTransaction);
      const raw = tx.toRaw();
      expect(raw.rawData.contract[0].type).toBe(CONTRACT_TYPES.TRIGGER_SMART_CONTRACT);
      expect(raw.rawData.feeLimit).toBe(feeLimit);
    });

    it('encodes transfer data correctly', () => {
      const tx = buildTrc20Transfer(
        config,
        'TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW',
        'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        'TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs',
        1000000n,
        mockBlockInfo,
        100000000
      );

      const raw = tx.toRaw();
      const data = raw.rawData.contract[0].parameter.value.data as string;
      // Should start with transfer function selector
      expect(data.startsWith('a9059cbb')).toBe(true);
    });
  });
});
