# Transaction Classifier Direction Enhancement - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add direction-aware classification (`'in' | 'out' | 'neutral'`) to EVM/SVM transaction classifiers, stored per-address on `address_transactions`.

**Architecture:** Classifiers receive a `perspectiveAddress` option and calculate direction based on transfer flow. Direction is stored on the `address_transactions` join table, enabling per-address queries.

**Tech Stack:** TypeScript, Kysely (PostgreSQL), Vitest, Fastify

---

## Task 1: Add Direction Types

**Files:**
- Modify: `services/core/src/services/transaction-processor/types.ts`

**Step 1: Add ClassificationDirection type and ClassifyOptions interface**

Add these types after the existing `ClassificationSource` type (around line 24):

```typescript
/**
 * Direction of the transaction from the perspective of a specific address.
 */
export type ClassificationDirection = 'in' | 'out' | 'neutral';

/**
 * Options for classifying a transaction.
 */
export interface ClassifyOptions {
  /** Address to calculate direction from */
  perspectiveAddress: string;
}
```

**Step 2: Update ClassificationResult interface**

Update the `ClassificationResult` interface to include direction:

```typescript
export interface ClassificationResult {
  type: ClassificationType;
  direction: ClassificationDirection;
  confidence: ClassificationConfidence;
  source: ClassificationSource;
  label: string;
  protocol?: string;
  transfers: ParsedTransfer[];
}
```

**Step 3: Update Classifier interface**

Update the `Classifier` interface to accept options:

```typescript
export interface Classifier {
  classify(tx: RawTransaction, options: ClassifyOptions): Promise<ClassificationResult>;
}
```

**Step 4: Commit**

```bash
git add services/core/src/services/transaction-processor/types.ts
git commit -m "feat(classifier): add ClassificationDirection type and ClassifyOptions"
```

---

## Task 2: Create Direction Calculation Helper

**Files:**
- Create: `services/core/src/services/transaction-processor/classifier/direction.ts`
- Create: `services/core/src/services/transaction-processor/classifier/__tests__/direction.test.ts`

**Step 1: Write the failing tests**

Create `services/core/src/services/transaction-processor/classifier/__tests__/direction.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { calculateDirection } from '../direction.js';
import type { ParsedTransfer } from '../../types.js';

describe('calculateDirection', () => {
  const perspectiveAddress = '0xUser123';

  describe('type-based overrides', () => {
    it('returns neutral for swap regardless of transfers', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'out', from: '0xuser123', to: '0xPool', amount: '100', token: { address: '0xA' } },
        { type: 'token', direction: 'in', from: '0xPool', to: '0xuser123', amount: '200', token: { address: '0xB' } },
      ];
      expect(calculateDirection('swap', transfers, perspectiveAddress)).toBe('neutral');
    });

    it('returns neutral for approve', () => {
      expect(calculateDirection('approve', [], perspectiveAddress)).toBe('neutral');
    });

    it('returns neutral for contract_deploy', () => {
      expect(calculateDirection('contract_deploy', [], perspectiveAddress)).toBe('neutral');
    });

    it('returns in for mint', () => {
      expect(calculateDirection('mint', [], perspectiveAddress)).toBe('in');
    });

    it('returns out for burn', () => {
      expect(calculateDirection('burn', [], perspectiveAddress)).toBe('out');
    });
  });

  describe('transfer direction', () => {
    it('returns in when user is recipient', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'in', from: '0xOther', to: '0xUser123', amount: '100', token: { address: '0xA' } },
      ];
      expect(calculateDirection('transfer', transfers, perspectiveAddress)).toBe('in');
    });

    it('returns out when user is sender', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'out', from: '0xUser123', to: '0xOther', amount: '100', token: { address: '0xA' } },
      ];
      expect(calculateDirection('transfer', transfers, perspectiveAddress)).toBe('out');
    });

    it('returns neutral when user is both sender and recipient', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'out', from: '0xUser123', to: '0xOther', amount: '100', token: { address: '0xA' } },
        { type: 'token', direction: 'in', from: '0xOther', to: '0xUser123', amount: '50', token: { address: '0xB' } },
      ];
      expect(calculateDirection('transfer', transfers, perspectiveAddress)).toBe('neutral');
    });

    it('handles case-insensitive address matching', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'in', from: '0xOther', to: '0xUSER123', amount: '100', token: { address: '0xA' } },
      ];
      expect(calculateDirection('transfer', transfers, '0xuser123')).toBe('in');
    });
  });

  describe('stake direction', () => {
    it('returns out when staking (tokens leaving user)', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'out', from: '0xUser123', to: '0xStakingContract', amount: '100', token: { address: '0xA' } },
      ];
      expect(calculateDirection('stake', transfers, perspectiveAddress)).toBe('out');
    });

    it('returns in when unstaking (tokens returning to user)', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'in', from: '0xStakingContract', to: '0xUser123', amount: '100', token: { address: '0xA' } },
      ];
      expect(calculateDirection('stake', transfers, perspectiveAddress)).toBe('in');
    });
  });

  describe('nft_transfer direction', () => {
    it('returns in when receiving NFT', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'nft', direction: 'in', from: '0xOther', to: '0xUser123', amount: '1', tokenId: '123' },
      ];
      expect(calculateDirection('nft_transfer', transfers, perspectiveAddress)).toBe('in');
    });

    it('returns out when sending NFT', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'nft', direction: 'out', from: '0xUser123', to: '0xOther', amount: '1', tokenId: '123' },
      ];
      expect(calculateDirection('nft_transfer', transfers, perspectiveAddress)).toBe('out');
    });
  });

  describe('edge cases', () => {
    it('returns neutral when no transfers', () => {
      expect(calculateDirection('transfer', [], perspectiveAddress)).toBe('neutral');
    });

    it('returns neutral for unknown type', () => {
      expect(calculateDirection('unknown', [], perspectiveAddress)).toBe('neutral');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/core && npx vitest run src/services/transaction-processor/classifier/__tests__/direction.test.ts`

