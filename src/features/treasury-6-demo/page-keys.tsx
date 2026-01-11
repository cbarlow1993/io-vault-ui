import { Link } from '@tanstack/react-router';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  CopyIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  ShieldCheckIcon,
  XIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
} from '@/layout/treasury-6';

import { allVaults, type VaultStatus } from './data/vaults';

// Simple filter select matching Swiss design aesthetic
type FilterSelectOption = { id: string; label: string };

const FilterSelect = <T extends FilterSelectOption>({
  options,
  value,
  onChange,
  className,
}: {
  options: readonly T[];
  value: T | null;
  onChange: (value: T) => void;
  className?: string;
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-7 items-center justify-between gap-2 border border-neutral-200 bg-neutral-50 px-2 text-xs text-neutral-900 hover:bg-neutral-100 focus:border-neutral-400 focus:outline-none',
            className
          )}
        >
          <span className="truncate">{value?.label ?? 'Select...'}</span>
          <ChevronDownIcon className="size-3 shrink-0 text-neutral-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[120px] rounded-none p-0"
      >
        {options.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={() => onChange(option)}
            className="flex cursor-pointer items-center justify-between gap-2 rounded-none px-2 py-1.5 text-xs"
          >
            <span>{option.label}</span>
            {value?.id === option.id && (
              <CheckIcon className="size-3 text-neutral-900" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

type SelectOption = { id: string; label: string };

const STATUS_OPTIONS: SelectOption[] = [
  { id: 'all', label: 'All Status' },
  { id: 'active', label: 'Active' },
  { id: 'pending', label: 'Pending' },
  { id: 'revoked', label: 'Revoked' },
];

const PAGE_SIZE_OPTIONS_SELECT: SelectOption[] = [
  { id: '5', label: '5' },
  { id: '10', label: '10' },
  { id: '25', label: '25' },
  { id: '50', label: '50' },
];

const getStatusStyles = (status: VaultStatus) => {
  switch (status) {
    case 'active':
      return 'bg-positive-100 text-positive-700';
    case 'pending':
      return 'bg-warning-100 text-warning-700';
    case 'revoked':
      return 'bg-neutral-100 text-neutral-500';
  }
};

const DEFAULT_STATUS = STATUS_OPTIONS[0]!;
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS_SELECT[0]!;

export const PageTreasury6Keys = () => {
  // Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SelectOption | null>(
    DEFAULT_STATUS
  );

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSizeOption, setPageSizeOption] = useState<SelectOption | null>(
    DEFAULT_PAGE_SIZE
  );
  const pageSize = pageSizeOption ? Number(pageSizeOption.id) : 5;

  // Filter logic
  const filteredVaults = useMemo(() => {
    return allVaults.filter((vault) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          vault.name.toLowerCase().includes(searchLower) ||
          vault.createdBy.toLowerCase().includes(searchLower) ||
          vault.curves.some(
            (c) =>
              c.fingerprint.toLowerCase().includes(searchLower) ||
              c.curve.toLowerCase().includes(searchLower)
          );
        if (!matchesSearch) return false;
      }

      // Status filter
      const statusId = statusFilter?.id ?? 'all';
      if (statusId !== 'all' && vault.status !== statusId) {
        return false;
      }

      return true;
    });
  }, [search, statusFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredVaults.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedVaults = filteredVaults.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    handleFilterChange();
  };

  const handleStatusChange = (value: SelectOption) => {
    setStatusFilter(value);
    handleFilterChange();
  };

  const handlePageSizeChange = (value: SelectOption) => {
    setPageSizeOption(value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter(DEFAULT_STATUS);
    setCurrentPage(1);
  };

  const hasActiveFilters = search || statusFilter?.id !== 'all';

  return (
    <PageLayout>
      <PageLayoutTopBar
        title="Vaults"
        subtitle={`${allVaults.filter((v) => v.status === 'active').length} active vaults`}
        actions={
          <Button
            asChild
            className="h-7 rounded-none bg-brand-500 px-3 text-xs font-medium text-white hover:bg-brand-600"
          >
            <Link to="/vaults/new">
              <PlusIcon className="mr-1.5 size-3.5" />
              Create Vault
            </Link>
          </Button>
        }
      />
      <PageLayoutContent containerClassName="py-4">
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-px bg-neutral-200">
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Total Vaults
              </p>
              <p className="mt-1 text-lg font-semibold text-neutral-900 tabular-nums">
                {allVaults.length}
              </p>
            </div>
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Active
              </p>
              <p className="mt-1 text-lg font-semibold text-positive-600 tabular-nums">
                {allVaults.filter((v) => v.status === 'active').length}
              </p>
            </div>
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Pending
              </p>
              <p className="mt-1 text-lg font-semibold text-warning-600 tabular-nums">
                {allVaults.filter((v) => v.status === 'pending').length}
              </p>
            </div>
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Revoked
              </p>
              <p className="mt-1 text-lg font-semibold text-neutral-500 tabular-nums">
                {allVaults.filter((v) => v.status === 'revoked').length}
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
                  placeholder="Search vaults..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="h-7 w-48 border border-neutral-200 bg-neutral-50 pr-2 pl-7 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                />
              </div>

              {/* Status Filter */}
              <FilterSelect
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={handleStatusChange}
                className="w-28"
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
              {filteredVaults.length}{' '}
              {filteredVaults.length === 1 ? 'result' : 'results'}
            </span>
          </div>

          {/* Vaults Table */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
              <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                Vaults
              </h2>
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="size-4 text-positive-600" />
                <span className="text-xs text-neutral-500">
                  All vaults secured with MPC
                </span>
              </div>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-left">
                  <th className="px-3 py-2 font-medium text-neutral-500">
                    Name
                  </th>
                  <th className="px-3 py-2 font-medium text-neutral-500">
                    Curves
                  </th>
                  <th className="px-3 py-2 font-medium text-neutral-500">
                    Status
                  </th>
                  <th className="px-3 py-2 font-medium text-neutral-500">
                    Signatures
                  </th>
                  <th className="px-3 py-2 font-medium text-neutral-500">
                    Created
                  </th>
                  <th className="px-3 py-2 font-medium text-neutral-500">
                    Last Used
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-neutral-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {paginatedVaults.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-neutral-500"
                    >
                      No vaults found matching your filters.
                    </td>
                  </tr>
                ) : (
                  paginatedVaults.map((vault) => (
                    <tr
                      key={vault.id}
                      className="cursor-pointer hover:bg-neutral-50"
                    >
                      <td className="px-3 py-2">
                        <Link
                          to="/vaults/$vaultId"
                          params={{ vaultId: vault.id }}
                          className="block"
                        >
                          <p className="font-medium text-neutral-900 hover:underline">
                            {vault.name}
                          </p>
                          <p className="text-[10px] text-neutral-400">
                            by {vault.createdBy}
                          </p>
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          to="/vaults/$vaultId"
                          params={{ vaultId: vault.id }}
                          className="block"
                        >
                          <div className="flex flex-col gap-1">
                            {vault.curves.map((curve, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2"
                              >
                                <span className="inline-block w-12 rounded bg-neutral-100 px-1 py-0.5 text-center font-mono text-[10px] font-medium text-neutral-600">
                                  {curve.type}
                                </span>
                                <span className="font-mono text-[10px] text-neutral-500">
                                  {curve.curve}
                                </span>
                                <span className="font-mono text-[10px] text-neutral-400">
                                  {curve.fingerprint}
                                </span>
                              </div>
                            ))}
                          </div>
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          to="/vaults/$vaultId"
                          params={{ vaultId: vault.id }}
                          className="block"
                        >
                          <span
                            className={cn(
                              'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
                              getStatusStyles(vault.status)
                            )}
                          >
                            {vault.status}
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          to="/vaults/$vaultId"
                          params={{ vaultId: vault.id }}
                          className="block"
                        >
                          <span className="text-neutral-600 tabular-nums">
                            {vault.signatures.length}
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          to="/vaults/$vaultId"
                          params={{ vaultId: vault.id }}
                          className="block text-neutral-600 tabular-nums"
                        >
                          {vault.createdAt}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          to="/vaults/$vaultId"
                          params={{ vaultId: vault.id }}
                          className="block text-neutral-500"
                        >
                          {vault.lastUsed ?? 'Never'}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontalIcon className="size-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-40 rounded-none"
                          >
                            <DropdownMenuItem
                              asChild
                              className="cursor-pointer rounded-none text-xs"
                            >
                              <Link
                                to="/vaults/$vaultId"
                                params={{ vaultId: vault.id }}
                              >
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer rounded-none text-xs">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Copy functionality would go here
                                }}
                              >
                                Copy Public Keys
                              </button>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer rounded-none text-xs">
                              Export
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer rounded-none text-xs text-negative-600">
                              Revoke Vault
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {filteredVaults.length > 0 && (
              <div className="flex items-center justify-between border-t border-neutral-200 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">
                    Rows per page:
                  </span>
                  <FilterSelect
                    options={PAGE_SIZE_OPTIONS_SELECT}
                    value={pageSizeOption}
                    onChange={handlePageSizeChange}
                    className="w-16"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <span className="mr-2 text-xs text-neutral-500">
                    {startIndex + 1}-{Math.min(endIndex, filteredVaults.length)}{' '}
                    of {filteredVaults.length}
                  </span>

                  {/* First page */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className={cn(
                      'flex size-7 items-center justify-center border border-neutral-200',
                      currentPage === 1
                        ? 'cursor-not-allowed bg-neutral-50 text-neutral-300'
                        : 'bg-white text-neutral-600 hover:bg-neutral-50'
                    )}
                  >
                    <ChevronsLeftIcon className="size-3.5" />
                  </button>

                  {/* Previous page */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={cn(
                      'flex size-7 items-center justify-center border border-neutral-200',
                      currentPage === 1
                        ? 'cursor-not-allowed bg-neutral-50 text-neutral-300'
                        : 'bg-white text-neutral-600 hover:bg-neutral-50'
                    )}
                  >
                    <ChevronLeftIcon className="size-3.5" />
                  </button>

                  {/* Page numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((page) => {
                        // Show first, last, current, and adjacent pages
                        if (page === 1 || page === totalPages) return true;
                        if (Math.abs(page - currentPage) <= 1) return true;
                        return false;
                      })
                      .reduce<(number | 'ellipsis')[]>(
                        (acc, page, idx, arr) => {
                          if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
                            acc.push('ellipsis');
                          }
                          acc.push(page);
                          return acc;
                        },
                        []
                      )
                      .map((item, idx) =>
                        item === 'ellipsis' ? (
                          <span
                            key={`ellipsis-${idx}`}
                            className="px-1 text-xs text-neutral-400"
                          >
                            ...
                          </span>
                        ) : (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setCurrentPage(item)}
                            className={cn(
                              'flex size-7 items-center justify-center border text-xs',
                              currentPage === item
                                ? 'border-neutral-900 bg-neutral-900 font-medium text-white'
                                : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                            )}
                          >
                            {item}
                          </button>
                        )
                      )}
                  </div>

                  {/* Next page */}
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className={cn(
                      'flex size-7 items-center justify-center border border-neutral-200',
                      currentPage === totalPages
                        ? 'cursor-not-allowed bg-neutral-50 text-neutral-300'
                        : 'bg-white text-neutral-600 hover:bg-neutral-50'
                    )}
                  >
                    <ChevronRightIcon className="size-3.5" />
                  </button>

                  {/* Last page */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className={cn(
                      'flex size-7 items-center justify-center border border-neutral-200',
                      currentPage === totalPages
                        ? 'cursor-not-allowed bg-neutral-50 text-neutral-300'
                        : 'bg-white text-neutral-600 hover:bg-neutral-50'
                    )}
                  >
                    <ChevronsRightIcon className="size-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
