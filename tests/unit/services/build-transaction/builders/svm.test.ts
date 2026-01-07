import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SolanaTransactionBuilder, SolanaWallet, Chain } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { buildSvmNativeTransaction, buildSvmTokenTransaction } from '@/src/services/build-transaction/builders/svm.js';

describe('SVM Builder', () => {
  let mockWallet: SolanaWallet;
  let mockChain: Chain;
  let mockTransaction: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockTransaction = {
      marshalHex: vi.fn().mockReturnValue('base64encodedtx'),
      toEIP712Details: vi.fn().mockResolvedValue([
        { name: 'To', type: 'address', value: 'recipientPubkey' },
        { name: 'Amount', type: 'lamports', value: '1000000000' },
      ]),
    };

    mockWallet = {
      address: 'senderPubkey',
    } as unknown as SolanaWallet;

    mockChain = {
      TransactionBuilder: {
        buildNativeTransaction: vi.fn().mockResolvedValue(mockTransaction),
        buildTokenTransaction: vi.fn().mockResolvedValue(mockTransaction),
      } as unknown as SolanaTransactionBuilder,
    } as unknown as Chain;
  });

  describe('buildSvmNativeTransaction', () => {
    it('should build native SOL transaction', async () => {
      const result = await buildSvmNativeTransaction({
        wallet: mockWallet,
        chain: mockChain,
        amount: '1',
        to: 'recipientPubkey',
      });

      expect(mockChain.TransactionBuilder.buildNativeTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '1',
          from: mockWallet,
          to: 'recipientPubkey',
        })
      );
      expect(result.marshalledHex).toBe('base64encodedtx');
    });

    it('should include nonceAccount when provided', async () => {
      await buildSvmNativeTransaction({
        wallet: mockWallet,
        chain: mockChain,
        amount: '1',
        to: 'recipientPubkey',
        nonceAccount: 'nonceAccountPubkey',
      });

      expect(mockChain.TransactionBuilder.buildNativeTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          nonceAccount: 'nonceAccountPubkey',
        })
      );
    });

    it('should return details from toEIP712Details', async () => {
      const result = await buildSvmNativeTransaction({
        wallet: mockWallet,
        chain: mockChain,
        amount: '1',
        to: 'recipientPubkey',
      });

      expect(result.details).toHaveLength(2);
      expect(result.details[0]).toEqual({ name: 'To', type: 'address', value: 'recipientPubkey' });
    });

    it('should throw error when transaction build fails', async () => {
      vi.mocked(mockChain.TransactionBuilder.buildNativeTransaction).mockRejectedValue(
        new Error('insufficient balance: account cannot cover transaction')
      );

      await expect(
        buildSvmNativeTransaction({
          wallet: mockWallet,
          chain: mockChain,
          amount: '1',
          to: 'recipientPubkey',
        })
      ).rejects.toThrow();
    });

    it('should throw error for invalid sender address', async () => {
      vi.mocked(mockChain.TransactionBuilder.buildNativeTransaction).mockRejectedValue(
        new Error('invalid sender address')
      );

      await expect(
        buildSvmNativeTransaction({
          wallet: mockWallet,
          chain: mockChain,
          amount: '1',
          to: 'recipientPubkey',
        })
      ).rejects.toThrow();
    });
  });

  describe('buildSvmTokenTransaction', () => {
    it('should build SPL token transaction', async () => {
      const result = await buildSvmTokenTransaction({
        wallet: mockWallet,
        chain: mockChain,
        amount: '100',
        to: 'recipientPubkey',
        tokenAddress: 'mintAddress',
        decimals: 9,
      });

      expect(mockChain.TransactionBuilder.buildTokenTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '100',
          tokenAddress: 'mintAddress',
          decimals: 9,
        })
      );
      expect(result.marshalledHex).toBe('base64encodedtx');
    });

    it('should include nonceAccount when provided for token transactions', async () => {
      await buildSvmTokenTransaction({
        wallet: mockWallet,
        chain: mockChain,
        amount: '100',
        to: 'recipientPubkey',
        tokenAddress: 'mintAddress',
        decimals: 6,
        nonceAccount: 'nonceAccountPubkey',
      });

      expect(mockChain.TransactionBuilder.buildTokenTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          nonceAccount: 'nonceAccountPubkey',
        })
      );
    });

    it('should include decimals when provided', async () => {
      await buildSvmTokenTransaction({
        wallet: mockWallet,
        chain: mockChain,
        amount: '100',
        to: 'recipientPubkey',
        tokenAddress: 'mintAddress',
        decimals: 6,
      });

      expect(mockChain.TransactionBuilder.buildTokenTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          decimals: 6,
        })
      );
    });

    it('should throw error when token transaction build fails', async () => {
      vi.mocked(mockChain.TransactionBuilder.buildTokenTransaction).mockRejectedValue(
        new Error('insufficient token balance: cannot cover transaction')
      );

      await expect(
        buildSvmTokenTransaction({
          wallet: mockWallet,
          chain: mockChain,
          amount: '100',
          to: 'recipientPubkey',
          tokenAddress: 'mintAddress',
          decimals: 6,
        })
      ).rejects.toThrow();
    });

    it('should throw error for token account not found', async () => {
      vi.mocked(mockChain.TransactionBuilder.buildTokenTransaction).mockRejectedValue(
        new Error('token account not found for mint')
      );

      await expect(
        buildSvmTokenTransaction({
          wallet: mockWallet,
          chain: mockChain,
          amount: '100',
          to: 'recipientPubkey',
          tokenAddress: 'mintAddress',
          decimals: 9,
        })
      ).rejects.toThrow();
    });

    it('should throw error when decimals is not provided', async () => {
      await expect(
        buildSvmTokenTransaction({
          wallet: mockWallet,
          chain: mockChain,
          amount: '100',
          to: 'recipientPubkey',
          tokenAddress: 'mintAddress',
          // decimals intentionally omitted
        })
      ).rejects.toThrow('decimals is required for SPL token transactions');
    });
  });
});
