/**
 * Transaction Service
 *
 * This module provided transaction fetching and listing functionality.
 * As part of the PostgreSQL migration:
 * - DynamoDB transaction queries have been removed
 * - Noves transaction fetchers have been removed
 * - Transaction fetching will be re-implemented via PostgreSQL and chain SDK
 */

import { InternalServerError } from '@iofinnet/errors-sdk';
import {
  Chain,
  ChainAlias,
  type EcoSystem,
  type UTXOTransactionResponse,
} from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type { Transaction as NovesTransaction } from '@noves/noves-sdk';
import type { Transactions } from '@/src/types/transaction.js';
import { logger } from '@/utils/powertools.js';

export namespace Transaction {
  export const validateV5Format = (transaction: NovesTransaction) => {
    if (transaction.txTypeVersion !== 5) {
      throw new InternalServerError('Transaction must be v5 format');
    }
  };
}

// Helper type for UTXO transaction mapping
interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  address: string;
}

/**
 * Map an explorer transaction to our internal transaction response format
 */
export const mapExplorerTransactionToTransactionResponse = (
  transaction: UTXOTransactionResponse,
  address: string,
  tokenInfo: TokenInfo
): Transactions.SupportedTransaction => {
  // Cast to 'any' first to access dynamic properties since UTXOTransactionResponse is a union type
  const tx = transaction as unknown as Record<string, unknown>;
  const txid = (tx.txid ?? tx.transactionId ?? '') as string;
  const blockHeight = (tx.blockHeight ?? tx.block ?? 0) as number;
  const blockTime = (tx.blockTime ?? tx.timestamp ?? Date.now() / 1000) as number;

  // This is a simplified version - actual implementation depends on the transaction type
  return {
    accountAddress: address,
    chain: ChainAlias.MNEE, // Default for now
    timestamp: blockTime,
    classificationData: {
      type: 'unknown',
      description: 'Transaction',
    },
    transfers: [],
    rawTransactionData: {
      transactionHash: txid,
      blockNumber: blockHeight,
      timestamp: blockTime,
      fromAddress: address,
      toAddress: '',
      gas: 0,
      gasUsed: 0,
      gasPrice: 0,
      transactionFee: {
        amount: '0',
        token: tokenInfo,
      },
    },
  } as unknown as Transactions.SupportedTransaction;
};

/**
 * Get a single transaction
 *
 * @deprecated Transaction fetching via Noves has been removed.
 * This will be re-implemented using PostgreSQL and chain SDKs.
 */
export const getTransaction = async ({
  ecosystem: _ecosystem,
  chain,
  address,
  transactionHash,
}: {
  ecosystem: EcoSystem;
  chain: ChainAlias;
  address: string;
  transactionHash: string;
}): Promise<Transactions.SupportedTransaction> => {
  // Only MNEE chain is supported via chain SDK
  if (chain === ChainAlias.MNEE) {
    const client = await Chain.fromAlias(chain);
    const transaction = await client.Explorer.getTransaction({
      transactionId: transactionHash,
      address,
    });
    return mapExplorerTransactionToTransactionResponse(
      transaction as UTXOTransactionResponse,
      address,
      {
        name: 'MNEE',
        symbol: 'MNEE',
        decimals: 8,
        address: 'MNEE',
      }
    );
  }

  // For other ecosystems, Noves fetchers have been removed
  logger.error('Transaction fetching not yet implemented for this ecosystem', { chain });
  throw new InternalServerError(
    'Transaction fetching not yet implemented for this ecosystem in PostgreSQL migration'
  );
};


/**
 * List transactions for an address
 *
 * @deprecated Transaction listing via Noves has been removed.
 * This will be re-implemented using PostgreSQL and chain SDKs.
 */
export const listTransactions = async ({
  ecosystem: _ecosystem,
  chain,
  address,
  cursorKey,
  pageSize,
  startBlock: _startBlock,
  endBlock: _endBlock,
  sort: _sort,
  includeV5: _includeV5,
}: {
  ecosystem: EcoSystem;
  chain: ChainAlias;
  address: string;
  cursorKey?: string;
  pageSize: number;
  startBlock?: number;
  endBlock?: number;
  sort?: 'asc' | 'desc';
  includeV5: boolean;
}): Promise<{
  data: Transactions.SupportedTransaction[];
  pagination: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    previousCursor: string | null;
    nextCursor: string | null;
  };
}> => {
  // Only MNEE chain is supported via chain SDK
  if (chain === ChainAlias.MNEE) {
    const client = await Chain.fromAlias(chain);
    const explorerTransactions = (await client.Explorer.getTransactionHistory({
      address,
      options: {
        limit: pageSize,
        marker: cursorKey ? decodeURIComponent(cursorKey) : undefined,
      },
    })) as {
      transactions: UTXOTransactionResponse[];
      hasMore: boolean;
      marker: string | null;
    };
    return {
      data: explorerTransactions.transactions.map((t) =>
        mapExplorerTransactionToTransactionResponse(t, address, {
          name: 'MNEE',
          symbol: 'MNEE',
          decimals: 8,
          address: 'MNEE',
        })
      ),
      pagination: {
        hasNextPage: explorerTransactions.hasMore,
        hasPreviousPage: false,
        nextCursor: explorerTransactions.marker
          ? encodeURIComponent(explorerTransactions.marker)
          : null,
        previousCursor: null,
      },
    };
  }

  // For other ecosystems, Noves fetchers have been removed
  logger.error('Transaction listing not yet implemented for this ecosystem', { chain });
  throw new InternalServerError(
    'Transaction listing not yet implemented for this ecosystem in PostgreSQL migration'
  );
};

/**
 * Get transaction with operation tag assignment
 *
 * @deprecated This is a stub. Tag assignment functionality was tied to DynamoDB.
 */
export const getTransactionWithOperation = async (params: {
  chain: ChainAlias;
  transactionHash: string;
  address: string;
  ecosystem: EcoSystem;
  organisationId: string;
  shouldIncludeOperation: boolean;
}): Promise<Transactions.SupportedTransaction & { operationId?: string }> => {
  const transaction = await getTransaction({
    ecosystem: params.ecosystem,
    chain: params.chain,
    address: params.address,
    transactionHash: params.transactionHash,
  });

  // Tag assignment is not yet implemented for PostgreSQL
  // TODO: Re-implement tag assignment with PostgreSQL
  return transaction;
};
