# POST /v2/vaults Endpoint Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a new endpoint to create a vault with its associated elliptic curves for HD wallet derivation.

**Architecture:** The endpoint creates a Vault row and associated VaultCurve rows in the vault database within a single transaction. Uses existing patterns: Zod validation, repository pattern, service layer, Fastify route handlers.

**Tech Stack:** Fastify, Kysely (PostgreSQL), Zod, TypeScript

---

## Task 1: Database Migration - Remove `name` from Vault Table

**Files:**
- Create: `src/lib/database/migrations/2026_01_14_remove_vault_name.ts`

**Step 1: Create the migration file**

```typescript
import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE "Vault" DROP COLUMN "name"`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE "Vault" ADD COLUMN "name" VARCHAR(255)`.execute(db);
}
```

**Step 2: Commit**

```bash
git add src/lib/database/migrations/2026_01_14_remove_vault_name.ts
git commit -m "migration: remove name column from Vault table"
```

---

## Task 2: Database Migration - Add Unique Constraint on VaultCurve

**Files:**
- Create: `src/lib/database/migrations/2026_01_14_vault_curve_unique_constraint.ts`

**Step 1: Create the migration file**

```typescript
import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE "VaultCurve"
    ADD CONSTRAINT "VaultCurve_vaultId_curve_unique" UNIQUE ("vaultId", "curve")
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE "VaultCurve"
    DROP CONSTRAINT "VaultCurve_vaultId_curve_unique"
  `.execute(db);
}
```

**Step 2: Commit**

```bash
git add src/lib/database/migrations/2026_01_14_vault_curve_unique_constraint.ts
git commit -m "migration: add unique constraint on VaultCurve (vaultId, curve)"
```

---

## Task 3: Update TypeScript Types

**Files:**
- Modify: `src/lib/database/types.ts:12-18`

**Step 1: Remove `name` from VaultTable interface**

Change this:
```typescript
export interface VaultTable {
  id: string;
  name: string;
  workspaceId: string;
  organisationId: string;
  createdAt: Date;
}
```

To this:
```typescript
export interface VaultTable {
  id: string;
  workspaceId: string;
  organisationId: string;
  createdAt: Date;
}
```

**Step 2: Add InsertableVault and InsertableVaultCurve types after VaultCurveRow (line 54)**

Add after `export type VaultCurveRow = Selectable<VaultCurveTable>;`:

```typescript
export type InsertableVault = Insertable<VaultTable>;
export type InsertableVaultCurve = Insertable<VaultCurveTable>;
```

**Step 3: Commit**

```bash
git add src/lib/database/types.ts
git commit -m "types: remove name from VaultTable, add insertable types"
```

---

## Task 4: Update Vault Domain Entity

**Files:**
- Modify: `src/domain/entities/vault/vault.ts`

**Step 1: Remove `name` from CreateVaultData interface and Vault class**

Update the file to remove all references to `name`:

```typescript
/**
 * Vault entity.
 * Represents a vault containing wallet addresses within an organization.
 */
import type { WalletAddress } from '@/src/domain/value-objects/index.js';

export interface CreateVaultData {
  id: string;
  organizationId: string;
  workspaceId?: string | null;
  createdAt: Date;
  addresses?: WalletAddress[];
}

