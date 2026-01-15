import { describe, it, expect } from 'vitest';
import { VaultCurve } from '@/src/domain/value-objects/vault-curve.js';
import { InvalidXpubError } from '@/src/domain/value-objects/errors.js';

describe('VaultCurve', () => {
  describe('createNew', () => {
    it('should create new VaultCurve with all fields', () => {
      const curve = VaultCurve.createNew({
        algorithm: 'ECDSA',
        curve: 'secp256k1',
        publicKey: '04abc123',
        xpub: 'xpub123',
      });
      expect(curve.id).toBeNull();
      expect(curve.algorithm).toBe('ECDSA');
      expect(curve.curve).toBe('secp256k1');
      expect(curve.publicKey).toBe('04abc123');
      expect(curve.xpub?.value).toBe('xpub123');
      expect(curve.createdAt).toBeNull();
    });

    it('should create VaultCurve with ed25519 curve', () => {
      const curve = VaultCurve.createNew({
        algorithm: 'EDDSA',
        curve: 'ed25519',
        publicKey: 'def456',
        xpub: 'edpub456',
      });
      expect(curve.algorithm).toBe('EDDSA');
      expect(curve.curve).toBe('ed25519');
      expect(curve.xpub?.value).toBe('edpub456');
    });

    it('should create VaultCurve without xpub (optional)', () => {
      const curve = VaultCurve.createNew({
        algorithm: 'EDDSA',
        curve: 'ed25519',
        publicKey: 'def456',
      });
      expect(curve.xpub).toBeNull();
    });

    it('should treat empty string xpub as no xpub', () => {
      // Empty string is falsy, so treated as "no xpub"
      const curve = VaultCurve.createNew({
        algorithm: 'ECDSA',
        curve: 'secp256k1',
        publicKey: '04abc123',
        xpub: '',
      });
      expect(curve.xpub).toBeNull();
    });

    it('should be immutable', () => {
      const curve = VaultCurve.createNew({
        algorithm: 'ECDSA',
        curve: 'secp256k1',
        publicKey: '04abc123',
        xpub: 'xpub123',
      });
      expect(Object.isFrozen(curve)).toBe(true);
    });
  });

  describe('fromDatabase', () => {
    it('should reconstitute from database row with xpub', () => {
      const now = new Date();
      const curve = VaultCurve.fromDatabase({
        id: 'curve-123',
        algorithm: 'EDDSA',
        curve: 'ed25519',
        publicKey: 'def456',
        xpub: 'edpub456',
        createdAt: now,
      });
      expect(curve.id).toBe('curve-123');
      expect(curve.algorithm).toBe('EDDSA');
      expect(curve.curve).toBe('ed25519');
      expect(curve.publicKey).toBe('def456');
      expect(curve.xpub?.value).toBe('edpub456');
      expect(curve.createdAt).toBe(now);
    });

    it('should reconstitute from database row without xpub', () => {
      const now = new Date();
      const curve = VaultCurve.fromDatabase({
        id: 'curve-123',
        algorithm: 'EDDSA',
        curve: 'ed25519',
        publicKey: 'def456',
        xpub: null,
        createdAt: now,
      });
      expect(curve.xpub).toBeNull();
    });

    it('should be immutable', () => {
      const curve = VaultCurve.fromDatabase({
        id: 'curve-123',
        algorithm: 'ECDSA',
        curve: 'secp256k1',
        publicKey: '04abc123',
        xpub: 'xpub789',
        createdAt: new Date(),
      });
      expect(Object.isFrozen(curve)).toBe(true);
    });
  });

  describe('hasSameCurveType', () => {
    it('should return true for same curve type', () => {
      const curve1 = VaultCurve.createNew({
        algorithm: 'ECDSA',
        curve: 'secp256k1',
        publicKey: 'pk1',
        xpub: 'xpub1',
      });
      const curve2 = VaultCurve.createNew({
        algorithm: 'ECDSA',
        curve: 'secp256k1',
        publicKey: 'pk2',
        xpub: 'xpub2',
      });
      expect(curve1.hasSameCurveType(curve2)).toBe(true);
    });

    it('should return false for different curve types', () => {
      const curve1 = VaultCurve.createNew({
        algorithm: 'ECDSA',
        curve: 'secp256k1',
        publicKey: 'pk1',
        xpub: 'xpub1',
      });
      const curve2 = VaultCurve.createNew({
        algorithm: 'EDDSA',
        curve: 'ed25519',
        publicKey: 'pk2',
      });
      expect(curve1.hasSameCurveType(curve2)).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should serialize new curve correctly', () => {
      const curve = VaultCurve.createNew({
        algorithm: 'ECDSA',
        curve: 'secp256k1',
        publicKey: '04abc123',
        xpub: 'xpub789',
      });
      expect(curve.toJSON()).toEqual({
        id: null,
        algorithm: 'ECDSA',
        curve: 'secp256k1',
        publicKey: '04abc123',
        xpub: 'xpub789',
        createdAt: null,
      });
    });

    it('should serialize curve without xpub correctly', () => {
      const curve = VaultCurve.createNew({
        algorithm: 'EDDSA',
        curve: 'ed25519',
        publicKey: 'def456',
      });
      expect(curve.toJSON()).toEqual({
        id: null,
        algorithm: 'EDDSA',
        curve: 'ed25519',
        publicKey: 'def456',
        xpub: null,
        createdAt: null,
      });
    });

    it('should serialize database curve correctly', () => {
      const now = new Date();
      const curve = VaultCurve.fromDatabase({
        id: 'curve-123',
        algorithm: 'ECDSA',
        curve: 'secp256k1',
        publicKey: '04abc123',
        xpub: 'xpub789',
        createdAt: now,
      });
      expect(curve.toJSON()).toEqual({
        id: 'curve-123',
        algorithm: 'ECDSA',
        curve: 'secp256k1',
        publicKey: '04abc123',
        xpub: 'xpub789',
        createdAt: now.toISOString(),
      });
    });
  });
});
