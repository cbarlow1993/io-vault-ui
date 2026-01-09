# Hexagonal Architecture Completion Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the hexagonal architecture migration by integrating domain entities and value objects throughout the repository layer and remaining services.

**Architecture:** Ports & Adapters pattern with domain entities at the core. Repositories return domain types, services operate on domain entities, routes validate inputs through value objects.

**Tech Stack:** TypeScript, Kysely (database), Fastify (HTTP), Vitest (testing)

---

## Phase 1: Repository Layer Integration

The repository layer is the foundation. All other layers depend on it returning proper domain types.

### Task 1: Create Repository Mapping Utilities

**Files:**
- Create: `src/repositories/mappers/index.ts`
- Create: `src/repositories/mappers/address-mapper.ts`
- Create: `src/repositories/mappers/transaction-mapper.ts`
- Test: `tests/unit/repositories/mappers/address-mapper.test.ts`

**Step 1: Write the failing test for address mapper**

```typescript
// tests/unit/repositories/mappers/address-mapper.test.ts
import { describe, expect, it } from 'vitest';
import { AddressMapper } from '@/src/repositories/mappers/address-mapper.js';
import { WalletAddress } from '@/src/domain/value-objects/index.js';

describe('AddressMapper', () => {
  describe('toDomain', () => {
    it('maps database row to domain WalletAddress', () => {
      const row = {
        address: '0xABC123',
        chain_alias: 'ethereum',
      };

      const result = AddressMapper.toDomain(row);

      expect(result).toBeInstanceOf(WalletAddress);
      expect(result.normalized).toBe('0xabc123');
      expect(result.chainAlias).toBe('ethereum');
    });
  });

  describe('toDatabase', () => {
    it('maps WalletAddress to database format', () => {
      const walletAddress = WalletAddress.create('0xABC123', 'ethereum');

      const result = AddressMapper.toDatabase(walletAddress);

      expect(result.address).toBe('0xabc123');
      expect(result.chain_alias).toBe('ethereum');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --config tests/unit/vitest.config.ts tests/unit/repositories/mappers/address-mapper.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// src/repositories/mappers/address-mapper.ts
import { WalletAddress } from '@/src/domain/value-objects/index.js';
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

export interface AddressRow {
  address: string;
  chain_alias: ChainAlias;
}

export class AddressMapper {
  static toDomain(row: AddressRow): WalletAddress {
    return WalletAddress.create(row.address, row.chain_alias);
  }

  static toDatabase(walletAddress: WalletAddress): AddressRow {
    return {
      address: walletAddress.normalized,
      chain_alias: walletAddress.chainAlias,
    };
  }
}
```

```typescript
// src/repositories/mappers/index.ts
export { AddressMapper, type AddressRow } from './address-mapper.js';
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --config tests/unit/vitest.config.ts tests/unit/repositories/mappers/address-mapper.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/repositories/mappers/ tests/unit/repositories/mappers/
git commit -m "feat(repositories): add address mapper for domain integration"
```

---

### Task 2: Create Transaction Hash Mapper

**Files:**
- Create: `src/repositories/mappers/transaction-mapper.ts`
- Modify: `src/repositories/mappers/index.ts`
- Test: `tests/unit/repositories/mappers/transaction-mapper.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/repositories/mappers/transaction-mapper.test.ts
import { describe, expect, it } from 'vitest';
import { TransactionMapper } from '@/src/repositories/mappers/transaction-mapper.js';
import { TransactionHash, WalletAddress, TokenAmount } from '@/src/domain/value-objects/index.js';

describe('TransactionMapper', () => {
  describe('hashToDomain', () => {
    it('maps raw hash string to TransactionHash', () => {
      const result = TransactionMapper.hashToDomain('0xABC123...');

      expect(result).toBeInstanceOf(TransactionHash);
    });
  });

  describe('amountToDomain', () => {
    it('maps raw amount with decimals to TokenAmount', () => {
      const result = TransactionMapper.amountToDomain('1000000', 6);

      expect(result).toBeInstanceOf(TokenAmount);
      expect(result.formatted).toBe('1');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --config tests/unit/vitest.config.ts tests/unit/repositories/mappers/transaction-mapper.test.ts`