export class Vault {
  private constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly workspaceId: string | null,
    public readonly createdAt: Date,
    public readonly addresses: readonly WalletAddress[]
  ) {
    Object.freeze(this);
  }

  static create(data: CreateVaultData): Vault {
    return new Vault(
      data.id,
      data.organizationId,
      data.workspaceId ?? null,
      data.createdAt,
      Object.freeze(data.addresses ?? [])
    );
  }

  addAddress(address: WalletAddress): Vault {
    return new Vault(
      this.id,
      this.organizationId,
      this.workspaceId,
      this.createdAt,
      Object.freeze([...this.addresses, address])
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
      Object.freeze(this.addresses.filter((a) => !a.equals(address)))
    );
  }

  get addressCount(): number {
    return this.addresses.length;
  }

  toJSON(): object {
    return {
      id: this.id,
      organizationId: this.organizationId,
      workspaceId: this.workspaceId,
      createdAt: this.createdAt.toISOString(),
      addressCount: this.addresses.length,
    };
  }
}
```

**Step 2: Commit**

```bash
git add src/domain/entities/vault/vault.ts
git commit -m "domain: remove name from Vault entity"
```

---

## Task 5: Update Vault Repository - Remove name references

**Files:**
- Modify: `src/repositories/vault.repository.ts`

**Step 1: Remove `name` from VaultWithDetails interface (line 24-30)**

Change:
```typescript
export interface VaultWithDetails {
  vaultId: string;
  name: string;
  organizationId: string;
  workspaceId: string | null;
  createdAt: Date;
}
```

To:
```typescript
export interface VaultWithDetails {
  vaultId: string;
  organizationId: string;
  workspaceId: string | null;
  createdAt: Date;
}
```

**Step 2: Update findVaultWithDetails method (line 101-119)**

Change:
```typescript
async findVaultWithDetails(vaultId: string): Promise<VaultWithDetails | null> {
  const result = await this.db
    .selectFrom('Vault')
    .select(['id', 'name', 'workspaceId', 'organisationId', 'createdAt'])
    .where('id', '=', vaultId)
    .executeTakeFirst();

  if (!result) {
    return null;
  }

  return {
    vaultId: result.id,
    name: result.name,
    organizationId: result.organisationId,
    workspaceId: result.workspaceId ?? null,
    createdAt: result.createdAt,
  };
}
```

To:
```typescript
async findVaultWithDetails(vaultId: string): Promise<VaultWithDetails | null> {
  const result = await this.db
    .selectFrom('Vault')
    .select(['id', 'workspaceId', 'organisationId', 'createdAt'])
    .where('id', '=', vaultId)
    .executeTakeFirst();

  if (!result) {
    return null;
  }

  return {
    vaultId: result.id,
    organizationId: result.organisationId,
    workspaceId: result.workspaceId ?? null,
    createdAt: result.createdAt,
  };
}
```

**Step 3: Commit**

```bash
git add src/repositories/vault.repository.ts
git commit -m "repository: remove name from vault queries"
```

---

## Task 6: Update Vault Service - Remove name references

**Files:**
- Modify: `src/services/vaults/vault-service.ts:65-79`

**Step 1: Update getVault method to not use name**

Change:
```typescript
async getVault(vaultId: string): Promise<Vault | null> {
  const vaultData = await this.vaultRepository.findVaultWithDetails(vaultId);

  if (!vaultData) {
    return null;
  }

  return Vault.create({
    id: vaultData.vaultId,
    name: vaultData.name,
    organizationId: vaultData.organizationId,
    workspaceId: vaultData.workspaceId,
    createdAt: vaultData.createdAt,
  });
}
```

To:
```typescript
async getVault(vaultId: string): Promise<Vault | null> {
  const vaultData = await this.vaultRepository.findVaultWithDetails(vaultId);

  if (!vaultData) {
    return null;
  }

  return Vault.create({
    id: vaultData.vaultId,
    organizationId: vaultData.organizationId,
    workspaceId: vaultData.workspaceId,
    createdAt: vaultData.createdAt,
  });
}
```

**Step 2: Commit**

```bash
git add src/services/vaults/vault-service.ts
git commit -m "service: remove name from vault creation"
```

---

## Task 7: Add Create Methods to Vault Repository

**Files:**
- Modify: `src/repositories/vault.repository.ts`

**Step 1: Add imports at top of file**

Add to existing imports:
```typescript
import type {
  VaultDatabase,
  VaultRow,
  VaultCurveRow,
  TagAssignmentRow,
  ElipticCurve,
  InsertableVault,
  InsertableVaultCurve,
} from '@/src/lib/database/types.js';
```

**Step 2: Add new interface for create vault input (after VaultWithDetails interface)**

```typescript
export interface CreateVaultInput {
  id: string;
  workspaceId: string;
  organisationId: string;
}

export interface CreateVaultCurveInput {
  vaultId: string;
  curve: ElipticCurve;
  xpub: string;
}

