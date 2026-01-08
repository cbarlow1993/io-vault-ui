// packages/chains/tests/unit/svm/transaction-builder.test.ts
import { describe, it, expect } from 'vitest';
import { UnsignedSvmTransaction, type SvmTransactionData } from '../../../src/svm/transaction-builder.js';
import type { SvmChainConfig } from '../../../src/svm/config.js';

describe('UnsignedSvmTransaction', () => {
  const mockConfig: SvmChainConfig = {
    chainAlias: 'solana',
    cluster: 'mainnet-beta',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    nativeCurrency: { symbol: 'SOL', decimals: 9 },
  };

  const createNativeTransferTx = (): SvmTransactionData => ({
    version: 'legacy',
    recentBlockhash: 'GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi',
    feePayer: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
    instructions: [
      {
        programId: '11111111111111111111111111111111', // System Program
        accounts: [
          { pubkey: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV', isSigner: true, isWritable: true },
          { pubkey: 'Bq4n9F3QJzK4HLmP9LQyCnZtPSd8GjvT7ZLGAyRMwXwV', isSigner: false, isWritable: true },
        ],
        data: 'AgAAAADh9QUAAAAAAA==', // base64 encoded transfer instruction (2 + amount as u64)
      },
    ],
    value: '1000000000', // 1 SOL in lamports
    computeUnitPrice: undefined,
    computeUnitLimit: undefined,
  });

  describe('constructor', () => {
    it('creates transaction with correct chain alias', () => {
      const txData = createNativeTransferTx();
      const tx = new UnsignedSvmTransaction(mockConfig, txData);

      expect(tx.chainAlias).toBe('solana');
    });

    it('stores raw transaction data', () => {
      const txData = createNativeTransferTx();
      const tx = new UnsignedSvmTransaction(mockConfig, txData);

      expect(tx.raw).toEqual(txData);
    });

    it('serializes to JSON string', () => {
      const txData = createNativeTransferTx();
      const tx = new UnsignedSvmTransaction(mockConfig, txData);

      const parsed = JSON.parse(tx.serialized);
      expect(parsed.recentBlockhash).toBe(txData.recentBlockhash);
      expect(parsed.feePayer).toBe(txData.feePayer);
    });
  });

  describe('rebuild', () => {
    it('creates new transaction with updated computeUnitPrice', () => {
      const txData = createNativeTransferTx();
      const tx = new UnsignedSvmTransaction(mockConfig, txData);

      const rebuilt = tx.rebuild({ computeUnitPrice: 1000000 });

      expect(rebuilt.raw.computeUnitPrice).toBe(1000000);
      expect(rebuilt.raw.recentBlockhash).toBe(txData.recentBlockhash);
      expect(rebuilt).not.toBe(tx); // New instance
    });

    it('creates new transaction with updated computeUnitLimit', () => {
      const txData = createNativeTransferTx();
      const tx = new UnsignedSvmTransaction(mockConfig, txData);

      const rebuilt = tx.rebuild({ computeUnitLimit: 200000 });

      expect(rebuilt.raw.computeUnitLimit).toBe(200000);
    });

    it('preserves original transaction on rebuild', () => {
      const txData = createNativeTransferTx();
      const tx = new UnsignedSvmTransaction(mockConfig, txData);
      const originalPrice = tx.raw.computeUnitPrice;

      tx.rebuild({ computeUnitPrice: 500000 });

      expect(tx.raw.computeUnitPrice).toBe(originalPrice);
    });
  });

  describe('getSigningPayload', () => {
    it('returns ed25519 algorithm for Solana', () => {
      const txData = createNativeTransferTx();
      const tx = new UnsignedSvmTransaction(mockConfig, txData);

      const payload = tx.getSigningPayload();

      expect(payload.algorithm).toBe('ed25519');
      expect(payload.chainAlias).toBe('solana');
    });

    it('returns single hash to sign', () => {
      const txData = createNativeTransferTx();
      const tx = new UnsignedSvmTransaction(mockConfig, txData);

      const payload = tx.getSigningPayload();

      expect(payload.data).toHaveLength(1);
      expect(payload.data[0]).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64
    });
  });

  describe('applySignature', () => {
    it('throws error for invalid signature count', () => {
      const txData = createNativeTransferTx();
      const tx = new UnsignedSvmTransaction(mockConfig, txData);

      expect(() => tx.applySignature([])).toThrow('Solana transactions require at least one signature');
    });

    it('throws error for invalid signature format', () => {
      const txData = createNativeTransferTx();
      const tx = new UnsignedSvmTransaction(mockConfig, txData);

      expect(() => tx.applySignature(['not-base64!@#$'])).toThrow('Invalid signature format');
    });

    it('creates signed transaction with valid signature', () => {
      const txData = createNativeTransferTx();
      const tx = new UnsignedSvmTransaction(mockConfig, txData);

      // 64-byte signature encoded as base64 (88 chars)
      const validSignature = 'A'.repeat(86) + '==';

      const signed = tx.applySignature([validSignature]);

      expect(signed.chainAlias).toBe('solana');
      expect(signed.serialized).toBeDefined();
    });
  });

  describe('toNormalised', () => {
    it('identifies native transfer', () => {
      const txData = createNativeTransferTx();
      const tx = new UnsignedSvmTransaction(mockConfig, txData);

      const normalised = tx.toNormalised();

      expect(normalised.type).toBe('native-transfer');
      expect(normalised.symbol).toBe('SOL');
      expect(normalised.value).toBe('1000000000');
      expect(normalised.formattedValue).toBe('1');
    });

    it('identifies token transfer', () => {
      const txData: SvmTransactionData = {
        ...createNativeTransferTx(),
        value: '0',
        instructions: [
          {
            programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // SPL Token Program
            accounts: [
              { pubkey: 'SourceTokenAccount', isSigner: false, isWritable: true },
              { pubkey: 'DestTokenAccount', isSigner: false, isWritable: true },
              { pubkey: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV', isSigner: true, isWritable: false },
            ],
            data: 'AwAAAAAAAAAA', // transfer instruction
          },
        ],
      };
      const tx = new UnsignedSvmTransaction(mockConfig, txData);

      const normalised = tx.toNormalised();

      expect(normalised.type).toBe('token-transfer');
    });

    it('identifies program call (contract call equivalent)', () => {
      const txData: SvmTransactionData = {
        ...createNativeTransferTx(),
        value: '0',
        instructions: [
          {
            programId: 'SomeCustomProgram111111111111111111111111111',
            accounts: [],
            data: 'base64data',
          },
        ],
      };
      const tx = new UnsignedSvmTransaction(mockConfig, txData);

      const normalised = tx.toNormalised();

      expect(normalised.type).toBe('contract-call'); // Program invocation
    });
  });

  describe('toRaw', () => {
    it('returns raw transaction with _chain marker', () => {
      const txData = createNativeTransferTx();
      const tx = new UnsignedSvmTransaction(mockConfig, txData);

      const raw = tx.toRaw();

      expect(raw._chain).toBe('svm');
      expect(raw.version).toBe('legacy');
      expect(raw.feePayer).toBe(txData.feePayer);
      expect(raw.recentBlockhash).toBe(txData.recentBlockhash);
      expect(raw.instructions).toHaveLength(1);
    });
  });
});
