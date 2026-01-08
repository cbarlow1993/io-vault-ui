# Reconciliation Full/Partial Modes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add full and partial reconciliation modes with block-based checkpointing, chain-specific reorg thresholds, and scheduled automatic reconciliation.

**Architecture:** Extend existing reconciliation system to support `mode` parameter (full/partial). Partial mode uses `last_reconciled_block` stored on addresses table, with chain-specific reorg buffers. Add scheduled cron for automatic partial reconciliation of all monitored addresses with rate-limited processing.

**Tech Stack:** TypeScript, Kysely (PostgreSQL), Vitest, Zod, Fastify

---

## Task 1: Add Database Migration for Block Tracking

**Files:**
- Create: `services/core/src/lib/database/migrations/2026_01_06_add_reconciliation_block_tracking.ts`
- Modify: `services/core/src/lib/database/types.ts:18-34` (AddressTable)
- Modify: `services/core/src/lib/database/types.ts` (ReconciliationJobTable)

**Step 1: Create migration file**

```typescript
// services/core/src/lib/database/migrations/2026_01_06_add_reconciliation_block_tracking.ts
import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // Add last_reconciled_block to addresses table
  await db.schema
    .alterTable('addresses')
    .addColumn('last_reconciled_block', 'bigint')
    .execute();

  // Add block tracking columns to reconciliation_jobs table
  await db.schema
    .alterTable('reconciliation_jobs')
    .addColumn('mode', 'varchar(10)', (col) => col.notNull().defaultTo('full'))
    .execute();

  await db.schema
    .alterTable('reconciliation_jobs')
    .addColumn('from_block', 'bigint')
    .execute();

  await db.schema
    .alterTable('reconciliation_jobs')
    .addColumn('to_block', 'bigint')
    .execute();

  await db.schema
    .alterTable('reconciliation_jobs')
    .addColumn('final_block', 'bigint')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('reconciliation_jobs')
    .dropColumn('final_block')
    .execute();

  await db.schema
    .alterTable('reconciliation_jobs')
    .dropColumn('to_block')
    .execute();

  await db.schema
    .alterTable('reconciliation_jobs')
    .dropColumn('from_block')
    .execute();

  await db.schema
    .alterTable('reconciliation_jobs')
    .dropColumn('mode')
    .execute();

  await db.schema
    .alterTable('addresses')
    .dropColumn('last_reconciled_block')
    .execute();
}
```

**Step 2: Update AddressTable in types.ts**

Add to `AddressTable` interface after `unmonitored_at`:

```typescript
last_reconciled_block: number | null;
```

**Step 3: Update ReconciliationJobTable in types.ts**

Add to `ReconciliationJobTable` interface after `completed_at`:

```typescript
mode: 'full' | 'partial';
from_block: number | null;
to_block: number | null;
final_block: number | null;
```

**Step 4: Run migration to verify**

```bash
cd services/core && npm run migrate up
```

Expected: Migration applies successfully

**Step 5: Commit**

```bash
git add services/core/src/lib/database/migrations/2026_01_06_add_reconciliation_block_tracking.ts services/core/src/lib/database/types.ts
git commit -m "feat(db): add block tracking columns for reconciliation modes"
```

---

## Task 2: Add Chain Reorg Thresholds Config

**Files:**
- Create: `services/core/src/services/reconciliation/config.ts`
- Create: `services/core/tests/unit/services/reconciliation/config.test.ts`

**Step 1: Write the failing test**

