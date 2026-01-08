import type { ChainAlias, SvmChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { SVMTranslateTransactionV5 } from '@noves/noves-sdk';
import type { SVMTransactionSchema } from '@/src/handlers/transactions/list-transactions/svm/list-transactions-svm.schema.js';
import { mapToken } from '@/src/services/transactions/noves.js';

export const mapNovesSVMTransactionToTransactionResponse = ({
  novesTransaction,
  chain,
  accountAddress,
}: {
  novesTransaction: SVMTranslateTransactionV5;
  chain: ChainAlias;
  accountAddress: string;
}): SVMTransactionSchema => {
  return {
    chain: chain as SvmChainAlias,
    accountAddress,
    timestamp: novesTransaction.timestamp,
    classificationData: novesTransaction.classificationData,
    transfers: novesTransaction.transfers?.map((t) => ({
      ...t,
      token: mapToken(t.token),
    })) as SVMTransactionSchema['transfers'],
    rawTransactionData: novesTransaction.rawTransactionData,
  };
};
