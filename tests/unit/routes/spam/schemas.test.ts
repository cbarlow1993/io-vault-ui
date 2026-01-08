import { describe, it, expect } from 'vitest';
import { spamOverrideParamsSchema, bulkOverrideItemSchema } from '@/src/routes/spam/schemas.js';

describe('spam schemas', () => {
  describe('spamOverrideParamsSchema', () => {
    it('accepts valid ethereum address', () => {
      const result = spamOverrideParamsSchema.safeParse({
        addressId: '550e8400-e29b-41d4-a716-446655440000',
        tokenAddress: '0x1234567890123456789012345678901234567890',
      });
      expect(result.success).toBe(true);
    });

    it('accepts "native" as token address', () => {
      const result = spamOverrideParamsSchema.safeParse({
        addressId: '550e8400-e29b-41d4-a716-446655440000',
        tokenAddress: 'native',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid token address format', () => {
      const result = spamOverrideParamsSchema.safeParse({
        addressId: '550e8400-e29b-41d4-a716-446655440000',
        tokenAddress: 'not-a-valid-address',
      });
      expect(result.success).toBe(false);
    });

    it('rejects too-short hex address', () => {
      const result = spamOverrideParamsSchema.safeParse({
        addressId: '550e8400-e29b-41d4-a716-446655440000',
        tokenAddress: '0x1234',
      });
      expect(result.success).toBe(false);
    });

    it('rejects hex address with wrong length', () => {
      const result = spamOverrideParamsSchema.safeParse({
        addressId: '550e8400-e29b-41d4-a716-446655440000',
        tokenAddress: '0x12345678901234567890123456789012345678901', // 41 hex chars
      });
      expect(result.success).toBe(false);
    });
  });

  describe('bulkOverrideItemSchema', () => {
    it('accepts valid token address in bulk item', () => {
      const result = bulkOverrideItemSchema.safeParse({
        tokenAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        override: 'trusted',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid token address in bulk item', () => {
      const result = bulkOverrideItemSchema.safeParse({
        tokenAddress: 'invalid',
        override: 'spam',
      });
      expect(result.success).toBe(false);
    });
  });
});
