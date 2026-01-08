// packages/chains/src/core/errors.ts
import type { ChainAlias } from './types.js';

export class ChainError extends Error {
  constructor(
    message: string,
    public readonly chainAlias: ChainAlias,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'ChainError';
  }
}

export class RpcError extends ChainError {
  constructor(
    message: string,
    chainAlias: ChainAlias,
    public readonly code?: number,
    cause?: unknown
  ) {
    super(message, chainAlias, cause);
    this.name = 'RpcError';
  }
}

export class RpcTimeoutError extends RpcError {
  constructor(chainAlias: ChainAlias, timeoutMs: number) {
    super(`RPC request timed out after ${timeoutMs}ms`, chainAlias);
    this.name = 'RpcTimeoutError';
  }
}

export class RateLimitError extends RpcError {
  constructor(chainAlias: ChainAlias, retryAfterMs?: number) {
    super(
      retryAfterMs
        ? `Rate limited, retry after ${retryAfterMs}ms`
        : 'Rate limited by RPC provider',
      chainAlias,
      429
    );
    this.name = 'RateLimitError';
  }
}

export class InvalidAddressError extends ChainError {
  constructor(chainAlias: ChainAlias, public readonly address: string) {
    super(`Invalid address: ${address}`, chainAlias);
    this.name = 'InvalidAddressError';
  }
}

export class InvalidTransactionError extends ChainError {
  constructor(chainAlias: ChainAlias, reason: string) {
    super(`Invalid transaction: ${reason}`, chainAlias);
    this.name = 'InvalidTransactionError';
  }
}

export class InsufficientBalanceError extends ChainError {
  constructor(
    chainAlias: ChainAlias,
    public readonly required: string,
    public readonly available: string
  ) {
    super(`Insufficient balance: required ${required}, available ${available}`, chainAlias);
    this.name = 'InsufficientBalanceError';
  }
}

export class TransactionFailedError extends ChainError {
  constructor(
    chainAlias: ChainAlias,
    public readonly txHash: string,
    reason?: string
  ) {
    super(reason ? `Transaction failed: ${reason}` : 'Transaction failed', chainAlias);
    this.name = 'TransactionFailedError';
  }
}

export class UnsupportedChainError extends Error {
  constructor(public readonly chainAlias: string) {
    super(`Unsupported chain: ${chainAlias}`);
    this.name = 'UnsupportedChainError';
  }
}

export class UnsupportedOperationError extends ChainError {
  constructor(chainAlias: ChainAlias, operation: string) {
    super(`Operation not supported: ${operation}`, chainAlias);
    this.name = 'UnsupportedOperationError';
  }
}

export type BroadcastErrorCode =
  | 'ALREADY_KNOWN'
  | 'NONCE_TOO_LOW'
  | 'SEQUENCE_TOO_LOW'
  | 'INSUFFICIENT_FUNDS'
  | 'UNDERPRICED'
  | 'EXPIRED'
  | 'REJECTED'
  | 'NETWORK_ERROR';

export class BroadcastError extends ChainError {
  constructor(
    message: string,
    chainAlias: ChainAlias,
    public readonly code: BroadcastErrorCode,
    cause?: unknown
  ) {
    super(message, chainAlias, cause);
    this.name = 'BroadcastError';
  }
}