```typescript
// services/core/tests/unit/services/reconciliation/config.test.ts
import { describe, it, expect } from 'vitest';
import { getReorgThreshold, CHAIN_REORG_THRESHOLDS } from '@/services/core/src/services/reconciliation/config';

describe('reconciliation config', () => {
  describe('CHAIN_REORG_THRESHOLDS', () => {
    it('should have threshold for ethereum', () => {
      expect(CHAIN_REORG_THRESHOLDS.ethereum).toBe(32);
    });

    it('should have threshold for bitcoin', () => {
      expect(CHAIN_REORG_THRESHOLDS.bitcoin).toBe(6);
    });

    it('should have threshold for solana', () => {
      expect(CHAIN_REORG_THRESHOLDS.solana).toBe(1);
    });

    it('should have threshold for polygon', () => {
      expect(CHAIN_REORG_THRESHOLDS.polygon).toBe(128);
    });
  });

  describe('getReorgThreshold', () => {
    it('should return configured threshold for known chain', () => {
      expect(getReorgThreshold('ethereum')).toBe(32);
    });

    it('should return default threshold for unknown chain', () => {
      expect(getReorgThreshold('unknown-chain')).toBe(32);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd services/core && npm test -- --run config.test.ts
```

Expected: FAIL - module not found

**Step 3: Write minimal implementation**

```typescript
// services/core/src/services/reconciliation/config.ts

/**
 * Chain-specific reorg thresholds for safe partial reconciliation.
 * These values represent the number of blocks to re-process for reorg protection.
 */
export const CHAIN_REORG_THRESHOLDS: Record<string, number> = {
  // EVM chains
  ethereum: 32,
  polygon: 128,
  arbitrum: 32,
  optimism: 32,
  base: 32,
  avalanche: 32,
  bsc: 32,
  fantom: 32,
  // Non-EVM chains
  bitcoin: 6,
  litecoin: 6,
  dogecoin: 6,
  solana: 1,
  xrpl: 1,
};

/**
 * Default reorg threshold for unknown chains.
 */
const DEFAULT_REORG_THRESHOLD = 32;

/**
 * Gets the reorg threshold for a given chain.
 * Returns default threshold if chain is not configured.
 */
export function getReorgThreshold(chain: string): number {
  return CHAIN_REORG_THRESHOLDS[chain] ?? DEFAULT_REORG_THRESHOLD;
}

/**
 * Rate limiting configuration for reconciliation worker.
 */
export const RECONCILIATION_RATE_LIMIT = {
  tokensPerInterval: 1,
  interval: 'second' as const,
};
```

**Step 4: Run test to verify it passes**

```bash
cd services/core && npm test -- --run config.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add services/core/src/services/reconciliation/config.ts services/core/tests/unit/services/reconciliation/config.test.ts
git commit -m "feat(reconciliation): add chain reorg thresholds config"
```

---

## Task 3: Update Repository Types for Block Tracking

**Files:**
- Modify: `services/core/src/repositories/types.ts:319-395`

**Step 1: Update ReconciliationJob interface**

Add after `completedAt` field (around line 337):

```typescript
mode: 'full' | 'partial';
fromBlock: number | null;
toBlock: number | null;
finalBlock: number | null;
```

**Step 2: Update CreateReconciliationJobInput interface**

Add after `toTimestamp` field (around line 347):

```typescript
mode?: 'full' | 'partial';
fromBlock?: number;
toBlock?: number;
```

**Step 3: Update UpdateReconciliationJobInput interface**

Add after `completedAt` field (around line 359):

```typescript
mode?: 'full' | 'partial';
fromBlock?: number | null;
toBlock?: number | null;
finalBlock?: number | null;
```

**Step 4: Add AddressRepository method**

Add to `AddressRepository` interface (around line 73):

```typescript
findAllMonitored(): Promise<Address[]>;
updateLastReconciledBlock(id: string, block: number): Promise<Address>;
```

**Step 5: Commit**

```bash
git add services/core/src/repositories/types.ts
git commit -m "feat(types): add block tracking fields to reconciliation types"
```

---

## Task 4: Update Address Repository

**Files:**
- Modify: `services/core/src/repositories/address.repository.ts`
- Create: `services/core/tests/unit/repositories/address.repository.test.ts`

**Step 1: Write failing tests**

