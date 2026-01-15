import {
  AlertTriangleIcon,
  ClipboardCopyIcon,
  ExternalLinkIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
} from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { AddBlocklistModal } from './add-blocklist-modal';
import { MOCK_BLOCKLIST } from '../data/mock-data';

type Props = {
  tokenId: string;
};

const truncateAddress = (address: string): string => {
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
};

export function TokenBlocklistTab({ tokenId }: Props) {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Filter blocklist
  const filteredEntries = MOCK_BLOCKLIST.filter((entry) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      entry.address.toLowerCase().includes(searchLower) ||
      entry.label?.toLowerCase().includes(searchLower) ||
      entry.reason.toLowerCase().includes(searchLower)
    );
  });

  const blockedCount = MOCK_BLOCKLIST.filter(
    (e) => e.status === 'blocked'
  ).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <SearchIcon className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search blocklist..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 w-64 border border-neutral-200 bg-neutral-50 pr-2 pl-7 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
            />
          </div>
          <span className="text-xs text-neutral-500">
            {blockedCount} blocked{' '}
            {blockedCount === 1 ? 'address' : 'addresses'}
          </span>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="h-7 rounded-none bg-negative-500 px-3 text-xs font-medium text-white hover:bg-negative-600"
        >
          <PlusIcon className="mr-1.5 size-3.5" />
          Block Address
        </Button>
      </div>

      {/* Warning Banner */}
      <div className="flex items-start gap-3 border border-negative-200 bg-negative-50 p-3">
        <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-negative-500" />
        <div>
          <p className="text-xs font-medium text-negative-800">
            Blocked Addresses
          </p>
          <p className="mt-0.5 text-xs text-negative-700">
            Addresses on this list are prevented from receiving or transferring
            this token. Use this for compliance with sanctions lists, fraud
            prevention, or regulatory requirements.
          </p>
        </div>
      </div>

      {/* Blocklist Table */}
      <div className="border border-neutral-200 bg-white">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50 text-left">
              <th className="px-4 py-3 font-medium text-neutral-500">
                Address
              </th>
              <th className="px-4 py-3 font-medium text-neutral-500">Label</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Reason</th>
              <th className="px-4 py-3 font-medium text-neutral-500">
                Blocked At
              </th>
              <th className="px-4 py-3 font-medium text-neutral-500">
                Blocked By
              </th>
              <th className="px-4 py-3 font-medium text-neutral-500">Status</th>
              <th className="px-4 py-3 text-right font-medium text-neutral-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredEntries.map((entry) => (
              <tr
                key={entry.id}
                className={cn(
                  'transition-colors',
                  entry.status === 'unblocked'
                    ? 'bg-neutral-50/50 opacity-60'
                    : 'hover:bg-neutral-50'
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-neutral-900">
                      {truncateAddress(entry.address)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        navigator.clipboard.writeText(entry.address)
                      }
                      className="text-neutral-400 hover:text-neutral-600"
                    >
                      <ClipboardCopyIcon className="size-3.5" />
                    </button>
                    <a
                      href={`https://etherscan.io/address/${entry.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-400 hover:text-terminal-600"
                    >
                      <ExternalLinkIcon className="size-3.5" />
                    </a>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {entry.label ? (
                    <span className="text-neutral-700">{entry.label}</span>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-neutral-600">{entry.reason}</span>
                </td>
                <td className="px-4 py-3 text-neutral-500 tabular-nums">
                  {entry.blockedAt}
                </td>
                <td className="px-4 py-3 text-neutral-500">
                  {entry.blockedBy}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
                      entry.status === 'blocked'
                        ? 'bg-negative-100 text-negative-700'
                        : 'bg-neutral-100 text-neutral-500'
                    )}
                  >
                    {entry.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                      >
                        <MoreHorizontalIcon className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-40 rounded-none"
                    >
                      <DropdownMenuItem className="cursor-pointer rounded-none text-xs">
                        Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer rounded-none text-xs">
                        View History
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {entry.status === 'blocked' ? (
                        <DropdownMenuItem className="cursor-pointer rounded-none text-xs text-positive-600">
                          Unblock
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem className="cursor-pointer rounded-none text-xs text-negative-600">
                          Re-block
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredEntries.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-neutral-500">
              No blocked addresses found matching your search.
            </p>
          </div>
        )}
      </div>

      {/* Add Blocklist Modal */}
      <AddBlocklistModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        tokenId={tokenId}
      />
    </div>
  );
}
