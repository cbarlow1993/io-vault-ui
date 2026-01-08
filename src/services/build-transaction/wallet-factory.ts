import { NotFoundError } from '@iofinnet/errors-sdk';
import { Chain, type ChainAlias, type IWalletLike } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { VaultService } from '@/src/services/vaults/vault-service.js';
import type { WalletFactoryResult } from './types.js';

export class WalletFactory {
  constructor(private vaultService: VaultService) {}

  async createWallet<T extends IWalletLike>(
    vaultId: string,
    chainAlias: ChainAlias,
    derivationPath?: string
  ): Promise<WalletFactoryResult<T>> {
    // Get full vault with curves (matches original getWalletAndVault pattern)
    const vault = await this.vaultService.getVaultCurves(vaultId);

    if (!vault) {
      throw new NotFoundError('Vault not found');
    }

    const chain = await Chain.fromAlias(chainAlias);

    // Load wallet from vault curves (original pattern)
    const wallet = chain.loadWallet(vault);

    // Derive HD wallet only if derivation path is provided
    const derivedWallet = derivationPath
      ? wallet.deriveHDWallet({ derivationPath })
      : wallet;

    return { wallet: derivedWallet as unknown as T, chain };
  }
}
