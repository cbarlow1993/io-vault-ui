# Hexagonal Architecture Value Object Migration - Final Cleanup

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the Hexagonal Architecture migration by migrating remaining currency normalization to use domain value objects and cleaning up outdated documentation.

**Architecture:** This plan completes the Domain-Driven Design refactoring by ensuring all normalization logic (addresses, hashes, currencies) flows through domain value objects rather than ad-hoc `.toLowerCase()` calls scattered across the codebase.

**Tech Stack:** TypeScript, Kysely ORM, Vitest, Domain Value Objects

---

## Executive Summary

### Migration Status: 95% Complete

The core Hexagonal Architecture migration is substantially complete:

| Domain Concept | Value Object | Status |
|----------------|--------------|--------|
| Wallet Addresses | `WalletAddress` | ✅ Complete |
| Token Addresses | `TokenAddress` | ✅ Complete |
| Transaction Hashes | `TransactionHash` | ✅ Complete |
| Currency Codes | `TokenPrice.normalizeCurrency()` | 🔄 Partially migrated |

### Remaining Work

1. **Token Price Repository** - 4 direct `.toLowerCase()` calls for currency normalization
2. **Pricing Service** - 1 redundant normalization before calling `TokenPrice.normalizeCurrency()`
3. **Documentation Cleanup** - Outdated comments in `WalletAddress` value object

### Files Already Migrated (No Action Needed)

These files were identified in previous reviews as potential candidates but have already been migrated:

- `src/services/transactions/transfer-enricher.ts` - Uses `WalletAddress.create()` (line 41)
- `src/services/spam/spam-classification-service.ts` - Uses `WalletAddress.normalizeForComparison()` (line 34)

### Remaining `.toLowerCase()` Calls (Appropriate - No Migration)

These are legitimate uses that should NOT be changed:

| Category | Location | Reason |
|----------|----------|--------|
| **Internal to Value Objects** | `wallet-address.ts`, `token-address.ts`, `transaction-hash.ts`, `token-price.ts` | Implementation details |
| **Error Message Comparison** | Build transaction builders | Comparing error strings, not domain values |
| **Config Parsing** | Various config files | Environment variable normalization |
| **Query Param Handling** | Transaction routes | Direction param (`asc`/`desc`) |

---

## Implementation Tasks

### Task 1: Migrate Token Price Repository to Use TokenPrice.normalizeCurrency()

**Files:**
- Modify: `src/repositories/token-price.repository.ts:31,46,68,85`
- Test: `tests/unit/repositories/token-price.repository.test.ts`

**Context:** The `TokenPrice` domain value object already has a `normalizeCurrency()` static method that handles currency code normalization. The repository should use this instead of ad-hoc `.toLowerCase()` calls.

**Step 1: Add TokenPrice import to repository**

```typescript
// Add to imports at top of file (around line 3)
import { TokenPrice } from '@/src/domain/value-objects/index.js';
```

**Step 2: Replace currency normalization in findByCoingeckoId (line 31)**

Change:
```typescript
.where('currency', '=', currency.toLowerCase())
```

To:
```typescript
.where('currency', '=', TokenPrice.normalizeCurrency(currency))
```

**Step 3: Replace currency normalization in findByCoingeckoIds (line 46)**

Change:
```typescript
.where('currency', '=', currency.toLowerCase())
```

To:
```typescript
.where('currency', '=', TokenPrice.normalizeCurrency(currency))
```

**Step 4: Replace currency normalization in findFreshPrices (line 68)**

Change:
```typescript
.where('currency', '=', currency.toLowerCase())
```

To:
```typescript
.where('currency', '=', TokenPrice.normalizeCurrency(currency))
```

**Step 5: Replace currency normalization in upsertMany (line 85)**

Change:
```typescript
currency: input.currency.toLowerCase(),
```

To:
```typescript
currency: TokenPrice.normalizeCurrency(input.currency),
```

**Step 6: Run repository tests**

Run: `npm test -- tests/unit/repositories/token-price.repository.test.ts`
Expected: All tests pass (behavior unchanged, just using domain method)

**Step 7: Commit**

```bash
git add src/repositories/token-price.repository.ts
git commit -m "$(cat <<'EOF'
refactor(repositories): use TokenPrice.normalizeCurrency in token-price repository

Migrate currency normalization from direct .toLowerCase() calls to the
domain value object method for consistency with Hexagonal Architecture.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Simplify Pricing Service Currency Normalization

**Files:**
- Modify: `src/services/balances/pricing-service.ts:67-68`
- Test: `tests/unit/services/balances/pricing-service.test.ts`

**Context:** The pricing service currently does redundant normalization - it calls `.toLowerCase().trim()` on line 67, then immediately calls `TokenPrice.normalizeCurrency()` on line 68. The domain method already handles the normalization.

**Step 1: Simplify the currency normalization logic**

Current code (lines 66-71):
```typescript
// Validate and normalize currency using domain value object
const originalCurrency = currency.toLowerCase().trim();
currency = TokenPrice.normalizeCurrency(currency);
if (currency !== originalCurrency) {
  logger.warn('Unsupported currency provided, using default USD', { currency: originalCurrency });
}
```

Replace with:
```typescript
// Validate and normalize currency using domain value object
const originalCurrency = currency;
const normalizedCurrency = TokenPrice.normalizeCurrency(currency);
if (normalizedCurrency !== originalCurrency.toLowerCase().trim()) {
  logger.warn('Unsupported currency provided, using default USD', { currency: originalCurrency });
}
currency = normalizedCurrency;
```

**Rationale:** This keeps the warning behavior (detecting unsupported currencies) while clarifying the flow. The comparison now correctly shows when the *input* was unsupported (not just when it changed case).

**Step 2: Run pricing service tests**

Run: `npm test -- tests/unit/services/balances/pricing-service.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/services/balances/pricing-service.ts
git commit -m "$(cat <<'EOF'
refactor(services): clarify currency normalization in pricing service

