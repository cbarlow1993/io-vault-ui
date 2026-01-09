// packages/chains/tests/unit/utxo/transaction-builder.test.ts

import { describe, it, expect } from 'vitest';
import * as bitcoin from '@iofinnet/bitcoinjs-lib';
import {
  UnsignedUtxoTransaction,
  selectUtxos,
  estimateTransactionSize,
} from '../../../src/utxo/transaction-builder.js';
import { PsbtBuilder } from '../../../src/utxo/psbt-builder.js';
import { getUtxoChainConfig } from '../../../src/utxo/config.js';
import type { UTXO } from '../../../src/utxo/blockbook-client.js';

// Test compressed public key (33 bytes)
const TEST_PUBKEY = Buffer.from(
  '02' + '0'.repeat(62) + '01',
  'hex'
);

// Valid P2WPKH scriptPubKey for testnet (OP_0 <20-byte-hash>)
const TEST_SCRIPT_PUBKEY = '0014' + 'a'.repeat(40); // 22 bytes

describe('selectUtxos', () => {
  const utxos: UTXO[] = [
    {
      txid: 'tx1' + '0'.repeat(60),
      vout: 0,
      value: 10000n,
      scriptPubKey: TEST_SCRIPT_PUBKEY,
      address: 'tb1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
      confirmations: 6,
    },
    {
      txid: 'tx2' + '0'.repeat(60),
      vout: 0,
      value: 50000n,
      scriptPubKey: TEST_SCRIPT_PUBKEY,
      address: 'tb1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
      confirmations: 3,
    },
    {
      txid: 'tx3' + '0'.repeat(60),
      vout: 0,
      value: 100000n,
      scriptPubKey: TEST_SCRIPT_PUBKEY,
      address: 'tb1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
      confirmations: 10,
    },
  ];

  it('selects UTXOs to meet target amount plus fee', () => {
    const result = selectUtxos(utxos, 40000n, 10, 546);

    expect(result.totalInput).toBeGreaterThanOrEqual(40000n + result.fee);
    expect(result.selected.length).toBeGreaterThanOrEqual(1);
  });

  it('sorts by value descending (largest first)', () => {
    const result = selectUtxos(utxos, 40000n, 10, 546);

    // Should select the 100000n UTXO first (largest)
    expect(result.selected[0]!.value).toBe(100000n);
  });

  it('selects minimum needed UTXOs', () => {
    const result = selectUtxos(utxos, 40000n, 10, 546);

    // Only needs 100000n UTXO to cover target + fee
    expect(result.selected).toHaveLength(1);
  });

  it('selects multiple UTXOs when necessary', () => {
    // Need more than largest UTXO
    const result = selectUtxos(utxos, 120000n, 10, 546);

    // Needs multiple UTXOs
    expect(result.selected.length).toBeGreaterThan(1);
  });

  it('calculates correct change amount', () => {
    const result = selectUtxos(utxos, 40000n, 10, 546);

    // Change = totalInput - targetAmount - fee
    expect(result.changeAmount).toBe(result.totalInput - 40000n - result.fee);
  });

  it('adds dust change to fee', () => {
    // Target that leaves very small change
    const result = selectUtxos(utxos, 99500n, 1, 546);

    // If change would be below dust limit, it should be zero and added to fee
    if (result.changeAmount < 546n && result.changeAmount > 0n) {
      // This shouldn't happen - dust should be added to fee
      expect(result.changeAmount).toBe(0n);
    }
  });
});

describe('estimateTransactionSize', () => {
  it('estimates P2WPKH transaction size', () => {
    const size = estimateTransactionSize(1, 2, 'p2wpkh');

    // Typical P2WPKH: ~10.5 base + 68 input + 2*31 outputs = ~140 vbytes
    expect(size).toBeGreaterThan(100);
    expect(size).toBeLessThan(200);
  });

  it('estimates P2TR transaction size', () => {
    const size = estimateTransactionSize(1, 2, 'p2tr');

    // P2TR inputs are slightly smaller than P2WPKH
    expect(size).toBeGreaterThan(80);
    expect(size).toBeLessThan(150);
  });

  it('scales with input count', () => {
    const size1 = estimateTransactionSize(1, 2, 'p2wpkh');
    const size5 = estimateTransactionSize(5, 2, 'p2wpkh');

    expect(size5).toBeGreaterThan(size1);
    // Each input adds ~68 vbytes
    expect(size5 - size1).toBeGreaterThan(200);
  });

  it('scales with output count', () => {
    const size2 = estimateTransactionSize(1, 2, 'p2wpkh');
    const size5 = estimateTransactionSize(1, 5, 'p2wpkh');

    expect(size5).toBeGreaterThan(size2);
    // Each output adds ~31 vbytes
    expect(size5 - size2).toBeGreaterThanOrEqual(90);
  });
});