export interface CreatedVaultWithCurves {
  vault: VaultRow;
  curves: VaultCurveRow[];
}
```

**Step 3: Add methods to VaultRepository interface**

Add to the interface:
```typescript
createVaultWithCurves(
  vault: CreateVaultInput,
  curves: CreateVaultCurveInput[]
): Promise<CreatedVaultWithCurves>;
vaultExists(id: string): Promise<boolean>;
```

**Step 4: Implement methods in PostgresVaultRepository class**

Add at the end of the class (before the closing brace):
```typescript
async vaultExists(id: string): Promise<boolean> {
  const result = await this.db
    .selectFrom('Vault')
    .select('id')
    .where('id', '=', id)
    .executeTakeFirst();
  return result !== undefined;
}

async createVaultWithCurves(
  vault: CreateVaultInput,
  curves: CreateVaultCurveInput[]
): Promise<CreatedVaultWithCurves> {
  return await this.db.transaction().execute(async (trx) => {
    // Insert vault
    const vaultResult = await trx
      .insertInto('Vault')
      .values({
        id: vault.id,
        workspaceId: vault.workspaceId,
        organisationId: vault.organisationId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Insert curves using raw SQL for enum cast
    const insertedCurves: VaultCurveRow[] = [];
    for (const curve of curves) {
      const curveResult = await sql<VaultCurveRow>`
        INSERT INTO "VaultCurve" ("vaultId", "curve", "xpub")
        VALUES (${curve.vaultId}, ${curve.curve}::"ElipticCurve", ${curve.xpub})
        RETURNING *
      `.execute(trx);

      if (curveResult.rows[0]) {
        insertedCurves.push(curveResult.rows[0]);
      }
    }

    return {
      vault: vaultResult,
      curves: insertedCurves,
    };
  });
}
```

**Step 5: Commit**

```bash
git add src/repositories/vault.repository.ts
git commit -m "repository: add createVaultWithCurves method"
```

---

## Task 8: Add Create Method to Vault Service

**Files:**
- Modify: `src/services/vaults/vault-service.ts`

**Step 1: Add import for repository types**

Update imports to include:
```typescript
import type {
  VaultRepository,
  VaultDetails,
  CreateVaultInput,
  CreateVaultCurveInput,
  CreatedVaultWithCurves,
} from '@/src/repositories/vault.repository.js';
```

**Step 2: Add createVault method to VaultService class**

Add after the `getTagAssignment` method:
```typescript
async vaultExists(id: string): Promise<boolean> {
  return this.vaultRepository.vaultExists(id);
}

async createVaultWithCurves(
  vault: CreateVaultInput,
  curves: CreateVaultCurveInput[]
): Promise<CreatedVaultWithCurves> {
  return this.vaultRepository.createVaultWithCurves(vault, curves);
}
```

**Step 3: Commit**

```bash
git add src/services/vaults/vault-service.ts
git commit -m "service: add createVaultWithCurves method"
```

---

## Task 9: Create Vault Route Schemas

**Files:**
- Create: `src/routes/vaults/schemas.ts`

**Step 1: Create the schemas file**

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
 * Schema for creating a vault with curves
 */
export const createVaultBodySchema = z
  .object({
    id: z.string().uuid('id must be a valid UUID'),
    workspaceId: z.string().uuid('workspaceId must be a valid UUID'),
    curves: z
      .array(curveInputSchema)
      .min(1, 'At least one curve is required')
      .refine(
        (curves) => new Set(curves.map((c) => c.curveType)).size === curves.length,
        { message: 'Duplicate curve types not allowed' }
      ),
  });

// ==================== Response Schemas ====================

/**
 * Schema for a curve in the response
 */
export const curveResponseSchema = z.object({
  id: z.string().uuid(),
  curveType: z.enum(['secp256k1', 'ed25519']),
  xpub: z.string(),
  createdAt: z.string().datetime(),
});

/**
 * Schema for the create vault response
 */
export const createVaultResponseSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  organisationId: z.string().uuid(),
  createdAt: z.string().datetime(),
  curves: z.array(curveResponseSchema),
});

// ==================== Type Exports ====================

export type CurveInput = z.infer<typeof curveInputSchema>;
export type CreateVaultBody = z.infer<typeof createVaultBodySchema>;
export type CurveResponse = z.infer<typeof curveResponseSchema>;
export type CreateVaultResponse = z.infer<typeof createVaultResponseSchema>;
```

**Step 2: Commit**

```bash
git add src/routes/vaults/schemas.ts
git commit -m "routes: add vault schemas for create endpoint"
```

---

## Task 10: Create Vault Route Handlers

**Files:**
- Create: `src/routes/vaults/handlers.ts`

**Step 1: Create the handlers file**

```typescript
import { ConflictError, UserInputError } from '@iofinnet/errors-sdk';
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

  // Check if vault already exists
  const exists = await request.server.services.vault.vaultExists(id);
  if (exists) {
    throw new ConflictError(`Vault with id ${id} already exists`);
  }

  // Create vault with curves
  const result = await request.server.services.vault.createVaultWithCurves(
    {
      id,
      workspaceId,
      organisationId,
    },
    curves.map((c) => ({
      vaultId: id,
      curve: c.curveType as ElipticCurve,
      xpub: c.xpub,
    }))
  );

  // Format response
  const response = {
    id: result.vault.id,
    workspaceId: result.vault.workspaceId,
    organisationId: result.vault.organisationId,
    createdAt: result.vault.createdAt.toISOString(),
    curves: result.curves.map((c) => ({
      id: c.id,
      curveType: c.curve,
      xpub: c.xpub,
      createdAt: c.createdAt.toISOString(),
    })),
  };

  return reply.status(201).send(response);
}
```

**Step 2: Commit**

```bash
git add src/routes/vaults/handlers.ts
git commit -m "routes: add vault handlers for create endpoint"
```

---

## Task 11: Create Vault Route Index

**Files:**
- Create: `src/routes/vaults/index.ts`

**Step 1: Create the route index file**

```typescript
import type { FastifyInstance } from 'fastify';
import { createVault } from '@/src/routes/vaults/handlers.js';
import {
  createVaultBodySchema,
  createVaultResponseSchema,
} from '@/src/routes/vaults/schemas.js';

export default async function vaultRoutes(fastify: FastifyInstance) {
  /**
   * POST /
   * Create a new vault with curves
   */
  fastify.post(
    '/',
    {
      schema: {
        tags: ['Vaults'],
        summary: 'Create a vault with curves',
        description:
          'Creates a new vault with the specified elliptic curves for HD wallet derivation. ' +
          'Each curve includes an xpub (extended public key) used for address generation.',
        body: createVaultBodySchema,
        response: {
          201: createVaultResponseSchema,
        },
      },
    },
    createVault
  );
}
```

**Step 2: Commit**

```bash
git add src/routes/vaults/index.ts
git commit -m "routes: add vault route registration"
```

---

## Task 12: Register Vault Routes

**Files:**
- Modify: `src/routes/index.ts`

**Step 1: Add import for vault routes**

Add with other imports at top:
```typescript
import vaultRoutes from '@/src/routes/vaults/index.js';
```

**Step 2: Register vault routes in the routes function**

Add after the reconciliation routes line (line 23):
```typescript
fastify.register(vaultRoutes, { prefix: '/v2/vaults' });
```

**Step 3: Commit**

```bash
git add src/routes/index.ts
git commit -m "routes: register vault routes at /v2/vaults"
```

---

## Task 13: Write Unit Tests for Repository

**Files:**
- Create: `tests/unit/repositories/vault.repository.test.ts`

**Step 1: Create the test file**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresVaultRepository } from '@/src/repositories/vault.repository.js';

describe('PostgresVaultRepository', () => {
  describe('vaultExists', () => {
    it('should return true when vault exists', async () => {
      const mockDb = {
        selectFrom: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockResolvedValue({ id: 'vault-123' }),
      };

      const repo = new PostgresVaultRepository(mockDb as any);
      const result = await repo.vaultExists('vault-123');

      expect(result).toBe(true);
      expect(mockDb.selectFrom).toHaveBeenCalledWith('Vault');
      expect(mockDb.where).toHaveBeenCalledWith('id', '=', 'vault-123');
    });

    it('should return false when vault does not exist', async () => {
      const mockDb = {
        selectFrom: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockResolvedValue(undefined),
      };

      const repo = new PostgresVaultRepository(mockDb as any);
      const result = await repo.vaultExists('vault-123');

      expect(result).toBe(false);
    });
  });
});
```

**Step 2: Run test to verify it passes**

Run: `npm test -- tests/unit/repositories/vault.repository.test.ts`

**Step 3: Commit**

```bash
git add tests/unit/repositories/vault.repository.test.ts
git commit -m "test: add unit tests for vault repository"
```

---

## Task 14: Write Unit Tests for Schemas

**Files:**
- Create: `tests/unit/routes/vaults/schemas.test.ts`

**Step 1: Create the test file**

```typescript
import { describe, it, expect } from 'vitest';
import { createVaultBodySchema } from '@/src/routes/vaults/schemas.js';

describe('createVaultBodySchema', () => {
  it('should validate a valid request body', () => {
    const validBody = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      workspaceId: '550e8400-e29b-41d4-a716-446655440001',
      curves: [
        { curveType: 'secp256k1', xpub: 'xpub6D4BDPcP2GT577...' },
        { curveType: 'ed25519', xpub: 'edpub...' },
      ],
    };

    const result = createVaultBodySchema.safeParse(validBody);
    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID for id', () => {
    const invalidBody = {
      id: 'not-a-uuid',
      workspaceId: '550e8400-e29b-41d4-a716-446655440001',
      curves: [{ curveType: 'secp256k1', xpub: 'xpub...' }],
    };

    const result = createVaultBodySchema.safeParse(invalidBody);
    expect(result.success).toBe(false);
  });

  it('should reject empty curves array', () => {
    const invalidBody = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      workspaceId: '550e8400-e29b-41d4-a716-446655440001',
      curves: [],
    };

    const result = createVaultBodySchema.safeParse(invalidBody);
    expect(result.success).toBe(false);
  });

  it('should reject duplicate curve types', () => {
    const invalidBody = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      workspaceId: '550e8400-e29b-41d4-a716-446655440001',
      curves: [
        { curveType: 'secp256k1', xpub: 'xpub1...' },
        { curveType: 'secp256k1', xpub: 'xpub2...' },
      ],
    };

    const result = createVaultBodySchema.safeParse(invalidBody);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Duplicate curve types not allowed');
    }
  });

  it('should reject invalid curve type', () => {
    const invalidBody = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      workspaceId: '550e8400-e29b-41d4-a716-446655440001',
      curves: [{ curveType: 'invalid-curve', xpub: 'xpub...' }],
    };

    const result = createVaultBodySchema.safeParse(invalidBody);
    expect(result.success).toBe(false);
  });

  it('should reject empty xpub', () => {
    const invalidBody = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      workspaceId: '550e8400-e29b-41d4-a716-446655440001',
      curves: [{ curveType: 'secp256k1', xpub: '' }],
    };

    const result = createVaultBodySchema.safeParse(invalidBody);
    expect(result.success).toBe(false);
  });
});
```

**Step 2: Run test to verify it passes**

Run: `npm test -- tests/unit/routes/vaults/schemas.test.ts`

**Step 3: Commit**

```bash
git add tests/unit/routes/vaults/schemas.test.ts
git commit -m "test: add unit tests for vault schemas"
```

---

## Task 15: Write Integration Tests

**Files:**
- Create: `tests/integration/vaults/create-vault.test.ts`

**Step 1: Create the test file**

```typescript
import { randomUUID } from 'crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type DefaultTestClients, setupTestClients } from '@/tests/utils/dualModeTestClient.js';
import { expectStatus } from '@/tests/utils/expectStatus.js';

