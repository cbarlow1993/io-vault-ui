import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { type Kysely, sql } from 'kysely';
import type {
  Database,
  ReconciliationJob as ReconciliationJobRow,
  ReconciliationAuditLog as ReconciliationAuditLogRow,
} from '@/src/lib/database/types.js';
import type {
  ReconciliationJob,
  ReconciliationJobRepository,
  CreateReconciliationJobInput,
  UpdateReconciliationJobInput,
  ReconciliationAuditEntry,
  CreateAuditEntryInput,
} from '@/src/repositories/types.js';

/**
 * Maps a database reconciliation job row (snake_case) to the ReconciliationJob interface (camelCase)
 */
function mapToJob(row: ReconciliationJobRow): ReconciliationJob {
  return {
    id: row.id,
    address: row.address,
    chainAlias: row.chain_alias as ChainAlias,
    status: row.status,
    provider: row.provider,
    fromTimestamp: row.from_timestamp,
    toTimestamp: row.to_timestamp,
    lastProcessedCursor: row.last_processed_cursor,
    processedCount: row.processed_count,
    transactionsAdded: row.transactions_added,
    transactionsSoftDeleted: row.transactions_soft_deleted,
    discrepanciesFlagged: row.discrepancies_flagged,
    errorsCount: row.errors_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    mode: row.mode,
    fromBlock: row.from_block,
    toBlock: row.to_block,
    finalBlock: row.final_block,
    // Noves job tracking fields
    novesJobId: row.noves_job_id,
    novesNextPageUrl: row.noves_next_page_url,
    novesJobStartedAt: row.noves_job_started_at,
  };
}

/**
 * Maps a database audit log row (snake_case) to the ReconciliationAuditEntry interface (camelCase)
 */
function mapToAuditEntry(row: ReconciliationAuditLogRow): ReconciliationAuditEntry {
  return {
    id: row.id,
    jobId: row.job_id,
    transactionHash: row.transaction_hash,
    action: row.action,
    beforeSnapshot: row.before_snapshot,
    afterSnapshot: row.after_snapshot,
    discrepancyFields: row.discrepancy_fields,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  };
}

export class PostgresReconciliationRepository implements ReconciliationJobRepository {
  constructor(private db: Kysely<Database>) {}

  async create(input: CreateReconciliationJobInput): Promise<ReconciliationJob> {
    const insertValues = {
      address: input.address,
      chain_alias: input.chainAlias,
      provider: input.provider,
      from_timestamp: input.fromTimestamp ?? null,
      to_timestamp: input.toTimestamp ?? null,
      status: 'pending' as const,
      processed_count: 0,
      transactions_added: 0,
      transactions_soft_deleted: 0,
      discrepancies_flagged: 0,
      errors_count: 0,
      mode: input.mode ?? 'full',
      from_block: input.fromBlock ?? null,
      to_block: input.toBlock ?? null,
    };
    const result = await this.db
      .insertInto('reconciliation_jobs')
      .values(insertValues)
      .returningAll()
      .executeTakeFirstOrThrow();

    return mapToJob(result);
  }

  async findById(id: string): Promise<ReconciliationJob | null> {
    const result = await this.db
      .selectFrom('reconciliation_jobs')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return result ? mapToJob(result) : null;
  }

  async findByAddressAndChainAlias(
    address: string,
    chainAlias: ChainAlias,
    options?: { limit?: number; offset?: number }
  ): Promise<{ data: ReconciliationJob[]; total: number }> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    // Build base query with case-insensitive address matching
    const baseQuery = this.db
      .selectFrom('reconciliation_jobs')
      .where(sql`LOWER(address)`, '=', address.toLowerCase())
      .where('chain_alias', '=', chainAlias);

    // Execute data and count queries in parallel
    const [data, countResult] = await Promise.all([
      baseQuery
        .selectAll()
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute(),
      baseQuery
        .select((eb) => eb.fn.countAll<number>().as('count'))
        .executeTakeFirstOrThrow(),
    ]);

    const total = Number(countResult.count);

