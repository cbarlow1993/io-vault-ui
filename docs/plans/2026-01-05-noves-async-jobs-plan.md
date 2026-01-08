# Noves Async Jobs Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate from synchronous Noves transaction fetching to async job processing with pod failure recovery.

**Architecture:** Worker starts a Noves background job, saves the jobId to database, then polls for completion. If pod restarts, it resumes from saved jobId. Feature flag controls rollout.

**Tech Stack:** Noves async job API, PostgreSQL, Kysely migrations, Fastify

---

### Task 1: Add Noves async jobs configuration

**Files:**
- Modify: `services/core/src/lib/config.ts`
- Modify: `services/core/.env.example`

**Step 1: Update config schema**

In `services/core/src/lib/config.ts`, find the `apis.noves` schema (around line 62) and update:

```typescript
noves: z.object({
  apiKey: z.string().optional(),
  asyncJobs: z.object({
    enabled: booleanFromString.default(false),
    timeoutHours: z.coerce.number().default(4),
  }),
}),
```

**Step 2: Update config loading**

In the `loadConfig()` function (around line 150), update:

```typescript
noves: {
  apiKey: process.env.NOVES_API_KEY,
  asyncJobs: {
    enabled: process.env.NOVES_ASYNC_JOBS_ENABLED,
    timeoutHours: process.env.NOVES_JOB_TIMEOUT_HOURS,
  },
},
```

**Step 3: Update .env.example**

Add to `services/core/.env.example`:

```bash
# Noves Async Jobs
NOVES_ASYNC_JOBS_ENABLED=false
# Timeout in hours before marking job as failed (default: 4)
NOVES_JOB_TIMEOUT_HOURS=4
```

**Step 4: Verify config loads**

Run:
```bash
cd services/core && npx tsc --noEmit
```
Expected: No errors

**Step 5: Commit**

```bash
git add services/core/src/lib/config.ts services/core/.env.example
git commit -m "feat(config): add Noves async jobs configuration"
```

---

### Task 2: Create database migration for Noves job columns

**Files:**
- Create: `services/core/src/lib/database/migrations/2026_01_05_add_noves_job_columns.ts`

**Step 1: Create migration file**

Create `services/core/src/lib/database/migrations/2026_01_05_add_noves_job_columns.ts`:

```typescript
import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('reconciliation_jobs')
    .addColumn('noves_job_id', 'text')
    .execute();

  await db.schema
    .alterTable('reconciliation_jobs')
    .addColumn('noves_next_page_url', 'text')
    .execute();

  await db.schema
    .alterTable('reconciliation_jobs')
    .addColumn('noves_job_started_at', 'timestamptz')
    .execute();

  // Index for finding jobs with active Noves jobs
  await db.schema
    .createIndex('idx_reconciliation_jobs_noves_job_id')
    .on('reconciliation_jobs')
    .column('noves_job_id')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .dropIndex('idx_reconciliation_jobs_noves_job_id')
    .execute();

  await db.schema
    .alterTable('reconciliation_jobs')
    .dropColumn('noves_job_started_at')
    .execute();

  await db.schema
    .alterTable('reconciliation_jobs')
    .dropColumn('noves_next_page_url')
    .execute();

  await db.schema
    .alterTable('reconciliation_jobs')
    .dropColumn('noves_job_id')
    .execute();
}
```

**Step 2: Update database types**

In `services/core/src/lib/database/types.ts`, find the `ReconciliationJob` interface and add:

```typescript
noves_job_id: string | null;
noves_next_page_url: string | null;
noves_job_started_at: Date | null;
```

**Step 3: Verify migration syntax**

Run:
```bash
cd services/core && npx tsc --noEmit
```
Expected: No errors

**Step 4: Commit**

```bash
git add services/core/src/lib/database/migrations/2026_01_05_add_noves_job_columns.ts services/core/src/lib/database/types.ts
git commit -m "feat(db): add migration for Noves job tracking columns"
```

---

### Task 3: Update reconciliation repository for Noves fields

**Files:**
- Modify: `services/core/src/repositories/reconciliation.repository.ts`

**Step 1: Update the repository types and methods**

Find the `update` method and ensure it handles the new Noves fields:

