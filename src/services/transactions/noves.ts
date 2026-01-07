import { NotFoundError } from '@iofinnet/errors-sdk';
import {
  type ChainAlias,
  EcoSystem,
  type UTXOTransactionResponse,
  type XrpTransactionResponse,
} from '@iofinnet/io-core-dapp-utils-chains-sdk';
import {
  type EVMTranslateTransactionV5,
  type PageOptions,
  type POLKADOTTranslateTransaction,
  type SVMTranslateTransactionV5,
  TransactionsPage,
  type TVMTranslateTransaction,
  type UTXOTranslateTransactionV2,
  type UTXOTranslateTransactionV5,
  type XRPLTranslateTransaction,
} from '@noves/noves-sdk';
import type { UTXOTransactionSchema } from '@/src/handlers/transactions/list-transactions/utxo/list-transactions-utxo.schema.js';
import type { XrpTransactionSchema } from '@/src/handlers/transactions/list-transactions/xrp/list-transaction-xrp.schema.js';
import { mapChainAliasToNovesChain } from '@/src/config/chain-mappings/index.js';
import { withPerformanceMonitoring } from '@/src/lib/performance-monitoring.js';
import { mapNovesEVMTransactionToTransactionResponse } from '@/src/services/transactions/mapping/evm.js';
import { mapNovesSubstrateTransactionToTransactionResponse } from '@/src/services/transactions/mapping/substrate.js';
import { mapNovesSVMTransactionToTransactionResponse } from '@/src/services/transactions/mapping/svm.js';
import { mapNovesTvmTransactionToTransactionResponse } from '@/src/services/transactions/mapping/tvm.js';
import { mapNovesUTXOTransactionToTransactionResponse } from '@/src/services/transactions/mapping/utxo.js';
import { mapNovesXRPTransactionToTransactionResponse } from '@/src/services/transactions/mapping/xrpl.js';
import type { Transactions } from '@/src/types/transaction.js';
import {
  NovesEVMClient,
  NovesPOLKADOTClient,
  NovesSVMClient,
  NovesTVMClient,
  NovesUTXOClient,
  NovesXRPClient,
} from '@/src/lib/clients.js';

const DEFAULT_PAGE_SIZE = 15;

export type PaginatedTransactions<T> = {
  data: T[];
  pagination: {
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    previousCursor: string | null;
    nextCursor: string | null;
  };
};

type ListTransactionFetcher = (
  chain: ChainAlias,
  address: string,
  queryParams: PageOptions & { cursorKey?: string; includeV5?: boolean; authToken?: string }
) => Promise<PaginatedTransactions<Transactions.TransactionResponse>>;

type GetTransactionFetcher = (
  chain: ChainAlias,
  hash: string,
  accountAddress: string
) => Promise<Transactions.TransactionResponse>;

