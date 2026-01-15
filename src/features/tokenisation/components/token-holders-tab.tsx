import {
  ClipboardCopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  SearchIcon,
} from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/tailwind/utils';

import { MOCK_HOLDERS } from '../data/mock-data';
import type { AddressStatus } from '../schema';

type Props = {
  tokenId: string;
};

const getStatusStyles = (status: AddressStatus) => {
  switch (status) {
    case 'whitelisted':
      return 'bg-positive-100 text-positive-700';
    case 'blocked':
      return 'bg-negative-100 text-negative-700';
    case 'pending':
      return 'bg-warning-100 text-warning-700';
  }
};

const truncateAddress = (address: string): string => {
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
};

export function TokenHoldersTab({ tokenId: _tokenId }: Props) {
  const [search, setSearch] = useState('');

  // Filter holders (in real app, use _tokenId to fetch)
  const filteredHolders = MOCK_HOLDERS.filter((holder) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      holder.address.toLowerCase().includes(searchLower) ||
      holder.label?.toLowerCase().includes(searchLower)
    );
  });

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <SearchIcon className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search holders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 w-64 border border-neutral-200 bg-neutral-50 pr-2 pl-7 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-terminal-400 focus:outline-none"
          />
        </div>
        <button
          type="button"
          className="flex h-7 items-center gap-1.5 border border-neutral-200 bg-white px-3 text-xs text-neutral-600 hover:bg-neutral-50"
        >
          <DownloadIcon className="size-3.5" />
          Export CSV
        </button>
      </div>

      {/* Holders Table */}
      <div className="border border-neutral-200 bg-white">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50 text-left">
              <th className="px-4 py-3 font-medium text-neutral-500">Rank</th>
              <th className="px-4 py-3 font-medium text-neutral-500">
                Address
              </th>
              <th className="px-4 py-3 font-medium text-neutral-500">Label</th>
              <th className="px-4 py-3 text-right font-medium text-neutral-500">
                Balance
              </th>
              <th className="px-4 py-3 text-right font-medium text-neutral-500">
                Share
              </th>
              <th className="px-4 py-3 font-medium text-neutral-500">Status</th>
              <th className="px-4 py-3 font-medium text-neutral-500">
                Last Activity
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredHolders.map((holder, index) => (
              <tr
                key={holder.id}
                className="transition-colors hover:bg-neutral-50"
              >
                <td className="px-4 py-3">
                  <span className="inline-flex size-6 items-center justify-center bg-neutral-100 text-[10px] font-semibold text-neutral-600">
                    {index + 1}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-neutral-900">
                      {truncateAddress(holder.address)}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyAddress(holder.address)}
                      className="text-neutral-400 hover:text-neutral-600"
                    >
                      <ClipboardCopyIcon className="size-3.5" />
                    </button>
                    <a
                      href={`https://etherscan.io/address/${holder.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-400 hover:text-terminal-600"
                    >
                      <ExternalLinkIcon className="size-3.5" />
                    </a>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {holder.label ? (
                    <span className="text-neutral-700">{holder.label}</span>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div>
                    <p className="font-mono font-medium text-neutral-900 tabular-nums">
                      {(
                        BigInt(holder.balance) / BigInt(10 ** 18)
                      ).toLocaleString()}
                    </p>
                    {holder.balanceUsd && (
                      <p className="font-mono text-[10px] text-neutral-400">
                        {holder.balanceUsd}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  {/* Progress bar */}
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1.5 w-16 overflow-hidden bg-neutral-100">
                      <div
                        className="h-full bg-terminal-500"
                        style={{ width: `${holder.percentage}%` }}
                      />
                    </div>
                    <span className="w-12 text-right font-mono text-neutral-600 tabular-nums">
                      {holder.percentage.toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
                      getStatusStyles(holder.status)
                    )}
                  >
                    {holder.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-500">
                  {holder.lastActivity}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredHolders.length === 0 && (
          <div className="py-12 text-center text-sm text-neutral-500">
            No holders found matching your search.
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>
          Showing {filteredHolders.length} of {MOCK_HOLDERS.length} holders
        </span>
        <span>
          Top 5 holders control{' '}
          <span className="font-mono font-medium text-neutral-900">
            {MOCK_HOLDERS.slice(0, 5)
              .reduce((sum, h) => sum + h.percentage, 0)
              .toFixed(1)}
            %
          </span>{' '}
          of total supply
        </span>
      </div>
    </div>
  );
}
