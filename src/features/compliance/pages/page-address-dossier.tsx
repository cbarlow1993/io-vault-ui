import { Link, useParams } from '@tanstack/react-router';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { type ChangeEvent, useState } from 'react';

import { CHAIN_LABELS, TRANSACTION_TYPE_LABELS } from '@/features/compliance';
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
      <PageLayoutTopBar
        endActions={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleWatchlist}
              className={
                dossier.isWatchlisted
                  ? 'flex h-7 items-center gap-1.5 bg-warning-500 px-2 text-xs font-medium text-white hover:bg-warning-600'
                  : 'flex h-7 items-center gap-1.5 border border-neutral-200 bg-neutral-50 px-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100'
              }
            >
              {dossier.isWatchlisted ? (
                <>
                  <EyeIcon className="size-3.5" />
                  Watching
                </>
              ) : (
                <>
                  <EyeOffIcon className="size-3.5" />
                  Add to Watchlist
                </>
              )}
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
              to="/compliance/addresses"
              className="text-neutral-500 hover:text-neutral-700"
            >
              Addresses
            </Link>
            <span className="text-neutral-400">/</span>
            <span className="max-w-[180px] truncate font-mono text-xs">
              {address}
            </span>
          </div>
        </PageLayoutTopBarTitle>
      </PageLayoutTopBar>
      <PageLayoutContent containerClassName="py-4">
        <div className="space-y-4">
          {/* Address Summary */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
              <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                Address Dossier
              </h2>
              <RiskBadge level={dossier.riskLevel} />
            </div>

            <div className="p-3">
              <p className="font-mono text-xs text-neutral-500">
                {dossier.address}
              </p>

              <div className="mt-4 grid grid-cols-5 gap-px bg-neutral-200">
                <div className="bg-white p-2">
                  <div className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                    Chain
                  </div>
                  <div className="mt-0.5 text-xs text-neutral-900">
                    {CHAIN_LABELS[dossier.chain as Chain]}
                  </div>
                </div>
                <div className="bg-white p-2">
                  <div className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                    Label
                  </div>
                  <div className="mt-0.5 text-xs text-neutral-900">
                    {dossier.label || 'Unlabeled'}
                  </div>
                </div>
                <div className="bg-white p-2">
                  <div className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                    Total Transactions
                  </div>
                  <div className="mt-0.5 text-xs text-neutral-900 tabular-nums">
                    {dossier.transactionCount}
                  </div>
                </div>
                <div className="bg-white p-2">
                  <div className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                    Total Volume
                  </div>
                  <div className="mt-0.5 text-xs text-neutral-900 tabular-nums">
                    {dossier.totalVolume} {dossier.token}
                  </div>
                </div>
                <div className="bg-white p-2">
                  <div className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                    Last Activity
                  </div>
                  <div className="mt-0.5 text-xs text-neutral-900 tabular-nums">
                    {dossier.lastActivity.toLocaleDateString()}
                  </div>
                </div>
              </div>

              {dossier.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {dossier.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Provider Assessments */}
          <div className="border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-3 py-2">
              <h3 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                Risk Assessments
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-px bg-neutral-200">
              {dossier.assessments.map((assessment) => (
                <ProviderAssessmentCard
                  key={assessment.provider}
                  assessment={assessment}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Recent Transactions */}
            <div className="border border-neutral-200 bg-white">
              <div className="border-b border-neutral-200 px-3 py-2">
                <h4 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                  Recent Transactions
                </h4>
              </div>
              <div className="divide-y divide-neutral-100">
                {dossier.recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-neutral-900">
                          {TRANSACTION_TYPE_LABELS[tx.type]}
                        </span>
                        <StatusBadge status={tx.status} />
                      </div>
                      <div className="mt-0.5 text-xs text-neutral-600 tabular-nums">
                        {tx.amount} {tx.token}
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-neutral-400">
                        {tx.hash}
                      </div>
                    </div>
                    <Link
                      to="/compliance/transactions/$id"
                      params={{ id: tx.id }}
                      className="text-xs text-brand-600 hover:text-brand-700"
                    >
                      View
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Related Addresses */}
            <div className="border border-neutral-200 bg-white">
              <div className="border-b border-neutral-200 px-3 py-2">
                <h4 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                  Related Addresses
                </h4>
              </div>
              <div className="divide-y divide-neutral-100">
                {dossier.relatedAddresses.map((related) => (
                  <div
                    key={related.address}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <div>
                      <div className="font-mono text-xs text-neutral-900">
                        {related.address.slice(0, 20)}...
                      </div>
                      <div className="mt-0.5 text-[10px] text-neutral-500">
                        {related.relationship} • {related.transactionCount}{' '}
                        transactions
                      </div>
                    </div>
                    <Link
                      to="/compliance/addresses/$address"
                      params={{ address: related.address }}
                      className="text-xs text-brand-600 hover:text-brand-700"
                    >
                      View
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="grid grid-cols-2 gap-4">
            {/* Add Note */}
            <div className="border border-neutral-200 bg-white">
              <div className="border-b border-neutral-200 px-3 py-2">
                <h4 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                  Add Note
                </h4>
              </div>
              <div className="p-3">
                <textarea
                  placeholder="Enter your notes about this address..."
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
            {dossier.notes.length > 0 && (
              <div className="border border-neutral-200 bg-white">
                <div className="border-b border-neutral-200 px-3 py-2">
                  <h4 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                    Notes History
                  </h4>
                </div>
                <div className="divide-y divide-neutral-100">
                  {dossier.notes.map((n) => (
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
      </PageLayoutContent>
    </PageLayout>
  );
};