Expected: FAIL - module not found

**Step 3: Write the implementation**

Create `services/core/src/services/transaction-processor/classifier/direction.ts`:

```typescript
import type { ClassificationType, ClassificationDirection, ParsedTransfer } from '../types.js';

/**
 * Calculates the direction of a transaction from the perspective of a specific address.
 *
 * @param type - The classification type of the transaction
 * @param transfers - Parsed transfers from the transaction
 * @param perspectiveAddress - The address to calculate direction from
 * @returns The direction: 'in', 'out', or 'neutral'
 */
export function calculateDirection(
  type: ClassificationType,
  transfers: ParsedTransfer[],
  perspectiveAddress: string
): ClassificationDirection {
  const addr = perspectiveAddress.toLowerCase();

  // Type-based overrides (no transfer analysis needed)
  if (type === 'swap' || type === 'approve' || type === 'contract_deploy' || type === 'unknown') {
    return 'neutral';
  }

  if (type === 'mint') return 'in';
  if (type === 'burn') return 'out';

  // For stake, transfer, nft_transfer, bridge: analyze transfers
  const incoming = transfers.filter((t) => t.to?.toLowerCase() === addr);
  const outgoing = transfers.filter((t) => t.from?.toLowerCase() === addr);

  if (incoming.length > 0 && outgoing.length === 0) return 'in';
  if (outgoing.length > 0 && incoming.length === 0) return 'out';

  // Mixed or no transfers
  return 'neutral';
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/core && npx vitest run src/services/transaction-processor/classifier/__tests__/direction.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add services/core/src/services/transaction-processor/classifier/direction.ts
git add services/core/src/services/transaction-processor/classifier/__tests__/direction.test.ts
git commit -m "feat(classifier): add calculateDirection helper with tests"
```

---

## Task 3: Create Label Generation Helper

**Files:**
- Create: `services/core/src/services/transaction-processor/classifier/label.ts`
- Create: `services/core/src/services/transaction-processor/classifier/__tests__/label.test.ts`

**Step 1: Write the failing tests**

