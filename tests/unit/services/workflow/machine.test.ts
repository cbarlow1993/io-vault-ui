import { createActor } from 'xstate';
import { describe, it, expect } from 'vitest';
import { transactionMachine } from '@/services/workflow/machine';
import type { WorkflowContext } from '@/services/workflow/types';

const baseInput: Partial<WorkflowContext> = {
  vaultId: 'vault-123',
  chainAlias: 'ethereum',
  marshalledHex: '0xabc',
  organisationId: 'org-123',
  createdBy: { id: 'user-123', type: 'User' },
};

describe('transactionMachine', () => {
  describe('initial state', () => {
    it('starts in created state', () => {
      const actor = createActor(transactionMachine, {
        input: baseInput,
      });
      actor.start();

      expect(actor.getSnapshot().value).toBe('created');
    });
  });

  describe('review step', () => {
    it('skips review when skipReview is true', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: true },
      });
      actor.start();
      actor.send({ type: 'START' });

      expect(actor.getSnapshot().value).toBe('evaluating_policies');
    });

    it('enters review when skipReview is false', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: false },
      });
      actor.start();
      actor.send({ type: 'START' });

      expect(actor.getSnapshot().value).toBe('review');
    });

    it('transitions to evaluating_policies on CONFIRM', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: false },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({ type: 'CONFIRM' });

      expect(actor.getSnapshot().value).toBe('evaluating_policies');
    });

    it('transitions to failed on CANCEL', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: false },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({ type: 'CANCEL', reason: 'User cancelled' });

      expect(actor.getSnapshot().value).toBe('failed');
      expect(actor.getSnapshot().context.error).toBe('User cancelled');
      expect(actor.getSnapshot().context.failedAt).toBe('review');
    });
  });

  describe('policy evaluation', () => {
    it('transitions to approved on POLICIES_PASSED', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: true },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({ type: 'POLICIES_PASSED' });

      expect(actor.getSnapshot().value).toBe('approved');
    });

    it('transitions to waiting_approval on POLICIES_REQUIRE_APPROVAL', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: true },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({
        type: 'POLICIES_REQUIRE_APPROVAL',
        approvers: ['approver-1', 'approver-2'],
      });

      expect(actor.getSnapshot().value).toBe('waiting_approval');
      expect(actor.getSnapshot().context.approvers).toEqual([
        'approver-1',
        'approver-2',
      ]);
    });

    it('transitions to failed on POLICIES_REJECTED', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: true },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({ type: 'POLICIES_REJECTED', reason: 'Amount too high' });

      expect(actor.getSnapshot().value).toBe('failed');
      expect(actor.getSnapshot().context.error).toBe('Amount too high');
    });
  });

  describe('approval flow', () => {
    it('transitions to approved on APPROVE', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: true },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({ type: 'POLICIES_REQUIRE_APPROVAL', approvers: ['approver-1'] });
      actor.send({ type: 'APPROVE', approvedBy: 'approver-1' });

      expect(actor.getSnapshot().value).toBe('approved');
      expect(actor.getSnapshot().context.approvedBy).toBe('approver-1');
    });

    it('transitions to failed on REJECT', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: true },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({ type: 'POLICIES_REQUIRE_APPROVAL', approvers: ['approver-1'] });
      actor.send({ type: 'REJECT', rejectedBy: 'approver-1', reason: 'Not authorized' });

      expect(actor.getSnapshot().value).toBe('failed');
      expect(actor.getSnapshot().context.error).toBe('Not authorized');
    });
  });

  describe('signature flow', () => {
    it('transitions to waiting_signature on REQUEST_SIGNATURE', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: true },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({ type: 'POLICIES_PASSED' });
      actor.send({ type: 'REQUEST_SIGNATURE' });

      expect(actor.getSnapshot().value).toBe('waiting_signature');
    });

    it('transitions to broadcasting on SIGNATURE_RECEIVED', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: true },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({ type: 'POLICIES_PASSED' });
      actor.send({ type: 'REQUEST_SIGNATURE' });
      actor.send({ type: 'SIGNATURE_RECEIVED', signature: '0xsig123' });

      expect(actor.getSnapshot().value).toBe('broadcasting');
      expect(actor.getSnapshot().context.signature).toBe('0xsig123');
    });

    it('transitions to failed on SIGNATURE_FAILED', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: true },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({ type: 'POLICIES_PASSED' });
      actor.send({ type: 'REQUEST_SIGNATURE' });
      actor.send({ type: 'SIGNATURE_FAILED', reason: 'Timeout' });

      expect(actor.getSnapshot().value).toBe('failed');
      expect(actor.getSnapshot().context.error).toBe('Timeout');
    });
  });

  describe('broadcast flow', () => {
    it('transitions to indexing on BROADCAST_SUCCESS', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: true },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({ type: 'POLICIES_PASSED' });
      actor.send({ type: 'REQUEST_SIGNATURE' });
      actor.send({ type: 'SIGNATURE_RECEIVED', signature: '0xsig' });
      actor.send({ type: 'BROADCAST_SUCCESS', txHash: '0xhash123' });

      expect(actor.getSnapshot().value).toBe('indexing');
      expect(actor.getSnapshot().context.txHash).toBe('0xhash123');
    });

    it('retries broadcast on transient failure within limit', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: true },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({ type: 'POLICIES_PASSED' });
      actor.send({ type: 'REQUEST_SIGNATURE' });
      actor.send({ type: 'SIGNATURE_RECEIVED', signature: '0xsig' });
      actor.send({ type: 'BROADCAST_RETRY', error: 'timeout', attempt: 1 });

      expect(actor.getSnapshot().value).toBe('broadcasting');
      expect(actor.getSnapshot().context.broadcastAttempts).toBe(1);
    });

    it('fails after max broadcast attempts', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: true },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({ type: 'POLICIES_PASSED' });
      actor.send({ type: 'REQUEST_SIGNATURE' });
      actor.send({ type: 'SIGNATURE_RECEIVED', signature: '0xsig' });

      // Exhaust retries
      actor.send({ type: 'BROADCAST_RETRY', error: 'timeout', attempt: 1 });
      actor.send({ type: 'BROADCAST_RETRY', error: 'timeout', attempt: 2 });
      actor.send({ type: 'BROADCAST_RETRY', error: 'timeout', attempt: 3 });
      actor.send({ type: 'BROADCAST_RETRY', error: 'timeout', attempt: 4 });

      expect(actor.getSnapshot().value).toBe('failed');
      expect(actor.getSnapshot().context.error).toBe('timeout');
    });

    it('fails immediately on BROADCAST_FAILED', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: true },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({ type: 'POLICIES_PASSED' });
      actor.send({ type: 'REQUEST_SIGNATURE' });
      actor.send({ type: 'SIGNATURE_RECEIVED', signature: '0xsig' });
      actor.send({ type: 'BROADCAST_FAILED', error: 'insufficient funds' });

      expect(actor.getSnapshot().value).toBe('failed');
      expect(actor.getSnapshot().context.error).toBe('insufficient funds');
    });
  });

  describe('indexing flow', () => {
    it('transitions to completed on INDEXING_COMPLETE', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: true },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({ type: 'POLICIES_PASSED' });
      actor.send({ type: 'REQUEST_SIGNATURE' });
      actor.send({ type: 'SIGNATURE_RECEIVED', signature: '0xsig' });
      actor.send({ type: 'BROADCAST_SUCCESS', txHash: '0xhash' });
      actor.send({ type: 'INDEXING_COMPLETE', blockNumber: 12345678 });

      expect(actor.getSnapshot().value).toBe('completed');
      expect(actor.getSnapshot().context.blockNumber).toBe(12345678);
    });

    it('transitions to failed on INDEXING_FAILED', () => {
      const actor = createActor(transactionMachine, {
        input: { ...baseInput, skipReview: true },
      });
      actor.start();
      actor.send({ type: 'START' });
      actor.send({ type: 'POLICIES_PASSED' });
      actor.send({ type: 'REQUEST_SIGNATURE' });
      actor.send({ type: 'SIGNATURE_RECEIVED', signature: '0xsig' });
      actor.send({ type: 'BROADCAST_SUCCESS', txHash: '0xhash' });
      actor.send({ type: 'INDEXING_FAILED', error: 'Indexer unavailable' });

      expect(actor.getSnapshot().value).toBe('failed');
      expect(actor.getSnapshot().context.error).toBe('Indexer unavailable');
    });
  });
});
