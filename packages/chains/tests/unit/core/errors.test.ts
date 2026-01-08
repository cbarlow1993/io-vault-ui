// packages/chains/tests/unit/core/errors.test.ts
import { describe, it, expect } from 'vitest';
import {
  ChainError,
  RpcError,
  RpcTimeoutError,
  RateLimitError,
  InvalidAddressError,
  InvalidTransactionError,
  InsufficientBalanceError,
  TransactionFailedError,
  UnsupportedChainError,
  UnsupportedOperationError,
  BroadcastError,
} from '../../../src/core/errors.js';

describe('Error Classes', () => {
  describe('ChainError', () => {
    it('creates error with chainAlias and message', () => {
      const error = new ChainError('Test error', 'ethereum');
      expect(error.message).toBe('Test error');
      expect(error.chainAlias).toBe('ethereum');
      expect(error.name).toBe('ChainError');
    });

    it('preserves cause when provided', () => {
      const cause = new Error('Original error');
      const error = new ChainError('Wrapped error', 'polygon', cause);
      expect(error.cause).toBe(cause);
    });
  });

  describe('RpcError', () => {
    it('extends ChainError with code', () => {
      const error = new RpcError('RPC failed', 'ethereum', -32000);
      expect(error.code).toBe(-32000);
      expect(error.name).toBe('RpcError');
      expect(error).toBeInstanceOf(ChainError);
    });
  });

  describe('RpcTimeoutError', () => {
    it('creates timeout error with duration', () => {
      const error = new RpcTimeoutError('solana', 5000);
      expect(error.message).toBe('RPC request timed out after 5000ms');
      expect(error.name).toBe('RpcTimeoutError');
      expect(error).toBeInstanceOf(RpcError);
      expect(error).toBeInstanceOf(ChainError);
    });
  });

  describe('RateLimitError', () => {
    it('creates rate limit error with retry info', () => {
      const error = new RateLimitError('ethereum', 1000);
      expect(error.message).toContain('retry after 1000ms');
      expect(error.code).toBe(429);
      expect(error).toBeInstanceOf(RpcError);
      expect(error).toBeInstanceOf(ChainError);
    });
  });

  describe('InvalidAddressError', () => {
    it('includes the invalid address in message', () => {
      const error = new InvalidAddressError('bitcoin', 'not-an-address');
      expect(error.message).toContain('not-an-address');
      expect(error.address).toBe('not-an-address');
      expect(error).toBeInstanceOf(ChainError);
    });
  });

  describe('InvalidTransactionError', () => {
    it('includes the reason in message', () => {
      const error = new InvalidTransactionError('ethereum', 'invalid nonce');
      expect(error.message).toContain('invalid nonce');
      expect(error.name).toBe('InvalidTransactionError');
    });
  });

  describe('InsufficientBalanceError', () => {
    it('includes required and available amounts', () => {
      const error = new InsufficientBalanceError('ethereum', '1000', '500');
      expect(error.required).toBe('1000');
      expect(error.available).toBe('500');
      expect(error.message).toContain('1000');
      expect(error.message).toContain('500');
      expect(error).toBeInstanceOf(ChainError);
    });
  });

  describe('UnsupportedChainError', () => {
    it('does not extend ChainError (no valid chainAlias)', () => {
      const error = new UnsupportedChainError('fake-chain');
      expect(error.chainAlias).toBe('fake-chain');
      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeInstanceOf(ChainError);
    });
  });

  describe('UnsupportedOperationError', () => {
    it('includes the operation in message', () => {
      const error = new UnsupportedOperationError('bitcoin', 'smart-contract-call');
      expect(error.message).toContain('smart-contract-call');
      expect(error.name).toBe('UnsupportedOperationError');
      expect(error).toBeInstanceOf(ChainError);
    });
  });

  describe('BroadcastError', () => {
    it('includes broadcast error code', () => {
      const error = new BroadcastError('Nonce too low', 'ethereum', 'NONCE_TOO_LOW');
      expect(error.code).toBe('NONCE_TOO_LOW');
      expect(error.name).toBe('BroadcastError');
      expect(error).toBeInstanceOf(ChainError);
    });
  });

  describe('TransactionFailedError', () => {
    it('creates error with txHash and optional reason', () => {
      const errorWithReason = new TransactionFailedError('ethereum', '0x123abc', 'out of gas');
      expect(errorWithReason.txHash).toBe('0x123abc');
      expect(errorWithReason.message).toBe('Transaction failed: out of gas');
      expect(errorWithReason.name).toBe('TransactionFailedError');
      expect(errorWithReason).toBeInstanceOf(ChainError);

      const errorWithoutReason = new TransactionFailedError('polygon', '0xdef456');
      expect(errorWithoutReason.txHash).toBe('0xdef456');
      expect(errorWithoutReason.message).toBe('Transaction failed');
      expect(errorWithoutReason).toBeInstanceOf(ChainError);
    });
  });
});
