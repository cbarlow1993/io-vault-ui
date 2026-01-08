import {
  Translate,
  TransactionsPage,
  TransactionError,
  type TransactionV5,
  type TranslateUTXO,
  type TranslateSVM,
  type TranslateXRPL,
  type TranslateEVM,
  type EVMTranslateTransactionJob,
  type EVMTranslateTransactionJobResponse,
  type SVMTranslateTransactionJob,
  type SVMTranslateTransactionJobResponse,
  type UTXOTranslateTransactionJob,
  type UTXOTranslateTransactionJobResponse,
} from '@noves/noves-sdk';
import { JsonRpcProvider } from 'ethers';
import type {
  TransactionProvider,
  ProviderTransaction,
  FetchTransactionsOptions,
} from '@/src/services/reconciliation/providers/types.js';
import { logger } from '@/utils/powertools.js';
import { getRpcUrl } from '@/src/lib/chains.js';
import {
  NOVES_PROVIDER_CHAIN_MAP,
  NOVES_PROVIDER_ECOSYSTEM_MAP,
  NOVES_ASYNC_JOB_ECOSYSTEMS,
  type NovesEcosystem,
} from '@/src/config/chain-mappings/noves.js';
import { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

/**
 * Transaction provider implementation using the Noves SDK.
 * Supports EVM, SVM (Solana), UTXO (Bitcoin), and XRPL chains.
 */
export class NovesProvider implements TransactionProvider {
  public readonly name = 'noves';

  public readonly supportedChainAliases: ChainAlias[] = Object.keys(NOVES_PROVIDER_CHAIN_MAP) as ChainAlias[];

  private readonly evmClient: TranslateEVM;
  private readonly svmClient: TranslateSVM;
  private readonly utxoClient: TranslateUTXO;
  private readonly xrplClient: TranslateXRPL;

  constructor(apiKey: string) {
    // Initialize SDK clients for each ecosystem
    this.evmClient = Translate.evm(apiKey);
    this.svmClient = Translate.svm(apiKey);
    this.utxoClient = Translate.utxo(apiKey);
    this.xrplClient = Translate.xrpl(apiKey);
  }

  /**
   * Checks if the Noves API is accessible by making a test request.
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to fetch transactions for a test address on Ethereum
      // This verifies the API key and connectivity
      await this.evmClient.getTransactions('eth', '0x0000000000000000000000000000000000000000', {
        pageSize: 1,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Fetches transactions for an address using an async generator.
   * Automatically handles pagination through the Noves API.
   */
  async *fetchTransactions(
    address: string,
    chainAlias: ChainAlias,
    options?: FetchTransactionsOptions
  ): AsyncGenerator<ProviderTransaction> {
    const ecosystem = NOVES_PROVIDER_ECOSYSTEM_MAP[chainAlias];
    if (!ecosystem) {
      throw new Error(`Unsupported chain alias: ${chainAlias}`);
    }

    const novesChain = NOVES_PROVIDER_CHAIN_MAP[chainAlias];
    if (!novesChain) {
      throw new Error(`No Noves chain mapping for: ${chainAlias}`);
    }
    const client = this.getClientForEcosystem(ecosystem);

    let cursor = options?.cursor;
    let hasMore = true;

    while (hasMore) {
      const page = await this.fetchPage(
        client,
        novesChain,
        address,
        cursor,
        options?.fromBlock,
        options?.toBlock
      );
      const transactions = page.getTransactions();
      const nextCursor = page.getNextCursor();

      for (const tx of transactions) {
        const providerTx = this.normalizeTransaction(tx, chainAlias, nextCursor ?? cursor ?? '');

        // Apply timestamp filtering if provided
        if (options?.fromTimestamp && providerTx.timestamp < options.fromTimestamp) {
          continue;
        }
        if (options?.toTimestamp && providerTx.timestamp > options.toTimestamp) {
          continue;
        }

        yield providerTx;
      }

      if (nextCursor) {
        cursor = nextCursor;
      } else {
        hasMore = false;
      }
    }
  }

  /**
   * Checks if the given chain alias supports async job operations.
   * @param chainAlias - The chain alias identifier to check
   * @returns true if the chain alias supports async jobs, false otherwise
   */
  supportsAsyncJobs(chainAlias: ChainAlias): boolean {
    const ecosystem = NOVES_PROVIDER_ECOSYSTEM_MAP[chainAlias];
    return ecosystem !== undefined && NOVES_ASYNC_JOB_ECOSYSTEMS.includes(ecosystem);
  }

  /**
   * Starts an async job to fetch transactions for an address using the Noves SDK.
   * @param chainAlias - The chain alias identifier
   * @param address - The address to fetch transactions for
   * @param options - Optional start/end block parameters
   * @returns The job ID and the URL to fetch results from
   */
  async startAsyncJob(
    chainAlias: ChainAlias,
    address: string,
    options?: { startBlock?: number; endBlock?: number }
  ): Promise<{ jobId: string; nextPageUrl: string }> {
    if (!this.supportsAsyncJobs(chainAlias)) {
      throw new Error(`Chain alias ${chainAlias} does not support async jobs`);
    }

    const ecosystem = NOVES_PROVIDER_ECOSYSTEM_MAP[chainAlias];
    const novesChain = NOVES_PROVIDER_CHAIN_MAP[chainAlias];
    if (!ecosystem || !novesChain) {
      throw new Error(`No Noves mapping for chain alias: ${chainAlias}`);
    }

    try {
      let result: EVMTranslateTransactionJob | SVMTranslateTransactionJob | UTXOTranslateTransactionJob;

      switch (ecosystem) {
        case 'evm': {
          // EVM: startTransactionJob(chain, accountAddress, startBlock, endBlock, v5Format?, excludeSpam?)
          // For full reconciliation: both 0 means "all blocks"
          // For partial reconciliation: both must be specified with valid range (startBlock <= endBlock)
          const startBlock = options?.startBlock ?? 0;
          const endBlock = options?.endBlock ?? 0;

          logger.info('Starting EVM transaction job', {
            chain: novesChain,
            address,
            startBlock,
            endBlock,
          });

          result = await this.evmClient.startTransactionJob(
            novesChain,
            address,
            startBlock,
            endBlock,
            true, // v5Format
            false // excludeSpam
          );
          break;
        }

        case 'svm':
          // SVM: startTransactionJob(chain, accountAddress, startTimestamp?, validateStartTimestamp?)
          result = await this.svmClient.startTransactionJob(
            novesChain,
            address,
            0, // startTimestamp - fetch all
            false // validateStartTimestamp
          );
          break;

        case 'utxo':
          // UTXO: startTransactionJob(chain, accountAddress, startBlock?, endBlock?, startTimestamp?, endTimestamp?)
          result = await this.utxoClient.startTransactionJob(
            novesChain,
            address,
            options?.startBlock,
            options?.endBlock
          );
          break;

        default:
          throw new Error(`Ecosystem ${ecosystem} does not support async jobs`);
      }

      logger.info('Started Noves async job via SDK', {
        chainAlias,
        ecosystem,
        jobId: result.jobId,
      });

      return {
        jobId: result.jobId,
        nextPageUrl: result.nextPageUrl,
      };
    } catch (error) {
      logger.error('Noves SDK startAsyncJob error', {
        chainAlias,
        address,
        options,
        error: error instanceof Error ? { message: error.message, name: error.name, stack: error.stack } : error,
      });
      if (error instanceof TransactionError) {
        throw new Error(`Failed to start async job: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Fetches results from an async job using the Noves SDK.
   * @param nextPageUrl - The URL to fetch results from (used to extract chain/jobId)
   * @returns The transactions, next page URL, and status flags
   */
  async fetchAsyncJobResults(nextPageUrl: string): Promise<{
    transactions: unknown[];
    nextPageUrl?: string;
    isReady: boolean;
    isComplete: boolean;
  }> {
    const { ecosystem, chain, jobId, pageOptions } = this.parseJobUrl(nextPageUrl);

    logger.info('Fetching Noves async job results via SDK', {
      ecosystem,
      chain,
      jobId,
      pageOptions,
      originalUrl: nextPageUrl,
    });

    try {
      let result: EVMTranslateTransactionJobResponse | SVMTranslateTransactionJobResponse | UTXOTranslateTransactionJobResponse;

      switch (ecosystem) {
        case 'evm':
          result = await this.evmClient.getTransactionJobResults(chain, jobId, pageOptions);
          break;

        case 'svm':
          result = await this.svmClient.getTransactionJobResults(chain, jobId, pageOptions);
          break;

        case 'utxo':
          result = await this.utxoClient.getTransactionJobResults(chain, jobId, pageOptions);
          break;

        default:
          throw new Error(`Ecosystem ${ecosystem} does not support async jobs`);
      }

      logger.info('Noves SDK returned job results', {
        ecosystem,
        chain,
        jobId,
        itemCount: result.items.length,
        hasNextPage: result.hasNextPage,
        nextPageUrl: result.nextPageUrl,
      });

      return {
        transactions: result.items,
        nextPageUrl: result.nextPageUrl ?? undefined,
        isReady: true,
        isComplete: !result.hasNextPage,
      };
    } catch (error) {
      // SDK throws TransactionError with specific messages for 425 status
      if (error instanceof TransactionError) {
        const errorMessage = error.message.toLowerCase();
        logger.info('Noves SDK threw TransactionError', {
          ecosystem,
          chain,
          jobId,
          errorMessage: error.message,
          isNotReady: errorMessage.includes('not ready') || errorMessage.includes('not finished'),
        });

        if (errorMessage.includes('not ready') || errorMessage.includes('not finished')) {
          return {
            transactions: [],
            nextPageUrl,
            isReady: false,
            isComplete: false,
          };
        }
        throw new Error(`Failed to fetch async job results: ${error.message}`);
      }
      logger.error('Noves SDK threw unexpected error', {
        ecosystem,
        chain,
        jobId,
        error,
      });
      throw error;
    }
  }

  /**
   * Parses a Noves job URL to extract ecosystem, chain, jobId, and page options.
   * URL format: https://translate.noves.fi/{ecosystem}/{chain}/txs/job/{jobId}?queryParams
   */
  private parseJobUrl(url: string): {
    ecosystem: NovesEcosystem;
    chain: string;
    jobId: string;
    pageOptions: Record<string, unknown>;
  } {
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch {
      throw new Error(`Invalid job URL format: ${url}`);
    }

    // Parse path: /evm/eth/txs/job/abc123
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length < 5 || pathParts[2] !== 'txs' || pathParts[3] !== 'job') {
      throw new Error(`Invalid job URL path format: ${url}`);
    }

    const ecosystem = pathParts[0] as NovesEcosystem;
    const chain = pathParts[1]!;
    const jobId = pathParts[4]!

    if (!['evm', 'svm', 'utxo'].includes(ecosystem)) {
      throw new Error(`Unsupported ecosystem in job URL: ${ecosystem}`);
    }

    // Extract query params as page options
    const pageOptions: Record<string, unknown> = {};
    urlObj.searchParams.forEach((value, key) => {
      // Convert numeric strings to numbers for certain params
      if (['pageSize', 'startBlock', 'endBlock', 'startTimestamp', 'endTimestamp'].includes(key)) {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue)) {
          pageOptions[key] = numValue;
        }
      } else {
        pageOptions[key] = value;
      }
    });

    return { ecosystem, chain, jobId, pageOptions };
  }

  /**
   * Returns the appropriate Noves client for the given ecosystem.
   */
  private getClientForEcosystem(ecosystem: NovesEcosystem) {
    switch (ecosystem) {
      case 'evm':
        return this.evmClient;
      case 'svm':
        return this.svmClient;
      case 'utxo':
        return this.utxoClient;
      case 'xrpl':
        return this.xrplClient;
    }
  }

  /**
   * Fetches a page of transactions, handling cursor-based pagination.
   * Returns a TransactionsPage that provides getTransactions() and getNextCursor() methods.
   */
  private async fetchPage(
    client: TranslateEVM | TranslateSVM | TranslateUTXO | TranslateXRPL,
    novesChain: string,
    address: string,
    cursor?: string,
    fromBlock?: number,
    toBlock?: number
  ): Promise<{ getTransactions(): TransactionV5[]; getNextCursor(): string | null }> {
    if (cursor) {
      // Resume from cursor using TransactionsPage.fromCursor
      const page = await TransactionsPage.fromCursor(client, novesChain, address, cursor);
      return page as unknown as { getTransactions(): TransactionV5[]; getNextCursor(): string | null };
    }

    // Initial fetch (Noves API max pageSize is 50)
    const page = await client.getTransactions(novesChain, address, {
      pageSize: 50,
      v5Format: true,
      liveData: true,
      startBlock: fromBlock,
      endBlock: toBlock,
    });
    return page as unknown as { getTransactions(): TransactionV5[]; getNextCursor(): string | null };
  }

  /**
   * Normalizes a Noves transaction to the ProviderTransaction format.
   */
  private normalizeTransaction(
    tx: TransactionV5,
    chainAlias: ChainAlias,
    cursor: string
  ): ProviderTransaction {
    return {
      transactionHash: tx.rawTransactionData.transactionHash,
      chainAlias,
      timestamp: new Date(tx.rawTransactionData.timestamp),
      cursor,
      rawData: tx as unknown as Record<string, unknown>,
      normalized: {
        fromAddress: tx.rawTransactionData.fromAddress ?? '',
        toAddress: tx.rawTransactionData.toAddress ?? null,
        // value: tx.rawTransactionData.value ?? '0',
        // status: this.normalizeStatus(tx.rawTransactionData.status),
        blockNumber: String(tx.rawTransactionData.blockNumber ?? '0'),
        fee: tx.rawTransactionData.transactionFee?.amount ?? null,
      },
    };
  }

  /**
   * Gets the current block number for a chain alias by querying the chain's RPC endpoint.
   * @param chainAlias - The chain alias identifier (e.g., 'eth-mainnet', 'polygon-mainnet')
   * @returns The current block number on the chain
   */
  async getCurrentBlockNumber(chainAlias: ChainAlias): Promise<number> {
    const ecosystem = NOVES_PROVIDER_ECOSYSTEM_MAP[chainAlias];

    // Currently only support EVM chains for block number fetching
    if (ecosystem !== 'evm') {
      throw new Error(`getCurrentBlockNumber not supported for ecosystem: ${ecosystem ?? 'unknown'}`);
    }

    try {
      const rpcUrl = getRpcUrl(chainAlias);
      const provider = new JsonRpcProvider(rpcUrl);
      const blockNumber = await provider.getBlockNumber();

      logger.info('Fetched current block number', {
        chainAlias,
        blockNumber,
      });

      return blockNumber;
    } catch (error) {
      logger.error('Failed to fetch current block number', {
        chainAlias,
        error,
      });
      throw new Error(`Failed to fetch current block number for ${chainAlias}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
