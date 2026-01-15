import { type Kysely, sql } from 'kysely';
import type {
  Database,
  VaultRow,
  VaultCurveRow,
  TagAssignmentRow,
  ElipticCurve,
} from '@/src/lib/database/types.js';
import { Vault } from '@/src/domain/entities/index.js';
import { VaultCurve } from '@/src/domain/value-objects/index.js';

export interface VaultDetails {
  vaultId: string;
  workspaceId: string;
  organisationId: string;
}

export interface VaultWithCurves {
  vaultId: string;
  curves: VaultCurveRow[];
}

/**
 * Extended vault details for domain entity creation.
 */
export interface VaultWithDetails {
  vaultId: string;
  organizationId: string;
  workspaceId: string | null;
  createdAt: Date;
}

export interface VaultRepository {
  findById(id: string): Promise<VaultRow | null>;
  findWorkspaceId(vaultId: string): Promise<string | null>;
  findVaultDetails(vaultId: string): Promise<VaultDetails | null>;
  findVaultWithDetails(vaultId: string): Promise<VaultWithDetails | null>;
  findVaultXpub(vaultId: string, curve: ElipticCurve): Promise<string | null>;
  findVaultCurves(vaultId: string): Promise<VaultWithCurves | null>;
  findTagAssignment(params: {
    name: string;
    value: string;
    organisationId: string;
    workspaceId: string;
  }): Promise<TagAssignmentRow | null>;
  createVaultWithCurves(vault: Vault): Promise<Vault>;
  vaultExists(id: string): Promise<boolean>;
}

export class PostgresVaultRepository implements VaultRepository {
  constructor(private db: Kysely<Database>) {}

  async findById(id: string): Promise<VaultRow | null> {
    const result = await this.db
      .selectFrom('Vault')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return result ?? null;
  }

  async findWorkspaceId(vaultId: string): Promise<string | null> {
    const result = await this.db
      .selectFrom('Vault')
      .select('workspaceId')
      .where('id', '=', vaultId)
      .executeTakeFirst();
    return result?.workspaceId ?? null;
  }

  async findVaultDetails(vaultId: string): Promise<VaultDetails | null> {
    const result = await this.db
      .selectFrom('Vault')
      .select(['id', 'workspaceId', 'organisationId'])
      .where('id', '=', vaultId)
      .executeTakeFirst();

    if (!result) {
      return null;
    }

    return {
      vaultId: result.id,
      workspaceId: result.workspaceId,
      organisationId: result.organisationId,
    };
  }

  async findVaultXpub(vaultId: string, curve: ElipticCurve): Promise<string | null> {
    // Use raw SQL for the enum cast since Kysely doesn't natively support PostgreSQL enums
    const result = await sql<{ xpub: string }>`
      SELECT "xpub" FROM "VaultCurve"
      WHERE "vaultId" = ${vaultId}
      AND "curve" = ${curve}::"ElipticCurve"
    `.execute(this.db);

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    return result.rows[0]!.xpub;
  }

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

  async findVaultCurves(vaultId: string): Promise<VaultWithCurves | null> {
    const curves = await this.db
      .selectFrom('VaultCurve')
      .selectAll()
      .where('vaultId', '=', vaultId)
      .execute();

    if (curves.length === 0) {
      return null;
    }

    return {
      vaultId,
      curves,
    };
  }

  async findTagAssignment(params: {
    name: string;
    value: string;
    organisationId: string;
    workspaceId: string;
  }): Promise<TagAssignmentRow | null> {
    const result = await this.db
      .selectFrom('TagAssignment as ta')
      .innerJoin('Tag as t', 't.id', 'ta.tagId')
      .selectAll('ta')
      .where('t.name', '=', params.name)
      .where('t.organisationId', '=', params.organisationId)
      .where('t.workspaceId', '=', params.workspaceId)
      .where('ta.value', '=', params.value)
      .executeTakeFirst();

    return result ?? null;
  }

  async vaultExists(id: string): Promise<boolean> {
    const result = await this.db
      .selectFrom('Vault')
      .select('id')
      .where('id', '=', id)
      .executeTakeFirst();
    return result !== undefined;
  }

  /**
   * Create a vault with curves in a transaction.
   * Accepts a Vault domain entity and returns the persisted Vault with database-assigned values.
   */
  async createVaultWithCurves(vault: Vault): Promise<Vault> {
    if (!vault.workspaceId) {
      throw new Error('workspaceId is required for vault creation');
    }

    return await this.db.transaction().execute(async (trx) => {
      // Insert vault
      const vaultResult = await trx
        .insertInto('Vault')
        .values({
          id: vault.id,
          workspaceId: vault.workspaceId!,
          organisationId: vault.organizationId,
          createdAt: vault.createdAt,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      // Insert curves using raw SQL for enum cast
      const insertedCurves: VaultCurve[] = [];
      for (const curve of vault.curves) {
        const xpubValue = curve.xpub?.value ?? null;
        const curveResult = await sql<VaultCurveRow>`
          INSERT INTO "VaultCurve" ("vaultId", "curve", "algorithm", "publicKey", "xpub")
          VALUES (${vault.id}, ${curve.curve}::"ElipticCurve", ${curve.algorithm}, ${curve.publicKey}, ${xpubValue})
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
}
