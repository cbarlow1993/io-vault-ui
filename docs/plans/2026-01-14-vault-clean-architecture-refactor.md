# Vault Clean Architecture Refactoring Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor POST /v2/vaults endpoint to follow clean architecture and DDD patterns

**Architecture:** Move domain validation into Vault entity, create Xpub value object, have repository return domain entities, service orchestrates business logic, handler is thin

**Tech Stack:** TypeScript, Kysely, Fastify, Zod (presentation layer only)

---

## Task 1: Create Xpub Value Object

**Files:**
- Create: `src/domain/value-objects/xpub.ts`
- Modify: `src/domain/value-objects/errors.ts`
- Modify: `src/domain/value-objects/index.ts`

**Step 1: Add InvalidXpubError to errors.ts**

```typescript
/**
 * Error for invalid xpub values
 */
export class InvalidXpubError extends ValueObjectError {
  constructor(
    public readonly xpub: string,
    public readonly curveType?: string,
    reason?: string
  ) {
    const curvePart = curveType ? ` for ${curveType}` : '';
    const reasonPart = reason ? ` (${reason})` : '';
    super(`Invalid xpub: ${xpub}${curvePart}${reasonPart}`);
    this.name = 'InvalidXpubError';
  }
}
```

**Step 2: Create xpub.ts value object**

```typescript
import type { ElipticCurve } from '@/src/lib/database/types.js';
import { InvalidXpubError } from './errors.js';

/**
 * Immutable value object representing an extended public key (xpub).
 * Validates xpub format based on curve type.
 */
export class Xpub {
  private constructor(
    public readonly value: string,
    public readonly curve: ElipticCurve
  ) {
    Object.freeze(this);
  }

  /**
   * Create an Xpub with validation
   */
  static create(value: string, curve: ElipticCurve): Xpub {
    if (!value || typeof value !== 'string') {
      throw new InvalidXpubError(value ?? '', curve, 'xpub is required');
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new InvalidXpubError('', curve, 'xpub cannot be empty');
    }

    return new Xpub(trimmed, curve);
  }

  /**
   * Create from trusted source (e.g., database)
   */
  static fromTrusted(value: string, curve: ElipticCurve): Xpub {
    return new Xpub(value, curve);
  }

  equals(other: Xpub): boolean {
    return this.value === other.value && this.curve === other.curve;
  }

  toString(): string {
    return this.value;
  }
}
```

**Step 3: Export from index.ts**

Add to `src/domain/value-objects/index.ts`:
```typescript
export { Xpub } from './xpub.js';
export { InvalidXpubError } from './errors.js';
```

**Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/domain/value-objects/
git commit -m "feat(domain): add Xpub value object with validation"
```

---

## Task 2: Create VaultCurve Value Object

**Files:**
- Create: `src/domain/value-objects/vault-curve.ts`
- Modify: `src/domain/value-objects/index.ts`

**Step 1: Create vault-curve.ts**

```typescript
import type { ElipticCurve } from '@/src/lib/database/types.js';
import { Xpub } from './xpub.js';

/**
 * Immutable value object representing a curve configuration for a vault.
 * Combines the curve type with its xpub.
 */
export class VaultCurve {
  private constructor(
    public readonly id: string | null,
    public readonly curve: ElipticCurve,
    public readonly xpub: Xpub,
    public readonly createdAt: Date | null
  ) {
    Object.freeze(this);
  }

  /**
   * Create a new VaultCurve (for creation, before persistence)
   */
  static createNew(curve: ElipticCurve, xpubValue: string): VaultCurve {
    const xpub = Xpub.create(xpubValue, curve);
    return new VaultCurve(null, curve, xpub, null);
  }

  /**
   * Reconstitute from database row
   */
  static fromDatabase(row: {
    id: string;
    curve: ElipticCurve;
    xpub: string;
    createdAt: Date;
  }): VaultCurve {
    const xpub = Xpub.fromTrusted(row.xpub, row.curve);
    return new VaultCurve(row.id, row.curve, xpub, row.createdAt);
  }

  /**
   * Check if this curve has the same type as another
   */
  hasSameCurveType(other: VaultCurve): boolean {
    return this.curve === other.curve;
  }