```typescript
interface UpdateJobFields {
  status?: string;
  processedCount?: number;
  transactionsAdded?: number;
  transactionsSoftDeleted?: number;
  discrepanciesFlagged?: number;
  errorsCount?: number;
  lastProcessedCursor?: string | null;
  startedAt?: Date;
  completedAt?: Date;
  finalBlock?: bigint | null;
  // New Noves fields
  novesJobId?: string | null;
  novesNextPageUrl?: string | null;
  novesJobStartedAt?: Date | null;
}
```

**Step 2: Update the update method to map fields**

Ensure the update method maps camelCase to snake_case:

```typescript
async update(jobId: string, fields: UpdateJobFields): Promise<void> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date(),
  };

  if (fields.status !== undefined) updateData.status = fields.status;
  if (fields.processedCount !== undefined) updateData.processed_count = fields.processedCount;
  // ... existing fields ...

  // Noves fields
  if (fields.novesJobId !== undefined) updateData.noves_job_id = fields.novesJobId;
  if (fields.novesNextPageUrl !== undefined) updateData.noves_next_page_url = fields.novesNextPageUrl;
  if (fields.novesJobStartedAt !== undefined) updateData.noves_job_started_at = fields.novesJobStartedAt;

  await this.db
    .updateTable('reconciliation_jobs')
    .set(updateData)
    .where('id', '=', jobId)
    .execute();
}
```

**Step 3: Update job mapping to include Noves fields**

Find where jobs are mapped from DB rows and add:

```typescript
novesJobId: row.noves_job_id,
novesNextPageUrl: row.noves_next_page_url,
novesJobStartedAt: row.noves_job_started_at,
```

**Step 4: Verify types**

Run:
```bash
cd services/core && npx tsc --noEmit
```
Expected: No errors

**Step 5: Commit**

```bash
git add services/core/src/repositories/reconciliation.repository.ts
git commit -m "feat(repo): add Noves job fields to reconciliation repository"
```

---

### Task 4: Add async job methods to NovesProvider

**Files:**
- Modify: `services/core/src/services/reconciliation/providers/noves-provider.ts`
- Create: `services/core/tests/unit/services/reconciliation/providers/noves-provider-async.test.ts`

**Step 1: Write the failing tests**

