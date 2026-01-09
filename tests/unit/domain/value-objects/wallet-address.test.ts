import { describe, expect, it } from 'vitest';
import { WalletAddress, InvalidAddressError } from '@/src/domain/value-objects/index.js';
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';

describe('WalletAddress', () => {
  const chainAlias = 'ethereum' as ChainAlias;

  describe('create', () => {
    it('creates a WalletAddress from valid string', () => {
      const addr = WalletAddress.create('0xAbC123', chainAlias);
      expect(addr.original).toBe('0xAbC123');
      expect(addr.chainAlias).toBe('ethereum');
    });

    it('normalizes address to lowercase', () => {
      const addr = WalletAddress.create('0xAbCdEf123456', chainAlias);
      expect(addr.normalized).toBe('0xabcdef123456');
    });

    it('trims whitespace', () => {
      const addr = WalletAddress.create('  0xabc  ', chainAlias);
      expect(addr.original).toBe('0xabc');
      expect(addr.normalized).toBe('0xabc');
    });

    it('throws InvalidAddressError for empty string', () => {
      expect(() => WalletAddress.create('', chainAlias)).toThrow(InvalidAddressError);
      expect(() => WalletAddress.create('   ', chainAlias)).toThrow(InvalidAddressError);
    });

    it('throws InvalidAddressError for null/undefined', () => {
      expect(() => WalletAddress.create(null as unknown as string, chainAlias)).toThrow(
        InvalidAddressError
      );
      expect(() => WalletAddress.create(undefined as unknown as string, chainAlias)).toThrow(
        InvalidAddressError
      );
    });
  });

  describe('fromNormalized', () => {
    it('creates from already-normalized address', () => {
      const addr = WalletAddress.fromNormalized('0xabc123', chainAlias);
      expect(addr.normalized).toBe('0xabc123');
      expect(addr.original).toBe('0xabc123');
    });
  });

  describe('equals', () => {
    it('returns true for same normalized address and chain', () => {
      const a = WalletAddress.create('0xABC', chainAlias);
      const b = WalletAddress.create('0xabc', chainAlias);
      expect(a.equals(b)).toBe(true);
    });

    it('returns false for different addresses', () => {
      const a = WalletAddress.create('0xABC', chainAlias);
      const b = WalletAddress.create('0xDEF', chainAlias);
      expect(a.equals(b)).toBe(false);
    });

    it('returns false for same address on different chains', () => {
      const a = WalletAddress.create('0xABC', 'ethereum' as ChainAlias);
      const b = WalletAddress.create('0xABC', 'polygon' as ChainAlias);
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('matches', () => {
    it('matches case-insensitively', () => {
      const addr = WalletAddress.create('0xAbC', chainAlias);
      expect(addr.matches('0xabc')).toBe(true);
      expect(addr.matches('0xABC')).toBe(true);
      expect(addr.matches('0xAbC')).toBe(true);
    });

    it('trims input for matching', () => {
      const addr = WalletAddress.create('0xabc', chainAlias);
      expect(addr.matches('  0xabc  ')).toBe(true);
    });

    it('returns false for non-matching address', () => {
      const addr = WalletAddress.create('0xabc', chainAlias);
      expect(addr.matches('0xdef')).toBe(false);
    });
  });

  describe('forStorage', () => {
    it('returns normalized address', () => {
      const addr = WalletAddress.create('0xAbC', chainAlias);
      expect(addr.forStorage()).toBe('0xabc');
    });
  });

  describe('display', () => {
    it('returns original address', () => {
      const addr = WalletAddress.create('0xAbC123', chainAlias);
      expect(addr.display).toBe('0xAbC123');
    });
  });

  describe('toJSON', () => {
    it('serializes correctly', () => {
      const addr = WalletAddress.create('0xAbC', chainAlias);
      expect(addr.toJSON()).toEqual({
        address: '0xabc',
        chainAlias: 'ethereum',
      });
    });
  });

  describe('toString', () => {
    it('returns normalized address', () => {
      const addr = WalletAddress.create('0xAbC', chainAlias);
      expect(addr.toString()).toBe('0xabc');
    });
  });

  describe('immutability', () => {
    it('is frozen', () => {
      const addr = WalletAddress.create('0xabc', chainAlias);
      expect(Object.isFrozen(addr)).toBe(true);
    });
  });

  describe('chain-aware validation', () => {
    describe('EVM chains', () => {
      const evmChains = [
        'eth' as ChainAlias,
        'polygon' as ChainAlias,
        'arbitrum' as ChainAlias,
        'optimism' as ChainAlias,
        'base' as ChainAlias,
        'bsc' as ChainAlias,
        'avalanche-c' as ChainAlias,
      ];

      it.each(evmChains)('accepts valid EVM address on %s', (chain) => {
        const addr = WalletAddress.create('0xAbCdEf1234567890AbCdEf1234567890AbCdEf12', chain);
        expect(addr.normalized).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
      });

      it.each(evmChains)('rejects address without 0x prefix on %s', (chain) => {
        expect(() => WalletAddress.create('AbCdEf1234567890AbCdEf1234567890AbCdEf12', chain))
          .toThrow(InvalidAddressError);
      });

      it('includes reason in EVM validation error', () => {
        expect(() => WalletAddress.create('notValidAddress', 'eth' as ChainAlias))
          .toThrow('EVM addresses must start with 0x');
      });
    });

    describe('Solana chains', () => {
      const solanaChains = [
        'solana' as ChainAlias,
        'solana-mainnet' as ChainAlias,
        'solana-devnet' as ChainAlias,
      ];

      // Valid Solana addresses are base58 (no 0, O, I, l), 32-44 chars
      const validSolanaAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';

      it.each(solanaChains)('accepts valid Solana address on %s', (chain) => {
        const addr = WalletAddress.create(validSolanaAddress, chain);
        expect(addr.original).toBe(validSolanaAddress);
      });

      it.each(solanaChains)('rejects address with invalid base58 character "0" on %s', (chain) => {
        expect(() => WalletAddress.create('0WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', chain))
          .toThrow(InvalidAddressError);
      });

      it.each(solanaChains)('rejects address with invalid base58 character "O" on %s', (chain) => {
        expect(() => WalletAddress.create('OWzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', chain))
          .toThrow(InvalidAddressError);
      });

      it.each(solanaChains)('rejects address with invalid base58 character "I" on %s', (chain) => {
        expect(() => WalletAddress.create('IWzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', chain))
          .toThrow(InvalidAddressError);
      });

      it.each(solanaChains)('rejects address with invalid base58 character "l" on %s', (chain) => {
        expect(() => WalletAddress.create('lWzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', chain))
          .toThrow(InvalidAddressError);
      });

      it.each(solanaChains)('rejects address shorter than 32 characters on %s', (chain) => {
        expect(() => WalletAddress.create('9WzDXwBbmkg8ZTbNMqUxvQRAyrZz', chain))
          .toThrow(InvalidAddressError);
      });

      it.each(solanaChains)('rejects address longer than 44 characters on %s', (chain) => {
        expect(() => WalletAddress.create('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWMExtra', chain))
          .toThrow(InvalidAddressError);
      });

      it('includes reason in Solana validation error', () => {
        expect(() => WalletAddress.create('short', 'solana' as ChainAlias))
          .toThrow('Solana addresses must be 32-44 characters');
      });
    });

    describe('Bitcoin chains', () => {
      const bitcoinChains = [
        'bitcoin' as ChainAlias,
        'btc-mainnet' as ChainAlias,
        'btc-testnet' as ChainAlias,
      ];

      // P2PKH - starts with 1 (mainnet)
      it.each(bitcoinChains)('accepts P2PKH address (starts with 1) on %s', (chain) => {
        const addr = WalletAddress.create('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2', chain);
        expect(addr.original).toBe('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2');
      });

      // P2SH - starts with 3 (mainnet)
      it.each(bitcoinChains)('accepts P2SH address (starts with 3) on %s', (chain) => {
        const addr = WalletAddress.create('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy', chain);
        expect(addr.original).toBe('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy');
      });

      // Bech32 - starts with bc1 (mainnet)
      it.each(bitcoinChains)('accepts Bech32 address (starts with bc1) on %s', (chain) => {
        const addr = WalletAddress.create('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', chain);
        expect(addr.original).toBe('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');
      });

      // Taproot - starts with bc1p (mainnet)
      it.each(bitcoinChains)('accepts Taproot address (starts with bc1p) on %s', (chain) => {
        const addr = WalletAddress.create('bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr', chain);
        expect(addr.original).toBe('bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr');
      });

      // Testnet P2PKH - starts with m or n
      it('accepts testnet P2PKH address (starts with m)', () => {
        const addr = WalletAddress.create('mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn', 'btc-testnet' as ChainAlias);
        expect(addr.original).toBe('mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn');
      });

      it('accepts testnet P2PKH address (starts with n)', () => {
        const addr = WalletAddress.create('n2eMqTT929pb1RDNuqEnxdaLau1rxy3efi', 'btc-testnet' as ChainAlias);
        expect(addr.original).toBe('n2eMqTT929pb1RDNuqEnxdaLau1rxy3efi');
      });

      // Testnet Bech32 - starts with tb1
      it('accepts testnet Bech32 address (starts with tb1)', () => {
        const addr = WalletAddress.create('tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx', 'btc-testnet' as ChainAlias);
        expect(addr.original).toBe('tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx');
      });

      it.each(bitcoinChains)('rejects invalid Bitcoin address on %s', (chain) => {
        expect(() => WalletAddress.create('0x1234567890abcdef', chain))
          .toThrow(InvalidAddressError);
      });

      it('includes reason in Bitcoin validation error', () => {
        expect(() => WalletAddress.create('invalidBitcoinAddress', 'bitcoin' as ChainAlias))
          .toThrow('Invalid Bitcoin address format');
      });
    });

    describe('unknown chains', () => {
      it('accepts any address format for unknown chains', () => {
        const addr = WalletAddress.create('anyAddressFormat123', 'unknown-chain' as ChainAlias);
        expect(addr.original).toBe('anyAddressFormat123');
      });

      it('accepts EVM-style address for unknown chains', () => {
        const addr = WalletAddress.create('0xAbCdEf1234567890AbCdEf1234567890AbCdEf12', 'unknown-chain' as ChainAlias);
        expect(addr.normalized).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
      });

      it('accepts Solana-style address for unknown chains', () => {
        const addr = WalletAddress.create('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', 'unknown-chain' as ChainAlias);
        expect(addr.original).toBe('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM');
      });
    });
  });
});
