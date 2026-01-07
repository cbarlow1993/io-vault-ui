import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserInputError } from '@iofinnet/errors-sdk';
import type { Chain, IWalletLike } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import {
  EvmChainAliases,
  SvmChainAliases,
  UtxoChainAliases,
  TronChainAliases,
  XrpChainAliases,
  SubstrateChainAliases,
} from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { WalletFactory } from '@/src/services/build-transaction/wallet-factory.js';
import type { BuildTransactionResult } from '@/src/services/build-transaction/types.js';

// Mock all builder modules
vi.mock('@/src/services/build-transaction/builders/evm.js', () => ({
  buildEvmNativeTransaction: vi.fn(),
  buildEvmTokenTransaction: vi.fn(),
}));

vi.mock('@/src/services/build-transaction/builders/svm.js', () => ({
  buildSvmNativeTransaction: vi.fn(),
  buildSvmTokenTransaction: vi.fn(),
}));

vi.mock('@/src/services/build-transaction/builders/utxo.js', () => ({
  buildUtxoNativeTransaction: vi.fn(),
}));

vi.mock('@/src/services/build-transaction/builders/tvm.js', () => ({
  buildTvmNativeTransaction: vi.fn(),
  buildTvmTokenTransaction: vi.fn(),
}));

vi.mock('@/src/services/build-transaction/builders/xrp.js', () => ({
  buildXrpNativeTransaction: vi.fn(),
}));

vi.mock('@/src/services/build-transaction/builders/substrate.js', () => ({
  buildSubstrateNativeTransaction: vi.fn(),
}));

// Import after mocks
import { routeNativeTransaction, routeTokenTransaction } from '@/src/services/build-transaction/index.js';
import { buildEvmNativeTransaction, buildEvmTokenTransaction } from '@/src/services/build-transaction/builders/evm.js';
import { buildSvmNativeTransaction, buildSvmTokenTransaction } from '@/src/services/build-transaction/builders/svm.js';
import { buildUtxoNativeTransaction } from '@/src/services/build-transaction/builders/utxo.js';
import { buildTvmNativeTransaction, buildTvmTokenTransaction } from '@/src/services/build-transaction/builders/tvm.js';
import { buildXrpNativeTransaction } from '@/src/services/build-transaction/builders/xrp.js';
import { buildSubstrateNativeTransaction } from '@/src/services/build-transaction/builders/substrate.js';

