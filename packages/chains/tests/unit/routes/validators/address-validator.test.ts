import { describe, it, expect } from 'vitest';
import type { ChainAlias } from '@/src/core/types.js';
import { AddressValidator, type ValidationResult } from '@/src/routes/validators/index.js';
import { WalletAddress } from '@/src/domain/value-objects/index.js';

describe('AddressValidator', () => {
  const validator = new AddressValidator();

  describe('EVM addresses', () => {
    const evmChain: ChainAlias = 'ethereum';
    const validEvmAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f1c9aB';

    it('returns WalletAddress for valid EVM address', () => {
      const result = validator.validate(validEvmAddress, evmChain);

      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.value).toBeInstanceOf(WalletAddress);
        expect(result.value.original).toBe(validEvmAddress);
        expect(result.value.chainAlias).toBe(evmChain);
      }
    });

    it('returns error for EVM address with wrong length', () => {
      const shortAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f1c9'; // 39 hex chars

      const result = validator.validate(shortAddress, evmChain);

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toContain('Invalid address');
        expect(result.error).toContain('EVM addresses must be 0x followed by 40 hex characters');
      }
    });

    it('returns error for EVM address missing 0x prefix', () => {
      const noPrefix = '742d35Cc6634C0532925a3b844Bc9e7595f1c9aB';

      const result = validator.validate(noPrefix, evmChain);

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toContain('Invalid address');
        expect(result.error).toContain('EVM addresses must be 0x followed by 40 hex characters');
      }
    });

    it('returns error for EVM address with invalid hex characters', () => {
      const invalidHex = '0xZZZd35Cc6634C0532925a3b844Bc9e7595f1c9aB';

      const result = validator.validate(invalidHex, evmChain);

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toContain('Invalid address');
      }
    });
  });

  describe('Solana addresses', () => {
    const solanaChain: ChainAlias = 'solana';
    const validSolanaAddress = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';

    it('returns WalletAddress for valid Solana address', () => {
      const result = validator.validate(validSolanaAddress, solanaChain);

      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.value).toBeInstanceOf(WalletAddress);
        expect(result.value.original).toBe(validSolanaAddress);
        expect(result.value.chainAlias).toBe(solanaChain);
      }
    });

    it('returns error for Solana address with invalid length', () => {
      const tooShort = 'abc123'; // Less than 32 chars

      const result = validator.validate(tooShort, solanaChain);

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toContain('Invalid address');
        expect(result.error).toContain('Solana addresses must be 32-44 characters');
      }
    });

    it('returns error for Solana address with invalid base58 characters', () => {
      // Contains 'O' which is not valid base58
      const invalidBase58 = '7xKXtg2CW87d97TXJSDpbD5jBkheTqAO3TZRuJosgAsU';

      const result = validator.validate(invalidBase58, solanaChain);

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toContain('Invalid address');
        expect(result.error).toContain('base58');
      }
    });
  });

  describe('empty and null addresses', () => {
    it('returns error for empty address', () => {
      const result = validator.validate('', 'ethereum' as ChainAlias);

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toContain('Invalid address');
      }
    });

    it('returns error for whitespace-only address', () => {
      const result = validator.validate('   ', 'ethereum' as ChainAlias);

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toContain('Invalid address');
      }
    });
  });

  describe('unknown chain (permissive validation)', () => {
    it('returns WalletAddress for unknown chain with any non-empty address', () => {
      const unknownChain = 'unknown-chain' as ChainAlias;
      const arbitraryAddress = 'any-address-format-works';

      const result = validator.validate(arbitraryAddress, unknownChain);

      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.value).toBeInstanceOf(WalletAddress);
        expect(result.value.original).toBe(arbitraryAddress);
        expect(result.value.chainAlias).toBe(unknownChain);
      }
    });

    it('returns error for unknown chain with empty address', () => {
      const unknownChain = 'unknown-chain' as ChainAlias;

      const result = validator.validate('', unknownChain);

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toContain('Invalid address');
      }
    });
  });

  describe('Bitcoin addresses', () => {
    const bitcoinChain: ChainAlias = 'bitcoin';

    it('returns WalletAddress for valid P2PKH address', () => {
      const p2pkhAddress = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';

      const result = validator.validate(p2pkhAddress, bitcoinChain);

      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.value).toBeInstanceOf(WalletAddress);
        expect(result.value.original).toBe(p2pkhAddress);
      }
    });

    it('returns WalletAddress for valid Bech32 address', () => {
      const bech32Address = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';

      const result = validator.validate(bech32Address, bitcoinChain);

      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.value).toBeInstanceOf(WalletAddress);
      }
    });

    it('returns error for invalid Bitcoin address prefix', () => {
      const invalidAddress = 'xyz123invalidaddress';

      const result = validator.validate(invalidAddress, bitcoinChain);

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toContain('Invalid address');
        expect(result.error).toContain('Invalid Bitcoin address format');
      }
    });
  });

  describe('ValidationResult type', () => {
    it('has correct type for success result', () => {
      const result = validator.validate(
        '0x742d35Cc6634C0532925a3b844Bc9e7595f1c9aB',
        'ethereum' as ChainAlias
      );

      if (result.isValid) {
        // TypeScript should narrow to success type
        const walletAddress: WalletAddress = result.value;
        expect(walletAddress).toBeDefined();
      }
    });

    it('has correct type for error result', () => {
      const result = validator.validate('invalid', 'ethereum' as ChainAlias);

      if (!result.isValid) {
        // TypeScript should narrow to error type
        const errorMessage: string = result.error;
        expect(errorMessage).toBeDefined();
      }
    });
  });
});
