import {
  ArrowRightIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  ClipboardCopyIcon,
  ClockIcon,
  ExternalLinkIcon,
  FilterIcon,
  FlameIcon,
  Loader2Icon,
  SearchIcon,
  XCircleIcon,
} from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';

import { MOCK_TRANSACTIONS } from '../data/mock-data';
import type { TokenTransaction } from '../schema';

type Props = {
  tokenId: string;
};

type TransactionFilter = 'all' | 'mint' | 'burn' | 'transfer';

const truncateHash = (hash: string): string => {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
};

const truncateAddress = (address: string): string => {
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
};

const formatAmount = (amount: string): string => {
  const value = BigInt(amount);
  const divisor = BigInt(10 ** 18);
  const integerPart = value / divisor;
  return integerPart.toLocaleString();
};

const getTypeConfig = (type: TokenTransaction['type']) => {
  switch (type) {
    case 'mint':
      return {
        label: 'Mint',
        icon: ArrowUpIcon,
        bgColor: 'bg-positive-100',
        textColor: 'text-positive-700',
        borderColor: 'border-positive-200',
      };
    case 'burn':
      return {
        label: 'Burn',
        icon: FlameIcon,
        bgColor: 'bg-negative-100',
        textColor: 'text-negative-700',
        borderColor: 'border-negative-200',
      };
    case 'transfer':
      return {
        label: 'Transfer',
        icon: ArrowRightIcon,
        bgColor: 'bg-terminal-100',
        textColor: 'text-terminal-700',
        borderColor: 'border-terminal-200',
      };
  }
};

const getStatusConfig = (status: TokenTransaction['status']) => {
  switch (status) {
    case 'confirmed':
      return {
        label: 'Confirmed',
        icon: CheckCircleIcon,
        bgColor: 'bg-positive-100',
        textColor: 'text-positive-700',
      };
    case 'pending':
      return {
        label: 'Pending',
        icon: Loader2Icon,
        bgColor: 'bg-warning-100',
        textColor: 'text-warning-700',
        animate: true,
      };
    case 'failed':
      return {
        label: 'Failed',
        icon: XCircleIcon,
        bgColor: 'bg-negative-100',
        textColor: 'text-negative-700',
      };
  }
};

