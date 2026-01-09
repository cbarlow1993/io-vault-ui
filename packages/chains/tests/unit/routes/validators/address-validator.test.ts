// packages/chains/tests/unit/routes/validators/address-validator.test.ts
import { describe, it, expect } from 'vitest';
import { AddressValidator } from '@/src/routes/validators/index.js';

describe('AddressValidator', () => {
  const validator = new AddressValidator();

  describe('EVM addresses', () => {
    it('validates correct EVM address', () => {
      const result = validator.validate(
        '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        'ethereum'
      );
      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.value.normalized).toBe(
          '0x742d35cc6634c0532925a3b844bc454e4438f44e'
        );
      }
    });

    it('rejects EVM address without 0x prefix', () => {
      const result = validator.validate(
        '742d35Cc6634C0532925a3b844Bc454e4438f44e',
        'ethereum'
      );
      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toContain('0x');
      }
    });

    it('rejects EVM address with wrong length', () => {
      const result = validator.validate('0x742d35Cc', 'ethereum');
      expect(result.isValid).toBe(false);
    });

    it('rejects empty address', () => {
      const result = validator.validate('', 'ethereum');
      expect(result.isValid).toBe(false);
    });

    it('works with various EVM chains', () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
      const evmChains = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'] as const;

      for (const chain of evmChains) {
        const result = validator.validate(address, chain);
        expect(result.isValid).toBe(true);
      }
    });
  });

  describe('Solana addresses', () => {
    it('validates correct Solana address', () => {
      const result = validator.validate(
        'DezXAZ8z7PnrnRJjz3wXBoqFCnxYDrLVKcnB8tQpHTrg',
        'solana'
      );
      expect(result.isValid).toBe(true);
    });

    it('rejects Solana address with forbidden base58 characters', () => {
      // Contains 'O' which is not valid in base58
      const result = validator.validate(
        'DezXAZ8z7PnrnRJjz3wXBOqFCnxYDrLVKcnB8tQpHTrg',
        'solana'
      );
      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toContain('base58');
      }
    });

    it('rejects Solana address that is too short', () => {
      const result = validator.validate('DezXAZ8z7Pnrn', 'solana');
      expect(result.isValid).toBe(false);
    });
  });

  describe('Bitcoin addresses', () => {
    it('validates P2PKH mainnet address (starts with 1)', () => {
      const result = validator.validate(
        '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
        'bitcoin'
      );
      expect(result.isValid).toBe(true);
    });

    it('validates P2SH mainnet address (starts with 3)', () => {
      const result = validator.validate(
        '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
        'bitcoin'
      );
      expect(result.isValid).toBe(true);
    });

    it('validates Bech32 mainnet address (starts with bc1q)', () => {
      const result = validator.validate(
        'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
        'bitcoin'
      );
      expect(result.isValid).toBe(true);
    });

    it('validates Taproot address (starts with bc1p)', () => {
      const result = validator.validate(
        'bc1pmzfrwwndsqmk5yh69ez8k3mlr5mvxfqsqy5wz7j5tkakaqx9rdgscl8qw5',
        'bitcoin'
      );
      expect(result.isValid).toBe(true);
    });

    it('rejects invalid Bitcoin address format', () => {
      const result = validator.validate('invalid-bitcoin-address', 'bitcoin');
      expect(result.isValid).toBe(false);
    });
  });

  describe('Unknown chains', () => {
    it('accepts any non-empty address for unknown chains', () => {
      // Unknown chains are permissive - they accept any non-empty address
      const result = validator.validate(
        'any-address-format',
        'tron' as any
      );
      expect(result.isValid).toBe(true);
    });
  });
});
