import type { ChainAlias, EvmChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { EVMTranslateTransactionV5 } from '@noves/noves-sdk';
import { encode, verify } from 'eip55';
import type { EVMTransactionSchema } from '@/src/handlers/transactions/list-transactions/evm/list-transactions-evm.schema.js';
import { mapToken } from '@/src/services/transactions/noves.js';

export const mapNovesEVMTransactionToTransactionResponse = ({
  novesTransaction,
  chain,
  accountAddress,
}: {
  novesTransaction: EVMTranslateTransactionV5;
  chain: ChainAlias;
  accountAddress: string;
}): EVMTransactionSchema => {
  return {
    chain: chain as EvmChainAlias,
    accountAddress: verify(accountAddress) ? accountAddress : encode(accountAddress),
    classificationData: novesTransaction.classificationData,
    transfers: novesTransaction.transfers?.map((t) => {
      return {
        ...t,
        token: mapToken(t.token),
      };
    }),
    rawTransactionData: novesTransaction.rawTransactionData,
  };
};
