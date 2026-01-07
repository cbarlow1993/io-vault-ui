export interface Originator {
  id: string;
  type: 'User' | 'System' | 'Webhook';
}

export interface WorkflowContext {
  // Transaction data
  vaultId: string;
  chainAlias: string;
  marshalledHex: string;
  organisationId: string;
  createdBy: Originator;

  // Runtime data
  skipReview: boolean;
  approvers: string[];
  approvedBy: string | null;
  signature: string | null;
  txHash: string | null;
  blockNumber: number | null;

  // Retry tracking
  broadcastAttempts: number;
  maxBroadcastAttempts: number;

  // Error tracking
  error: string | null;
  failedAt: string | null;
}

export type WorkflowState =
  | 'created'
  | 'review'
  | 'evaluating_policies'
  | 'waiting_approval'
  | 'approved'
  | 'waiting_signature'
  | 'broadcasting'
  | 'indexing'
  | 'completed'
  | 'failed';

export type WorkflowEvent =
  | { type: 'START'; skipReview?: boolean }
  | { type: 'CONFIRM' }
  | { type: 'CANCEL'; reason?: string }
  | { type: 'POLICIES_PASSED' }
  | { type: 'POLICIES_REQUIRE_APPROVAL'; approvers: string[] }
  | { type: 'POLICIES_REJECTED'; reason: string }
  | { type: 'APPROVE'; approvedBy: string }
  | { type: 'REJECT'; rejectedBy: string; reason: string }
  | { type: 'REQUEST_SIGNATURE' }
  | { type: 'SIGNATURE_RECEIVED'; signature: string }
  | { type: 'SIGNATURE_FAILED'; reason: string }
  | { type: 'BROADCAST_SUCCESS'; txHash: string }
  | { type: 'BROADCAST_RETRY'; error: string; attempt: number }
  | { type: 'BROADCAST_FAILED'; error: string }
  | { type: 'INDEXING_COMPLETE'; blockNumber: number }
  | { type: 'INDEXING_FAILED'; error: string };

export interface CreateWorkflowInput {
  vaultId: string;
  chainAlias: string;
  marshalledHex: string;
  organisationId: string;
  createdBy: Originator;
  skipReview?: boolean;
}

export interface Workflow {
  id: string;
  state: WorkflowState;
  context: WorkflowContext;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowEventRecord {
  id: string;
  workflowId: string;
  eventType: string;
  eventPayload: Record<string, unknown>;
  fromState: string;
  toState: string;
  triggeredBy: string | null;
  createdAt: Date;
}
