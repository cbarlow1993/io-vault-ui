import type {
  ReconciliationJobRepository,
  TransactionRepository,
  ReconciliationJob,
  Transaction,
  AddressRepository,
} from '@/src/repositories/types.js';
import { getProviderForChainAlias } from '@/src/services/reconciliation/providers/registry.js';
import type { ProviderTransaction } from '@/src/services/reconciliation/providers/types.js';
import type { TransactionProcessor } from '@/src/services/transaction-processor/index.js';
import { RECONCILIATION_RATE_LIMIT } from '@/src/services/reconciliation/config.js';
import { config } from '@/src/lib/config.js';
import { logger } from '@/utils/powertools.js';
import { TransactionHash, WalletAddress } from '@/src/domain/value-objects/index.js';

const CHECKPOINT_INTERVAL = 100;
/** How often to check for and reset stale running jobs (every 5 minutes) */
const STALE_JOB_CHECK_INTERVAL_MS = 5 * 60 * 1000;
/** Jobs running longer than this are considered stale (1 hour) */
const STALE_JOB_THRESHOLD_MS = 60 * 60 * 1000;

/**
 * Dependencies required by the ReconciliationWorker.
 */
export interface ReconciliationWorkerDeps {
  jobRepository: ReconciliationJobRepository;
  transactionRepository: TransactionRepository;
  transactionProcessor?: TransactionProcessor;
  addressRepository?: AddressRepository;
}

/**
 * Tracks progress during job processing.
 */
interface JobProgress {
  processedCount: number;
  transactionsAdded: number;
  transactionsSoftDeleted: number;
  discrepanciesFlagged: number;
  errorsCount: number;
  lastProcessedCursor: string | null;
  finalBlock: number | null;
  /** Set of matched transaction hashes for orphan detection in async mode */
  matchedHashes?: Set<string>;
}

/**
 * Worker that processes reconciliation jobs.
 *
 * The worker polls for pending jobs, processes them by comparing provider transactions
 * with local database records, and records discrepancies, additions, and deletions.
 * Supports parallel processing of multiple jobs based on maxConcurrentJobs config.
 */
export class ReconciliationWorker {
  private readonly jobRepository: ReconciliationJobRepository;
  private readonly transactionRepository: TransactionRepository;
  private readonly transactionProcessor?: TransactionProcessor;
  private readonly addressRepository?: AddressRepository;
  private running = false;
  private activeJobIds: Set<string> = new Set();
  private pollIntervalMs = 5000;
  private lastRequestTime = 0;
  private lastStaleJobCheck = 0;
  private readonly maxConcurrentJobs: number;

  constructor(deps: ReconciliationWorkerDeps) {
    this.jobRepository = deps.jobRepository;
    this.transactionRepository = deps.transactionRepository;
    this.transactionProcessor = deps.transactionProcessor;
    this.addressRepository = deps.addressRepository;
    this.maxConcurrentJobs = config.reconciliation.maxConcurrentJobs;
  }