    return {
      data: data.map(mapToJob),
      total,
    };
  }

  async update(id: string, input: UpdateReconciliationJobInput): Promise<ReconciliationJob> {
    // Convert camelCase input to snake_case for database
    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (input.status !== undefined) {
      updateData.status = input.status;
    }
    if (input.lastProcessedCursor !== undefined) {
      updateData.last_processed_cursor = input.lastProcessedCursor;
    }
    if (input.processedCount !== undefined) {
      updateData.processed_count = input.processedCount;
    }
    if (input.transactionsAdded !== undefined) {
      updateData.transactions_added = input.transactionsAdded;
    }
    if (input.transactionsSoftDeleted !== undefined) {
      updateData.transactions_soft_deleted = input.transactionsSoftDeleted;
    }
    if (input.discrepanciesFlagged !== undefined) {
      updateData.discrepancies_flagged = input.discrepanciesFlagged;
    }
    if (input.errorsCount !== undefined) {
      updateData.errors_count = input.errorsCount;
    }
    if (input.startedAt !== undefined) {
      updateData.started_at = input.startedAt;
    }
    if (input.completedAt !== undefined) {
      updateData.completed_at = input.completedAt;
    }
    if (input.mode !== undefined) {
      updateData.mode = input.mode;
    }
    if (input.fromBlock !== undefined) {
      updateData.from_block = input.fromBlock;
    }
    if (input.toBlock !== undefined) {
      updateData.to_block = input.toBlock;
    }
    if (input.finalBlock !== undefined) {
      updateData.final_block = input.finalBlock;
    }
    // Noves job tracking fields
    if (input.novesJobId !== undefined) {
      updateData.noves_job_id = input.novesJobId;
    }
    if (input.novesNextPageUrl !== undefined) {
      updateData.noves_next_page_url = input.novesNextPageUrl;
    }
    if (input.novesJobStartedAt !== undefined) {
      updateData.noves_job_started_at = input.novesJobStartedAt;
    }

    const result = await this.db
      .updateTable('reconciliation_jobs')
      .set(updateData)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return mapToJob(result);
  }

  async claimNextPendingJob(): Promise<ReconciliationJob | null> {
    // First, try to claim a new pending job
    const pendingJob = await this.db
      .selectFrom('reconciliation_jobs')
      .selectAll()
      .where('status', '=', 'pending')
      .orderBy('created_at', 'asc')
      .limit(1)
      .forUpdate()
      .skipLocked()
      .executeTakeFirst();

    if (pendingJob) {
      // Update the job to running status
      const runningJob = await this.db
        .updateTable('reconciliation_jobs')
        .set({
          status: 'running',
          started_at: new Date(),
          updated_at: new Date(),
        })
        .where('id', '=', pendingJob.id)
        .returningAll()
        .executeTakeFirstOrThrow();

      return mapToJob(runningJob);
    }

    // Second, try to claim a running async job that needs polling
    // These are jobs with status='running' and a novesJobId set
    const asyncJob = await this.db
      .selectFrom('reconciliation_jobs')
      .selectAll()
      .where('status', '=', 'running')
      .where('noves_job_id', 'is not', null)
      .orderBy('updated_at', 'asc') // Oldest update first (fair polling)
      .limit(1)
      .forUpdate()
      .skipLocked()
      .executeTakeFirst();

    if (asyncJob) {
      // Update the updated_at timestamp to track polling
      const updatedJob = await this.db
        .updateTable('reconciliation_jobs')
        .set({
          updated_at: new Date(),
        })
        .where('id', '=', asyncJob.id)
        .returningAll()
        .executeTakeFirstOrThrow();

      return mapToJob(updatedJob);
    }

    return null;
  }

  async findActiveJobByAddressAndChainAlias(address: string, chainAlias: ChainAlias): Promise<ReconciliationJob | null> {
    const result = await this.db
      .selectFrom('reconciliation_jobs')
      .selectAll()
      .where(sql`LOWER(address)`, '=', address.toLowerCase())
      .where('chain_alias', '=', chainAlias)
      .where((eb) =>
        eb.or([eb('status', '=', 'pending'), eb('status', '=', 'running')])
      )
      .orderBy('created_at', 'desc')
      .limit(1)
      .executeTakeFirst();

    return result ? mapToJob(result) : null;
  }

  async deleteJob(id: string): Promise<boolean> {
    const result = await this.db
      .deleteFrom('reconciliation_jobs')
      .where('id', '=', id)
      .executeTakeFirst();

    return Number(result.numDeletedRows ?? 0) > 0;
  }

  async addAuditEntry(input: CreateAuditEntryInput): Promise<ReconciliationAuditEntry> {
    const result = await this.db
      .insertInto('reconciliation_audit_log')
      .values({
        job_id: input.jobId,
        transaction_hash: input.transactionHash,
        action: input.action,
        before_snapshot: input.beforeSnapshot
          ? JSON.stringify(input.beforeSnapshot)
          : null,
        after_snapshot: input.afterSnapshot
          ? JSON.stringify(input.afterSnapshot)
          : null,
        discrepancy_fields: input.discrepancyFields ?? null,
        error_message: input.errorMessage ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return mapToAuditEntry(result);
  }

  async getAuditLog(jobId: string): Promise<ReconciliationAuditEntry[]> {
    const results = await this.db
      .selectFrom('reconciliation_audit_log')
      .selectAll()
      .where('job_id', '=', jobId)
      .orderBy('created_at', 'asc')
      .execute();

    return results.map(mapToAuditEntry);
  }

  /**
   * Finds and resets jobs stuck in 'running' status for too long.
   * Only resets sync jobs (those without noves_job_id) since async jobs
   * have their own timeout handling via isNovesJobTimedOut.
   * @param staleThresholdMs - Jobs running longer than this are considered stale (default: 1 hour)
   * @returns Number of jobs reset to 'pending' status
   */
  async resetStaleRunningJobs(staleThresholdMs: number = 60 * 60 * 1000): Promise<number> {
    const staleThreshold = new Date(Date.now() - staleThresholdMs);

    const result = await this.db
      .updateTable('reconciliation_jobs')
      .set({
        status: 'pending',
        updated_at: new Date(),
      })
      .where('status', '=', 'running')
      .where('noves_job_id', 'is', null) // Only sync jobs (not async Noves jobs)
      .where('started_at', '<', staleThreshold)
      .executeTakeFirst();

    return Number(result.numUpdatedRows ?? 0);
  }
}
