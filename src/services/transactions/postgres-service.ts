import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { NotFoundError } from '@iofinnet/errors-sdk';
import type {
  TransactionRepository,
  Transaction,
  AddressRepository,
  EnrichedTransfer,
} from '@/src/repositories/types.js';
import { encodeCursor, decodeCursor } from '@/src/services/transactions/cursor.js';
import { TransferEnricher } from '@/src/services/transactions/transfer-enricher.js';
import { PAGINATION_DEFAULTS } from '@/src/lib/schemas/pagination-schema.js';

export interface TransactionServiceDeps {
  transactionRepository: TransactionRepository;
  addressRepository: AddressRepository;
}

export interface TransactionListOptions {
  chainAlias?: ChainAlias;
  limit?: number;
  offset?: number;
}

export interface TransactionListResult {
  transactions: Transaction[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ListTransactionsOptions {
  chainAlias: ChainAlias;
  address: string;
  cursor?: string;
  limit?: number;
  sort?: 'asc' | 'desc';
  /** Filter by direction(s) from the address's perspective */
  direction?: ('in' | 'out' | 'neutral')[];
  /** Include enriched transfers with asset metadata */
  includeTransfers?: boolean;
}

export interface TransactionWithTransfers extends Transaction {
  /** Unified transfers array with full asset metadata */
  transfers?: EnrichedTransfer[];
}

/**
 * Result of listing transactions with cursor-based pagination.
 * @see docs/requirements/common/001-cursor-pagination.md
 */
export interface ListTransactionsResult {
  transactions: TransactionWithTransfers[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    total?: number;
  };
}

export class PostgresTransactionService {
  private readonly transactionRepository: TransactionRepository;
  private readonly addressRepository: AddressRepository;

  constructor(deps: TransactionServiceDeps) {
    this.transactionRepository = deps.transactionRepository;
    this.addressRepository = deps.addressRepository;
  }

  async getTransaction(id: string): Promise<Transaction | null> {
    return this.transactionRepository.findById(id);
  }

  async getTransactionByHash(chainAlias: ChainAlias, txHash: string): Promise<Transaction | null> {
    return this.transactionRepository.findByTxHash(chainAlias, txHash);
  }

  /**
   * Get a single transaction by chain alias and transaction hash, including transfers.
   *
   * @param options - Options containing chain alias, txHash, and address for perspective
   * @returns Transaction with unified transfers and operationId (stubbed as null)
   * @throws NotFoundError if the transaction does not exist
   */
  async getByChainAndHash(options: {
    chainAlias: ChainAlias;
    txHash: string;
    /** Address to calculate transfer direction from */
    address: string;
  }): Promise<TransactionWithTransfers & { operationId: null }> {
    const { chainAlias, txHash, address } = options;

    // Find transaction by hash
    const transaction = await this.transactionRepository.findByTxHash(chainAlias, txHash);
    if (!transaction) {
      throw new NotFoundError(`Transaction not found: ${txHash} on chain ${chainAlias}`);
    }

    // Fetch native and token transfers (with metadata) in parallel
    const [nativeTransfers, tokenTransfersWithMetadata] = await Promise.all([
      this.transactionRepository.findNativeTransfersByTxIds([transaction.id]),
      this.transactionRepository.findTokenTransfersWithMetadataByTxIds([transaction.id]),
    ]);

    // Enrich transfers with asset metadata and direction
    const transferEnricher = new TransferEnricher();
    const transfers = await transferEnricher.enrichTransfers(
      chainAlias,
      nativeTransfers,
      tokenTransfersWithMetadata,
      address
    );

    return {
      ...transaction,
      transfers,
      operationId: null,
    };
  }

  async listByAddress(
    address: string,
    options: TransactionListOptions = {}
  ): Promise<TransactionListResult> {
    const limit = Math.min(options.limit ?? 50, 100);
    const offset = options.offset ?? 0;

    const result = await this.transactionRepository.findByAddress(address, {
      chainAlias: options.chainAlias,
      limit,
      offset,
    });

    return {
      transactions: result.data,
      pagination: {
        total: result.total,
        limit,
        offset,
        hasMore: offset + result.data.length < result.total,
      },
    };
  }

  /**
   * List transactions for a specific chain alias and address with cursor-based pagination.
   *
   * @param options - Options for listing transactions
   * @returns Transactions with pagination cursors
   * @throws NotFoundError if the address does not exist
   */
  async listByChainAliasAndAddress(options: ListTransactionsOptions): Promise<ListTransactionsResult> {
    const { chainAlias, address, cursor, limit = PAGINATION_DEFAULTS.DEFAULT_LIMIT, sort = 'desc', direction, includeTransfers } = options;

    // Validate address exists
    const addressRecord = await this.addressRepository.findByAddressAndChainAlias(address, chainAlias);
    if (!addressRecord) {
      throw new NotFoundError(`Address not found: ${address} on chain ${chainAlias}`);
    }

    // Parse cursor if provided
    const parsedCursor = cursor ? decodeCursor(cursor) : undefined;

    // Clamp limit to max 100
    const clampedLimit = Math.min(limit, 100);

    // Query transactions
    const result = await this.transactionRepository.findByChainAliasAndAddress(chainAlias, address, {
      cursor: parsedCursor,
      limit: clampedLimit,
      sort,
      direction,
    });

    // Build transactions with optional transfers
    let transactionsWithTransfers: TransactionWithTransfers[] = result.data;

    if (result.data.length > 0 && includeTransfers) {
      const txIds = result.data.map((tx) => tx.id);

      // Fetch native and token transfers in parallel
      const [nativeTransfers, tokenTransfersWithMetadata] = await Promise.all([
        this.transactionRepository.findNativeTransfersByTxIds(txIds),
        this.transactionRepository.findTokenTransfersWithMetadataByTxIds(txIds),
      ]);

      // Group transfers by txId
      const nativeTransfersByTxId = new Map<string, typeof nativeTransfers>();
      for (const transfer of nativeTransfers) {
        const existing = nativeTransfersByTxId.get(transfer.txId) ?? [];
        existing.push(transfer);
        nativeTransfersByTxId.set(transfer.txId, existing);
      }

      const tokenTransfersByTxId = new Map<string, typeof tokenTransfersWithMetadata>();
      for (const transfer of tokenTransfersWithMetadata) {
        const existing = tokenTransfersByTxId.get(transfer.txId) ?? [];
        existing.push(transfer);
        tokenTransfersByTxId.set(transfer.txId, existing);
      }

      // Enrich transactions with transfers
      const transferEnricher = new TransferEnricher();
      transactionsWithTransfers = await Promise.all(
        result.data.map(async (tx) => {
          const txNativeTransfers = nativeTransfersByTxId.get(tx.id) ?? [];
          const txTokenTransfersWithMetadata = tokenTransfersByTxId.get(tx.id) ?? [];

          // Create unified enriched transfers
          const transfers = await transferEnricher.enrichTransfers(
            chainAlias,
            txNativeTransfers,
            txTokenTransfersWithMetadata,
            address
          );

          return {
            ...tx,
            transfers,
          };
        })
      );
    }

    // Build pagination cursor
    let nextCursor: string | null = null;

    if (result.hasMore && transactionsWithTransfers.length > 0) {
      const lastTx = transactionsWithTransfers[transactionsWithTransfers.length - 1]!;
      nextCursor = encodeCursor(lastTx.timestamp, lastTx.id);
    }

    return {
      transactions: transactionsWithTransfers,
      pagination: {
        nextCursor,
        hasMore: result.hasMore,
      },
    };
  }
}