  /**
   * Rate limits requests to the provider API.
   * Ensures minimum interval between requests based on RECONCILIATION_RATE_LIMIT.
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    const minInterval = 1000 / RECONCILIATION_RATE_LIMIT.tokensPerInterval;

    if (elapsed < minInterval) {
      await new Promise((resolve) => setTimeout(resolve, minInterval - elapsed));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Starts the worker loop that polls for and processes jobs.
   * The worker will continue running until stop() is called.
   * Errors in job processing are caught and logged to prevent worker crash.
   * Jobs are processed in parallel up to maxConcurrentJobs limit.
   */
  async start(): Promise<void> {
    this.running = true;
    logger.info('Reconciliation worker started', {
      maxConcurrentJobs: this.maxConcurrentJobs,
    });

    while (this.running) {
      try {
        // Periodically check for and reset stale running jobs
        await this.checkAndResetStaleJobs();

        // Check if we have capacity for more jobs
        if (this.activeJobIds.size >= this.maxConcurrentJobs) {
          logger.debug('At max capacity, waiting', {
            activeJobs: this.activeJobIds.size,
            maxConcurrentJobs: this.maxConcurrentJobs,
          });
          await this.sleep(this.pollIntervalMs);
          continue;
        }

        logger.debug('Polling for pending jobs', {
          activeJobs: this.activeJobIds.size,
          maxConcurrentJobs: this.maxConcurrentJobs,
        });
        const job = await this.jobRepository.claimNextPendingJob();
        if (job) {
          logger.info('Claimed job for processing', {
            jobId: job.id,
            chainAlias: job.chainAlias,
            address: job.address,
            status: job.status,
            novesJobId: job.novesJobId,
            activeJobs: this.activeJobIds.size + 1,
            maxConcurrentJobs: this.maxConcurrentJobs,
          });

          // Add to active jobs and process in background
          this.activeJobIds.add(job.id);
          this.processJobAsync(job);
        } else {
          logger.debug('No pending jobs, sleeping', { pollIntervalMs: this.pollIntervalMs });
          await this.sleep(this.pollIntervalMs);
        }
      } catch (error) {
        logger.error('Worker loop error', { error });
        // Sleep before retrying to prevent tight error loop
        await this.sleep(this.pollIntervalMs);
      }
    }

    logger.info('Reconciliation worker stopped');
  }

  /**
   * Processes a job asynchronously in the background.
   * Removes the job from activeJobIds when complete.
   */
  private processJobAsync(job: ReconciliationJob): void {
    this.processJob(job)
      .catch((error) => {
        logger.error('Background job processing error', {
          jobId: job.id,
          error,
        });
      })
      .finally(() => {
        this.activeJobIds.delete(job.id);
      });
  }

  /**
   * Stops the worker loop gracefully.
   * Waits for all active jobs to complete before returning.
   * @param timeoutMs - Maximum time to wait for active jobs (default: 30 seconds)
   */
  async stop(timeoutMs: number = 30000): Promise<void> {
    this.running = false;
    logger.info('Reconciliation worker stopping, waiting for active jobs to complete', {
      activeJobs: this.activeJobIds.size,
    });

    // Wait for all active jobs to complete with timeout
    const startTime = Date.now();
    while (this.activeJobIds.size > 0 && Date.now() - startTime < timeoutMs) {
      await this.sleep(100);
    }

    if (this.activeJobIds.size > 0) {
      logger.warn('Worker stop timed out, jobs still processing', {
        timeoutMs,
        remainingJobs: this.activeJobIds.size,
        jobIds: Array.from(this.activeJobIds),
      });
    } else {
      logger.info('Worker stopped gracefully');
    }
  }

  /**
   * Checks for and resets stale running jobs periodically.
   * This recovers sync jobs that crashed mid-processing.
   */
  private async checkAndResetStaleJobs(): Promise<void> {
    const now = Date.now();
    if (now - this.lastStaleJobCheck < STALE_JOB_CHECK_INTERVAL_MS) {
      return;
    }
    this.lastStaleJobCheck = now;

    try {
      const resetCount = await this.jobRepository.resetStaleRunningJobs(STALE_JOB_THRESHOLD_MS);
      if (resetCount > 0) {
        logger.info('Reset stale running jobs', { resetCount, thresholdMs: STALE_JOB_THRESHOLD_MS });
      }
    } catch (error) {
      logger.error('Failed to check for stale jobs', { error });
    }
  }

  /**
   * Checks if a Noves async job has timed out.
   * @param job - The reconciliation job to check
   * @returns true if the job has exceeded the configured timeout
   */
  private isNovesJobTimedOut(job: ReconciliationJob): boolean {
    if (!job.novesJobStartedAt) return false;
    const timeoutMs = config.apis.noves.asyncJobs.timeoutHours * 60 * 60 * 1000;
    return Date.now() - job.novesJobStartedAt.getTime() > timeoutMs;
  }

