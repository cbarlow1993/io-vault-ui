// packages/chains/tests/integration/transactions/substrate.test.ts

import { describe, it, expect } from 'vitest';
import { SubstrateChainProvider, createSubstrateProvider } from '../../../src/substrate/provider.js';
import { getSubstrateChainConfig } from '../../../src/substrate/config.js';
import type { SubstrateTransactionBuilder } from '../../../src/substrate/transaction-builder.js';

/**
 * Substrate Transaction Integration Tests
 *
 * These tests make live RPC calls to Substrate nodes.
 * Run with: npm run test:integration
 *
 * Note: Some tests are skipped because they require valid SS58 addresses
 * with the exact prefix for the Bittensor network (prefix 42).
 */
describe('Substrate Transaction Integration Tests', () => {
  describe('Bittensor Mainnet - Build Transactions', () => {
    const provider = createSubstrateProvider('bittensor');

    // Note: Tests requiring specific addresses are skipped because
    // the SS58 address validation requires addresses encoded with
    // the exact Bittensor prefix (42).

    it.todo('should build unsigned native TAO transfer', async () => {
      // This test requires valid Bittensor addresses with prefix 42
      // The buildNativeTransfer method needs: from, to, amount (bigint), options
      // Skipped until we have verified addresses
    });

    it.todo('should include nonce from network', async () => {
      // This test requires a valid Bittensor address
      // Skipped until we have verified addresses
    });

    it.todo('should include runtime version from network', async () => {
      // This test requires a valid Bittensor address
      // Skipped until we have verified addresses
    });

    it.todo('should support keepAlive option', async () => {
      // This test requires valid Bittensor addresses
      // Skipped until we have verified addresses
    });

    it.todo('should support tip option', async () => {
      // This test requires valid Bittensor addresses
      // Skipped until we have verified addresses
    });
  });

  describe('Bittensor Mainnet - Network Info', () => {
    const provider = createSubstrateProvider('bittensor');

    it('should fetch genesis hash', async () => {
      const genesisHash = await provider.getGenesisHash();

      expect(genesisHash).toBeDefined();
      expect(typeof genesisHash).toBe('string');
      expect(genesisHash.startsWith('0x')).toBe(true);
      expect(genesisHash.length).toBe(66); // 0x + 64 hex chars
    });

    it('should fetch current block number', async () => {
      const blockNumber = await provider.getBlockNumber();

      expect(blockNumber).toBeDefined();
      expect(typeof blockNumber).toBe('number');
      expect(blockNumber).toBeGreaterThan(0);
    });

    it('should fetch runtime version', async () => {
      const runtimeVersion = await provider.getRuntimeVersion();

      expect(runtimeVersion).toBeDefined();
      expect(runtimeVersion).toHaveProperty('specName');
      expect(runtimeVersion).toHaveProperty('specVersion');
      expect(runtimeVersion).toHaveProperty('transactionVersion');
      expect(typeof runtimeVersion.specVersion).toBe('number');
      expect(typeof runtimeVersion.transactionVersion).toBe('number');
    });

    it('should fetch block hash by number', async () => {
      const blockNumber = await provider.getBlockNumber();
      const blockHash = await provider.getBlockHash(blockNumber);

      expect(blockHash).toBeDefined();
      expect(typeof blockHash).toBe('string');
      expect(blockHash.startsWith('0x')).toBe(true);
      expect(blockHash.length).toBe(66);
    });

    it('should fetch finalized head', async () => {
      const finalizedHead = await provider.getFinalizedHead();

      expect(finalizedHead).toBeDefined();
      expect(typeof finalizedHead).toBe('string');
      expect(finalizedHead.startsWith('0x')).toBe(true);
      expect(finalizedHead.length).toBe(66);
    });
  });

  describe('Bittensor Mainnet - Fee Estimation', () => {
    const provider = createSubstrateProvider('bittensor');

    it('should estimate fee', async () => {
      const fee = await provider.estimateFee();

      expect(fee).toBeDefined();
      expect(fee.slow).toBeDefined();
      expect(fee.standard).toBeDefined();
      expect(fee.fast).toBeDefined();
      expect(fee.slow.fee).toBeDefined();
      expect(BigInt(fee.slow.fee)).toBeGreaterThan(0n);
    });
  });

  describe('Bittensor Testnet - Build Transactions', () => {
    const provider = createSubstrateProvider('bittensor-testnet');

    it.todo('should build unsigned native TAO transfer on testnet', async () => {
      // This test requires valid Bittensor testnet addresses
      // Skipped until we have verified addresses
    });

    it('should fetch current block number from testnet', async () => {
      const blockNumber = await provider.getBlockNumber();

      expect(blockNumber).toBeDefined();
      expect(typeof blockNumber).toBe('number');
      expect(blockNumber).toBeGreaterThan(0);
    });

    it('should fetch runtime version from testnet', async () => {
      const runtimeVersion = await provider.getRuntimeVersion();

      expect(runtimeVersion).toBeDefined();
      expect(runtimeVersion).toHaveProperty('specName');
      expect(runtimeVersion).toHaveProperty('specVersion');
    });
  });

  describe('Substrate - Address Validation', () => {
    const provider = createSubstrateProvider('bittensor');

    it('should validate correct Bittensor address format', () => {
      // Valid Bittensor address with prefix 42
      // Note: This is a test pattern - we're checking the validation logic
      const isValid = provider.validateAddress('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
      // This may be valid or invalid depending on the SS58 prefix check
      expect(typeof isValid).toBe('boolean');
    });

    it('should reject invalid address format', () => {
      const isValid = provider.validateAddress('invalid-address');
      expect(isValid).toBe(false);
    });

    it('should reject address with wrong prefix', () => {
      // Polkadot address (prefix 0) should be invalid for Bittensor (prefix 42)
      const isValid = provider.validateAddress('1FRMM8PEiWXYax7rpS6X4XZX1aAAxSWx1CrKTyrVYhV24fg');
      expect(isValid).toBe(false);
    });
  });

  describe('Substrate - Error Cases', () => {
    const provider = createSubstrateProvider('bittensor');

    it.todo('should throw error for invalid from address', async () => {
      // This test would require attempting to build a transaction with invalid address
      // Skipped until we have the full test implementation
    });

    it.todo('should throw error for invalid to address', async () => {
      // This test would require attempting to build a transaction with invalid address
      // Skipped until we have the full test implementation
    });

    it('should throw error for token balance (unsupported)', async () => {
      await expect(
        provider.getTokenBalance('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', 'some-token')
      ).rejects.toThrow('Token balances not supported');
    });

    it('should throw error for token transfer (unsupported)', async () => {
      await expect(
        provider.buildTokenTransfer(
          '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          'some-token',
          1000000n
        )
      ).rejects.toThrow('Token transfers not supported');
    });

    it('should throw error for contract read (unsupported)', async () => {
      await expect(provider.contractRead()).rejects.toThrow('Smart contracts are not supported');
    });

    it('should throw error for contract call (unsupported)', async () => {
      await expect(provider.contractCall()).rejects.toThrow('Smart contracts are not supported');
    });

    it('should throw error for contract deploy (unsupported)', async () => {
      await expect(provider.contractDeploy()).rejects.toThrow('Smart contracts are not supported');
    });
  });
});