Create `services/core/src/services/transaction-processor/classifier/__tests__/label.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { generateLabel } from '../label.js';
import type { ParsedTransfer } from '../../types.js';

describe('generateLabel', () => {
  describe('transfer labels', () => {
    it('generates "Received" label for in direction', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'in', from: '0xA', to: '0xB', amount: '100', token: { address: '0xT', symbol: 'USDC' } },
      ];
      expect(generateLabel('transfer', 'in', transfers)).toBe('Received 100 USDC');
    });

    it('generates "Sent" label for out direction', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'out', from: '0xA', to: '0xB', amount: '50', token: { address: '0xT', symbol: 'ETH' } },
      ];
      expect(generateLabel('transfer', 'out', transfers)).toBe('Sent 50 ETH');
    });

    it('generates "Transferred" label for neutral direction', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'out', from: '0xA', to: '0xB', amount: '25', token: { address: '0xT', symbol: 'DAI' } },
      ];
      expect(generateLabel('transfer', 'neutral', transfers)).toBe('Transferred 25 DAI');
    });
  });

  describe('stake labels', () => {
    it('generates "Staked" label for out direction', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'out', from: '0xA', to: '0xB', amount: '1000', token: { address: '0xT', symbol: 'SOL' } },
      ];
      expect(generateLabel('stake', 'out', transfers)).toBe('Staked 1000 SOL');
    });

    it('generates "Unstaked" label for in direction', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'in', from: '0xA', to: '0xB', amount: '500', token: { address: '0xT', symbol: 'ETH' } },
      ];
      expect(generateLabel('stake', 'in', transfers)).toBe('Unstaked 500 ETH');
    });
  });

  describe('other types', () => {
    it('generates swap label', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'out', from: '0xA', to: '0xB', amount: '100', token: { address: '0xT', symbol: 'USDC' } },
      ];
      expect(generateLabel('swap', 'neutral', transfers)).toBe('Swapped USDC');
    });

    it('generates mint label', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'in', from: '0x0', to: '0xB', amount: '1000', token: { address: '0xT', symbol: 'NFT' } },
      ];
      expect(generateLabel('mint', 'in', transfers)).toBe('Minted 1000 NFT');
    });

    it('generates burn label', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'out', from: '0xA', to: '0x0', amount: '50', token: { address: '0xT', symbol: 'TOKEN' } },
      ];
      expect(generateLabel('burn', 'out', transfers)).toBe('Burned 50 TOKEN');
    });

    it('generates approve label', () => {
      expect(generateLabel('approve', 'neutral', [])).toBe('Token Approval');
    });

    it('generates contract_deploy label', () => {
      expect(generateLabel('contract_deploy', 'neutral', [])).toBe('Deployed Contract');
    });
  });

  describe('edge cases', () => {
    it('uses "tokens" when no symbol available', () => {
      const transfers: ParsedTransfer[] = [
        { type: 'token', direction: 'in', from: '0xA', to: '0xB', amount: '100', token: { address: '0xT' } },
      ];
      expect(generateLabel('transfer', 'in', transfers)).toBe('Received 100 tokens');
    });

    it('handles empty transfers', () => {
      expect(generateLabel('transfer', 'in', [])).toBe('Received tokens');
    });

    it('generates fallback for unknown type', () => {
      expect(generateLabel('unknown', 'neutral', [])).toBe('Transaction');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/core && npx vitest run src/services/transaction-processor/classifier/__tests__/label.test.ts`

Expected: FAIL - module not found

**Step 3: Write the implementation**

Create `services/core/src/services/transaction-processor/classifier/label.ts`:

```typescript
import type { ClassificationType, ClassificationDirection, ParsedTransfer } from '../types.js';

/**
 * Generates a human-readable label for a classified transaction.
 *
 * @param type - The classification type
 * @param direction - The direction from the user's perspective
 * @param transfers - Parsed transfers to extract token info
 * @returns A human-readable label
 */
export function generateLabel(
  type: ClassificationType,
  direction: ClassificationDirection,
  transfers: ParsedTransfer[]
): string {
  const primaryTransfer = transfers[0];
  const amount = primaryTransfer?.amount ?? '';
  const symbol = primaryTransfer?.token?.symbol ?? 'tokens';
  const amountWithSymbol = amount ? `${amount} ${symbol}` : symbol;

  switch (type) {
    case 'transfer':
      switch (direction) {
        case 'in':
          return `Received ${amountWithSymbol}`;
        case 'out':
          return `Sent ${amountWithSymbol}`;
        default:
          return `Transferred ${amountWithSymbol}`;
      }

    case 'stake':
      switch (direction) {
        case 'in':
          return `Unstaked ${amountWithSymbol}`;
        case 'out':
          return `Staked ${amountWithSymbol}`;
        default:
          return `Stake Interaction`;
      }

    case 'swap':
      return `Swapped ${symbol}`;

    case 'mint':
      return `Minted ${amountWithSymbol}`;

    case 'burn':
      return `Burned ${amountWithSymbol}`;

    case 'approve':
      return 'Token Approval';

    case 'contract_deploy':
      return 'Deployed Contract';

    case 'nft_transfer':
      switch (direction) {
        case 'in':
          return 'Received NFT';
        case 'out':
          return 'Sent NFT';
        default:
          return 'NFT Transfer';
      }

    case 'bridge':
      switch (direction) {
        case 'in':
          return `Bridged In ${amountWithSymbol}`;
        case 'out':
          return `Bridged Out ${amountWithSymbol}`;
        default:
          return `Bridged ${amountWithSymbol}`;
      }

    default:
      return 'Transaction';
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/core && npx vitest run src/services/transaction-processor/classifier/__tests__/label.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add services/core/src/services/transaction-processor/classifier/label.ts
git add services/core/src/services/transaction-processor/classifier/__tests__/label.test.ts
git commit -m "feat(classifier): add generateLabel helper with tests"
```

