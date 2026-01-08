// packages/chains/tests/unit/utxo/transaction-builder.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnsignedUtxoTransaction, selectUtxos } from '../../../src/utxo/transaction-builder.js';
import { getUtxoChainConfig } from '../../../src/utxo/config.js';
import type { UTXO } from '../../../src/utxo/utils.js';

describe('UnsignedUtxoTransaction', () => {
  const config = getUtxoChainConfig('bitcoin');

  const sampleTxData = {
    version: 2,
    inputs: [
      {
        txid: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
        vout: 0,
        sequence: 0xffffffff,
        value: 100000000n, // 1 BTC
      },
    ],
    outputs: [
      {
        value: 50000000n, // 0.5 BTC to recipient
        address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
      },
      {
        value: 49990000n, // 0.4999 BTC change
        address: '1ChangeAddressExample',
      },
    ],
    locktime: 0,
    fee: 10000n,
    changeAddress: '1ChangeAddressExample',
  };

  describe('constructor', () => {
    it('creates transaction with correct chain alias', () => {
      const tx = new UnsignedUtxoTransaction(config, sampleTxData);
      expect(tx.chainAlias).toBe('bitcoin');
    });

    it('serializes transaction data', () => {
      const tx = new UnsignedUtxoTransaction(config, sampleTxData);
      expect(tx.serialized).toContain('abc123def456');
      expect(tx.serialized).toContain('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2');
    });
  });

  describe('rebuild', () => {
    it('applies RBF override', () => {
      const tx = new UnsignedUtxoTransaction(config, sampleTxData);
      const rebuilt = tx.rebuild({ rbf: true });

      expect(rebuilt.raw.inputs[0]!.sequence).toBe(0xfffffffd);
    });

    it('applies fee rate override', () => {
      const tx = new UnsignedUtxoTransaction(config, sampleTxData);
      const rebuilt = tx.rebuild({ feeRate: 50 });

      expect(rebuilt.raw.fee).toBe(50n);
    });
  });

  describe('getSigningPayload', () => {
    it('returns payload with secp256k1 algorithm', () => {
      const tx = new UnsignedUtxoTransaction(config, sampleTxData);
      const payload = tx.getSigningPayload();

      expect(payload.chainAlias).toBe('bitcoin');
      expect(payload.algorithm).toBe('secp256k1');
    });

    it('returns one message per input', () => {
      const tx = new UnsignedUtxoTransaction(config, sampleTxData);
      const payload = tx.getSigningPayload();

      expect(payload.data).toHaveLength(1); // 1 input
    });

    it('returns multiple messages for multiple inputs', () => {
      const multiInputData = {
        ...sampleTxData,
        inputs: [
          { ...sampleTxData.inputs[0]! },
          { ...sampleTxData.inputs[0]!, vout: 1 },
        ],
      };
      const tx = new UnsignedUtxoTransaction(config, multiInputData);
      const payload = tx.getSigningPayload();

      expect(payload.data).toHaveLength(2);
    });
  });

  describe('applySignature', () => {
    it('creates SignedUtxoTransaction with correct signature count', () => {
      const tx = new UnsignedUtxoTransaction(config, sampleTxData);
      const signed = tx.applySignature(['sig1']);

      expect(signed).toBeDefined();
      expect(signed.chainAlias).toBe('bitcoin');
    });

    it('throws if signature count mismatches input count', () => {
      const tx = new UnsignedUtxoTransaction(config, sampleTxData);

      expect(() => tx.applySignature(['sig1', 'sig2'])).toThrow(
        'Expected 1 signatures, got 2'
      );
    });
  });

  describe('toNormalised', () => {
    it('returns normalised transaction with correct values', () => {
      const tx = new UnsignedUtxoTransaction(config, sampleTxData);
      const normalised = tx.toNormalised();

      expect(normalised.chainAlias).toBe('bitcoin');
      expect(normalised.type).toBe('native-transfer');
      expect(normalised.symbol).toBe('BTC');
    });

    it('identifies primary recipient (excludes change)', () => {
      const tx = new UnsignedUtxoTransaction(config, sampleTxData);
      const normalised = tx.toNormalised();

      expect(normalised.to).toBe('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2');
    });

    it('includes input/output counts in metadata', () => {
      const tx = new UnsignedUtxoTransaction(config, sampleTxData);
      const normalised = tx.toNormalised();

      expect(normalised.metadata?.inputCount).toBe(1);
      expect(normalised.metadata?.outputCount).toBe(2);
    });
  });

  describe('toRaw', () => {
    it('returns raw Bitcoin transaction format', () => {
      const tx = new UnsignedUtxoTransaction(config, sampleTxData);
      const raw = tx.toRaw();

      expect(raw._chain).toBe('utxo');
      expect(raw.version).toBe(2);
      expect(raw.inputs).toHaveLength(1);
      expect(raw.outputs).toHaveLength(2);
      expect(raw.locktime).toBe(0);
    });
  });

  describe('getTotalInputValue', () => {
    it('sums all input values', () => {
      const tx = new UnsignedUtxoTransaction(config, sampleTxData);
      expect(tx.getTotalInputValue()).toBe(100000000n);
    });
  });

  describe('getTotalOutputValue', () => {
    it('sums all output values', () => {
      const tx = new UnsignedUtxoTransaction(config, sampleTxData);
      expect(tx.getTotalOutputValue()).toBe(99990000n); // 50000000 + 49990000
    });
  });

  describe('getImplicitFee', () => {
    it('calculates fee as inputs - outputs', () => {
      const tx = new UnsignedUtxoTransaction(config, sampleTxData);
      expect(tx.getImplicitFee()).toBe(10000n); // 100000000 - 99990000
    });
  });
});

describe('selectUtxos', () => {
  const utxos: UTXO[] = [
    { txid: 'tx1', vout: 0, value: 10000n, scriptPubKey: '' },
    { txid: 'tx2', vout: 0, value: 50000n, scriptPubKey: '' },
    { txid: 'tx3', vout: 0, value: 100000n, scriptPubKey: '' },
  ];

  it('selects UTXOs to meet target amount', () => {
    const result = selectUtxos(utxos, 40000n, 1000n);

    expect(result.total).toBeGreaterThanOrEqual(41000n);
  });

  it('sorts by value descending (largest first)', () => {
    const result = selectUtxos(utxos, 40000n, 1000n);

    // Should select the 100000n UTXO first
    expect(result.selected[0]!.value).toBe(100000n);
  });

  it('selects minimum needed UTXOs', () => {
    const result = selectUtxos(utxos, 40000n, 1000n);

    // Only needs 100000n UTXO to cover 41000n target
    expect(result.selected).toHaveLength(1);
  });

  it('selects multiple UTXOs when necessary', () => {
    const result = selectUtxos(utxos, 140000n, 1000n);

    // Needs at least 141000n, so multiple UTXOs
    expect(result.selected.length).toBeGreaterThan(1);
  });
});
