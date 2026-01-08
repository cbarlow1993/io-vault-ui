import { config } from '@/src/lib/config.js';

export const iofinnetRpcUrl = ({ chain }: { chain: string }) => {
  return `${config.apis.iofinnetNodes.rpcUrl}/${chain}`;
};
