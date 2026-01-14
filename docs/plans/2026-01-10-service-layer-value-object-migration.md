# Service Layer Value Object Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate service-layer code to use domain value objects (WalletAddress, TokenAddress, TransactionHash) instead of raw string manipulation with `.toLowerCase()`.

**Architecture:** Replace 40+ instances of manual `.toLowerCase()` normalization with type-safe value objects that encapsulate normalization logic. This ensures consistent address/hash handling across the codebase.

**Tech Stack:** TypeScript, Domain Value Objects (WalletAddress, TokenAddress, TransactionHash), Vitest

---

## Phase 1: Enhance TransactionHash Value Object

TransactionHash currently lacks normalization. Unlike WalletAddress and TokenAddress which normalize to lowercase, TransactionHash stores the raw value. This causes inconsistent comparisons throughout the codebase.

### Task 1: Add Normalization to TransactionHash

**Files:**
- Modify: `src/domain/value-objects/transaction-hash.ts`
- Test: `tests/unit/domain/value-objects/transaction-hash.test.ts`

**Step 1: Write the failing test for normalization**

```typescript
// tests/unit/domain/value-objects/transaction-hash.test.ts
import { describe, expect, it } from 'vitest';
import { TransactionHash } from '@/src/domain/value-objects/index.js';

describe('TransactionHash', () => {
  describe('normalization', () => {
    it('normalizes hash to lowercase', () => {
      const hash = TransactionHash.create('0xABC123DEF456', 'ethereum');

      expect(hash.normalized).toBe('0xabc123def456');
      expect(hash.original).toBe('0xABC123DEF456');
    });

    it('provides normalized value for storage', () => {
      const hash = TransactionHash.create('0xABC123DEF456', 'ethereum');

      expect(hash.forStorage()).toBe('0xabc123def456');
    });

    it('compares hashes case-insensitively', () => {
      const hash1 = TransactionHash.create('0xABC123', 'ethereum');
      const hash2 = TransactionHash.create('0xabc123', 'ethereum');

      expect(hash1.equals(hash2)).toBe(true);
    });

    it('matches raw strings case-insensitively', () => {
      const hash = TransactionHash.create('0xABC123', 'ethereum');

      expect(hash.matches('0xabc123')).toBe(true);
      expect(hash.matches('0xABC123')).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --config tests/unit/vitest.config.ts tests/unit/domain/value-objects/transaction-hash.test.ts`
Expected: FAIL with "hash.normalized is undefined" or similar

**Step 3: Implement normalization in TransactionHash**

```typescript
// src/domain/value-objects/transaction-hash.ts
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { InvalidTransactionHashError } from './errors.js';

/** Branded type for validated transaction hashes */
declare const TransactionHashBrand: unique symbol;
export type ValidatedTxHash = string & { readonly [TransactionHashBrand]: never };

/** Branded type for normalized (lowercase) transaction hashes */
declare const NormalizedTxHashBrand: unique symbol;
export type NormalizedTxHash = string & { readonly [NormalizedTxHashBrand]: never };

export class TransactionHash {
  public readonly value: ValidatedTxHash;
  public readonly normalized: NormalizedTxHash;

  private constructor(
    public readonly original: string,
    public readonly chainAlias: ChainAlias
  ) {
    this.value = original as ValidatedTxHash;
    this.normalized = original.toLowerCase().trim() as NormalizedTxHash;
    Object.freeze(this);
  }

  static create(hash: string, chainAlias: ChainAlias): TransactionHash {
    if (!hash || typeof hash !== 'string') {
      throw new InvalidTransactionHashError(hash ?? '', 'hash is required');
    }
    const trimmed = hash.trim();
    if (trimmed.length === 0) {
      throw new InvalidTransactionHashError('', 'hash cannot be empty');
    }
    return new TransactionHash(trimmed, chainAlias);
  }

  /**
   * Create from already-normalized hash (trusted source like database)
   */
  static fromNormalized(normalized: string, chainAlias: ChainAlias): TransactionHash {
    return new TransactionHash(normalized, chainAlias);
  }

  /**
   * Check equality with another TransactionHash (case-insensitive)
   */
  equals(other: TransactionHash): boolean {
    return this.normalized === other.normalized && this.chainAlias === other.chainAlias;
  }

  /**
   * Check if this hash matches a raw string (case-insensitive)
   */
  matches(hash: string): boolean {
    return this.normalized === hash.toLowerCase().trim();
  }

  /**
   * Get the hash for database storage (normalized)
   */
  forStorage(): NormalizedTxHash {
    return this.normalized;
  }

  toString(): string {
    return this.normalized;
  }

  toJSON(): { hash: string; chainAlias: ChainAlias } {
    return {
      hash: this.normalized,
      chainAlias: this.chainAlias,
    };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --config tests/unit/vitest.config.ts tests/unit/domain/value-objects/transaction-hash.test.ts`
