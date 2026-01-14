# Repository Layer Value Object Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate remaining `.toLowerCase()` calls in repository and handler layers to use domain value object normalization methods.

**Architecture:** Replace manual string normalization with `WalletAddress.normalizeForComparison()`, `TokenAddress.normalizeForComparison()`, and `TransactionHash.normalizeForComparison()` static helper methods. This centralizes normalization logic and ensures consistency across the codebase.

**Tech Stack:** TypeScript, Kysely ORM, Domain Value Objects

---

## Task 1: Refactor AddressRepository

**Files:**
- Modify: `src/repositories/address.repository.ts:75`

**Step 1: Add import for WalletAddress**

```typescript
import { WalletAddress } from '@/src/domain/value-objects/index.js';
```

**Step 2: Replace toLowerCase with value object method**

Change line 75 from:
```typescript
.where(sql`LOWER(address)`, '=', address.toLowerCase())
```

To:
```typescript
.where(sql`LOWER(address)`, '=', WalletAddress.normalizeForComparison(address))
```

**Step 3: Run tests**

Run: `npx vitest run --dir tests/unit -c tests/unit/vitest.config.ts address.repository`

**Step 4: Commit**

```bash
git add src/repositories/address.repository.ts
git commit -m "refactor(repositories): use WalletAddress.normalizeForComparison in AddressRepository

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Refactor TransactionRepository - Hash Normalization

**Files:**
- Modify: `src/repositories/transaction.repository.ts:132`

**Step 1: Add import for TransactionHash**

```typescript
import { TransactionHash } from '@/src/domain/value-objects/index.js';
```

**Step 2: Replace toLowerCase with value object method**

Change line 132 from:
```typescript
.where('tx_hash', '=', txHash.toLowerCase())
```

To:
```typescript
.where('tx_hash', '=', TransactionHash.normalizeForComparison(txHash))
```

**Step 3: Run tests**

Run: `npx vitest run --dir tests/unit -c tests/unit/vitest.config.ts transaction.repository`

**Step 4: Commit**

```bash
git add src/repositories/transaction.repository.ts
git commit -m "refactor(repositories): use TransactionHash.normalizeForComparison in TransactionRepository

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Refactor TransactionRepository - Address Normalization

**Files:**
- Modify: `src/repositories/transaction.repository.ts:144, 205`

**Step 1: Add import for WalletAddress (if not already added)**

```typescript
import { WalletAddress } from '@/src/domain/value-objects/index.js';
```

**Step 2: Replace toLowerCase with value object method at line 144**

Change:
```typescript
const normalizedAddress = address.toLowerCase();
```

To:
```typescript
const normalizedAddress = WalletAddress.normalizeForComparison(address);
```

**Step 3: Replace toLowerCase with value object method at line 205**

Change:
```typescript
const normalizedAddress = address.toLowerCase();
```

To:
```typescript
const normalizedAddress = WalletAddress.normalizeForComparison(address);
```

**Step 4: Run tests**

Run: `npx vitest run --dir tests/unit -c tests/unit/vitest.config.ts transaction.repository`

**Step 5: Commit**

```bash
git add src/repositories/transaction.repository.ts
git commit -m "refactor(repositories): use WalletAddress.normalizeForComparison for address queries

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Refactor ReconciliationRepository

**Files:**
- Modify: `src/repositories/reconciliation.repository.ts:117, 269`

**Step 1: Add import for WalletAddress**

```typescript
import { WalletAddress } from '@/src/domain/value-objects/index.js';
```

**Step 2: Replace toLowerCase at line 117**

Change:
```typescript
.where(sql`LOWER(address)`, '=', address.toLowerCase())
```

To:
```typescript
.where(sql`LOWER(address)`, '=', WalletAddress.normalizeForComparison(address))
```

**Step 3: Replace toLowerCase at line 269**

Change:
```typescript
.where(sql`LOWER(address)`, '=', address.toLowerCase())
```

To:
```typescript
.where(sql`LOWER(address)`, '=', WalletAddress.normalizeForComparison(address))
```

**Step 4: Run tests**

Run: `npx vitest run --dir tests/unit -c tests/unit/vitest.config.ts reconciliation.repository`

**Step 5: Commit**

```bash
git add src/repositories/reconciliation.repository.ts
git commit -m "refactor(repositories): use WalletAddress.normalizeForComparison in ReconciliationRepository

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Refactor TokenHoldingRepository

**Files:**
- Modify: `src/repositories/token-holding.repository.ts:147, 178`

**Step 1: Add import for TokenAddress**

```typescript
import { TokenAddress } from '@/src/domain/value-objects/index.js';
```

**Step 2: Replace toLowerCase at line 147**

Change:
```typescript
? eb(sql`LOWER(token_address)`, '=', tokenAddress.toLowerCase())
```

To:
```typescript
? eb(sql`LOWER(token_address)`, '=', TokenAddress.normalizeForComparison(tokenAddress))
```

**Step 3: Replace toLowerCase at line 178**