describe('Create Vault Integration Tests', () => {
  let clients: DefaultTestClients;

  beforeAll(async () => {
    clients = await setupTestClients();
  });

  describe('POST /v2/vaults', () => {
    it('should create a vault with secp256k1 curve', async () => {
      const vaultId = randomUUID();
      const workspaceId = randomUUID();

      const payload = {
        id: vaultId,
        workspaceId,
        curves: [
          { curveType: 'secp256k1', xpub: 'xpub6D4BDPcP2GT577Vvch3R8wDkScZWzQzMMUm3PWbmWvVJrZwQY4VNm9R9X9VjyvqGphSpzmh8oQEGHE65QSAPM7HZZv7HRgWKNwmMSuJqPqg' },
        ],
      };

      const response = await clients.CLIENT_1.client.post('/v2/vaults', payload);

      expectStatus(response, 201);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBe(vaultId);
      expect(response.data.workspaceId).toBe(workspaceId);
      expect(response.data.organisationId).toBeDefined();
      expect(response.data.createdAt).toBeDefined();
      expect(response.data.curves).toHaveLength(1);
      expect(response.data.curves[0].curveType).toBe('secp256k1');
    });

    it('should create a vault with multiple curves', async () => {
      const vaultId = randomUUID();
      const workspaceId = randomUUID();

      const payload = {
        id: vaultId,
        workspaceId,
        curves: [
          { curveType: 'secp256k1', xpub: 'xpub6D4BDPcP2GT577Vvch3R8wDkScZWzQzMMUm3PWbmWvVJrZwQY4VNm9R9X9VjyvqGphSpzmh8oQEGHE65QSAPM7HZZv7HRgWKNwmMSuJqPqg' },
          { curveType: 'ed25519', xpub: 'edpubXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' },
        ],
      };

      const response = await clients.CLIENT_1.client.post('/v2/vaults', payload);

      expectStatus(response, 201);
      expect(response.data.curves).toHaveLength(2);
    });

    it('should return 409 when vault already exists', async () => {
      const vaultId = randomUUID();
      const workspaceId = randomUUID();

      const payload = {
        id: vaultId,
        workspaceId,
        curves: [
          { curveType: 'secp256k1', xpub: 'xpub6D4BDPcP2GT577Vvch3R8wDkScZWzQzMMUm3PWbmWvVJrZwQY4VNm9R9X9VjyvqGphSpzmh8oQEGHE65QSAPM7HZZv7HRgWKNwmMSuJqPqg' },
        ],
      };

      // Create first time
      await clients.CLIENT_1.client.post('/v2/vaults', payload);

      // Try to create again
      const response = await clients.CLIENT_1.client.post('/v2/vaults', payload);

      expectStatus(response, 409);
    });

    it('should return 400 for invalid UUID', async () => {
      const payload = {
        id: 'not-a-uuid',
        workspaceId: randomUUID(),
        curves: [
          { curveType: 'secp256k1', xpub: 'xpub...' },
        ],
      };

      const response = await clients.CLIENT_1.client.post('/v2/vaults', payload);

      expectStatus(response, 400);
    });

    it('should return 400 for empty curves array', async () => {
      const payload = {
        id: randomUUID(),
        workspaceId: randomUUID(),
        curves: [],
      };

      const response = await clients.CLIENT_1.client.post('/v2/vaults', payload);

      expectStatus(response, 400);
    });

    it('should return 400 for duplicate curve types', async () => {
      const payload = {
        id: randomUUID(),
        workspaceId: randomUUID(),
        curves: [
          { curveType: 'secp256k1', xpub: 'xpub1...' },
          { curveType: 'secp256k1', xpub: 'xpub2...' },
        ],
      };

      const response = await clients.CLIENT_1.client.post('/v2/vaults', payload);

      expectStatus(response, 400);
    });
  });
});
```

**Step 2: Commit**

```bash
git add tests/integration/vaults/create-vault.test.ts
git commit -m "test: add integration tests for create vault endpoint"
```

---

## Task 16: Run All Tests and Verify

**Step 1: Run unit tests**

```bash
npm test -- tests/unit/repositories/vault.repository.test.ts tests/unit/routes/vaults/schemas.test.ts
```

Expected: All tests pass

**Step 2: Run type checking**

```bash
npm run typecheck
```

Expected: No type errors

**Step 3: Run linting**

```bash
npm run lint
```

Expected: No lint errors

**Step 4: Commit any fixes if needed**

If there are any issues, fix them and commit:
```bash
git add -A
git commit -m "fix: address test/lint issues"
```

---

## Task 17: Final Verification and Summary Commit

**Step 1: Verify the build works**

```bash
npm run build
```

**Step 2: Create summary commit if all is well**

```bash
git log --oneline -10
```

Review the commits to ensure all changes are properly captured.