  toJSON(): object {
    return {
      id: this.id,
      curveType: this.curve,
      xpub: this.xpub.value,
      createdAt: this.createdAt?.toISOString() ?? null,
    };
  }
}
```

**Step 2: Export from index.ts**

Add to `src/domain/value-objects/index.ts`:
```typescript
export { VaultCurve } from './vault-curve.js';
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/domain/value-objects/
git commit -m "feat(domain): add VaultCurve value object"
```

---

## Task 3: Add Domain Errors for Vault

**Files:**
- Modify: `src/domain/entities/errors.ts`

**Step 1: Add VaultCreationError**

Add to `src/domain/entities/errors.ts`:

```typescript
/**
 * Error for vault creation validation failures
 */
export class VaultCreationError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'VaultCreationError';
  }
}
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/domain/entities/errors.ts
git commit -m "feat(domain): add VaultCreationError"
```

---

## Task 4: Update Vault Entity with Curves and Validation

**Files:**
- Modify: `src/domain/entities/vault/vault.ts`
- Modify: `src/domain/entities/vault/index.ts`
- Modify: `src/domain/entities/index.ts`

**Step 1: Update vault.ts with curves and domain validation**

```typescript
/**
 * Vault entity.
 * Represents a vault containing wallet addresses and curve configurations.
 */
import type { WalletAddress } from '@/src/domain/value-objects/index.js';
import { VaultCurve } from '@/src/domain/value-objects/index.js';
import { VaultCreationError } from '../errors.js';
import type { ElipticCurve } from '@/src/lib/database/types.js';

export interface CreateVaultData {
  id: string;
  organizationId: string;
  workspaceId?: string | null;
  createdAt: Date;
  addresses?: WalletAddress[];
  curves?: VaultCurve[];
}

export interface CreateNewVaultData {
  id: string;
  organizationId: string;
  workspaceId: string;
  curves: Array<{ curveType: ElipticCurve; xpub: string }>;
}

export class Vault {
  private constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly workspaceId: string | null,
    public readonly createdAt: Date,
    public readonly addresses: readonly WalletAddress[],
    private readonly _curves: readonly VaultCurve[]
  ) {
    Object.freeze(this);
  }

  /**
   * Reconstitute a Vault from existing data (e.g., from database)
   */
  static create(data: CreateVaultData): Vault {
    return new Vault(
      data.id,
      data.organizationId,
      data.workspaceId ?? null,
      data.createdAt,
      Object.freeze(data.addresses ?? []),
      Object.freeze(data.curves ?? [])
    );
  }

  /**
   * Create a new Vault with domain validation.
   * Used when creating a vault for the first time.
   */
  static createNew(data: CreateNewVaultData): Vault {
    // Domain rule: At least one curve is required
    if (!data.curves || data.curves.length === 0) {
      throw new VaultCreationError('At least one curve is required');
    }

    // Domain rule: No duplicate curve types
    const curveTypes = new Set(data.curves.map((c) => c.curveType));
    if (curveTypes.size !== data.curves.length) {
      throw new VaultCreationError('Duplicate curve types not allowed');
    }

    // Create VaultCurve value objects with validation
    const vaultCurves = data.curves.map((c) =>
      VaultCurve.createNew(c.curveType, c.xpub)
    );

    return new Vault(
      data.id,
      data.organizationId,
      data.workspaceId,
      new Date(),
      Object.freeze([]),
      Object.freeze(vaultCurves)
    );
  }

  get curves(): readonly VaultCurve[] {
    return this._curves;
  }

  /**
   * Get the xpub for a specific curve type
   */
  getCurveXpub(curve: ElipticCurve): string | null {
    const vaultCurve = this._curves.find((c) => c.curve === curve);
    return vaultCurve?.xpub.value ?? null;
  }

  /**
   * Check if vault has a specific curve type
   */
  hasCurve(curve: ElipticCurve): boolean {
    return this._curves.some((c) => c.curve === curve);
  }

  addAddress(address: WalletAddress): Vault {
    return new Vault(
      this.id,
      this.organizationId,
      this.workspaceId,
      this.createdAt,
      Object.freeze([...this.addresses, address]),
      this._curves
    );
  }

  hasAddress(address: WalletAddress): boolean {
    return this.addresses.some((a) => a.equals(address));
  }

  removeAddress(address: WalletAddress): Vault {
    return new Vault(
      this.id,
      this.organizationId,
      this.workspaceId,
      this.createdAt,
      Object.freeze(this.addresses.filter((a) => !a.equals(address))),
      this._curves
    );
  }

  get addressCount(): number {
    return this.addresses.length;
  }

  /**
   * Return Vault with curves populated from database
   */
  withCurves(curves: VaultCurve[]): Vault {
    return new Vault(
      this.id,
      this.organizationId,
      this.workspaceId,
      this.createdAt,
      this.addresses,
      Object.freeze(curves)
    );
  }

  toJSON(): object {
    return {
      id: this.id,
      organizationId: this.organizationId,
      workspaceId: this.workspaceId,
      createdAt: this.createdAt.toISOString(),
      curves: this._curves.map((c) => c.toJSON()),
    };
  }

  /**
   * Format for API response (uses organisationId spelling for API compatibility)
   */
  toAPIResponse(): object {
    return {
      id: this.id,
      workspaceId: this.workspaceId,
      organisationId: this.organizationId,
      createdAt: this.createdAt.toISOString(),
      curves: this._curves.map((c) => c.toJSON()),
    };
  }
}
```

**Step 2: Update vault/index.ts exports**

```typescript
export { Vault, type CreateVaultData, type CreateNewVaultData } from './vault.js';
```

**Step 3: Update entities/index.ts exports**

Add to exports:
```typescript
export { Vault, type CreateVaultData, type CreateNewVaultData } from './vault/index.js';
```

**Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/domain/entities/
git commit -m "feat(domain): add curves and validation to Vault entity"
```

