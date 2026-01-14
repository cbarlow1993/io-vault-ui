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
