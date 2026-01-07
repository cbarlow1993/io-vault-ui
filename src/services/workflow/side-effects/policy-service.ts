import type { WorkflowContext } from '@/src/services/workflow/types.js';

export type PolicyResult =
  | { outcome: 'passed' }
  | { outcome: 'requires_approval'; approvers: string[] }
  | { outcome: 'rejected'; reason: string };

export interface PolicyService {
  /**
   * Evaluate policies for a transaction workflow.
   * Returns the policy evaluation result which determines the next workflow state.
   */
  evaluate(context: WorkflowContext): Promise<PolicyResult>;
}

interface Logger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

/**
 * Stub implementation of PolicyService.
 * Currently passes all transactions without requiring approval.
 * Replace with actual policy evaluation logic when ready.
 */
export class StubPolicyService implements PolicyService {
  constructor(private logger: Logger) {}

  async evaluate(context: WorkflowContext): Promise<PolicyResult> {
    this.logger.info('Evaluating policies (stub)', {
      vaultId: context.vaultId,
      chainAlias: context.chainAlias,
      organisationId: context.organisationId,
    });

    // Stub: Always pass policies without requiring approval
    // TODO: Implement actual policy evaluation:
    // - Check transaction amount limits
    // - Check destination address allowlists
    // - Check time-based restrictions
    // - Check multi-sig requirements
    // - Integrate with external policy engine if needed
    return { outcome: 'passed' };
  }
}

/**
 * Policy service that requires approval for all transactions.
 * Useful for testing the approval flow.
 */
export class ApprovalRequiredPolicyService implements PolicyService {
  constructor(
    private logger: Logger,
    private defaultApprovers: string[] = []
  ) {}

  async evaluate(context: WorkflowContext): Promise<PolicyResult> {
    this.logger.info('Evaluating policies (approval required)', {
      vaultId: context.vaultId,
      chainAlias: context.chainAlias,
      approvers: this.defaultApprovers,
    });

    return {
      outcome: 'requires_approval',
      approvers: this.defaultApprovers,
    };
  }
}

/**
 * Policy service that rejects all transactions.
 * Useful for testing the rejection flow.
 */
export class RejectingPolicyService implements PolicyService {
  constructor(
    private logger: Logger,
    private rejectionReason: string = 'Policy rejection'
  ) {}

  async evaluate(context: WorkflowContext): Promise<PolicyResult> {
    this.logger.info('Evaluating policies (rejecting)', {
      vaultId: context.vaultId,
      chainAlias: context.chainAlias,
    });

    return {
      outcome: 'rejected',
      reason: this.rejectionReason,
    };
  }
}