Create `services/core/tests/unit/services/reconciliation/providers/noves-provider-async.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { NovesProvider } from '@/services/core/src/services/reconciliation/providers/noves-provider';

describe('NovesProvider async jobs', () => {
  let provider: NovesProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new NovesProvider('test-api-key');
  });

  describe('startAsyncJob', () => {
    it('calls correct endpoint for EVM chains', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ nextPageUrl: 'https://translate.noves.fi/evm/eth/txs/job/abc123' }),
      });

      const result = await provider.startAsyncJob('ethereum', '0xaddr', { startBlock: 1000, endBlock: 2000 });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://translate.noves.fi/evm/eth/txs/job/start',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"accountAddress":"0xaddr"'),
        })
      );
      expect(result.jobId).toBe('abc123');
      expect(result.nextPageUrl).toContain('abc123');
    });

    it('uses correct params for SVM chains', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ nextPageUrl: 'https://translate.noves.fi/svm/solana/txs/job/xyz789' }),
      });

      await provider.startAsyncJob('solana', 'SolAddr123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://translate.noves.fi/svm/solana/txs/job/start',
        expect.objectContaining({
          body: expect.stringContaining('"format":"v5"'),
        })
      );
    });

    it('uses walletAddress for UTXO chains', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ nextPageUrl: 'https://translate.noves.fi/utxo/btc/txs/job/btc456' }),
      });

      await provider.startAsyncJob('bitcoin', 'bc1qaddr');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/utxo/btc/txs/job/start'),
        expect.objectContaining({
          body: expect.stringContaining('"walletAddress":"bc1qaddr"'),
        })
      );
    });
  });

  describe('fetchAsyncJobResults', () => {
    it('returns empty transactions on 425 status', async () => {
      mockFetch.mockResolvedValue({
        status: 425,
        ok: false,
      });

      const result = await provider.fetchAsyncJobResults('https://noves.fi/job/123');

      expect(result.transactions).toEqual([]);
      expect(result.isReady).toBe(false);
    });

    it('returns transactions when job is ready', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        ok: true,
        json: () => Promise.resolve({
          items: [{ rawTransactionData: { transactionHash: '0xabc' } }],
          nextPageUrl: 'https://noves.fi/job/123/page2',
        }),
      });

      const result = await provider.fetchAsyncJobResults('https://noves.fi/job/123');

      expect(result.transactions).toHaveLength(1);
      expect(result.nextPageUrl).toContain('page2');
      expect(result.isReady).toBe(true);
    });

    it('detects job completion when no nextPageUrl', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        ok: true,
        json: () => Promise.resolve({
          items: [{ rawTransactionData: { transactionHash: '0xfinal' } }],
        }),
      });

      const result = await provider.fetchAsyncJobResults('https://noves.fi/job/123');

      expect(result.nextPageUrl).toBeUndefined();
      expect(result.isComplete).toBe(true);
    });
  });

  describe('supportsAsyncJobs', () => {
    it('returns true for EVM chains', () => {
      expect(provider.supportsAsyncJobs('ethereum')).toBe(true);
      expect(provider.supportsAsyncJobs('polygon')).toBe(true);
    });

    it('returns true for SVM chains', () => {
      expect(provider.supportsAsyncJobs('solana')).toBe(true);
    });

    it('returns true for UTXO chains', () => {
      expect(provider.supportsAsyncJobs('bitcoin')).toBe(true);
    });

    it('returns false for XRPL', () => {
      expect(provider.supportsAsyncJobs('xrpl')).toBe(false);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run:
```bash
cd services/core && npm test -- --run tests/unit/services/reconciliation/providers/noves-provider-async.test.ts
```
Expected: FAIL with "startAsyncJob is not a function"

**Step 3: Add async job methods to NovesProvider**

Add to `services/core/src/services/reconciliation/providers/noves-provider.ts`:

```typescript
// Add after CHAIN_TO_ECOSYSTEM constant
const ASYNC_JOB_ECOSYSTEMS: Ecosystem[] = ['evm', 'svm', 'utxo'];

// Add interface for async job responses
interface AsyncJobStartResponse {
  nextPageUrl: string;
}

interface AsyncJobResultResponse {
  items?: TransactionV5[];
  nextPageUrl?: string;
}

// Add to NovesProvider class
private readonly apiKey: string;

constructor(apiKey: string) {
  this.apiKey = apiKey;
  // ... existing client initialization
}

/**
 * Checks if the given chain supports async job processing.
 */
supportsAsyncJobs(chain: string): boolean {
  const ecosystem = CHAIN_TO_ECOSYSTEM[chain];
  return ecosystem !== undefined && ASYNC_JOB_ECOSYSTEMS.includes(ecosystem);
}

/**
 * Starts an async job for fetching transactions.
 */
async startAsyncJob(
  chain: string,
  address: string,
  options?: { startBlock?: number; endBlock?: number }
): Promise<{ jobId: string; nextPageUrl: string }> {
  const ecosystem = CHAIN_TO_ECOSYSTEM[chain];
  if (!ecosystem) {
    throw new Error(`Unsupported chain: ${chain}`);
  }

  const novesChain = CHAIN_TO_NOVES[chain];
  const body = this.buildAsyncJobBody(ecosystem, address, options);

  const response = await fetch(
    `https://translate.noves.fi/${ecosystem}/${novesChain}/txs/job/start`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to start Noves job: ${response.status}`);
  }

  const data: AsyncJobStartResponse = await response.json();
  const jobId = this.extractJobIdFromUrl(data.nextPageUrl);

  return { jobId, nextPageUrl: data.nextPageUrl };
}

/**
 * Fetches results from an async job.
 */
async fetchAsyncJobResults(
  nextPageUrl: string
): Promise<{
  transactions: TransactionV5[];
  nextPageUrl?: string;
  isReady: boolean;
  isComplete: boolean;
}> {
  const response = await fetch(nextPageUrl, {
    headers: {
      'Authorization': `Bearer ${this.apiKey}`,
    },
  });

  if (response.status === 425) {
    return {
      transactions: [],
      nextPageUrl,
      isReady: false,
      isComplete: false,
    };
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch Noves job results: ${response.status}`);
  }

  const data: AsyncJobResultResponse = await response.json();

  return {
    transactions: data.items ?? [],
    nextPageUrl: data.nextPageUrl,
    isReady: true,
    isComplete: data.nextPageUrl === undefined,
  };
}

