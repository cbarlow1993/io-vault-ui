import { Link, useNavigate } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import {
  ChevronRightIcon,
  CircleDotIcon,
  CoinsIcon,
  MoreHorizontalIcon,
  PauseCircleIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { FilterSelect } from '@/features/shared/components/filter-select';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
} from '@/layout/shell';

import { MOCK_TOKENS } from './data/mock-data';
import type { Token, TokenStandard, TokenStatus } from './schema';

type SelectOption = { id: string; label: string };

const STATUS_OPTIONS: SelectOption[] = [
  { id: 'all', label: 'All Status' },
  { id: 'active', label: 'Active' },
  { id: 'paused', label: 'Paused' },
  { id: 'deprecated', label: 'Deprecated' },
];

const STANDARD_OPTIONS: SelectOption[] = [
  { id: 'all', label: 'All Standards' },
  { id: 'ERC-20', label: 'ERC-20' },
  { id: 'ERC-721', label: 'ERC-721' },
  { id: 'ERC-1155', label: 'ERC-1155' },
  { id: 'ERC-3643', label: 'ERC-3643' },
];

const DEFAULT_STATUS = STATUS_OPTIONS[0]!;
const DEFAULT_STANDARD = STANDARD_OPTIONS[0]!;

const getStatusStyles = (status: TokenStatus) => {
  switch (status) {
    case 'active':
      return 'bg-positive-100 text-positive-700';
    case 'paused':
      return 'bg-warning-100 text-warning-700';
    case 'deprecated':
      return 'bg-neutral-100 text-neutral-500';
  }
};

const getStandardStyles = (standard: TokenStandard) => {
  switch (standard) {
    case 'ERC-20':
      return 'bg-terminal-100 text-terminal-700 border-terminal-200';
    case 'ERC-721':
      return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    case 'ERC-1155':
      return 'bg-gold-100 text-gold-700 border-gold-200';
    case 'ERC-3643':
      return 'bg-brand-100 text-brand-700 border-brand-200';
  }
};

const formatSupply = (supply: string, decimals: number): string => {
  const value = BigInt(supply);
  const divisor = BigInt(10 ** decimals);
  const integerPart = value / divisor;
  return integerPart.toLocaleString();
};