Expected: FAIL

**Step 3: Write implementation**

```typescript
// src/repositories/mappers/transaction-mapper.ts
import { TransactionHash, TokenAmount } from '@/src/domain/value-objects/index.js';

export class TransactionMapper {
  static hashToDomain(hash: string): TransactionHash {
    return TransactionHash.create(hash);
  }

  static amountToDomain(rawAmount: string, decimals: number): TokenAmount {
    return TokenAmount.fromRaw(rawAmount, decimals);
  }

  static hashToDatabase(hash: TransactionHash): string {
    return hash.normalized;
  }

  static amountToDatabase(amount: TokenAmount): { raw: string; decimals: number } {
    return {
      raw: amount.raw,
      decimals: amount.decimals,
    };
  }
}
```

**Step 4: Update index export**

```typescript
// src/repositories/mappers/index.ts
export { AddressMapper, type AddressRow } from './address-mapper.js';
export { TransactionMapper } from './transaction-mapper.js';
```

**Step 5: Run test to verify it passes**

Run: `npm run test:unit -- --config tests/unit/vitest.config.ts tests/unit/repositories/mappers/transaction-mapper.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/repositories/mappers/ tests/unit/repositories/mappers/
git commit -m "feat(repositories): add transaction mapper for hash and amount domain types"
```

---

### Task 3: Integrate Mappers into Address Repository

**Files:**
- Modify: `src/repositories/address.repository.ts`
- Modify: `src/repositories/types.ts` (add domain return types)
- Test: `tests/unit/repositories/address.repository.test.ts`

**Step 1: Write integration test**

```typescript
// tests/unit/repositories/address.repository.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createAddressRepository } from '@/src/repositories/address.repository.js';
import { WalletAddress } from '@/src/domain/value-objects/index.js';

describe('AddressRepository', () => {
  describe('findByAddressAndChainAlias', () => {
    it('returns WalletAddress value object for valid address', async () => {
      // Mock database
      const mockDb = {
        selectFrom: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        selectAll: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockResolvedValue({
          id: 'addr-123',
          address: '0xabc123',
          chain_alias: 'ethereum',
          vault_id: 'vault-1',
        }),
      };

      const repo = createAddressRepository(mockDb as any);
      const result = await repo.findByAddressAndChainAlias('0xABC123', 'ethereum');

      expect(result).not.toBeNull();
      expect(result?.walletAddress).toBeInstanceOf(WalletAddress);
      expect(result?.walletAddress.normalized).toBe('0xabc123');
    });
  });
});
```

**Step 2: Run test to verify current behavior**