/**
 * Builds ecosystem-specific request body for starting async job.
 */
private buildAsyncJobBody(
  ecosystem: Ecosystem,
  address: string,
  options?: { startBlock?: number; endBlock?: number }
): Record<string, unknown> {
  switch (ecosystem) {
    case 'evm':
      return {
        accountAddress: address,
        startBlock: options?.startBlock,
        endBlock: options?.endBlock,
        v5Format: true,
        excludeSpam: false,
      };
    case 'svm':
      return {
        accountAddress: address,
        startTimestamp: 0,
        format: 'v5',
      };
    case 'utxo':
      return {
        walletAddress: address,
        startBlock: options?.startBlock,
        endBlock: options?.endBlock,
      };
    default:
      throw new Error(`Async jobs not supported for ecosystem: ${ecosystem}`);
  }
}

/**
 * Extracts job ID from Noves nextPageUrl.
 */
private extractJobIdFromUrl(url: string): string {
  // URL format: https://translate.noves.fi/evm/eth/txs/job/{jobId}
  const match = url.match(/\/job\/([^/?]+)/);
  if (!match) {
    throw new Error(`Could not extract job ID from URL: ${url}`);
  }
  return match[1];
}
```

**Step 4: Run tests to verify they pass**

Run:
```bash
cd services/core && npm test -- --run tests/unit/services/reconciliation/providers/noves-provider-async.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add services/core/src/services/reconciliation/providers/noves-provider.ts services/core/tests/unit/services/reconciliation/providers/noves-provider-async.test.ts
git commit -m "feat(noves): add async job methods to NovesProvider"
```

---

### Task 5: Update ReconciliationWorker for async job flow

**Files:**
- Modify: `services/core/src/services/reconciliation/reconciliation-worker.ts`
- Create: `services/core/tests/unit/services/reconciliation/reconciliation-worker-async.test.ts`

**Step 1: Write the failing tests**

Create `services/core/tests/unit/services/reconciliation/reconciliation-worker-async.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStartAsyncJob = vi.fn();
const mockFetchAsyncJobResults = vi.fn();
const mockSupportsAsyncJobs = vi.fn();
const mockFetchTransactions = vi.fn();

vi.mock('@/services/core/src/services/reconciliation/providers/registry', () => ({
  getProviderForChain: vi.fn().mockReturnValue({
    startAsyncJob: mockStartAsyncJob,
    fetchAsyncJobResults: mockFetchAsyncJobResults,
    supportsAsyncJobs: mockSupportsAsyncJobs,
    fetchTransactions: mockFetchTransactions,
  }),
}));

vi.mock('@/services/core/src/lib/config', () => ({
  config: {
    apis: { noves: { apiKey: 'test-key', asyncJobs: { enabled: true, timeoutHours: 4 } } },
    reconciliation: { pollingIntervalMs: 5000 },
  },
}));

import { ReconciliationWorker } from '@/services/core/src/services/reconciliation/reconciliation-worker';