describe('Transaction Router', () => {
  let mockWalletFactory: WalletFactory;
  let mockWallet: IWalletLike;
  let mockChain: Chain;
  const mockResult: BuildTransactionResult = {
    marshalledHex: '0xabcd1234',
    details: [{ name: 'To', type: 'address', value: '0xrecipient' }],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockWallet = { address: '0xsender' } as unknown as IWalletLike;
    mockChain = { Alias: 'ethereum' } as unknown as Chain;

    mockWalletFactory = {
      createWallet: vi.fn().mockResolvedValue({ wallet: mockWallet, chain: mockChain }),
    } as unknown as WalletFactory;

    // Set up default mock implementations
    vi.mocked(buildEvmNativeTransaction).mockResolvedValue(mockResult);
    vi.mocked(buildEvmTokenTransaction).mockResolvedValue(mockResult);
    vi.mocked(buildSvmNativeTransaction).mockResolvedValue(mockResult);
    vi.mocked(buildSvmTokenTransaction).mockResolvedValue(mockResult);
    vi.mocked(buildUtxoNativeTransaction).mockResolvedValue(mockResult);
    vi.mocked(buildTvmNativeTransaction).mockResolvedValue(mockResult);
    vi.mocked(buildTvmTokenTransaction).mockResolvedValue(mockResult);
    vi.mocked(buildXrpNativeTransaction).mockResolvedValue(mockResult);
    vi.mocked(buildSubstrateNativeTransaction).mockResolvedValue(mockResult);
  });

  describe('routeNativeTransaction', () => {
    const baseParams = {
      vaultId: 'vault-123',
      amount: '1.0',
      to: '0xrecipient',
    };

    describe('EVM chains', () => {
      it('should route eth to EVM builder', async () => {
        const result = await routeNativeTransaction('evm', EvmChainAliases.ETH, baseParams, mockWalletFactory);

        expect(mockWalletFactory.createWallet).toHaveBeenCalledWith('vault-123', EvmChainAliases.ETH, undefined);
        expect(buildEvmNativeTransaction).toHaveBeenCalledWith(
          expect.objectContaining({
            wallet: mockWallet,
            chain: mockChain,
            amount: '1.0',
            to: '0xrecipient',
          })
        );
        expect(result).toEqual(mockResult);
      });

      it('should route polygon to EVM builder', async () => {
        await routeNativeTransaction('evm', EvmChainAliases.POLYGON, baseParams, mockWalletFactory);

        expect(mockWalletFactory.createWallet).toHaveBeenCalledWith('vault-123', EvmChainAliases.POLYGON, undefined);
        expect(buildEvmNativeTransaction).toHaveBeenCalled();
      });

      it('should route base to EVM builder', async () => {
        await routeNativeTransaction('evm', EvmChainAliases.BASE, baseParams, mockWalletFactory);

        expect(mockWalletFactory.createWallet).toHaveBeenCalledWith('vault-123', EvmChainAliases.BASE, undefined);
        expect(buildEvmNativeTransaction).toHaveBeenCalled();
      });

      it('should pass derivation path to wallet factory', async () => {
        const paramsWithPath = { ...baseParams, derivationPath: 'm/44/60/0/0/1' };

        await routeNativeTransaction('evm', EvmChainAliases.ETH, paramsWithPath, mockWalletFactory);

        expect(mockWalletFactory.createWallet).toHaveBeenCalledWith('vault-123', EvmChainAliases.ETH, 'm/44/60/0/0/1');
      });

      it('should pass EVM-specific parameters to builder', async () => {
        const evmParams = {
          ...baseParams,
          gasPrice: '20',
          gasLimit: '21000',
          nonce: 5,
          maxFeePerGas: '100',
          maxPriorityFeePerGas: '2',
          type: 2,
          data: '0x1234',
        };

        await routeNativeTransaction('evm', EvmChainAliases.ETH, evmParams, mockWalletFactory);

        expect(buildEvmNativeTransaction).toHaveBeenCalledWith(
          expect.objectContaining({
            gasPrice: '20',
            gasLimit: '21000',
            nonce: 5,
            maxFeePerGas: '100',
            maxPriorityFeePerGas: '2',
            type: 2,
            data: '0x1234',
          })
        );
      });
    });

    describe('SVM chains', () => {
      it('should route solana to SVM builder', async () => {
        const result = await routeNativeTransaction('svm', SvmChainAliases.SOLANA, baseParams, mockWalletFactory);

        expect(mockWalletFactory.createWallet).toHaveBeenCalledWith('vault-123', SvmChainAliases.SOLANA, undefined);
        expect(buildSvmNativeTransaction).toHaveBeenCalledWith(
          expect.objectContaining({
            wallet: mockWallet,
            chain: mockChain,
            amount: '1.0',
            to: '0xrecipient',
          })
        );
        expect(result).toEqual(mockResult);
      });

      it('should pass SVM-specific parameters to builder', async () => {
        const svmParams = { ...baseParams, nonceAccount: 'nonce123' };

        await routeNativeTransaction('svm', SvmChainAliases.SOLANA, svmParams, mockWalletFactory);

        expect(buildSvmNativeTransaction).toHaveBeenCalledWith(
          expect.objectContaining({
            nonceAccount: 'nonce123',
          })
        );
      });
    });

    describe('UTXO chains', () => {
      it('should route bitcoin to UTXO builder', async () => {
        const result = await routeNativeTransaction('utxo', UtxoChainAliases.BITCOIN, baseParams, mockWalletFactory);

        expect(mockWalletFactory.createWallet).toHaveBeenCalledWith('vault-123', UtxoChainAliases.BITCOIN, undefined);
        expect(buildUtxoNativeTransaction).toHaveBeenCalledWith(
          expect.objectContaining({
            wallet: mockWallet,
            chain: mockChain,
            amount: '1.0',
            to: '0xrecipient',
          })
        );
        expect(result).toEqual(mockResult);
      });

      it('should route mnee to UTXO builder', async () => {
        await routeNativeTransaction('utxo', UtxoChainAliases.MNEE, baseParams, mockWalletFactory);

        expect(mockWalletFactory.createWallet).toHaveBeenCalledWith('vault-123', UtxoChainAliases.MNEE, undefined);
        expect(buildUtxoNativeTransaction).toHaveBeenCalled();
      });

      it('should pass UTXO-specific parameters to builder', async () => {
        const utxoParams = {
          ...baseParams,
          feeRate: '10',
          utxos: [{ txid: 'abc', vout: 0, value: 100000 }],
        };

        await routeNativeTransaction('utxo', UtxoChainAliases.BITCOIN, utxoParams, mockWalletFactory);

        expect(buildUtxoNativeTransaction).toHaveBeenCalledWith(
          expect.objectContaining({
            feeRate: '10',
            utxos: [{ txid: 'abc', vout: 0, value: 100000 }],
          })
        );
      });
    });

    describe('TVM chains', () => {
      it('should route tron to TVM builder', async () => {
        const result = await routeNativeTransaction('tvm', TronChainAliases.TRON, baseParams, mockWalletFactory);

        expect(mockWalletFactory.createWallet).toHaveBeenCalledWith('vault-123', TronChainAliases.TRON, undefined);
        expect(buildTvmNativeTransaction).toHaveBeenCalledWith(
          expect.objectContaining({
            wallet: mockWallet,
            chain: mockChain,
            amount: '1.0',
            to: '0xrecipient',
          })
        );
        expect(result).toEqual(mockResult);
      });
    });

    describe('XRP chains', () => {
      it('should route ripple to XRP builder', async () => {
        const result = await routeNativeTransaction('xrp', XrpChainAliases.XRP, baseParams, mockWalletFactory);

        expect(mockWalletFactory.createWallet).toHaveBeenCalledWith('vault-123', XrpChainAliases.XRP, undefined);
        expect(buildXrpNativeTransaction).toHaveBeenCalledWith(
          expect.objectContaining({
            wallet: mockWallet,
            chain: mockChain,
            amount: '1.0',
            to: '0xrecipient',
          })
        );
        expect(result).toEqual(mockResult);
      });

      it('should pass XRP-specific parameters to builder', async () => {
        const xrpParams = { ...baseParams, memo: 'test memo', tag: '12345' };

        await routeNativeTransaction('xrp', XrpChainAliases.XRP, xrpParams, mockWalletFactory);

        expect(buildXrpNativeTransaction).toHaveBeenCalledWith(
          expect.objectContaining({
            memo: 'test memo',
            tag: '12345',
          })
        );
      });
    });

    describe('Substrate chains', () => {
      it('should route bittensor to Substrate builder', async () => {
        const result = await routeNativeTransaction('substrate', SubstrateChainAliases.BITTENSOR, baseParams, mockWalletFactory);

        expect(mockWalletFactory.createWallet).toHaveBeenCalledWith('vault-123', SubstrateChainAliases.BITTENSOR, undefined);
        expect(buildSubstrateNativeTransaction).toHaveBeenCalledWith(
          expect.objectContaining({
            wallet: mockWallet,
            chain: mockChain,
            amount: '1.0',
            to: '0xrecipient',
          })
        );
        expect(result).toEqual(mockResult);
      });
    });

    describe('Error handling', () => {
      it('should throw UserInputError for unsupported ecosystem', async () => {
        await expect(
          routeNativeTransaction('unknown' as any, 'somechain' as any, baseParams, mockWalletFactory)
        ).rejects.toThrow(UserInputError);
      });

      it('should throw UserInputError for unsupported chain in ecosystem', async () => {
        await expect(
          routeNativeTransaction('evm', UtxoChainAliases.BITCOIN as any, baseParams, mockWalletFactory)
        ).rejects.toThrow(UserInputError);
      });

      it('should include ecosystem and chain in error message', async () => {
        await expect(
          routeNativeTransaction('unknown' as any, 'somechain' as any, baseParams, mockWalletFactory)
        ).rejects.toThrow(/unknown.*somechain|somechain.*unknown/i);
      });
    });
  });

  describe('routeTokenTransaction', () => {
    const baseTokenParams = {
      vaultId: 'vault-123',
      amount: '100',
      to: '0xrecipient',
      tokenAddress: '0xtoken',
    };

    describe('EVM chains', () => {
      it('should route eth token transaction to EVM builder', async () => {
        const result = await routeTokenTransaction('evm', EvmChainAliases.ETH, baseTokenParams, mockWalletFactory);

        expect(mockWalletFactory.createWallet).toHaveBeenCalledWith('vault-123', EvmChainAliases.ETH, undefined);
        expect(buildEvmTokenTransaction).toHaveBeenCalledWith(
          expect.objectContaining({
            wallet: mockWallet,
            chain: mockChain,
            amount: '100',
            to: '0xrecipient',
            tokenAddress: '0xtoken',
          })
        );
        expect(result).toEqual(mockResult);
      });

      it('should pass EVM-specific token parameters', async () => {
        const evmTokenParams = {
          ...baseTokenParams,
          gasPrice: '20',
          gasLimit: '60000',
          nonce: 10,
        };

        await routeTokenTransaction('evm', EvmChainAliases.ETH, evmTokenParams, mockWalletFactory);

        expect(buildEvmTokenTransaction).toHaveBeenCalledWith(
          expect.objectContaining({
            gasPrice: '20',
            gasLimit: '60000',
            nonce: 10,
          })
        );
      });
    });

    describe('SVM chains', () => {
      it('should route solana token transaction to SVM builder', async () => {
        const result = await routeTokenTransaction('svm', SvmChainAliases.SOLANA, baseTokenParams, mockWalletFactory);

        expect(mockWalletFactory.createWallet).toHaveBeenCalledWith('vault-123', SvmChainAliases.SOLANA, undefined);
        expect(buildSvmTokenTransaction).toHaveBeenCalledWith(
          expect.objectContaining({
            wallet: mockWallet,
            chain: mockChain,
            amount: '100',
            to: '0xrecipient',
            tokenAddress: '0xtoken',
          })
        );
        expect(result).toEqual(mockResult);
      });

      it('should pass SVM-specific token parameters', async () => {
        const svmTokenParams = {
          ...baseTokenParams,
          decimals: 9,
          nonceAccount: 'nonce123',
        };

        await routeTokenTransaction('svm', SvmChainAliases.SOLANA, svmTokenParams, mockWalletFactory);

        expect(buildSvmTokenTransaction).toHaveBeenCalledWith(
          expect.objectContaining({
            decimals: 9,
            nonceAccount: 'nonce123',
          })
        );
      });
    });

    describe('TVM chains', () => {
      it('should route tron token transaction to TVM builder', async () => {
        const result = await routeTokenTransaction('tvm', TronChainAliases.TRON, baseTokenParams, mockWalletFactory);

        expect(mockWalletFactory.createWallet).toHaveBeenCalledWith('vault-123', TronChainAliases.TRON, undefined);
        expect(buildTvmTokenTransaction).toHaveBeenCalledWith(
          expect.objectContaining({
            wallet: mockWallet,
            chain: mockChain,
            amount: '100',
            to: '0xrecipient',
            tokenAddress: '0xtoken',
          })
        );
        expect(result).toEqual(mockResult);
      });
    });

    describe('Chains that do not support token transactions', () => {
      it('should throw UserInputError for UTXO token transactions', async () => {
        await expect(
          routeTokenTransaction('utxo', UtxoChainAliases.BITCOIN, baseTokenParams, mockWalletFactory)
        ).rejects.toThrow(UserInputError);
      });

      it('should throw UserInputError for XRP token transactions', async () => {
        await expect(
          routeTokenTransaction('xrp', XrpChainAliases.XRP, baseTokenParams, mockWalletFactory)
        ).rejects.toThrow(UserInputError);
      });

      it('should throw UserInputError for Substrate token transactions', async () => {
        await expect(
          routeTokenTransaction('substrate', SubstrateChainAliases.BITTENSOR, baseTokenParams, mockWalletFactory)
        ).rejects.toThrow(UserInputError);
      });

      it('should include message about token transactions not supported', async () => {
        await expect(
          routeTokenTransaction('utxo', UtxoChainAliases.BITCOIN, baseTokenParams, mockWalletFactory)
        ).rejects.toThrow(/token.*not.*support/i);
      });
    });

    describe('Error handling', () => {
      it('should throw UserInputError for unsupported ecosystem', async () => {
        await expect(
          routeTokenTransaction('unknown' as any, 'somechain' as any, baseTokenParams, mockWalletFactory)
        ).rejects.toThrow(UserInputError);
      });

      it('should throw UserInputError for unsupported chain in ecosystem', async () => {
        await expect(
          routeTokenTransaction('evm', UtxoChainAliases.BITCOIN as any, baseTokenParams, mockWalletFactory)
        ).rejects.toThrow(UserInputError);
      });
    });
  });
});
