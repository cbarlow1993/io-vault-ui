# Hexagonal Architecture Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the migration of business logic from service layer to domain layer, achieving full hexagonal architecture compliance.

**Architecture:** Extract remaining business logic from services into domain value objects and entities, following established patterns (immutable objects via `Object.freeze()`, factory `create()` methods, pure functions). Services become thin orchestrators that coordinate repositories and domain objects.

**Tech Stack:** TypeScript, Vitest for testing, existing domain patterns in `src/domain/`

---

## Overview

The repository is approximately 60-70% migrated to hexagonal architecture. This plan completes the migration across 6 phases:

| Phase | Domain Object | Current Location | Priority |
|-------|--------------|------------------|----------|
| 1 | `Address` value object | Scattered `.toLowerCase()` calls | HIGH |
| 2 | Transaction classification rules | `evm-classifier.ts` | HIGH |
| 3 | `SpamClassificationResult` aggregate | `spam-classification-service.ts` | HIGH |
| 4 | `TokenPrice` value object | `pricing-service.ts` | MEDIUM |
| 5 | Reconciliation domain entities | `reconciliation-service.ts`, `config.ts` | MEDIUM |
| 6 | `TransactionCursor` value object | `cursor.ts` | MEDIUM |

---

## Phase 1: Address Value Object

**Goal:** Consolidate all address normalization into a chain-aware `Address` value object that handles comparison, normalization, and validation.

**Note:** `WalletAddress` already exists but lacks chain-aware validation and some comparison utilities. We'll extend it rather than create a new class.

### Task 1.1: Add chain-aware validation to WalletAddress

**Files:**
- Modify: `src/domain/value-objects/wallet-address.ts`
- Test: `tests/unit/domain/value-objects/wallet-address.test.ts`

**Step 1: Write failing tests for chain-aware validation**

Add to `tests/unit/domain/value-objects/wallet-address.test.ts`:

```typescript
describe('chain-aware validation', () => {
  it('validates EVM addresses start with 0x', () => {
    expect(() => WalletAddress.create('abc123', 'ethereum' as ChainAlias)).toThrow(InvalidAddressError);
    expect(() => WalletAddress.create('0xabc123', 'ethereum' as ChainAlias)).not.toThrow();
  });

  it('validates Solana addresses are base58', () => {
    // Valid Solana address (base58, 32-44 chars)
    expect(() => WalletAddress.create('4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T', 'solana-mainnet' as ChainAlias)).not.toThrow();
    // Invalid (contains 0, O, I, l which aren't in base58)
    expect(() => WalletAddress.create('0xabc123', 'solana-mainnet' as ChainAlias)).toThrow(InvalidAddressError);
  });

  it('validates Bitcoin addresses', () => {
    // P2PKH (starts with 1)
    expect(() => WalletAddress.create('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 'btc-mainnet' as ChainAlias)).not.toThrow();
    // Invalid
    expect(() => WalletAddress.create('0xabc', 'btc-mainnet' as ChainAlias)).toThrow(InvalidAddressError);
  });

  it('skips validation for unknown chain types (permissive)', () => {
    expect(() => WalletAddress.create('anyaddress', 'unknown-chain' as ChainAlias)).not.toThrow();
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm run test:unit -- tests/unit/domain/value-objects/wallet-address.test.ts --reporter=verbose
```

Expected: FAIL with validation not implemented

**Step 3: Implement chain-aware validation**

Modify `src/domain/value-objects/wallet-address.ts`:

```typescript
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { InvalidAddressError } from './errors.js';

// Add after the NormalizedAddress type declaration:

type ChainType = 'evm' | 'solana' | 'bitcoin' | 'unknown';

const CHAIN_TYPE_MAP: Record<string, ChainType> = {
  // EVM chains
  'ethereum': 'evm',
  'eth-mainnet': 'evm',
  'eth-sepolia': 'evm',
  'eth-holesky': 'evm',
  'polygon': 'evm',
  'polygon-mainnet': 'evm',
  'polygon-amoy': 'evm',
  'arbitrum-mainnet': 'evm',
  'arbitrum-sepolia': 'evm',
  'optimism-mainnet': 'evm',
  'optimism-sepolia': 'evm',
  'base-mainnet': 'evm',
  'base-sepolia': 'evm',
  'avalanche-mainnet': 'evm',
  'bsc-mainnet': 'evm',
  'fantom-mainnet': 'evm',
  // Solana
  'solana-mainnet': 'solana',
  'solana-devnet': 'solana',
  // Bitcoin
  'btc-mainnet': 'bitcoin',
  'btc-testnet': 'bitcoin',
  'ltc-mainnet': 'bitcoin',
  'doge-mainnet': 'bitcoin',
};

function getChainType(chainAlias: ChainAlias): ChainType {
  return CHAIN_TYPE_MAP[chainAlias] ?? 'unknown';
}

// Inside WalletAddress class, modify create():

static create(address: string, chainAlias: ChainAlias): WalletAddress {
  if (!address || typeof address !== 'string') {
    throw new InvalidAddressError(address ?? '', chainAlias);
  }
  const trimmed = address.trim();
  if (trimmed.length === 0) {
    throw new InvalidAddressError('', chainAlias);
  }

  // Chain-aware validation
  const chainType = getChainType(chainAlias);
  WalletAddress.validateForChainType(trimmed, chainType, chainAlias);

  return new WalletAddress(trimmed, chainAlias);
}

private static validateForChainType(address: string, chainType: ChainType, chainAlias: ChainAlias): void {
  switch (chainType) {
    case 'evm':
      if (!address.startsWith('0x')) {
        throw new InvalidAddressError(address, chainAlias, 'EVM addresses must start with 0x');
      }
      break;
    case 'solana':
      // Base58 character set (no 0, O, I, l)
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
        throw new InvalidAddressError(address, chainAlias, 'Invalid Solana address format');
      }
      break;
    case 'bitcoin':
      // P2PKH (1), P2SH (3), Bech32 (bc1), Taproot (bc1p)
      if (!/^(1|3|bc1|bc1p)[a-zA-HJ-NP-Z0-9]{25,62}$/.test(address)) {
        throw new InvalidAddressError(address, chainAlias, 'Invalid Bitcoin address format');
      }
      break;
    case 'unknown':
      // Permissive for unknown chains
      break;
  }
}
```

**Step 4: Update InvalidAddressError to support reason**

Modify `src/domain/value-objects/errors.ts`:

```typescript
export class InvalidAddressError extends ValueObjectError {
  constructor(
    public readonly address: string,
    public readonly chainAlias: string,
    reason?: string
  ) {
    super(`Invalid address "${address}" for chain "${chainAlias}"${reason ? `: ${reason}` : ''}`);
    this.name = 'InvalidAddressError';
  }
}
```

**Step 5: Run tests to verify they pass**

