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

    it('should be immutable', () => {
      const xpub = Xpub.create('xpub123', 'secp256k1');
      expect(Object.isFrozen(xpub)).toBe(true);
    });
  });

  describe('fromTrusted', () => {
    it('should create xpub without validation', () => {
      const xpub = Xpub.fromTrusted('any-value', 'secp256k1');
      expect(xpub.value).toBe('any-value');
      expect(xpub.curve).toBe('secp256k1');
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

  describe('toString', () => {
    it('should return the value', () => {
      const xpub = Xpub.create('xpub123', 'secp256k1');
      expect(xpub.toString()).toBe('xpub123');
    });
  });
});
