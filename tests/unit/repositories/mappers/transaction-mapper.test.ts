import { describe, expect, it } from 'vitest';
import type { ChainAlias } from '@iofinnet/io-core-dapp-utils-chains-sdk';
import {
  TransactionHash,
  TokenAmount,
  InvalidTransactionHashError,
  InvalidAmountError,
} from '@/src/domain/value-objects/index.js';
import { TransactionMapper } from '@/src/repositories/mappers/transaction-mapper.js';

describe('TransactionMapper', () => {
  const chainAlias = 'ethereum' as ChainAlias;
  const validTxHash = '0xabc123def456789012345678901234567890abcdef1234567890abcdef12345678';

  describe('hashToDomain', () => {
    it('converts raw hash string to TransactionHash value object', () => {
      const txHash = TransactionMapper.hashToDomain(validTxHash, chainAlias);

      expect(txHash).toBeInstanceOf(TransactionHash);
      expect(txHash.value).toBe(validTxHash);
      expect(txHash.chainAlias).toBe(chainAlias);
    });

    it('trims whitespace from hash', () => {
      const txHash = TransactionMapper.hashToDomain(`  ${validTxHash}  `, chainAlias);

      expect(txHash.value).toBe(validTxHash);
    });

    it('throws InvalidTransactionHashError for empty hash', () => {
      expect(() => TransactionMapper.hashToDomain('', chainAlias)).toThrow(
        InvalidTransactionHashError
      );
    });

    it('throws InvalidTransactionHashError for whitespace-only hash', () => {
      expect(() => TransactionMapper.hashToDomain('   ', chainAlias)).toThrow(
        InvalidTransactionHashError
      );
    });

    it('works with different chain aliases', () => {
      const solanaHash = '5K5Z1V2J3K4L5M6N7O8P9Q0R1S2T3U4V5W6X7Y8Z9A0B1C2D3E4F5G6H7I8J9K';
      const txHash = TransactionMapper.hashToDomain(solanaHash, 'solana' as ChainAlias);

      expect(txHash.chainAlias).toBe('solana');
      expect(txHash.value).toBe(solanaHash);
    });
  });

  describe('hashToDatabase', () => {
    it('converts TransactionHash to raw string', () => {
      const txHash = TransactionHash.create(validTxHash, chainAlias);

      const result = TransactionMapper.hashToDatabase(txHash);

      expect(result).toBe(validTxHash);
      expect(typeof result).toBe('string');
    });

    it('returns the value property of TransactionHash', () => {
      const hash = '0x123abc';
      const txHash = TransactionHash.create(hash, chainAlias);

      const result = TransactionMapper.hashToDatabase(txHash);

      expect(result).toBe(hash);
    });
  });

  describe('amountToDomain', () => {
    it('converts raw amount string and decimals to TokenAmount', () => {
      const rawAmount = '1000000000000000000'; // 1 ETH in wei
      const decimals = 18;

      const amount = TransactionMapper.amountToDomain(rawAmount, decimals);

      expect(amount).toBeInstanceOf(TokenAmount);
      expect(amount.raw).toBe(rawAmount);
      expect(amount.decimals).toBe(decimals);
      expect(amount.formatted).toBe('1');
    });

    it('handles different decimal values', () => {
      const rawAmount = '1000000'; // 1 USDC
      const decimals = 6;

      const amount = TransactionMapper.amountToDomain(rawAmount, decimals);

      expect(amount.raw).toBe(rawAmount);
      expect(amount.decimals).toBe(decimals);
      expect(amount.formatted).toBe('1');
    });

    it('handles zero amount', () => {
      const amount = TransactionMapper.amountToDomain('0', 18);

      expect(amount.raw).toBe('0');
      expect(amount.isZero).toBe(true);
    });

    it('handles large amounts', () => {
      const largeAmount = '1000000000000000000000000'; // 1 million ETH
      const amount = TransactionMapper.amountToDomain(largeAmount, 18);

      expect(amount.raw).toBe(largeAmount);
      expect(amount.formatted).toBe('1000000');
    });

    it('throws InvalidAmountError for invalid amount strings', () => {
      expect(() => TransactionMapper.amountToDomain('not-a-number', 18)).toThrow(InvalidAmountError);
    });

    it('throws InvalidAmountError for negative amounts', () => {
      expect(() => TransactionMapper.amountToDomain('-1000', 18)).toThrow(InvalidAmountError);
    });

    it('throws InvalidAmountError for decimal amounts', () => {
      expect(() => TransactionMapper.amountToDomain('1.5', 18)).toThrow(InvalidAmountError);
    });

    it('throws InvalidAmountError for empty string', () => {
      expect(() => TransactionMapper.amountToDomain('', 18)).toThrow(InvalidAmountError);
    });
  });

  describe('amountToDatabase', () => {
    it('converts TokenAmount to database format object', () => {
      const amount = TokenAmount.fromRaw('1000000000000000000', 18);

      const result = TransactionMapper.amountToDatabase(amount);

      expect(result).toEqual({
        raw: '1000000000000000000',
        decimals: 18,
      });
    });

    it('preserves the exact raw and decimals values', () => {
      const amount = TokenAmount.fromRaw('123456789', 6);

      const result = TransactionMapper.amountToDatabase(amount);

      expect(result.raw).toBe('123456789');
      expect(result.decimals).toBe(6);
    });

    it('handles zero amounts', () => {
      const amount = TokenAmount.zero(18);

      const result = TransactionMapper.amountToDatabase(amount);

      expect(result).toEqual({
        raw: '0',
        decimals: 18,
      });
    });
  });

  describe('round-trip conversion', () => {
    describe('hash round-trip', () => {
      it('maintains data integrity for hash through domain and back', () => {
        const originalHash = validTxHash;

        const txHash = TransactionMapper.hashToDomain(originalHash, chainAlias);
        const resultHash = TransactionMapper.hashToDatabase(txHash);

        expect(resultHash).toBe(originalHash);
      });
    });

    describe('amount round-trip', () => {
      it('maintains data integrity for amount through domain and back', () => {
        const originalRaw = '1000000000000000000';
        const originalDecimals = 18;

        const amount = TransactionMapper.amountToDomain(originalRaw, originalDecimals);
        const result = TransactionMapper.amountToDatabase(amount);

        expect(result.raw).toBe(originalRaw);
        expect(result.decimals).toBe(originalDecimals);
      });

      it('works with various decimal precisions', () => {
        const testCases = [
          { raw: '100', decimals: 0 },
          { raw: '1000000', decimals: 6 },
          { raw: '1000000000', decimals: 9 },
          { raw: '1000000000000000000', decimals: 18 },
        ];

        for (const { raw, decimals } of testCases) {
          const amount = TransactionMapper.amountToDomain(raw, decimals);
          const result = TransactionMapper.amountToDatabase(amount);

          expect(result.raw).toBe(raw);
          expect(result.decimals).toBe(decimals);
        }
      });
    });
  });
});