```typescript
// services/core/tests/unit/repositories/address.repository.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Kysely
const mockExecute = vi.fn();
const mockExecuteTakeFirstOrThrow = vi.fn();
const mockReturningAll = vi.fn(() => ({ executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow }));
const mockWhere = vi.fn(() => ({
  execute: mockExecute,
  returningAll: mockReturningAll,
}));
const mockSet = vi.fn(() => ({ where: mockWhere }));
const mockUpdateTable = vi.fn(() => ({ set: mockSet }));
const mockSelectAll = vi.fn(() => ({ where: mockWhere, execute: mockExecute }));
const mockSelectFrom = vi.fn(() => ({ selectAll: mockSelectAll }));

const mockDb = {
  selectFrom: mockSelectFrom,
  updateTable: mockUpdateTable,
};

import { PostgresAddressRepository } from '@/services/core/src/repositories/address.repository';

describe('PostgresAddressRepository', () => {
  let repository: PostgresAddressRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new PostgresAddressRepository(mockDb as any);
  });

  describe('findAllMonitored', () => {
    it('should return all monitored addresses', async () => {
      const mockAddresses = [
        { id: '1', address: '0x123', is_monitored: true },
        { id: '2', address: '0x456', is_monitored: true },
      ];
      mockExecute.mockResolvedValue(mockAddresses);

      const result = await repository.findAllMonitored();

      expect(result).toEqual(mockAddresses);
      expect(mockSelectFrom).toHaveBeenCalledWith('addresses');
    });
  });

  describe('updateLastReconciledBlock', () => {
    it('should update last_reconciled_block for address', async () => {
      const mockAddress = {
        id: '1',
        address: '0x123',
        last_reconciled_block: 12345678,
      };
      mockExecuteTakeFirstOrThrow.mockResolvedValue(mockAddress);

      const result = await repository.updateLastReconciledBlock('1', 12345678);

      expect(result).toEqual(mockAddress);
      expect(mockUpdateTable).toHaveBeenCalledWith('addresses');
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          last_reconciled_block: 12345678,
        })
      );
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd services/core && npm test -- --run address.repository.test.ts
```

Expected: FAIL - methods not found

**Step 3: Add implementations to address.repository.ts**

Add after `deleteByVaultId` method (around line 318):

```typescript
async findAllMonitored(): Promise<Address[]> {
  return this.db
    .selectFrom('addresses')
    .selectAll()
    .where('is_monitored', '=', true)
    .execute();
}

async updateLastReconciledBlock(id: string, block: number): Promise<Address> {
  return this.db
    .updateTable('addresses')
    .set({
      last_reconciled_block: block,
      updated_at: new Date(),
    })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirstOrThrow();
}
```

**Step 4: Run test to verify it passes**

```bash
cd services/core && npm test -- --run address.repository.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add services/core/src/repositories/address.repository.ts services/core/tests/unit/repositories/address.repository.test.ts
git commit -m "feat(repo): add findAllMonitored and updateLastReconciledBlock methods"
```

---

## Task 5: Update Reconciliation Repository for Block Fields

**Files:**
- Modify: `services/core/src/repositories/reconciliation.repository.ts`
- Modify: `services/core/tests/unit/services/reconciliation/reconciliation-service.test.ts`

**Step 1: Update mapToJob function**

Add after `completedAt` mapping (around line 38):

```typescript
mode: row.mode,
fromBlock: row.from_block,
toBlock: row.to_block,
finalBlock: row.final_block,
```

**Step 2: Update create method**

Add to the `.values()` object (around line 72):

```typescript
mode: input.mode ?? 'full',
from_block: input.fromBlock ?? null,
to_block: input.toBlock ?? null,
```

**Step 3: Update update method**

Add to the conditional updates section (around line 160):

```typescript
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
```

**Step 4: Run existing reconciliation tests**

```bash
cd services/core && npm test -- --run reconciliation
```

Expected: PASS (existing tests still work)

**Step 5: Commit**

```bash
git add services/core/src/repositories/reconciliation.repository.ts
git commit -m "feat(repo): add block tracking fields to reconciliation repository"
```

---

## Task 6: Update API Schemas

**Files:**
- Modify: `services/core/src/routes/reconciliation/schemas.ts`

**Step 1: Update initiateReconciliationBodySchema**

