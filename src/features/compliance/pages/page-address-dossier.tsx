import { Link, useParams } from '@tanstack/react-router';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
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
import { mockAddressDossier } from '../data/mock-address-dossier';

export const PageComplianceAddressDossier = () => {
  const params = useParams({ strict: false });
  const address = params.address ?? '';
  const [note, setNote] = useState('');

  // In real implementation, fetch address dossier by address
  const dossier = mockAddressDossier;

  const handleAddNote = () => {
    if (note.trim()) {
      console.log('Adding note:', note);
      setNote('');
    }
  };

  const handleNoteChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setNote(e.target.value);
  };

  const handleToggleWatchlist = () => {
    console.log('Toggle watchlist for:', address);
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
              Addresses
            </Link>
            <span className="text-neutral-400">/</span>
            <span className="max-w-[200px] truncate">{address}</span>
          </div>
        </PageLayoutTopBarTitle>
      </PageLayoutTopBar>
      <PageLayoutContent>
        <div className="space-y-6">
          {/* Address Summary */}
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900">
                  Address Dossier
                </h2>
                <p className="mt-1 font-mono text-sm text-neutral-500">
                  {dossier.address}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <RiskBadge level={dossier.riskLevel} />
                <Button
                  variant={dossier.isWatchlisted ? 'default' : 'secondary'}
                  size="sm"
                  onClick={handleToggleWatchlist}
                  className={
                    dossier.isWatchlisted
                      ? 'bg-warning-500 hover:bg-warning-600'
                      : ''
                  }
                >
                  {dossier.isWatchlisted ? (
                    <>
                      <EyeIcon className="mr-1 h-4 w-4" />
                      Watching
                    </>
                  ) : (
                    <>
                      <EyeOffIcon className="mr-1 h-4 w-4" />
                      Add to Watchlist
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-5">
              <div>
                <div className="text-xs font-medium text-neutral-500">
                  Chain
                </div>
                <div className="mt-1 text-sm text-neutral-900">
                  {CHAIN_LABELS[dossier.chain as Chain]}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-neutral-500">
                  Label
                </div>
                <div className="mt-1 text-sm text-neutral-900">
                  {dossier.label || 'Unlabeled'}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-neutral-500">
                  Total Transactions
                </div>
                <div className="mt-1 text-sm text-neutral-900">
                  {dossier.transactionCount}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-neutral-500">
                  Total Volume
                </div>
                <div className="mt-1 text-sm text-neutral-900">
                  {dossier.totalVolume} {dossier.token}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-neutral-500">
                  Last Activity
                </div>
                <div className="mt-1 text-sm text-neutral-900">
                  {dossier.lastActivity.toLocaleDateString()}
                </div>
              </div>
            </div>

            {dossier.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1">
                {dossier.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Provider Assessments */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">
              Risk Assessments
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              {dossier.assessments.map((assessment) => (
                <ProviderAssessmentCard
                  key={assessment.provider}
                  assessment={assessment}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Transactions */}
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <h4 className="font-semibold text-neutral-900">
                Recent Transactions
              </h4>
              <div className="mt-4 space-y-3">
                {dossier.recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between border-b border-neutral-100 pb-3 last:border-0"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-neutral-900">
                          {TRANSACTION_TYPE_LABELS[tx.type]}
                        </span>
                        <StatusBadge status={tx.status} />
                      </div>
                      <div className="mt-1 text-sm text-neutral-600">
                        {tx.amount} {tx.token}
                      </div>
                      <div className="mt-1 font-mono text-xs text-neutral-400">
                        {tx.hash}
                      </div>
                    </div>
                    <Link
                      to="/"
                      className="text-sm text-brand-600 hover:text-brand-700"
                    >
                      View
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Related Addresses */}
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <h4 className="font-semibold text-neutral-900">
                Related Addresses
              </h4>
              <div className="mt-4 space-y-3">
                {dossier.relatedAddresses.map((related) => (
                  <div
                    key={related.address}
                    className="flex items-center justify-between border-b border-neutral-100 pb-3 last:border-0"
                  >
                    <div>
                      <div className="font-mono text-sm text-neutral-900">
                        {related.address.slice(0, 20)}...
                      </div>
                      <div className="mt-1 text-xs text-neutral-500">
                        {related.relationship} • {related.transactionCount}{' '}
                        transactions
                      </div>
                    </div>
                    <Link
                      to="/"
                      className="text-sm text-brand-600 hover:text-brand-700"
                    >
                      View
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Add Note */}
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <h4 className="font-semibold text-neutral-900">Add Note</h4>
              <div className="mt-3">
                <textarea
                  placeholder="Enter your notes about this address..."
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
            {dossier.notes.length > 0 && (
              <div className="rounded-lg border border-neutral-200 bg-white p-4">
                <h4 className="font-semibold text-neutral-900">
                  Notes History
                </h4>
                <div className="mt-3 space-y-3">
                  {dossier.notes.map((n) => (
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
      </PageLayoutContent>
    </PageLayout>
  );
};