export const getTransactionFetcher: Record<EcoSystem, GetTransactionFetcher> = {
  [EcoSystem.EVM]: async (chain, hash, accountAddress) => {
    const novesChain = mapChainAliasToNovesChain(chain);
    const novesTransaction = (await withPerformanceMonitoring(
      () => NovesEVMClient.getTransaction(novesChain, hash, 5, accountAddress),
      {
        endpoint: 'NovesEVM.getTransaction',
        requestParams: { chain, hash, accountAddress },
      }
    )) as EVMTranslateTransactionV5;
    return mapNovesEVMTransactionToTransactionResponse({
      novesTransaction,
      chain,
      accountAddress,
    });
  },
  [EcoSystem.SVM]: async (chain, hash, accountAddress) => {
    const novesTransaction = (await withPerformanceMonitoring(
      () => NovesSVMClient.getTransaction(chain, hash, 5),
      {
        endpoint: 'NovesSVM.getTransaction',
        requestParams: { chain, hash, accountAddress },
      },
      28000
    )) as SVMTranslateTransactionV5;
    return mapNovesSVMTransactionToTransactionResponse({
      novesTransaction,
      chain,
      accountAddress,
    });
  },
  [EcoSystem.UTXO]: async (chain, hash, accountAddress) => {
    const novesChain = mapChainAliasToNovesChain(chain);
    const novesTransaction = (await withPerformanceMonitoring(
      () => NovesUTXOClient.getTransaction(novesChain, hash, 5, accountAddress),
      {
        endpoint: 'NovesUTXO.getTransaction',
        requestParams: { chain, hash, accountAddress },
      }
    )) as UTXOTranslateTransactionV5;
    return mapNovesUTXOTransactionToTransactionResponse({
      novesTransaction,
      chain,
      accountAddress,
    });
  },
  [EcoSystem.TVM]: async (chain, hash, accountAddress) => {
    const novesChain = mapChainAliasToNovesChain(chain);
    const novesTransaction = (await withPerformanceMonitoring(
      () => NovesTVMClient.getTransaction(novesChain, hash, 'v2'),
      {
        endpoint: 'NovesTVM.getTransaction',
        requestParams: { chain, hash, accountAddress },
      }
    )) as TVMTranslateTransaction;
    return mapNovesTvmTransactionToTransactionResponse({
      novesTransaction,
      chain,
      accountAddress,
    });
  },
  [EcoSystem.COSMOS]: async (_chain, _hash, _accountAddress) => {
    throw new NotFoundError('Cosmos transactions are not supported');
  },
  [EcoSystem.XRP]: async (chain, hash, accountAddress) => {
    const novesChain = mapChainAliasToNovesChain(chain);
    const transaction = await withPerformanceMonitoring(
      () => NovesXRPClient.getTransaction(novesChain, hash, accountAddress),
      {
        endpoint: 'NovesXRP.getTransaction',
        requestParams: { chain, hash, accountAddress },
      }
    );
    return mapNovesXRPTransactionToTransactionResponse(transaction);
  },
  [EcoSystem.SUBSTRATE]: async (_chain, _hash, _accountAddress) => {
    throw new NotFoundError('Substrate transactions are not supported');
  },
};