---

## Task 4: Update EVM Classifier

**Files:**
- Modify: `services/core/src/services/transaction-processor/classifier/evm-classifier.ts`
- Modify: `services/core/src/services/transaction-processor/classifier/__tests__/evm-classifier.test.ts`

**Step 1: Update test file with direction tests**

Add these tests to `services/core/src/services/transaction-processor/classifier/__tests__/evm-classifier.test.ts`:

```typescript
// Add at top of file:
// import type { EvmTransactionData } from '../../types.js';
// (already imported)

// Add new describe block after existing tests:

describe('direction classification', () => {
  const userAddress = '0xsender';

  it('classifies received ETH transfer as direction in', async () => {
    const tx: EvmTransactionData = {
      ...baseTx,
      from: '0xother',
      to: userAddress,
      value: '1000000000000000000',
      input: '0x',
    };
    const result = await classifier.classify(tx, { perspectiveAddress: userAddress });
    expect(result.direction).toBe('in');
    expect(result.label).toContain('Received');
  });

  it('classifies sent ETH transfer as direction out', async () => {
    const tx: EvmTransactionData = {
      ...baseTx,
      from: userAddress,
      to: '0xrecipient',
      value: '1000000000000000000',
      input: '0x',
    };
    const result = await classifier.classify(tx, { perspectiveAddress: userAddress });
    expect(result.direction).toBe('out');
    expect(result.label).toContain('Sent');
  });

  it('classifies swap as direction neutral', async () => {
    const tx: EvmTransactionData = {
      ...baseTx,
      logs: [
        { address: '0xtokenA', topics: [TRANSFER_TOPIC, '0x000000000000000000000000sender', '0x000000000000000000000000pool'], data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000', logIndex: 0 },
        { address: '0xtokenB', topics: [TRANSFER_TOPIC, '0x000000000000000000000000pool', '0x000000000000000000000000sender'], data: '0x0000000000000000000000000000000000000000000000001bc16d674ec80000', logIndex: 1 },
      ],
    };
    const result = await classifier.classify(tx, { perspectiveAddress: userAddress });
    expect(result.direction).toBe('neutral');
  });

  it('classifies mint as direction in', async () => {
    const tx: EvmTransactionData = {
      ...baseTx,
      logs: [{
        address: '0xtoken',
        topics: [TRANSFER_TOPIC, '0x0000000000000000000000000000000000000000000000000000000000000000', '0x000000000000000000000000sender'],
        data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
        logIndex: 0,
      }],
    };
    const result = await classifier.classify(tx, { perspectiveAddress: userAddress });
    expect(result.direction).toBe('in');
  });

  it('classifies burn as direction out', async () => {
    const tx: EvmTransactionData = {
      ...baseTx,
      logs: [{
        address: '0xtoken',
        topics: [TRANSFER_TOPIC, '0x000000000000000000000000sender', '0x0000000000000000000000000000000000000000000000000000000000000000'],
        data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
        logIndex: 0,
      }],
    };
    const result = await classifier.classify(tx, { perspectiveAddress: userAddress });
    expect(result.direction).toBe('out');
  });

  it('classifies approve as direction neutral', async () => {
    const tx: EvmTransactionData = {
      ...baseTx,
      input: '0x095ea7b3',
      logs: [{
        address: '0xtoken',
        topics: [APPROVAL_TOPIC, '0x000000000000000000000000owner', '0x000000000000000000000000spender'],
        data: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        logIndex: 0,
      }],
    };
    const result = await classifier.classify(tx, { perspectiveAddress: userAddress });
    expect(result.direction).toBe('neutral');
  });

  it('classifies contract deployment as direction neutral', async () => {
    const tx: EvmTransactionData = {
      ...baseTx,
      to: null,
      input: '0x608060405234801561001057600080fd5b50',
    };
    const result = await classifier.classify(tx, { perspectiveAddress: userAddress });
    expect(result.direction).toBe('neutral');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd services/core && npx vitest run src/services/transaction-processor/classifier/__tests__/evm-classifier.test.ts`

Expected: FAIL - classify() called without options

**Step 3: Update EVM classifier implementation**

Replace the content of `services/core/src/services/transaction-processor/classifier/evm-classifier.ts`:

```typescript
import type { Classifier, ClassificationResult, ClassifyOptions, EvmTransactionData, ParsedTransfer, RawTransaction } from '../types.js';
import { calculateDirection } from './direction.js';
import { generateLabel } from './label.js';

const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const APPROVAL_TOPIC = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';

export class EvmClassifier implements Classifier {
  async classify(tx: RawTransaction, options: ClassifyOptions): Promise<ClassificationResult> {
    if (tx.type !== 'evm') {
      throw new Error('EvmClassifier can only classify EVM transactions');
    }
    const evmTx = tx as EvmTransactionData;

    // Contract deployment
    if (evmTx.to === null) {
      const direction = calculateDirection('contract_deploy', [], options.perspectiveAddress);
      return {
        type: 'contract_deploy',
        direction,
        confidence: 'high',
        source: 'custom',
        label: generateLabel('contract_deploy', direction, []),
        transfers: [],
      };
    }

    const transfers = this.parseTransfers(evmTx);

    // Approval
    if (this.isApproval(evmTx)) {
      const direction = calculateDirection('approve', transfers, options.perspectiveAddress);
      return {
        type: 'approve',
        direction,
        confidence: 'high',
        source: 'custom',
        label: generateLabel('approve', direction, transfers),
        transfers: [],
      };
    }

    // Mint
    if (this.isMint(transfers)) {
      const direction = calculateDirection('mint', transfers, options.perspectiveAddress);
      return {
        type: 'mint',
        direction,
        confidence: 'high',
        source: 'custom',
        label: generateLabel('mint', direction, transfers),
        transfers,
      };
    }

    // Burn
    if (this.isBurn(transfers)) {
      const direction = calculateDirection('burn', transfers, options.perspectiveAddress);
      return {
        type: 'burn',
        direction,
        confidence: 'high',
        source: 'custom',
        label: generateLabel('burn', direction, transfers),
        transfers,
      };
    }

    // Swap
    if (this.isSwap(transfers, evmTx.from)) {
      const direction = calculateDirection('swap', transfers, options.perspectiveAddress);
      return {
        type: 'swap',
        direction,
        confidence: 'medium',
        source: 'custom',
        label: generateLabel('swap', direction, transfers),
        transfers,
      };
    }

    // Native transfer
    if (BigInt(evmTx.value) > 0n && evmTx.input === '0x') {
      const nativeTransfers: ParsedTransfer[] = [
        { type: 'native', direction: 'out', from: evmTx.from, to: evmTx.to!, amount: evmTx.value },
      ];
      const direction = calculateDirection('transfer', nativeTransfers, options.perspectiveAddress);
      return {
        type: 'transfer',
        direction,
        confidence: 'high',
        source: 'custom',
        label: generateLabel('transfer', direction, nativeTransfers),
        transfers: nativeTransfers,
      };
    }

    // Token transfer
    if (transfers.length === 1) {
      const direction = calculateDirection('transfer', transfers, options.perspectiveAddress);
      return {
        type: 'transfer',
        direction,
        confidence: 'high',
        source: 'custom',
        label: generateLabel('transfer', direction, transfers),
        transfers,
      };
    }

    const direction = calculateDirection('unknown', transfers, options.perspectiveAddress);
    return {
      type: 'unknown',
      direction,
      confidence: 'low',
      source: 'custom',
      label: generateLabel('unknown', direction, transfers),
      transfers,
    };
  }

  private parseTransfers(tx: EvmTransactionData): ParsedTransfer[] {
    const transfers: ParsedTransfer[] = [];
    for (const log of tx.logs) {
      if (log.topics[0] === TRANSFER_TOPIC && log.topics.length >= 3) {
        const from = '0x' + log.topics[1].slice(26);
        const to = '0x' + log.topics[2].slice(26);
        const amount = log.data === '0x' || log.data === '' ? '0' : BigInt(log.data).toString();
        const direction = from.toLowerCase() === tx.from.toLowerCase() ? 'out' : 'in';
        transfers.push({ type: 'token', direction, from, to, amount, token: { address: log.address } });
      }
    }
    return transfers;
  }

  private isApproval(tx: EvmTransactionData): boolean {
    if (tx.input.startsWith('0x095ea7b3')) return true;
    return tx.logs.some((log) => log.topics[0] === APPROVAL_TOPIC);
  }

  private isMint(transfers: ParsedTransfer[]): boolean {
    return transfers.some((t) => t.from.toLowerCase() === '0x' + ZERO_ADDRESS.slice(26));
  }

  private isBurn(transfers: ParsedTransfer[]): boolean {
    return transfers.some((t) => t.to.toLowerCase() === '0x' + ZERO_ADDRESS.slice(26));
  }

  private isSwap(transfers: ParsedTransfer[], sender: string): boolean {
    if (transfers.length < 2) return false;
    const hasOut = transfers.some((t) => t.direction === 'out' && t.from.toLowerCase() === sender.toLowerCase());
    const hasIn = transfers.some((t) => t.direction === 'in' && t.to.toLowerCase() === sender.toLowerCase());
    return hasOut && hasIn;
  }
}
```

