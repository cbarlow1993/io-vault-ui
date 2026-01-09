// packages/chains/tests/integration/transactions/svm.test.ts

import { describe, it, expect } from 'vitest';
import { SvmChainProvider } from '../../../src/svm/provider.js';
import type { UnsignedSvmTransaction } from '../../../src/svm/transaction-builder.js';

/**
 * SVM Transaction Integration Tests
 *
 * These tests make live RPC calls to Solana nodes.
 * Run with: npm run test:integration
 */
describe('SVM Transaction Integration Tests', () => {
  // Well-known addresses
  const SOLANA_FOUNDATION = '7K8DVxtNJGnMtUY1CQJT5jcs8sFGSZTDiG7kowvFpECh';
  const RECIPIENT_ADDRESS = 'EXnGBBSamqzd3uxEdRLUiYzjJkTwQyorAaFXdfteuGXe';
  const SYSTEM_PROGRAM = '11111111111111111111111111111111';

  // Internal RPC URL
  const SOLANA_RPC_URL = 'https://nodes.iofinnet.com/internal/solana';

  describe('Solana Mainnet - Build Transactions', () => {
    const provider = new SvmChainProvider('solana', SOLANA_RPC_URL);

    it('should build unsigned native SOL transfer', async () => {
      const tx = await provider.buildNativeTransfer({
        from: SOLANA_FOUNDATION,
        to: RECIPIENT_ADDRESS,
        value: '1000000000', // 1 SOL in lamports
      });

      expect(tx).toBeDefined();
      expect(tx.chainAlias).toBe('solana');
      expect(tx.serialized).toBeDefined();

      const svmTx = tx as UnsignedSvmTransaction;
      expect(svmTx.raw).toBeDefined();
      expect(svmTx.raw.feePayer).toBe(SOLANA_FOUNDATION);
      expect(svmTx.raw.recentBlockhash).toBeDefined();
      expect(svmTx.raw.instructions).toBeDefined();
      expect(svmTx.raw.instructions.length).toBeGreaterThan(0);

      // Check System Program transfer instruction
      const instruction = svmTx.raw.instructions[0];
      expect(instruction.programId).toBe(SYSTEM_PROGRAM);
    });

    it('should include recent blockhash from network', async () => {
      const tx = await provider.buildNativeTransfer({
        from: SOLANA_FOUNDATION,
        to: RECIPIENT_ADDRESS,
        value: '1000000',
      });

      const svmTx = tx as UnsignedSvmTransaction;
      expect(svmTx.raw.recentBlockhash).toBeDefined();
      expect(typeof svmTx.raw.recentBlockhash).toBe('string');
      expect(svmTx.raw.recentBlockhash.length).toBeGreaterThan(30);
    });

    it('should set correct account signers and writability', async () => {
      const tx = await provider.buildNativeTransfer({
        from: SOLANA_FOUNDATION,
        to: RECIPIENT_ADDRESS,
        value: '1000000',
      });

      const svmTx = tx as UnsignedSvmTransaction;
      const instruction = svmTx.raw.instructions[0];

      // From account should be signer and writable
      const fromAccount = instruction.accounts.find((a) => a.pubkey === SOLANA_FOUNDATION);
      expect(fromAccount?.isSigner).toBe(true);
      expect(fromAccount?.isWritable).toBe(true);

      // To account should not be signer but writable
      const toAccount = instruction.accounts.find((a) => a.pubkey === RECIPIENT_ADDRESS);
      expect(toAccount?.isSigner).toBe(false);
      expect(toAccount?.isWritable).toBe(true);
    });
  });

  describe('Solana Mainnet - Decode Transactions', () => {
    const provider = new SvmChainProvider('solana', SOLANA_RPC_URL);

    it('should decode transaction to normalised format', async () => {
      const tx = await provider.buildNativeTransfer({
        from: SOLANA_FOUNDATION,
        to: RECIPIENT_ADDRESS,
        value: '1000000000', // 1 SOL
      });

      const normalised = provider.decode(tx.serialized, 'normalised');

      expect(normalised).toBeDefined();
      expect(normalised.chainAlias).toBe('solana');
      expect(normalised.type).toBe('native-transfer');
      expect(normalised.symbol).toBe('SOL');
      expect(normalised.value).toBe('1000000000');
      expect(normalised.formattedValue).toBe('1');
    });

    it('should decode transaction to raw format', async () => {
      const tx = await provider.buildNativeTransfer({
        from: SOLANA_FOUNDATION,
        to: RECIPIENT_ADDRESS,
        value: '1000000000',
      });

      const raw = provider.decode(tx.serialized, 'raw');

      expect(raw).toBeDefined();
      expect(raw._chain).toBe('svm');
      expect(raw.feePayer).toBe(SOLANA_FOUNDATION);
      expect(raw.recentBlockhash).toBeDefined();
      expect(raw.instructions).toBeDefined();
      expect(raw.instructions.length).toBeGreaterThan(0);
    });
  });

  describe('Solana Mainnet - Signing Payload', () => {
    const provider = new SvmChainProvider('solana', SOLANA_RPC_URL);

    it('should generate valid signing payload', async () => {
      const tx = await provider.buildNativeTransfer({
        from: SOLANA_FOUNDATION,
        to: RECIPIENT_ADDRESS,
        value: '1000000000',
      });

      const svmTx = tx as UnsignedSvmTransaction;
      const payload = svmTx.getSigningPayload();

      expect(payload).toBeDefined();
      expect(payload.chainAlias).toBe('solana');
      expect(payload.algorithm).toBe('ed25519');
      expect(payload.data).toBeDefined();
      expect(Array.isArray(payload.data)).toBe(true);
      expect(payload.data.length).toBe(1);
      // Should be a valid hex string (serialized message to sign)
      expect(typeof payload.data[0]).toBe('string');
      expect(payload.data[0].length).toBeGreaterThan(0);
    });
  });

  describe('Solana Mainnet - Fee Estimation', () => {
    const provider = new SvmChainProvider('solana', SOLANA_RPC_URL);

    it('should fetch fee estimates', async () => {
      const estimate = await provider.estimateFee();

      expect(estimate).toBeDefined();
      expect(estimate.slow).toBeDefined();
      expect(estimate.standard).toBeDefined();
      expect(estimate.fast).toBeDefined();

      expect(typeof estimate.slow.fee).toBe('string');
      expect(estimate.slow.formattedFee).toContain('SOL');

      const slowFee = BigInt(estimate.slow.fee);
      const standardFee = BigInt(estimate.standard.fee);
      const fastFee = BigInt(estimate.fast.fee);

      expect(fastFee).toBeGreaterThanOrEqual(standardFee);
      expect(standardFee).toBeGreaterThanOrEqual(slowFee);
    });
  });

  describe('Solana Devnet - Build Transactions', () => {
    const provider = new SvmChainProvider('solana-devnet');

    it('should build unsigned native SOL transfer on devnet', async () => {
      const tx = await provider.buildNativeTransfer({
        from: SOLANA_FOUNDATION,
        to: RECIPIENT_ADDRESS,
        value: '1000000000',
      });

      expect(tx).toBeDefined();
      expect(tx.chainAlias).toBe('solana-devnet');

      const svmTx = tx as UnsignedSvmTransaction;
      expect(svmTx.raw.recentBlockhash).toBeDefined();
    });
  });

  describe('SVM - Error Cases', () => {
    const provider = new SvmChainProvider('solana', SOLANA_RPC_URL);

    it('should throw error for invalid from address', async () => {
      await expect(
        provider.buildNativeTransfer({
          from: 'invalid-address',
          to: RECIPIENT_ADDRESS,
          value: '1000000000',
        })
      ).rejects.toThrow();
    });

    it('should throw error for invalid to address', async () => {
      await expect(
        provider.buildNativeTransfer({
          from: SOLANA_FOUNDATION,
          to: 'invalid-address',
          value: '1000000000',
        })
      ).rejects.toThrow();
    });
  });
});
