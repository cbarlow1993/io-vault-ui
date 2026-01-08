import { type Kysely, sql } from 'kysely';
import type {
  VaultDatabase,
  VaultRow,
  VaultCurveRow,
  TagAssignmentRow,
  ElipticCurve,
} from '@/src/lib/database/types.js';

export interface VaultDetails {
  vaultId: string;
  workspaceId: string;
  organisationId: string;
}

export interface VaultWithCurves {
  vaultId: string;
  curves: VaultCurveRow[];
}

export interface VaultRepository {
  findById(id: string): Promise<VaultRow | null>;
  findWorkspaceId(vaultId: string): Promise<string | null>;
  findVaultDetails(vaultId: string): Promise<VaultDetails | null>;
  findVaultXpub(vaultId: string, curve: ElipticCurve): Promise<string | null>;
  findVaultCurves(vaultId: string): Promise<VaultWithCurves | null>;
  findTagAssignment(params: {
    name: string;
    value: string;
    organisationId: string;
    workspaceId: string;
  }): Promise<TagAssignmentRow | null>;
}

export class PostgresVaultRepository implements VaultRepository {
  constructor(private db: Kysely<VaultDatabase>) {}

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
}