**Step 4: Update existing tests to pass options**

Update all existing test calls in `evm-classifier.test.ts` to include the options parameter. Change:

```typescript
const result = await classifier.classify(tx);
```

To:

```typescript
const result = await classifier.classify(tx, { perspectiveAddress: '0xsender' });
```

**Step 5: Run tests to verify they pass**

Run: `cd services/core && npx vitest run src/services/transaction-processor/classifier/__tests__/evm-classifier.test.ts`

Expected: PASS

**Step 6: Commit**

```bash
git add services/core/src/services/transaction-processor/classifier/evm-classifier.ts
git add services/core/src/services/transaction-processor/classifier/__tests__/evm-classifier.test.ts
git commit -m "feat(classifier): add direction support to EVM classifier"
```

---

## Task 5: Update SVM Classifier

**Files:**
- Modify: `services/core/src/services/transaction-processor/classifier/svm-classifier.ts`
- Modify: `services/core/src/services/transaction-processor/classifier/__tests__/svm-classifier.test.ts`

**Step 1: Update test file with direction tests**

Add direction tests to the SVM classifier test file (follow same pattern as EVM).

**Step 2: Update SVM classifier implementation**

Update `services/core/src/services/transaction-processor/classifier/svm-classifier.ts` to:
- Import `calculateDirection` and `generateLabel`
- Add `options: ClassifyOptions` parameter to `classify` method
- Calculate direction and generate label for each return path

**Step 3: Update existing tests to pass options**

**Step 4: Run tests to verify they pass**

Run: `cd services/core && npx vitest run src/services/transaction-processor/classifier/__tests__/svm-classifier.test.ts`

**Step 5: Commit**

```bash
git add services/core/src/services/transaction-processor/classifier/svm-classifier.ts
git add services/core/src/services/transaction-processor/classifier/__tests__/svm-classifier.test.ts
git commit -m "feat(classifier): add direction support to SVM classifier"
```

---

## Task 6: Update Noves Classifier

**Files:**
- Modify: `services/core/src/services/transaction-processor/classifier/noves-classifier.ts`
- Modify: `services/core/src/services/transaction-processor/classifier/__tests__/noves-classifier.test.ts`

**Step 1: Update the NOVES_TYPE_MAP**

Replace the existing map with one that preserves direction:

```typescript
interface NovesTypeMapping {
  type: ClassificationType;
  direction: ClassificationDirection;
}

const NOVES_TYPE_MAP: Record<string, NovesTypeMapping> = {
  // Transfers with direction
  receive: { type: 'transfer', direction: 'in' },
  send: { type: 'transfer', direction: 'out' },
  transfer: { type: 'transfer', direction: 'neutral' },

  // Staking with direction
  stake: { type: 'stake', direction: 'out' },
  unstake: { type: 'stake', direction: 'in' },

  // NFTs with direction
  nft_transfer: { type: 'nft_transfer', direction: 'neutral' },
  nft_mint: { type: 'mint', direction: 'in' },
  nft_receive: { type: 'nft_transfer', direction: 'in' },
  nft_send: { type: 'nft_transfer', direction: 'out' },

  // Others
  swap: { type: 'swap', direction: 'neutral' },
  bridge: { type: 'bridge', direction: 'neutral' },
  mint: { type: 'mint', direction: 'in' },
  burn: { type: 'burn', direction: 'out' },
  approve: { type: 'approve', direction: 'neutral' },
  deploy: { type: 'contract_deploy', direction: 'neutral' },
  unknown: { type: 'unknown', direction: 'neutral' },
};
```

**Step 2: Update classify method to use direction**

**Step 3: Update tests**

**Step 4: Run tests**

Run: `cd services/core && npx vitest run src/services/transaction-processor/classifier/__tests__/noves-classifier.test.ts`

**Step 5: Commit**

```bash
git add services/core/src/services/transaction-processor/classifier/noves-classifier.ts
git add services/core/src/services/transaction-processor/classifier/__tests__/noves-classifier.test.ts
git commit -m "feat(classifier): add direction support to Noves classifier"
```

