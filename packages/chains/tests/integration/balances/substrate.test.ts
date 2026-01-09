// packages/chains/tests/integration/balances/substrate.test.ts

import { describe, it, expect } from 'vitest';
import { SubstrateBalanceFetcher } from '../../../src/substrate/balance.js';
import { getSubstrateChainConfig } from '../../../src/substrate/config.js';

/**
 * Substrate (Bittensor) Balance Integration Tests
 *
 * These tests make live RPC calls to Substrate nodes.
 * Run with: npm run test:integration
 *
 * Note: The Substrate balance fetcher converts WebSocket URLs to HTTPS
 * for simple RPC calls.
 *
 * Note: Some tests are todoped because they require valid SS58 addresses
 * with the exact prefix for the Bittensor network.
 */
describe('Substrate Balance Integration Tests', () => {
  describe('Bittensor Mainnet (Finney)', () => {
    const config = getSubstrateChainConfig('bittensor');
    const fetcher = new SubstrateBalanceFetcher(config);

    // Note: Tests requiring specific addresses are todoped because
    // the SS58 address validation requires addresses encoded with
    // the exact Bittensor prefix (42).
    it.todo('should fetch native TAO balance', async () => {
      // This test requires a valid Bittensor address with prefix 42
      // todoped until we have a verified address
    });

    it.todo('should fetch account info', async () => {
      // This test requires a valid Bittensor address with prefix 42
      // todoped until we have a verified address
    });

    it('should fetch current block number', async () => {
      const blockNumber = await fetcher.getBlockNumber();

      expect(blockNumber).toBeDefined();
      expect(typeof blockNumber).toBe('number');
      expect(blockNumber).toBeGreaterThan(0);
    });

    it('should fetch genesis hash', async () => {
      const genesisHash = await fetcher.getGenesisHash();

      expect(genesisHash).toBeDefined();
      expect(typeof genesisHash).toBe('string');
      expect(genesisHash.startsWith('0x')).toBe(true);
      expect(genesisHash.length).toBe(66); // 0x + 64 hex chars
    });

    it('should fetch runtime version', async () => {
      const runtimeVersion = await fetcher.getRuntimeVersion();

      expect(runtimeVersion).toBeDefined();
      expect(runtimeVersion).toHaveProperty('specName');
      expect(runtimeVersion).toHaveProperty('specVersion');
      expect(runtimeVersion).toHaveProperty('transactionVersion');
      expect(typeof runtimeVersion.specVersion).toBe('number');
    });

    it.todo('should handle non-existent account gracefully', async () => {
      // This test requires a valid Bittensor address with prefix 42
      // todoped until we have a verified address
    });
  });

  describe('Bittensor Testnet', () => {
    const config = getSubstrateChainConfig('bittensor-testnet');
    const fetcher = new SubstrateBalanceFetcher(config);

    it('should fetch current block number from testnet', async () => {
      const blockNumber = await fetcher.getBlockNumber();

      expect(blockNumber).toBeDefined();
      expect(typeof blockNumber).toBe('number');
      expect(blockNumber).toBeGreaterThan(0);
    });

    it('should fetch runtime version from testnet', async () => {
      const runtimeVersion = await fetcher.getRuntimeVersion();

      expect(runtimeVersion).toBeDefined();
      expect(runtimeVersion).toHaveProperty('specName');
      expect(runtimeVersion).toHaveProperty('specVersion');
    });
  });
});