  /**
   * Processes a single reconciliation job.
   *
   * This method handles both async and sync flows:
   * - Async flow: Uses Noves async jobs for supported chain aliases when enabled
   * - Sync flow: Uses traditional streaming approach for unsupported chain aliases or when async is disabled
   */
  async processJob(job: ReconciliationJob): Promise<void> {
    const provider = getProviderForChainAlias(job.chainAlias);
    // Check both that async jobs are enabled AND that the provider implements required methods
    const useAsyncJobs =
      config.apis.noves.asyncJobs.enabled &&
      provider.supportsAsyncJobs?.(job.chainAlias) &&
      typeof provider.startAsyncJob === 'function' &&
      typeof provider.fetchAsyncJobResults === 'function';

    if (!useAsyncJobs) {
      return this.processJobSync(job);
    }

    // Async job flow
    logger.info('Processing job with async flow', {
      jobId: job.id,
      chainAlias: job.chainAlias,
      address: job.address,
      novesJobId: job.novesJobId,
      hasNextPageUrl: !!job.novesNextPageUrl,
      novesJobStartedAt: job.novesJobStartedAt?.toISOString(),
    });

    if (!job.novesJobId) {
      // Start new Noves job
      try {
        // Capture current block height at job start (before fetching transactions)
        // This ensures we have a consistent checkpoint that won't miss transactions
        let endBlockHeight: number | null = null;
        if (typeof provider.getCurrentBlockNumber === 'function') {
          try {
            endBlockHeight = await provider.getCurrentBlockNumber(job.chainAlias);
            logger.info('Captured ending block height for reconciliation', {
              jobId: job.id,
              chainAlias: job.chainAlias,
              endBlockHeight,
            });
          } catch (error) {
            logger.warn('Failed to capture end block height (will continue without checkpoint)', {
              jobId: job.id,
              chainAlias: job.chainAlias,
              error: error,
            });
          }
        }

        // When doing partial reconciliation (with startBlock), we must also pass endBlock
        // because the Noves SDK requires both for EVM chains. Use the captured block height.
        const startBlock = job.fromBlock !== null ? Number(job.fromBlock) : undefined;
        const endBlock = endBlockHeight ? Number(endBlockHeight) : undefined;

        const { jobId, nextPageUrl } = await provider.startAsyncJob!(
          job.chainAlias,
          job.address,
          { startBlock, endBlock }
        );

        await this.jobRepository.update(job.id, {
          novesJobId: jobId,
          novesNextPageUrl: nextPageUrl,
          novesJobStartedAt: new Date(),
          // Store the block height captured at job start
          ...(endBlockHeight !== null && { finalBlock: endBlockHeight }),
        });

        logger.info('Started Noves async job', { jobId: job.id, novesJobId: jobId, endBlockHeight });
        return; // Exit, will continue on next poll
      } catch (error) {
        logger.error('Failed to start Noves async job', { error, jobId: job.id });
        await this.jobRepository.update(job.id, {
          status: 'failed',
          completedAt: new Date(),
          errorsCount: job.errorsCount + 1,
        });
        await this.jobRepository.addAuditEntry({
          jobId: job.id,
          transactionHash: 'N/A',
          action: 'error',
          errorMessage: error instanceof Error ? error.message : 'Failed to start async job',
        });
        return;
      }
    }

    // Check timeout
    if (this.isNovesJobTimedOut(job)) {
      const timeoutHours = config.apis.noves.asyncJobs.timeoutHours;
      logger.error('Noves job timed out', { jobId: job.id, novesJobId: job.novesJobId, timeoutHours });
      await this.jobRepository.update(job.id, {
        status: 'failed',
        completedAt: new Date(),
        errorsCount: job.errorsCount + 1,
        // Clear Noves metadata so job could potentially be retried
        novesJobId: null,
        novesNextPageUrl: null,
        novesJobStartedAt: null,
      });
      // Add audit entry for timeout
      await this.jobRepository.addAuditEntry({
        jobId: job.id,
        transactionHash: 'N/A',
        action: 'error',
        errorMessage: `Noves async job timed out after ${timeoutHours} hours`,
      });
      return;
    }

    // Validate nextPageUrl exists (should be set when job was started)
    if (!job.novesNextPageUrl) {
      logger.error('Noves job missing nextPageUrl', {
        jobId: job.id,
        novesJobId: job.novesJobId,
      });
      await this.jobRepository.update(job.id, {
        status: 'failed',
        completedAt: new Date(),
        errorsCount: job.errorsCount + 1,
        // Clear Noves metadata so job could potentially be retried
        novesJobId: null,
        novesNextPageUrl: null,
        novesJobStartedAt: null,
      });
      await this.jobRepository.addAuditEntry({
        jobId: job.id,
        transactionHash: 'N/A',
        action: 'error',
        errorMessage: 'Noves job missing nextPageUrl - internal state error',
      });
      return;
    }

    try {
      // Fetch results
      logger.info('Fetching async job results', {
        jobId: job.id,
        novesJobId: job.novesJobId,
        nextPageUrl: job.novesNextPageUrl,
      });

      const result = await provider.fetchAsyncJobResults!(job.novesNextPageUrl);

      logger.info('Async job results received', {
        jobId: job.id,
        novesJobId: job.novesJobId,
        isReady: result.isReady,
        isComplete: result.isComplete,
        transactionCount: result.transactions.length,
        hasNextPageUrl: !!result.nextPageUrl,
      });

      if (!result.isReady) {
        logger.info('Noves job not ready yet, will retry on next poll', {
          jobId: job.id,
          novesJobId: job.novesJobId,
        });
        return; // Skip, will try again on next poll
      }

      // Process transactions
      logger.info('Processing transactions from async job', {
        jobId: job.id,
        transactionCount: result.transactions.length,
      });

      const progress = await this.processProviderTransactions(job, result.transactions);

      logger.info('Finished processing transactions batch', {
        jobId: job.id,
        processedCount: progress.processedCount,
        transactionsAdded: progress.transactionsAdded,
        isComplete: result.isComplete,
      });

      if (result.isComplete) {
        // Single-batch detection: job.processedCount was 0 before this batch
        // (meaning all transactions were processed in this single batch)
        const isSingleBatch = job.processedCount === 0;
        await this.completeJob(job, progress, isSingleBatch);
      } else {
        // Persist progress along with nextPageUrl to prevent data loss on crash
        logger.info('Updating job with next page URL', {
          jobId: job.id,
          novesJobId: job.novesJobId,
          nextPageUrl: result.nextPageUrl,
          processedCount: progress.processedCount,
        });

        await this.jobRepository.update(job.id, {
          novesNextPageUrl: result.nextPageUrl,
          processedCount: progress.processedCount,
          transactionsAdded: progress.transactionsAdded,
          transactionsSoftDeleted: progress.transactionsSoftDeleted,
          discrepanciesFlagged: progress.discrepanciesFlagged,
          errorsCount: progress.errorsCount,
        });
      }
    } catch (error) {
      logger.error('Async job processing error', { error, jobId: job.id, novesJobId: job.novesJobId });
      await this.jobRepository.update(job.id, {
        status: 'failed',
        completedAt: new Date(),
        errorsCount: job.errorsCount + 1,
        // Clear Noves metadata so job could potentially be retried
        novesJobId: null,
        novesNextPageUrl: null,
        novesJobStartedAt: null,
      });
      await this.jobRepository.addAuditEntry({
        jobId: job.id,
        transactionHash: 'N/A',
        action: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown async job error',
      });
    }
  }

