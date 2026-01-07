import { setup, assign } from 'xstate';
import type { WorkflowContext, WorkflowEvent } from './types';

export const transactionMachine = setup({
  types: {
    context: {} as WorkflowContext,
    events: {} as WorkflowEvent,
    input: {} as Partial<WorkflowContext>,
  },

  guards: {
    shouldSkipReview: ({ context }) => context.skipReview,
    canRetryBroadcast: ({ context }) =>
      context.broadcastAttempts < context.maxBroadcastAttempts,
  },

  actions: {
    setApprovers: assign({
      approvers: (_, params: { approvers: string[] }) => params.approvers,
    }),
    recordApproval: assign({
      approvedBy: (_, params: { approvedBy: string }) => params.approvedBy,
    }),
    recordSignature: assign({
      signature: (_, params: { signature: string }) => params.signature,
    }),
    recordTxHash: assign({
      txHash: (_, params: { txHash: string }) => params.txHash,
    }),
    recordBlockNumber: assign({
      blockNumber: (_, params: { blockNumber: number }) => params.blockNumber,
    }),
    incrementBroadcastAttempts: assign({
      broadcastAttempts: ({ context }) => context.broadcastAttempts + 1,
    }),
    recordFailure: assign(
      (_, params: { error: string; state: string }) => ({
        error: params.error,
        failedAt: params.state,
      })
    ),
  },
}).createMachine({
  id: 'transactionWorkflow',
  initial: 'created',
  context: ({ input }) => ({
    vaultId: input.vaultId ?? '',
    chainAlias: input.chainAlias ?? '',
    marshalledHex: input.marshalledHex ?? '',
    organisationId: input.organisationId ?? '',
    createdBy: input.createdBy ?? { id: '', type: 'User' },
    skipReview: input.skipReview ?? false,
    approvers: [],
    approvedBy: null,
    signature: null,
    txHash: null,
    blockNumber: null,
    broadcastAttempts: 0,
    maxBroadcastAttempts: 3,
    error: null,
    failedAt: null,
  }),

  states: {
    created: {
      on: {
        START: [
          { target: 'evaluating_policies', guard: 'shouldSkipReview' },
          { target: 'review' },
        ],
      },
    },

    review: {
      on: {
        CONFIRM: { target: 'evaluating_policies' },
        CANCEL: {
          target: 'failed',
          actions: {
            type: 'recordFailure',
            params: ({ event }) => ({
              error: event.reason ?? 'Cancelled by user',
              state: 'review',
            }),
          },
        },
      },
    },

    evaluating_policies: {
      on: {
        POLICIES_PASSED: { target: 'approved' },
        POLICIES_REQUIRE_APPROVAL: {
          target: 'waiting_approval',
          actions: {
            type: 'setApprovers',
            params: ({ event }) => ({ approvers: event.approvers }),
          },
        },
        POLICIES_REJECTED: {
          target: 'failed',
          actions: {
            type: 'recordFailure',
            params: ({ event }) => ({
              error: event.reason,
              state: 'evaluating_policies',
            }),
          },
        },
      },
    },

    waiting_approval: {
      on: {
        APPROVE: {
          target: 'approved',
          actions: {
            type: 'recordApproval',
            params: ({ event }) => ({ approvedBy: event.approvedBy }),
          },
        },
        REJECT: {
          target: 'failed',
          actions: {
            type: 'recordFailure',
            params: ({ event }) => ({
              error: event.reason,
              state: 'waiting_approval',
            }),
          },
        },
      },
    },

    approved: {
      on: {
        REQUEST_SIGNATURE: { target: 'waiting_signature' },
      },
    },

    waiting_signature: {
      on: {
        SIGNATURE_RECEIVED: {
          target: 'broadcasting',
          actions: {
            type: 'recordSignature',
            params: ({ event }) => ({ signature: event.signature }),
          },
        },
        SIGNATURE_FAILED: {
          target: 'failed',
          actions: {
            type: 'recordFailure',
            params: ({ event }) => ({
              error: event.reason,
              state: 'waiting_signature',
            }),
          },
        },
      },
    },

    broadcasting: {
      on: {
        BROADCAST_SUCCESS: {
          target: 'indexing',
          actions: {
            type: 'recordTxHash',
            params: ({ event }) => ({ txHash: event.txHash }),
          },
        },
        BROADCAST_RETRY: [
          {
            target: 'broadcasting',
            guard: 'canRetryBroadcast',
            actions: 'incrementBroadcastAttempts',
          },
          {
            target: 'failed',
            actions: {
              type: 'recordFailure',
              params: ({ event }) => ({
                error: event.error,
                state: 'broadcasting',
              }),
            },
          },
        ],
        BROADCAST_FAILED: {
          target: 'failed',
          actions: {
            type: 'recordFailure',
            params: ({ event }) => ({
              error: event.error,
              state: 'broadcasting',
            }),
          },
        },
      },
    },

    indexing: {
      on: {
        INDEXING_COMPLETE: {
          target: 'completed',
          actions: {
            type: 'recordBlockNumber',
            params: ({ event }) => ({ blockNumber: event.blockNumber }),
          },
        },
        INDEXING_FAILED: {
          target: 'failed',
          actions: {
            type: 'recordFailure',
            params: ({ event }) => ({
              error: event.error,
              state: 'indexing',
            }),
          },
        },
      },
    },

    completed: { type: 'final' },
    failed: { type: 'final' },
  },
});