Expected: PASS

**Step 5: Update exports in index.ts**

```typescript
// src/domain/value-objects/index.ts - add NormalizedTxHash to exports
export { TransactionHash, type ValidatedTxHash, type NormalizedTxHash } from './transaction-hash.js';
```

**Step 6: Commit**

```bash
git add src/domain/value-objects/transaction-hash.ts src/domain/value-objects/index.ts tests/unit/domain/value-objects/transaction-hash.test.ts
git commit -m "feat(domain): add normalization to TransactionHash value object

- Add normalized property (lowercase, trimmed)
- Add NormalizedTxHash branded type
- Add forStorage() method for database writes
- Update equals() to compare normalized values
- Update matches() for case-insensitive comparison
- Add fromNormalized() factory for trusted sources"
```

---

## Phase 2: Migrate DirectionClassifier

The DirectionClassifier has 3 `.toLowerCase()` calls that should use WalletAddress.

### Task 2: Refactor DirectionClassifier to Use WalletAddress

**Files:**
- Modify: `src/services/transaction-processor/classifier/direction.ts`
- Test: `tests/unit/services/transaction-processor/classifier/direction.test.ts`

**Step 1: Write the failing test with WalletAddress**

```typescript
// tests/unit/services/transaction-processor/classifier/direction.test.ts
import { describe, expect, it } from 'vitest';
import { calculateDirection } from '@/src/services/transaction-processor/classifier/direction.js';
import { WalletAddress } from '@/src/domain/value-objects/index.js';
import type { ParsedTransfer } from '@/src/services/transaction-processor/types.js';

describe('calculateDirection', () => {
  const perspectiveAddress = WalletAddress.create('0xABC123def456789012345678901234567890abcd', 'ethereum');

  it('calculates incoming direction with mixed-case addresses', () => {
    const transfers: ParsedTransfer[] = [
      {
        from: '0x1111111111111111111111111111111111111111',
        to: '0xABC123DEF456789012345678901234567890ABCD', // uppercase version
        amount: '1000000000000000000',
        token: { address: '0x0000000000000000000000000000000000000000', decimals: 18 },
      },
    ];

    const result = calculateDirection('erc20_transfer', transfers, perspectiveAddress);

    expect(result).toBe('in');
  });

  it('calculates outgoing direction with mixed-case addresses', () => {
    const transfers: ParsedTransfer[] = [
      {
        from: '0xabc123def456789012345678901234567890abcd', // lowercase version
        to: '0x2222222222222222222222222222222222222222',
        amount: '1000000000000000000',
        token: { address: '0x0000000000000000000000000000000000000000', decimals: 18 },
      },
    ];

    const result = calculateDirection('erc20_transfer', transfers, perspectiveAddress);

    expect(result).toBe('out');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --config tests/unit/vitest.config.ts tests/unit/services/transaction-processor/classifier/direction.test.ts`
Expected: FAIL with type error (perspectiveAddress is WalletAddress, not string)

**Step 3: Update calculateDirection to accept WalletAddress**