  /**
   * Processes transactions from async job results.
   * Tracks matched transaction hashes across batches for orphan detection at job completion.
   * @param job - The reconciliation job
   * @param transactions - Raw transactions from the async job
   * @param existingMatchedHashes - Set of hashes already matched from previous batches
   * @returns The updated progress for persistence (includes matchedHashes for orphan detection)
   */
  private async processProviderTransactions(
    job: ReconciliationJob,
    transactions: unknown[],
    existingMatchedHashes?: Set<string>
  ): Promise<JobProgress> {
    const progress: JobProgress = {
      processedCount: job.processedCount,
      transactionsAdded: job.transactionsAdded,
      transactionsSoftDeleted: job.transactionsSoftDeleted,
      discrepanciesFlagged: job.discrepanciesFlagged,
      errorsCount: job.errorsCount,
      lastProcessedCursor: job.lastProcessedCursor,
      finalBlock: job.finalBlock,
      matchedHashes: existingMatchedHashes ?? new Set<string>(),
    };

    for (const rawTx of transactions) {
      const txData = rawTx as { rawTransactionData?: { transactionHash?: string; fromAddress?: string; toAddress?: string; blockNumber?: number } };
      const txHash = txData.rawTransactionData?.transactionHash;
      if (!txHash) {
        logger.warn('Skipping transaction without hash from async job', { transaction: rawTx });
        continue;
      }

      const hash = TransactionHash.normalizeForComparison(txHash);

      // Track this hash as seen from provider (for orphan detection at job completion)
      progress.matchedHashes!.add(hash);

      // Check if we have this transaction locally
      const localTx = await this.transactionRepository.findByTxHash(job.chainAlias, hash);

      if (!localTx) {
        // Use TransactionProcessor to fetch, classify, and upsert
        if (this.transactionProcessor) {
          try {
            await this.transactionProcessor.process(job.chainAlias, hash, job.address);
          } catch (error) {
            logger.error('Failed to process transaction from async job', { hash, error });
            progress.errorsCount++;
          }
        }

        // Transaction missing locally - add audit entry
        await this.jobRepository.addAuditEntry({
          jobId: job.id,
          transactionHash: hash,
          action: 'added',
          afterSnapshot: rawTx as Record<string, unknown>,
        });
        progress.transactionsAdded++;
      }

      progress.processedCount++;

      // Checkpoint progress periodically
      if (progress.processedCount % CHECKPOINT_INTERVAL === 0) {
        await this.saveCheckpoint(job.id, progress);
      }
    }

    // Save final progress
    await this.saveCheckpoint(job.id, progress);

    return progress;
  }

