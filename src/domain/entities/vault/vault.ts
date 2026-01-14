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
    const vaultCurves = data.curves.map((c) => VaultCurve.createNew(c.curveType, c.xpub));

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
