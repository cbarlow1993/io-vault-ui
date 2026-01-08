# Token Classification Worker Design

## Overview

Tokens discovered during reconciliation are written to the database without spam classification. This design adds:

1. **Classification tracking** - Mark tokens as needing classification at upsert time
2. **Background worker** - Continuously classifies tokens and re-classifies when TTL expires
3. **Error handling** - Track failed attempts with configurable retry limits

## Requirements

- Classification triggered when tokens are upserted (not at read time)
- 3rd party API failures must not block token upsert
- Background worker re-classifies tokens when cached classification expires
- Per-token error handling with attempt tracking

## Schema Changes

New columns on the `tokens` table:

```sql
ALTER TABLE tokens ADD COLUMN needs_classification boolean DEFAULT true;
ALTER TABLE tokens ADD COLUMN classification_attempts integer DEFAULT 0;
ALTER TABLE tokens ADD COLUMN classification_error text NULL;
```

**Column behavior:**

| Column | Purpose |
|--------|---------|
| `needs_classification` | `true` = worker should classify this token |
| `classification_attempts` | Incremented on each failed attempt |
| `classification_error` | Stores last error message for debugging |

**Existing columns used:**

| Column | Purpose |
|--------|---------|
| `spam_classification` | JSONB storing classification result |
| `classification_updated_at` | Timestamp of last successful classification |
| `classification_ttl_hours` | TTL before re-classification (default 720 = 30 days) |

**Index for worker queries:**

```sql
CREATE INDEX idx_tokens_needs_classification
ON tokens (needs_classification, classification_attempts)
WHERE needs_classification = true;
```

Partial index ensures fast lookups for tokens needing work.

## Upserter Changes

In `TransactionUpserter.upsertToken()`, new tokens are inserted with:

```typescript
needs_classification: true,
classification_attempts: 0,
classification_error: null,
```

On conflict (token already exists), classification columns are **not** updated - only metadata (name, symbol, decimals) is refreshed. This preserves existing classification state.

The upserter remains lightweight - it only flags tokens for classification. All classification logic lives in the background worker.

## Background Worker Design

### Configuration

```typescript
// src/lib/config.ts
tokenClassification: {
  scheduler: {
    enabled: boolean,          // default: true (env: TOKEN_CLASSIFICATION_SCHEDULER_ENABLED)
    cronSchedule: string,      // default: '*/15 * * * *' (env: TOKEN_CLASSIFICATION_CRON_SCHEDULE)
    batchSize: number,         // default: 50 (env: TOKEN_CLASSIFICATION_BATCH_SIZE)
    maxAttempts: number,       // default: 5 (env: TOKEN_CLASSIFICATION_MAX_ATTEMPTS)
  },
  ttlHours: number,            // default: 720 (env: TOKEN_CLASSIFICATION_TTL_HOURS)
}
```

### Worker Flow

1. **Acquire distributed lock** (prevents multiple instances running concurrently)

2. **Refresh expired classifications:**
   ```sql
   UPDATE tokens
   SET needs_classification = true, classification_attempts = 0
   WHERE needs_classification = false
     AND classification_updated_at + (classification_ttl_hours * interval '1 hour') < NOW()
   ```

3. **Fetch batch of tokens needing classification:**
   ```sql
   SELECT * FROM tokens
   WHERE needs_classification = true
     AND classification_attempts < :maxAttempts
   ORDER BY classification_updated_at NULLS FIRST, created_at ASC
   LIMIT :batchSize
   ```
   Prioritizes never-classified tokens, then oldest classifications.

4. **Classify tokens one by one:**
   ```typescript
   for (const token of tokens) {
     try {
       const result = await classificationService.classifyToken(token);
       await tokenRepository.updateClassificationSuccess(token.id, result);
     } catch (error) {
       await tokenRepository.updateClassificationFailure(token.id, error.message);
     }
   }
   ```

5. **Release lock**

### Success Update

