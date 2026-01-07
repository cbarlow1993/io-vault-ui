import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DurableNonce } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type {
  Chain,
  SolanaTransactionBuilder,
  SolanaWallet,
} from '@iofinnet/io-core-dapp-utils-chains-sdk';
import {
  buildDurableNonceTransaction,
  getDurableNonceAccount,
} from '@/src/services/build-transaction/builders/svm-durable-nonce.js';

vi.mock('@iofinnet/io-core-dapp-utils-chains-sdk', async () => {
  const actual = await vi.importActual('@iofinnet/io-core-dapp-utils-chains-sdk');
  return {
    ...actual,
    DurableNonce: {
      isNonceAccountInitialized: vi.fn(),
      fetchNonceAccountInfo: vi.fn(),
    },
  };
});

describe('SVM Durable Nonce Builder', () => {
  let mockWallet: SolanaWallet;
  let mockChain: Chain;
  let mockTransaction: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockTransaction = {
      marshalHex: vi.fn().mockReturnValue('txhex'),
      toEIP712Details: vi.fn().mockResolvedValue([
        { name: 'NonceAccount', type: 'address', value: 'nonceAccountPubkey' },
        { name: 'Authority', type: 'address', value: 'walletPubkey' },
      ]),
    };

    mockWallet = {
      address: 'walletPubkey',
    } as unknown as SolanaWallet;

    mockChain = {
      TransactionBuilder: {
        getDurableNonceAddress: vi.fn().mockResolvedValue('nonceAccountPubkey'),
        buildCreateNonceAccountTransaction: vi.fn().mockResolvedValue({
          transaction: mockTransaction,
        }),
      } as unknown as SolanaTransactionBuilder,
    } as unknown as Chain;
  });

  describe('buildDurableNonceTransaction', () => {
    it('should build create nonce account transaction', async () => {
      const result = await buildDurableNonceTransaction({
        wallet: mockWallet,
        chain: mockChain,
      });

      expect(mockChain.TransactionBuilder.buildCreateNonceAccountTransaction).toHaveBeenCalledWith({
        from: mockWallet,
      });
      expect(result.marshalledHex).toBe('txhex');
    });

    it('should return details from toEIP712Details', async () => {
      const result = await buildDurableNonceTransaction({
        wallet: mockWallet,
        chain: mockChain,
      });

      expect(result.details).toHaveLength(2);
      expect(result.details[0]).toEqual({
        name: 'NonceAccount',
        type: 'address',
        value: 'nonceAccountPubkey',
      });
    });

    it('should throw error when transaction build fails', async () => {
      vi.mocked(mockChain.TransactionBuilder.buildCreateNonceAccountTransaction).mockRejectedValue(
        new Error('insufficient balance for nonce account creation')
      );

      await expect(
        buildDurableNonceTransaction({
          wallet: mockWallet,
          chain: mockChain,
        })
      ).rejects.toThrow();
    });

    it('should throw error when no transaction returned', async () => {
      vi.mocked(mockChain.TransactionBuilder.buildCreateNonceAccountTransaction).mockResolvedValue(
        null
      );

      await expect(
        buildDurableNonceTransaction({
          wallet: mockWallet,
          chain: mockChain,
        })
      ).rejects.toThrow('Failed to build transaction');
    });

    it('should throw error when marshalling fails', async () => {
      mockTransaction.marshalHex.mockReturnValue(Promise.reject(new Error('marshal error')));

      await expect(
        buildDurableNonceTransaction({
          wallet: mockWallet,
          chain: mockChain,
        })
      ).rejects.toThrow('Error marshalling transaction');
    });
  });

  describe('getDurableNonceAccount', () => {
    it('should return nonce account info when initialized', async () => {
      vi.mocked(DurableNonce.isNonceAccountInitialized).mockResolvedValue(true);
      vi.mocked(DurableNonce.fetchNonceAccountInfo).mockResolvedValue({
        nonce: 'currentNonce',
        authority: 'authorityPubkey',
      } as any);

      const result = await getDurableNonceAccount({
        wallet: mockWallet,
        chain: mockChain,
      });

      expect(result.nonceAccount).toBe('nonceAccountPubkey');
      expect(result.nonce).toBe('currentNonce');
      expect(result.authority).toBe('authorityPubkey');
    });

    it('should throw NotFoundError when nonce account address not found', async () => {
      vi.mocked(mockChain.TransactionBuilder.getDurableNonceAddress).mockResolvedValue(null);

      await expect(
        getDurableNonceAccount({
          wallet: mockWallet,
          chain: mockChain,
        })
      ).rejects.toThrow('Durable nonce account address not found');
    });

    it('should throw NotFoundError when nonce account not initialized', async () => {
      vi.mocked(DurableNonce.isNonceAccountInitialized).mockResolvedValue(false);

      await expect(
        getDurableNonceAccount({
          wallet: mockWallet,
          chain: mockChain,
        })
      ).rejects.toThrow('Durable nonce account address not found');
    });

    it('should throw error when getDurableNonceAddress fails', async () => {
      vi.mocked(mockChain.TransactionBuilder.getDurableNonceAddress).mockRejectedValue(
        new Error('RPC error')
      );

      await expect(
        getDurableNonceAccount({
          wallet: mockWallet,
          chain: mockChain,
        })
      ).rejects.toThrow();
    });

    it('should throw error when fetchNonceAccountInfo fails', async () => {
      vi.mocked(DurableNonce.isNonceAccountInitialized).mockResolvedValue(true);
      vi.mocked(DurableNonce.fetchNonceAccountInfo).mockRejectedValue(
        new Error('Failed to fetch nonce info')
      );

      await expect(
        getDurableNonceAccount({
          wallet: mockWallet,
          chain: mockChain,
        })
      ).rejects.toThrow('Error fetching nonce account info');
    });
  });
});
