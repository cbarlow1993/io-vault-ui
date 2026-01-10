import { Link, useParams } from '@tanstack/react-router';
import { useState, type ChangeEvent } from 'react';

import { Button } from '@/components/ui/button';
import {
  CHAIN_LABELS,
  STATUS_LABELS,
  TRANSACTION_TYPE_LABELS,
} from '@/features/compliance';
import { type Chain } from '@/features/compliance/constants';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/treasury-6';

import { ProviderAssessmentCard } from '../components/provider-assessment-card';
import { RiskBadge } from '../components/risk-badge';
import { StatusBadge } from '../components/status-badge';
import { TransactionTimeline } from '../components/transaction-timeline';
import { mockTransactionDetail } from '../data/mock-transaction-detail';

export const PageComplianceTransactionDetail = () => {
  const params = useParams({ strict: false });
  const id = params.id ?? '';
  const [note, setNote] = useState('');

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

  return (
    <PageLayout>
      <PageLayoutTopBar>
        <PageLayoutTopBarTitle>
          <div className="flex items-center gap-2">
            <Link to="/" className="text-neutral-500 hover:text-neutral-700">
              Compliance
            </Link>
            <span className="text-neutral-400">/</span>
            <Link to="/" className="text-neutral-500 hover:text-neutral-700">
              Transactions
            </Link>
            <span className="text-neutral-400">/</span>
            <span>Transaction {id}</span>
          </div>
        </PageLayoutTopBarTitle>
      </PageLayoutTopBar>
      <PageLayoutContent>
        <div className="space-y-6">
          {/* Transaction Summary */}
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900">
                  Transaction Details
                </h2>
                <p className="mt-1 font-mono text-sm text-neutral-500">
                  {transaction.hash}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={transaction.status} />
                <RiskBadge level={transaction.riskLevel} />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-4">
              <div>
                <div className="text-xs font-medium text-neutral-500">Type</div>
                <div className="mt-1 text-sm text-neutral-900">
                  {TRANSACTION_TYPE_LABELS[transaction.type]}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-neutral-500">
                  Amount
                </div>
                <div className="mt-1 text-sm text-neutral-900">
                  {transaction.amount} {transaction.token}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-neutral-500">
                  Chain
                </div>
                <div className="mt-1 text-sm text-neutral-900">
                  {CHAIN_LABELS[transaction.chain as Chain]}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-neutral-500">
                  Status
                </div>
                <div className="mt-1 text-sm text-neutral-900">
                  {STATUS_LABELS[transaction.status]}
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div>
                <div className="text-xs font-medium text-neutral-500">
                  From Address
                </div>
                <div className="mt-1 font-mono text-sm text-neutral-900">
                  {transaction.fromAddress}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-neutral-500">
                  To Address
                </div>
                <div className="mt-1 font-mono text-sm text-neutral-900">
                  {transaction.toAddress}
                </div>
              </div>
            </div>
          </div>

          {/* Provider Assessments */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">
              Provider Assessments
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              {transaction.assessments.map((assessment) => (
                <ProviderAssessmentCard
                  key={assessment.provider}
                  assessment={assessment}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Timeline */}
            <TransactionTimeline events={transaction.timeline} />

            {/* Actions & Notes */}
            <div className="space-y-4">
              {/* Actions */}
              <div className="rounded-lg border border-neutral-200 bg-white p-4">
                <h4 className="font-semibold text-neutral-900">Actions</h4>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="default"
                    className="bg-positive-600 hover:bg-positive-700"
                  >
                    Approve
                  </Button>
                  <Button
                    variant="default"
                    className="bg-negative-600 hover:bg-negative-700"
                  >
                    Reject
                  </Button>
                  <Button variant="secondary">Escalate to L2</Button>
                  <Button variant="ghost">Request More Info</Button>
                </div>
              </div>

              {/* Add Note */}
              <div className="rounded-lg border border-neutral-200 bg-white p-4">
                <h4 className="font-semibold text-neutral-900">Add Note</h4>
                <div className="mt-3">
                  <textarea
                    placeholder="Enter your notes about this transaction..."
                    value={note}
                    onChange={handleNoteChange}
                    rows={3}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
                  />
                  <Button
                    onClick={handleAddNote}
                    size="sm"
                    className="mt-2"
                    disabled={!note.trim()}
                  >
                    Add Note
                  </Button>
                </div>
              </div>

              {/* Previous Notes */}
              {transaction.notes.length > 0 && (
                <div className="rounded-lg border border-neutral-200 bg-white p-4">
                  <h4 className="font-semibold text-neutral-900">Notes</h4>
                  <div className="mt-3 space-y-3">
                    {transaction.notes.map((n) => (
                      <div
                        key={n.id}
                        className="border-l-2 border-neutral-200 pl-3"
                      >
                        <div className="text-sm text-neutral-900">
                          {n.content}
                        </div>
                        <div className="mt-1 text-xs text-neutral-500">
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
    </PageLayout>
  );
};