Improve clarity of currency validation by separating the original value
preservation from normalization. The warning now correctly detects when
an unsupported currency was provided.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Update Outdated Documentation in WalletAddress

**Files:**
- Modify: `src/domain/value-objects/wallet-address.ts:84-88`

**Context:** The JSDoc comment in `WalletAddress` references files that have already been migrated to use the value object. These references are now outdated and could confuse future developers.

**Step 1: Update the consolidation comment**

Current comment (lines 84-88):
```typescript
/**
 * Immutable value object representing a wallet address on a specific chain.
 *
 * Consolidates address normalization logic from:
 * - src/lib/lowercase.ts:1 (lowercase utility)
 * - src/repositories/address.repository.ts:73 (LOWER(address))
 * - src/services/transactions/transfer-enricher.ts:39 (perspectiveAddress.toLowerCase())
 * - src/services/spam/spam-classification-service.ts:34 (token.address.toLowerCase())
 *
```

Replace with:
```typescript
/**
 * Immutable value object representing a wallet address on a specific chain.
 *
 * Consolidates all address normalization logic that was previously scattered across:
 * - Repository SQL queries (LOWER(address) in WHERE clauses)
 * - Service methods (address.toLowerCase() comparisons)
 * - Route handlers (address normalization for matching)
 *
 * All address normalization should now flow through this value object or use
 * the static `normalizeForComparison()` method for quick comparisons.
 *
```

**Step 2: Commit**

```bash
git add src/domain/value-objects/wallet-address.ts
git commit -m "$(cat <<'EOF'
docs(domain): update WalletAddress consolidation comment

Remove specific file references that are now outdated (those files have
been migrated). Replace with general description of what was consolidated.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Run Full Test Suite Verification

**Step 1: Run all repository tests**

Run: `npm test -- tests/unit/repositories/`
Expected: All tests pass

**Step 2: Run all service tests**

Run: `npm test -- tests/unit/services/`
Expected: All tests pass (some pre-existing failures in transaction-processor mocking may occur)

**Step 3: Run domain value object tests**

Run: `npm test -- tests/unit/domain/`
Expected: All 243+ tests pass

**Step 4: Commit verification complete (no code changes)**

No commit needed - this is verification only.

---

## Appendix: Architecture Review Summary

### Normalization Methods by Domain Concept

| Domain Concept | Value Object Method | Use Case |
|----------------|---------------------|----------|
| Wallet Address | `WalletAddress.normalizeForComparison(addr)` | SQL queries, equality checks |
| Token Address | `TokenAddress.normalizeForComparison(addr)` | SQL queries, equality checks |
| Transaction Hash | `TransactionHash.normalizeForComparison(hash)` | SQL queries, equality checks |
| Currency Code | `TokenPrice.normalizeCurrency(currency)` | SQL queries, API validation |

### Pattern: Using Static Normalization Methods

For SQL queries and quick comparisons where creating a full value object is overhead:

```typescript
// In repositories - use static method for WHERE clauses
.where(sql`LOWER(address)`, '=', WalletAddress.normalizeForComparison(address))
.where('currency', '=', TokenPrice.normalizeCurrency(currency))

// In services - use for quick comparisons
if (WalletAddress.areEqual(addr1, addr2)) { ... }
```

For business logic where validation and chain awareness matters:

```typescript
// Create full value object when you need validation
const wallet = WalletAddress.create(address, chainAlias);
const tokenPrice = TokenPrice.create({ coingeckoId, price, currency });
```

### Files Reviewed (No Migration Needed)

| File | Reason |
|------|--------|
| `src/services/transactions/transfer-enricher.ts` | Already uses `WalletAddress.create()` |
| `src/services/spam/spam-classification-service.ts` | Already uses `WalletAddress.normalizeForComparison()` |
| Build transaction builders | Error message comparison (not domain values) |
| Config files | Environment variable parsing |
| Route handlers | Query parameter normalization (direction: `asc`/`desc`) |

---

## Success Criteria

After completing all tasks:

1. ✅ All currency normalization in `token-price.repository.ts` uses `TokenPrice.normalizeCurrency()`
2. ✅ Pricing service has clear, non-redundant normalization
3. ✅ WalletAddress documentation accurately reflects current state
4. ✅ All repository tests pass
5. ✅ All domain value object tests pass
6. ✅ No new `.toLowerCase()` calls for domain concepts in `src/` (excluding internal value object implementation)
