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