describe('UnsignedUtxoTransaction', () => {
  const config = getUtxoChainConfig('bitcoin-testnet');

  // Create a valid PSBT for testing
  function createTestPsbt(): {
    psbt: bitcoin.Psbt;
    inputMetadata: Array<{
      index: number;
      scriptType: 'p2wpkh' | 'p2tr';
      publicKey: Buffer;
      value: bigint;
    }>;
    outputs: Array<{ address: string; value: bigint }>;
  } {
    const network = bitcoin.networks.testnet;
    const psbt = new bitcoin.Psbt({ network });

    // Add a test input (P2WPKH)
    psbt.addInput({
      hash: '0'.repeat(64),
      index: 0,
      sequence: 0xfffffffd,
      witnessUtxo: {
        script: Buffer.from(TEST_SCRIPT_PUBKEY, 'hex'),
        value: 100000000n, // 1 BTC
      },
    });

    // Add outputs
    const recipientAddress = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx';
    const changeAddress = 'tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7';

    psbt.addOutput({
      address: recipientAddress,
      value: 50000000n, // 0.5 BTC
    });

    psbt.addOutput({
      address: changeAddress,
      value: 49990000n, // Change minus fee
    });

    const inputMetadata = [
      {
        index: 0,
        scriptType: 'p2wpkh' as const,
        publicKey: TEST_PUBKEY,
        value: 100000000n,
      },
    ];

    const outputs = [
      { address: recipientAddress, value: 50000000n },
      { address: changeAddress, value: 49990000n },
    ];

    return { psbt, inputMetadata, outputs };
  }

  describe('constructor', () => {
    it('creates transaction with correct chain alias', () => {
      const { psbt, inputMetadata, outputs } = createTestPsbt();
      const tx = new UnsignedUtxoTransaction(
        config,
        psbt,
        inputMetadata,
        outputs,
        10000n,
        'tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7',
        true
      );

      expect(tx.chainAlias).toBe('bitcoin-testnet');
    });

    it('stores raw transaction data', () => {
      const { psbt, inputMetadata, outputs } = createTestPsbt();
      const tx = new UnsignedUtxoTransaction(
        config,
        psbt,
        inputMetadata,
        outputs,
        10000n,
        'tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7',
        true
      );

      expect(tx.raw.inputMetadata).toHaveLength(1);
      expect(tx.raw.outputs).toHaveLength(2);
      expect(tx.raw.fee).toBe(10000n);
      expect(tx.raw.rbf).toBe(true);
    });

    it('serializes to PSBT base64', () => {
      const { psbt, inputMetadata, outputs } = createTestPsbt();
      const tx = new UnsignedUtxoTransaction(
        config,
        psbt,
        inputMetadata,
        outputs,
        10000n
      );

      // Should be valid base64
      expect(tx.serialized).toMatch(/^[A-Za-z0-9+/=]+$/);
      // Should start with 'cHNidP' (psbt magic bytes in base64)
      expect(tx.serialized.startsWith('cHNidP')).toBe(true);
    });
  });

  describe('getSigningPayload', () => {
    it('returns payload with secp256k1 algorithm', () => {
      const { psbt, inputMetadata, outputs } = createTestPsbt();
      const tx = new UnsignedUtxoTransaction(
        config,
        psbt,
        inputMetadata,
        outputs,
        10000n
      );

      const payload = tx.getSigningPayload();

      expect(payload.chainAlias).toBe('bitcoin-testnet');
      expect(payload.algorithm).toBe('secp256k1');
    });

    it('returns one sighash per input', () => {
      const { psbt, inputMetadata, outputs } = createTestPsbt();
      const tx = new UnsignedUtxoTransaction(
        config,
        psbt,
        inputMetadata,
        outputs,
        10000n
      );

      const payload = tx.getSigningPayload();

      expect(payload.data).toHaveLength(1);
      // Sighash should be 64 hex chars (32 bytes)
      expect(payload.data[0]).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('applySignature', () => {
    it('throws if signature count mismatches input count', () => {
      const { psbt, inputMetadata, outputs } = createTestPsbt();
      const tx = new UnsignedUtxoTransaction(
        config,
        psbt,
        inputMetadata,
        outputs,
        10000n
      );

      // Provide 2 signatures for 1 input
      const fakeSignatures = ['a'.repeat(128), 'b'.repeat(128)];

      expect(() => tx.applySignature(fakeSignatures)).toThrow('Signature count mismatch');
    });
  });

  describe('toNormalised', () => {
    it('returns normalised transaction with correct values', () => {
      const { psbt, inputMetadata, outputs } = createTestPsbt();
      const tx = new UnsignedUtxoTransaction(
        config,
        psbt,
        inputMetadata,
        outputs,
        10000n,
        'tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7'
      );

      const normalised = tx.toNormalised();

      expect(normalised.chainAlias).toBe('bitcoin-testnet');
      expect(normalised.type).toBe('native-transfer');
      expect(normalised.symbol).toBe('tBTC'); // Testnet uses tBTC
    });

    it('identifies primary recipient (excludes change)', () => {
      const { psbt, inputMetadata, outputs } = createTestPsbt();
      const tx = new UnsignedUtxoTransaction(
        config,
        psbt,
        inputMetadata,
        outputs,
        10000n,
        'tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7'
      );

      const normalised = tx.toNormalised();

      // First non-change output is the recipient
      expect(normalised.to).toBe('tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx');
    });

    it('includes input/output counts in metadata', () => {
      const { psbt, inputMetadata, outputs } = createTestPsbt();
      const tx = new UnsignedUtxoTransaction(
        config,
        psbt,
        inputMetadata,
        outputs,
        10000n
      );

      const normalised = tx.toNormalised();

      expect(normalised.metadata?.inputCount).toBe(1);
      expect(normalised.metadata?.outputCount).toBe(2);
    });

    it('includes formatted outputs', () => {
      const { psbt, inputMetadata, outputs } = createTestPsbt();
      const tx = new UnsignedUtxoTransaction(
        config,
        psbt,
        inputMetadata,
        outputs,
        10000n
      );

      const normalised = tx.toNormalised();

      expect(normalised.outputs).toHaveLength(2);
      expect(normalised.outputs![0]!.value).toBe('50000000');
      expect(normalised.outputs![0]!.formattedValue).toBe('0.5');
    });
  });

  describe('toRaw', () => {
    it('returns raw Bitcoin transaction format', () => {
      const { psbt, inputMetadata, outputs } = createTestPsbt();
      const tx = new UnsignedUtxoTransaction(
        config,
        psbt,
        inputMetadata,
        outputs,
        10000n
      );

      const raw = tx.toRaw();

      expect(raw._chain).toBe('utxo');
      expect(raw.version).toBe(2);
      expect(raw.isSegwit).toBe(true);
      expect(raw.inputs).toHaveLength(1);
      expect(raw.outputs).toHaveLength(2);
      expect(raw.locktime).toBe(0);
    });
  });

  describe('getTotalInputValue', () => {
    it('sums all input values', () => {
      const { psbt, inputMetadata, outputs } = createTestPsbt();
      const tx = new UnsignedUtxoTransaction(
        config,
        psbt,
        inputMetadata,
        outputs,
        10000n
      );

      expect(tx.getTotalInputValue()).toBe(100000000n);
    });
  });

  describe('getTotalOutputValue', () => {
    it('sums all output values', () => {
      const { psbt, inputMetadata, outputs } = createTestPsbt();
      const tx = new UnsignedUtxoTransaction(
        config,
        psbt,
        inputMetadata,
        outputs,
        10000n
      );

      // 50000000 + 49990000 = 99990000
      expect(tx.getTotalOutputValue()).toBe(99990000n);
    });
  });

  describe('getPsbtBase64', () => {
    it('returns valid PSBT base64 string', () => {
      const { psbt, inputMetadata, outputs } = createTestPsbt();
      const tx = new UnsignedUtxoTransaction(
        config,
        psbt,
        inputMetadata,
        outputs,
        10000n
      );

      const base64 = tx.getPsbtBase64();

      // Should be valid base64
      expect(base64).toMatch(/^[A-Za-z0-9+/=]+$/);

      // Should be parseable back to PSBT
      const parsedPsbt = bitcoin.Psbt.fromBase64(base64, { network: bitcoin.networks.testnet });
      expect(parsedPsbt.txInputs).toHaveLength(1);
    });
  });

  describe('getPsbtHex', () => {
    it('returns valid PSBT hex string', () => {
      const { psbt, inputMetadata, outputs } = createTestPsbt();
      const tx = new UnsignedUtxoTransaction(
        config,
        psbt,
        inputMetadata,
        outputs,
        10000n
      );

      const hex = tx.getPsbtHex();

      // Should be valid hex
      expect(hex).toMatch(/^[a-f0-9]+$/);

      // Should start with PSBT magic bytes (70736274ff)
      expect(hex.startsWith('70736274ff')).toBe(true);
    });
  });
});