describe('ReconciliationWorker async jobs', () => {
  let worker: ReconciliationWorker;
  const mockJobRepository = {
    update: vi.fn(),
    addAuditEntry: vi.fn(),
    claimNextPendingJob: vi.fn(),
  };
  const mockTransactionRepository = {
    findByChainAndAddress: vi.fn().mockResolvedValue({ data: [], hasMore: false }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    worker = new ReconciliationWorker({
      jobRepository: mockJobRepository as any,
      transactionRepository: mockTransactionRepository as any,
    });
  });

  it('starts Noves job and saves jobId when no existing jobId', async () => {
    const job = createJob({ novesJobId: null });
    mockSupportsAsyncJobs.mockReturnValue(true);
    mockStartAsyncJob.mockResolvedValue({
      jobId: 'noves-123',
      nextPageUrl: 'https://noves.fi/job/noves-123',
    });

    await worker.processJob(job);

    expect(mockStartAsyncJob).toHaveBeenCalledWith(job.chain, job.address, expect.any(Object));
    expect(mockJobRepository.update).toHaveBeenCalledWith(job.id, {
      novesJobId: 'noves-123',
      novesNextPageUrl: 'https://noves.fi/job/noves-123',
      novesJobStartedAt: expect.any(Date),
    });
  });

  it('skips when Noves job returns 425', async () => {
    const job = createJob({ novesJobId: 'noves-123', novesNextPageUrl: 'https://noves.fi/job/123' });
    mockSupportsAsyncJobs.mockReturnValue(true);
    mockFetchAsyncJobResults.mockResolvedValue({
      transactions: [],
      isReady: false,
      isComplete: false,
    });

    await worker.processJob(job);

    expect(mockJobRepository.update).not.toHaveBeenCalledWith(job.id, expect.objectContaining({ status: 'completed' }));
  });

  it('processes transactions when Noves job is ready', async () => {
    const job = createJob({ novesJobId: 'noves-123', novesNextPageUrl: 'https://noves.fi/job/123' });
    mockSupportsAsyncJobs.mockReturnValue(true);
    mockFetchAsyncJobResults.mockResolvedValue({
      transactions: [{ rawTransactionData: { transactionHash: '0xabc' } }],
      nextPageUrl: undefined,
      isReady: true,
      isComplete: true,
    });

    await worker.processJob(job);

    expect(mockJobRepository.update).toHaveBeenCalledWith(job.id, expect.objectContaining({
      status: 'completed',
    }));
  });

  it('fails job when timeout exceeded', async () => {
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
    const job = createJob({
      novesJobId: 'noves-123',
      novesJobStartedAt: fiveHoursAgo,
    });
    mockSupportsAsyncJobs.mockReturnValue(true);

    await worker.processJob(job);

    expect(mockJobRepository.update).toHaveBeenCalledWith(job.id, expect.objectContaining({
      status: 'failed',
    }));
  });

  it('falls back to sync for XRPL', async () => {
    const job = createJob({ chain: 'xrpl' });
    mockSupportsAsyncJobs.mockReturnValue(false);
    mockFetchTransactions.mockImplementation(async function* () {});

    await worker.processJob(job);

    expect(mockStartAsyncJob).not.toHaveBeenCalled();
  });
});

function createJob(overrides = {}) {
  return {
    id: 'job-1',
    address: '0xaddr',
    chain: 'ethereum',
    network: 'mainnet',
    provider: 'noves',
    status: 'running',
    mode: 'full',
    novesJobId: null,
    novesNextPageUrl: null,
    novesJobStartedAt: null,
    ...overrides,
  };
}
```

**Step 2: Run tests to verify they fail**

Run:
```bash
cd services/core && npm test -- --run tests/unit/services/reconciliation/reconciliation-worker-async.test.ts
```
Expected: FAIL

**Step 3: Update ReconciliationWorker**

In `services/core/src/services/reconciliation/reconciliation-worker.ts`, update the `processJob` method:

```typescript
import { config } from '../../lib/config.js';

// Add to class
private isNovesJobTimedOut(job: ReconciliationJob): boolean {
  if (!job.novesJobStartedAt) return false;
  const timeoutMs = config.apis.noves.asyncJobs.timeoutHours * 60 * 60 * 1000;
  return Date.now() - job.novesJobStartedAt.getTime() > timeoutMs;
}

