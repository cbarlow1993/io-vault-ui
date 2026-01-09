// packages/chains/tests/integration/balances/tvm.test.ts

import { describe, it, expect } from 'vitest';
import { TvmBalanceFetcher } from '../../../src/tvm/balance.js';
import { getTvmChainConfig } from '../../../src/tvm/config.js';

/**
 * TVM (Tron) Balance Integration Tests
 *
 * These tests make live RPC calls to TronGrid API.
 * Run with: npm run test:integration
 */
describe('TVM Balance Integration Tests', () => {
  // TronGrid API key for authenticated requests
  const TRONGRID_API_KEY = 'b0872789-6694-4004-b3e9-eb71178db56c';
  // TronGrid uses a custom header for API key authentication
  const TRONGRID_AUTH = {
    apiKey: TRONGRID_API_KEY,
    apiKeyHeader: 'TRON-PRO-API-KEY',
  };

  // Well-known Tron addresses
  // Justin Sun's address (Tron founder)
  const JUSTIN_SUN_ADDRESS = 'TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH';
  // USDT TRC20 contract
  const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

  describe('Tron Mainnet', () => {
    const config = getTvmChainConfig('tron', { auth: TRONGRID_AUTH });
    const fetcher = new TvmBalanceFetcher(config);

    it('should fetch native TRX balance for known address', async () => {
      const balance = await fetcher.getNativeBalance(JUSTIN_SUN_ADDRESS);

      expect(balance).toBeDefined();
      expect(balance.isNative).toBe(true);
      expect(balance.symbol).toBe('TRX');
      expect(balance.decimals).toBe(6);
      expect(typeof balance.balance).toBe('string');
      expect(typeof balance.formattedBalance).toBe('string');

      console.log(`TRX Balance: ${balance.formattedBalance} TRX`);
    });

    it('should fetch USDT token balance', async () => {
      const balance = await fetcher.getTokenBalance(JUSTIN_SUN_ADDRESS, USDT_CONTRACT);

      expect(balance).toBeDefined();
      expect(balance.symbol).toBe('USDT');
      expect(balance.decimals).toBe(6);
      expect(balance.contractAddress).toBe(USDT_CONTRACT);
      expect(typeof balance.balance).toBe('string');
      expect(typeof balance.formattedBalance).toBe('string');

      console.log(`USDT Balance: ${balance.formattedBalance} USDT`);
    });

    it('should fetch account resources', async () => {
      const resources = await fetcher.getAccountResources(JUSTIN_SUN_ADDRESS);

      expect(resources).toBeDefined();
      expect(typeof resources.freeNetLimit).toBe('number');
      expect(typeof resources.energyLimit).toBe('number');

      console.log(`Free Net Limit: ${resources.freeNetLimit}`);
      console.log(`Energy Limit: ${resources.energyLimit}`);
    });

    it('should fetch all TRC20 balances', async () => {
      const balances = await fetcher.getTrc20Balances(JUSTIN_SUN_ADDRESS);

      expect(balances).toBeDefined();
      expect(Array.isArray(balances)).toBe(true);

      console.log(`TRC20 tokens found: ${balances.length}`);
      if (balances.length > 0) {
        console.log(`First token: ${balances[0].contractAddress} = ${balances[0].balance}`);
      }
    });

    it('should handle address with no balance gracefully', async () => {
      // Use a random valid Tron address that likely has no balance
      const emptyAddress = 'TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW';

      const balance = await fetcher.getNativeBalance(emptyAddress);

      expect(balance).toBeDefined();
      expect(balance.isNative).toBe(true);
      expect(balance.symbol).toBe('TRX');
      expect(typeof balance.balance).toBe('string');
    });
  });

  describe('Tron Testnet (Shasta)', () => {
    const config = getTvmChainConfig('tron-testnet', { auth: TRONGRID_AUTH });
    const fetcher = new TvmBalanceFetcher(config);

    it('should fetch native TRX balance on testnet', async () => {
      // Use a known testnet address or any valid address
      const testAddress = 'TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW';

      const balance = await fetcher.getNativeBalance(testAddress);

      expect(balance).toBeDefined();
      expect(balance.isNative).toBe(true);
      expect(balance.symbol).toBe('TRX');
      expect(balance.decimals).toBe(6);
    });
  });
});
