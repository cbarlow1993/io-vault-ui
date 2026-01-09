// packages/chains/tests/integration/balances/svm.test.ts

import { describe, it, expect } from 'vitest';
import { SvmBalanceFetcher } from '../../../src/svm/balance.js';
import { getSvmChainConfig } from '../../../src/svm/config.js';

/**
 * SVM (Solana) Balance Integration Tests
 *
 * These tests make live RPC calls to Solana nodes.
 * Run with: npm run test:integration
 */
describe('SVM Balance Integration Tests', () => {
  // Well-known Solana addresses
  // Solana Foundation Treasury (large holder)
  const SOLANA_FOUNDATION = '7K8DVxtNJGnMtUY1CQJT5jcs8sFGSZTDiG7kowvFpECh';

  // USDC mint on Solana mainnet
  const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

  describe('Solana Mainnet', () => {
    const config = getSvmChainConfig('solana');
    const fetcher = new SvmBalanceFetcher(config);

    it('should fetch native SOL balance for Solana Foundation', async () => {
      const balance = await fetcher.getNativeBalance(SOLANA_FOUNDATION);

      expect(balance).toBeDefined();
      expect(balance.isNative).toBe(true);
      expect(balance.symbol).toBe('SOL');
      expect(balance.decimals).toBe(9);
      expect(typeof balance.balance).toBe('string');
      expect(typeof balance.formattedBalance).toBe('string');

      // Foundation should have some SOL
      const balanceValue = BigInt(balance.balance);
      expect(balanceValue).toBeGreaterThan(0n);
    });

    it('should handle address with minimal balance gracefully', async () => {
      // System program - always has some minimal balance (rent-exempt)
      const systemProgram = '11111111111111111111111111111111';

      const balance = await fetcher.getNativeBalance(systemProgram);

      expect(balance).toBeDefined();
      expect(balance.isNative).toBe(true);
      expect(balance.symbol).toBe('SOL');
      // System program has a small balance (at least 1 lamport)
      expect(typeof balance.balance).toBe('string');
    });

    it('should fetch USDC token balance', async () => {
      // Circle's USDC authority (should have USDC tokens)
      const usdcHolder = '6FEVkH17P9y8Q9aCkDdPcMDjvj7SVxrTETaYEm8f51Jy';

      const balance = await fetcher.getTokenBalance(usdcHolder, USDC_MINT);

      expect(balance).toBeDefined();
      expect(balance.contractAddress).toBe(USDC_MINT);
      expect(typeof balance.balance).toBe('string');
      expect(typeof balance.formattedBalance).toBe('string');
    });
  });

  describe('Solana Devnet', () => {
    const config = getSvmChainConfig('solana-devnet');
    const fetcher = new SvmBalanceFetcher(config);

    it('should fetch native SOL balance on devnet', async () => {
      // System program - always exists on devnet
      const systemProgram = '11111111111111111111111111111111';

      const balance = await fetcher.getNativeBalance(systemProgram);

      expect(balance).toBeDefined();
      expect(balance.isNative).toBe(true);
      expect(balance.symbol).toBe('SOL');
      expect(balance.decimals).toBe(9);
    });
  });
});