async processJob(job: ReconciliationJob): Promise<void> {
  const provider = getProviderForChain(job.chain);
  const useAsyncJobs = config.apis.noves.asyncJobs.enabled &&
                       provider.supportsAsyncJobs?.(job.chain);

  if (!useAsyncJobs) {
    return this.processJobSync(job);
  }

  // Async job flow
  if (!job.novesJobId) {
    // Start new Noves job
    const { jobId, nextPageUrl } = await provider.startAsyncJob(
      job.chain,
      job.address,
      { startBlock: job.fromBlock ? Number(job.fromBlock) : undefined, endBlock: job.toBlock ? Number(job.toBlock) : undefined }
    );

    await this.jobRepository.update(job.id, {
      novesJobId: jobId,
      novesNextPageUrl: nextPageUrl,
      novesJobStartedAt: new Date(),
    });

    logger.info('Started Noves async job', { jobId: job.id, novesJobId: jobId });
    return;
  }

  // Check timeout
  if (this.isNovesJobTimedOut(job)) {
    logger.error('Noves job timed out', { jobId: job.id, novesJobId: job.novesJobId });
    await this.jobRepository.update(job.id, {
      status: 'failed',
      completedAt: new Date(),
    });
    return;
  }

  // Fetch results
  const result = await provider.fetchAsyncJobResults(job.novesNextPageUrl!);

  if (!result.isReady) {
    logger.debug('Noves job not ready', { jobId: job.id, novesJobId: job.novesJobId });
    return;
  }

  // Process transactions
  await this.processProviderTransactions(job, result.transactions);

  if (result.isComplete) {
    await this.completeJob(job);
  } else {
    await this.jobRepository.update(job.id, {
      novesNextPageUrl: result.nextPageUrl,
    });
  }
}

// Rename existing processJob to processJobSync
private async processJobSync(job: ReconciliationJob): Promise<void> {
  // ... existing implementation
}
```

**Step 4: Run tests to verify they pass**

Run:
```bash
cd services/core && npm test -- --run tests/unit/services/reconciliation/reconciliation-worker-async.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add services/core/src/services/reconciliation/reconciliation-worker.ts services/core/tests/unit/services/reconciliation/reconciliation-worker-async.test.ts
git commit -m "feat(worker): add async job processing flow to ReconciliationWorker"
```

---

### Task 6: Update provider types

**Files:**
- Modify: `services/core/src/services/reconciliation/providers/types.ts`

**Step 1: Add async job methods to TransactionProvider interface**

```typescript
export interface TransactionProvider {
  readonly name: string;
  readonly supportedChains: string[];

  healthCheck(): Promise<boolean>;

  fetchTransactions(
    address: string,
    chain: string,
    network: string,
    options?: FetchTransactionsOptions
  ): AsyncGenerator<ProviderTransaction>;

  // Async job methods (optional - not all providers support them)
  supportsAsyncJobs?(chain: string): boolean;

  startAsyncJob?(
    chain: string,
    address: string,
    options?: { startBlock?: number; endBlock?: number }
  ): Promise<{ jobId: string; nextPageUrl: string }>;

  fetchAsyncJobResults?(
    nextPageUrl: string
  ): Promise<{
    transactions: unknown[];
    nextPageUrl?: string;
    isReady: boolean;
    isComplete: boolean;
  }>;
}
```

**Step 2: Verify types**

Run:
```bash
cd services/core && npx tsc --noEmit
```
Expected: No errors

**Step 3: Commit**

```bash
git add services/core/src/services/reconciliation/providers/types.ts
git commit -m "feat(types): add async job methods to TransactionProvider interface"
```

---

### Task 7: Update env files for testing

**Files:**
- Modify: `services/core/envs/.env.local.test`
- Modify: `services/core/envs/.env.dev.test`

**Step 1: Add Noves async config to test env files**

Add to both env files:

```bash
NOVES_ASYNC_JOBS_ENABLED=false
NOVES_JOB_TIMEOUT_HOURS=4
```

**Step 2: Commit**

```bash
git add services/core/envs/.env.local.test services/core/envs/.env.dev.test
git commit -m "chore(env): add Noves async jobs config to test environments"
```

---

### Task 8: Run full test suite

**Step 1: Run all tests**

Run:
```bash
cd services/core && npm test
```
Expected: All tests pass

**Step 2: Run type check**

Run:
```bash
cd services/core && npx tsc --noEmit
```
Expected: No errors

---

## Summary

After completing all tasks, you will have:
- Configuration for `NOVES_ASYNC_JOBS_ENABLED` and `NOVES_JOB_TIMEOUT_HOURS`
- Database migration adding `noves_job_id`, `noves_next_page_url`, `noves_job_started_at` columns
- Updated repository with Noves field support
- `NovesProvider` with `startAsyncJob` and `fetchAsyncJobResults` methods
- `ReconciliationWorker` with async job flow and sync fallback
- Full test coverage for new components
