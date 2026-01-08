# Transaction Classifier Direction Enhancement

## Overview

Enhance the transaction classifier for EVM and SVM to include direction-aware classification. This allows distinguishing between actions like "received vs sent" and "stake vs unstake" from the user's perspective.

## Goals

- Add `direction` field to classification results: `'in' | 'out' | 'neutral'`
- Store direction per-address on the `address_transactions` table
- Preserve direction information from Noves API instead of collapsing it
- Generate direction-aware labels (e.g., "Received 100 ETH", "Unstaked 50 SOL")
- Enable API filtering by direction for address-scoped queries

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Direction representation | Add `direction` field to `ClassificationResult` | Keeps broad category (`type`) separate from polarity (`direction`) |
| Storage location | `address_transactions` table | Same transaction can have different directions for different addresses |
| Direction values | `'in' \| 'out' \| 'neutral'` | Simple, covers all cases without explosion of combinations |
| Stake/unstake handling | Use direction (`out` = stake, `in` = unstake) | Keeps `stake` as single type, direction indicates action |
| Swap direction | Always `neutral` | Swaps are value-neutral exchanges |
| Label generation | At classification time, stored | Consistent labels, simpler queries |
| Perspective address | Passed to classifier via `ClassifyOptions` | Flexible, supports multi-address transactions |

## Direction Logic by Classification Type

| Classification Type | Direction Logic |
|---------------------|-----------------|
| `transfer` | `in` if address is recipient, `out` if sender |
| `swap` | `neutral` (exchanging equal value) |
| `stake` | `out` = staking (tokens leaving), `in` = unstaking (tokens returning) |
| `mint` | `in` (receiving newly minted tokens) |
| `burn` | `out` (destroying tokens) |
| `approve` | `neutral` (no value transfer) |
| `contract_deploy` | `neutral` |
| `bridge` | Calculate from transfers (out on source, in on destination) |
| `nft_transfer` | `in` if recipient, `out` if sender |
| `unknown` | `neutral` |

## Component Changes

### 1. Type System

**File:** `services/core/src/services/transaction-processor/types.ts`

```typescript
// New type for classification direction
export type ClassificationDirection = 'in' | 'out' | 'neutral';

// Options for classification
export interface ClassifyOptions {
  perspectiveAddress: string;
}

// Updated ClassificationResult
export interface ClassificationResult {
  type: ClassificationType;
  direction: ClassificationDirection;  // NEW
  confidence: ClassificationConfidence;
  source: ClassificationSource;
  label: string;
  protocol?: string;
  transfers: ParsedTransfer[];
}

// Updated Classifier interface
export interface Classifier {
  classify(tx: RawTransaction, options: ClassifyOptions): Promise<ClassificationResult>;
}
```

### 2. Database Schema

**New migration:** Add `direction` column to `address_transactions`

```typescript
// Migration: YYYY_MM_DD_add_direction_to_address_transactions.ts
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('address_transactions')
    .addColumn('direction', 'varchar(10)', (col) =>
      col.notNull().defaultTo('neutral')
    )
    .execute();

  // Index for filtering by direction
  await db.schema
    .createIndex('idx_address_transactions_direction')
    .on('address_transactions')
    .columns(['direction'])
    .execute();

  // Composite index for common query pattern
  await db.schema
    .createIndex('idx_address_transactions_address_direction')
    .on('address_transactions')
    .columns(['address', 'direction', 'timestamp'])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .dropIndex('idx_address_transactions_address_direction')
    .execute();

  await db.schema
    .dropIndex('idx_address_transactions_direction')
    .execute();

  await db.schema
    .alterTable('address_transactions')
    .dropColumn('direction')
    .execute();
}
```

### 3. Direction Calculation Helper

**New file:** `services/core/src/services/transaction-processor/classifier/direction.ts`

```typescript
import type { ClassificationType, ClassificationDirection, ParsedTransfer } from '../types.js';

export function calculateDirection(
  type: ClassificationType,
  transfers: ParsedTransfer[],
  perspectiveAddress: string
): ClassificationDirection {
  const addr = perspectiveAddress.toLowerCase();

  // Type-based overrides (no transfer analysis needed)
  if (type === 'swap' || type === 'approve' || type === 'contract_deploy') {
    return 'neutral';
  }

  if (type === 'mint') return 'in';
  if (type === 'burn') return 'out';

  // For stake, transfer, nft_transfer, bridge: analyze transfers
  const incoming = transfers.filter(t => t.to.toLowerCase() === addr);
  const outgoing = transfers.filter(t => t.from.toLowerCase() === addr);

  if (incoming.length > 0 && outgoing.length === 0) return 'in';
  if (outgoing.length > 0 && incoming.length === 0) return 'out';

  // Mixed or no transfers
  return 'neutral';
}
```

### 4. Label Generation

**New file:** `services/core/src/services/transaction-processor/classifier/label.ts`

