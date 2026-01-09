// packages/chains/src/utxo/errors.ts

import { ChainError } from '../core/errors.js';
import type { ChainAlias } from '../core/types.js';

/**
 * Error thrown when UTXO selection fails
 */
export class UtxoSelectionError extends ChainError {
  constructor(
    message: string,
    chainAlias: ChainAlias,
    public readonly required: bigint,
    public readonly available: bigint
  ) {
    super(message, chainAlias);
    this.name = 'UtxoSelectionError';
  }
}

/**
 * Error thrown when signature count/format is invalid
 */
export class SignatureError extends ChainError {
  constructor(
    message: string,
    chainAlias: ChainAlias,
    public readonly expected?: number,
    public readonly received?: number
  ) {
    super(message, chainAlias);
    this.name = 'SignatureError';
  }
}

/**
 * Error thrown during PSBT construction or finalization
 */
export class PsbtError extends ChainError {
  constructor(
    message: string,
    chainAlias: ChainAlias,
    public readonly stage: 'construction' | 'signing' | 'finalization',
    cause?: unknown
  ) {
    super(message, chainAlias, cause);
    this.name = 'PsbtError';
  }
}

/**
 * Error thrown by Blockbook API
 */
export class BlockbookError extends ChainError {
  constructor(
    message: string,
    chainAlias: ChainAlias,
    public readonly statusCode?: number,
    public readonly endpoint?: string,
    cause?: unknown
  ) {
    super(message, chainAlias, cause);
    this.name = 'BlockbookError';
  }
}

/**
 * Error thrown when address type is unsupported
 */
export class UnsupportedAddressTypeError extends ChainError {
  constructor(
    chainAlias: ChainAlias,
    public readonly address: string,
    public readonly detectedType?: string
  ) {
    super(
      `Unsupported address type${detectedType ? ` (${detectedType})` : ''}: ${address}`,
      chainAlias
    );
    this.name = 'UnsupportedAddressTypeError';
  }
}
