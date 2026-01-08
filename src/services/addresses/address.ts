import { NotFoundError } from '@iofinnet/errors-sdk';
import { Chain, type ChainAlias, type Vault } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { z, ZodError } from 'zod';

export namespace Address {
  export const validateAgainstVault = async ({
    chainAlias,
    address,
    derivationPath,
    vaultId,
    getVaultCurves,
  }: {
    chainAlias: ChainAlias;
    address: string;
    derivationPath?: string | null;
    vaultId: string;
    getVaultCurves: (vaultId: string) => Promise<Vault | null>;
  }) => {
    const chain = await Chain.fromAlias(chainAlias);

    const generatedAddress = await generate({
      derivationPath,
      vaultId,
      chainAlias,
      getVaultCurves,
    });


    if (!chain.Utils.isAddressValid(address)) {
      throw new ZodError([
        {
          code: z.ZodIssueCode.custom,
          message: 'Invalid address',
          path: ['body', 'address'],
        },
      ]);
    }
    if (generatedAddress !== address) {
      throw new NotFoundError(`Address ${address} not found for vault ${vaultId}`);
    }
  };

  export const generate = async ({
    chainAlias,
    derivationPath,
    vaultId,
    getVaultCurves,
  }: {
    chainAlias: ChainAlias;
    derivationPath?: string | null;
    vaultId: string;
    getVaultCurves: (vaultId: string) => Promise<Vault | null>;
  }) => {
    const chain = await Chain.fromAlias(chainAlias);

    const vault = await getVaultCurves(vaultId);
    if (!vault) {
      throw new NotFoundError(`Vault not found for id ${vaultId}`);
    }

    const wallet = chain.loadWallet(vault);

    return derivationPath
      ? wallet.deriveHDWallet({ derivationPath }).getAddress()
      : wallet.getAddress();
  };
}
