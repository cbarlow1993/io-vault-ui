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
      getVaultXpub: vi.fn(),
    } as unknown as VaultService;
    walletFactory = new WalletFactory(mockVaultService);
  });

  describe('createWallet', () => {
    it('should create wallet from vault xpub', async () => {
      const mockXpub = 'xpub661MyMwAqRbctest';
      const mockWallet = { address: '0x123' };
      const mockChain = {
        Config: { ecosystem: 'evm' },
        loadHDWallet: vi.fn().mockResolvedValue(mockWallet),
      };

      vi.mocked(mockVaultService.getVaultXpub).mockResolvedValue(mockXpub);
      vi.mocked(Chain.fromAlias).mockResolvedValue(mockChain as any);

      const result = await walletFactory.createWallet('vault-123', 'ethereum' as any);

      expect(mockVaultService.getVaultXpub).toHaveBeenCalledWith('vault-123', 'ethereum');
      expect(Chain.fromAlias).toHaveBeenCalledWith('ethereum');
      expect(mockChain.loadHDWallet).toHaveBeenCalledWith(mockXpub, '');
      expect(result).toEqual({ wallet: mockWallet, chain: mockChain });
    });

    it('should pass derivation path to chain.loadHDWallet', async () => {
      const mockXpub = 'xpub661MyMwAqRbctest';
      const mockWallet = { address: '0x123' };
      const derivationPath = 'm/44/60/0/0/1';
      const mockChain = {
        Config: { ecosystem: 'evm' },
        loadHDWallet: vi.fn().mockResolvedValue(mockWallet),
      };

      vi.mocked(mockVaultService.getVaultXpub).mockResolvedValue(mockXpub);
      vi.mocked(Chain.fromAlias).mockResolvedValue(mockChain as any);

      await walletFactory.createWallet('vault-123', 'ethereum' as any, derivationPath);

      expect(mockChain.loadHDWallet).toHaveBeenCalledWith(mockXpub, derivationPath);
    });

    it('should throw NotFoundError when vault xpub not found', async () => {
      vi.mocked(mockVaultService.getVaultXpub).mockResolvedValue(null);

      await expect(walletFactory.createWallet('vault-123', 'ethereum' as any))
        .rejects.toThrow('Vault xpub not found');
    });
  });
});
