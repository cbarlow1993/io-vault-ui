/**
 * Transaction provider types for the reconciliation system.
 * These interfaces define how external blockchain data providers integrate
 * with the reconciliation service to fetch and normalize transaction data.
 */

import { ChainAlias } from "@iofinnet/io-core-dapp-utils-chains-sdk";

/**
 * Normalized transaction data returned by providers.
 * This format standardizes transaction data across different blockchain ecosystems.
 */
export interface ProviderTransaction {
  /** Transaction hash/ID */
  transactionHash: string;
  /** Chain alias identifier (e.g., 'eth', 'polygon', 'solana') */
  chainAlias: ChainAlias;
  /** Transaction timestamp */
  timestamp: Date;
  /** Provider-specific cursor for pagination */
  cursor: string;
  /** Raw transaction data as returned by the provider */
  rawData: Record<string, unknown>;
  /** Normalized transaction fields for consistent processing */
  normalized: {
    /** Sender address */
    fromAddress: string;
    /** Recipient address (null for contract deployments) */
    toAddress: string | null;
    /** Transaction value in native denomination (as string for precision) */
    // value: string;
    /** Transaction status */
    // status: 'success' | 'failed' | 'pending';
    /** Block number (as string for large numbers) */
    blockNumber: string;
    /** Transaction fee in native denomination (null if not available) */
    fee: string | null;
  };
}

/**
 * Options for fetching transactions from a provider.
 */
export interface FetchTransactionsOptions {
  /** Start fetching from this timestamp (inclusive) */
  fromTimestamp?: Date;
  /** Stop fetching at this timestamp (inclusive) */
  toTimestamp?: Date;
  /** Start fetching from this block number (inclusive) */
  fromBlock?: number;
  /** Stop fetching at this block number (inclusive) */
  toBlock?: number;
  /** Resume from a specific cursor position */
  cursor?: string;
}

/**
 * Interface that all transaction data providers must implement.
 * Providers are responsible for fetching and normalizing blockchain transaction data.
 */
export interface TransactionProvider {
  /** Unique identifier for the provider */
  name: string;
  /** List of chain aliases this provider supports */
  supportedChainAliases: ChainAlias[];

  /**
   * Fetches transactions for an address using an async generator.
   * This allows for efficient streaming of large transaction sets.
   *
   * @param address - The blockchain address to fetch transactions for
   * @param chainAlias - The chain alias identifier (e.g., 'eth-mainnet')
   * @param options - Optional fetch parameters
   * @yields ProviderTransaction objects one at a time
   */
  fetchTransactions(
    address: string,
    chainAlias: ChainAlias,
    options?: FetchTransactionsOptions
  ): AsyncGenerator<ProviderTransaction>;

  /**
   * Checks if the provider is operational and can serve requests.
   *
   * @returns true if the provider is healthy, false otherwise
   */
  healthCheck(): Promise<boolean>;

  // Async job methods (optional - not all providers support them)

  /**
   * Checks if the provider supports async jobs for a given chain alias.
   * Some providers offer async/batch job processing for historical data.
   *
   * @param chainAlias - The chain alias identifier to check
   * @returns true if async jobs are supported for this chain alias
   */
  supportsAsyncJobs?(chainAlias: ChainAlias): boolean;

  /**
   * Starts an async job to fetch historical transactions.
   * The job runs asynchronously and results are polled via fetchAsyncJobResults.
   *
   * @param chainAlias - The chain alias identifier
   * @param address - The blockchain address to fetch transactions for
   * @param options - Optional parameters for the job
   * @returns Job ID and initial URL to poll for results
   */
  startAsyncJob?(
    chainAlias: ChainAlias,
    address: string,
    options?: { startBlock?: number; endBlock?: number }
  ): Promise<{ jobId: string; nextPageUrl: string }>;

  /**
   * Fetches results from an async job.
   * Should be called repeatedly until isComplete is true.
   *
   * @param nextPageUrl - URL to fetch the next page of results
   * @returns Transactions, pagination info, and job status
   */
  fetchAsyncJobResults?(
    nextPageUrl: string
  ): Promise<{
    transactions: unknown[];
    nextPageUrl?: string;
    isReady: boolean;
    isComplete: boolean;
  }>;

  /**
   * Gets the current block number for a chain alias.
   * Used to set the reconciliation checkpoint to the chain's current state.
   *
   * @param chainAlias - The chain alias identifier (e.g., 'eth', 'polygon')
   * @returns The current block number on the chain
   */
  getCurrentBlockNumber?(chainAlias: ChainAlias): Promise<number>;
}

/**
 * Configuration for provider selection per chain.
 */
export interface ProviderConfig {
  /** Primary provider to use for this chain */
  primary: string;
  /** Fallback providers if primary fails */
  fallbacks: string[];
}