---

## Task 7: Update Classifier Registry

**Files:**
- Modify: `services/core/src/services/transaction-processor/classifier/index.ts`
- Modify: `services/core/src/services/transaction-processor/classifier/__tests__/registry.test.ts`

**Step 1: Update registry to pass options through**

Update the `classify` method signature and pass options to child classifiers:

```typescript
async classify(tx: RawTransaction, options: ClassifyOptions): Promise<ClassificationResult> {
  const customResult = await this.classifyWithCustom(tx, options);
  // ... rest of logic, passing options to novesClassifier.classify(tx, options)
}

private async classifyWithCustom(tx: RawTransaction, options: ClassifyOptions): Promise<ClassificationResult> {
  switch (tx.type) {
    case 'evm':
      return this.evmClassifier.classify(tx, options);
    case 'svm':
      return this.svmClassifier.classify(tx, options);
    // ...
  }
}
```

**Step 2: Update registry tests**

**Step 3: Run tests**

Run: `cd services/core && npx vitest run src/services/transaction-processor/classifier/__tests__/registry.test.ts`

**Step 4: Commit**

```bash
git add services/core/src/services/transaction-processor/classifier/index.ts
git add services/core/src/services/transaction-processor/classifier/__tests__/registry.test.ts
git commit -m "feat(classifier): update registry to pass ClassifyOptions"
```

---

## Task 8: Export New Modules

**Files:**
- Modify: `services/core/src/services/transaction-processor/classifier/index.ts`

**Step 1: Add exports for new helpers**

Add to the exports:

```typescript
export { calculateDirection } from './direction.js';
export { generateLabel } from './label.js';
```

**Step 2: Commit**

```bash
git add services/core/src/services/transaction-processor/classifier/index.ts
git commit -m "chore(classifier): export direction and label helpers"
```

---

## Task 9: Create Database Migration

**Files:**
- Create: `services/core/src/lib/database/migrations/2026_01_05_add_direction_to_address_transactions.ts`

**Step 1: Create migration file**

Create `services/core/src/lib/database/migrations/2026_01_05_add_direction_to_address_transactions.ts`:

```typescript
import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // Add direction column
  await db.schema
    .alterTable('address_transactions')
    .addColumn('direction', 'varchar(10)', (col) => col.notNull().defaultTo('neutral'))
    .execute();

  // Index for filtering by direction
  await db.schema
    .createIndex('idx_address_transactions_direction')
    .on('address_transactions')
    .columns(['direction'])
    .execute();

  // Composite index for common query pattern
  await db.schema
    .createIndex('idx_address_transactions_address_direction_timestamp')
    .on('address_transactions')
    .columns(['address', 'direction', 'timestamp'])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex('idx_address_transactions_address_direction_timestamp').execute();
  await db.schema.dropIndex('idx_address_transactions_direction').execute();
  await db.schema.alterTable('address_transactions').dropColumn('direction').execute();
}
```

**Step 2: Commit**

```bash
git add services/core/src/lib/database/migrations/2026_01_05_add_direction_to_address_transactions.ts
git commit -m "feat(db): add direction column to address_transactions"
```

---

## Task 10: Update Database Types

**Files:**
- Modify: `services/core/src/lib/database/types.ts`

**Step 1: Add direction to AddressTransactionTable**

Update the `AddressTransactionTable` interface to include direction:

```typescript
export interface AddressTransactionTable {
  id: string;
  address: string;
  tx_id: string;
  chain: string;
  network: string;
  timestamp: ColumnType<Date, string, never>;
  has_native_transfer: boolean;
  has_token_transfer: boolean;
  total_value: string | null;
  direction: 'in' | 'out' | 'neutral';  // NEW
  created_at: ColumnType<Date, string | undefined, never>;
}
```

**Step 2: Commit**

```bash
git add services/core/src/lib/database/types.ts
git commit -m "feat(db): add direction type to AddressTransactionTable"
```

---

## Task 11: Update Upserter

**Files:**
- Modify: `services/core/src/services/transaction-processor/upserter.ts`

**Step 1: Update upsertAddressTransactions to include direction**

Update the `upsertAddressTransactions` method to calculate and store direction per-address:

The key change is that each address involved gets its own direction calculated based on their perspective.

