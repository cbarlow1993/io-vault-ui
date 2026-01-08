import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { getRpcUrl } from '@/src/lib/chains.js';

export const iofinnetRpcUrl = ({ chain }: { chain: string }) => {
  return getRpcUrl(chain as ChainAlias);
};
