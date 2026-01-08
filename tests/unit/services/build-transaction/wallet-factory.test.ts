import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Chain } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { WalletFactory } from '@/src/services/build-transaction/wallet-factory.js';
import type { VaultService } from '@/src/services/vaults/vault-service.js';

vi.mock('@iofinnet/io-core-dapp-utils-chains-sdk', () => ({
  Chain: {
    fromAlias: vi.fn(),
  },
}));

describe('WalletFactory', () => {
  let walletFactory: WalletFactory;
  let mockVaultService: VaultService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockVaultService = {
      getVaultCurves: vi.fn(),
    } as unknown as VaultService;
    walletFactory = new WalletFactory(mockVaultService);
  });

  describe('createWallet', () => {
    it('should create wallet from vault curves', async () => {
      const mockVault = {
        vaultId: 'vault-123',
        curves: [{ curve: 'secp256k1', xpub: 'xpub661MyMwAqRbctest' }],
      };
      const mockWallet = { address: '0x123' };
      const mockChain = {
        Config: { ecosystem: 'evm' },
        loadWallet: vi.fn().mockReturnValue(mockWallet),
      };

      vi.mocked(mockVaultService.getVaultCurves).mockResolvedValue(mockVault);
      vi.mocked(Chain.fromAlias).mockResolvedValue(mockChain as any);

      const result = await walletFactory.createWallet('vault-123', 'ethereum' as any);

      expect(mockVaultService.getVaultCurves).toHaveBeenCalledWith('vault-123');
      expect(Chain.fromAlias).toHaveBeenCalledWith('ethereum');
      expect(mockChain.loadWallet).toHaveBeenCalledWith(mockVault);
      expect(result).toEqual({ wallet: mockWallet, chain: mockChain });
    });

    it('should derive HD wallet when derivation path is provided', async () => {
      const mockVault = {
        vaultId: 'vault-123',
        curves: [{ curve: 'secp256k1', xpub: 'xpub661MyMwAqRbctest' }],
      };
      const derivationPath = 'm/44/60/0/0/1';
      const mockDerivedWallet = { address: '0x456', derivationPath };
      const mockBaseWallet = {
        address: '0x123',
        deriveHDWallet: vi.fn().mockReturnValue(mockDerivedWallet),
      };
      const mockChain = {
        Config: { ecosystem: 'evm' },
        loadWallet: vi.fn().mockReturnValue(mockBaseWallet),
      };

      vi.mocked(mockVaultService.getVaultCurves).mockResolvedValue(mockVault);
      vi.mocked(Chain.fromAlias).mockResolvedValue(mockChain as any);

      const result = await walletFactory.createWallet('vault-123', 'ethereum' as any, derivationPath);

      expect(mockChain.loadWallet).toHaveBeenCalledWith(mockVault);
      expect(mockBaseWallet.deriveHDWallet).toHaveBeenCalledWith({ derivationPath });
      expect(result).toEqual({ wallet: mockDerivedWallet, chain: mockChain });
    });

    it('should not derive HD wallet when derivation path is not provided', async () => {
      const mockVault = {
        vaultId: 'vault-123',
        curves: [{ curve: 'secp256k1', xpub: 'xpub661MyMwAqRbctest' }],
      };
      const mockBaseWallet = {
        address: '0x123',
        deriveHDWallet: vi.fn(),
      };
      const mockChain = {
        Config: { ecosystem: 'evm' },
        loadWallet: vi.fn().mockReturnValue(mockBaseWallet),
      };

      vi.mocked(mockVaultService.getVaultCurves).mockResolvedValue(mockVault);
      vi.mocked(Chain.fromAlias).mockResolvedValue(mockChain as any);

      await walletFactory.createWallet('vault-123', 'ethereum' as any);

      expect(mockBaseWallet.deriveHDWallet).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when vault not found', async () => {
      vi.mocked(mockVaultService.getVaultCurves).mockResolvedValue(null);

      await expect(walletFactory.createWallet('vault-123', 'ethereum' as any))
        .rejects.toThrow('Vault not found');
    });
  });
});
