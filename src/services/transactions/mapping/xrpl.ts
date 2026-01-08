import { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { XRPLTranslateTransaction } from '@noves/noves-sdk';
import type { XrpTransactionSchema } from '@/src/handlers/transactions/list-transactions/xrp/list-transaction-xrp.schema.js';

export const mapNovesXRPTransactionToTransactionResponse = (
  transaction: XRPLTranslateTransaction
): XrpTransactionSchema => {
  return {
    chain: ChainAlias.XRP,
    accountAddress: transaction.accountAddress,
    classificationData: {
      type: transaction.classificationData.type,
      description: transaction.classificationData.description,
    },
    transfers: transaction.transfers,
    rawTransactionData: mapNovesXRPRawTransactionData(transaction),
  };
};

const mapNovesXRPRawTransactionData = (
  transaction: XRPLTranslateTransaction
): XrpTransactionSchema['rawTransactionData'] => {
  const XRP_SYMBOL = 'XRP';
  return {
    transactionHash: transaction.rawTransactionData.signature,
    blockNumber: transaction.rawTransactionData.ledger_index,
    transactionFee: {
      amount: transaction.rawTransactionData.fee,
      token: {
        name: XRP_SYMBOL,
        symbol: XRP_SYMBOL,
        decimals: 6,
        address: XRP_SYMBOL,
      },
    },
    timestamp: transaction.timestamp,
  };
};
