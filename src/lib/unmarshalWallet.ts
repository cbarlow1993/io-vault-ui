import { type IWalletLike, Wallet } from '@iofinnet/io-core-dapp-utils-chains-sdk';

export const unmarshalWallet = async (marshalledHex: string): Promise<IWalletLike> => {
  const data = JSON.parse(Buffer.from(marshalledHex, 'hex').toString('utf-8'));

  if ('from' in data && data.from) {
    return await Wallet.unmarshalHex(data.from);
  }

  throw new Error('No from wallet found in marshalled hex');
};