export const listTransactionFetchers: Record<EcoSystem, ListTransactionFetcher> = {
  [EcoSystem.EVM]: async (
    chain,
    address,
    { cursorKey, pageSize, startBlock, endBlock, sort, includeV5 }
  ) => {
    const queryParams = buildQueryParams({
      cursorKey,
      pageSize,
      startBlock,
      endBlock,
      sort,
      includeV5,
    });

    const novesChain = mapChainAliasToNovesChain(chain);
    const txPage = await withPerformanceMonitoring(
      () =>
        cursorKey
          ? TransactionsPage.fromCursor(NovesEVMClient, novesChain, address, cursorKey)
          : NovesEVMClient.getTransactions(novesChain, address, queryParams),
      {
        endpoint: 'NovesEVM.getTransactions',
        requestParams: { chain, address, cursorKey, queryParams },
      }
    );

    const nextCursor = txPage.getNextCursor();
    const previousCursor = txPage.getPreviousCursor();

    return {
      data: txPage.getTransactions().map((t) =>
        mapNovesEVMTransactionToTransactionResponse({
          novesTransaction: t as EVMTranslateTransactionV5,
          chain,
          accountAddress: address,
        })
      ),
      pagination: {
        hasPreviousPage: !!previousCursor,
        hasNextPage: !!nextCursor,
        previousCursor,
        nextCursor,
      },
    };
  },

  [EcoSystem.SVM]: async (chain, address, { cursorKey, pageSize, startBlock, endBlock }) => {
    const queryParams = buildQueryParams({ cursorKey, pageSize, startBlock, endBlock });
    const novesChain = mapChainAliasToNovesChain(chain);
    const txPage = await withPerformanceMonitoring(
      () =>
        cursorKey
          ? TransactionsPage.fromCursor(NovesSVMClient, novesChain, address, cursorKey)
          : NovesSVMClient.getTransactions(novesChain, address, queryParams),
      {
        endpoint: 'NovesSVM.getTransactions',
        requestParams: { chain, address, cursorKey, queryParams },
      }
    );
    const nextCursor = txPage.getNextCursor();
    const previousCursor = txPage.getPreviousCursor();
    return {
      data: txPage.getTransactions().map((t) =>
        mapNovesSVMTransactionToTransactionResponse({
          novesTransaction: t as SVMTranslateTransactionV5,
          chain,
          accountAddress: address,
        })
      ),
      pagination: {
        hasNextPage: !!nextCursor,
        hasPreviousPage: !!previousCursor,
        nextCursor,
        previousCursor,
      },
    };
  },

  [EcoSystem.UTXO]: async (chain, address, { cursorKey, pageSize, startBlock, endBlock }) => {
    const queryParams = buildQueryParams({
      cursorKey,
      pageSize,
      startBlock,
      endBlock,
      includeV5: false,
    });

    // TODO: Replace this with a v5 implementation once noves make it available
    const novesChain = mapChainAliasToNovesChain(chain);
    const txPage = await withPerformanceMonitoring(
      () =>
        cursorKey
          ? TransactionsPage.fromCursor(NovesUTXOClient, novesChain, address, cursorKey)
          : NovesUTXOClient.getTransactions(novesChain, address, queryParams),
      {
        endpoint: 'NovesUTXO.getTransactions',
        requestParams: { chain, address, cursorKey, queryParams },
      }
    );

    const nextCursor = txPage.getNextCursor();
    const previousCursor = txPage.getPreviousCursor();
    return {
      data: txPage.getTransactions().map((t) =>
        mapNovesUTXOTransactionToTransactionResponse({
          novesTransaction: t as unknown as UTXOTranslateTransactionV2,
          chain,
          accountAddress: address,
        })
      ),
      pagination: {
        hasNextPage: !!nextCursor,
        hasPreviousPage: !!previousCursor,
        nextCursor,
        previousCursor,
      },
    };
  },

  [EcoSystem.TVM]: async (chain, address, { cursorKey, pageSize, startBlock, endBlock }) => {
    const queryParams = buildQueryParams({
      cursorKey,
      pageSize,
      startBlock,
      endBlock,
      includeV5: false,
    });
    const novesChain = mapChainAliasToNovesChain(chain);
    const txPage = await withPerformanceMonitoring(
      () =>
        cursorKey
          ? TransactionsPage.fromCursor(NovesTVMClient, novesChain, address, cursorKey)
          : NovesTVMClient.getTransactions(novesChain, address, queryParams),
      {
        endpoint: 'NovesTVM.getTransactions',
        requestParams: { chain, address, cursorKey, queryParams },
      }
    );
    const nextCursor = txPage.getNextCursor();
    const previousCursor = txPage.getPreviousCursor();
    return {
      data: txPage.getTransactions().map((t) =>
        mapNovesTvmTransactionToTransactionResponse({
          novesTransaction: t as TVMTranslateTransaction,
          chain,
          accountAddress: address,
        })
      ),
      pagination: {
        hasNextPage: !!nextCursor,
        hasPreviousPage: !!previousCursor,
        nextCursor,
        previousCursor,
      },
    };
  },

  [EcoSystem.SUBSTRATE]: async (chain, address, { cursorKey, pageSize, startBlock, endBlock }) => {
    const queryParams = buildQueryParams({ cursorKey, pageSize, startBlock, endBlock });
    const novesChain = mapChainAliasToNovesChain(chain);
    const txPage = await withPerformanceMonitoring(
      () =>
        cursorKey
          ? TransactionsPage.fromCursor(NovesPOLKADOTClient, novesChain, address, cursorKey)
          : NovesPOLKADOTClient.getTransactions(novesChain, address, queryParams),
      {
        endpoint: 'NovesPOLKADOT.getTransactions',
        requestParams: { chain, address, cursorKey, queryParams },
      }
    );
    const nextCursor = txPage.getNextCursor();
    const previousCursor = txPage.getPreviousCursor();
    return {
      data: txPage.getTransactions().map((t) =>
        mapNovesSubstrateTransactionToTransactionResponse({
          novesTransaction: t as POLKADOTTranslateTransaction,
          chain,
          accountAddress: address,
        })
      ),
      pagination: {
        hasNextPage: !!nextCursor,
        hasPreviousPage: !!previousCursor,
        nextCursor,
        previousCursor,
      },
    };
  },
  [EcoSystem.XRP]: async (chain, address, { cursorKey, pageSize, startBlock, endBlock }) => {
    const queryParams = buildQueryParams({ cursorKey, pageSize, startBlock, endBlock });
    const novesChain = mapChainAliasToNovesChain(chain);
    const txPage = await withPerformanceMonitoring(
      () =>
        cursorKey
          ? TransactionsPage.fromCursor(NovesXRPClient, novesChain, address, cursorKey)
          : NovesXRPClient.getTransactions(novesChain, address, queryParams),
      {
        endpoint: 'NovesXRP.getTransactions',
        requestParams: { chain, address, cursorKey, queryParams },
      }
    );
    const nextCursor = txPage.getNextCursor();
    const previousCursor = txPage.getPreviousCursor();
    return {
      data: txPage
        .getTransactions()
        .map((t) => mapNovesXRPTransactionToTransactionResponse(t as XRPLTranslateTransaction)),
      pagination: {
        hasNextPage: !!nextCursor,
        hasPreviousPage: !!previousCursor,
        nextCursor,
        previousCursor,
      },
    };
  },

  [EcoSystem.COSMOS]: async () => {
    throw new Error('Cosmos transactions are not supported');
  },
};

