import { Link, useParams } from '@tanstack/react-router';
import { AlertTriangleIcon, CheckIcon, XIcon } from 'lucide-react';
import { type ChangeEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  CHAIN_LABELS,
  STATUS_LABELS,
  TRANSACTION_TYPE_LABELS,
} from '@/features/compliance';
import { type Chain } from '@/features/compliance/constants';
import {
  NotificationButton,
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/shell';

import { ProviderAssessmentCard } from '../components/provider-assessment-card';
import { RiskBadge } from '../components/risk-badge';
import { StatusBadge } from '../components/status-badge';
import { TransactionTimeline } from '../components/transaction-timeline';
import { mockTransactionDetail } from '../data/mock-transaction-detail';

export const PageComplianceTransactionDetail = () => {
  const params = useParams({ strict: false });
  const id = params.id ?? '';
  const [note, setNote] = useState('');
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  // In real implementation, fetch transaction by id
  const transaction = mockTransactionDetail;

  const handleAddNote = () => {
    if (note.trim()) {
      // In real implementation, save note via API
      console.log('Adding note:', note);
      setNote('');
    }
  };

  const handleNoteChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setNote(e.target.value);
  };

  const handleApprove = () => {
    // In real implementation, call API to approve transaction
    console.log('Approving transaction:', id);
    setIsApproveModalOpen(false);
  };

  const handleReject = () => {
    // In real implementation, call API to reject transaction
    console.log('Rejecting transaction:', id);
    setIsRejectModalOpen(false);
  };

  return (
    <PageLayout>
      <PageLayoutTopBar
        endActions={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsApproveModalOpen(true)}
              className="flex h-7 items-center gap-1.5 bg-positive-600 px-3 text-xs font-medium text-white hover:bg-positive-700"
            >
              <CheckIcon className="size-3.5" />
              Approve
            </button>
            <button
              type="button"
              onClick={() => setIsRejectModalOpen(true)}
              className="flex h-7 items-center gap-1.5 bg-negative-600 px-3 text-xs font-medium text-white hover:bg-negative-700"
            >
              <XIcon className="size-3.5" />
              Reject
            </button>
            <button
              type="button"
              className="h-7 border border-neutral-200 bg-neutral-50 px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
            >
              Escalate to L2
            </button>
            <button
              type="button"
              className="h-7 px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
            >
              Request Info
            </button>
            <div className="h-4 w-px bg-neutral-200" />
            <NotificationButton />
          </div>
        }
      >
        <PageLayoutTopBarTitle>
          <div className="flex items-center gap-2">
            <Link
              to="/compliance"
              className="text-neutral-500 hover:text-neutral-700"
            >
              Compliance
            </Link>
            <span className="text-neutral-400">/</span>
            <Link
              to="/compliance/transactions"
              className="text-neutral-500 hover:text-neutral-700"
            >
              Transactions
            </Link>
            <span className="text-neutral-400">/</span>
            <span className="font-mono text-xs">{id.slice(0, 8)}...</span>
          </div>
        </PageLayoutTopBarTitle>
      </PageLayoutTopBar>
      <PageLayoutContent containerClassName="py-4">
        <div className="space-y-4">
          {/* Transaction Summary */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
              <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                Transaction Details
              </h2>
              <div className="flex items-center gap-2">
                <StatusBadge status={transaction.status} />
                <RiskBadge level={transaction.riskLevel} />
              </div>
            </div>

            <div className="p-3">
              <p className="font-mono text-xs text-neutral-500">
                {transaction.hash}
              </p>

              <div className="mt-4 grid grid-cols-4 gap-px bg-neutral-200">
                <div className="bg-white p-2">
                  <div className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                    Type
                  </div>
                  <div className="mt-0.5 text-xs text-neutral-900">
                    {TRANSACTION_TYPE_LABELS[transaction.type]}
                  </div>
                </div>
                <div className="bg-white p-2">
                  <div className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                    Amount
                  </div>
                  <div className="mt-0.5 text-xs text-neutral-900 tabular-nums">
                    {transaction.amount} {transaction.token}
                  </div>
                </div>
                <div className="bg-white p-2">
                  <div className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                    Chain
                  </div>
                  <div className="mt-0.5 text-xs text-neutral-900">
                    {CHAIN_LABELS[transaction.chain as Chain]}
                  </div>
                </div>
                <div className="bg-white p-2">
                  <div className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                    Status
                  </div>
                  <div className="mt-0.5 text-xs text-neutral-900">
                    {STATUS_LABELS[transaction.status]}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div>
                  <div className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                    From Address
                  </div>
                  <div className="mt-0.5 font-mono text-xs text-neutral-900">
                    {transaction.fromAddress}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                    To Address
                  </div>
                  <div className="mt-0.5 font-mono text-xs text-neutral-900">
                    {transaction.toAddress}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Provider Assessments */}
          <div className="border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-3 py-2">
              <h3 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                Provider Assessments
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-px bg-neutral-200">
              {transaction.assessments.map((assessment) => (
                <ProviderAssessmentCard
                  key={assessment.provider}
                  assessment={assessment}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Timeline */}
            <TransactionTimeline events={transaction.timeline} />

            {/* Notes */}
            <div className="space-y-4">
              {/* Add Note */}
              <div className="border border-neutral-200 bg-white">
                <div className="border-b border-neutral-200 px-3 py-2">
                  <h4 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                    Add Note
                  </h4>
                </div>
                <div className="p-3">
                  <textarea
                    placeholder="Enter your notes about this transaction..."
                    value={note}
                    onChange={handleNoteChange}
                    rows={3}
                    className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddNote}
                    disabled={!note.trim()}
                    className="mt-2 h-7 bg-brand-500 px-3 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    Add Note
                  </button>
                </div>
              </div>

              {/* Previous Notes */}
              {transaction.notes.length > 0 && (
                <div className="border border-neutral-200 bg-white">
                  <div className="border-b border-neutral-200 px-3 py-2">
                    <h4 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                      Notes
                    </h4>
                  </div>
                  <div className="divide-y divide-neutral-100">
                    {transaction.notes.map((n) => (
                      <div key={n.id} className="px-3 py-2">
                        <div className="text-xs text-neutral-900">
                          {n.content}
                        </div>
                        <div className="mt-1 text-[10px] text-neutral-500 tabular-nums">
                          {n.author} • {n.timestamp.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </PageLayoutContent>

      {/* Approve Confirmation Modal */}
      <Dialog open={isApproveModalOpen} onOpenChange={setIsApproveModalOpen}>
        <DialogContent className="max-w-md rounded-none sm:max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center bg-positive-100">
                <CheckIcon className="size-5 text-positive-600" />
              </div>
              <div>
                <DialogTitle className="text-base text-positive-700">
                  Approve Transaction
                </DialogTitle>
                <DialogDescription className="text-xs">
                  This action will mark the transaction as approved
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-neutral-700">
              Are you sure you want to approve this transaction?
            </p>

            <div className="border border-neutral-200 bg-neutral-50 p-3">
              <h4 className="mb-2 text-xs font-semibold text-neutral-700">
                Transaction Details
              </h4>
              <dl className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Amount</dt>
                  <dd className="text-neutral-900 tabular-nums">
                    {transaction.amount} {transaction.token}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Type</dt>
                  <dd className="text-neutral-900">
                    {TRANSACTION_TYPE_LABELS[transaction.type]}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Risk Level</dt>
                  <dd>
                    <RiskBadge level={transaction.riskLevel} />
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <DialogFooter className="border-t border-neutral-200 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsApproveModalOpen(false)}
              className="h-8 rounded-none border-neutral-200 px-4 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApprove}
              className="h-8 rounded-none bg-positive-600 px-4 text-xs text-white hover:bg-positive-700"
            >
              Approve Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Modal */}
      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent className="max-w-md rounded-none sm:max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center bg-negative-100">
                <AlertTriangleIcon className="size-5 text-negative-600" />
              </div>
              <div>
                <DialogTitle className="text-base text-negative-700">
                  Reject Transaction
                </DialogTitle>
                <DialogDescription className="text-xs">
                  This action will mark the transaction as rejected
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-neutral-700">
              Are you sure you want to reject this transaction?
            </p>

            <div className="border border-neutral-200 bg-neutral-50 p-3">
              <h4 className="mb-2 text-xs font-semibold text-neutral-700">
                Transaction Details
              </h4>
              <dl className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Amount</dt>
                  <dd className="text-neutral-900 tabular-nums">
                    {transaction.amount} {transaction.token}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Type</dt>
                  <dd className="text-neutral-900">
                    {TRANSACTION_TYPE_LABELS[transaction.type]}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Risk Level</dt>
                  <dd>
                    <RiskBadge level={transaction.riskLevel} />
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <DialogFooter className="border-t border-neutral-200 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsRejectModalOpen(false)}
              className="h-8 rounded-none border-neutral-200 px-4 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleReject}
              className="h-8 rounded-none bg-negative-600 px-4 text-xs text-white hover:bg-negative-700"
            >
              Reject Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};