```typescript
import type { ClassificationType, ClassificationDirection, ParsedTransfer } from '../types.js';

export function generateLabel(
  type: ClassificationType,
  direction: ClassificationDirection,
  transfers: ParsedTransfer[]
): string {
  const primaryTransfer = transfers[0];
  const amount = primaryTransfer?.amount ?? '';
  const symbol = primaryTransfer?.token?.symbol ?? 'tokens';

  const labels: Partial<Record<ClassificationType, Record<ClassificationDirection, string>>> = {
    transfer: {
      in: `Received ${amount} ${symbol}`,
      out: `Sent ${amount} ${symbol}`,
      neutral: `Transferred ${amount} ${symbol}`,
    },
    stake: {
      in: `Unstaked ${amount} ${symbol}`,
      out: `Staked ${amount} ${symbol}`,
      neutral: `Stake interaction`,
    },
    swap: {
      in: `Swapped for ${symbol}`,
      out: `Swapped ${symbol}`,
      neutral: `Swapped ${symbol}`,
    },
    mint: {
      in: `Minted ${amount} ${symbol}`,
      out: `Minted ${amount} ${symbol}`,
      neutral: `Minted ${amount} ${symbol}`,
    },
    burn: {
      in: `Burned ${amount} ${symbol}`,
      out: `Burned ${amount} ${symbol}`,
      neutral: `Burned ${amount} ${symbol}`,
    },
    approve: {
      in: `Approved ${symbol}`,
      out: `Approved ${symbol}`,
      neutral: `Approved ${symbol}`,
    },
    contract_deploy: {
      in: `Deployed contract`,
      out: `Deployed contract`,
      neutral: `Deployed contract`,
    },
    nft_transfer: {
      in: `Received NFT`,
      out: `Sent NFT`,
      neutral: `Transferred NFT`,
    },
    bridge: {
      in: `Bridged in ${amount} ${symbol}`,
      out: `Bridged out ${amount} ${symbol}`,
      neutral: `Bridged ${amount} ${symbol}`,
    },
    unknown: {
      in: `Transaction`,
      out: `Transaction`,
      neutral: `Transaction`,
    },
  };

  return labels[type]?.[direction] ?? 'Transaction';
}
```

### 5. EVM Classifier Updates

**File:** `services/core/src/services/transaction-processor/classifier/evm-classifier.ts`

```typescript
import { calculateDirection } from './direction.js';
import { generateLabel } from './label.js';
import type { Classifier, ClassificationResult, ClassifyOptions, RawTransaction } from '../types.js';

export class EvmClassifier implements Classifier {
  async classify(tx: RawTransaction, options: ClassifyOptions): Promise<ClassificationResult> {
    const type = this.detectType(tx);
    const transfers = this.parseTransfers(tx);
    const direction = calculateDirection(type, transfers, options.perspectiveAddress);
    const label = generateLabel(type, direction, transfers);

    return {
      type,
      direction,
      confidence: type === 'unknown' ? 'low' : 'high',
      source: 'custom',
      label,
      transfers,
    };
  }

  // ... existing detectType() and parseTransfers() methods
}
```

### 6. SVM Classifier Updates

**File:** `services/core/src/services/transaction-processor/classifier/svm-classifier.ts`

Same pattern as EVM classifier - add `options: ClassifyOptions` parameter and calculate direction.

### 7. Noves Classifier Updates

**File:** `services/core/src/services/transaction-processor/classifier/noves-classifier.ts`

```typescript
import { calculateDirection } from './direction.js';
import type { ClassificationType, ClassificationDirection } from '../types.js';

interface NovesTypeMapping {
  type: ClassificationType;
  direction: ClassificationDirection;
}

const NOVES_TYPE_MAP: Record<string, NovesTypeMapping> = {
  // Transfers with direction
  receive:      { type: 'transfer', direction: 'in' },
  send:         { type: 'transfer', direction: 'out' },
  transfer:     { type: 'transfer', direction: 'neutral' },

  // Staking with direction
  stake:        { type: 'stake', direction: 'out' },
  unstake:      { type: 'stake', direction: 'in' },

  // NFTs with direction
  nft_transfer: { type: 'nft_transfer', direction: 'neutral' },
  nft_mint:     { type: 'mint', direction: 'in' },
  nft_receive:  { type: 'nft_transfer', direction: 'in' },
  nft_send:     { type: 'nft_transfer', direction: 'out' },

  // Others
  swap:         { type: 'swap', direction: 'neutral' },
  bridge:       { type: 'bridge', direction: 'neutral' },
  mint:         { type: 'mint', direction: 'in' },
  burn:         { type: 'burn', direction: 'out' },
  approve:      { type: 'approve', direction: 'neutral' },
  deploy:       { type: 'contract_deploy', direction: 'neutral' },
  unknown:      { type: 'unknown', direction: 'neutral' },
};

export class NovesClassifier implements Classifier {
  async classify(tx: RawTransaction, options: ClassifyOptions): Promise<ClassificationResult> {
    // ... fetch from Noves API ...

    const mapping = NOVES_TYPE_MAP[novesTx.classificationData.type]
      ?? { type: 'unknown', direction: 'neutral' };

    const transfers = this.parseTransfers(novesTx.transfers ?? []);

    // Use Noves direction if available, otherwise calculate
    const direction = mapping.direction === 'neutral'
      ? calculateDirection(mapping.type, transfers, options.perspectiveAddress)
      : mapping.direction;

    return {
      type: mapping.type,
      direction,
      confidence: mapping.type === 'unknown' ? 'low' : 'high',
      source: 'noves',
      label: novesTx.classificationData.description ?? generateLabel(mapping.type, direction, transfers),
      transfers,
    };
  }
}
```

