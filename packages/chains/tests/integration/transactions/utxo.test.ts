// packages/chains/tests/integration/transactions/utxo.test.ts

import { describe, it, expect } from 'vitest';
import { UtxoChainProvider } from '../../../src/utxo/provider.js';
import type { UnsignedUtxoTransaction } from '../../../src/utxo/transaction-builder.js';

/**
 * UTXO (Bitcoin) Transaction Integration Tests
 *
 * These tests make live RPC calls to Blockbook API to build and decode transactions.
 * Run with: npm run test:integration
 *
 * Note: These tests build unsigned transactions but do NOT broadcast them.
 * The transactions are valid PSBT format but would need real signatures to be broadcast.
 */
describe('UTXO Transaction Integration Tests', () => {
  // Use public Blockbook endpoint for Bitcoin mainnet
  const PUBLIC_BLOCKBOOK_URL = 'https://btc1.trezor.io';

  // Test compressed public key (33 bytes) - this is a valid secp256k1 public key
  // Note: This doesn't correspond to the test addresses, but is valid for PSBT construction
  const TEST_PUBKEY = '02' + '1'.repeat(62) + '01';

  // Well-known addresses for testing
  // Satoshi's genesis address (has many UTXOs from donations)
  const SATOSHI_GENESIS = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';

  // SegWit address with known balance (Kraken cold wallet)
  const SEGWIT_ADDRESS = 'bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97';

  // Valid recipient address (random valid P2WPKH)
  const RECIPIENT_ADDRESS = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';

  describe('Bitcoin Mainnet - Build Transactions', () => {
    const provider = new UtxoChainProvider('bitcoin', PUBLIC_BLOCKBOOK_URL);

    // Note: Live UTXO fetch tests require an xpub to get proper scriptPubKey data
    // The Blockbook API doesn't always return scriptPubKey without xpub context
    it.skip('should build unsigned native transfer with live UTXO fetch', async () => {
      // This test is skipped because Blockbook doesn't return scriptPubKey without xpub
      // To properly test this, you would need:
      // 1. An xpub for a wallet with UTXOs
      // 2. Derive the address and public key from the xpub
      // 3. Use the provider with the derived data
      expect(true).toBe(true);
    });

    it('should build unsigned transaction with custom UTXOs', async () => {
      // Use custom UTXOs to avoid dependency on live data
      const customUtxos = [
        {
          txid: 'a'.repeat(64), // Valid 64-char hex txid
          vout: 0,
          value: 100000000n, // 1 BTC
          scriptPubKey: '0014' + 'b'.repeat(40), // Valid P2WPKH scriptPubKey
          address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          confirmations: 6,
        },
      ];

      const tx = await provider.buildNativeTransfer({
        from: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
        to: RECIPIENT_ADDRESS,
        value: '50000000', // 0.5 BTC
        publicKey: TEST_PUBKEY,
        overrides: {
          utxos: customUtxos,
          feeRate: 10, // 10 sat/vB
        },
      });

      // Verify transaction structure
      expect(tx).toBeDefined();
      expect(tx.chainAlias).toBe('bitcoin');

      const utxoTx = tx as UnsignedUtxoTransaction;
      expect(utxoTx.raw.inputMetadata).toHaveLength(1);
      expect(utxoTx.raw.outputs.length).toBeGreaterThanOrEqual(1);

      // Verify fee was calculated
      expect(utxoTx.raw.fee).toBeGreaterThan(0n);

      // Should have change output since we're sending 0.5 BTC from 1 BTC
      expect(utxoTx.raw.outputs.length).toBe(2);
    });

    it('should build transaction with RBF enabled by default', async () => {
      const customUtxos = [
        {
          txid: 'c'.repeat(64),
          vout: 0,
          value: 100000n,
          scriptPubKey: '0014' + 'd'.repeat(40),
          address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          confirmations: 3,
        },
      ];

      const tx = await provider.buildNativeTransfer({
        from: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
        to: RECIPIENT_ADDRESS,
        value: '10000',
        publicKey: TEST_PUBKEY,
        overrides: {
          utxos: customUtxos,
          feeRate: 5,
        },
      });

      const utxoTx = tx as UnsignedUtxoTransaction;
      expect(utxoTx.raw.rbf).toBe(true);
    });

    it('should build transaction with RBF disabled', async () => {
      const customUtxos = [
        {
          txid: 'e'.repeat(64),
          vout: 0,
          value: 100000n,
          scriptPubKey: '0014' + 'f'.repeat(40),
          address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          confirmations: 3,
        },
      ];

      const tx = await provider.buildNativeTransfer({
        from: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
        to: RECIPIENT_ADDRESS,
        value: '10000',
        publicKey: TEST_PUBKEY,
        overrides: {
          utxos: customUtxos,
          feeRate: 5,
          rbf: false,
        },
      });

      const utxoTx = tx as UnsignedUtxoTransaction;
      expect(utxoTx.raw.rbf).toBe(false);
    });

    it('should build transaction with custom change address', async () => {
      const customChangeAddress = 'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3';
      const customUtxos = [
        {
          txid: '1'.repeat(64),
          vout: 0,
          value: 1000000n, // 0.01 BTC
          scriptPubKey: '0014' + '2'.repeat(40),
          address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          confirmations: 6,
        },
      ];

      const tx = await provider.buildNativeTransfer({
        from: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
        to: RECIPIENT_ADDRESS,
        value: '100000', // 0.001 BTC
        publicKey: TEST_PUBKEY,
        overrides: {
          utxos: customUtxos,
          feeRate: 10,
          changeAddress: customChangeAddress,
        },
      });

      const utxoTx = tx as UnsignedUtxoTransaction;
      expect(utxoTx.raw.changeAddress).toBe(customChangeAddress);

      // Find change output
      const changeOutput = utxoTx.raw.outputs.find((o) => o.address === customChangeAddress);
      expect(changeOutput).toBeDefined();
    });

    it('should build transaction with absolute fee override', async () => {
      const customUtxos = [
        {
          txid: '3'.repeat(64),
          vout: 0,
          value: 100000n,
          scriptPubKey: '0014' + '4'.repeat(40),
          address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          confirmations: 6,
        },
      ];

      const absoluteFee = 5000n; // 5000 satoshis

      const tx = await provider.buildNativeTransfer({
        from: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
        to: RECIPIENT_ADDRESS,
        value: '50000',
        publicKey: TEST_PUBKEY,
        overrides: {
          utxos: customUtxos,
          absoluteFee,
        },
      });

      const utxoTx = tx as UnsignedUtxoTransaction;
      expect(utxoTx.raw.fee).toBe(absoluteFee);
    });
  });

  describe('Bitcoin Mainnet - Decode Transactions', () => {
    const provider = new UtxoChainProvider('bitcoin', PUBLIC_BLOCKBOOK_URL);

    it('should decode transaction to normalised format', async () => {
      // Build a transaction first
      const customUtxos = [
        {
          txid: '5'.repeat(64),
          vout: 0,
          value: 1000000n,
          scriptPubKey: '0014' + '6'.repeat(40),
          address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          confirmations: 6,
        },
      ];

      const tx = await provider.buildNativeTransfer({
        from: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
        to: RECIPIENT_ADDRESS,
        value: '100000',
        publicKey: TEST_PUBKEY,
        overrides: {
          utxos: customUtxos,
          feeRate: 10,
        },
      });

      // Decode to normalised format
      const normalised = provider.decode(tx.serialized, 'normalised');

      expect(normalised).toBeDefined();
      expect(normalised.chainAlias).toBe('bitcoin');
      expect(normalised.type).toBe('native-transfer');
      expect(normalised.symbol).toBe('BTC');
      expect(normalised.to).toBe(RECIPIENT_ADDRESS);
      expect(typeof normalised.value).toBe('string');
      expect(typeof normalised.formattedValue).toBe('string');

      // Verify fee info
      expect(normalised.fee).toBeDefined();
      expect(typeof normalised.fee.value).toBe('string');
      expect(normalised.fee.symbol).toBe('BTC');

      // Verify metadata
      expect(normalised.metadata).toBeDefined();
      expect(normalised.metadata.inputCount).toBeGreaterThan(0);
      expect(normalised.metadata.outputCount).toBeGreaterThan(0);
      expect(normalised.metadata.isContractDeployment).toBe(false);

      // Verify outputs
      expect(normalised.outputs).toBeDefined();
      expect(normalised.outputs!.length).toBeGreaterThan(0);
    });

    it('should decode transaction to raw format', async () => {
      // Build a transaction first
      const customUtxos = [
        {
          txid: '7'.repeat(64),
          vout: 0,
          value: 1000000n,
          scriptPubKey: '0014' + '8'.repeat(40),
          address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          confirmations: 6,
        },
      ];

      const tx = await provider.buildNativeTransfer({
        from: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
        to: RECIPIENT_ADDRESS,
        value: '100000',
        publicKey: TEST_PUBKEY,
        overrides: {
          utxos: customUtxos,
          feeRate: 10,
        },
      });

      // Decode to raw format
      const raw = provider.decode(tx.serialized, 'raw');

      expect(raw).toBeDefined();
      expect(raw._chain).toBe('utxo');
      expect(raw.version).toBe(2);
      expect(raw.locktime).toBe(0);
      expect(raw.isSegwit).toBe(true);

      // Verify inputs
      expect(raw.inputs).toBeDefined();
      expect(raw.inputs.length).toBeGreaterThan(0);
      const input = raw.inputs[0]!;
      expect(input).toHaveProperty('txid');
      expect(input).toHaveProperty('vout');
      expect(input).toHaveProperty('sequence');

      // Verify outputs
      expect(raw.outputs).toBeDefined();
      expect(raw.outputs.length).toBeGreaterThan(0);
      const output = raw.outputs[0]!;
      expect(output).toHaveProperty('value');
      expect(output).toHaveProperty('address');
      expect(output).toHaveProperty('scriptPubKey');
    });

    it('should preserve PSBT format through encode/decode cycle', async () => {
      const customUtxos = [
        {
          txid: '9'.repeat(64),
          vout: 0,
          value: 500000n,
          scriptPubKey: '0014' + 'a'.repeat(40),
          address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          confirmations: 6,
        },
      ];

      const tx = await provider.buildNativeTransfer({
        from: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
        to: RECIPIENT_ADDRESS,
        value: '50000',
        publicKey: TEST_PUBKEY,
        overrides: {
          utxos: customUtxos,
          feeRate: 5,
        },
      });

      const utxoTx = tx as UnsignedUtxoTransaction;
      const originalPsbt = utxoTx.getPsbtBase64();

      // Decode and verify structure matches
      const normalised = provider.decode(originalPsbt, 'normalised');
      expect(normalised.to).toBe(RECIPIENT_ADDRESS);
      expect(normalised.chainAlias).toBe('bitcoin');
    });
  });

  describe('Bitcoin Mainnet - Signing Payload', () => {
    const provider = new UtxoChainProvider('bitcoin', PUBLIC_BLOCKBOOK_URL);

    it('should generate valid signing payload', async () => {
      const customUtxos = [
        {
          txid: 'b'.repeat(64),
          vout: 0,
          value: 100000n,
          scriptPubKey: '0014' + 'c'.repeat(40),
          address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          confirmations: 6,
        },
      ];

      const tx = await provider.buildNativeTransfer({
        from: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
        to: RECIPIENT_ADDRESS,
        value: '10000',
        publicKey: TEST_PUBKEY,
        overrides: {
          utxos: customUtxos,
          feeRate: 5,
        },
      });

      const utxoTx = tx as UnsignedUtxoTransaction;
      const payload = utxoTx.getSigningPayload();

      expect(payload).toBeDefined();
      expect(payload.chainAlias).toBe('bitcoin');
      expect(payload.algorithm).toBe('secp256k1');
      expect(payload.data).toBeDefined();
      expect(Array.isArray(payload.data)).toBe(true);

      // Should have one sighash per input
      expect(payload.data.length).toBe(1);

      // Each sighash should be 32 bytes (64 hex chars)
      expect(payload.data[0]).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate multiple sighashes for multiple inputs', async () => {
      const customUtxos = [
        {
          txid: 'd'.repeat(64),
          vout: 0,
          value: 50000n,
          scriptPubKey: '0014' + 'e'.repeat(40),
          address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          confirmations: 6,
        },
        {
          txid: 'f'.repeat(64),
          vout: 1,
          value: 50000n,
          scriptPubKey: '0014' + 'e'.repeat(40),
          address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          confirmations: 3,
        },
      ];

      const tx = await provider.buildNativeTransfer({
        from: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
        to: RECIPIENT_ADDRESS,
        value: '50000', // Need both UTXOs
        publicKey: TEST_PUBKEY,
        overrides: {
          utxos: customUtxos,
          feeRate: 5,
        },
      });

      const utxoTx = tx as UnsignedUtxoTransaction;
      const payload = utxoTx.getSigningPayload();

      // Should have two sighashes (one per input)
      expect(payload.data.length).toBe(2);

      // Each should be valid hex
      payload.data.forEach((hash) => {
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
      });

      // Sighashes should be different
      expect(payload.data[0]).not.toBe(payload.data[1]);
    });
  });

  describe('Bitcoin Mainnet - Fee Estimation', () => {
    const provider = new UtxoChainProvider('bitcoin', PUBLIC_BLOCKBOOK_URL);

    it('should fetch fee estimates', async () => {
      try {
        const estimate = await provider.estimateFee();

        expect(estimate).toBeDefined();
        expect(estimate.slow).toBeDefined();
        expect(estimate.standard).toBeDefined();
        expect(estimate.fast).toBeDefined();

        // Each tier should have fee and formattedFee
        expect(typeof estimate.slow.fee).toBe('string');
        expect(estimate.slow.formattedFee).toContain('BTC');

        expect(typeof estimate.standard.fee).toBe('string');
        expect(estimate.standard.formattedFee).toContain('BTC');

        expect(typeof estimate.fast.fee).toBe('string');
        expect(estimate.fast.formattedFee).toContain('BTC');

        // Fast should be >= standard >= slow
        const slowFee = BigInt(estimate.slow.fee);
        const standardFee = BigInt(estimate.standard.fee);
        const fastFee = BigInt(estimate.fast.fee);

        expect(fastFee).toBeGreaterThanOrEqual(standardFee);
        expect(standardFee).toBeGreaterThanOrEqual(slowFee);
      } catch (error) {
        // Skip test if Blockbook fee estimation endpoint is unavailable (503 errors are common)
        if (error instanceof Error && error.message.includes('503')) {
          console.log('Skipping test: Blockbook fee estimation endpoint unavailable');
          return;
        }
        throw error;
      }
    });

    it('should fetch fee rates', async () => {
      try {
        const rates = await provider.getFeeRates();

        expect(rates).toBeDefined();
        expect(typeof rates.slow).toBe('number');
        expect(typeof rates.standard).toBe('number');
        expect(typeof rates.fast).toBe('number');

        // Rates should be positive
        expect(rates.slow).toBeGreaterThan(0);
        expect(rates.standard).toBeGreaterThan(0);
        expect(rates.fast).toBeGreaterThan(0);

        // Fast >= standard >= slow
        expect(rates.fast).toBeGreaterThanOrEqual(rates.standard);
        expect(rates.standard).toBeGreaterThanOrEqual(rates.slow);
      } catch (error) {
        // Skip test if Blockbook fee estimation endpoint is unavailable
        if (error instanceof Error && error.message.includes('503')) {
          console.log('Skipping test: Blockbook fee estimation endpoint unavailable');
          return;
        }
        throw error;
      }
    });
  });

  describe('Bitcoin Mainnet - Error Cases', () => {
    const provider = new UtxoChainProvider('bitcoin', PUBLIC_BLOCKBOOK_URL);

    it('should throw error when publicKey is missing', async () => {
      await expect(
        provider.buildNativeTransfer({
          from: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          to: RECIPIENT_ADDRESS,
          value: '10000',
        })
      ).rejects.toThrow('publicKey is required');
    });

    it('should throw error for insufficient funds', async () => {
      const smallUtxo = [
        {
          txid: '1'.repeat(64),
          vout: 0,
          value: 1000n, // Only 1000 satoshis
          scriptPubKey: '0014' + '2'.repeat(40),
          address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          confirmations: 6,
        },
      ];

      await expect(
        provider.buildNativeTransfer({
          from: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          to: RECIPIENT_ADDRESS,
          value: '1000000', // Trying to send 0.01 BTC
          publicKey: TEST_PUBKEY,
          overrides: {
            utxos: smallUtxo,
          },
        })
      ).rejects.toThrow('Insufficient funds');
    });

    it('should throw error for empty UTXO list', async () => {
      await expect(
        provider.buildNativeTransfer({
          from: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          to: RECIPIENT_ADDRESS,
          value: '10000',
          publicKey: TEST_PUBKEY,
          overrides: {
            utxos: [],
          },
        })
      ).rejects.toThrow('No UTXOs found');
    });

    it('should throw error for unsupported legacy address', async () => {
      const customUtxos = [
        {
          txid: '3'.repeat(64),
          vout: 0,
          value: 100000n,
          scriptPubKey: '76a914' + '4'.repeat(40) + '88ac', // P2PKH scriptPubKey (legacy)
          address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
          confirmations: 6,
        },
      ];

      await expect(
        provider.buildNativeTransfer({
          from: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2', // Legacy address
          to: RECIPIENT_ADDRESS,
          value: '10000',
          publicKey: TEST_PUBKEY,
          overrides: {
            utxos: customUtxos,
          },
        })
      ).rejects.toThrow(); // Will throw about unsupported address type
    });

    it('should throw error for token transfer (not supported)', async () => {
      await expect(
        provider.buildTokenTransfer({
          from: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          to: RECIPIENT_ADDRESS,
          contractAddress: 'someContract',
          value: '100',
        })
      ).rejects.toThrow('Token transfers not supported for UTXO chains');
    });
  });
});
