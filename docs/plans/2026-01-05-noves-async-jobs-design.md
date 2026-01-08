# Noves Async Jobs Migration Design

## Overview

Migrate from synchronous Noves transaction fetching to their async job processing mechanism. Instead of hitting the GET endpoint directly, we register a job, poll for completion, and save the jobId for pod failure recovery.

## Current vs New Flow

**Current (sync):**
```
Worker claims job → Fetch transactions page by page → Process → Complete
```

**New (async):**
```
Worker claims job → Start Noves job → Save jobId → Release
    ↓
Worker polls → Check Noves job status (425 = not ready, skip)
    ↓
Worker polls → Noves ready → Fetch pages via nextPageUrl → Process → Complete
```

## Key Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| JobId persistence | `reconciliation_jobs` table | Natural fit, already tracks progress |
| Worker handling | Poll in same loop | Simple, one loop handles starting and checking |
| Poll interval | Same as worker (5s) | Simple and consistent |
| Timeout | Configurable hours (default 4) | Prevents stuck jobs |
| Feature flag | `NOVES_ASYNC_JOBS_ENABLED` | Safe rollout, easy rollback |

## Chain Support

| Ecosystem | Async Jobs | Fallback Sync |
|-----------|------------|---------------|
| EVM | ✅ | ✅ |
| SVM | ✅ | ✅ |
| UTXO | ✅ | ✅ |
| XRPL | ❌ | ✅ |
| TVM (future) | ❌ | ✅ |

## Noves API Endpoints

**Start job:**
- EVM: `POST /evm/{chain}/txs/job/start`
- SVM: `POST /svm/{chain}/txs/job/start`
- UTXO: `POST /utxo/{chain}/txs/job/start`

**Fetch results:**
- `GET /evm/{chain}/txs/job/{jobId}` (or svm/utxo)
- Returns 425 if still processing
- Returns transactions with `nextPageUrl` for pagination
- No `nextPageUrl` = job complete

## Database Schema Changes

Add columns to `reconciliation_jobs` table:

```sql
ALTER TABLE reconciliation_jobs
ADD COLUMN noves_job_id TEXT,
ADD COLUMN noves_next_page_url TEXT,
ADD COLUMN noves_job_started_at TIMESTAMPTZ;
```

**Column purposes:**
- `noves_job_id` - Job ID from Noves `/job/start` endpoint
- `noves_next_page_url` - Current pagination URL (saved for recovery)
- `noves_job_started_at` - When Noves job started (for timeout calculation)

**State detection:**
- `noves_job_id IS NULL` → Need to start Noves job
- `noves_job_id IS NOT NULL AND status = 'running'` → Poll for results
- Timeout: `NOW() - noves_job_started_at > NOVES_JOB_TIMEOUT_HOURS`

## Worker Flow

```typescript
async processJob(job: ReconciliationJob) {
  const useAsyncJobs = config.noves.asyncJobs.enabled &&
                       supportsAsyncJobs(job.chain);

  if (!useAsyncJobs) {
    return this.processJobSync(job); // Existing flow
  }

  // Async flow
  if (!job.novesJobId) {
    // Step 1: Start Noves job
    const { jobId, nextPageUrl } = await this.startNovesJob(job);
    await this.jobRepository.update(job.id, {
      novesJobId: jobId,
      novesNextPageUrl: nextPageUrl,
      novesJobStartedAt: new Date(),
    });
    return; // Release, continue on next poll
  }

  // Step 2: Check timeout
  if (this.isNovesJobTimedOut(job)) {
    await this.failJob(job, 'Noves job timed out');
    return;
  }

  // Step 3: Fetch results (handles 425)
  const { transactions, nextPageUrl, isComplete } =
    await this.fetchNovesJobResults(job);

  if (transactions.length === 0 && !isComplete) {
    return; // 425 - not ready, skip iteration
  }

  // Step 4: Process transactions
  await this.processTransactions(job, transactions);

  // Step 5: Update or complete
  if (isComplete) {
    await this.completeJob(job);
  } else {
    await this.jobRepository.update(job.id, { novesNextPageUrl: nextPageUrl });
  }
}
```

## Ecosystem-Specific Request Bodies

Parameters differ by ecosystem:

**EVM:**
```typescript
{
  accountAddress: address,
  startBlock: options?.startBlock,
  endBlock: options?.endBlock,
  v5Format: true,
  excludeSpam: false,
}
```

**SVM (Solana):**
```typescript
{
  accountAddress: address,
  startTimestamp: 0,  // Fetch all (no block range support)
  format: 'v5',
}
```

**UTXO (Bitcoin, etc.):**
```typescript
{
  walletAddress: address,  // Different param name
  startBlock: options?.startBlock,
  endBlock: options?.endBlock,
}
```

## Configuration

**Environment variables:**
```bash
# Noves Async Jobs
NOVES_ASYNC_JOBS_ENABLED=false          # Feature flag
NOVES_JOB_TIMEOUT_HOURS=4               # Max time before marked failed
```

**Config parsing:**
```typescript
noves: {
  apiKey: process.env.NOVES_API_KEY,
  asyncJobs: {
    enabled: process.env.NOVES_ASYNC_JOBS_ENABLED === 'true',
    timeoutHours: parseInt(process.env.NOVES_JOB_TIMEOUT_HOURS || '4'),
  },
},
```

**Async job support check:**
```typescript
const ASYNC_JOB_ECOSYSTEMS: Ecosystem[] = ['evm', 'svm', 'utxo'];

function supportsAsyncJobs(chain: string): boolean {
  const ecosystem = CHAIN_TO_ECOSYSTEM[chain];
  return ASYNC_JOB_ECOSYSTEMS.includes(ecosystem);
}
```

## File Structure

**Modified files:**
```
src/services/reconciliation/providers/noves-provider.ts  # Add async methods
src/services/reconciliation/reconciliation-worker.ts     # Add async flow
src/repositories/reconciliation.repository.ts            # Update for new columns
src/lib/config.ts                                        # Add noves async config
.env.example                                             # Add new env vars
```

**New migration:**
```
src/lib/database/migrations/YYYY_MM_DD_add_noves_job_columns.ts
```

## Testing Approach

### Unit Tests - NovesProvider

- `startAsyncJob` calls correct endpoint per ecosystem
- `startAsyncJob` uses correct params (EVM vs SVM vs UTXO)
- `fetchAsyncJobResults` returns empty on 425
- `fetchAsyncJobResults` returns transactions when ready
- `fetchAsyncJobResults` detects completion (no nextPageUrl)

### Unit Tests - Worker

- Starts Noves job and saves jobId on first process
- Skips processing when Noves returns 425
- Fails job when timeout exceeded
- Completes job when no nextPageUrl returned
- Falls back to sync for unsupported chains (XRPL)

### Integration Tests

- Recovers job after pod restart (continues from saved URL)
- End-to-end async job lifecycle
- Feature flag disables async mode

## Rollout Plan

1. Deploy with `NOVES_ASYNC_JOBS_ENABLED=false`
2. Run migration to add columns
3. Test in staging with flag enabled
4. Enable in production for subset of traffic
5. Monitor for issues
6. Full rollout
7. Remove feature flag (optional, can keep for emergencies)
