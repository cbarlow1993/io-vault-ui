import { Link } from '@tanstack/react-router';
import { EyeIcon } from 'lucide-react';

import { CHAIN_LABELS } from '@/features/compliance';

import { RiskBadge } from './risk-badge';
import type { WatchedAddress } from '../data/mock-addresses';

interface AddressesTableProps {
  addresses: WatchedAddress[];
}

export const AddressesTable = ({ addresses }: AddressesTableProps) => {
  return (
    <div className="border-card">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-neutral-100 bg-neutral-50 text-left">
            <th className="px-3 py-2 font-medium text-neutral-500">Address</th>
            <th className="px-3 py-2 font-medium text-neutral-500">Label</th>
            <th className="px-3 py-2 font-medium text-neutral-500">Chain</th>
            <th className="px-3 py-2 font-medium text-neutral-500">Risk</th>
            <th className="px-3 py-2 font-medium text-neutral-500">
              Transactions
            </th>
            <th className="px-3 py-2 font-medium text-neutral-500">Volume</th>
            <th className="px-3 py-2 font-medium text-neutral-500">
              Last Activity
            </th>
            <th className="px-3 py-2 font-medium text-neutral-500">Tags</th>
            <th className="px-3 py-2 font-medium text-neutral-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {addresses.map((address) => (
            <tr key={address.address} className="interactive-row">
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  {address.isWatchlisted && (
                    <EyeIcon className="size-3.5 text-warning-500" />
                  )}
                  <span className="font-mono text-neutral-900">
                    {address.address}
                  </span>
                </div>
              </td>
              <td className="px-3 py-2 text-neutral-600">
                {address.label || '-'}
              </td>
              <td className="px-3 py-2 text-neutral-600">
                {CHAIN_LABELS[address.chain]}
              </td>
              <td className="px-3 py-2">
                <RiskBadge level={address.riskLevel} />
              </td>
              <td className="px-3 py-2 text-neutral-600 tabular-nums">
                {address.transactionCount}
              </td>
              <td className="px-3 py-2 text-neutral-600 tabular-nums">
                {address.totalVolume} {address.token}
              </td>
              <td className="px-3 py-2 text-neutral-500 tabular-nums">
                {address.lastActivity.toLocaleDateString()}
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  {address.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-3 py-2">
                <Link
                  to="/compliance/addresses/$address"
                  params={{ address: address.address }}
                  className="text-brand-600 hover:text-brand-700"
                >
                  View Dossier
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