```typescript
// src/services/transaction-processor/classifier/direction.ts
import type { ClassificationType, ClassificationDirection, ParsedTransfer } from '@/src/services/transaction-processor/types.js';
import { TransactionClassification } from '@/src/domain/entities/index.js';
import { WalletAddress } from '@/src/domain/value-objects/index.js';

/**
 * Calculates the direction of a transaction from the perspective of a specific address.
 *
 * @param type - The classification type of the transaction
 * @param transfers - Parsed transfers from the transaction
 * @param perspectiveAddress - The WalletAddress to calculate direction from
 * @returns The direction: 'in', 'out', or 'neutral'
 */
export function calculateDirection(
  type: ClassificationType,
  transfers: ParsedTransfer[],
  perspectiveAddress: WalletAddress
): ClassificationDirection {
  // Use normalized address for case-insensitive comparison
  const normalizedPerspective = perspectiveAddress.normalized;

  // Count transfers relative to perspective address
  const incomingCount = transfers.filter(
    (t) => t.to && WalletAddress.normalizeForComparison(t.to) === normalizedPerspective
  ).length;
  const outgoingCount = transfers.filter(
    (t) => t.from && WalletAddress.normalizeForComparison(t.from) === normalizedPerspective
  ).length;

  // Delegate to domain entity for classification logic
  return TransactionClassification.computeDirection(type, incomingCount, outgoingCount);
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --config tests/unit/vitest.config.ts tests/unit/services/transaction-processor/classifier/direction.test.ts`
Expected: PASS

**Step 5: Update callers of calculateDirection**

Search for callers and update them to pass WalletAddress instead of string.

**Step 6: Commit**

```bash
git add src/services/transaction-processor/classifier/direction.ts tests/unit/services/transaction-processor/classifier/direction.test.ts
git commit -m "refactor(classifier): use WalletAddress in calculateDirection

- Change perspectiveAddress parameter from string to WalletAddress
- Use WalletAddress.normalizeForComparison() for consistent comparison
- Remove manual .toLowerCase() calls"
```

---

## Phase 3: Migrate TransactionUpserter

The TransactionUpserter has manual `.toLowerCase()` on transaction hashes and addresses.

### Task 3: Refactor TransactionUpserter to Use Value Objects

**Files:**
- Modify: `src/services/transaction-processor/upserter.ts:118,232`
- Test: Existing tests should cover this after refactor

**Step 1: Identify the changes needed**

Current code at line 118:
```typescript
tx_hash: normalized.txHash.toLowerCase(), // tx hashes are hex, lowercase is safe
```

Current code at line 232:
```typescript
const lowerAddr = addr.toLowerCase();
```

**Step 2: Update to use TransactionHash.forStorage() and WalletAddress.normalized**

Replace line 118:
```typescript
tx_hash: normalized.txHash.forStorage(), // Uses TransactionHash normalization
```

Replace line 232:
```typescript
const lowerAddr = WalletAddress.normalizeForComparison(addr);
```

**Step 3: Run existing tests**

Run: `npm run test:unit -- --config tests/unit/vitest.config.ts tests/unit/services/transaction-processor`
Expected: PASS (if types align) or TYPE ERRORS (to fix)

**Step 4: Fix any type mismatches**

If `normalized.txHash` is still a string, create TransactionHash at the normalization boundary.

**Step 5: Commit**

```bash
git add src/services/transaction-processor/upserter.ts
git commit -m "refactor(upserter): use value objects for normalization

- Replace manual .toLowerCase() on txHash with TransactionHash.forStorage()
- Use WalletAddress.normalizeForComparison() for address comparison
- Remove inline comments about lowercase safety"
```

---

## Phase 4: Migrate ReconciliationWorker

ReconciliationWorker has 6+ `.toLowerCase()` calls on transaction hashes and addresses.

### Task 4: Refactor ReconciliationWorker Hash Handling

**Files:**
- Modify: `src/services/reconciliation/reconciliation-worker.ts:481,754,802`

**Step 1: Update hash normalization at line 481**

Current:
```typescript
const hash = txHash.toLowerCase();
```

Replace with:
```typescript
const hash = TransactionHash.normalizeForComparison(txHash);
```

Note: We need to add a static helper to TransactionHash similar to WalletAddress.normalizeForComparison().

**Step 2: Add normalizeForComparison to TransactionHash**

```typescript
// Add to src/domain/value-objects/transaction-hash.ts
static normalizeForComparison(hash: string): string {
  return hash.toLowerCase().trim();
}
```

**Step 3: Update lines 754 and 802**

Line 754:
```typescript
txMap.set(TransactionHash.normalizeForComparison(tx.txHash), tx);
```

Line 802:
```typescript
const hash = TransactionHash.normalizeForComparison(providerTx.transactionHash);
```

**Step 4: Run tests**

Run: `npm run test:unit -- --config tests/unit/vitest.config.ts tests/unit/services/reconciliation`
Expected: PASS

**Step 5: Commit**