---

## Task 5: Update Repository to Return Domain Entity

**Files:**
- Modify: `src/repositories/vault.repository.ts`

**Step 1: Update imports and interface**

Add imports:
```typescript
import { Vault, type CreateNewVaultData } from '@/src/domain/entities/index.js';
import { VaultCurve } from '@/src/domain/value-objects/index.js';
```

Update interface - change `createVaultWithCurves` signature:
```typescript
export interface VaultRepository {
  // ... existing methods ...
  createVaultWithCurves(vault: Vault): Promise<Vault>;
  vaultExists(id: string): Promise<boolean>;
}
```

Remove `CreateVaultInput`, `CreateVaultCurveInput`, and `CreatedVaultWithCurves` interfaces (no longer needed).

**Step 2: Update createVaultWithCurves implementation**

```typescript
async createVaultWithCurves(vault: Vault): Promise<Vault> {
  return await this.db.transaction().execute(async (trx) => {
    // Insert vault
    const vaultResult = await trx
      .insertInto('Vault')
      .values({
        id: vault.id,
        workspaceId: vault.workspaceId,
        organisationId: vault.organizationId,
        createdAt: vault.createdAt,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Insert curves using raw SQL for enum cast
    const insertedCurves: VaultCurve[] = [];
    for (const curve of vault.curves) {
      const curveResult = await sql<VaultCurveRow>`
        INSERT INTO "VaultCurve" ("vaultId", "curve", "xpub")
        VALUES (${vault.id}, ${curve.curve}::"ElipticCurve", ${curve.xpub.value})
        RETURNING *
      `.execute(trx);

      if (curveResult.rows[0]) {
        insertedCurves.push(VaultCurve.fromDatabase(curveResult.rows[0]));
      }
    }

    // Return domain entity with database-assigned values
    return Vault.create({
      id: vaultResult.id,
      organizationId: vaultResult.organisationId,
      workspaceId: vaultResult.workspaceId,
      createdAt: vaultResult.createdAt,
      curves: insertedCurves,
    });
  });
}
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/repositories/vault.repository.ts
git commit -m "refactor(repository): return Vault entity from createVaultWithCurves"
```

---

## Task 6: Update Service to Orchestrate Business Logic

**Files:**
- Modify: `src/services/vaults/vault-service.ts`

**Step 1: Update imports**

```typescript
import { DuplicateError } from '@iofinnet/errors-sdk';
import { Vault, type CreateNewVaultData } from '@/src/domain/entities/index.js';
```

**Step 2: Update createVaultWithCurves to orchestrate logic**

```typescript
/**
 * Create a vault with curves.
 * Orchestrates business logic: duplicate check, domain entity creation, persistence.
 */
async createVaultWithCurves(data: CreateNewVaultData): Promise<Vault> {
  // Business rule: Check for duplicates
  const exists = await this.vaultRepository.vaultExists(data.id);
  if (exists) {
    throw new DuplicateError(`Vault with id ${data.id} already exists`);
  }

  // Create domain entity (validates domain rules)
  const vault = Vault.createNew(data);

  // Persist and return
  return await this.vaultRepository.createVaultWithCurves(vault);
}
```

**Step 3: Remove vaultExists from service (no longer needed externally)**

The `vaultExists` method can remain for other use cases, but the handler won't need it anymore.

**Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/vaults/vault-service.ts
git commit -m "refactor(service): move business logic to vault service"
```

---

## Task 7: Update Handler to Be Thin

**Files:**
- Modify: `src/routes/vaults/handlers.ts`

**Step 1: Simplify handler**

```typescript
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { CreateVaultBody } from '@/src/routes/vaults/schemas.js';
import type { ElipticCurve } from '@/src/lib/database/types.js';

/**
 * Create a vault with curves
 * POST /v2/vaults
 */
export async function createVault(
  request: FastifyRequest<{
    Body: CreateVaultBody;
  }>,
  reply: FastifyReply
) {
  const { id, workspaceId, curves } = request.body;
  const { organisationId } = request.auth!;

  // Create vault through service (handles business logic and validation)
  const vault = await request.server.services.vault.createVaultWithCurves({
    id,
    workspaceId,
    organizationId: organisationId,
    curves: curves.map((c) => ({
      curveType: c.curveType as ElipticCurve,
      xpub: c.xpub,
    })),
  });

  return reply.status(201).send(vault.toAPIResponse());
}
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/routes/vaults/handlers.ts
git commit -m "refactor(handler): simplify to thin handler pattern"
```

---

## Task 8: Simplify Validation Schema (Remove Domain Rules)

**Files:**
- Modify: `src/routes/vaults/schemas.ts`

**Step 1: Remove domain validation from Zod schema**

The "at least one curve" and "no duplicates" rules now live in the domain entity. Keep basic input validation in Zod:

```typescript
import { z } from 'zod';

// ==================== Request Body Schemas ====================

/**
 * Schema for a single curve in the create vault request
 */
export const curveInputSchema = z.object({
  curveType: z.enum(['secp256k1', 'ed25519']),
  xpub: z.string().min(1, 'xpub is required'),
});

/**
 * Schema for creating a vault with curves.
 * Note: Domain validation (min curves, no duplicates) is in the Vault entity.
 */
export const createVaultBodySchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
  workspaceId: z.string().uuid('workspaceId must be a valid UUID'),
  curves: z.array(curveInputSchema),
});

// ... rest of file unchanged ...
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/routes/vaults/schemas.ts
git commit -m "refactor(schema): move domain validation to entity"
```

---

## Task 9: Update Unit Tests for New Architecture

**Files:**
- Create: `tests/unit/domain/value-objects/xpub.test.ts`
- Create: `tests/unit/domain/value-objects/vault-curve.test.ts`
- Modify: `tests/unit/domain/entities/vault/vault.test.ts`
- Modify: `tests/unit/routes/vaults/schemas.test.ts`

**Step 1: Create xpub.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { Xpub } from '@/src/domain/value-objects/xpub.js';
import { InvalidXpubError } from '@/src/domain/value-objects/errors.js';

describe('Xpub', () => {
  describe('create', () => {
    it('should create valid xpub for secp256k1', () => {
      const xpub = Xpub.create('xpub6D4BDPcP2GT577...', 'secp256k1');
      expect(xpub.value).toBe('xpub6D4BDPcP2GT577...');
      expect(xpub.curve).toBe('secp256k1');
    });

    it('should create valid xpub for ed25519', () => {
      const xpub = Xpub.create('edpub...', 'ed25519');
      expect(xpub.value).toBe('edpub...');
      expect(xpub.curve).toBe('ed25519');
    });

    it('should trim whitespace', () => {
      const xpub = Xpub.create('  xpub123  ', 'secp256k1');
      expect(xpub.value).toBe('xpub123');
    });

    it('should throw for empty xpub', () => {
      expect(() => Xpub.create('', 'secp256k1')).toThrow(InvalidXpubError);
    });

    it('should throw for whitespace-only xpub', () => {
      expect(() => Xpub.create('   ', 'secp256k1')).toThrow(InvalidXpubError);
    });
  });

  describe('equals', () => {
    it('should return true for same value and curve', () => {
      const xpub1 = Xpub.create('xpub123', 'secp256k1');
      const xpub2 = Xpub.create('xpub123', 'secp256k1');
      expect(xpub1.equals(xpub2)).toBe(true);
    });

    it('should return false for different values', () => {
      const xpub1 = Xpub.create('xpub123', 'secp256k1');
      const xpub2 = Xpub.create('xpub456', 'secp256k1');
      expect(xpub1.equals(xpub2)).toBe(false);
    });

    it('should return false for different curves', () => {
      const xpub1 = Xpub.create('xpub123', 'secp256k1');
      const xpub2 = Xpub.create('xpub123', 'ed25519');
      expect(xpub1.equals(xpub2)).toBe(false);
    });
  });
});
```