Replace the existing schema (around line 46-49):

```typescript
export const initiateReconciliationBodySchema = z.object({
  mode: z.enum(['full', 'partial']).optional().default('partial'),
  fromBlock: z.coerce.number().int().min(0).optional(),
  toBlock: z.coerce.number().int().min(0).optional(),
  // Legacy timestamp fields (kept for backwards compatibility)
  fromTimestamp: z.coerce.number().optional(),
  toTimestamp: z.coerce.number().optional(),
});
```

**Step 2: Update initiateReconciliationResponseSchema**

Replace the existing schema (around line 72-78):

```typescript
export const initiateReconciliationResponseSchema = z.object({
  jobId: z.string(),
  status: jobStatusSchema,
  mode: z.enum(['full', 'partial']),
  fromBlock: z.number().nullable(),
  toBlock: z.number().nullable(),
  createdAt: z.string(),
  address: z.string(),
  chain: z.string(),
});
```

**Step 3: Update jobDetailResponseSchema**

Add to the schema object (around line 100):

```typescript
mode: z.enum(['full', 'partial']),
fromBlock: z.number().nullable(),
toBlock: z.number().nullable(),
finalBlock: z.number().nullable(),
```

**Step 4: Run type check**

```bash
cd services/core && npx tsc --noEmit
```

Expected: No errors

**Step 5: Commit**

```bash
git add services/core/src/routes/reconciliation/schemas.ts
git commit -m "feat(api): add mode and block fields to reconciliation schemas"
```

---

## Task 7: Update Provider Interface for Block Filtering

**Files:**
- Modify: `services/core/src/services/reconciliation/providers/types.ts`

**Step 1: Update FetchTransactionsOptions interface**

Add after `cursor` field (around line 50):

```typescript
/** Start fetching from this block number (inclusive) */
fromBlock?: number;
/** Stop fetching at this block number (inclusive) */
toBlock?: number;
```

**Step 2: Run type check**

```bash
cd services/core && npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add services/core/src/services/reconciliation/providers/types.ts
git commit -m "feat(provider): add fromBlock/toBlock to FetchTransactionsOptions"
```

---

## Task 8: Update Noves Provider for Block Filtering

**Files:**
- Modify: `services/core/src/services/reconciliation/providers/noves-provider.ts`
- Modify: `services/core/tests/unit/services/reconciliation/noves-provider.test.ts`

**Step 1: Write failing test**

Add to existing noves-provider.test.ts:

```typescript
describe('block filtering', () => {
  it('should pass startBlock to SDK when fromBlock is provided', async () => {
    // ... test implementation
  });

  it('should pass endBlock to SDK when toBlock is provided', async () => {
    // ... test implementation
  });
});
```

**Step 2: Update fetchPage method signature**

Update the method to accept block params (around line 171):

```typescript
private async fetchPage(
  client: NovesClient,
  novesChain: string,
  address: string,
  cursor?: string,
  fromBlock?: number,
  toBlock?: number
): Promise<NovesTransactionsPage> {
  if (cursor) {
    return TransactionsPage.fromCursor(
      client,
      novesChain,
      address,
      cursor
    ) as unknown as Promise<NovesTransactionsPage>;
  }

  return client.getTransactions(novesChain, address, {
    pageSize: 50,
    v5Format: true,
    liveData: true,
    startBlock: fromBlock,
    endBlock: toBlock,
  });
}
```

**Step 3: Update fetchTransactions to pass block params**

Update the call to fetchPage (around line 126):

```typescript
const page = await this.fetchPage(
  client,
  novesChain,
  address,
  cursor,
  options?.fromBlock,
  options?.toBlock
);
```

**Step 4: Run tests**

```bash
cd services/core && npm test -- --run noves-provider.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add services/core/src/services/reconciliation/providers/noves-provider.ts services/core/tests/unit/services/reconciliation/noves-provider.test.ts
git commit -m "feat(noves): add block filtering support to provider"
```

---

## Task 9: Update Reconciliation Service for Modes