```bash
git add src/domain/value-objects/transaction-hash.ts src/services/reconciliation/reconciliation-worker.ts
git commit -m "refactor(reconciliation): use TransactionHash for normalization

- Add TransactionHash.normalizeForComparison() static method
- Replace manual .toLowerCase() calls with value object method
- Ensures consistent hash comparison throughout reconciliation"
```

### Task 5: Refactor ReconciliationWorker Address Handling

**Files:**
- Modify: `src/services/reconciliation/reconciliation-worker.ts:854-858`

**Step 1: Update address comparison at lines 854-858**

Current:
```typescript
if (local.fromAddress.toLowerCase() !== provider.normalized.fromAddress.toLowerCase()) {
const localTo = local.toAddress?.toLowerCase() ?? null;
const providerTo = provider.normalized.toAddress?.toLowerCase() ?? null;
```

Replace with:
```typescript
if (!WalletAddress.areEqual(local.fromAddress, provider.normalized.fromAddress)) {
const localTo = local.toAddress ? WalletAddress.normalizeForComparison(local.toAddress) : null;
const providerTo = provider.normalized.toAddress ? WalletAddress.normalizeForComparison(provider.normalized.toAddress) : null;
```

**Step 2: Run tests**

Run: `npm run test:unit -- --config tests/unit/vitest.config.ts tests/unit/services/reconciliation`
Expected: PASS

**Step 3: Commit**

```bash
git add src/services/reconciliation/reconciliation-worker.ts
git commit -m "refactor(reconciliation): use WalletAddress for address comparison

- Replace manual .toLowerCase() with WalletAddress.areEqual()
- Use WalletAddress.normalizeForComparison() for nullable addresses
- Ensures consistent address comparison"
```

---

## Phase 5: Migrate Spam Providers

### Task 6: Refactor CoingeckoProvider

**Files:**
- Modify: `src/services/spam/providers/coingecko-provider.ts:35`

**Step 1: Update token address handling**

Current line 35:
```typescript
address: token.address.toLowerCase(),
```

Replace with:
```typescript
address: TokenAddress.normalizeForComparison(token.address),
```

**Step 2: Commit**

```bash
git add src/services/spam/providers/coingecko-provider.ts
git commit -m "refactor(spam): use TokenAddress in CoingeckoProvider"
```

### Task 7: Refactor BlockaidProvider

**Files:**
- Modify: `src/services/spam/providers/blockaid-provider.ts:51,61`

**Step 1: Update address normalization**

Line 51:
```typescript
results.set(TokenAddress.normalizeForComparison(token.address), result);
```

Lines 61 (leave as-is - this is checking string content, not addresses):
```typescript
(t) => t.toLowerCase().includes('impersonator') || t.toLowerCase().includes('phishing')
```

**Step 2: Commit**

```bash
git add src/services/spam/providers/blockaid-provider.ts
git commit -m "refactor(spam): use TokenAddress in BlockaidProvider"
```

### Task 8: Refactor HeuristicsProvider

**Files:**
- Modify: `src/services/spam/providers/heuristics-provider.ts:26`

**Step 1: Update address normalization**

Line 26:
```typescript
address: TokenAddress.normalizeForComparison(token.address),
```

**Step 2: Commit**

```bash
git add src/services/spam/providers/heuristics-provider.ts
git commit -m "refactor(spam): use TokenAddress in HeuristicsProvider"
```

---

## Phase 6: Migrate TokenMetadataFetcher

### Task 9: Refactor TokenMetadataFetcher

**Files:**
- Modify: `src/services/transaction-processor/token-metadata-fetcher.ts:42,49,91,119`

**Step 1: Update all address normalizations**

Lines 42, 49, 119:
```typescript
address: TokenAddress.normalizeForComparison(address),
```

Line 91:
```typescript
const data = await client.coins.contract.get(TokenAddress.normalizeForComparison(address), { id: platform });
```

**Step 2: Run tests**

Run: `npm run test:unit -- --config tests/unit/vitest.config.ts tests/unit/services/transaction-processor/token-metadata-fetcher.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add src/services/transaction-processor/token-metadata-fetcher.ts
git commit -m "refactor(token-metadata): use TokenAddress for normalization

- Replace 4 instances of manual .toLowerCase()
- Use TokenAddress.normalizeForComparison() consistently"
```

---

