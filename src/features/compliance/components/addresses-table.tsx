import { Link } from '@tanstack/react-router';
import { EyeIcon } from 'lucide-react';

import { CHAIN_LABELS } from '@/features/compliance';

import type { WatchedAddress } from '../data/mock-addresses';

import { RiskBadge } from './risk-badge';

interface AddressesTableProps {
  addresses: WatchedAddress[];
}

export const AddressesTable = ({ addresses }: AddressesTableProps) => {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <table className="w-full">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50">
            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">
              Address
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">
              Label
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">
              Chain
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">
              Risk
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">
              Transactions
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">
              Volume
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">
              Last Activity
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">
              Tags
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {addresses.map((address) => (
            <tr
              key={address.address}
              className="border-b border-neutral-100 hover:bg-neutral-50"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {address.isWatchlisted && (
                    <EyeIcon className="h-4 w-4 text-warning-500" />
                  )}
                  <span className="font-mono text-sm text-neutral-900">
                    {address.address}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-neutral-600">
                {address.label || '-'}
              </td>
              <td className="px-4 py-3 text-sm text-neutral-600">
                {CHAIN_LABELS[address.chain]}
              </td>
              <td className="px-4 py-3">
                <RiskBadge level={address.riskLevel} />
              </td>
              <td className="px-4 py-3 text-sm text-neutral-600">
                {address.transactionCount}
              </td>
              <td className="px-4 py-3 text-sm text-neutral-600">
                {address.totalVolume} {address.token}
              </td>
              <td className="px-4 py-3 text-sm text-neutral-500">
                {address.lastActivity.toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {address.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                <Link
                  to="/compliance/addresses/$address"
                  params={{ address: address.address }}
                  className="text-sm text-brand-600 hover:text-brand-700"
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
