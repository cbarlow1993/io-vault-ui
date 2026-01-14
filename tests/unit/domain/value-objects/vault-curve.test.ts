import { describe, it, expect } from 'vitest';
import { VaultCurve } from '@/src/domain/value-objects/vault-curve.js';
import { InvalidXpubError } from '@/src/domain/value-objects/errors.js';

describe('VaultCurve', () => {
  describe('createNew', () => {
    it('should create new VaultCurve without id/createdAt', () => {
      const curve = VaultCurve.createNew('secp256k1', 'xpub123');
      expect(curve.id).toBeNull();
      expect(curve.curve).toBe('secp256k1');
      expect(curve.xpub.value).toBe('xpub123');
      expect(curve.createdAt).toBeNull();
    });

    it('should create VaultCurve with ed25519 curve', () => {
      const curve = VaultCurve.createNew('ed25519', 'edpub456');
      expect(curve.curve).toBe('ed25519');
      expect(curve.xpub.value).toBe('edpub456');
    });

    it('should throw for invalid xpub', () => {
      expect(() => VaultCurve.createNew('secp256k1', '')).toThrow(InvalidXpubError);
    });

    it('should be immutable', () => {
      const curve = VaultCurve.createNew('secp256k1', 'xpub123');
      expect(Object.isFrozen(curve)).toBe(true);
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

    it('should be immutable', () => {
      const curve = VaultCurve.fromDatabase({
        id: 'curve-123',
        curve: 'secp256k1',
        xpub: 'xpub789',
        createdAt: new Date(),
      });
      expect(Object.isFrozen(curve)).toBe(true);
    });
  });

  describe('hasSameCurveType', () => {
    it('should return true for same curve type', () => {
      const curve1 = VaultCurve.createNew('secp256k1', 'xpub1');
      const curve2 = VaultCurve.createNew('secp256k1', 'xpub2');
      expect(curve1.hasSameCurveType(curve2)).toBe(true);
    });

    it('should return false for different curve types', () => {
      const curve1 = VaultCurve.createNew('secp256k1', 'xpub1');
      const curve2 = VaultCurve.createNew('ed25519', 'edpub1');
      expect(curve1.hasSameCurveType(curve2)).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should serialize new curve correctly', () => {
      const curve = VaultCurve.createNew('secp256k1', 'xpub789');
      expect(curve.toJSON()).toEqual({
        id: null,
        curveType: 'secp256k1',
        xpub: 'xpub789',
        createdAt: null,
      });
    });

    it('should serialize database curve correctly', () => {
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
