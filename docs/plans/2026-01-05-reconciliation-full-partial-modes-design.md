# Reconciliation Full & Partial Modes Design

## Overview

Extend the reconciliation system to support `full` and `partial` modes. Partial reconciliation uses a stored checkpoint (`last_reconciled_block`) to only process recent blocks, with chain-specific reorg buffers for safety. Full reconciliation processes all transactions from genesis.

The system supports both API-driven reconciliation (either mode) and scheduled automatic partial reconciliation for all monitored addresses.

## Requirements

### Functional Requirements

1. API supports `mode: "full" | "partial"` parameter
2. Partial mode starts from `last_reconciled_block - chain_reorg_threshold`
3. If no checkpoint exists, partial auto-upgrades to full
4. Scheduled cron creates partial reconciliation jobs for all monitored addresses
5. Rate-limited worker respects Noves API quotas (1 req/sec)

### Non-Functional Requirements

1. Chain-specific reorg thresholds for correctness
2. Checkpoint only updates on successful job completion
3. Partial mode reduces memory/processing by scoping local transaction queries

## API Design

### Initiate Reconciliation

```
POST /v2/addresses/{address}/chains/{chain}/reconcile
```

**Request Body**:
```json
{
  "mode": "partial",
  "fromBlock": 18500000,
  "toBlock": 18600000
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `mode` | `"full" \| "partial"` | `"partial"` | Reconciliation mode |
| `fromBlock` | `number` | `null` | Override start block (full mode only) |
| `toBlock` | `number` | `null` | Override end block (null = latest) |

**Mode Behavior**:
- `partial` — Start from `last_reconciled_block - reorg_threshold[chain]`. Auto-upgrades to `full` if no checkpoint exists.
- `full` — Process all transactions from genesis (or `fromBlock` if specified).

**Response** (202 Accepted):
```json
{
  "jobId": "rec_abc123",
  "status": "pending",
  "mode": "partial",
  "fromBlock": 18599680,
  "toBlock": null,
  "address": "0x123...",
  "chain": "ethereum"
}
```

### Get Job Status

```
GET /v2/reconciliation-jobs/{jobId}
```

Response includes `mode`, `fromBlock`, `toBlock`, and `finalBlock` fields in addition to existing fields.

## Database Schema

### Address Table Changes

```sql
ALTER TABLE addresses
  ADD COLUMN last_reconciled_block BIGINT DEFAULT NULL;
```

Stores the highest block number successfully processed during the most recent reconciliation. Updated only when a job completes successfully.

### Reconciliation Jobs Table Changes

```sql
ALTER TABLE reconciliation_jobs
  ADD COLUMN mode VARCHAR(10) NOT NULL DEFAULT 'full',
  ADD COLUMN from_block BIGINT,
  ADD COLUMN to_block BIGINT,
  ADD COLUMN final_block BIGINT;