```bash
npm run test:unit -- tests/unit/domain/value-objects/wallet-address.test.ts --reporter=verbose
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/domain/value-objects/wallet-address.ts src/domain/value-objects/errors.ts tests/unit/domain/value-objects/wallet-address.test.ts
git commit -m "feat(domain): add chain-aware validation to WalletAddress

- Add validation for EVM, Solana, and Bitcoin address formats
- Unknown chains use permissive validation
- Update InvalidAddressError to include optional reason

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 1.2: Add static comparison helpers to WalletAddress

**Files:**
- Modify: `src/domain/value-objects/wallet-address.ts`
- Test: `tests/unit/domain/value-objects/wallet-address.test.ts`

**Step 1: Write failing tests for static comparison**

Add to `tests/unit/domain/value-objects/wallet-address.test.ts`:

```typescript
describe('static comparison helpers', () => {
  describe('normalizeForComparison', () => {
    it('normalizes any address string for comparison', () => {
      expect(WalletAddress.normalizeForComparison('0xAbC')).toBe('0xabc');
      expect(WalletAddress.normalizeForComparison('  0xDEF  ')).toBe('0xdef');
    });
  });

  describe('areEqual', () => {
    it('compares two raw address strings', () => {
      expect(WalletAddress.areEqual('0xABC', '0xabc')).toBe(true);
      expect(WalletAddress.areEqual('0xABC', '0xDEF')).toBe(false);
    });

    it('handles whitespace', () => {
      expect(WalletAddress.areEqual('  0xABC  ', '0xabc')).toBe(true);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm run test:unit -- tests/unit/domain/value-objects/wallet-address.test.ts --reporter=verbose
```

Expected: FAIL

**Step 3: Implement static helpers**

Add to `src/domain/value-objects/wallet-address.ts`:

```typescript
/**
 * Normalize any address string for comparison (without creating a WalletAddress instance).
 * Useful for quick comparisons in services before creating full value objects.
 */
static normalizeForComparison(address: string): string {
  return address.toLowerCase().trim();
}

/**
 * Compare two raw address strings for equality (case-insensitive).
 * Useful for comparing addresses without chain context.
 */
static areEqual(a: string, b: string): boolean {
  return WalletAddress.normalizeForComparison(a) === WalletAddress.normalizeForComparison(b);
}
```

**Step 4: Run tests to verify they pass**

```bash
npm run test:unit -- tests/unit/domain/value-objects/wallet-address.test.ts --reporter=verbose
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/domain/value-objects/wallet-address.ts tests/unit/domain/value-objects/wallet-address.test.ts
git commit -m "feat(domain): add static comparison helpers to WalletAddress

- normalizeForComparison for quick string normalization
- areEqual for comparing raw address strings

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 1.3: Update spam-classification-service to use WalletAddress

**Files:**
- Modify: `src/services/spam/spam-classification-service.ts`
- Test: `tests/unit/services/spam/spam-classification-service.test.ts`

**Step 1: Read existing tests to understand patterns**

Review `tests/unit/services/spam/spam-classification-service.test.ts` for test patterns.

**Step 2: Update service to use WalletAddress.normalizeForComparison**

Modify `src/services/spam/spam-classification-service.ts`:

```typescript
import { WalletAddress } from '@/src/domain/value-objects/index.js';

// Line 32: Change
tokenAddress: token.address.toLowerCase(),
// To:
tokenAddress: WalletAddress.normalizeForComparison(token.address),

// Line 48: Change
results.set(token.address.toLowerCase(), classification);
// To:
results.set(WalletAddress.normalizeForComparison(token.address), classification);
```

**Step 3: Run existing tests to verify no regression**

```bash
npm run test:unit -- tests/unit/services/spam/spam-classification-service.test.ts --reporter=verbose
```

Expected: PASS (behavior unchanged)

**Step 4: Commit**

```bash
git add src/services/spam/spam-classification-service.ts
git commit -m "refactor(spam): use WalletAddress for address normalization

Replace .toLowerCase() with WalletAddress.normalizeForComparison()
for consistent address handling across the codebase.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 1.4: Update evm-classifier to use WalletAddress

**Files:**
- Modify: `src/services/transaction-processor/classifier/evm-classifier.ts`
- Test: `tests/unit/services/transaction-processor/classifier/evm-classifier.test.ts`

**Step 1: Update classifier to use WalletAddress.areEqual**

Modify `src/services/transaction-processor/classifier/evm-classifier.ts`:

```typescript
import { WalletAddress } from '@/src/domain/value-objects/index.js';

// Line 90: Change
const direction = from.toLowerCase() === tx.from.toLowerCase() ? 'out' : 'in';
// To:
const direction = WalletAddress.areEqual(from, tx.from) ? 'out' : 'in';

// Line 103: Change
return transfers.some((t) => t.from.toLowerCase() === '0x' + ZERO_ADDRESS.slice(26));
// To:
return transfers.some((t) => WalletAddress.areEqual(t.from, '0x' + ZERO_ADDRESS.slice(26)));

// Line 107: Change
return transfers.some((t) => t.to.toLowerCase() === '0x' + ZERO_ADDRESS.slice(26));
// To:
return transfers.some((t) => WalletAddress.areEqual(t.to, '0x' + ZERO_ADDRESS.slice(26)));

// Lines 112-113: Change
const hasOut = transfers.some((t) => t.direction === 'out' && t.from.toLowerCase() === sender.toLowerCase());
const hasIn = transfers.some((t) => t.direction === 'in' && t.to.toLowerCase() === sender.toLowerCase());
// To:
const hasOut = transfers.some((t) => t.direction === 'out' && WalletAddress.areEqual(t.from, sender));
const hasIn = transfers.some((t) => t.direction === 'in' && WalletAddress.areEqual(t.to, sender));
```

**Step 2: Run existing tests to verify no regression**

```bash
npm run test:unit -- tests/unit/services/transaction-processor/classifier/evm-classifier.test.ts --reporter=verbose
```

Expected: PASS

**Step 3: Commit**

```bash
git add src/services/transaction-processor/classifier/evm-classifier.ts
git commit -m "refactor(classifier): use WalletAddress for address comparison

Replace .toLowerCase() comparisons with WalletAddress.areEqual()
for consistent address handling.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 2: Expand TransactionClassification Domain Entity

**Goal:** Move transaction classification rule logic from `evm-classifier.ts` into the `TransactionClassification` domain entity, leaving only chain-specific parsing in classifiers.

### Task 2.1: Add classification detection methods to TransactionClassification

**Files:**
- Modify: `src/domain/entities/transaction/classification.ts`
- Test: `tests/unit/domain/entities/transaction/classification.test.ts`

**Step 1: Write failing tests for detection methods**

Add to `tests/unit/domain/entities/transaction/classification.test.ts`:

```typescript
describe('classification detection', () => {
  describe('detectMint', () => {
    it('detects mint when transfer from zero address', () => {
      const result = TransactionClassification.detectMint([
        { from: '0x0000000000000000000000000000000000000000', to: '0xabc', amount: '100' }
      ]);
      expect(result).toBe(true);
    });

    it('returns false when no zero address sender', () => {
      const result = TransactionClassification.detectMint([
        { from: '0xabc', to: '0xdef', amount: '100' }
      ]);
      expect(result).toBe(false);
    });
  });

  describe('detectBurn', () => {
    it('detects burn when transfer to zero address', () => {
      const result = TransactionClassification.detectBurn([
        { from: '0xabc', to: '0x0000000000000000000000000000000000000000', amount: '100' }
      ]);
      expect(result).toBe(true);
    });
  });

  describe('detectSwap', () => {
    it('detects swap when sender has both in and out transfers', () => {
      const sender = '0xabc';
      const result = TransactionClassification.detectSwap([
        { from: sender, to: '0xrouter', amount: '100', direction: 'out' },
        { from: '0xrouter', to: sender, amount: '50', direction: 'in' }
      ], sender);
      expect(result).toBe(true);
    });

    it('returns false for single transfer', () => {
      const result = TransactionClassification.detectSwap([
        { from: '0xabc', to: '0xdef', amount: '100', direction: 'out' }
      ], '0xabc');
      expect(result).toBe(false);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm run test:unit -- tests/unit/domain/entities/transaction/classification.test.ts --reporter=verbose
```

Expected: FAIL

**Step 3: Implement detection methods**

Add to `src/domain/entities/transaction/classification.ts`:

```typescript
import { WalletAddress } from '@/src/domain/value-objects/index.js';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export interface TransferForClassification {
  from: string;
  to: string;
  amount: string;
  direction?: 'in' | 'out';
}

// Add static detection methods to TransactionClassification class:

/**
 * Detect if transaction is a mint (transfer from zero address)
 */
static detectMint(transfers: TransferForClassification[]): boolean {
  return transfers.some((t) => WalletAddress.areEqual(t.from, ZERO_ADDRESS));
}

/**
 * Detect if transaction is a burn (transfer to zero address)
 */
static detectBurn(transfers: TransferForClassification[]): boolean {
  return transfers.some((t) => WalletAddress.areEqual(t.to, ZERO_ADDRESS));
}

/**
 * Detect if transaction is a swap (sender has both in and out transfers)
 */
static detectSwap(transfers: TransferForClassification[], sender: string): boolean {
  if (transfers.length < 2) return false;
  const hasOut = transfers.some((t) => t.direction === 'out' && WalletAddress.areEqual(t.from, sender));
  const hasIn = transfers.some((t) => t.direction === 'in' && WalletAddress.areEqual(t.to, sender));
  return hasOut && hasIn;
}
```

**Step 4: Run tests to verify they pass**

```bash
npm run test:unit -- tests/unit/domain/entities/transaction/classification.test.ts --reporter=verbose
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/domain/entities/transaction/classification.ts tests/unit/domain/entities/transaction/classification.test.ts
git commit -m "feat(domain): add classification detection methods

- detectMint: checks for zero address sender
- detectBurn: checks for zero address recipient
- detectSwap: checks for bidirectional transfers

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 2.2: Add factory method for classification from detection results

**Files:**
- Modify: `src/domain/entities/transaction/classification.ts`
- Test: `tests/unit/domain/entities/transaction/classification.test.ts`

**Step 1: Write failing tests for factory method**

Add to `tests/unit/domain/entities/transaction/classification.test.ts`:

```typescript
describe('fromDetection', () => {
  it('creates mint classification when mint detected', () => {
    const transfers = [{ from: '0x0000000000000000000000000000000000000000', to: '0xabc', amount: '100' }];
    const result = TransactionClassification.fromDetection({
      transfers,
      sender: '0xdef',
      perspectiveAddress: '0xabc',
      isContractDeploy: false,
      isApproval: false,
      hasNativeValue: false,
    });
    expect(result.type).toBe('mint');
    expect(result.direction).toBe('in');
  });

  it('creates swap classification when swap detected', () => {
    const sender = '0xabc';
    const transfers = [
      { from: sender, to: '0xrouter', amount: '100', direction: 'out' as const },
      { from: '0xrouter', to: sender, amount: '50', direction: 'in' as const }
    ];
    const result = TransactionClassification.fromDetection({
      transfers,
      sender,
      perspectiveAddress: sender,
      isContractDeploy: false,
      isApproval: false,
      hasNativeValue: false,
    });
    expect(result.type).toBe('swap');
    expect(result.direction).toBe('neutral');
  });

  it('creates contract_deploy classification', () => {
    const result = TransactionClassification.fromDetection({
      transfers: [],
      sender: '0xabc',
      perspectiveAddress: '0xabc',
      isContractDeploy: true,
      isApproval: false,
      hasNativeValue: false,
    });
    expect(result.type).toBe('contract_deploy');
  });

  it('creates approve classification', () => {
    const result = TransactionClassification.fromDetection({
      transfers: [],
      sender: '0xabc',
      perspectiveAddress: '0xabc',
      isContractDeploy: false,
      isApproval: true,
      hasNativeValue: false,
    });
    expect(result.type).toBe('approve');
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm run test:unit -- tests/unit/domain/entities/transaction/classification.test.ts --reporter=verbose
```

Expected: FAIL

**Step 3: Implement factory method**

Add to `src/domain/entities/transaction/classification.ts`:

```typescript
export interface DetectionInput {
  transfers: TransferForClassification[];
  sender: string;
  perspectiveAddress: string;
  isContractDeploy: boolean;
  isApproval: boolean;
  hasNativeValue: boolean;
}

/**
 * Create a classification from transaction detection results.
 * Encapsulates the classification decision logic.
 */
static fromDetection(input: DetectionInput): TransactionClassification {
  const { transfers, sender, perspectiveAddress, isContractDeploy, isApproval, hasNativeValue } = input;

  // Priority order of classification
  if (isContractDeploy) {
    return TransactionClassification.create({
      type: 'contract_deploy',
      direction: 'neutral',
      confidence: 'high',
      source: 'custom',
      label: TransactionClassification.generateLabel('contract_deploy', 'neutral'),
    });
  }

  if (isApproval) {
    return TransactionClassification.create({
      type: 'approve',
      direction: 'neutral',
      confidence: 'high',
      source: 'custom',
      label: TransactionClassification.generateLabel('approve', 'neutral'),
    });
  }

  if (TransactionClassification.detectMint(transfers)) {
    const direction = TransactionClassification.computeDirection('mint', 0, 0);
    return TransactionClassification.create({
      type: 'mint',
      direction,
      confidence: 'high',
      source: 'custom',
      label: TransactionClassification.generateLabel('mint', direction),
    });
  }

  if (TransactionClassification.detectBurn(transfers)) {
    const direction = TransactionClassification.computeDirection('burn', 0, 0);
    return TransactionClassification.create({
      type: 'burn',
      direction,
      confidence: 'high',
      source: 'custom',
      label: TransactionClassification.generateLabel('burn', direction),
    });
  }

  if (TransactionClassification.detectSwap(transfers, sender)) {
    const direction = TransactionClassification.computeDirection('swap', 0, 0);
    return TransactionClassification.create({
      type: 'swap',
      direction,
      confidence: 'medium',
      source: 'custom',
      label: TransactionClassification.generateLabel('swap', direction),
    });
  }

  // Native transfer (value > 0, no contract call)
  if (hasNativeValue && transfers.length === 0) {
    const inCount = WalletAddress.areEqual(perspectiveAddress, sender) ? 0 : 1;
    const outCount = WalletAddress.areEqual(perspectiveAddress, sender) ? 1 : 0;
    const direction = TransactionClassification.computeDirection('transfer', inCount, outCount);
    return TransactionClassification.create({
      type: 'transfer',
      direction,
      confidence: 'high',
      source: 'custom',
      label: TransactionClassification.generateLabel('transfer', direction),
    });
  }

  // Single token transfer
  if (transfers.length === 1) {
    const inCount = transfers.filter(t => t.direction === 'in').length;
    const outCount = transfers.filter(t => t.direction === 'out').length;
    const direction = TransactionClassification.computeDirection('transfer', inCount, outCount);
    return TransactionClassification.create({
      type: 'transfer',
      direction,
      confidence: 'high',
      source: 'custom',
      label: TransactionClassification.generateLabel('transfer', direction),
    });
  }

  // Unknown
  return TransactionClassification.unknown();
}
```

**Step 4: Run tests to verify they pass**

```bash
npm run test:unit -- tests/unit/domain/entities/transaction/classification.test.ts --reporter=verbose
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/domain/entities/transaction/classification.ts tests/unit/domain/entities/transaction/classification.test.ts
git commit -m "feat(domain): add fromDetection factory for TransactionClassification

Encapsulates classification decision logic with priority ordering:
contract_deploy > approve > mint > burn > swap > transfer > unknown

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 2.3: Update evm-classifier to delegate to domain

**Files:**
- Modify: `src/services/transaction-processor/classifier/evm-classifier.ts`
- Test: `tests/unit/services/transaction-processor/classifier/evm-classifier.test.ts`

**Step 1: Refactor classifier to use domain entity**

Modify `src/services/transaction-processor/classifier/evm-classifier.ts`:

```typescript
import type { Classifier, ClassificationResult, ClassifyOptions, EvmTransactionData, ParsedTransfer, RawTransaction } from '@/src/services/transaction-processor/types.js';
import { TransactionClassification } from '@/src/domain/entities/transaction/classification.js';
import { WalletAddress } from '@/src/domain/value-objects/index.js';

const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const APPROVAL_TOPIC = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';

export class EvmClassifier implements Classifier {
  async classify(tx: RawTransaction, options: ClassifyOptions): Promise<ClassificationResult> {
    if (tx.type !== 'evm') {
      throw new Error('EvmClassifier can only classify EVM transactions');
    }
    const evmTx = tx as EvmTransactionData;

    // Parse chain-specific data (EVM-specific logic stays here)
    const transfers = this.parseTransfers(evmTx);
    const isContractDeploy = evmTx.to === null;
    const isApproval = this.isApproval(evmTx);
    const hasNativeValue = BigInt(evmTx.value) > 0n && evmTx.input === '0x';

    // Delegate classification decision to domain
    const classification = TransactionClassification.fromDetection({
      transfers: transfers.map(t => ({
        from: t.from,
        to: t.to,
        amount: t.amount,
        direction: t.direction,
      })),
      sender: evmTx.from,
      perspectiveAddress: options.perspectiveAddress,
      isContractDeploy,
      isApproval,
      hasNativeValue,
    });

    // Add native transfer if value > 0
    const resultTransfers = hasNativeValue && !isContractDeploy
      ? [{ type: 'native' as const, direction: 'out' as const, from: evmTx.from, to: evmTx.to!, amount: evmTx.value }, ...transfers]
      : transfers;

    return {
      type: classification.type,
      direction: classification.direction,
      confidence: classification.confidence,
      source: classification.source,
      label: classification.label,
      transfers: resultTransfers,
    };
  }

  private parseTransfers(tx: EvmTransactionData): ParsedTransfer[] {
    const transfers: ParsedTransfer[] = [];
    for (const log of tx.logs) {
      if (log.topics[0] === TRANSFER_TOPIC && log.topics.length >= 3) {
        const from = '0x' + log.topics[1]!.slice(26);
        const to = '0x' + log.topics[2]!.slice(26);
        const amount = log.data === '0x' || log.data === '' ? '0' : BigInt(log.data).toString();
        const direction = WalletAddress.areEqual(from, tx.from) ? 'out' : 'in';
        transfers.push({ type: 'token', direction, from, to, amount, token: { address: log.address } });
      }
    }
    return transfers;
  }

  private isApproval(tx: EvmTransactionData): boolean {
    if (tx.input.startsWith('0x095ea7b3')) return true;
    return tx.logs.some((log) => log.topics[0] === APPROVAL_TOPIC);
  }
}
```

**Step 2: Run all classifier tests to verify no regression**

```bash
npm run test:unit -- tests/unit/services/transaction-processor/classifier/ --reporter=verbose
```

Expected: PASS

**Step 3: Commit**

```bash
git add src/services/transaction-processor/classifier/evm-classifier.ts
git commit -m "refactor(classifier): delegate classification logic to domain entity

EvmClassifier now only handles EVM-specific parsing:
- Log parsing for transfers
- Approval detection via function selector/topic
- Native value detection

Classification decisions delegated to TransactionClassification.fromDetection()

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 3: SpamClassificationResult Aggregate

**Goal:** Move spam classification merging logic from `spam-classification-service.ts` into a domain aggregate.

### Task 3.1: Create SpamClassificationResult entity

**Files:**
- Create: `src/domain/entities/spam/spam-classification-result.ts`
- Create: `tests/unit/domain/entities/spam/spam-classification-result.test.ts`
- Modify: `src/domain/entities/index.ts`

**Step 1: Create test file with failing tests**

Create `tests/unit/domain/entities/spam/spam-classification-result.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { SpamClassificationResult, type ProviderResult } from '@/src/domain/entities/spam/spam-classification-result.js';

describe('SpamClassificationResult', () => {
  describe('merge', () => {
    it('creates result from multiple provider results', () => {
      const results: ProviderResult[] = [
        { blockaid: { isSpam: true, reason: 'known scam' } },
        { coingecko: { isListed: true, marketCapRank: 100 } },
        { heuristics: { suspiciousName: false, namePatterns: [], isUnsolicited: false } },
      ];

      const merged = SpamClassificationResult.merge(results);

      expect(merged.blockaid).toEqual({ isSpam: true, reason: 'known scam' });
      expect(merged.coingecko).toEqual({ isListed: true, marketCapRank: 100 });
      expect(merged.heuristics?.suspiciousName).toBe(false);
    });

    it('uses defaults when provider results are missing', () => {
      const results: ProviderResult[] = [
        { blockaid: { isSpam: false, reason: null } },
      ];

      const merged = SpamClassificationResult.merge(results);

      expect(merged.blockaid).toEqual({ isSpam: false, reason: null });
      expect(merged.coingecko).toEqual({ isListed: false, marketCapRank: null });
      expect(merged.heuristics).toEqual({
        suspiciousName: false,
        namePatterns: [],
        isUnsolicited: false,
        contractAgeDays: null,
        isNewContract: false,
        holderDistribution: 'unknown',
      });
    });

    it('later results override earlier ones', () => {
      const results: ProviderResult[] = [
        { blockaid: { isSpam: false, reason: null } },
        { blockaid: { isSpam: true, reason: 'updated' } },
      ];

      const merged = SpamClassificationResult.merge(results);
      expect(merged.blockaid).toEqual({ isSpam: true, reason: 'updated' });
    });
  });

  describe('immutability', () => {
    it('is frozen', () => {
      const result = SpamClassificationResult.merge([]);
      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('serializes correctly', () => {
      const result = SpamClassificationResult.merge([
        { blockaid: { isSpam: true, reason: 'test' } }
      ]);
      const json = result.toJSON();
      expect(json).toHaveProperty('blockaid');
      expect(json).toHaveProperty('coingecko');
      expect(json).toHaveProperty('heuristics');
    });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm run test:unit -- tests/unit/domain/entities/spam/spam-classification-result.test.ts --reporter=verbose
```

Expected: FAIL (file doesn't exist)

**Step 3: Create the entity**

Create `src/domain/entities/spam/spam-classification-result.ts`:

```typescript
/**
 * SpamClassificationResult aggregate.
 * Immutable representation of merged spam classification results from multiple providers.
 */

export interface BlockaidResult {
  isSpam: boolean;
  reason: string | null;
}

export interface CoingeckoResult {
  isListed: boolean;
  marketCapRank: number | null;
}

export interface HeuristicsResult {
  suspiciousName: boolean;
  namePatterns: string[];
  isUnsolicited: boolean;
  contractAgeDays: number | null;
  isNewContract: boolean;
  holderDistribution: 'concentrated' | 'distributed' | 'unknown';
}

export interface ProviderResult {
  blockaid?: BlockaidResult;
  coingecko?: CoingeckoResult;
  heuristics?: HeuristicsResult;
}

export interface SpamClassificationData {
  blockaid: BlockaidResult | null;
  coingecko: CoingeckoResult;
  heuristics: HeuristicsResult;
}

const DEFAULT_COINGECKO: CoingeckoResult = {
  isListed: false,
  marketCapRank: null,
};

const DEFAULT_HEURISTICS: HeuristicsResult = {
  suspiciousName: false,
  namePatterns: [],
  isUnsolicited: false,
  contractAgeDays: null,
  isNewContract: false,
  holderDistribution: 'unknown',
};

/**
 * Immutable aggregate for spam classification results.
 *
 * @example
 * const result = SpamClassificationResult.merge([
 *   { blockaid: { isSpam: true, reason: 'known scam' } },
 *   { coingecko: { isListed: false, marketCapRank: null } },
 * ]);
 * result.blockaid; // { isSpam: true, reason: 'known scam' }
 */
export class SpamClassificationResult {
  private constructor(
    public readonly blockaid: BlockaidResult | null,
    public readonly coingecko: CoingeckoResult,
    public readonly heuristics: HeuristicsResult
  ) {
    Object.freeze(this);
  }

  /**
   * Merge multiple provider results into a single classification.
   * Later results override earlier ones.
   */
  static merge(results: ProviderResult[]): SpamClassificationResult {
    let blockaid: BlockaidResult | null = null;
    let coingecko: CoingeckoResult = { ...DEFAULT_COINGECKO };
    let heuristics: HeuristicsResult = { ...DEFAULT_HEURISTICS };

    for (const result of results) {
      if (result.blockaid !== undefined) {
        blockaid = result.blockaid;
      }
      if (result.coingecko !== undefined) {
        coingecko = result.coingecko;
      }
      if (result.heuristics !== undefined) {
        heuristics = result.heuristics;
      }
    }

    return new SpamClassificationResult(blockaid, coingecko, heuristics);
  }

  /**
   * Create from raw data (e.g., from database)
   */
  static fromData(data: SpamClassificationData): SpamClassificationResult {
    return new SpamClassificationResult(
      data.blockaid,
      data.coingecko,
      data.heuristics
    );
  }

  /**
   * Create empty classification with defaults
   */
  static empty(): SpamClassificationResult {
    return new SpamClassificationResult(null, DEFAULT_COINGECKO, DEFAULT_HEURISTICS);
  }

  toJSON(): SpamClassificationData {
    return {
      blockaid: this.blockaid,
      coingecko: this.coingecko,
      heuristics: this.heuristics,
    };
  }
}
```

**Step 4: Export from index**

Update `src/domain/entities/index.ts`:

```typescript
// Add export
export { SpamClassificationResult, type ProviderResult, type SpamClassificationData } from './spam/spam-classification-result.js';
```

**Step 5: Run tests to verify they pass**

```bash
npm run test:unit -- tests/unit/domain/entities/spam/spam-classification-result.test.ts --reporter=verbose
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/domain/entities/spam/spam-classification-result.ts src/domain/entities/index.ts tests/unit/domain/entities/spam/spam-classification-result.test.ts
git commit -m "feat(domain): add SpamClassificationResult aggregate

Immutable entity for merging spam classification provider results.
Consolidates mergeClassifications logic from spam-classification-service.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 3.2: Update spam-classification-service to use domain aggregate

**Files:**
- Modify: `src/services/spam/spam-classification-service.ts`
- Test: `tests/unit/services/spam/spam-classification-service.test.ts`

**Step 1: Update service to use SpamClassificationResult**

Modify `src/services/spam/spam-classification-service.ts`:

```typescript
import { logger } from '@/utils/powertools.js';
import type {
  SpamClassification,
  SpamClassificationProvider,
  TokenToClassify,
  ClassificationResult,
} from '@/src/services/spam/types.js';
import { TokenClassification, type RiskSummary, SpamClassificationResult } from '@/src/domain/entities/index.js';
import { WalletAddress } from '@/src/domain/value-objects/index.js';

export type { RiskSummary };

export class SpamClassificationService {
  constructor(private readonly providers: SpamClassificationProvider[]) {}

  async classifyToken(token: TokenToClassify): Promise<ClassificationResult> {
    // Call all providers in parallel
    const providerResults = await Promise.all(
      this.providers.map(async (provider) => {
        try {
          return await provider.classify(token);
        } catch (error) {
          logger.warn('Provider classification failed', { provider: provider.name, error, tokenAddress: token.address });
          return {};
        }
      })
    );

    // Delegate merging to domain aggregate
    const merged = SpamClassificationResult.merge(providerResults);
    const classification = merged.toJSON();

    return {
      tokenAddress: WalletAddress.normalizeForComparison(token.address),
      classification,
      updatedAt: new Date(),
    };
  }

  async classifyTokensBatch(tokens: TokenToClassify[]): Promise<Map<string, ClassificationResult>> {
    const results = new Map<string, ClassificationResult>();

    // Process tokens in parallel
    const classificationPromises = tokens.map((token) => this.classifyToken(token));
    const classifications = await Promise.all(classificationPromises);

    tokens.forEach((token, index) => {
      const classification = classifications[index];
      if (classification) {
        results.set(WalletAddress.normalizeForComparison(token.address), classification);
      }
    });

    return results;
  }

  computeRiskSummary(
    classification: SpamClassification,
    userOverride: 'trusted' | 'spam' | null
  ): RiskSummary {
    const tokenClassification = TokenClassification.create({
      blockaid: classification.blockaid,
      coingecko: classification.coingecko,
      heuristics: classification.heuristics,
      classifiedAt: new Date(),
    });
    return tokenClassification.getRiskSummary(userOverride);
  }
}
```

**Step 2: Run tests to verify no regression**

```bash
npm run test:unit -- tests/unit/services/spam/spam-classification-service.test.ts --reporter=verbose
```

Expected: PASS

**Step 3: Commit**

```bash
git add src/services/spam/spam-classification-service.ts
git commit -m "refactor(spam): delegate merging to SpamClassificationResult aggregate

Service now uses domain entity for merging provider results.
Removes duplicated mergeClassifications logic.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 4: TokenPrice Value Object

**Goal:** Encapsulate price staleness, TTL, and currency validation logic in a domain value object.

### Task 4.1: Create TokenPrice value object

**Files:**
- Create: `src/domain/value-objects/token-price.ts`
- Create: `tests/unit/domain/value-objects/token-price.test.ts`
- Modify: `src/domain/value-objects/index.ts`

**Step 1: Create test file with failing tests**

Create `tests/unit/domain/value-objects/token-price.test.ts`:

```typescript
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { TokenPrice, InvalidPriceError, SUPPORTED_CURRENCIES } from '@/src/domain/value-objects/token-price.js';

describe('TokenPrice', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('create', () => {
    it('creates a TokenPrice from valid data', () => {
      const price = TokenPrice.create({
        coingeckoId: 'bitcoin',
        price: 50000,
        currency: 'usd',
        priceChange24h: 2.5,
        marketCap: 900000000000,
      });

      expect(price.coingeckoId).toBe('bitcoin');
      expect(price.price).toBe(50000);
      expect(price.currency).toBe('usd');
      expect(price.priceChange24h).toBe(2.5);
      expect(price.marketCap).toBe(900000000000);
    });

    it('throws for invalid price (negative)', () => {
      expect(() => TokenPrice.create({
        coingeckoId: 'bitcoin',
        price: -100,
        currency: 'usd',
      })).toThrow(InvalidPriceError);
    });

    it('throws for invalid price (zero)', () => {
      expect(() => TokenPrice.create({
        coingeckoId: 'bitcoin',
        price: 0,
        currency: 'usd',
      })).toThrow(InvalidPriceError);
    });
  });

  describe('isStale', () => {
    it('returns false for fresh price', () => {
      const now = new Date('2024-01-01T12:00:00Z');
      vi.setSystemTime(now);

      const price = TokenPrice.create({
        coingeckoId: 'bitcoin',
        price: 50000,
        currency: 'usd',
        fetchedAt: now,
      });

      expect(price.isStale(60)).toBe(false);
    });

    it('returns true for stale price', () => {
      const fetchedAt = new Date('2024-01-01T12:00:00Z');
      const now = new Date('2024-01-01T12:02:00Z'); // 2 minutes later
      vi.setSystemTime(now);

      const price = TokenPrice.create({
        coingeckoId: 'bitcoin',
        price: 50000,
        currency: 'usd',
        fetchedAt,
      });

      expect(price.isStale(60)).toBe(true); // 60 seconds TTL, price is 120s old
    });
  });

  describe('isSupportedCurrency', () => {
    it('returns true for supported currencies', () => {
      expect(TokenPrice.isSupportedCurrency('usd')).toBe(true);
      expect(TokenPrice.isSupportedCurrency('USD')).toBe(true);
      expect(TokenPrice.isSupportedCurrency('eur')).toBe(true);
      expect(TokenPrice.isSupportedCurrency('btc')).toBe(true);
    });

    it('returns false for unsupported currencies', () => {
      expect(TokenPrice.isSupportedCurrency('xyz')).toBe(false);
      expect(TokenPrice.isSupportedCurrency('')).toBe(false);
    });
  });

  describe('normalizeCurrency', () => {
    it('normalizes and validates currency', () => {
      expect(TokenPrice.normalizeCurrency('USD')).toBe('usd');
      expect(TokenPrice.normalizeCurrency('  EUR  ')).toBe('eur');
    });

    it('returns usd for invalid currency', () => {
      expect(TokenPrice.normalizeCurrency('invalid')).toBe('usd');
    });
  });

  describe('immutability', () => {
    it('is frozen', () => {
      const price = TokenPrice.create({
        coingeckoId: 'bitcoin',
        price: 50000,
        currency: 'usd',
      });
      expect(Object.isFrozen(price)).toBe(true);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm run test:unit -- tests/unit/domain/value-objects/token-price.test.ts --reporter=verbose
```

Expected: FAIL

**Step 3: Create the value object**

Create `src/domain/value-objects/token-price.ts`:

```typescript
import { ValueObjectError } from './errors.js';

export class InvalidPriceError extends ValueObjectError {
  constructor(price: number, reason: string) {
    super(`Invalid price ${price}: ${reason}`);
    this.name = 'InvalidPriceError';
  }
}

export const SUPPORTED_CURRENCIES = new Set(['usd', 'eur', 'gbp', 'jpy', 'btc', 'eth']);

export interface CreateTokenPriceData {
  coingeckoId: string;
  price: number;
  currency: string;
  priceChange24h?: number | null;
  marketCap?: number | null;
  fetchedAt?: Date;
}

/**
 * Immutable value object representing a token price.
 *
 * Encapsulates:
 * - Price staleness calculation
 * - Currency validation
 * - TTL rules
 *
 * @example
 * const price = TokenPrice.create({
 *   coingeckoId: 'bitcoin',
 *   price: 50000,
 *   currency: 'usd',
 * });
 * price.isStale(60); // false if fetched within 60 seconds
 */
export class TokenPrice {
  private constructor(
    public readonly coingeckoId: string,
    public readonly price: number,
    public readonly currency: string,
    public readonly priceChange24h: number | null,
    public readonly marketCap: number | null,
    public readonly fetchedAt: Date
  ) {
    Object.freeze(this);
  }

  /**
   * Create a TokenPrice with validation
   */
  static create(data: CreateTokenPriceData): TokenPrice {
    if (data.price <= 0) {
      throw new InvalidPriceError(data.price, 'price must be positive');
    }

    const normalizedCurrency = TokenPrice.normalizeCurrency(data.currency);

    return new TokenPrice(
      data.coingeckoId,
      data.price,
      normalizedCurrency,
      data.priceChange24h ?? null,
      data.marketCap ?? null,
      data.fetchedAt ?? new Date()
    );
  }

  /**
   * Check if price is older than the given TTL in seconds
   */
  isStale(ttlSeconds: number): boolean {
    const ageMs = Date.now() - this.fetchedAt.getTime();
    return ageMs > ttlSeconds * 1000;
  }

  /**
   * Get age of the price in seconds
   */
  get ageSeconds(): number {
    return Math.floor((Date.now() - this.fetchedAt.getTime()) / 1000);
  }

  /**
   * Check if a currency is supported
   */
  static isSupportedCurrency(currency: string): boolean {
    return SUPPORTED_CURRENCIES.has(currency.toLowerCase().trim());
  }

  /**
   * Normalize currency string, falling back to 'usd' if unsupported
   */
  static normalizeCurrency(currency: string): string {
    const normalized = currency.toLowerCase().trim();
    return SUPPORTED_CURRENCIES.has(normalized) ? normalized : 'usd';
  }

  toJSON(): {
    coingeckoId: string;
    price: number;
    currency: string;
    priceChange24h: number | null;
    marketCap: number | null;
    fetchedAt: string;
  } {
    return {
      coingeckoId: this.coingeckoId,
      price: this.price,
      currency: this.currency,
      priceChange24h: this.priceChange24h,
      marketCap: this.marketCap,
      fetchedAt: this.fetchedAt.toISOString(),
    };
  }
}
```

**Step 4: Export from index and errors**

Update `src/domain/value-objects/index.ts`:

```typescript
export { TokenPrice, InvalidPriceError, SUPPORTED_CURRENCIES } from './token-price.js';
```

Update `src/domain/value-objects/errors.ts`:

```typescript
// Add export (InvalidPriceError is defined in token-price.ts, re-export for convenience)
export { InvalidPriceError } from './token-price.js';
```

**Step 5: Run tests to verify they pass**

```bash
npm run test:unit -- tests/unit/domain/value-objects/token-price.test.ts --reporter=verbose
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/domain/value-objects/token-price.ts src/domain/value-objects/index.ts src/domain/value-objects/errors.ts tests/unit/domain/value-objects/token-price.test.ts
git commit -m "feat(domain): add TokenPrice value object

Encapsulates price staleness calculation and currency validation.
Consolidates price-related business rules from pricing-service.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 4.2: Update pricing-service to use TokenPrice

**Files:**
- Modify: `src/services/balances/pricing-service.ts`
- Test: `tests/unit/services/balances/pricing-service.test.ts`

**Step 1: Update service to use TokenPrice for currency validation**

Modify relevant parts of `src/services/balances/pricing-service.ts`:

```typescript
import { TokenPrice } from '@/src/domain/value-objects/index.js';

// Replace lines 68-75:
// Old:
// const normalizedCurrency = currency.toLowerCase().trim();
// if (!SUPPORTED_CURRENCIES.has(normalizedCurrency)) {
//   logger.warn('Unsupported currency provided, using default USD', { currency });
//   currency = 'usd';
// } else {
//   currency = normalizedCurrency;
// }

// New:
currency = TokenPrice.normalizeCurrency(currency);
if (currency !== currency.toLowerCase().trim()) {
  logger.warn('Unsupported currency provided, using default USD', { currency: currency });
}

// Remove the local SUPPORTED_CURRENCIES constant (line 29)
```

**Step 2: Run tests to verify no regression**

```bash
npm run test:unit -- tests/unit/services/balances/pricing-service.test.ts --reporter=verbose
```

Expected: PASS

**Step 3: Commit**

```bash
git add src/services/balances/pricing-service.ts
git commit -m "refactor(pricing): use TokenPrice for currency validation

Delegates currency normalization to domain value object.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 5: Reconciliation Domain Entities

**Goal:** Encapsulate reorg threshold logic and reconciliation checkpoint state in domain entities.

### Task 5.1: Create ReorgThreshold value object

**Files:**
- Create: `src/domain/value-objects/reorg-threshold.ts`
- Create: `tests/unit/domain/value-objects/reorg-threshold.test.ts`
- Modify: `src/domain/value-objects/index.ts`

**Step 1: Create test file with failing tests**

Create `tests/unit/domain/value-objects/reorg-threshold.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { ReorgThreshold } from '@/src/domain/value-objects/reorg-threshold.js';
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

describe('ReorgThreshold', () => {
  describe('forChain', () => {
    it('returns correct threshold for Ethereum', () => {
      expect(ReorgThreshold.forChain('eth-mainnet' as ChainAlias)).toBe(32);
    });

    it('returns correct threshold for Polygon (higher due to reorg frequency)', () => {
      expect(ReorgThreshold.forChain('polygon-mainnet' as ChainAlias)).toBe(128);
    });

    it('returns correct threshold for Bitcoin', () => {
      expect(ReorgThreshold.forChain('btc-mainnet' as ChainAlias)).toBe(6);
    });

    it('returns correct threshold for Solana', () => {
      expect(ReorgThreshold.forChain('solana-mainnet' as ChainAlias)).toBe(1);
    });

    it('returns default threshold for unknown chains', () => {
      expect(ReorgThreshold.forChain('unknown-chain' as ChainAlias)).toBe(32);
    });
  });

  describe('calculateSafeFromBlock', () => {
    it('calculates safe starting block', () => {
      const checkpoint = 1000;
      const chain = 'eth-mainnet' as ChainAlias;
      expect(ReorgThreshold.calculateSafeFromBlock(checkpoint, chain)).toBe(968); // 1000 - 32
    });

    it('returns 0 for blocks near genesis', () => {
      expect(ReorgThreshold.calculateSafeFromBlock(10, 'eth-mainnet' as ChainAlias)).toBe(0);
    });

    it('returns 0 for checkpoint of 0', () => {
      expect(ReorgThreshold.calculateSafeFromBlock(0, 'eth-mainnet' as ChainAlias)).toBe(0);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm run test:unit -- tests/unit/domain/value-objects/reorg-threshold.test.ts --reporter=verbose
```

Expected: FAIL

**Step 3: Create the value object**

Create `src/domain/value-objects/reorg-threshold.ts`:

```typescript
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

/**
 * Chain-specific reorg thresholds for safe partial reconciliation.
 * Values represent number of blocks to re-process for reorg protection.
 */
const CHAIN_REORG_THRESHOLDS: Record<string, number> = {
  // EVM Mainnets
  'eth-mainnet': 32,
  'polygon-mainnet': 128,
  'arbitrum-mainnet': 32,
  'optimism-mainnet': 32,
  'base-mainnet': 32,
  'avalanche-mainnet': 32,
  'bsc-mainnet': 32,
  'fantom-mainnet': 32,
  // EVM Testnets
  'eth-sepolia': 32,
  'eth-holesky': 32,
  'polygon-amoy': 128,
  'arbitrum-sepolia': 32,
  'optimism-sepolia': 32,
  'base-sepolia': 32,
  // UTXO chains
  'btc-mainnet': 6,
  'btc-testnet': 6,
  'ltc-mainnet': 6,
  'doge-mainnet': 6,
  // Solana
  'solana-mainnet': 1,
  'solana-devnet': 1,
  // XRP Ledger
  'xrpl-mainnet': 1,
  'xrpl-testnet': 1,
};

const DEFAULT_THRESHOLD = 32;

/**
 * Value object for chain-specific reorg thresholds.
 *
 * Encapsulates the business logic for determining how far back
 * to re-process blocks during partial reconciliation to handle
 * potential chain reorganizations.
 *
 * @example
 * const threshold = ReorgThreshold.forChain('polygon-mainnet');
 * // threshold = 128 (Polygon has more frequent reorgs)
 *
 * const safeBlock = ReorgThreshold.calculateSafeFromBlock(1000, 'eth-mainnet');
 * // safeBlock = 968 (1000 - 32)
 */
export class ReorgThreshold {
  /**
   * Get the reorg threshold for a specific chain.
   */
  static forChain(chainAlias: ChainAlias): number {
    return CHAIN_REORG_THRESHOLDS[chainAlias] ?? DEFAULT_THRESHOLD;
  }

  /**
   * Calculate a safe starting block given a checkpoint and chain.
   * Returns the checkpoint minus the reorg threshold, minimum 0.
   */
  static calculateSafeFromBlock(checkpoint: number, chainAlias: ChainAlias): number {
    const threshold = ReorgThreshold.forChain(chainAlias);
    return Math.max(0, checkpoint - threshold);
  }

  /**
   * Get the default threshold for unknown chains.
   */
  static get defaultThreshold(): number {
    return DEFAULT_THRESHOLD;
  }
}
```

**Step 4: Export from index**

Update `src/domain/value-objects/index.ts`:

```typescript
export { ReorgThreshold } from './reorg-threshold.js';
```

**Step 5: Run tests to verify they pass**

```bash
npm run test:unit -- tests/unit/domain/value-objects/reorg-threshold.test.ts --reporter=verbose
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/domain/value-objects/reorg-threshold.ts src/domain/value-objects/index.ts tests/unit/domain/value-objects/reorg-threshold.test.ts
git commit -m "feat(domain): add ReorgThreshold value object

Encapsulates chain-specific reorg threshold logic.
Consolidates config from reconciliation-service.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 5.2: Update reconciliation-service to use ReorgThreshold

**Files:**
- Modify: `src/services/reconciliation/reconciliation-service.ts`
- Modify: `src/services/reconciliation/config.ts` (deprecate or remove)

**Step 1: Update service to use ReorgThreshold**

Modify `src/services/reconciliation/reconciliation-service.ts`:

```typescript
import { ReorgThreshold } from '@/src/domain/value-objects/index.js';

// Replace line 10:
// import { getReorgThreshold } from '@/src/services/reconciliation/config.js';

// Replace lines 131-133:
// const threshold = getReorgThreshold(input.chainAlias);
// fromBlock = Math.max(0, address.last_reconciled_block - threshold);

// With:
fromBlock = ReorgThreshold.calculateSafeFromBlock(address.last_reconciled_block, input.chainAlias);
```

**Step 2: Update config.ts to re-export from domain (for backward compatibility)**

Modify `src/services/reconciliation/config.ts`:

```typescript
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import { ReorgThreshold } from '@/src/domain/value-objects/index.js';

/**
 * @deprecated Use ReorgThreshold.forChain() from domain layer instead
 */
export function getReorgThreshold(chainAlias: ChainAlias): number {
  return ReorgThreshold.forChain(chainAlias);
}

// Keep CHAIN_ALIAS_REORG_THRESHOLDS export for reference but mark deprecated
/**
 * @deprecated Use ReorgThreshold from domain layer
 */
export const CHAIN_ALIAS_REORG_THRESHOLDS = {} as const;

/**
 * Rate limiting configuration for reconciliation worker.
 */
export const RECONCILIATION_RATE_LIMIT = {
  tokensPerInterval: 1,
  interval: 'second' as const,
};
```

**Step 3: Run tests to verify no regression**

```bash
npm run test:unit -- tests/unit/services/reconciliation/ --reporter=verbose
```

Expected: PASS

**Step 4: Commit**

```bash
git add src/services/reconciliation/reconciliation-service.ts src/services/reconciliation/config.ts
git commit -m "refactor(reconciliation): use ReorgThreshold from domain

Service now delegates threshold calculation to domain value object.
Deprecated getReorgThreshold in config.ts for backward compatibility.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 6: TransactionCursor Value Object

**Goal:** Encapsulate pagination cursor encoding/decoding in a domain value object.

### Task 6.1: Create TransactionCursor value object

**Files:**
- Create: `src/domain/value-objects/transaction-cursor.ts`
- Create: `tests/unit/domain/value-objects/transaction-cursor.test.ts`
- Modify: `src/domain/value-objects/index.ts`

**Step 1: Create test file with failing tests**

Create `tests/unit/domain/value-objects/transaction-cursor.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { TransactionCursor, InvalidCursorError } from '@/src/domain/value-objects/transaction-cursor.js';

describe('TransactionCursor', () => {
  describe('create', () => {
    it('creates a cursor from timestamp and transaction ID', () => {
      const timestamp = new Date('2024-01-01T12:00:00Z');
      const cursor = TransactionCursor.create(timestamp, 'tx-123');

      expect(cursor.timestamp).toEqual(timestamp);
      expect(cursor.transactionId).toBe('tx-123');
    });
  });

  describe('encode/decode', () => {
    it('encodes cursor to base64url string', () => {
      const timestamp = new Date('2024-01-01T12:00:00Z');
      const cursor = TransactionCursor.create(timestamp, 'tx-123');
      const encoded = cursor.encode();

      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
    });

    it('decodes base64url string to cursor', () => {
      const timestamp = new Date('2024-01-01T12:00:00Z');
      const original = TransactionCursor.create(timestamp, 'tx-123');
      const encoded = original.encode();

      const decoded = TransactionCursor.decode(encoded);

      expect(decoded.timestamp.getTime()).toBe(timestamp.getTime());
      expect(decoded.transactionId).toBe('tx-123');
    });

    it('throws InvalidCursorError for invalid base64', () => {
      expect(() => TransactionCursor.decode('not-valid-base64!!!')).toThrow(InvalidCursorError);
    });

    it('throws InvalidCursorError for invalid JSON', () => {
      const invalidJson = Buffer.from('not json').toString('base64url');
      expect(() => TransactionCursor.decode(invalidJson)).toThrow(InvalidCursorError);
    });

    it('throws InvalidCursorError for missing fields', () => {
      const missingFields = Buffer.from(JSON.stringify({ ts: 123 })).toString('base64url');
      expect(() => TransactionCursor.decode(missingFields)).toThrow(InvalidCursorError);
    });
  });

  describe('immutability', () => {
    it('is frozen', () => {
      const cursor = TransactionCursor.create(new Date(), 'tx-123');
      expect(Object.isFrozen(cursor)).toBe(true);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm run test:unit -- tests/unit/domain/value-objects/transaction-cursor.test.ts --reporter=verbose
```

Expected: FAIL

**Step 3: Create the value object**

Create `src/domain/value-objects/transaction-cursor.ts`:

```typescript
import { ValueObjectError } from './errors.js';

export class InvalidCursorError extends ValueObjectError {
  constructor(cursor: string, reason?: string) {
    super(`Invalid cursor "${cursor}"${reason ? `: ${reason}` : ''}`);
    this.name = 'InvalidCursorError';
  }
}

interface CursorData {
  ts: number; // Unix timestamp in ms
  id: string; // Transaction UUID
}

/**
 * Immutable value object for transaction pagination cursors.
 *
 * Encapsulates the encoding/decoding of cursor tokens used for
 * keyset pagination of transactions.
 *
 * @example
 * // Create and encode a cursor
 * const cursor = TransactionCursor.create(new Date(), 'tx-uuid-123');
 * const encoded = cursor.encode(); // base64url string
 *
 * // Decode a cursor from API request
 * const decoded = TransactionCursor.decode(encodedString);
 * decoded.timestamp; // Date
 * decoded.transactionId; // 'tx-uuid-123'
 */
export class TransactionCursor {
  private constructor(
    public readonly timestamp: Date,
    public readonly transactionId: string
  ) {
    Object.freeze(this);
  }

  /**
   * Create a new cursor
   */
  static create(timestamp: Date, transactionId: string): TransactionCursor {
    return new TransactionCursor(timestamp, transactionId);
  }

  /**
   * Decode a cursor from a base64url-encoded string
   */
  static decode(encoded: string): TransactionCursor {
    try {
      const json = Buffer.from(encoded, 'base64url').toString();
      const data: CursorData = JSON.parse(json);

      if (typeof data.ts !== 'number' || typeof data.id !== 'string') {
        throw new InvalidCursorError(encoded, 'invalid cursor format');
      }

      return new TransactionCursor(new Date(data.ts), data.id);
    } catch (error) {
      if (error instanceof InvalidCursorError) {
        throw error;
      }
      throw new InvalidCursorError(encoded, 'failed to decode');
    }
  }

  /**
   * Encode cursor to base64url string
   */
  encode(): string {
    const data: CursorData = {
      ts: this.timestamp.getTime(),
      id: this.transactionId,
    };
    return Buffer.from(JSON.stringify(data)).toString('base64url');
  }

  /**
   * Compare with another cursor for ordering
   * Returns -1 if this cursor is before other, 1 if after, 0 if same
   */
  compare(other: TransactionCursor): -1 | 0 | 1 {
    const timeDiff = this.timestamp.getTime() - other.timestamp.getTime();
    if (timeDiff < 0) return -1;
    if (timeDiff > 0) return 1;
    // Same timestamp, compare by ID (lexicographic)
    if (this.transactionId < other.transactionId) return -1;
    if (this.transactionId > other.transactionId) return 1;
    return 0;
  }

  toString(): string {
    return this.encode();
  }
}
```

**Step 4: Export from index and errors**

Update `src/domain/value-objects/index.ts`:

```typescript
export { TransactionCursor, InvalidCursorError } from './transaction-cursor.js';
```

**Step 5: Run tests to verify they pass**

```bash
npm run test:unit -- tests/unit/domain/value-objects/transaction-cursor.test.ts --reporter=verbose
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/domain/value-objects/transaction-cursor.ts src/domain/value-objects/index.ts tests/unit/domain/value-objects/transaction-cursor.test.ts
git commit -m "feat(domain): add TransactionCursor value object

Encapsulates pagination cursor encoding/decoding.
Consolidates logic from services/transactions/cursor.ts.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 6.2: Update cursor.ts to use TransactionCursor

**Files:**
- Modify: `src/services/transactions/cursor.ts`

**Step 1: Update to delegate to domain value object**

Modify `src/services/transactions/cursor.ts`:

```typescript
import { TransactionCursor } from '@/src/domain/value-objects/index.js';

/**
 * @deprecated Use TransactionCursor.create().encode() directly
 */
export function encodeCursor(timestamp: Date, txId: string): string {
  return TransactionCursor.create(timestamp, txId).encode();
}

/**
 * @deprecated Use TransactionCursor.decode() directly
 */
export function decodeCursor(cursor: string): { timestamp: Date; txId: string } {
  const decoded = TransactionCursor.decode(cursor);
  return { timestamp: decoded.timestamp, txId: decoded.transactionId };
}
```

**Step 2: Run tests to verify no regression**

```bash
npm run test:unit -- tests/unit/services/transactions/cursor.test.ts --reporter=verbose
```

Expected: PASS

**Step 3: Commit**

```bash
git add src/services/transactions/cursor.ts
git commit -m "refactor(transactions): delegate cursor encoding to domain

Functions now delegate to TransactionCursor value object.
Deprecated old functions for backward compatibility.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Final Verification

### Run all domain tests

```bash
npm run test:unit -- tests/unit/domain/ --reporter=verbose
```

### Run all affected service tests

```bash
npm run test:unit -- tests/unit/services/ --reporter=verbose
```

### Run full test suite

```bash
npm run test
```

### Final commit summary

After all phases are complete, the domain layer will have:

**Value Objects (`src/domain/value-objects/`):**
- `TokenAmount` - Token amount formatting (existing)
- `WalletAddress` - Address normalization with chain-aware validation (enhanced)
- `TokenAddress` - Native vs contract token (existing)
- `TransactionHash` - Transaction hash validation (existing)
- `TokenPrice` - Price with staleness/currency validation (new)
- `ReorgThreshold` - Chain-specific reorg thresholds (new)
- `TransactionCursor` - Pagination cursor encoding (new)

**Entities (`src/domain/entities/`):**
- `Token` - Token aggregate (existing)
- `TokenName` - Name pattern detection (existing)
- `TokenClassification` - Risk classification (existing, enhanced)
- `Balance` - Balance aggregate (existing)
- `SpamAnalysis` - Spam risk computation (existing)
- `Transfer` - Transaction transfer (existing)
- `TransactionClassification` - Transaction type/direction with detection logic (enhanced)
- `SpamClassificationResult` - Provider result merging (new)

---

**Plan complete and saved to `docs/plans/2026-01-09-hexagonal-architecture-migration.md`.**