**Files:**
- Modify: `services/core/src/services/reconciliation/reconciliation-service.ts`
- Modify: `services/core/tests/unit/services/reconciliation/reconciliation-service.test.ts`

**Step 1: Update CreateJobInput interface**

Add after `toTimestamp` (around line 29):

```typescript
/** Reconciliation mode: full processes all, partial uses checkpoint */
mode?: 'full' | 'partial';
/** Start from this block (full mode only) */
fromBlock?: number;
/** End at this block */
toBlock?: number;
```

**Step 2: Add dependency for AddressRepository**

Update deps interface (around line 13):

```typescript
export interface ReconciliationServiceDeps {
  jobRepository: ReconciliationJobRepository;
  transactionRepository: TransactionRepository;
  addressRepository: AddressRepository;
}
```

**Step 3: Add address repository to constructor**

```typescript
private readonly addressRepository: AddressRepository;

constructor(deps: ReconciliationServiceDeps) {
  this.jobRepository = deps.jobRepository;
  this.transactionRepository = deps.transactionRepository;
  this.addressRepository = deps.addressRepository;
}
```

**Step 4: Update createJob method**

Replace the method (around line 81):

```typescript
async createJob(input: CreateJobInput): Promise<ReconciliationJob> {
  const { chain, network } = await resolveChainNetwork(input.chain);
  const provider = getProviderForChain(chain);

  let mode = input.mode ?? 'partial';
  let fromBlock = input.fromBlock;

  // For partial mode, calculate fromBlock based on checkpoint
  if (mode === 'partial') {
    const address = await this.addressRepository.findByAddressAndChain(
      input.address,
      chain
    );

    if (!address || address.last_reconciled_block === null) {
      // No checkpoint - upgrade to full
      mode = 'full';
      fromBlock = undefined;
    } else {
      const threshold = getReorgThreshold(chain);
      fromBlock = Math.max(0, address.last_reconciled_block - threshold);
    }
  }

  return this.jobRepository.create({
    address: input.address,
    chain,
    network,
    provider: provider.name,
    mode,
    fromBlock,
    toBlock: input.toBlock,
    fromTimestamp: input.fromTimestamp,
    toTimestamp: input.toTimestamp,
  });
}
```

**Step 5: Add import for getReorgThreshold**

```typescript
import { getReorgThreshold } from './config.js';
```

**Step 6: Run tests**

```bash
cd services/core && npm test -- --run reconciliation-service.test.ts
```

Expected: Some tests may fail - update mocks as needed

**Step 7: Commit**

```bash
git add services/core/src/services/reconciliation/reconciliation-service.ts services/core/tests/unit/services/reconciliation/reconciliation-service.test.ts
git commit -m "feat(service): add mode support to reconciliation service"
```

---

## Task 10: Update Reconciliation Worker for Block-Based Processing

**Files:**
- Modify: `services/core/src/services/reconciliation/reconciliation-worker.ts`
- Modify: `services/core/tests/unit/services/reconciliation/reconciliation-worker.test.ts`

**Step 1: Add AddressRepository to deps**

Update deps interface (around line 16):

```typescript
export interface ReconciliationWorkerDeps {
  jobRepository: ReconciliationJobRepository;
  transactionRepository: TransactionRepository;
  addressRepository: AddressRepository;
  transactionProcessor?: TransactionProcessor;
}
```

**Step 2: Add rate limiter**

Add import and property:

```typescript
import { RECONCILIATION_RATE_LIMIT } from './config.js';

// In class:
private readonly addressRepository: AddressRepository;
private requestCount = 0;
private lastRequestTime = 0;
```

**Step 3: Add rate limiting method**

```typescript
private async rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - this.lastRequestTime;

  if (elapsed < 1000) {
    await this.sleep(1000 - elapsed);
  }

  this.lastRequestTime = Date.now();
}
```

**Step 4: Update getProviderTransactions to use block params**

```typescript
private async *getProviderTransactions(job: ReconciliationJob): AsyncGenerator<ProviderTransaction> {
  const provider = getProviderForChain(job.chain);

  for await (const tx of provider.fetchTransactions(job.address, job.chain, job.network, {
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
```

