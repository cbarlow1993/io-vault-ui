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
    const xpub = await this.vaultService.getVaultXpub(vaultId, chainAlias);

    if (!xpub) {
      throw new NotFoundError('Vault xpub not found');
    }

    const chain = await Chain.fromAlias(chainAlias);
    const wallet = await chain.loadHDWallet(xpub, derivationPath ?? '');

    return { wallet: wallet as T, chain };
  }
}
