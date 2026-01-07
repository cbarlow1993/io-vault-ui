import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EvmTransactionBuilder, EvmWallet, Chain } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { buildEvmNativeTransaction, buildEvmTokenTransaction } from '@/src/services/build-transaction/builders/evm.js';

describe('EVM Builder', () => {
  let mockWallet: EvmWallet;
  let mockChain: Chain;
  let mockTransaction: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockTransaction = {
      marshalHex: vi.fn().mockReturnValue('0xabcd1234'),
      toEIP712Details: vi.fn().mockResolvedValue([
        { name: 'To', type: 'address', value: '0xrecipient' },
        { name: 'Value', type: 'uint256', value: '1000000000000000000' },
      ]),
    };

    mockWallet = {
      address: '0xsender',
    } as unknown as EvmWallet;

    mockChain = {
      TransactionBuilder: {
        buildNativeTransaction: vi.fn().mockResolvedValue(mockTransaction),
        buildTokenTransaction: vi.fn().mockResolvedValue(mockTransaction),
      } as unknown as EvmTransactionBuilder,
    } as unknown as Chain;
  });

  describe('buildEvmNativeTransaction', () => {
    it('should build native transaction and return marshalled hex', async () => {
      const result = await buildEvmNativeTransaction({
        wallet: mockWallet,
        chain: mockChain,
        amount: '1',
        to: '0xrecipient',
      });

      expect(mockChain.TransactionBuilder.buildNativeTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '1',
          from: mockWallet,
          to: '0xrecipient',
        })
      );
      expect(result.marshalledHex).toBe('0xabcd1234');
      expect(result.details).toHaveLength(2);
    });

    it('should convert gasPrice from GWEI to WEI', async () => {
      await buildEvmNativeTransaction({
        wallet: mockWallet,
        chain: mockChain,
        amount: '1',
        to: '0xrecipient',
        gasPrice: '0.5',
      });

      expect(mockChain.TransactionBuilder.buildNativeTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          gasPrice: '500000000', // 0.5 GWEI = 500000000 WEI
        })
      );
    });

    it('should pass through optional parameters', async () => {
      await buildEvmNativeTransaction({
        wallet: mockWallet,
        chain: mockChain,
        amount: '1',
        to: '0xrecipient',
        gasLimit: '21000',
        nonce: 5,
        maxFeePerGas: '100000000000',
        maxPriorityFeePerGas: '2000000000',
        type: 2,
        data: '0x1234',
      });

      expect(mockChain.TransactionBuilder.buildNativeTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          gasLimit: '21000',
          nonce: 5,
          maxFeePerGas: '100000000000',
          maxPriorityFeePerGas: '2000000000',
          type: 2,
          data: '0x1234',
        })
      );
    });

    it('should handle integer gasPrice', async () => {
      await buildEvmNativeTransaction({
        wallet: mockWallet,
        chain: mockChain,
        amount: '1',
        to: '0xrecipient',
        gasPrice: '10',
      });

      expect(mockChain.TransactionBuilder.buildNativeTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          gasPrice: '10000000000', // 10 GWEI = 10000000000 WEI
        })
      );
    });

    it('should throw error when transaction build fails', async () => {
      vi.mocked(mockChain.TransactionBuilder.buildNativeTransaction).mockRejectedValue(
        new Error('insufficient balance: account cannot cover transaction')
      );

      await expect(
        buildEvmNativeTransaction({
          wallet: mockWallet,
          chain: mockChain,
          amount: '1',
          to: '0xrecipient',
        })
      ).rejects.toThrow();
    });
  });

  describe('buildEvmTokenTransaction', () => {
    it('should build token transaction with tokenAddress', async () => {
      const result = await buildEvmTokenTransaction({
        wallet: mockWallet,
        chain: mockChain,
        amount: '100',
        to: '0xrecipient',
        tokenAddress: '0xtoken',
      });

      expect(mockChain.TransactionBuilder.buildTokenTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '100',
          from: mockWallet,
          to: '0xrecipient',
          tokenAddress: '0xtoken',
        })
      );
      expect(result.marshalledHex).toBe('0xabcd1234');
    });

    it('should only pass amount, from, to, and tokenAddress to SDK (gas is auto-estimated)', async () => {
      await buildEvmTokenTransaction({
        wallet: mockWallet,
        chain: mockChain,
        amount: '100',
        to: '0xrecipient',
        tokenAddress: '0xtoken',
        gasPrice: '20', // This should be ignored for token transactions
      });

      // The SDK's buildTokenTransaction only accepts amount, from, to, and tokenAddress
      // Gas parameters are estimated automatically by the SDK
      expect(mockChain.TransactionBuilder.buildTokenTransaction).toHaveBeenCalledWith({
        amount: '100',
        from: mockWallet,
        to: '0xrecipient',
        tokenAddress: '0xtoken',
      });
    });

    it('should throw error when token transaction build fails', async () => {
      vi.mocked(mockChain.TransactionBuilder.buildTokenTransaction).mockRejectedValue(
        new Error('execution reverted with reason: erc20: transfer amount exceeds balance')
      );

      await expect(
        buildEvmTokenTransaction({
          wallet: mockWallet,
          chain: mockChain,
          amount: '100',
          to: '0xrecipient',
          tokenAddress: '0xtoken',
        })
      ).rejects.toThrow();
    });
  });
});