**Step 5: Track finalBlock during processing**

Add to JobProgress interface:

```typescript
finalBlock: number | null;
```

Update processTransaction to track highest block:

```typescript
// After processing each transaction
const blockNumber = parseInt(providerTx.normalized.blockNumber, 10);
if (!isNaN(blockNumber)) {
  if (progress.finalBlock === null || blockNumber > progress.finalBlock) {
    progress.finalBlock = blockNumber;
  }
}
```

**Step 6: Update checkpoint on completion**

In processJob, after marking complete:

```typescript
// Update address checkpoint on successful completion
if (progress.finalBlock !== null) {
  const address = await this.addressRepository.findByAddressAndChain(
    job.address,
    job.chain
  );
  if (address) {
    await this.addressRepository.updateLastReconciledBlock(
      address.id,
      progress.finalBlock
    );
  }
}
```

**Step 7: Update loadLocalTransactions for partial mode**

```typescript
private async loadLocalTransactions(job: ReconciliationJob): Promise<Map<string, Transaction>> {
  const txMap = new Map<string, Transaction>();
  let hasMore = true;
  let cursor: { timestamp: Date; txId: string } | undefined;

  // For partial mode, we could optimize by only loading transactions from fromBlock
  // For now, load all and let comparison handle it

  while (hasMore) {
    const result = await this.transactionRepository.findByChainAndAddress(
      job.chain,
      job.network,
      job.address,
      { cursor, limit: 1000, sort: 'asc' }
    );

    for (const tx of result.data) {
      // In partial mode, only include transactions at or after fromBlock
      if (job.mode === 'partial' && job.fromBlock !== null) {
        const blockNum = parseInt(tx.blockNumber, 10);
        if (!isNaN(blockNum) && blockNum < job.fromBlock) {
          continue;
        }
      }
      txMap.set(tx.txHash.toLowerCase(), tx);
    }

    hasMore = result.hasMore;
    if (result.data.length > 0) {
      const lastTx = result.data[result.data.length - 1];
      cursor = { timestamp: lastTx.timestamp, txId: lastTx.id };
    }
  }

  return txMap;
}
```

**Step 8: Run tests**

```bash
cd services/core && npm test -- --run reconciliation-worker.test.ts
```

Expected: Update tests as needed for new behavior

**Step 9: Commit**

```bash
git add services/core/src/services/reconciliation/reconciliation-worker.ts services/core/tests/unit/services/reconciliation/reconciliation-worker.test.ts
git commit -m "feat(worker): add block-based processing and rate limiting"
```

---

## Task 11: Create Reconciliation Scheduler

**Files:**
- Create: `services/core/src/services/reconciliation/reconciliation-scheduler.ts`
- Create: `services/core/tests/unit/services/reconciliation/reconciliation-scheduler.test.ts`

**Step 1: Write failing test**

