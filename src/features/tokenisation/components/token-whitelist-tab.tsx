import {
  ClipboardCopyIcon,
  ExternalLinkIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
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

import { AddWhitelistModal } from './add-whitelist-modal';
import { MOCK_WHITELIST } from '../data/mock-data';

type Props = {
  tokenId: string;
};

const truncateAddress = (address: string): string => {
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
};

const getStatusStyles = (status: 'active' | 'expired' | 'removed') => {
  switch (status) {
    case 'active':
      return 'bg-positive-100 text-positive-700';
    case 'expired':
      return 'bg-warning-100 text-warning-700';
    case 'removed':
      return 'bg-neutral-100 text-neutral-500';
  }
};

export function TokenWhitelistTab({ tokenId }: Props) {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Filter whitelist
  const filteredEntries = MOCK_WHITELIST.filter((entry) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      entry.address.toLowerCase().includes(searchLower) ||
      entry.label?.toLowerCase().includes(searchLower)
    );
  });

  const activeCount = MOCK_WHITELIST.filter(
    (e) => e.status === 'active'
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
              placeholder="Search whitelist..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 w-64 border border-neutral-200 bg-neutral-50 pr-2 pl-7 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-terminal-400 focus:outline-none"
            />
          </div>
          <span className="text-xs text-neutral-500">
            {activeCount} active {activeCount === 1 ? 'address' : 'addresses'}
          </span>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="h-7 rounded-none bg-terminal-500 px-3 text-xs font-medium text-white hover:bg-terminal-600"
        >
          <PlusIcon className="mr-1.5 size-3.5" />
          Add Address
        </Button>
      </div>

      {/* Whitelist Table */}
      <div className="border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 bg-terminal-50/50 px-4 py-2">
          <p className="text-xs text-terminal-700">
            <strong>Whitelist:</strong> Only addresses on this list can receive
            tokens. This is typically used for regulatory compliance with
            security tokens.
          </p>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50 text-left">
              <th className="px-4 py-3 font-medium text-neutral-500">
                Address
              </th>
              <th className="px-4 py-3 font-medium text-neutral-500">Label</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Added</th>
              <th className="px-4 py-3 font-medium text-neutral-500">
                Added By
              </th>
              <th className="px-4 py-3 font-medium text-neutral-500">
                Expires
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
                  entry.status === 'removed'
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
                <td className="px-4 py-3 text-neutral-500 tabular-nums">
                  {entry.addedAt}
                </td>
                <td className="px-4 py-3 text-neutral-500">{entry.addedBy}</td>
                <td className="px-4 py-3">
                  {entry.expiresAt ? (
                    <span className="text-neutral-500 tabular-nums">
                      {entry.expiresAt}
                    </span>
                  ) : (
                    <span className="text-neutral-400">Never</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
                      getStatusStyles(entry.status)
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
                        Edit Label
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer rounded-none text-xs">
                        Set Expiry
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="cursor-pointer rounded-none text-xs text-negative-600">
                        <TrashIcon className="mr-2 size-3.5" />
                        Remove
                      </DropdownMenuItem>
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
              No addresses found matching your search.
            </p>
          </div>
        )}
      </div>

      {/* Add Whitelist Modal */}
      <AddWhitelistModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        tokenId={tokenId}
      />
    </div>
  );
}