Run: `npm run test:unit -- --config tests/unit/vitest.config.ts tests/unit/repositories/address.repository.test.ts`
Expected: FAIL (walletAddress property doesn't exist)

**Step 3: Update repository to return domain types**

Add new return type to `src/repositories/types.ts`:

```typescript
// Add to types.ts
import type { WalletAddress } from '@/src/domain/value-objects/index.js';

export interface AddressWithDomain extends Address {
  walletAddress: WalletAddress;
}
```

Update `address.repository.ts` to use mapper:

```typescript
// In address.repository.ts
import { AddressMapper } from './mappers/index.js';
import type { AddressWithDomain } from './types.js';

// Update findByAddressAndChainAlias method
async findByAddressAndChainAlias(
  address: string,
  chainAlias: ChainAlias
): Promise<AddressWithDomain | null> {
  const row = await db
    .selectFrom('addresses')
    .where('address', '=', address.toLowerCase())
    .where('chain_alias', '=', chainAlias)
    .selectAll()
    .executeTakeFirst();

  if (!row) return null;

  return {
    ...mapAddressRow(row),
    walletAddress: AddressMapper.toDomain({
      address: row.address,
      chain_alias: row.chain_alias,
    }),
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --config tests/unit/vitest.config.ts tests/unit/repositories/address.repository.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/repositories/
git commit -m "feat(repositories): integrate WalletAddress domain type into address repository"
```

---

### Task 4: Integrate Mappers into Transaction Repository

**Files:**
- Modify: `src/repositories/transaction.repository.ts`
- Modify: `src/repositories/types.ts`
- Test: `tests/unit/repositories/transaction.repository.test.ts`

**Step 1: Write test for domain-enriched transaction**

```typescript
// tests/unit/repositories/transaction.repository.test.ts
import { describe, expect, it, vi } from 'vitest';
import { createTransactionRepository } from '@/src/repositories/transaction.repository.js';
import { TransactionHash, WalletAddress, TokenAmount } from '@/src/domain/value-objects/index.js';

describe('TransactionRepository', () => {
  describe('findByHash', () => {
    it('returns transaction with domain value objects', async () => {
      const mockDb = {
        selectFrom: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        selectAll: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockResolvedValue({
          id: 'tx-123',
          tx_hash: '0xabc',
          from_address: '0x123',
          to_address: '0x456',
          value: '1000000000000000000',
          chain_alias: 'ethereum',
        }),
      };

      const repo = createTransactionRepository(mockDb as any);
      const result = await repo.findByHash('0xabc', 'ethereum');

      expect(result?.txHash).toBeInstanceOf(TransactionHash);
      expect(result?.fromAddress).toBeInstanceOf(WalletAddress);
      expect(result?.value).toBeInstanceOf(TokenAmount);
    });
  });
});
```

**Step 2: Run test to verify current behavior**

Run: `npm run test:unit -- --config tests/unit/vitest.config.ts tests/unit/repositories/transaction.repository.test.ts`
Expected: FAIL

**Step 3: Update repository with domain integration**

Add domain-enriched type to `types.ts`:

```typescript
export interface TransactionWithDomain extends Transaction {
  txHash: TransactionHash;
  fromAddress: WalletAddress;
  toAddress: WalletAddress | null;
  value: TokenAmount;
}
```

Update transaction repository methods to use mappers.

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --config tests/unit/vitest.config.ts tests/unit/repositories/transaction.repository.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/repositories/
git commit -m "feat(repositories): integrate domain value objects into transaction repository"
```

---

## Phase 2: Service Layer Migration

### Task 5: Migrate Address Service to Use Domain Types

**Files:**
- Modify: `src/services/addresses/postgres-service.ts`
- Test: `tests/unit/services/addresses/postgres-service.test.ts`

**Step 1: Write test expecting domain types**

```typescript
describe('AddressService', () => {
  it('returns WalletAddress value object for getAddress', async () => {
    const service = createAddressService(mockRepo);
    const result = await service.getAddress('0xABC', 'ethereum');

    expect(result.walletAddress).toBeInstanceOf(WalletAddress);
  });

  it('accepts WalletAddress for createAddress', async () => {
    const service = createAddressService(mockRepo);
    const walletAddress = WalletAddress.create('0xABC', 'ethereum');

    await service.createAddress(walletAddress, 'vault-123');

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        address: '0xabc',
        chainAlias: 'ethereum',
      })
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --config tests/unit/vitest.config.ts tests/unit/services/addresses/`
Expected: FAIL

**Step 3: Update service to use domain types**

```typescript
// src/services/addresses/postgres-service.ts
import { WalletAddress } from '@/src/domain/value-objects/index.js';

export function createAddressService(repo: AddressRepository) {
  return {
    async getAddress(address: string, chainAlias: ChainAlias) {
      // Validate input through domain
      const walletAddress = WalletAddress.create(address, chainAlias);
      return repo.findByAddressAndChainAlias(
        walletAddress.normalized,
        walletAddress.chainAlias
      );
    },

    async createAddress(walletAddress: WalletAddress, vaultId: string) {
      return repo.create({
        address: walletAddress.normalized,
        chainAlias: walletAddress.chainAlias,
        vaultId,
      });
    },
  };
}
```

**Step 4: Run test to verify it passes**

Expected: PASS

**Step 5: Commit**

```bash
git add src/services/addresses/ tests/unit/services/addresses/
git commit -m "feat(services): migrate address service to use WalletAddress domain type"
```

---

### Task 6: Migrate Coingecko Service to Return TokenPrice

**Files:**
- Modify: `src/services/coingecko/price-service.ts`
- Test: `tests/unit/services/coingecko/price-service.test.ts`

**Step 1: Write test expecting TokenPrice value objects**

```typescript
describe('CoinGeckoService', () => {
  it('returns TokenPrice value objects', async () => {
    const service = createCoinGeckoService(mockClient);
    const result = await service.getPrices(['bitcoin', 'ethereum']);

    expect(result.get('bitcoin')).toBeInstanceOf(TokenPrice);
    expect(result.get('bitcoin')?.usd).toBe(50000);
  });
});
```

**Step 2: Run test to verify it fails**

Expected: FAIL (returns raw numbers)

**Step 3: Update service**

```typescript
import { TokenPrice } from '@/src/domain/value-objects/index.js';

async getPrices(coingeckoIds: string[]): Promise<Map<string, TokenPrice>> {
  const rawPrices = await this.client.fetchPrices(coingeckoIds);
  const result = new Map<string, TokenPrice>();

  for (const [id, data] of Object.entries(rawPrices)) {
    result.set(id, TokenPrice.create({
      usd: data.usd,
      usdChange24h: data.usd_24h_change ?? null,
      updatedAt: new Date(),
    }));
  }

  return result;
}
```

**Step 4: Run test to verify it passes**

Expected: PASS

**Step 5: Commit**

```bash
git add src/services/coingecko/ tests/unit/services/coingecko/
git commit -m "feat(services): migrate coingecko service to return TokenPrice value objects"
```

---

### Task 7: Create Vault Domain Entity

**Files:**
- Create: `src/domain/entities/vault/vault.ts`
- Create: `src/domain/entities/vault/index.ts`
- Modify: `src/domain/entities/index.ts`
- Test: `tests/unit/domain/entities/vault/vault.test.ts`

**Step 1: Write test for Vault entity**

```typescript
describe('Vault', () => {
  it('creates a Vault entity with required fields', () => {
    const vault = Vault.create({
      id: 'vault-123',
      name: 'My Vault',
      organizationId: 'org-456',
      createdAt: new Date(),
    });

    expect(vault.id).toBe('vault-123');
    expect(vault.name).toBe('My Vault');
  });

  it('can add addresses to vault', () => {
    const vault = Vault.create({...});
    const address = WalletAddress.create('0xabc', 'ethereum');

    const updated = vault.addAddress(address);

    expect(updated.addresses).toContain(address);
    expect(vault.addresses).not.toContain(address); // immutable
  });
});
```

**Step 2: Run test to verify it fails**

Expected: FAIL

**Step 3: Implement Vault entity**

```typescript
// src/domain/entities/vault/vault.ts
import type { WalletAddress } from '@/src/domain/value-objects/index.js';

export interface CreateVaultData {
  id: string;
  name: string;
  organizationId: string;
  createdAt: Date;
  addresses?: WalletAddress[];
}

export class Vault {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly organizationId: string,
    public readonly createdAt: Date,
    public readonly addresses: readonly WalletAddress[]
  ) {
    Object.freeze(this);
  }

  static create(data: CreateVaultData): Vault {
    return new Vault(
      data.id,
      data.name,
      data.organizationId,
      data.createdAt,
      Object.freeze(data.addresses ?? [])
    );
  }

  addAddress(address: WalletAddress): Vault {
    return new Vault(
      this.id,
      this.name,
      this.organizationId,
      this.createdAt,
      Object.freeze([...this.addresses, address])
    );
  }

  hasAddress(address: WalletAddress): boolean {
    return this.addresses.some(a => a.equals(address));
  }

  toJSON(): object {
    return {
      id: this.id,
      name: this.name,
      organizationId: this.organizationId,
      createdAt: this.createdAt.toISOString(),
      addressCount: this.addresses.length,
    };
  }
}
```

**Step 4: Run test to verify it passes**

Expected: PASS

**Step 5: Commit**

```bash
git add src/domain/entities/vault/ tests/unit/domain/entities/vault/
git commit -m "feat(domain): add Vault entity with address management"
```

---

### Task 8: Migrate Vault Service to Use Domain Entity

**Files:**
- Modify: `src/services/vaults/vault-service.ts`
- Test: `tests/unit/services/vaults/vault-service.test.ts`

**Step 1: Write test for domain-integrated service**

```typescript
describe('VaultService', () => {
  it('returns Vault domain entity', async () => {
    const service = createVaultService(mockRepo);
    const result = await service.getVault('vault-123');

    expect(result).toBeInstanceOf(Vault);
    expect(result.addresses).toHaveLength(2);
  });

  it('uses WalletAddress when adding address to vault', async () => {
    const service = createVaultService(mockRepo);
    const address = WalletAddress.create('0xabc', 'ethereum');

    await service.addAddressToVault('vault-123', address);

    expect(mockRepo.addAddress).toHaveBeenCalledWith(
      'vault-123',
      '0xabc',
      'ethereum'
    );
  });
});
```

**Step 2-5: Implement, test, commit**

Similar pattern to previous tasks.

---

## Phase 3: Route Layer Validation

### Task 9: Create Route Input Validators Using Domain

**Files:**
- Create: `src/routes/validators/address-validator.ts`
- Create: `src/routes/validators/index.ts`
- Test: `tests/unit/routes/validators/address-validator.test.ts`

**Step 1: Write test for address validation**

```typescript
describe('AddressValidator', () => {
  it('validates address and returns WalletAddress', () => {
    const result = AddressValidator.validate('0xABC123', 'ethereum');

    expect(result.isValid).toBe(true);
    expect(result.walletAddress).toBeInstanceOf(WalletAddress);
  });

  it('returns error for invalid address', () => {
    const result = AddressValidator.validate('invalid', 'ethereum');

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid address format');
  });
});
```

**Step 2: Run test**

Expected: FAIL

**Step 3: Implement validator**

```typescript
// src/routes/validators/address-validator.ts
import { WalletAddress, InvalidAddressError } from '@/src/domain/value-objects/index.js';
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

export type ValidationResult<T> =
  | { isValid: true; value: T }
  | { isValid: false; error: string };

export class AddressValidator {
  static validate(
    address: string,
    chainAlias: ChainAlias
  ): ValidationResult<WalletAddress> {
    try {
      const walletAddress = WalletAddress.create(address, chainAlias);
      return { isValid: true, value: walletAddress };
    } catch (error) {
      if (error instanceof InvalidAddressError) {
        return { isValid: false, error: error.message };
      }
      return { isValid: false, error: 'Invalid address format' };
    }
  }
}
```

**Step 4: Run test**

Expected: PASS

**Step 5: Commit**

```bash
git add src/routes/validators/ tests/unit/routes/validators/
git commit -m "feat(routes): add address validator using WalletAddress domain type"
```

---

### Task 10: Integrate Validators into Address Routes

**Files:**
- Modify: `src/routes/addresses/handlers.ts`
- Test: `tests/unit/routes/addresses/handlers.test.ts`

**Step 1: Write test for validated routes**

```typescript
describe('Address Routes', () => {
  it('validates address parameter using domain', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/addresses/invalid-address?chainAlias=ethereum',
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toContain('Invalid address');
  });

  it('accepts valid address and uses WalletAddress internally', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/addresses/0xABC123?chainAlias=ethereum',
    });

    expect(response.statusCode).toBe(200);
    // Handler received WalletAddress, not raw string
  });
});
```

**Step 2: Update handler to use validator**

```typescript
// src/routes/addresses/handlers.ts
import { AddressValidator } from '../validators/index.js';

