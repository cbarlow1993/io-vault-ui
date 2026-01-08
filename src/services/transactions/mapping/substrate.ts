import type { ChainAlias, SubstrateChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { POLKADOTTranslateTransaction } from '@noves/noves-sdk';
import type { SubstrateTransactionSchema } from '@/src/handlers/transactions/list-transactions/substrate/list-transactions-substrate.schema.js';

export const mapNovesSubstrateTransactionToTransactionResponse = ({
  novesTransaction,
  chain,
  accountAddress,
}: {
  novesTransaction: POLKADOTTranslateTransaction;
  chain: ChainAlias;
  accountAddress: string;
}): SubstrateTransactionSchema => {
  return {
    chain: chain as SubstrateChainAlias,
    accountAddress,
    classificationData: novesTransaction.classificationData,
    transfers: novesTransaction.transfers,
    rawTransactionData: novesTransaction.rawTransactionData,
  };
};
