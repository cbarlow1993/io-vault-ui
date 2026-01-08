import type { ChainAlias, TronChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { TVMTranslateTransaction, TVMTranslateTransfer } from '@noves/noves-sdk';
import type { TVMTransactionSchema } from '@/src/handlers/transactions/list-transactions/tvm/list-transactions-tvm.schema.js';
import { mapToken } from '@/src/services/transactions/noves.js';

export const mapNovesUTXOTransactionTransfersToTransfers = (
  transfers: TVMTranslateTransfer[]
): TVMTransactionSchema['transfers'] => {
  return transfers?.map((transfer) => ({
    action: transfer.action,
    from: transfer.from,
    to: transfer.to,
    amount: transfer.amount,
    token: mapToken(transfer.token),
  }));
};

export const mapNovesTvmTransactionToTransactionResponse = ({
  novesTransaction,
  chain,
  accountAddress,
}: {
  novesTransaction: TVMTranslateTransaction;
  chain: ChainAlias;
  accountAddress: string;
}): TVMTransactionSchema => {
  return {
    chain: chain as TronChainAlias,
    accountAddress,
    classificationData: novesTransaction.classificationData,
    transfers: [
      ...(mapNovesUTXOTransactionTransfersToTransfers(novesTransaction.classificationData.sent) ??
        []),
      ...(mapNovesUTXOTransactionTransfersToTransfers(
        novesTransaction.classificationData.received
      ) ?? []),
    ],
    rawTransactionData: novesTransaction.rawTransactionData,
  };
};
