// packages/chains/tests/integration/transactions/tvm.test.ts

import { describe, it, expect } from 'vitest';
import { TvmChainProvider } from '../../../src/tvm/provider.js';
import type { UnsignedTvmTransaction } from '../../../src/tvm/transaction-builder.js';

/**
 * TVM Transaction Integration Tests
 *
 * These tests make live RPC calls to Tron nodes.
 * Run with: npm run test:integration
 */
describe('TVM Transaction Integration Tests', () => {
  // QuickNode RPC URL for Tron mainnet (using HTTP API format, not JSON-RPC)
  const TRON_RPC_URL = 'https://lingering-cosmopolitan-hexagon.tron-mainnet.quiknode.pro/3bf8704f5e07c08dc34d6ad7a9c56a31536b6ea0';

  // Well-known addresses
  const JUSTIN_SUN_ADDRESS = 'TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH';
  const RECIPIENT_ADDRESS = 'TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW';
  const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

  describe('Tron Mainnet - Build Transactions', () => {
    const provider = new TvmChainProvider('tron', TRON_RPC_URL);

    it('should build unsigned native TRX transfer', async () => {
      const tx = await provider.buildNativeTransfer({
        from: JUSTIN_SUN_ADDRESS,
        to: RECIPIENT_ADDRESS,
        value: '1000000', // 1 TRX in SUN
      });

      expect(tx).toBeDefined();
      expect(tx.chainAlias).toBe('tron');
      expect(tx.serialized).toBeDefined();

      const tvmTx = tx as UnsignedTvmTransaction;
      expect(tvmTx.raw).toBeDefined();
      expect(tvmTx.raw.txID).toBeDefined();
      expect(tvmTx.raw.rawData).toBeDefined();
      expect(tvmTx.raw.rawData.contract).toBeDefined();
      expect(tvmTx.raw.rawData.contract.length).toBe(1);

      // Check transfer contract type
      const contract = tvmTx.raw.rawData.contract[0];
      expect(contract.type).toBe('TransferContract');
    });

    it('should include ref block info from network', async () => {
      const tx = await provider.buildNativeTransfer({
        from: JUSTIN_SUN_ADDRESS,
        to: RECIPIENT_ADDRESS,
        value: '1000000',
      });

      const tvmTx = tx as UnsignedTvmTransaction;
      expect(tvmTx.raw.rawData.refBlockBytes).toBeDefined();
      expect(tvmTx.raw.rawData.refBlockHash).toBeDefined();
      expect(tvmTx.raw.rawData.expiration).toBeDefined();
      expect(tvmTx.raw.rawData.timestamp).toBeDefined();
    });

    it('should build unsigned TRC20 token transfer', async () => {
      const tx = await provider.buildTokenTransfer({
        from: JUSTIN_SUN_ADDRESS,
        to: RECIPIENT_ADDRESS,
        contractAddress: USDT_CONTRACT,
        value: '1000000', // 1 USDT
      });

      expect(tx).toBeDefined();
      expect(tx.chainAlias).toBe('tron');

      const tvmTx = tx as UnsignedTvmTransaction;
      expect(tvmTx.raw.rawData.contract).toBeDefined();

      // Check TriggerSmartContract type
      const contract = tvmTx.raw.rawData.contract[0];
      expect(contract.type).toBe('TriggerSmartContract');
    });
  });

  describe('Tron Mainnet - Decode Transactions', () => {
    const provider = new TvmChainProvider('tron', TRON_RPC_URL);

    it('should decode transaction to normalised format', async () => {
      const tx = await provider.buildNativeTransfer({
        from: JUSTIN_SUN_ADDRESS,
        to: RECIPIENT_ADDRESS,
        value: '1000000', // 1 TRX
      });

      const normalised = provider.decode(tx.serialized, 'normalised');

      expect(normalised).toBeDefined();
      expect(normalised.chainAlias).toBe('tron');
      expect(normalised.type).toBe('native-transfer');
      expect(normalised.symbol).toBe('TRX');
      expect(normalised.value).toBe('1000000');
      expect(normalised.formattedValue).toBe('1');
    });

    it('should decode transaction to raw format', async () => {
      const tx = await provider.buildNativeTransfer({
        from: JUSTIN_SUN_ADDRESS,
        to: RECIPIENT_ADDRESS,
        value: '1000000',
      });

      const raw = provider.decode(tx.serialized, 'raw');

      expect(raw).toBeDefined();
      expect(raw._chain).toBe('tvm');
      expect(raw.txID).toBeDefined();
      expect(raw.rawData).toBeDefined();
      expect(raw.rawData.contract).toBeDefined();
    });

    it('should decode token transfer with correct metadata', async () => {
      const tx = await provider.buildTokenTransfer({
        from: JUSTIN_SUN_ADDRESS,
        to: RECIPIENT_ADDRESS,
        contractAddress: USDT_CONTRACT,
        value: '1000000',
      });

      const normalised = provider.decode(tx.serialized, 'normalised');

      expect(normalised.type).toBe('token-transfer');
      expect(normalised.to).toBe(USDT_CONTRACT);
    });
  });

  describe('Tron Mainnet - Signing Payload', () => {
    const provider = new TvmChainProvider('tron', TRON_RPC_URL);

    it('should generate valid signing payload', async () => {
      const tx = await provider.buildNativeTransfer({
        from: JUSTIN_SUN_ADDRESS,
        to: RECIPIENT_ADDRESS,
        value: '1000000',
      });

      const tvmTx = tx as UnsignedTvmTransaction;
      const payload = tvmTx.getSigningPayload();

      expect(payload).toBeDefined();
      expect(payload.chainAlias).toBe('tron');
      expect(payload.algorithm).toBe('secp256k1');
      expect(payload.data).toBeDefined();
      expect(Array.isArray(payload.data)).toBe(true);
      expect(payload.data.length).toBe(1);
      // Should be a valid hex hash (txID)
      expect(payload.data[0]).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('Tron Mainnet - Fee Estimation', () => {
    const provider = new TvmChainProvider('tron', TRON_RPC_URL);

    it('should fetch fee estimates', async () => {
      const estimate = await provider.estimateFee();

      expect(estimate).toBeDefined();
      expect(estimate.slow).toBeDefined();
      expect(estimate.standard).toBeDefined();
      expect(estimate.fast).toBeDefined();

      expect(typeof estimate.slow.fee).toBe('string');
      expect(estimate.slow.formattedFee).toContain('TRX');

      const slowFee = BigInt(estimate.slow.fee);
      const standardFee = BigInt(estimate.standard.fee);
      const fastFee = BigInt(estimate.fast.fee);

      expect(fastFee).toBeGreaterThanOrEqual(standardFee);
      expect(standardFee).toBeGreaterThanOrEqual(slowFee);
    });
  });

  describe('Tron Mainnet - Account Resources', () => {
    const provider = new TvmChainProvider('tron', TRON_RPC_URL);

    // Skipped: QuickNode doesn't support the getaccountresource endpoint
    it.skip('should fetch account resources', async () => {
      const resources = await provider.getAccountResources(JUSTIN_SUN_ADDRESS);

      expect(resources).toBeDefined();
      expect(typeof resources.freeNetLimit).toBe('number');
      expect(typeof resources.energyLimit).toBe('number');
    });
  });

  describe('Tron Testnet (Shasta) - Build Transactions', () => {
    const provider = new TvmChainProvider('tron-testnet');

    it('should build unsigned native TRX transfer on testnet', async () => {
      const tx = await provider.buildNativeTransfer({
        from: JUSTIN_SUN_ADDRESS,
        to: RECIPIENT_ADDRESS,
        value: '1000000',
      });

      expect(tx).toBeDefined();
      expect(tx.chainAlias).toBe('tron-testnet');

      const tvmTx = tx as UnsignedTvmTransaction;
      expect(tvmTx.raw.rawData.refBlockBytes).toBeDefined();
    });
  });

  describe('TVM - Error Cases', () => {
    const provider = new TvmChainProvider('tron', TRON_RPC_URL);

    it('should throw error for invalid from address', async () => {
      await expect(
        provider.buildNativeTransfer({
          from: 'invalid-address',
          to: RECIPIENT_ADDRESS,
          value: '1000000',
        })
      ).rejects.toThrow();
    });

    it('should throw error for invalid to address', async () => {
      await expect(
        provider.buildNativeTransfer({
          from: JUSTIN_SUN_ADDRESS,
          to: 'invalid-address',
          value: '1000000',
        })
      ).rejects.toThrow();
    });

    it('should throw error for invalid contract address', async () => {
      await expect(
        provider.buildTokenTransfer({
          from: JUSTIN_SUN_ADDRESS,
          to: RECIPIENT_ADDRESS,
          contractAddress: 'invalid-address',
          value: '1000000',
        })
      ).rejects.toThrow();
    });
  });
});