Change:
```typescript
? eb(sql`LOWER(token_address)`, '=', tokenAddress.toLowerCase())
```

To:
```typescript
? eb(sql`LOWER(token_address)`, '=', TokenAddress.normalizeForComparison(tokenAddress))
```

**Step 4: Run tests**

Run: `npx vitest run --dir tests/unit -c tests/unit/vitest.config.ts token-holding`

**Step 5: Commit**

```bash
git add src/repositories/token-holding.repository.ts
git commit -m "refactor(repositories): use TokenAddress.normalizeForComparison in TokenHoldingRepository

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Refactor TokenRepository

**Files:**
- Modify: `src/repositories/token.repository.ts:54`

**Step 1: Add import for TokenAddress**

```typescript
import { TokenAddress } from '@/src/domain/value-objects/index.js';
```

**Step 2: Replace toLowerCase at line 54**

Change:
```typescript
.where(sql`LOWER(address)`, '=', address.toLowerCase())
```

To:
```typescript
.where(sql`LOWER(address)`, '=', TokenAddress.normalizeForComparison(address))
```

**Step 3: Run tests**

Run: `npx vitest run --dir tests/unit -c tests/unit/vitest.config.ts token.repository`

**Step 4: Commit**

```bash
git add src/repositories/token.repository.ts
git commit -m "refactor(repositories): use TokenAddress.normalizeForComparison in TokenRepository

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Refactor Spam Handlers

**Files:**
- Modify: `src/routes/spam/handlers.ts:51-52`

**Step 1: Add import for TokenAddress**

```typescript
import { TokenAddress, NATIVE_TOKEN_ADDRESS } from '@/src/domain/value-objects/index.js';
```

**Step 2: Refactor normalizeTokenAddress function**

Change:
```typescript
function normalizeTokenAddress(tokenAddress: string): string | null {
  return tokenAddress.toLowerCase() === NATIVE_TOKEN_IDENTIFIER ? null : tokenAddress.toLowerCase();
}
```

To:
```typescript
function normalizeTokenAddress(tokenAddress: string): string | null {
  const normalized = TokenAddress.normalizeForComparison(tokenAddress);
  return normalized === NATIVE_TOKEN_IDENTIFIER ? null : normalized;
}
```

**Step 3: Run tests**

Run: `npx vitest run --dir tests/unit -c tests/unit/vitest.config.ts spam`

**Step 4: Commit**

```bash
git add src/routes/spam/handlers.ts
git commit -m "refactor(routes): use TokenAddress.normalizeForComparison in spam handlers

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Refactor TransactionProcessor extractTokenAddresses

**Files:**
- Modify: `src/services/transaction-processor/index.ts:165`

**Step 1: Add import for TokenAddress (if not already present)**

```typescript
import { TokenAddress } from '@/src/domain/value-objects/index.js';
```

**Step 2: Replace toLowerCase at line 165**

Change:
```typescript
addresses.add(transfer.token.address.toLowerCase());
```

To:
```typescript
addresses.add(TokenAddress.normalizeForComparison(transfer.token.address)!);
```

**Step 3: Run tests**

Run: `npx vitest run --dir tests/unit -c tests/unit/vitest.config.ts transaction-processor`

**Step 4: Commit**

```bash
git add src/services/transaction-processor/index.ts
git commit -m "refactor(services): use TokenAddress.normalizeForComparison in TransactionProcessor

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Run Full Test Suite

**Step 1: Run unit tests**

Run: `npm run test:unit`

Expected: All tests pass (pre-existing failures in unrelated tests are acceptable)

**Step 2: Run type checking**

Run: `npm run typecheck`

Expected: No new type errors from our changes

**Step 3: Verify repository-specific tests**

Run: `npx vitest run --dir tests/unit -c tests/unit/vitest.config.ts repository`

Expected: All repository tests pass

---

## Summary

| Task | File | Pattern | Value Object Method |
|------|------|---------|---------------------|
| 1 | address.repository.ts | `address.toLowerCase()` | `WalletAddress.normalizeForComparison()` |
| 2 | transaction.repository.ts | `txHash.toLowerCase()` | `TransactionHash.normalizeForComparison()` |
| 3 | transaction.repository.ts | `address.toLowerCase()` (2x) | `WalletAddress.normalizeForComparison()` |
| 4 | reconciliation.repository.ts | `address.toLowerCase()` (2x) | `WalletAddress.normalizeForComparison()` |
| 5 | token-holding.repository.ts | `tokenAddress.toLowerCase()` (2x) | `TokenAddress.normalizeForComparison()` |
| 6 | token.repository.ts | `address.toLowerCase()` | `TokenAddress.normalizeForComparison()` |
| 7 | spam/handlers.ts | `tokenAddress.toLowerCase()` (2x) | `TokenAddress.normalizeForComparison()` |
| 8 | transaction-processor/index.ts | `address.toLowerCase()` | `TokenAddress.normalizeForComparison()` |

**Total: 13 occurrences across 8 files**