```

| Column | Description |
|--------|-------------|
| `mode` | `'full'` or `'partial'` |
| `from_block` | Starting block for reconciliation scope |
| `to_block` | Ending block (null = latest) |
| `final_block` | Highest block actually processed, used to update checkpoint |

## Chain Reorg Thresholds

Application configuration for chain-specific finality:

```typescript
const CHAIN_REORG_THRESHOLDS: Record<string, number> = {
  ethereum: 32,
  polygon: 128,
  arbitrum: 32,
  base: 32,
  optimism: 32,
  bitcoin: 6,
  solana: 1,
  xrpl: 1,
};
```

These values represent safe block depths to re-process for reorg protection.

## Provider Interface Changes

### FetchTransactionsOptions

```typescript
interface FetchTransactionsOptions {
  fromTimestamp?: Date;
  toTimestamp?: Date;
  fromBlock?: number;    // New
  toBlock?: number;      // New
  cursor?: string;
}
```

### Noves Provider

Pass block parameters to Noves SDK:

```typescript
async *fetchTransactions(
  address: string,
  chain: string,
  network: string,
  options?: FetchTransactionsOptions
): AsyncGenerator<ProviderTransaction> {
  const page = await client.getTransactions(novesChain, address, {
    pageSize: 50,
    startBlock: options?.fromBlock,
    endBlock: options?.toBlock,
  });
  // ... existing pagination logic
}
```

## Reconciliation Worker Changes

### Calculate Start Block

```typescript
function calculateFromBlock(job: ReconciliationJob, address: Address): number | null {
  if (job.mode === 'full') {
    return job.fromBlock ?? null; // null = from genesis
  }

  // Partial mode
  if (address.lastReconciledBlock === null) {
    // No checkpoint - upgrade to full
    job.mode = 'full';
    return null;
  }

  const threshold = CHAIN_REORG_THRESHOLDS[job.chain] ?? 32;
  return Math.max(0, address.lastReconciledBlock - threshold);
}
```

### Process Job Updates

1. Calculate `fromBlock` based on mode and checkpoint
2. Pass `fromBlock`/`toBlock` to provider
3. Track highest block seen during processing (`finalBlock`)
4. On completion, update `addresses.last_reconciled_block` with `finalBlock`
5. Partial mode only loads local transactions from `fromBlock` onward

### Orphan Handling in Partial Mode

- Only transactions with `block_number >= fromBlock` are candidates for orphan detection
- Transactions in older blocks remain untouched (already reconciled)

## Scheduled Reconciliation

### Cron Job

Runs on a configurable schedule (default: daily at 2am):

```typescript
async function schedulePartialReconciliation(): Promise<void> {
  const addresses = await addressRepository.findAllMonitored();

  for (const address of addresses) {
    await reconciliationService.createJob({
      address: address.address,
      chain: address.chain,
      mode: 'partial',
    });
  }
}
```

### Rate-Limited Worker

Controls Noves API usage at 1 request per second:

```typescript
class ReconciliationWorker {
  private readonly rateLimiter: RateLimiter;

  constructor(deps: ReconciliationWorkerDeps) {
    this.rateLimiter = new RateLimiter({
      tokensPerInterval: 1,
      interval: 'second',
    });
  }

  private async *getProviderTransactions(job: ReconciliationJob) {
    for await (const tx of provider.fetchTransactions(...)) {
      await this.rateLimiter.removeTokens(1);
      yield tx;
    }
  }
}
```

### Configuration

Environment variables:

```
RECONCILIATION_CRON_SCHEDULE=0 2 * * *   # Daily at 2am
RECONCILIATION_RATE_LIMIT=1              # Requests per second
RECONCILIATION_ENABLED=true              # Kill switch
```

## Error Handling

### Job Failure

- `last_reconciled_block` only updates on successful completion
- Failed/paused jobs do not update the checkpoint
- Retrying a failed partial job re-processes from the same starting point

### Auto-upgrade Behavior

When partial mode is requested but no `last_reconciled_block` exists:
1. Job is automatically upgraded to full mode
2. `mode` field is updated to `'full'` in the job record
3. Processing continues from genesis

## File Structure

```
services/core/src/
├── lib/
│   └── database/
│       └── migrations/
│           └── XXXX_add_reconciliation_block_tracking.sql
├── services/
│   └── reconciliation/
│       ├── reconciliation-worker.ts      # Add block-based logic, rate limiter
│       ├── reconciliation-scheduler.ts   # New: cron job for scheduled partial
│       ├── config.ts                     # New: chain thresholds, rate limits
│       └── providers/
│           └── types.ts                  # Add fromBlock/toBlock to options
│           └── noves-provider.ts         # Pass block params to SDK
├── repositories/
│   └── address.repository.ts             # Add updateLastReconciledBlock()
├── routes/
│   └── reconciliation/
│       └── schemas.ts                    # Add mode, fromBlock, toBlock
├── plugins/
│   └── reconciliation-scheduler.ts       # New: Fastify plugin for cron
```

## Migration

```sql
-- Add block tracking to addresses
ALTER TABLE addresses
  ADD COLUMN last_reconciled_block BIGINT DEFAULT NULL;

-- Add block tracking to reconciliation jobs
ALTER TABLE reconciliation_jobs
  ADD COLUMN mode VARCHAR(10) NOT NULL DEFAULT 'full',
  ADD COLUMN from_block BIGINT,
  ADD COLUMN to_block BIGINT,
  ADD COLUMN final_block BIGINT;
```
