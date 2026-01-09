// packages/chains/tests/unit/svm/transaction-fetcher.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SvmTransactionFetcher } from '../../../src/svm/transaction-fetcher.js';
import { TransactionNotFoundError, InvalidTransactionHashError } from '../../../src/core/errors.js';
import { mockSvmConfig, TEST_DATA } from '../../fixtures/config.js';

const { signature: TEST_SIGNATURE, sender: TEST_SENDER, recipient: TEST_RECIPIENT, usdcMint: TEST_MINT } = TEST_DATA.svm;

describe('SvmTransactionFetcher', () => {
  let fetcher: SvmTransactionFetcher;
  let mockRpcCall: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockRpcCall = vi.fn();
    fetcher = new SvmTransactionFetcher(mockSvmConfig, 'solana', mockRpcCall);
  });

  describe('validateTransactionHash', () => {
    it('throws for signature with wrong length', async () => {
      await expect(fetcher.getTransaction('abc123')).rejects.toThrow(InvalidTransactionHashError);
    });

    it('throws for signature with invalid base58 characters', async () => {
      // Contains 'O' which is not in base58 alphabet
      const invalidSig = 'O' + 'A'.repeat(86);
      await expect(fetcher.getTransaction(invalidSig)).rejects.toThrow(InvalidTransactionHashError);
    });

    it('throws for signature with 0 character (not in base58)', async () => {
      const invalidSig = '0' + 'A'.repeat(86);
      await expect(fetcher.getTransaction(invalidSig)).rejects.toThrow(InvalidTransactionHashError);
    });
  });

  describe('getTransaction', () => {
    it('fetches and normalizes a confirmed transaction', async () => {
      const mockTransaction = {
        slot: 200000000,
        blockTime: 1704067200,
        meta: {
          err: null,
          fee: 5000,
          preBalances: [1000000000, 500000000],
          postBalances: [994995000, 505000000],
          innerInstructions: [],
          logMessages: [],
          preTokenBalances: [],
          postTokenBalances: [],
        },
        transaction: {
          message: {
            accountKeys: [TEST_SENDER, TEST_RECIPIENT],
            instructions: [],
            recentBlockhash: 'GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi',
          },
          signatures: [TEST_SIGNATURE],
        },
      };

      mockRpcCall.mockResolvedValueOnce(mockTransaction);

      const result = await fetcher.getTransaction(TEST_SIGNATURE);

      expect(result.chainAlias).toBe('solana');
      expect(result.raw._chain).toBe('svm');
      expect(result.normalized.hash).toBe(TEST_SIGNATURE);
      expect(result.normalized.status).toBe('confirmed');
      expect(result.normalized.from).toBe(TEST_SENDER);
      expect(result.normalized.to).toBe(TEST_RECIPIENT);
      expect(result.normalized.value).toBe('5000000'); // SOL transfer
      expect(result.normalized.fee).toBe('5000');
      expect(result.normalized.blockNumber).toBe(200000000);
      expect(result.normalized.timestamp).toBe(1704067200);
    });

    it('returns failed status for transaction with error', async () => {
      const mockTransaction = {
        slot: 200000000,
        blockTime: 1704067200,
        meta: {
          err: { InstructionError: [0, 'InsufficientFunds'] },
          fee: 5000,
          preBalances: [1000000000, 500000000],
          postBalances: [995000000, 500000000],
          innerInstructions: [],
          logMessages: [],
          preTokenBalances: [],
          postTokenBalances: [],
        },
        transaction: {
          message: {
            accountKeys: [TEST_SENDER, TEST_RECIPIENT],
            instructions: [],
            recentBlockhash: 'GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi',
          },
          signatures: [TEST_SIGNATURE],
        },
      };

      mockRpcCall.mockResolvedValueOnce(mockTransaction);

      const result = await fetcher.getTransaction(TEST_SIGNATURE);

      expect(result.normalized.status).toBe('failed');
    });

    it('throws TransactionNotFoundError when transaction does not exist', async () => {
      mockRpcCall.mockResolvedValueOnce(null);

      await expect(fetcher.getTransaction(TEST_SIGNATURE)).rejects.toThrow(TransactionNotFoundError);
    });

    it('parses SPL token transfers from balance changes', async () => {
      const mockTransaction = {
        slot: 200000000,
        blockTime: 1704067200,
        meta: {
          err: null,
          fee: 5000,
          preBalances: [1000000000, 500000000, 0],
          postBalances: [994995000, 500000000, 0],
          innerInstructions: [],
          logMessages: [],
          preTokenBalances: [
            {
              accountIndex: 1,
              mint: TEST_MINT,
              owner: TEST_SENDER,
              uiTokenAmount: { amount: '1000000', decimals: 6 },
            },
            {
              accountIndex: 2,
              mint: TEST_MINT,
              owner: TEST_RECIPIENT,
              uiTokenAmount: { amount: '500000', decimals: 6 },
            },
          ],
          postTokenBalances: [
            {
              accountIndex: 1,
              mint: TEST_MINT,
              owner: TEST_SENDER,
              uiTokenAmount: { amount: '750000', decimals: 6 },
            },
            {
              accountIndex: 2,
              mint: TEST_MINT,
              owner: TEST_RECIPIENT,
              uiTokenAmount: { amount: '750000', decimals: 6 },
            },
          ],
        },
        transaction: {
          message: {
            accountKeys: [TEST_SENDER, 'TokenAccount1', 'TokenAccount2'],
            instructions: [],
            recentBlockhash: 'GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi',
          },
          signatures: [TEST_SIGNATURE],
        },
      };

      mockRpcCall.mockResolvedValueOnce(mockTransaction);

      const result = await fetcher.getTransaction(TEST_SIGNATURE);

      expect(result.normalized.tokenTransfers).toHaveLength(1);
      expect(result.normalized.tokenTransfers[0]).toMatchObject({
        contractAddress: TEST_MINT,
        from: TEST_SENDER,
        to: TEST_RECIPIENT,
        value: '250000',
        tokenType: 'spl',
        decimals: 6,
      });
    });

    it('parses inner instructions as internal transactions', async () => {
      const mockTransaction = {
        slot: 200000000,
        blockTime: 1704067200,
        meta: {
          err: null,
          fee: 5000,
          preBalances: [1000000000, 500000000],
          postBalances: [994995000, 505000000],
          innerInstructions: [
            {
              index: 0,
              instructions: [
                {
                  programIdIndex: 1,
                  accounts: [0, 1],
                  data: 'base58data',
                },
              ],
            },
          ],
          logMessages: [],
          preTokenBalances: [],
          postTokenBalances: [],
        },
        transaction: {
          message: {
            accountKeys: [TEST_SENDER, TEST_RECIPIENT, '11111111111111111111111111111111'],
            instructions: [],
            recentBlockhash: 'GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi',
          },
          signatures: [TEST_SIGNATURE],
        },
      };

      mockRpcCall.mockResolvedValueOnce(mockTransaction);

      const result = await fetcher.getTransaction(TEST_SIGNATURE);

      expect(result.normalized.internalTransactions).toHaveLength(1);
      expect(result.normalized.internalTransactions[0]).toMatchObject({
        from: TEST_SENDER,
        to: TEST_RECIPIENT,
        type: 'call',
      });
      expect(result.normalized.hasFullInternalData).toBe(true);
    });
  });
});
