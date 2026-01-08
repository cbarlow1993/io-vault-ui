import { ServiceUnavailableError } from '@iofinnet/errors-sdk';
import type { ChainAlias, UtxoChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type {
  UTXOTranslateTransactionV2,
  UTXOTranslateTransactionV5,
  UTXOTranslateTransferV2,
} from '@noves/noves-sdk';
import type { UTXOTransactionSchema } from '@/src/handlers/transactions/list-transactions/utxo/list-transactions-utxo.schema.js';
import { mapToken } from '@/src/services/transactions/noves.js';
import { logger } from '@/utils/powertools.js';

export const mapNovesUTXOTransactionTransfersToTransfers = (
  transfers: UTXOTranslateTransferV2[]
): UTXOTransactionSchema['transfers'] => {
  return transfers?.map((transfer) => ({
    action: transfer.action,
    from: transfer.from,
    to: transfer.to,
    amount: transfer.amount,
    token: mapToken(transfer.token),
  }));
};

export const mapNovesUTXOTransactionToTransactionResponse = ({
  novesTransaction,
  chain,
  accountAddress,
}: {
  novesTransaction: UTXOTranslateTransactionV2 | UTXOTranslateTransactionV5;
  chain: ChainAlias;
  accountAddress: string;
}): UTXOTransactionSchema => {
  logger.info('mapping noves transaction to utxo transaction response', {
    novesTransaction,
    chain,
    accountAddress,
  });

  let typedTransaction: UTXOTranslateTransactionV5 | UTXOTranslateTransactionV2 | undefined;
  if (novesTransaction.txTypeVersion === 5) {
    const { type, description } = novesTransaction.classificationData;
    typedTransaction = novesTransaction as UTXOTranslateTransactionV5;
    return {
      chain: chain as UtxoChainAlias,
      accountAddress,
      timestamp: typedTransaction.timestamp,
      classificationData: { type, description },
      transfers: typedTransaction.transfers?.map((t) => {
        return {
          ...t,
          token: mapToken(t.token),
        };
      }),
      rawTransactionData: {
        ...typedTransaction.rawTransactionData,
        timestamp: typedTransaction.timestamp,
      },
    };
  } else if (novesTransaction.txTypeVersion === 2) {
    typedTransaction = novesTransaction as unknown as UTXOTranslateTransactionV2;
    const { type, description } = typedTransaction.classificationData;
    return {
      chain: chain as UtxoChainAlias,
      accountAddress,
      timestamp: typedTransaction.rawTransactionData.timestamp,
      classificationData: { type, description },
      transfers: [
        ...(mapNovesUTXOTransactionTransfersToTransfers(typedTransaction.classificationData.sent) ??
          []),
        ...(mapNovesUTXOTransactionTransfersToTransfers(
          typedTransaction.classificationData.received
        ) ?? []),
      ],
      rawTransactionData: typedTransaction.rawTransactionData,
    };
  } else {
    throw new ServiceUnavailableError('Invalid transaction version');
  }
};