**Step 2: Create vault-curve.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { VaultCurve } from '@/src/domain/value-objects/vault-curve.js';

describe('VaultCurve', () => {
  describe('createNew', () => {
    it('should create new VaultCurve without id/createdAt', () => {
      const curve = VaultCurve.createNew('secp256k1', 'xpub123');
      expect(curve.id).toBeNull();
      expect(curve.curve).toBe('secp256k1');
      expect(curve.xpub.value).toBe('xpub123');
      expect(curve.createdAt).toBeNull();
    });
  });

  describe('fromDatabase', () => {
    it('should reconstitute from database row', () => {
      const now = new Date();
      const curve = VaultCurve.fromDatabase({
        id: 'curve-123',
        curve: 'ed25519',
        xpub: 'edpub456',
        createdAt: now,
      });
      expect(curve.id).toBe('curve-123');
      expect(curve.curve).toBe('ed25519');
      expect(curve.xpub.value).toBe('edpub456');
      expect(curve.createdAt).toBe(now);
    });
  });

  describe('toJSON', () => {
    it('should serialize correctly', () => {
      const now = new Date();
      const curve = VaultCurve.fromDatabase({
        id: 'curve-123',
        curve: 'secp256k1',
        xpub: 'xpub789',
        createdAt: now,
      });
      expect(curve.toJSON()).toEqual({
        id: 'curve-123',
        curveType: 'secp256k1',
        xpub: 'xpub789',
        createdAt: now.toISOString(),
      });
    });
  });
});
```

**Step 3: Update vault.test.ts for new createNew method**

Add tests for domain validation in Vault.createNew:

```typescript
describe('createNew', () => {
  it('should create vault with valid curves', () => {
    const vault = Vault.createNew({
      id: 'vault-123',
      organizationId: 'org-456',
      workspaceId: 'ws-789',
      curves: [{ curveType: 'secp256k1', xpub: 'xpub...' }],
    });
    expect(vault.id).toBe('vault-123');
    expect(vault.curves).toHaveLength(1);
  });

  it('should throw VaultCreationError for empty curves', () => {
    expect(() =>
      Vault.createNew({
        id: 'vault-123',
        organizationId: 'org-456',
        workspaceId: 'ws-789',
        curves: [],
      })
    ).toThrow('At least one curve is required');
  });

  it('should throw VaultCreationError for duplicate curve types', () => {
    expect(() =>
      Vault.createNew({
        id: 'vault-123',
        organizationId: 'org-456',
        workspaceId: 'ws-789',
        curves: [
          { curveType: 'secp256k1', xpub: 'xpub1' },
          { curveType: 'secp256k1', xpub: 'xpub2' },
        ],
      })
    ).toThrow('Duplicate curve types not allowed');
  });
});
```

**Step 4: Update schemas.test.ts**

Remove tests for domain validation (now in entity). Keep format validation tests.

**Step 5: Run tests**

Run: `npm run test:unit`
Expected: All tests pass

**Step 6: Commit**

```bash
git add tests/unit/
git commit -m "test: add unit tests for value objects and update vault tests"
```

---

## Task 10: Run Full Test Suite and Verify

**Step 1: Run unit tests**

Run: `npm run test:unit`
Expected: All tests pass

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (may have pre-existing errors unrelated to this work)

**Step 3: Verify architecture**

Check the dependency flow:
- Handler → Service → Repository → Domain (Vault entity)
- Domain validation in Vault.createNew()
- Repository returns Vault entity
- Handler uses vault.toAPIResponse()

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(vault): complete clean architecture refactoring

- Add Xpub and VaultCurve value objects
- Move domain validation to Vault entity (createNew)
- Repository returns Vault domain entity
- Service orchestrates business logic (duplicate check)
- Handler is thin (parse → service → response)
- Full test coverage for new value objects"
```

---

## Summary

After completing these tasks, the architecture will follow clean DDD patterns:

```
Handler (thin)
  ↓ parse request body
Service (orchestrates)
  ↓ check duplicates, create domain entity
Domain Entity (validates)
  ↓ Vault.createNew() enforces rules
Repository (persists)
  ↓ save and return Vault entity
Handler
  ↓ vault.toAPIResponse()
Response
```

Domain rules now live in the domain layer:
- "At least one curve required" → Vault.createNew()
- "No duplicate curve types" → Vault.createNew()
- "Valid xpub" → Xpub.create()