```typescript
// services/core/tests/unit/services/reconciliation/reconciliation-scheduler.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AddressRepository } from '@/services/core/src/repositories/types';
import type { ReconciliationService } from '@/services/core/src/services/reconciliation/reconciliation-service';

const createMockAddressRepository = (): AddressRepository => ({
  findAllMonitored: vi.fn(),
  // ... other methods as vi.fn()
} as unknown as AddressRepository);

const createMockReconciliationService = () => ({
  createJob: vi.fn(),
});

import { ReconciliationScheduler } from '@/services/core/src/services/reconciliation/reconciliation-scheduler';

describe('ReconciliationScheduler', () => {
  let addressRepository: ReturnType<typeof createMockAddressRepository>;
  let reconciliationService: ReturnType<typeof createMockReconciliationService>;
  let scheduler: ReconciliationScheduler;

  beforeEach(() => {
    vi.clearAllMocks();
    addressRepository = createMockAddressRepository();
    reconciliationService = createMockReconciliationService();
    scheduler = new ReconciliationScheduler({
      addressRepository,
      reconciliationService: reconciliationService as unknown as ReconciliationService,
    });
  });

  describe('schedulePartialReconciliation', () => {
    it('should create partial reconciliation jobs for all monitored addresses', async () => {
      const mockAddresses = [
        { id: '1', address: '0x123', chain: 'ethereum', is_monitored: true },
        { id: '2', address: '0x456', chain: 'polygon', is_monitored: true },
      ];
      vi.mocked(addressRepository.findAllMonitored).mockResolvedValue(mockAddresses as any);
      vi.mocked(reconciliationService.createJob).mockResolvedValue({} as any);

      await scheduler.schedulePartialReconciliation();

      expect(addressRepository.findAllMonitored).toHaveBeenCalled();
      expect(reconciliationService.createJob).toHaveBeenCalledTimes(2);
      expect(reconciliationService.createJob).toHaveBeenCalledWith({
        address: '0x123',
        chain: 'ethereum',
        mode: 'partial',
      });
      expect(reconciliationService.createJob).toHaveBeenCalledWith({
        address: '0x456',
        chain: 'polygon',
        mode: 'partial',
      });
    });

    it('should handle empty monitored addresses', async () => {
      vi.mocked(addressRepository.findAllMonitored).mockResolvedValue([]);

      await scheduler.schedulePartialReconciliation();

      expect(addressRepository.findAllMonitored).toHaveBeenCalled();
      expect(reconciliationService.createJob).not.toHaveBeenCalled();
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd services/core && npm test -- --run reconciliation-scheduler.test.ts
```

Expected: FAIL - module not found

**Step 3: Write implementation**

```typescript
// services/core/src/services/reconciliation/reconciliation-scheduler.ts
import type { AddressRepository } from '../../repositories/types.js';
import type { ReconciliationService } from './reconciliation-service.js';

export interface ReconciliationSchedulerDeps {
  addressRepository: AddressRepository;
  reconciliationService: ReconciliationService;
}

/**
 * Scheduler for automatic partial reconciliation of all monitored addresses.
 */
export class ReconciliationScheduler {
  private readonly addressRepository: AddressRepository;
  private readonly reconciliationService: ReconciliationService;

  constructor(deps: ReconciliationSchedulerDeps) {
    this.addressRepository = deps.addressRepository;
    this.reconciliationService = deps.reconciliationService;
  }

  /**
   * Creates partial reconciliation jobs for all monitored addresses.
   * This should be called by a cron job on a regular schedule.
   */
  async schedulePartialReconciliation(): Promise<{ scheduled: number; errors: number }> {
    const addresses = await this.addressRepository.findAllMonitored();

    let scheduled = 0;
    let errors = 0;

    for (const address of addresses) {
      try {
        await this.reconciliationService.createJob({
          address: address.address,
          chain: address.chain,
          mode: 'partial',
        });
        scheduled++;
      } catch (error) {
        console.error(
          `Failed to schedule reconciliation for ${address.address} on ${address.chain}:`,
          error
        );
        errors++;
      }
    }

    return { scheduled, errors };
  }
}
```

**Step 4: Run test to verify it passes**

```bash
cd services/core && npm test -- --run reconciliation-scheduler.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add services/core/src/services/reconciliation/reconciliation-scheduler.ts services/core/tests/unit/services/reconciliation/reconciliation-scheduler.test.ts
git commit -m "feat(scheduler): add reconciliation scheduler for automatic partial reconciliation"
```

---

## Task 12: Update Route Handlers

**Files:**
- Modify: `services/core/src/routes/reconciliation/handlers.ts`

**Step 1: Update initiateReconciliation handler**

Update to pass mode and block params to service:

