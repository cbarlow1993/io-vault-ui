import type { ElipticCurve } from '@/src/lib/database/types.js';
import { Xpub } from './xpub.js';

export interface CreateVaultCurveData {
  algorithm: string;
  curve: ElipticCurve;
  publicKey: string;
  xpub?: string;
}

/**
 * Immutable value object representing a curve configuration for a vault.
 * Combines the curve type with algorithm, public key, and optional xpub.
 */
export class VaultCurve {
  private constructor(
    public readonly id: string | null,
    public readonly algorithm: string,
    public readonly curve: ElipticCurve,
    public readonly publicKey: string,
    public readonly xpub: Xpub | null,
    public readonly createdAt: Date | null
  ) {
    Object.freeze(this);
  }

  /**
   * Create a new VaultCurve (for creation, before persistence)
   */
  static createNew(data: CreateVaultCurveData): VaultCurve {
    const xpub = data.xpub ? Xpub.create(data.xpub, data.curve) : null;
    return new VaultCurve(null, data.algorithm, data.curve, data.publicKey, xpub, null);
  }

  /**
   * Reconstitute from database row
   */
  static fromDatabase(row: {
    id: string;
    algorithm: string;
    curve: ElipticCurve;
    publicKey: string;
    xpub: string | null;
    createdAt: Date;
  }): VaultCurve {
    const xpub = row.xpub ? Xpub.fromTrusted(row.xpub, row.curve) : null;
    return new VaultCurve(row.id, row.algorithm, row.curve, row.publicKey, xpub, row.createdAt);
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
      algorithm: this.algorithm,
      curve: this.curve,
      publicKey: this.publicKey,
      xpub: this.xpub?.value ?? null,
      createdAt: this.createdAt?.toISOString() ?? null,
    };
  }
}