export function TokenTransactionsTab({ tokenId: _tokenId }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<TransactionFilter>('all');

  // Filter transactions
  const filteredTransactions = MOCK_TRANSACTIONS.filter((tx) => {
    // Filter by type
    if (filter !== 'all' && tx.type !== filter) return false;

    // Filter by search
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      tx.txHash.toLowerCase().includes(searchLower) ||
      tx.fromAddress?.toLowerCase().includes(searchLower) ||
      tx.toAddress?.toLowerCase().includes(searchLower)
    );
  });

  // Count by type
  const mintCount = MOCK_TRANSACTIONS.filter((tx) => tx.type === 'mint').length;
  const burnCount = MOCK_TRANSACTIONS.filter((tx) => tx.type === 'burn').length;
  const transferCount = MOCK_TRANSACTIONS.filter(
    (tx) => tx.type === 'transfer'
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
              placeholder="Search by hash or address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 w-72 border-input pr-2 pl-7 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-terminal-400 focus:outline-none"
            />
          </div>
          <span className="text-xs text-neutral-500">
            {filteredTransactions.length} transactions
          </span>
        </div>
        <Button
          variant="secondary"
          className="h-7 rounded-none border-neutral-200 px-3 text-xs"
        >
          <FilterIcon className="mr-1.5 size-3.5" />
          Export
        </Button>
      </div>

      {/* Type Filter Tabs */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={cn(
            'flex items-center gap-2 border px-3 py-1.5 text-xs font-medium transition-colors',
            filter === 'all'
              ? 'border-terminal-300 bg-terminal-50 text-terminal-700'
              : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
          )}
        >
          All
          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500">
            {MOCK_TRANSACTIONS.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setFilter('mint')}
          className={cn(
            'flex items-center gap-2 border px-3 py-1.5 text-xs font-medium transition-colors',
            filter === 'mint'
              ? 'border-positive-300 bg-positive-50 text-positive-700'
              : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
          )}
        >
          <ArrowUpIcon className="size-3.5 text-positive-500" />
          Mints
          <span className="rounded bg-positive-100 px-1.5 py-0.5 text-[10px] font-semibold text-positive-600">
            {mintCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setFilter('burn')}
          className={cn(
            'flex items-center gap-2 border px-3 py-1.5 text-xs font-medium transition-colors',
            filter === 'burn'
              ? 'border-negative-300 bg-negative-50 text-negative-700'
              : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
          )}
        >
          <FlameIcon className="size-3.5 text-negative-500" />
          Burns
          <span className="rounded bg-negative-100 px-1.5 py-0.5 text-[10px] font-semibold text-negative-600">
            {burnCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setFilter('transfer')}
          className={cn(
            'flex items-center gap-2 border px-3 py-1.5 text-xs font-medium transition-colors',
            filter === 'transfer'
              ? 'border-terminal-300 bg-terminal-50 text-terminal-700'
              : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
          )}
        >
          <ArrowRightIcon className="size-3.5 text-terminal-500" />
          Transfers
          <span className="rounded bg-terminal-100 px-1.5 py-0.5 text-[10px] font-semibold text-terminal-600">
            {transferCount}
          </span>
        </button>
      </div>

      {/* Transactions Table */}
      <div className="border-card">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50 text-left">
              <th className="px-4 py-3 font-medium text-neutral-500">Type</th>
              <th className="px-4 py-3 font-medium text-neutral-500">
                Transaction Hash
              </th>
              <th className="px-4 py-3 font-medium text-neutral-500">From</th>
              <th className="px-4 py-3 font-medium text-neutral-500">To</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Amount</th>
              <th className="px-4 py-3 font-medium text-neutral-500">
                Timestamp
              </th>
              <th className="px-4 py-3 font-medium text-neutral-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredTransactions.map((tx) => {
              const typeConfig = getTypeConfig(tx.type);
              const statusConfig = getStatusConfig(tx.status);
              const TypeIcon = typeConfig.icon;
              const StatusIcon = statusConfig.icon;

              return (
                <tr key={tx.id} className="hover-subtle transition-colors">
                  {/* Type */}
                  <td className="px-4 py-3">
                    <div
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded border px-2 py-1',
                        typeConfig.bgColor,
                        typeConfig.textColor,
                        typeConfig.borderColor
                      )}
                    >
                      <TypeIcon className="size-3.5" />
                      <span className="text-[10px] font-semibold uppercase">
                        {typeConfig.label}
                      </span>
                    </div>
                  </td>

                  {/* Transaction Hash */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-neutral-900">
                        {truncateHash(tx.txHash)}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(tx.txHash)}
                        className="text-neutral-400 hover:text-neutral-600"
                      >
                        <ClipboardCopyIcon className="size-3.5" />
                      </button>
                      <a
                        href={`https://etherscan.io/tx/${tx.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-400 hover:text-terminal-600"
                      >
                        <ExternalLinkIcon className="size-3.5" />
                      </a>
                    </div>
                  </td>

                  {/* From */}
                  <td className="px-4 py-3">
                    {tx.fromAddress ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-neutral-600">
                          {truncateAddress(tx.fromAddress)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            navigator.clipboard.writeText(tx.fromAddress!)
                          }
                          className="text-neutral-400 hover:text-neutral-600"
                        >
                          <ClipboardCopyIcon className="size-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>

                  {/* To */}
                  <td className="px-4 py-3">
                    {tx.toAddress ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-neutral-600">
                          {truncateAddress(tx.toAddress)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            navigator.clipboard.writeText(tx.toAddress!)
                          }
                          className="text-neutral-400 hover:text-neutral-600"
                        >
                          <ClipboardCopyIcon className="size-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'font-mono font-medium tabular-nums',
                        tx.type === 'mint' && 'text-positive-600',
                        tx.type === 'burn' && 'text-negative-600',
                        tx.type === 'transfer' && 'text-neutral-900'
                      )}
                    >
                      {tx.type === 'mint' && '+'}
                      {tx.type === 'burn' && '-'}
                      {formatAmount(tx.amount)}
                    </span>
                  </td>

                  {/* Timestamp */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-neutral-500">
                      <ClockIcon className="size-3" />
                      <span className="tabular-nums">{tx.timestamp}</span>
                    </div>
                    {tx.blockNumber && (
                      <span className="text-[10px] text-neutral-400">
                        Block #{tx.blockNumber.toLocaleString()}
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <div
                      className={cn(
                        'inline-flex items-center gap-1 rounded px-1.5 py-0.5',
                        statusConfig.bgColor,
                        statusConfig.textColor
                      )}
                    >
                      <StatusIcon
                        className={cn(
                          'size-3',
                          'animate' in statusConfig &&
                            statusConfig.animate &&
                            'animate-spin'
                        )}
                      />
                      <span className="text-[10px] font-medium">
                        {statusConfig.label}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredTransactions.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-neutral-500">
              No transactions found matching your filters.
            </p>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="border-card p-4">
          <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
            Total Minted
          </p>
          <p className="mt-1 font-mono text-lg font-semibold text-positive-600">
            +
            {formatAmount(
              MOCK_TRANSACTIONS.filter((tx) => tx.type === 'mint')
                .reduce((sum, tx) => sum + BigInt(tx.amount), BigInt(0))
                .toString()
            )}
          </p>
        </div>
        <div className="border-card p-4">
          <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
            Total Burned
          </p>
          <p className="mt-1 font-mono text-lg font-semibold text-negative-600">
            -
            {formatAmount(
              MOCK_TRANSACTIONS.filter((tx) => tx.type === 'burn')
                .reduce((sum, tx) => sum + BigInt(tx.amount), BigInt(0))
                .toString()
            )}
          </p>
        </div>
        <div className="border-card p-4">
          <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
            Total Transferred
          </p>
          <p className="mt-1 font-mono text-lg font-semibold text-terminal-600">
            {formatAmount(
              MOCK_TRANSACTIONS.filter((tx) => tx.type === 'transfer')
                .reduce((sum, tx) => sum + BigInt(tx.amount), BigInt(0))
                .toString()
            )}
          </p>
        </div>
        <div className="border-card p-4">
          <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
            Pending
          </p>
          <p className="mt-1 font-mono text-lg font-semibold text-warning-600">
            {MOCK_TRANSACTIONS.filter((tx) => tx.status === 'pending').length}
          </p>
        </div>
      </div>
    </div>
  );
}