```typescript
private async upsertAddressTransactions(
  trx: Kysely<Database>,
  txId: string,
  normalized: NormalizedTransaction,
  classification: ClassificationResult,
  forAddress?: string
): Promise<void> {
  const now = new Date().toISOString();

  // Collect all unique addresses involved in this transaction
  const addresses = new Set<string>();

  if (forAddress) {
    addresses.add(forAddress.toLowerCase());
  }
  if (normalized.from) {
    addresses.add(normalized.from.toLowerCase());
  }
  if (normalized.to) {
    addresses.add(normalized.to.toLowerCase());
  }
  for (const transfer of classification.transfers) {
    if (transfer.from) addresses.add(transfer.from.toLowerCase());
    if (transfer.to) addresses.add(transfer.to.toLowerCase());
  }

  const hasNativeTransfer = classification.transfers.some((t) => t.type === 'native');
  const hasTokenTransfer = classification.transfers.some((t) => t.type === 'token');

  const totalValue = classification.transfers
    .filter((t) => t.type === 'native')
    .reduce((sum, t) => {
      try {
        return (BigInt(sum) + BigInt(t.amount)).toString();
      } catch {
        return sum;
      }
    }, '0');

  // Import calculateDirection at top of file
  const { calculateDirection } = await import('./classifier/direction.js');

  for (const address of addresses) {
    // Calculate direction for each address's perspective
    const direction = calculateDirection(classification.type, classification.transfers, address);

    await trx
      .insertInto('address_transactions')
      .values({
        id: uuidv4(),
        address,
        tx_id: txId,
        chain: normalized.chain,
        network: normalized.network,
        timestamp: normalized.timestamp.toISOString(),
        has_native_transfer: hasNativeTransfer,
        has_token_transfer: hasTokenTransfer,
        total_value: totalValue !== '0' ? totalValue : null,
        direction,
        created_at: now,
      })
      .onConflict((oc) =>
        oc.columns(['address', 'tx_id']).doUpdateSet({
          has_native_transfer: hasNativeTransfer,
          has_token_transfer: hasTokenTransfer,
          total_value: totalValue !== '0' ? totalValue : null,
          direction,
        })
      )
      .execute();
  }
}
```

**Step 2: Add import at top of file**

```typescript
import { calculateDirection } from './classifier/direction.js';
```

**Step 3: Commit**

```bash
git add services/core/src/services/transaction-processor/upserter.ts
git commit -m "feat(upserter): store direction in address_transactions"
```

---

## Task 12: Update TransactionProcessor

**Files:**
- Modify: `services/core/src/services/transaction-processor/index.ts`

**Step 1: Pass perspectiveAddress to classifier**

Update the `process` method to pass the forAddress as perspectiveAddress to the classifier.

**Step 2: Commit**

```bash
git add services/core/src/services/transaction-processor/index.ts
git commit -m "feat(processor): pass perspectiveAddress to classifier"
```

---

## Task 13: Run All Tests

**Step 1: Run full test suite**

```bash
cd services/core && npm run test:unit
```

**Step 2: Fix any failing tests**

**Step 3: Commit any fixes**

---

## Task 14: Run Migration

**Step 1: Run migration locally**

```bash
cd services/core && npm run migrate:up
```

**Step 2: Verify migration applied**

```bash
cd services/core && npm run migrate:status
```

---

## Summary of Files Changed

| File | Action |
|------|--------|
| `src/services/transaction-processor/types.ts` | Modified |
| `src/services/transaction-processor/classifier/direction.ts` | Created |
| `src/services/transaction-processor/classifier/label.ts` | Created |
| `src/services/transaction-processor/classifier/evm-classifier.ts` | Modified |
| `src/services/transaction-processor/classifier/svm-classifier.ts` | Modified |
| `src/services/transaction-processor/classifier/noves-classifier.ts` | Modified |
| `src/services/transaction-processor/classifier/index.ts` | Modified |
| `src/services/transaction-processor/upserter.ts` | Modified |
| `src/services/transaction-processor/index.ts` | Modified |
| `src/lib/database/types.ts` | Modified |
| `src/lib/database/migrations/2026_01_05_add_direction.ts` | Created |
| `src/services/transaction-processor/classifier/__tests__/direction.test.ts` | Created |
| `src/services/transaction-processor/classifier/__tests__/label.test.ts` | Created |
| `src/services/transaction-processor/classifier/__tests__/evm-classifier.test.ts` | Modified |
| `src/services/transaction-processor/classifier/__tests__/svm-classifier.test.ts` | Modified |
| `src/services/transaction-processor/classifier/__tests__/noves-classifier.test.ts` | Modified |
| `src/services/transaction-processor/classifier/__tests__/registry.test.ts` | Modified |