async function getAddressHandler(request, reply) {
  const { address, chainAlias } = request.params;

  const validation = AddressValidator.validate(address, chainAlias);
  if (!validation.isValid) {
    return reply.status(400).send({ error: validation.error });
  }

  const result = await addressService.getAddress(validation.value);
  return reply.send(result);
}
```

**Step 3-5: Test, verify, commit**

---

## Phase 4: Build Transaction Service Migration

### Task 11: Create TransactionRequest Domain Entity

**Files:**
- Create: `src/domain/entities/transaction-request/transaction-request.ts`
- Test: `tests/unit/domain/entities/transaction-request/transaction-request.test.ts`

This entity encapsulates transaction build parameters with validation.

**Step 1: Write test**

```typescript
describe('TransactionRequest', () => {
  it('creates native transfer request with validated addresses', () => {
    const request = TransactionRequest.nativeTransfer({
      from: '0xABC',
      to: '0xDEF',
      amount: '1000000000000000000',
      chainAlias: 'ethereum',
    });

    expect(request.from).toBeInstanceOf(WalletAddress);
    expect(request.to).toBeInstanceOf(WalletAddress);
    expect(request.amount).toBeInstanceOf(TokenAmount);
  });

  it('rejects invalid from address', () => {
    expect(() =>
      TransactionRequest.nativeTransfer({
        from: 'invalid',
        to: '0xDEF',
        amount: '1',
        chainAlias: 'ethereum',
      })
    ).toThrow(InvalidAddressError);
  });
});
```

**Step 2-5: Implement, test, commit**

---

### Task 12: Migrate Build Transaction Service

**Files:**
- Modify: `src/services/build-transaction/native-transfer.ts`
- Modify: `src/services/build-transaction/token-transfer.ts`
- Test: Existing tests updated

**Step 1: Update to accept TransactionRequest**

```typescript
// Before:
async function buildNativeTransfer(
  from: string,
  to: string,
  amount: string,
  chainAlias: ChainAlias
)

