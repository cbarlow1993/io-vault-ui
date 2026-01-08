import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import type {
  ReconciliationJobRepository,
  TransactionRepository,
  AddressRepository,
  ReconciliationJob,
  ReconciliationAuditEntry,
} from '@/src/repositories/types.js';
import { getProviderForChainAlias } from '@/src/services/reconciliation/providers/registry.js';
import { getReorgThreshold } from '@/src/services/reconciliation/config.js';

/**
 * Dependencies required by the ReconciliationService.
 */
export interface ReconciliationServiceDeps {
  jobRepository: ReconciliationJobRepository;
  transactionRepository: TransactionRepository;
  addressRepository: AddressRepository;
}

/**
 * Input parameters for creating a new reconciliation job.
 */
export interface CreateJobInput {
  /** The blockchain address to reconcile */
  address: string;
  /** The chain alias identifier (e.g., "eth-mainnet", "polygon-mainnet", "eth-sepolia") */
  chainAlias: ChainAlias;
  /** Reconciliation mode: 'full' for complete re-sync, 'partial' for incremental from checkpoint */
  mode?: 'full' | 'partial';
  /** Optional start block for the reconciliation window */
  fromBlock?: number;
  /** Optional end block for the reconciliation window */
  toBlock?: number;
  /** Optional start timestamp for the reconciliation window */
  fromTimestamp?: Date;
  /** Optional end timestamp for the reconciliation window */
  toTimestamp?: Date;
}

/**
 * A reconciliation job enriched with its audit log.
 */
export interface JobWithAuditLog extends ReconciliationJob {
  /** The audit log entries for this job */
  auditLog: ReconciliationAuditEntry[];
}

/**
 * Summary of a reconciliation job for listing purposes.
 */
export interface JobSummary {
  /** The job identifier */
  jobId: string;
  /** Current status of the job */
  status: ReconciliationJob['status'];
  /** The blockchain address being reconciled */
  address: string;
  /** The chain alias identifier */
  chainAlias: ChainAlias;
  /** When the job was created */
  createdAt: Date;
}

/**
 * Service for managing transaction reconciliation jobs.
 *
 * The ReconciliationService orchestrates the process of comparing on-chain
 * transaction data (from providers like Noves) with locally stored transaction
 * records to identify discrepancies, missing transactions, and data integrity issues.
 */
export class ReconciliationService {
  private readonly jobRepository: ReconciliationJobRepository;
  private readonly addressRepository: AddressRepository;

  constructor(deps: ReconciliationServiceDeps) {
    this.jobRepository = deps.jobRepository;
    this.addressRepository = deps.addressRepository;
  }

  /**
   * Finds an active (pending or running) job for a specific address and chain alias.
   * Used to enforce one-job-per-address-chain policy.
   *
   * @param address - The blockchain address
   * @param chainAlias - The chain alias identifier
   * @returns The active job if one exists, null otherwise
   */
  async findActiveJob(address: string, chainAlias: ChainAlias): Promise<ReconciliationJob | null> {
    return this.jobRepository.findActiveJobByAddressAndChainAlias(address, chainAlias);
  }

  /**
   * Deletes a pending job. Used when replacing a pending job with a new one.
   *
   * @param id - The job ID to delete
   * @returns true if deleted, false if not found
   */
  async deleteJob(id: string): Promise<boolean> {
    return this.jobRepository.deleteJob(id);
  }

  /**
   * Creates a new reconciliation job for the specified address and chain alias.
   *
   * The job will be created with 'pending' status and queued for processing.
   *
   * For partial mode:
   * - If no checkpoint exists (last_reconciled_block is null), auto-upgrades to full mode
   * - Otherwise, calculates fromBlock as checkpoint minus reorg threshold
   *
   * @param input - The job creation parameters
   * @returns The created reconciliation job
   */
  async createJob(input: CreateJobInput): Promise<ReconciliationJob> {
    // Get the provider for this chain alias to determine which provider will process the job
    const provider = getProviderForChainAlias(input.chainAlias);

    // Default to partial mode if not specified
    let mode = input.mode ?? 'partial';
    let fromBlock = input.fromBlock;

    // For partial mode, calculate fromBlock based on checkpoint
    if (mode === 'partial' && fromBlock === undefined) {
      const address = await this.addressRepository.findByAddressAndChainAlias(input.address, input.chainAlias);

      if (!address || address.last_reconciled_block === null) {
        // No checkpoint exists - upgrade to full mode
        mode = 'full';
      } else {
        // Calculate fromBlock as checkpoint minus reorg threshold for safety
        const threshold = getReorgThreshold(input.chainAlias);
        fromBlock = Math.max(0, address.last_reconciled_block - threshold);
      }
    }

    return this.jobRepository.create({
      address: input.address,
      chainAlias: input.chainAlias,
      provider: provider.name,
      mode,
      fromBlock,
      toBlock: input.toBlock,
      fromTimestamp: input.fromTimestamp,
      toTimestamp: input.toTimestamp,
    });
  }

  /**
   * Retrieves a reconciliation job by its ID, including the full audit log.
   *
   * @param id - The job identifier
   * @returns The job with its audit log, or null if not found
   */
  async getJob(id: string): Promise<JobWithAuditLog | null> {
    const job = await this.jobRepository.findById(id);
    if (!job) {
      return null;
    }

    const auditLog = await this.jobRepository.getAuditLog(id);

    return {
      ...job,
      auditLog,
    };
  }

  /**
   * Lists reconciliation jobs for a specific address and chain alias.
   *
   * Returns summarized job information suitable for listing UIs.
   *
   * @param address - The blockchain address
   * @param chainAlias - The chain alias identifier
   * @param options - Optional pagination parameters
   * @returns Paginated list of job summaries
   */
  async listJobs(
    address: string,
    chainAlias: ChainAlias,
    options?: { limit?: number; offset?: number }
  ): Promise<{ data: JobSummary[]; total: number }> {
    const result = await this.jobRepository.findByAddressAndChainAlias(address, chainAlias, options);

    return {
      data: result.data.map((job) => ({
        jobId: job.id,
        status: job.status,
        address: job.address,
        chainAlias: job.chainAlias,
        createdAt: job.createdAt,
      })),
      total: result.total,
    };
  }
}
