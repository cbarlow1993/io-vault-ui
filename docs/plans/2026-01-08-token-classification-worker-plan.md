# Token Classification Worker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement background worker to classify tokens after upsert with TTL-based re-classification and error tracking.

**Architecture:** Tokens flagged `needs_classification = true` at upsert time. Background cron worker (every 15 mins) queries unclassified tokens, classifies them one-by-one via `SpamClassificationService`, and updates results. Failed attempts are tracked with retry limits.

**Tech Stack:** Kysely (PostgreSQL), node-cron, Fastify plugins, Vitest

**Design Doc:** `docs/plans/2026-01-08-token-classification-worker-design.md`

---

## Task 1: Database Migration

**Files:**
- Create: `src/lib/database/migrations/2026_01_08_add_token_classification_tracking.ts`

**Step 1: Write the migration up function**

```typescript
import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // Add classification tracking columns
  await db.schema
    .alterTable('tokens')
    .addColumn('needs_classification', 'boolean', (col) => col.defaultTo(true).notNull())
    .execute();

  await db.schema
    .alterTable('tokens')
    .addColumn('classification_attempts', 'integer', (col) => col.defaultTo(0).notNull())
    .execute();

  await db.schema
    .alterTable('tokens')
    .addColumn('classification_error', 'text')
    .execute();

  // Create partial index for worker queries
  await db.schema
    .createIndex('idx_tokens_needs_classification')
    .on('tokens')
    .columns(['needs_classification', 'classification_attempts'])
    .where('needs_classification', '=', true)
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .dropIndex('idx_tokens_needs_classification')
    .execute();

  await db.schema
    .alterTable('tokens')
    .dropColumn('classification_error')
    .execute();

  await db.schema
    .alterTable('tokens')
    .dropColumn('classification_attempts')
    .execute();

  await db.schema
    .alterTable('tokens')
    .dropColumn('needs_classification')
    .execute();
}
```

**Step 2: Run migration**

Run: `npm run db:migrate`
Expected: Migration applies successfully

**Step 3: Commit**

```bash
git add src/lib/database/migrations/2026_01_08_add_token_classification_tracking.ts
git commit -m "feat(db): add token classification tracking columns"
```

---

## Task 2: Update Database Types

**Files:**
- Modify: `src/lib/database/types.ts:125-141` (TokenTable interface)

**Step 1: Add new columns to TokenTable**

Add these fields to the `TokenTable` interface after `classification_ttl_hours`:

```typescript
export interface TokenTable {
  // ... existing fields ...
  classification_ttl_hours: number | null;
  needs_classification: boolean;
  classification_attempts: number;
  classification_error: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string | undefined>;
}
```

**Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/lib/database/types.ts
git commit -m "feat(types): add token classification tracking to TokenTable"
```

---

## Task 3: Update Repository Types

**Files:**
- Modify: `src/repositories/types.ts:140-153` (Token interface)

**Step 1: Extend Token interface with classification fields**

```typescript
export interface Token {
  id: string;
  chainAlias: ChainAlias;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoUri: string | null;
  coingeckoId: string | null;
  isVerified: boolean;
  isSpam: boolean;
  // Classification fields
  spamClassification: SpamClassification | null;
  classificationUpdatedAt: Date | null;
  classificationTtlHours: number;
  needsClassification: boolean;
  classificationAttempts: number;
  classificationError: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

**Step 2: Add SpamClassification import**

At the top of the file, add:

```typescript
import type { SpamClassification } from '@/src/lib/database/types.js';
```

**Step 3: Extend TokenRepository interface with new methods**

Add after `upsertMany`:

```typescript
export interface TokenRepository {
  // ... existing methods ...

  // Classification worker methods
  findNeedingClassification(options: {
    limit: number;
    maxAttempts: number;
  }): Promise<Token[]>;

  refreshExpiredClassifications(ttlHours: number): Promise<number>;

  updateClassificationSuccess(
    tokenId: string,
    classification: SpamClassification
  ): Promise<void>;

  updateClassificationFailure(
    tokenId: string,
    errorMessage: string
  ): Promise<void>;
}
```

**Step 4: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: Type errors in token.repository.ts (expected - we'll fix in next task)

**Step 5: Commit**

```bash
git add src/repositories/types.ts
git commit -m "feat(types): add classification methods to TokenRepository"
```

---

## Task 4: Update Token Repository - Map Function

**Files:**
- Modify: `src/repositories/token.repository.ts:10-25` (mapToToken function)
- Test: `tests/unit/repositories/token.repository.test.ts`

**Step 1: Write failing test for mapToToken with classification fields**

Add to `tests/unit/repositories/token.repository.test.ts` in the `findById` describe block:

```typescript
it('should map classification fields correctly', async () => {
  const now = new Date();
  const spamClassification = {
    blockaid: null,
    coingecko: { isListed: true, marketCapRank: 100 },
    heuristics: {
      suspiciousName: false,
      namePatterns: [],
      isUnsolicited: false,
      contractAgeDays: 365,
      isNewContract: false,
      holderDistribution: 'normal' as const,
    },
  };

  const expectedToken = {
    id: 'token-uuid-1',
    chain_alias: 'eth' as ChainAlias,
    address: '0xtoken123',
    name: 'Test Token',
    symbol: 'TKN',
    decimals: 18,
    logo_uri: null,
    coingecko_id: 'test-token',
    is_verified: true,
    is_spam: false,
    spam_classification: spamClassification,
    classification_updated_at: now,
    classification_ttl_hours: 720,
    needs_classification: false,
    classification_attempts: 0,
    classification_error: null,
    created_at: now,
    updated_at: now,
  };

  mockDb.mockExecuteTakeFirst.mockResolvedValue(expectedToken);

  const result = await repository.findById('token-uuid-1');

  expect(result?.spamClassification).toEqual(spamClassification);
  expect(result?.classificationUpdatedAt).toEqual(now);
  expect(result?.classificationTtlHours).toBe(720);
  expect(result?.needsClassification).toBe(false);
  expect(result?.classificationAttempts).toBe(0);
  expect(result?.classificationError).toBeNull();
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/repositories/token.repository.test.ts`
Expected: FAIL - missing classification fields in mapToToken

**Step 3: Update mapToToken function**

```typescript
function mapToToken(row: TokenRow): Token {
  return {
    id: row.id,
    chainAlias: row.chain_alias as ChainAlias,
    address: row.address,
    name: row.name,
    symbol: row.symbol,
    decimals: row.decimals,
    logoUri: row.logo_uri,
    coingeckoId: row.coingecko_id,
    isVerified: row.is_verified,
    isSpam: row.is_spam,
    spamClassification: row.spam_classification ?? null,
    classificationUpdatedAt: row.classification_updated_at as Date | null,
    classificationTtlHours: row.classification_ttl_hours ?? 720,
    needsClassification: row.needs_classification,
    classificationAttempts: row.classification_attempts,
    classificationError: row.classification_error,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/repositories/token.repository.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/repositories/token.repository.ts tests/unit/repositories/token.repository.test.ts
git commit -m "feat(repo): add classification fields to token mapping"
```

---

## Task 5: Token Repository - findNeedingClassification

**Files:**
- Modify: `src/repositories/token.repository.ts`
- Test: `tests/unit/repositories/token.repository.test.ts`

**Step 1: Write failing test**

Add new describe block:

```typescript
describe('findNeedingClassification', () => {
  it('should find tokens needing classification with limit and maxAttempts', async () => {
    const tokens = [
      {
        id: 'token-1',
        chain_alias: 'eth' as ChainAlias,
        address: '0xtoken1',
        name: 'Token One',
        symbol: 'T1',
        decimals: 18,
        logo_uri: null,
        coingecko_id: null,
        is_verified: false,
        is_spam: false,
        spam_classification: null,
        classification_updated_at: null,
        classification_ttl_hours: 720,
        needs_classification: true,
        classification_attempts: 0,
        classification_error: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    mockDb.mockExecute.mockResolvedValue(tokens);

    const result = await repository.findNeedingClassification({
      limit: 50,
      maxAttempts: 5,
    });

    expect(mockDb.mockDb.selectFrom).toHaveBeenCalledWith('tokens');
    expect(mockDb.chainable.where).toHaveBeenCalledWith('needs_classification', '=', true);
    expect(mockDb.chainable.limit).toHaveBeenCalledWith(50);
    expect(result).toHaveLength(1);
    expect(result[0]!.needsClassification).toBe(true);
  });

  it('should return empty array when no tokens need classification', async () => {
    mockDb.mockExecute.mockResolvedValue([]);

    const result = await repository.findNeedingClassification({
      limit: 50,
      maxAttempts: 5,
    });

    expect(result).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/repositories/token.repository.test.ts`
Expected: FAIL - method not defined

**Step 3: Implement findNeedingClassification**

Add to `PostgresTokenRepository`:

```typescript
async findNeedingClassification(options: {
  limit: number;
  maxAttempts: number;
}): Promise<Token[]> {
  const results = await this.db
    .selectFrom('tokens')
    .selectAll()
    .where('needs_classification', '=', true)
    .where('classification_attempts', '<', options.maxAttempts)
    .orderBy('classification_updated_at', 'asc')
    .orderBy('created_at', 'asc')
    .limit(options.limit)
    .execute();

  return results.map(mapToToken);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/repositories/token.repository.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/repositories/token.repository.ts tests/unit/repositories/token.repository.test.ts
git commit -m "feat(repo): add findNeedingClassification method"
```

---

## Task 6: Token Repository - refreshExpiredClassifications

**Files:**
- Modify: `src/repositories/token.repository.ts`
- Test: `tests/unit/repositories/token.repository.test.ts`

**Step 1: Write failing test**

```typescript
describe('refreshExpiredClassifications', () => {
  it('should return number of refreshed tokens', async () => {
    mockDb.mockExecute.mockResolvedValue([{ numUpdatedRows: BigInt(5) }]);

    const result = await repository.refreshExpiredClassifications(720);

    expect(mockDb.mockDb.updateTable).toHaveBeenCalledWith('tokens');
    expect(result).toBe(5);
  });

  it('should return 0 when no tokens expired', async () => {
    mockDb.mockExecute.mockResolvedValue([{ numUpdatedRows: BigInt(0) }]);

    const result = await repository.refreshExpiredClassifications(720);

    expect(result).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/repositories/token.repository.test.ts`
Expected: FAIL - method not defined

**Step 3: Implement refreshExpiredClassifications**

Add import at top:

```typescript
import { type Kysely, sql } from 'kysely';
```

Add method:

```typescript
async refreshExpiredClassifications(ttlHours: number): Promise<number> {
  const result = await this.db
    .updateTable('tokens')
    .set({
      needs_classification: true,
      classification_attempts: 0,
    })
    .where('needs_classification', '=', false)
    .where(
      sql`classification_updated_at + (classification_ttl_hours * interval '1 hour')`,
      '<',
      sql`NOW()`
    )
    .executeTakeFirst();

  return Number(result.numUpdatedRows ?? 0);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/repositories/token.repository.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/repositories/token.repository.ts tests/unit/repositories/token.repository.test.ts
git commit -m "feat(repo): add refreshExpiredClassifications method"
```

---

## Task 7: Token Repository - updateClassificationSuccess

**Files:**
- Modify: `src/repositories/token.repository.ts`
- Test: `tests/unit/repositories/token.repository.test.ts`

**Step 1: Write failing test**

```typescript
describe('updateClassificationSuccess', () => {
  it('should update token with classification data', async () => {
    const classification = {
      blockaid: null,
      coingecko: { isListed: true, marketCapRank: 100 },
      heuristics: {
        suspiciousName: false,
        namePatterns: [],
        isUnsolicited: false,
        contractAgeDays: 365,
        isNewContract: false,
        holderDistribution: 'normal' as const,
      },
    };

    mockDb.mockExecute.mockResolvedValue([{ numUpdatedRows: BigInt(1) }]);

    await repository.updateClassificationSuccess('token-123', classification);

    expect(mockDb.mockDb.updateTable).toHaveBeenCalledWith('tokens');
    expect(mockDb.chainable.where).toHaveBeenCalledWith('id', '=', 'token-123');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/repositories/token.repository.test.ts`
Expected: FAIL - method not defined

**Step 3: Implement updateClassificationSuccess**

Add import for SpamClassification:

```typescript
import type { Database, Token as TokenRow, SpamClassification } from '@/src/lib/database/types.js';
```

Add method:

```typescript
async updateClassificationSuccess(
  tokenId: string,
  classification: SpamClassification
): Promise<void> {
  const now = new Date().toISOString();

  await this.db
    .updateTable('tokens')
    .set({
      spam_classification: JSON.stringify(classification),
      classification_updated_at: now,
      needs_classification: false,
      classification_attempts: 0,
      classification_error: null,
      updated_at: now,
    })
    .where('id', '=', tokenId)
    .execute();
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/repositories/token.repository.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/repositories/token.repository.ts tests/unit/repositories/token.repository.test.ts
git commit -m "feat(repo): add updateClassificationSuccess method"
```

---

## Task 8: Token Repository - updateClassificationFailure

**Files:**
- Modify: `src/repositories/token.repository.ts`
- Test: `tests/unit/repositories/token.repository.test.ts`

**Step 1: Write failing test**

```typescript
describe('updateClassificationFailure', () => {
  it('should increment attempts and store error', async () => {
    mockDb.mockExecute.mockResolvedValue([{ numUpdatedRows: BigInt(1) }]);

    await repository.updateClassificationFailure('token-123', 'API timeout');

    expect(mockDb.mockDb.updateTable).toHaveBeenCalledWith('tokens');
    expect(mockDb.chainable.where).toHaveBeenCalledWith('id', '=', 'token-123');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/repositories/token.repository.test.ts`
Expected: FAIL - method not defined

**Step 3: Implement updateClassificationFailure**

```typescript
async updateClassificationFailure(
  tokenId: string,
  errorMessage: string
): Promise<void> {
  const now = new Date().toISOString();

  await this.db
    .updateTable('tokens')
    .set({
      classification_attempts: sql`classification_attempts + 1`,
      classification_error: errorMessage,
      updated_at: now,
    })
    .where('id', '=', tokenId)
    .execute();
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/repositories/token.repository.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/repositories/token.repository.ts tests/unit/repositories/token.repository.test.ts
git commit -m "feat(repo): add updateClassificationFailure method"
```

---

## Task 9: Update Upserter - Set needs_classification on Insert

**Files:**
- Modify: `src/services/transaction-processor/upserter.ts:74-98`

**Step 1: Update upsertToken insert values**

In the `upsertToken` method, update the insert values to include:

```typescript
await trx
  .insertInto('tokens')
  .values({
    id: uuidv4(),
    chain_alias: chainAlias,
    address: token.address,
    name: token.name ?? 'Unknown',
    symbol: token.symbol ?? 'UNKNOWN',
    decimals: token.decimals ?? 18,
    logo_uri: null,
    coingecko_id: null,
    is_verified: false,
    is_spam: false,
    needs_classification: true,
    classification_attempts: 0,
    classification_error: null,
    created_at: now,
    updated_at: now,
  })
  .onConflict((oc) =>
    oc.columns(['chain_alias', 'address']).doUpdateSet({
      name: token.name ?? 'Unknown',
      symbol: token.symbol ?? 'UNKNOWN',
      decimals: token.decimals ?? 18,
      updated_at: now,
      // Note: Do NOT update classification fields on conflict
    })
  )
  .execute();
```

**Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/services/transaction-processor/upserter.ts
git commit -m "feat(upserter): flag tokens for classification on insert"
```

---

## Task 10: Add Config for Token Classification

**Files:**
- Modify: `src/lib/config.ts`

**Step 1: Add tokenClassification schema**

Add after the `reconciliation` schema (around line 85):

```typescript
tokenClassification: z.object({
  scheduler: z.object({
    enabled: booleanFromString.default(true),
    cronSchedule: z.string().default('*/15 * * * *'),
    batchSize: z.coerce.number().default(50),
    maxAttempts: z.coerce.number().default(5),
  }),
  ttlHours: z.coerce.number().default(720),
}),
```

**Step 2: Add environment variable loading**

In the `loadConfig` function, add after `reconciliation`:

```typescript
tokenClassification: {
  scheduler: {
    enabled: process.env.TOKEN_CLASSIFICATION_SCHEDULER_ENABLED,
    cronSchedule: process.env.TOKEN_CLASSIFICATION_CRON_SCHEDULE,
    batchSize: process.env.TOKEN_CLASSIFICATION_BATCH_SIZE,
    maxAttempts: process.env.TOKEN_CLASSIFICATION_MAX_ATTEMPTS,
  },
  ttlHours: process.env.TOKEN_CLASSIFICATION_TTL_HOURS,
},
```

**Step 3: Verify config loads**

Run: `npm run typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/config.ts
git commit -m "feat(config): add token classification scheduler settings"
```

---

## Task 11: Create Token Classification Worker Service

**Files:**
- Create: `src/services/token-classification/token-classification-worker.ts`
- Create: `tests/unit/services/token-classification/token-classification-worker.test.ts`

**Step 1: Write failing test**

Create `tests/unit/services/token-classification/token-classification-worker.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokenClassificationWorker } from '@/src/services/token-classification/token-classification-worker.js';
import type { TokenRepository, Token } from '@/src/repositories/types.js';
import type { SpamClassificationService } from '@/src/services/spam/spam-classification-service.js';
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

describe('TokenClassificationWorker', () => {
  let mockTokenRepository: {
    findNeedingClassification: ReturnType<typeof vi.fn>;
    refreshExpiredClassifications: ReturnType<typeof vi.fn>;
    updateClassificationSuccess: ReturnType<typeof vi.fn>;
    updateClassificationFailure: ReturnType<typeof vi.fn>;
  };
  let mockClassificationService: {
    classifyToken: ReturnType<typeof vi.fn>;
  };
  let worker: TokenClassificationWorker;

  const createMockToken = (overrides: Partial<Token> = {}): Token => ({
    id: 'token-1',
    chainAlias: 'eth' as ChainAlias,
    address: '0xtoken1',
    name: 'Test Token',
    symbol: 'TKN',
    decimals: 18,
    logoUri: null,
    coingeckoId: null,
    isVerified: false,
    isSpam: false,
    spamClassification: null,
    classificationUpdatedAt: null,
    classificationTtlHours: 720,
    needsClassification: true,
    classificationAttempts: 0,
    classificationError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    mockTokenRepository = {
      findNeedingClassification: vi.fn(),
      refreshExpiredClassifications: vi.fn(),
      updateClassificationSuccess: vi.fn(),
      updateClassificationFailure: vi.fn(),
    };

    mockClassificationService = {
      classifyToken: vi.fn(),
    };

    worker = new TokenClassificationWorker({
      tokenRepository: mockTokenRepository as unknown as TokenRepository,
      classificationService: mockClassificationService as unknown as SpamClassificationService,
      batchSize: 50,
      maxAttempts: 5,
      ttlHours: 720,
    });
  });

  describe('run', () => {
    it('should refresh expired classifications first', async () => {
      mockTokenRepository.refreshExpiredClassifications.mockResolvedValue(3);
      mockTokenRepository.findNeedingClassification.mockResolvedValue([]);

      const result = await worker.run();

      expect(mockTokenRepository.refreshExpiredClassifications).toHaveBeenCalledWith(720);
      expect(result.refreshed).toBe(3);
    });

    it('should classify tokens and update on success', async () => {
      const token = createMockToken();
      const classification = {
        blockaid: null,
        coingecko: { isListed: true, marketCapRank: 100 },
        heuristics: {
          suspiciousName: false,
          namePatterns: [],
          isUnsolicited: false,
          contractAgeDays: 365,
          isNewContract: false,
          holderDistribution: 'normal' as const,
        },
      };

      mockTokenRepository.refreshExpiredClassifications.mockResolvedValue(0);
      mockTokenRepository.findNeedingClassification.mockResolvedValue([token]);
      mockClassificationService.classifyToken.mockResolvedValue({
        tokenAddress: token.address,
        classification,
        updatedAt: new Date(),
      });

      const result = await worker.run();

      expect(mockClassificationService.classifyToken).toHaveBeenCalled();
      expect(mockTokenRepository.updateClassificationSuccess).toHaveBeenCalledWith(
        token.id,
        classification
      );
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should handle classification failure and update error', async () => {
      const token = createMockToken();

      mockTokenRepository.refreshExpiredClassifications.mockResolvedValue(0);
      mockTokenRepository.findNeedingClassification.mockResolvedValue([token]);
      mockClassificationService.classifyToken.mockRejectedValue(new Error('API timeout'));

      const result = await worker.run();

      expect(mockTokenRepository.updateClassificationFailure).toHaveBeenCalledWith(
        token.id,
        'API timeout'
      );
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(1);
    });

    it('should process multiple tokens independently', async () => {
      const token1 = createMockToken({ id: 'token-1' });
      const token2 = createMockToken({ id: 'token-2' });
      const classification = {
        blockaid: null,
        coingecko: { isListed: true, marketCapRank: null },
        heuristics: {
          suspiciousName: false,
          namePatterns: [],
          isUnsolicited: false,
          contractAgeDays: null,
          isNewContract: false,
          holderDistribution: 'unknown' as const,
        },
      };

      mockTokenRepository.refreshExpiredClassifications.mockResolvedValue(0);
      mockTokenRepository.findNeedingClassification.mockResolvedValue([token1, token2]);
      mockClassificationService.classifyToken
        .mockResolvedValueOnce({ tokenAddress: token1.address, classification, updatedAt: new Date() })
        .mockRejectedValueOnce(new Error('Failed'));

      const result = await worker.run();

      expect(mockTokenRepository.updateClassificationSuccess).toHaveBeenCalledTimes(1);
      expect(mockTokenRepository.updateClassificationFailure).toHaveBeenCalledTimes(1);
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/services/token-classification/token-classification-worker.test.ts`
Expected: FAIL - module not found

**Step 3: Implement TokenClassificationWorker**

Create `src/services/token-classification/token-classification-worker.ts`:

```typescript
import { logger } from '@/utils/powertools.js';
import type { TokenRepository, Token } from '@/src/repositories/types.js';
import type { SpamClassificationService } from '@/src/services/spam/spam-classification-service.js';
import type { ClassificationResult } from '@/src/services/spam/types.js';

export interface TokenClassificationWorkerOptions {
  tokenRepository: TokenRepository;
  classificationService: SpamClassificationService;
  batchSize: number;
  maxAttempts: number;
  ttlHours: number;
}

export interface WorkerResult {
  refreshed: number;
  processed: number;
  succeeded: number;
  failed: number;
}

export class TokenClassificationWorker {
  constructor(private readonly options: TokenClassificationWorkerOptions) {}

  async run(): Promise<WorkerResult> {
    // 1. Refresh expired classifications
    const refreshed = await this.options.tokenRepository.refreshExpiredClassifications(
      this.options.ttlHours
    );

    if (refreshed > 0) {
      logger.info('Refreshed expired token classifications', { count: refreshed });
    }

    // 2. Fetch tokens needing classification
    const tokens = await this.options.tokenRepository.findNeedingClassification({
      limit: this.options.batchSize,
      maxAttempts: this.options.maxAttempts,
    });

    if (tokens.length === 0) {
      return { refreshed, processed: 0, succeeded: 0, failed: 0 };
    }

    logger.info('Processing tokens for classification', { count: tokens.length });

    // 3. Classify tokens one by one
    let succeeded = 0;
    let failed = 0;

    for (const token of tokens) {
      try {
        const result = await this.classifyToken(token);
        await this.options.tokenRepository.updateClassificationSuccess(
          token.id,
          result.classification
        );
        succeeded++;

        logger.debug('Token classified successfully', {
          tokenId: token.id,
          address: token.address,
          chainAlias: token.chainAlias,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await this.options.tokenRepository.updateClassificationFailure(token.id, errorMessage);
        failed++;

        logger.warn('Token classification failed', {
          tokenId: token.id,
          address: token.address,
          chainAlias: token.chainAlias,
          error: errorMessage,
          attempts: token.classificationAttempts + 1,
        });
      }
    }

    return { refreshed, processed: tokens.length, succeeded, failed };
  }

  private async classifyToken(token: Token): Promise<ClassificationResult> {
    return this.options.classificationService.classifyToken({
      chain: token.chainAlias,
      network: token.chainAlias,
      address: token.address,
      name: token.name,
      symbol: token.symbol,
      coingeckoId: token.coingeckoId,
    });
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/services/token-classification/token-classification-worker.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/token-classification/token-classification-worker.ts tests/unit/services/token-classification/token-classification-worker.test.ts
git commit -m "feat(worker): implement TokenClassificationWorker service"
```

---

## Task 12: Create Token Classification Cron Plugin

**Files:**
- Create: `src/plugins/token-classification-cron.ts`
- Create: `tests/unit/plugins/token-classification-cron.test.ts`

**Step 1: Write failing test**

Create `tests/unit/plugins/token-classification-cron.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

// Mock node-cron
vi.mock('node-cron', () => ({
  default: {
    validate: vi.fn().mockReturnValue(true),
    schedule: vi.fn().mockReturnValue({
      stop: vi.fn(),
    }),
  },
}));

// Mock config
vi.mock('@/src/lib/config.js', () => ({
  config: {
    tokenClassification: {
      scheduler: {
        enabled: true,
        cronSchedule: '*/15 * * * *',
        batchSize: 50,
        maxAttempts: 5,
      },
      ttlHours: 720,
    },
  },
}));

// Mock scheduler lock
vi.mock('@/src/services/reconciliation/scheduler-lock.js', () => ({
  acquireSchedulerLock: vi.fn().mockResolvedValue(true),
  releaseSchedulerLock: vi.fn().mockResolvedValue(undefined),
}));

describe('token-classification-cron plugin', () => {
  let fastify: FastifyInstance;

  beforeEach(async () => {
    fastify = Fastify();

    // Mock database
    fastify.decorate('db', {});

    // Mock repositories
    fastify.decorate('repositories', {
      tokens: {
        findNeedingClassification: vi.fn().mockResolvedValue([]),
        refreshExpiredClassifications: vi.fn().mockResolvedValue(0),
        updateClassificationSuccess: vi.fn(),
        updateClassificationFailure: vi.fn(),
      },
    });
  });

  afterEach(async () => {
    await fastify.close();
  });

  it('should register plugin when scheduler is enabled', async () => {
    const { default: plugin } = await import('@/src/plugins/token-classification-cron.js');

    await fastify.register(plugin);
    await fastify.ready();

    const cron = await import('node-cron');
    expect(cron.default.schedule).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/plugins/token-classification-cron.test.ts`
Expected: FAIL - module not found

**Step 3: Implement token-classification-cron plugin**

Create `src/plugins/token-classification-cron.ts`:

```typescript
import cron from 'node-cron';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { logger } from '@/utils/powertools.js';
import { config } from '@/src/lib/config.js';
import { TokenClassificationWorker } from '@/src/services/token-classification/token-classification-worker.js';
import { SpamClassificationService } from '@/src/services/spam/spam-classification-service.js';
import { BlockaidProvider } from '@/src/services/spam/providers/blockaid-provider.js';
import { CoingeckoProvider } from '@/src/services/spam/providers/coingecko-provider.js';
import { HeuristicsProvider } from '@/src/services/spam/providers/heuristics-provider.js';
import {
  acquireSchedulerLock,
  releaseSchedulerLock,
} from '@/src/services/reconciliation/scheduler-lock.js';
import type { Kysely } from 'kysely';
import type { Database } from '@/src/lib/database/types.js';

const LOCK_NAME = 'token_classification_scheduler';

/**
 * Runs the token classification worker with distributed locking.
 * Exported for testing.
 */
export async function runTokenClassificationWorker(
  db: Kysely<Database>,
  worker: TokenClassificationWorker
): Promise<void> {
  let lockAcquired = false;

  try {
    lockAcquired = await acquireSchedulerLock(db, LOCK_NAME);

    if (!lockAcquired) {
      logger.info('Another instance is running the token classification worker, skipping');
      return;
    }

    const startTime = Date.now();
    const result = await worker.run();
    const durationMs = Date.now() - startTime;

    logger.info('Token classification worker completed', {
      ...result,
      durationMs,
    });
  } catch (error) {
    logger.error('Token classification worker failed', { error });
  } finally {
    if (lockAcquired) {
      try {
        await releaseSchedulerLock(db, LOCK_NAME);
      } catch (unlockError) {
        logger.error('Failed to release token classification lock', { error: unlockError });
      }
    }
  }
}

async function tokenClassificationCronPlugin(fastify: FastifyInstance) {
  if (!config.tokenClassification.scheduler.enabled) {
    fastify.log.info('Token classification scheduler disabled');
    return;
  }

  const db = fastify.db;
  if (!db) {
    fastify.log.warn('Database not available, skipping token classification scheduler registration');
    return;
  }

  const cronSchedule = config.tokenClassification.scheduler.cronSchedule;

  if (!cron.validate(cronSchedule)) {
    fastify.log.error(`Invalid cron schedule: ${cronSchedule}`);
    return;
  }

  // Create classification service with providers
  const providers = [
    new BlockaidProvider(),
    new CoingeckoProvider(),
    new HeuristicsProvider(),
  ];
  const classificationService = new SpamClassificationService(providers);

  // Create worker
  const worker = new TokenClassificationWorker({
    tokenRepository: fastify.repositories.tokens,
    classificationService,
    batchSize: config.tokenClassification.scheduler.batchSize,
    maxAttempts: config.tokenClassification.scheduler.maxAttempts,
    ttlHours: config.tokenClassification.ttlHours,
  });

  fastify.log.info(`Scheduling token classification cron job with schedule: ${cronSchedule}`);

  const task = cron.schedule(
    cronSchedule,
    async () => {
      fastify.log.info('Token classification cron job triggered');
      await runTokenClassificationWorker(db, worker);
    },
    {
      timezone: 'UTC',
    }
  );

  // Stop cron on server close
  fastify.addHook('onClose', async () => {
    fastify.log.info('Stopping token classification cron job');
    task.stop();
  });
}

export default fp(tokenClassificationCronPlugin, {
  name: 'token-classification-cron',
  dependencies: ['database'],
});
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/plugins/token-classification-cron.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/plugins/token-classification-cron.ts tests/unit/plugins/token-classification-cron.test.ts
git commit -m "feat(plugin): implement token classification cron scheduler"
```

---

## Task 13: Update Scheduler Lock to Support Named Locks

**Files:**
- Modify: `src/services/reconciliation/scheduler-lock.ts`

**Step 1: Check current implementation and update signature**

The current `acquireSchedulerLock` and `releaseSchedulerLock` likely use a hardcoded lock name. Update to accept an optional lock name parameter:

```typescript
export async function acquireSchedulerLock(
  db: Kysely<Database>,
  lockName: string = 'reconciliation_scheduler'
): Promise<boolean> {
  // Use lockName in the query instead of hardcoded value
}

export async function releaseSchedulerLock(
  db: Kysely<Database>,
  lockName: string = 'reconciliation_scheduler'
): Promise<void> {
  // Use lockName in the query instead of hardcoded value
}
```

**Step 2: Verify existing tests still pass**

Run: `npm test -- tests/unit/services/reconciliation`
Expected: PASS (existing tests use default lock name)

**Step 3: Commit**

```bash
git add src/services/reconciliation/scheduler-lock.ts
git commit -m "feat(lock): support named scheduler locks"
```

---

## Task 14: Register Plugin in App

**Files:**
- Modify: `src/app.ts`

**Step 1: Import and register the plugin**

Add import:

```typescript
import tokenClassificationCron from '@/src/plugins/token-classification-cron.js';
```

Add registration after reconciliation-cron (or similar plugins):

```typescript
await app.register(tokenClassificationCron);
```

**Step 2: Verify app starts**

Run: `npm run dev`
Expected: App starts with "Scheduling token classification cron job" log message

**Step 3: Commit**

```bash
git add src/app.ts
git commit -m "feat(app): register token classification cron plugin"
```

---

## Task 15: Integration Test

**Files:**
- Create: `tests/integration/token-classification/token-classification-worker.test.ts`

**Step 1: Write integration test**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from '@/tests/integration/utils/testFixtures.js';
import type { FastifyInstance } from 'fastify';

describe('Token Classification Worker Integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should have token classification cron registered', async () => {
    // Verify plugin is registered by checking logs or internal state
    expect(app.hasPlugin('token-classification-cron')).toBe(true);
  });
});
```

**Step 2: Run integration test**

Run: `npm run test:integration -- tests/integration/token-classification`
Expected: PASS

**Step 3: Commit**

```bash
git add tests/integration/token-classification/token-classification-worker.test.ts
git commit -m "test(integration): add token classification worker test"
```

---

## Task 16: Final Verification

**Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 2: Run type check**

Run: `npm run typecheck`
Expected: No errors

**Step 3: Run linting**

Run: `npm run lint`
Expected: No errors

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore: fix any remaining issues"
```

---

## Summary

| Task | Description | Files Changed |
|------|-------------|---------------|
| 1 | Database migration | 1 created |
| 2 | Update database types | 1 modified |
| 3 | Update repository types | 1 modified |
| 4 | Update token mapping | 2 modified |
| 5 | findNeedingClassification | 2 modified |
| 6 | refreshExpiredClassifications | 2 modified |
| 7 | updateClassificationSuccess | 2 modified |
| 8 | updateClassificationFailure | 2 modified |
| 9 | Update upserter | 1 modified |
| 10 | Add config | 1 modified |
| 11 | Worker service | 2 created |
| 12 | Cron plugin | 2 created |
| 13 | Named scheduler locks | 1 modified |
| 14 | Register in app | 1 modified |
| 15 | Integration test | 1 created |
| 16 | Final verification | - |