// After:
async function buildNativeTransfer(request: TransactionRequest)
```

**Step 2-5: Update all build transaction functions, test, commit**

---

## Phase 5: Workflow Service Migration

### Task 13: Create WorkflowState Value Object

**Files:**
- Create: `src/domain/value-objects/workflow-state.ts`
- Modify: `src/domain/value-objects/index.ts`
- Test: `tests/unit/domain/value-objects/workflow-state.test.ts`

**Step 1: Write test**

```typescript
describe('WorkflowState', () => {
  it('creates pending state', () => {
    const state = WorkflowState.pending();
    expect(state.isPending).toBe(true);
    expect(state.canTransitionTo('signing')).toBe(true);
  });

  it('validates state transitions', () => {
    const signing = WorkflowState.signing();
    expect(signing.canTransitionTo('pending')).toBe(false);
    expect(signing.canTransitionTo('broadcasting')).toBe(true);
  });
});
```

**Step 2-5: Implement, test, commit**

---

### Task 14: Migrate Workflow Service to Use Domain Types

**Files:**
- Modify: `src/services/workflow/transaction-workflow.ts`
- Test: `tests/unit/services/workflow/transaction-workflow.test.ts`

Update workflow service to use TransactionRequest, WorkflowState, and other domain types.

---

## Phase 6: Final Integration & Cleanup

### Task 15: Update All Route Handlers to Use Validators

**Files:**
- Modify: `src/routes/transactions/handlers.ts`
- Modify: `src/routes/balances/handlers.ts`
- Modify: `src/routes/spam/handlers.ts`

Add domain validation at API boundaries.

---

### Task 16: Run Full Test Suite and Fix Issues

**Step 1: Run all tests**

```bash
npm run test:unit
```

**Step 2: Fix any failing tests**

**Step 3: Run type checking**

```bash
npm run typecheck
```

**Step 4: Commit final fixes**

```bash
git commit -m "fix: address test failures from domain migration"
```

---

### Task 17: Update Documentation

**Files:**
- Create: `docs/architecture/domain-layer.md`

Document the domain layer structure, value objects, entities, and how to use them.

---

## Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| 1 | 1-4 | Repository mappers and domain integration |
| 2 | 5-8 | Service layer migration (addresses, coingecko, vaults) |
| 3 | 9-10 | Route layer validation |
| 4 | 11-12 | Build transaction service |
| 5 | 13-14 | Workflow service |
| 6 | 15-17 | Integration, testing, documentation |

**Total:** 17 tasks across 6 phases

**Key principles:**
- TDD: Write failing tests first
- Incremental: Each task is independently committable
- Domain-first: Validate at boundaries, use domain types internally
- Backward compatible: Existing APIs continue to work