```typescript
export async function initiateReconciliation(
  request: FastifyRequest<{
    Params: InitiateReconciliationPath;
    Body: InitiateReconciliationBody;
  }>,
  reply: FastifyReply
) {
  const { address, chain } = request.params;
  const { mode, fromBlock, toBlock, fromTimestamp, toTimestamp } = request.body;

  const job = await request.reconciliationService.createJob({
    address,
    chain,
    mode,
    fromBlock,
    toBlock,
    fromTimestamp: fromTimestamp ? new Date(fromTimestamp) : undefined,
    toTimestamp: toTimestamp ? new Date(toTimestamp) : undefined,
  });

  return reply.status(202).send({
    jobId: job.id,
    status: job.status,
    mode: job.mode,
    fromBlock: job.fromBlock,
    toBlock: job.toBlock,
    createdAt: job.createdAt.toISOString(),
    address: job.address,
    chain: job.chain,
  });
}
```

**Step 2: Update getJob handler response**

Add mode and block fields to response:

```typescript
return reply.send({
  jobId: job.id,
  status: job.status,
  mode: job.mode,
  fromBlock: job.fromBlock,
  toBlock: job.toBlock,
  finalBlock: job.finalBlock,
  // ... rest of fields
});
```

**Step 3: Run route tests**

```bash
cd services/core && npm test -- --run routes/reconciliation
```

Expected: PASS

**Step 4: Commit**

```bash
git add services/core/src/routes/reconciliation/handlers.ts
git commit -m "feat(routes): update reconciliation handlers for mode support"
```

---

## Task 13: Export New Modules

**Files:**
- Modify: `services/core/src/services/reconciliation/index.ts`

**Step 1: Add exports**

```typescript
export { ReconciliationService } from './reconciliation-service.js';
export type { ReconciliationServiceDeps, CreateJobInput, JobWithAuditLog, JobSummary } from './reconciliation-service.js';

export { ReconciliationWorker } from './reconciliation-worker.js';
export type { ReconciliationWorkerDeps } from './reconciliation-worker.js';

export { ReconciliationScheduler } from './reconciliation-scheduler.js';
export type { ReconciliationSchedulerDeps } from './reconciliation-scheduler.js';

export { getReorgThreshold, CHAIN_REORG_THRESHOLDS, RECONCILIATION_RATE_LIMIT } from './config.js';
```

**Step 2: Run build**

```bash
cd services/core && npm run build
```

Expected: No errors

**Step 3: Commit**

```bash
git add services/core/src/services/reconciliation/index.ts
git commit -m "feat(reconciliation): export scheduler and config modules"
```

---

## Task 14: Integration Test

**Files:**
- Create: `services/core/tests/integration/reconciliation/partial-mode.test.ts`

**Step 1: Write integration test**

```typescript
// services/core/tests/integration/reconciliation/partial-mode.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
// Integration test setup as per project patterns

describe('Reconciliation Partial Mode Integration', () => {
  describe('POST /addresses/:address/chains/:chain/reconcile', () => {
    it('should create partial reconciliation job with default mode', async () => {
      // Test implementation
    });

    it('should auto-upgrade to full when no checkpoint exists', async () => {
      // Test implementation
    });

    it('should use checkpoint for partial mode when available', async () => {
      // Test implementation
    });
  });
});
```

**Step 2: Run integration tests**

```bash
cd services/core && npm run test:integration
```

Expected: PASS

**Step 3: Commit**

```bash
git add services/core/tests/integration/reconciliation/
git commit -m "test(integration): add partial mode reconciliation tests"
```

---

## Task 15: Final Verification and Documentation

**Step 1: Run all tests**

```bash
cd services/core && npm test
```

Expected: All PASS

**Step 2: Run type check**

```bash
cd services/core && npx tsc --noEmit
```

Expected: No errors

**Step 3: Run linter**

```bash
cd services/core && npm run lint
```

Expected: No errors

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(reconciliation): complete full/partial modes implementation

- Add database migration for block tracking columns
- Add chain-specific reorg thresholds configuration
- Update provider interface for block-based filtering
- Update Noves provider to support startBlock/endBlock
- Add mode support to reconciliation service (auto-upgrade partial to full)
- Add rate limiting to worker (1 req/sec)
- Add scheduler for automatic partial reconciliation
- Update API schemas and handlers for mode parameter
- Add comprehensive tests for all new functionality"
```