  /**
   * Marks a reconciliation job as completed.
   * For async mode, also performs orphan detection using the tracked matched hashes.
   * Uses the block height captured at job start as the reconciliation checkpoint.
   * @param job - The reconciliation job to complete
   * @param progress - Optional progress with updated counts (used by async flow)
   * @param isSingleBatch - Whether this job was completed in a single batch (enables orphan detection)
   */
  private async completeJob(job: ReconciliationJob, progress?: JobProgress, isSingleBatch?: boolean): Promise<void> {
    // Use the block height captured at job start (stored in job.finalBlock)
    // This ensures the checkpoint reflects the chain state when we started syncing
    const checkpointBlock = job.finalBlock ?? progress?.finalBlock ?? null;

    // For async mode, perform orphan detection only if this was a single-batch job.
    // Multi-batch jobs can't do accurate orphan detection because matchedHashes only
    // tracks the current batch, and transactions from earlier batches would be
    // incorrectly flagged as orphans.
    let orphanCount = 0;
    if (progress?.matchedHashes && progress.matchedHashes.size > 0 && isSingleBatch) {
      orphanCount = await this.detectAsyncOrphans(job, progress.matchedHashes, progress);
    } else if (progress?.matchedHashes && progress.matchedHashes.size > 0 && !isSingleBatch) {
      logger.info('Skipping orphan detection for multi-batch async job', {
        jobId: job.id,
        reason: 'Orphan detection only supported for single-batch async jobs',
      });
    }

    await this.jobRepository.update(job.id, {
      status: 'completed',
      completedAt: new Date(),
      // Save final progress if provided
      ...(progress && {
        processedCount: progress.processedCount,
        transactionsAdded: progress.transactionsAdded,
        transactionsSoftDeleted: progress.transactionsSoftDeleted + orphanCount,
        discrepanciesFlagged: progress.discrepanciesFlagged,
        errorsCount: progress.errorsCount,
        lastProcessedCursor: progress.lastProcessedCursor,
      }),
    });

    // Update address checkpoint with the block height captured at job start
    if (checkpointBlock !== null && this.addressRepository) {
      try {
        const address = await this.addressRepository.findByAddressAndChainAlias(job.address, job.chainAlias);
        if (address) {
          await this.addressRepository.updateLastReconciledBlock(address.id, checkpointBlock);
          logger.info('Updated address last reconciled block', {
            jobId: job.id,
            addressId: address.id,
            lastReconciledBlock: checkpointBlock,
          });
        }
      } catch (addressUpdateError) {
        logger.error('Failed to update address last reconciled block (non-critical)', { error: addressUpdateError });
      }
    }

    logger.info('Completed reconciliation job', { jobId: job.id, checkpointBlock, orphanCount });
  }