### 8. Upserter Updates

**File:** `services/core/src/services/transaction-processor/upserter.ts`

```typescript
async upsert(
  normalized: NormalizedTransaction,
  classification: ClassificationResult,
  tokens: TokenInfo[],
  options?: UpsertOptions
): Promise<ProcessResult> {
  // ... existing transaction insert ...

  if (options?.forAddress) {
    await this.db
      .insertInto('address_transactions')
      .values({
        address: options.forAddress.toLowerCase(),
        tx_id: transactionId,
        chain: normalized.chain,
        network: normalized.network,
        timestamp: normalized.timestamp,
        has_native_transfer: this.hasNativeTransfer(classification.transfers),
        has_token_transfer: this.hasTokenTransfer(classification.transfers),
        total_value: this.calculateTotalValue(classification.transfers),
        direction: classification.direction,  // NEW
      })
      .onConflict((oc) =>
        oc.columns(['address', 'tx_id']).doUpdateSet({
          direction: classification.direction,
        })
      )
      .execute();
  }

  // ... rest of upsert ...
}
```

### 9. API Changes

**File:** `services/core/src/routes/transactions/schemas.ts`

```typescript
// Add direction to response schema
export const transactionResponseSchema = z.object({
  // ... existing fields ...
  classificationType: z.string(),
  classificationDirection: z.enum(['in', 'out', 'neutral']),
  classificationLabel: z.string(),
});

// Query filter for address transactions endpoint
export const listAddressTransactionsQuerySchema = z.object({
  direction: z.enum(['in', 'out', 'neutral']).optional(),
  // ... existing filters ...
});
```

**Endpoint:** `GET /v2/transactions/ecosystem/:ecosystem/chain/:chain/address/:address`

Add `direction` query parameter support.

### 10. Repository Updates

**File:** `services/core/src/repositories/transaction.repository.ts`

```typescript
interface FindByAddressFilters {
  direction?: 'in' | 'out' | 'neutral';
  // ... other filters
}

async findByAddress(address: string, filters?: FindByAddressFilters) {
  let query = this.db
    .selectFrom('address_transactions')
    .innerJoin('transactions', 'transactions.id', 'address_transactions.tx_id')
    .where('address_transactions.address', '=', address.toLowerCase());

  if (filters?.direction) {
    query = query.where('address_transactions.direction', '=', filters.direction);
  }

  return query.execute();
}
```

## Testing Strategy

### Unit Tests

**Direction calculation:**
- Test each classification type returns correct direction
- Test case-insensitive address matching
- Test mixed transfers return `neutral`

**Label generation:**
- Test labels match direction (Received/Sent, Staked/Unstaked)
- Test fallback for unknown types

### Integration Tests

**Classifiers:**
- Test EVM classifier with perspective address
- Test SVM classifier with perspective address
- Test Noves classifier preserves direction hints

### E2E Tests

**API:**
- Test direction filter on address transactions endpoint
- Test direction field in response

## Migration Strategy

1. Deploy schema migration (adds `direction` column with default `'neutral'`)
2. Deploy code changes
3. New transactions get proper direction
4. Existing transactions remain `'neutral'` (optional: backfill script)

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/services/transaction-processor/types.ts` | Modify |
| `src/services/transaction-processor/classifier/direction.ts` | Create |
| `src/services/transaction-processor/classifier/label.ts` | Create |
| `src/services/transaction-processor/classifier/evm-classifier.ts` | Modify |
| `src/services/transaction-processor/classifier/svm-classifier.ts` | Modify |
| `src/services/transaction-processor/classifier/noves-classifier.ts` | Modify |
| `src/services/transaction-processor/classifier/index.ts` | Modify |
| `src/services/transaction-processor/upserter.ts` | Modify |
| `src/lib/database/migrations/YYYY_MM_DD_add_direction.ts` | Create |
| `src/lib/database/types.ts` | Modify |
| `src/routes/transactions/schemas.ts` | Modify |
| `src/routes/transactions/handlers.ts` | Modify |
| `src/repositories/transaction.repository.ts` | Modify |
| `tests/unit/services/transaction-processor/classifier/direction.test.ts` | Create |
| `tests/unit/services/transaction-processor/classifier/label.test.ts` | Create |