```typescript
async updateClassificationSuccess(tokenId: string, classification: SpamClassification): Promise<void> {
  await db.updateTable('tokens')
    .set({
      spam_classification: JSON.stringify(classification),
      classification_updated_at: new Date().toISOString(),
      needs_classification: false,
      classification_attempts: 0,
      classification_error: null,
    })
    .where('id', '=', tokenId)
    .execute();
}
```

### Failure Update

```typescript
async updateClassificationFailure(tokenId: string, errorMessage: string): Promise<void> {
  await db.updateTable('tokens')
    .set({
      classification_attempts: sql`classification_attempts + 1`,
      classification_error: errorMessage,
    })
    .where('id', '=', tokenId)
    .execute();
}
```

Tokens with `classification_attempts >= maxAttempts` are skipped by the worker query but remain flagged (`needs_classification = true`) for manual investigation.

## Repository Layer

New methods on `TokenRepository`:

```typescript
interface TokenRepository {
  // Existing methods...

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

Token type extended with classification fields:

```typescript
interface Token {
  // Existing fields...

  spamClassification: SpamClassification | null;
  classificationUpdatedAt: Date | null;
  classificationTtlHours: number;
  needsClassification: boolean;
  classificationAttempts: number;
  classificationError: string | null;
}
```

## Worker Service

```typescript
// src/services/token-classification/token-classification-worker.ts

interface TokenClassificationWorkerOptions {
  tokenRepository: TokenRepository;
  classificationService: SpamClassificationService;
  batchSize: number;
  maxAttempts: number;
  ttlHours: number;
}

interface WorkerResult {
  refreshed: number;
  processed: number;
  succeeded: number;
  failed: number;
}

class TokenClassificationWorker {
  constructor(private readonly options: TokenClassificationWorkerOptions) {}

  async run(): Promise<WorkerResult> {
    const refreshed = await this.options.tokenRepository
      .refreshExpiredClassifications(this.options.ttlHours);

    const tokens = await this.options.tokenRepository
      .findNeedingClassification({
        limit: this.options.batchSize,
        maxAttempts: this.options.maxAttempts,
      });

    let succeeded = 0;
    let failed = 0;

    for (const token of tokens) {
      try {
        const result = await this.classifyToken(token);
        await this.options.tokenRepository
          .updateClassificationSuccess(token.id, result.classification);
        succeeded++;
      } catch (error) {
        await this.options.tokenRepository
          .updateClassificationFailure(token.id, error.message);
        failed++;
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

## Cron Plugin

New plugin `src/plugins/token-classification-cron.ts`:

- Same pattern as `reconciliation-cron.ts`
- Uses distributed locking via `scheduler_locks` table with lock name `token_classification_scheduler`
- Instantiates `TokenClassificationWorker` with dependencies from Fastify context
- Registers cron job on Fastify startup
- Stops cron on server close

## Files to Create/Modify

| Action | File |
|--------|------|
| Create | `src/lib/database/migrations/2026_01_08_add_token_classification_tracking.ts` |
| Create | `src/services/token-classification/token-classification-worker.ts` |
| Create | `src/plugins/token-classification-cron.ts` |
| Modify | `src/lib/config.ts` |
| Modify | `src/repositories/token.repository.ts` |
| Modify | `src/repositories/types.ts` |
| Modify | `src/services/transaction-processor/upserter.ts` |
| Modify | `src/lib/database/types.ts` |

## Testing Strategy

1. **Unit tests** for `TokenClassificationWorker`:
   - Successful classification updates token correctly
   - Failed classification increments attempts and stores error
   - Tokens at max attempts are skipped
   - Expired classifications are refreshed

2. **Unit tests** for repository methods:
   - `findNeedingClassification` respects limit and maxAttempts
   - `refreshExpiredClassifications` only affects expired tokens
   - Success/failure updates set correct column values

3. **Integration tests** for cron plugin:
   - Worker runs on schedule
   - Distributed lock prevents concurrent runs
   - Graceful shutdown stops cron
