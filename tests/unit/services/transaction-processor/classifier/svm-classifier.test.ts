import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { describe, it, expect } from 'vitest';
import { SvmClassifier } from '@/src/services/transaction-processor/classifier/svm-classifier.js';
import type { SvmTransactionData } from '@/src/services/transaction-processor/types.js';

const SYSTEM_PROGRAM = '11111111111111111111111111111111';
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

describe('SvmClassifier', () => {
  const classifier = new SvmClassifier();
  const userWallet = 'UserWa11etAddress111111111111111111111111111';

  const baseTx: SvmTransactionData = {
    type: 'svm',
    signature: 'sig123',
    slot: 123456789,
    blockTime: 1704067200,
    fee: '5000',
    status: 'success',
    instructions: [],
    preBalances: ['1000000000', '0'],
    postBalances: ['999995000', '5000'],
    preTokenBalances: [],
    postTokenBalances: [],
  };

  describe('transfer classification', () => {
    it('classifies native SOL transfer', async () => {
      const tx: SvmTransactionData = {
        ...baseTx,
        instructions: [{ programId: SYSTEM_PROGRAM, accounts: ['sender', 'recipient'], data: 'AgAAAADh9QUAAAAA' }],
      };
      const result = await classifier.classify(tx, { perspectiveAddress: userWallet });
      expect(result.type).toBe('transfer');
      expect(result.confidence).toBe('high');
    });

    it('classifies SPL token transfer from balance changes', async () => {
      const tx: SvmTransactionData = {
        ...baseTx,
        instructions: [{ programId: TOKEN_PROGRAM, accounts: ['source', 'dest', 'owner'], data: 'A0dEpQAAAA==' }],
        preTokenBalances: [{ accountIndex: 0, mint: 'TokenMint111111111111111111111111', owner: 'sender', uiTokenAmount: { amount: '1000000', decimals: 6 } }],
        postTokenBalances: [{ accountIndex: 0, mint: 'TokenMint111111111111111111111111', owner: 'sender', uiTokenAmount: { amount: '900000', decimals: 6 } }],
      };
      const result = await classifier.classify(tx, { perspectiveAddress: userWallet });
      expect(result.type).toBe('transfer');
      expect(result.transfers).toHaveLength(1);
      expect(result.transfers[0]!.type).toBe('token');
    });
  });

  describe('swap classification', () => {
    it('classifies swap with multiple token balance changes', async () => {
      const tx: SvmTransactionData = {
        ...baseTx,
        preTokenBalances: [
          { accountIndex: 0, mint: 'TokenA11111111111111111111111111', owner: 'user', uiTokenAmount: { amount: '1000000', decimals: 6 } },
          { accountIndex: 1, mint: 'TokenB11111111111111111111111111', owner: 'user', uiTokenAmount: { amount: '0', decimals: 9 } },
        ],
        postTokenBalances: [
          { accountIndex: 0, mint: 'TokenA11111111111111111111111111', owner: 'user', uiTokenAmount: { amount: '900000', decimals: 6 } },
          { accountIndex: 1, mint: 'TokenB11111111111111111111111111', owner: 'user', uiTokenAmount: { amount: '500000000', decimals: 9 } },
        ],
      };
      const result = await classifier.classify(tx, { perspectiveAddress: userWallet });
      expect(result.type).toBe('swap');
      expect(result.transfers.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('unknown classification', () => {
    it('returns unknown for unrecognized transactions', async () => {
      const tx: SvmTransactionData = {
        ...baseTx,
        instructions: [{ programId: 'UnknownProgram111111111111111111', accounts: [], data: '' }],
      };
      const result = await classifier.classify(tx, { perspectiveAddress: userWallet });
      expect(result.type).toBe('unknown');
      expect(result.confidence).toBe('low');
    });
  });

  describe('direction classification', () => {
    it('classifies received token transfer as direction in', async () => {
      const tx: SvmTransactionData = {
        ...baseTx,
        preTokenBalances: [
          { accountIndex: 0, mint: 'TokenMint111111111111111111111111', owner: userWallet, uiTokenAmount: { amount: '0', decimals: 6 } },
        ],
        postTokenBalances: [
          { accountIndex: 0, mint: 'TokenMint111111111111111111111111', owner: userWallet, uiTokenAmount: { amount: '1000000', decimals: 6 } },
        ],
      };
      const result = await classifier.classify(tx, { perspectiveAddress: userWallet });
      expect(result.direction).toBe('in');
      expect(result.label).toContain('Received');
    });

    it('classifies sent token transfer as direction out', async () => {
      const tx: SvmTransactionData = {
        ...baseTx,
        preTokenBalances: [
          { accountIndex: 0, mint: 'TokenMint111111111111111111111111', owner: userWallet, uiTokenAmount: { amount: '1000000', decimals: 6 } },
        ],
        postTokenBalances: [
          { accountIndex: 0, mint: 'TokenMint111111111111111111111111', owner: userWallet, uiTokenAmount: { amount: '0', decimals: 6 } },
        ],
      };
      const result = await classifier.classify(tx, { perspectiveAddress: userWallet });
      expect(result.direction).toBe('out');
      expect(result.label).toContain('Sent');
    });

    it('classifies swap as direction neutral', async () => {
      const tx: SvmTransactionData = {
        ...baseTx,
        preTokenBalances: [
          { accountIndex: 0, mint: 'TokenA11111111111111111111111111', owner: userWallet, uiTokenAmount: { amount: '1000000', decimals: 6 } },
          { accountIndex: 1, mint: 'TokenB11111111111111111111111111', owner: userWallet, uiTokenAmount: { amount: '0', decimals: 9 } },
        ],
        postTokenBalances: [
          { accountIndex: 0, mint: 'TokenA11111111111111111111111111', owner: userWallet, uiTokenAmount: { amount: '900000', decimals: 6 } },
          { accountIndex: 1, mint: 'TokenB11111111111111111111111111', owner: userWallet, uiTokenAmount: { amount: '500000000', decimals: 9 } },
        ],
      };
      const result = await classifier.classify(tx, { perspectiveAddress: userWallet });
      expect(result.direction).toBe('neutral');
    });

    it('classifies unknown transaction as direction neutral', async () => {
      const tx: SvmTransactionData = {
        ...baseTx,
        instructions: [{ programId: 'UnknownProgram111111111111111111', accounts: [], data: '' }],
      };
      const result = await classifier.classify(tx, { perspectiveAddress: userWallet });
      expect(result.direction).toBe('neutral');
    });
  });
});