## Phase 7: Migrate Balance and Pricing Services

### Task 10: Refactor BalanceService

**Files:**
- Modify: `src/services/balances/balance-service.ts:344`

**Step 1: Update token address normalization**

Line 344:
```typescript
: TokenAddress.normalizeForComparison(balance.tokenAddress!),
```

**Step 2: Commit**

```bash
git add src/services/balances/balance-service.ts
git commit -m "refactor(balances): use TokenAddress for normalization"
```

### Task 11: Refactor PricingService

**Files:**
- Modify: `src/services/balances/pricing-service.ts:67`

**Step 1: Update currency handling**

Line 67 - this is currency comparison, not address. Leave as-is since currencies aren't addresses:
```typescript
const originalCurrency = currency.toLowerCase().trim();
```

No change needed - this is appropriate string normalization for currency codes.

---

## Phase 8: Add TokenAddress.normalizeForComparison

Before the migrations in Phase 5-7 work, we need to ensure TokenAddress has the static helper.

### Task 12: Add normalizeForComparison to TokenAddress

**Files:**
- Modify: `src/domain/value-objects/token-address.ts`
- Test: `tests/unit/domain/value-objects/token-address.test.ts`

**Step 1: Write the failing test**

```typescript
describe('TokenAddress.normalizeForComparison', () => {
  it('normalizes address for comparison', () => {
    const result = TokenAddress.normalizeForComparison('0xABC123');
    expect(result).toBe('0xabc123');
  });

  it('handles null addresses', () => {
    const result = TokenAddress.normalizeForComparison(null);
    expect(result).toBeNull();
  });
});
```

**Step 2: Implement the static method**

```typescript
// Add to src/domain/value-objects/token-address.ts
static normalizeForComparison(address: string | null): string | null {
  if (address === null) return null;
  return address.toLowerCase().trim();
}
```

**Step 3: Run tests**

Run: `npm run test:unit -- --config tests/unit/vitest.config.ts tests/unit/domain/value-objects/token-address.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/domain/value-objects/token-address.ts tests/unit/domain/value-objects/token-address.test.ts
git commit -m "feat(domain): add TokenAddress.normalizeForComparison()

Static helper for quick comparisons without creating instance"
```

---

## Phase 9: Migrate CoingeckoService

### Task 13: Refactor CoingeckoService

**Files:**
- Modify: `src/services/coingecko/index.ts:106,181`

**Step 1: Update address normalization**

Lines 106 and 181:
```typescript
return await client.coins.contract.get(TokenAddress.normalizeForComparison(address), { id: platform });
```

**Step 2: Commit**

```bash
git add src/services/coingecko/index.ts
git commit -m "refactor(coingecko): use TokenAddress for address normalization"
```

---

## Phase 10: Final Integration Test

### Task 14: Run Full Test Suite

**Step 1: Run all unit tests**

Run: `npm run test:unit`
Expected: All tests pass

**Step 2: Run integration tests**

Run: `npm run test:integration`
Expected: All tests pass

**Step 3: Run type check**

Run: `npm run typecheck`
Expected: No type errors

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: service layer value object migration complete

All manual .toLowerCase() calls replaced with domain value objects:
- TransactionHash: added normalization
- WalletAddress: used for address comparisons
- TokenAddress: used for token address comparisons

Services migrated:
- DirectionClassifier
- TransactionUpserter
- ReconciliationWorker
- Spam providers (coingecko, blockaid, heuristics)
- TokenMetadataFetcher
- BalanceService
- CoingeckoService"
```

---

## Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| 1 | 1 | Enhance TransactionHash with normalization |
| 2 | 2 | Migrate DirectionClassifier |
| 3 | 3 | Migrate TransactionUpserter |
| 4 | 4-5 | Migrate ReconciliationWorker |
| 5 | 6-8 | Migrate Spam Providers |
| 6 | 9 | Migrate TokenMetadataFetcher |
| 7 | 10-11 | Migrate Balance/Pricing Services |
| 8 | 12 | Add TokenAddress helper |
| 9 | 13 | Migrate CoingeckoService |
| 10 | 14 | Integration testing |

**Total: 14 tasks across 10 phases**

Key migrations:
- 40+ `.toLowerCase()` calls replaced with value object methods
- Type-safe comparisons throughout
- Consistent normalization via domain value objects