  /**
   * Detects orphan transactions for async mode.
   * Compares all local transactions against the set of matched hashes from the provider.
   * @param job - The reconciliation job
   * @param matchedHashes - Set of transaction hashes seen from the provider
   * @param progress - Progress tracker for recording orphans
   * @returns Number of orphan transactions detected
   */
  private async detectAsyncOrphans(
    job: ReconciliationJob,
    matchedHashes: Set<string>,
    _progress: JobProgress
  ): Promise<number> {
    // Load all local transactions for this address
    const localTxMap = await this.loadLocalTransactions(job);
    let orphanCount = 0;

    for (const [hash, tx] of localTxMap) {
      if (!matchedHashes.has(hash)) {
        // This transaction exists locally but was not seen from the provider
        await this.jobRepository.addAuditEntry({
          jobId: job.id,
          transactionHash: hash,
          action: 'soft_deleted',
          beforeSnapshot: this.transactionToSnapshot(tx),
        });
        orphanCount++;
      }
    }

    if (orphanCount > 0) {
      logger.info('Detected orphan transactions in async mode', {
        jobId: job.id,
        orphanCount,
        totalLocalTransactions: localTxMap.size,
        matchedFromProvider: matchedHashes.size,
      });
    }

    return orphanCount;
  }

  /**
   * Processes a single reconciliation job using the synchronous streaming flow.
   *
   * This method:
   * 1. Captures current block height at start (for checkpoint)
   * 2. Loads all local transactions for the address into a map
   * 3. Iterates through provider transactions
   * 4. For each provider transaction, checks if it exists locally
   * 5. Records added transactions (in provider but not local)
   * 6. Records discrepancies (differences between provider and local)
   * 7. After processing all provider transactions, records orphans (in local but not provider)
   * 8. Saves checkpoints periodically during processing
   * 9. Marks job as completed or failed
   */
  private async processJobSync(job: ReconciliationJob): Promise<void> {
    const provider = getProviderForChainAlias(job.chainAlias);

    // Capture current block height at job start if not already set
    // This ensures the checkpoint reflects the chain state when we started syncing
    let updatedJob = job;
    if (job.finalBlock === null && typeof provider.getCurrentBlockNumber === 'function') {
      try {
        const startBlockHeight = await provider.getCurrentBlockNumber(job.chainAlias);
        logger.info('Captured starting block height for sync reconciliation', {
          jobId: job.id,
          chainAlias: job.chainAlias,
          startBlockHeight,
        });
        await this.jobRepository.update(job.id, { finalBlock: startBlockHeight });
        // Update local job object so completeJob can use it
        updatedJob = { ...job, finalBlock: startBlockHeight };
      } catch (blockError) {
        logger.warn('Failed to capture starting block height (will continue without checkpoint)', {
          jobId: job.id,
          chainAlias: job.chainAlias,
          error: blockError,
        });
      }
    }

    const progress: JobProgress = {
      processedCount: updatedJob.processedCount,
      transactionsAdded: updatedJob.transactionsAdded,
      transactionsSoftDeleted: updatedJob.transactionsSoftDeleted,
      discrepanciesFlagged: updatedJob.discrepanciesFlagged,
      errorsCount: updatedJob.errorsCount,
      lastProcessedCursor: updatedJob.lastProcessedCursor,
      finalBlock: updatedJob.finalBlock,
    };

    try {
      // Load local transactions into a map for comparison
      const localTxMap = await this.loadLocalTransactions(updatedJob);

      console.log('am i fucking here');

      // Process provider transactions
      for await (const providerTx of this.getProviderTransactions(updatedJob)) {
        await this.processTransaction(updatedJob, providerTx, localTxMap, progress);
        progress.processedCount++;
        progress.lastProcessedCursor = providerTx.cursor;

        // Checkpoint progress periodically
        if (progress.processedCount % CHECKPOINT_INTERVAL === 0) {
          await this.saveCheckpoint(updatedJob.id, progress);
        }
      }

      // Handle orphans (transactions in local but not in provider)
      await this.processOrphans(updatedJob, localTxMap, progress);

      // Mark job as completed (uses the block height captured at start)
      await this.completeJob(updatedJob, progress);
    } catch (error) {
      logger.error('Reconciliation job error', { error, jobId: job.id });

      // Save progress checkpoint before marking as failed - but don't let this failure prevent marking as failed
      try {
        await this.saveCheckpoint(job.id, progress);
      } catch (checkpointError) {
        logger.error('Failed to save checkpoint during error handling', { error: checkpointError, jobId: job.id });
      }

      // Mark job as failed
      try {
        await this.jobRepository.update(job.id, {
          status: 'failed',
          completedAt: new Date(),
          errorsCount: progress.errorsCount + 1,
        });

        await this.jobRepository.addAuditEntry({
          jobId: job.id,
          transactionHash: 'N/A',
          action: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      } catch (failureUpdateError) {
        logger.error('Critical: Failed to mark job as failed. Manual intervention required', { error: failureUpdateError, jobId: job.id });
      }
    }
  }

  /**
   * Loads all local transactions for the job's address and chain alias into a map.
   * Uses cursor-based pagination to handle large transaction sets.
   */
  private async loadLocalTransactions(job: ReconciliationJob): Promise<Map<string, Transaction>> {
    const txMap = new Map<string, Transaction>();
    let hasMore = true;
    let cursor: { timestamp: Date; txId: string } | undefined;

    while (hasMore) {
      const result = await this.transactionRepository.findByChainAliasAndAddress(
        job.chainAlias,
        job.address,
        { cursor, limit: 1000, sort: 'asc' }
      );

      for (const tx of result.data) {
        // In partial mode, skip transactions before the fromBlock
        if (job.mode === 'partial' && job.fromBlock !== null) {
          const blockNum = parseInt(tx.blockNumber, 10);
          if (!isNaN(blockNum) && blockNum < job.fromBlock) {
            continue;
          }
        }
        txMap.set(TransactionHash.normalizeForComparison(tx.txHash), tx);
      }

      hasMore = result.hasMore;
      if (result.data.length > 0) {
        const lastTx = result.data[result.data.length - 1]!;
        cursor = { timestamp: lastTx.timestamp, txId: lastTx.id };
      }
    }

    return txMap;
  }

  /**
   * Creates an async generator that yields provider transactions.
   * Passes job configuration (cursor, timestamps, blocks) to the provider.
   * Applies rate limiting between each transaction fetch.
   */
  private async *getProviderTransactions(job: ReconciliationJob): AsyncGenerator<ProviderTransaction> {
    const provider = getProviderForChainAlias(job.chainAlias);

    for await (const tx of provider.fetchTransactions(job.address, job.chainAlias, {
      cursor: job.lastProcessedCursor ?? undefined,
      fromTimestamp: job.fromTimestamp ?? undefined,
      toTimestamp: job.toTimestamp ?? undefined,
      fromBlock: job.fromBlock ?? undefined,
      toBlock: job.toBlock ?? undefined,
    })) {
      await this.rateLimit();
      yield tx;
    }
  }

  /**
   * Processes a single provider transaction.
   * Checks if it exists locally and records appropriate audit entries.
   */
  private async processTransaction(
    job: ReconciliationJob,
    providerTx: ProviderTransaction,
    localTxMap: Map<string, Transaction>,
    progress: JobProgress
  ): Promise<void> {
    // Skip transactions without a hash
    if (!providerTx.transactionHash) {
      logger.warn('Skipping transaction without hash', { transaction: providerTx });
      return;
    }
    const hash = TransactionHash.normalizeForComparison(providerTx.transactionHash);
    const localTx = localTxMap.get(hash);

    if (!localTx) {
      // Use TransactionProcessor to fetch, classify, and upsert
      if (this.transactionProcessor) {
        try {
          await this.transactionProcessor.process(job.chainAlias, hash, job.address);
        } catch (error) {
          logger.error('Failed to process transaction', { hash, error });
          progress.errorsCount++;
        }
      }

      // Transaction missing locally - add audit entry
      await this.jobRepository.addAuditEntry({
        jobId: job.id,
        transactionHash: hash,
        action: 'added',
        afterSnapshot: providerTx.rawData,
      });
      progress.transactionsAdded++;
    } else {
      // Transaction exists - check for discrepancies
      const discrepancies = this.compareTransactions(localTx, providerTx);
      if (discrepancies.length > 0) {
        await this.jobRepository.addAuditEntry({
          jobId: job.id,
          transactionHash: hash,
          action: 'discrepancy',
          beforeSnapshot: this.transactionToSnapshot(localTx),
          afterSnapshot: providerTx.rawData,
          discrepancyFields: discrepancies,
        });
        progress.discrepanciesFlagged++;
      }
      // Remove from map to track orphans
      localTxMap.delete(hash);
    }
  }

  /**
   * Compares local transaction with provider transaction and returns discrepancy fields.
   *
   * Note: Value and status comparisons are intentionally excluded because:
   * - Value: Provider normalization may differ from our stored format (precision, denomination)
   * - Status: Provider may report different status values that don't map 1:1 to ours
   * These fields would cause excessive false-positive discrepancies.
   */
  private compareTransactions(local: Transaction, provider: ProviderTransaction): string[] {
    const discrepancies: string[] = [];

    if (!WalletAddress.areEqual(local.fromAddress, provider.normalized.fromAddress)) {
      discrepancies.push('fromAddress');
    }
    const localTo = local.toAddress ? WalletAddress.normalizeForComparison(local.toAddress) : null;
    const providerTo = provider.normalized.toAddress
      ? WalletAddress.normalizeForComparison(provider.normalized.toAddress)
      : null;
    if (localTo !== providerTo) {
      discrepancies.push('toAddress');
    }
    if (local.blockNumber !== provider.normalized.blockNumber) {
      discrepancies.push('blockNumber');
    }
    if (local.fee !== provider.normalized.fee) {
      discrepancies.push('fee');
    }

    return discrepancies;
  }

  /**
   * Processes remaining local transactions that were not found in the provider.
   * These are considered orphans (soft deleted).
   */
  private async processOrphans(
    job: ReconciliationJob,
    remainingLocalTxs: Map<string, Transaction>,
    progress: JobProgress
  ): Promise<void> {
    for (const [hash, tx] of remainingLocalTxs) {
      await this.jobRepository.addAuditEntry({
        jobId: job.id,
        transactionHash: hash,
        action: 'soft_deleted',
        beforeSnapshot: this.transactionToSnapshot(tx),
      });
      progress.transactionsSoftDeleted++;
    }
  }

  /**
   * Converts a transaction to a snapshot object for audit logging.
   */
  private transactionToSnapshot(tx: Transaction): Record<string, unknown> {
    return {
      id: tx.id,
      chainAlias: tx.chainAlias,
      txHash: tx.txHash,
      blockNumber: tx.blockNumber,
      fromAddress: tx.fromAddress,
      toAddress: tx.toAddress,
      value: tx.value,
      fee: tx.fee,
      status: tx.status,
      timestamp: tx.timestamp.toISOString(),
    };
  }

  /**
   * Saves a checkpoint of the current progress to the database.
   * This allows jobs to resume from where they left off if interrupted.
   */
  private async saveCheckpoint(jobId: string, progress: JobProgress): Promise<void> {
    await this.jobRepository.update(jobId, {
      processedCount: progress.processedCount,
      transactionsAdded: progress.transactionsAdded,
      transactionsSoftDeleted: progress.transactionsSoftDeleted,
      discrepanciesFlagged: progress.discrepanciesFlagged,
      errorsCount: progress.errorsCount,
      lastProcessedCursor: progress.lastProcessedCursor,
      // Note: finalBlock is set once at job start and should not be updated during processing
    });
  }

  /**
   * Sleeps for the specified number of milliseconds.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