const buildQueryParams = ({
  cursorKey,
  pageSize,
  startBlock,
  endBlock,
  includeV5 = true,
  sort,
}: {
  cursorKey?: string;
  pageSize?: number;
  startBlock?: number;
  endBlock?: number;
  includeV5?: boolean;
  sort?: 'asc' | 'desc';
}): PageOptions => {
  const baseParams: PageOptions = {
    startBlock,
    endBlock,
    liveData: true,
    pageSize: pageSize ?? DEFAULT_PAGE_SIZE,
    sort: sort ?? 'desc',
    ...(includeV5 ? { v5Format: true } : {}),
  };

  if (!cursorKey) return baseParams;

  const decodedCursorKey = TransactionsPage.decodeCursor(cursorKey);
  return {
    ...baseParams,
    ...decodedCursorKey,
  };
};

const mapExplorerTransactionToTransfers = (
  transaction: UTXOTransactionResponse | XrpTransactionResponse,
  defaultToken: {
    name: string;
    symbol: string;
    decimals: number;
    address: string;
  }
) => {
  return [...transaction.sent, ...transaction.received].map((t) => ({
    action: t.action,
    from: {
      address: t.from?.address ?? null,
      name: t.from?.name ?? null,
    },
    to: {
      address: t.to?.address ?? null,
      name: t.to?.name ?? null,
    },
    amount: t.amount,
    token: mapToken(defaultToken),
  }));
};

export const mapToken = <T extends { address: string }>(token: T) => {
  const SYMBOL_LENGTH = 4;
  return {
    ...token,
    address: token?.address?.length > SYMBOL_LENGTH ? token.address : null,
  };
};

export const mapExplorerTransactionToTransactionResponse = (
  transaction: UTXOTransactionResponse | XrpTransactionResponse,
  address: string,
  defaultToken: {
    name: string;
    symbol: string;
    decimals: number;
    address: string;
  }
): UTXOTransactionSchema | XrpTransactionSchema => {
  if ('memo' in transaction) {
    return {
      memo: transaction.memo,
      chain: transaction.chainAlias,
      accountAddress: address,
      transfers: mapExplorerTransactionToTransfers(transaction, defaultToken),
      rawTransactionData: {
        transactionHash: transaction.id,
        timestamp: transaction.timestamps?.createdAt.getTime() ?? 0,
        blockNumber: transaction.block,
        transactionFee: {
          amount: transaction.fee?.amount ?? '0',
          token: mapToken(defaultToken),
        },
      },
      classificationData: mapExplorerTransactionToNoveTransactionClassificationData(
        transaction,
        defaultToken
      ),
    } as XrpTransactionSchema;
  }
  return {
    chain: transaction.chainAlias,
    accountAddress: address,
    transfers: mapExplorerTransactionToTransfers(transaction, defaultToken),
    rawTransactionData: {
      transactionHash: transaction.id,
      timestamp: transaction.timestamps?.createdAt.getTime() ?? 0,
      blockNumber: transaction.block,
      transactionFee: {
        amount: transaction.fee?.amount ?? '0',
        token: mapToken(defaultToken),
      },
    },
    classificationData: mapExplorerTransactionToNoveTransactionClassificationData(
      transaction,
      defaultToken
    ),
  } as UTXOTransactionSchema;
};

export const mapExplorerTransactionToNoveTransactionClassificationData = (
  transaction: UTXOTransactionResponse | XrpTransactionResponse,
  _defaultToken: {
    name: string;
    symbol: string;
    decimals: number;
    address: string;
  }
): UTXOTransactionSchema['classificationData'] | XrpTransactionSchema['classificationData'] => {
  return {
    type: 'unknown',
    description: transaction.summary,
  };
};