const createTokenColumns = (): ColumnDef<Token, unknown>[] => [
  {
    accessorKey: 'name',
    header: 'Token',
    cell: ({ row }) => {
      const token = row.original;
      return (
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center bg-gradient-to-br from-terminal-400 to-terminal-600 text-xs font-bold text-white shadow-sm">
            {token.symbol.slice(0, 2)}
          </div>
          <div>
            <p className="font-medium text-neutral-900">{token.name}</p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-terminal-600">
                {token.symbol}
              </span>
              <span className="text-[10px] text-neutral-300">•</span>
              <span className="text-[10px] text-neutral-400">
                {token.chainName}
              </span>
            </div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'standard',
    header: 'Standard',
    cell: ({ row }) => {
      const token = row.original;
      return (
        <span
          className={cn(
            'inline-block border px-2 py-0.5 text-[10px] font-medium',
            getStandardStyles(token.standard)
          )}
        >
          {token.standard}
        </span>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const token = row.original;
      return (
        <div className="flex items-center gap-1.5">
          {token.status === 'paused' && (
            <PauseCircleIcon className="size-3 text-warning-500" />
          )}
          {token.status === 'active' && (
            <CircleDotIcon className="size-3 text-positive-500" />
          )}
          <span
            className={cn(
              'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
              getStatusStyles(token.status)
            )}
          >
            {token.status}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'totalSupply',
    header: 'Total Supply',
    cell: ({ row }) => {
      const token = row.original;
      return (
        <div className="text-right">
          <p className="font-mono text-xs text-neutral-900 tabular-nums">
            {formatSupply(token.totalSupply, token.decimals)}
          </p>
          <p className="font-mono text-[10px] text-neutral-400">
            {token.symbol}
          </p>
        </div>
      );
    },
  },
  {
    accessorKey: 'holdersCount',
    header: 'Holders',
    cell: ({ row }) => (
      <span className="font-mono text-xs text-neutral-600 tabular-nums">
        {row.original.holdersCount.toLocaleString()}
      </span>
    ),
  },
  {
    accessorKey: 'deployedAt',
    header: 'Deployed',
    cell: ({ row }) => (
      <span className="text-xs text-neutral-500 tabular-nums">
        {row.original.deployedAt}
      </span>
    ),
  },
  {
    id: 'actions',
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => {
      const token = row.original;
      return (
        <div className="text-right" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              >
                <MoreHorizontalIcon className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-none">
              <DropdownMenuItem
                asChild
                className="cursor-pointer rounded-none text-xs"
              >
                <Link
                  to="/tokenisation/tokens/$tokenId"
                  params={{ tokenId: token.id }}
                >
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                asChild
                className="cursor-pointer rounded-none text-xs"
              >
                <Link
                  to="/tokenisation/tokens/$tokenId/mint"
                  params={{ tokenId: token.id }}
                >
                  Mint Tokens
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                asChild
                className="cursor-pointer rounded-none text-xs"
              >
                <Link
                  to="/tokenisation/tokens/$tokenId/burn"
                  params={{ tokenId: token.id }}
                >
                  Burn Tokens
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer rounded-none text-xs">
                {token.isPaused ? 'Unpause Token' : 'Pause Token'}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer rounded-none text-xs text-negative-600">
                Deprecate Token
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];

export const PageTokens = () => {
  const navigate = useNavigate();

  // Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SelectOption | null>(
    DEFAULT_STATUS
  );
  const [standardFilter, setStandardFilter] = useState<SelectOption | null>(
    DEFAULT_STANDARD
  );

  // Mock loading state
  const isLoading = false;
  const isError = false;

  // Filter tokens
  const filteredTokens = useMemo(() => {
    return MOCK_TOKENS.filter((token) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        if (
          !token.name.toLowerCase().includes(searchLower) &&
          !token.symbol.toLowerCase().includes(searchLower) &&
          !token.contractAddress.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }
      // Status filter
      if (statusFilter?.id !== 'all' && token.status !== statusFilter?.id) {
        return false;
      }
      // Standard filter
      if (
        standardFilter?.id !== 'all' &&
        token.standard !== standardFilter?.id
      ) {
        return false;
      }
      return true;
    });
  }, [search, statusFilter, standardFilter]);

  const columns = useMemo(() => createTokenColumns(), []);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter(DEFAULT_STATUS);
    setStandardFilter(DEFAULT_STANDARD);
  };

  const hasActiveFilters =
    search || statusFilter?.id !== 'all' || standardFilter?.id !== 'all';

  // Stats
  const activeCount = MOCK_TOKENS.filter((t) => t.status === 'active').length;
  const pausedCount = MOCK_TOKENS.filter((t) => t.status === 'paused').length;
  const totalHolders = MOCK_TOKENS.reduce((sum, t) => sum + t.holdersCount, 0);

  return (
    <PageLayout>
      <PageLayoutTopBar
        title="Tokens"
        actions={
          <Button
            asChild
            className="h-7 rounded-none bg-terminal-500 px-3 text-xs font-medium text-white hover:bg-terminal-600"
          >
            <Link to="/tokenisation/deployment">
              <PlusIcon className="mr-1.5 size-3.5" />
              Deploy Token
            </Link>
          </Button>
        }
      />
      <PageLayoutContent containerClassName="py-4">
        <div className="space-y-4">
          {/* Summary Cards with Cyan Accent */}
          <div className="grid grid-cols-4 gap-px bg-neutral-200">
            <div className="relative overflow-hidden bg-white p-3">
              <div className="absolute top-0 left-0 h-full w-1 bg-terminal-500" />
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Total Tokens
              </p>
              <p className="mt-1 text-lg font-semibold text-neutral-900 tabular-nums">
                {MOCK_TOKENS.length}
              </p>
            </div>
            <div className="relative overflow-hidden bg-white p-3">
              <div className="absolute top-0 left-0 h-full w-1 bg-positive-500" />
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Active
              </p>
              <p className="mt-1 text-lg font-semibold text-positive-600 tabular-nums">
                {activeCount}
              </p>
            </div>
            <div className="relative overflow-hidden bg-white p-3">
              <div className="absolute top-0 left-0 h-full w-1 bg-warning-500" />
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Paused
              </p>
              <p className="mt-1 text-lg font-semibold text-warning-600 tabular-nums">
                {pausedCount}
              </p>
            </div>
            <div className="relative overflow-hidden bg-white p-3">
              <div className="absolute top-0 left-0 h-full w-1 bg-indigo-500" />
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Total Holders
              </p>
              <p className="mt-1 text-lg font-semibold text-neutral-900 tabular-nums">
                {totalHolders.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between border border-neutral-200 bg-white px-3 py-2">
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <SearchIcon className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search tokens..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-7 w-56 border border-neutral-200 bg-neutral-50 pr-2 pl-7 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-terminal-400 focus:outline-none"
                />
              </div>

              {/* Status Filter */}
              <FilterSelect
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={setStatusFilter}
                className="w-28"
              />

              {/* Standard Filter */}
              <FilterSelect
                options={STANDARD_OPTIONS}
                value={standardFilter}
                onChange={setStandardFilter}
                className="w-32"
              />

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex h-7 items-center gap-1 px-2 text-xs text-neutral-500 hover:text-neutral-900"
                >
                  <XIcon className="size-3" />
                  Clear
                </button>
              )}
            </div>

            {/* Results count */}
            <span className="text-xs text-neutral-500">
              {filteredTokens.length}{' '}
              {filteredTokens.length === 1 ? 'token' : 'tokens'}
            </span>
          </div>

          {/* Tokens Table */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
              <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                Deployed Tokens
              </h2>
              <div className="flex items-center gap-2">
                <CoinsIcon className="size-4 text-terminal-500" />
                <span className="text-xs text-neutral-500">
                  Smart contract managed
                </span>
              </div>
            </div>
            <DataTable
              columns={columns}
              data={filteredTokens}
              getRowId={(row) => row.id}
              onRowClick={(row) =>
                navigate({
                  to: '/tokenisation/tokens/$tokenId',
                  params: { tokenId: row.id },
                })
              }
              pageSizeOptions={[5, 10, 25]}
              isLoading={isLoading}
              isError={isError}
              emptyState={
                <div className="py-8 text-center text-sm text-neutral-500">
                  No tokens found matching your filters.
                </div>
              }
            />
          </div>

          {/* Quick Deploy Card */}
          <div className="border border-dashed border-terminal-300 bg-terminal-50/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center bg-terminal-100">
                  <CoinsIcon className="size-5 text-terminal-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    Deploy a new token
                  </p>
                  <p className="text-xs text-neutral-500">
                    Create ERC-20, ERC-721, ERC-1155, or ERC-3643 tokens
                  </p>
                </div>
              </div>
              <Button
                asChild
                variant="secondary"
                className="h-8 rounded-none border-terminal-300 text-xs text-terminal-700 hover:bg-terminal-100"
              >
                <Link to="/tokenisation/deployment">
                  Get Started
                  <ChevronRightIcon className="ml-1 size-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
