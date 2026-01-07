import type { WorkflowContext } from '@/src/services/workflow/types.js';

export type BroadcastResult =
  | { success: true; txHash: string }
  | { success: false; error: string; retryable: boolean };

export interface BroadcastService {
  /**
   * Broadcast a signed transaction to the blockchain.
   * Returns the transaction hash on success, or an error on failure.
   */
  broadcast(context: WorkflowContext): Promise<BroadcastResult>;
}

interface Logger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

/**
 * Stub implementation of BroadcastService.
 * Returns a mock transaction hash without actually broadcasting.
 * Replace with actual blockchain broadcast logic when ready.
 */
export class StubBroadcastService implements BroadcastService {
  constructor(private logger: Logger) {}

  async broadcast(context: WorkflowContext): Promise<BroadcastResult> {
    this.logger.info('Broadcasting transaction (stub)', {
      vaultId: context.vaultId,
      chainAlias: context.chainAlias,
      hasSignature: !!context.signature,
    });

    if (!context.signature) {
      return {
        success: false,
        error: 'No signature available for broadcast',
        retryable: false,
      };
    }

    // Generate a mock transaction hash
    const mockTxHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;

    // TODO: Implement actual broadcast:
    // - Get RPC endpoint for chain
    // - Submit signed transaction
    // - Handle chain-specific broadcast logic
    // - Handle nonce management
    // - Handle gas estimation/replacement transactions

    return {
      success: true,
      txHash: mockTxHash,
    };
  }
}

/**
 * Broadcast service that always fails with a retryable error.
 * Useful for testing retry logic.
 */
export class RetryableFailureBroadcastService implements BroadcastService {
  constructor(
    private logger: Logger,
    private errorMessage: string = 'Network timeout'
  ) {}

  async broadcast(context: WorkflowContext): Promise<BroadcastResult> {
    this.logger.warn('Broadcast failed (retryable)', {
      vaultId: context.vaultId,
      chainAlias: context.chainAlias,
      attempt: context.broadcastAttempts + 1,
    });

    return {
      success: false,
      error: this.errorMessage,
      retryable: true,
    };
  }
}

/**
 * Broadcast service that always fails with a permanent error.
 * Useful for testing terminal failure states.
 */
export class PermanentFailureBroadcastService implements BroadcastService {
  constructor(
    private logger: Logger,
    private errorMessage: string = 'Transaction rejected: insufficient funds'
  ) {}

  async broadcast(context: WorkflowContext): Promise<BroadcastResult> {
    this.logger.error('Broadcast failed (permanent)', {
      vaultId: context.vaultId,
      chainAlias: context.chainAlias,
      error: this.errorMessage,
    });

    return {
      success: false,
      error: this.errorMessage,
      retryable: false,
    };
  }
}

/**
 * Broadcast service that succeeds after a configurable number of retries.
 * Useful for testing retry-then-success scenarios.
 */
export class EventualSuccessBroadcastService implements BroadcastService {
  private attemptCount = 0;

  constructor(
    private logger: Logger,
    private successAfterAttempts: number = 2
  ) {}

  async broadcast(context: WorkflowContext): Promise<BroadcastResult> {
    this.attemptCount++;

    if (this.attemptCount < this.successAfterAttempts) {
      this.logger.warn('Broadcast attempt failed, will retry', {
        vaultId: context.vaultId,
        attempt: this.attemptCount,
        willSucceedAt: this.successAfterAttempts,
      });

      return {
        success: false,
        error: 'Temporary network issue',
        retryable: true,
      };
    }

    const mockTxHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;

    this.logger.info('Broadcast succeeded after retries', {
      vaultId: context.vaultId,
      attempts: this.attemptCount,
      txHash: mockTxHash,
    });

    return {
      success: true,
      txHash: mockTxHash,
    };
  }

  reset(): void {
    this.attemptCount = 0;
  }
}
