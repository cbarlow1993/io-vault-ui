import { Link, useNavigate } from '@tanstack/react-router';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ClockIcon,
  EditIcon,
  EyeIcon,
  GlobeIcon,
  KeyIcon,
  ListChecksIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  ShieldCheckIcon,
  XCircleIcon,
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
  NotificationButton,
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/treasury-6';

import {
  allWhitelists,
  type Whitelist,
  type WhitelistStatus,
} from './data/whitelists';

// Filter select component
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
  { id: 'expired', label: 'Expired' },
  { id: 'revoked', label: 'Revoked' },
];

const TYPE_OPTIONS: SelectOption[] = [
  { id: 'all', label: 'All Types' },
  { id: 'global', label: 'Global' },
  { id: 'vault-specific', label: 'Vault-specific' },
];

const PAGE_SIZE_OPTIONS: SelectOption[] = [
  { id: '5', label: '5' },
  { id: '10', label: '10' },
  { id: '25', label: '25' },
];

const getStatusStyles = (status: WhitelistStatus) => {
  switch (status) {
    case 'active':
      return 'bg-positive-100 text-positive-700';
    case 'pending':
      return 'bg-warning-100 text-warning-700';
    case 'expired':
      return 'bg-neutral-100 text-neutral-500';
    case 'revoked':
      return 'bg-negative-100 text-negative-600';
  }
};

const getStatusIcon = (status: WhitelistStatus) => {
  switch (status) {
    case 'active':
      return <ShieldCheckIcon className="size-3" />;
    case 'pending':
      return <ClockIcon className="size-3" />;
    case 'expired':
      return <XCircleIcon className="size-3" />;
    case 'revoked':
      return <XIcon className="size-3" />;
  }
};

const DEFAULT_STATUS = STATUS_OPTIONS[0]!;
const DEFAULT_TYPE = TYPE_OPTIONS[0]!;
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[1]!;

export const PageWhitelists = () => {
  const navigate = useNavigate();

  // Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SelectOption | null>(
    DEFAULT_STATUS
  );
  const [typeFilter, setTypeFilter] = useState<SelectOption | null>(
    DEFAULT_TYPE
  );

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSizeOption, setPageSizeOption] = useState<SelectOption | null>(
    DEFAULT_PAGE_SIZE
  );
  const pageSize = pageSizeOption ? Number(pageSizeOption.id) : 10;

  // Filter logic
  const filteredWhitelists = useMemo(() => {
    return allWhitelists.filter((whitelist) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          whitelist.name.toLowerCase().includes(searchLower) ||
          whitelist.description.toLowerCase().includes(searchLower) ||
          whitelist.createdBy.toLowerCase().includes(searchLower) ||
          whitelist.entries.some(
            (e) =>
              e.label.toLowerCase().includes(searchLower) ||
              e.address.toLowerCase().includes(searchLower)
          );
        if (!matchesSearch) return false;
      }

      // Status filter
      const statusId = statusFilter?.id ?? 'all';
      if (statusId !== 'all' && whitelist.status !== statusId) {
        return false;
      }

      // Type filter
      const typeId = typeFilter?.id ?? 'all';
      if (typeId !== 'all' && whitelist.type !== typeId) {
        return false;
      }

      return true;
    });
  }, [search, statusFilter, typeFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredWhitelists.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedWhitelists = filteredWhitelists.slice(startIndex, endIndex);

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

  const handleTypeChange = (value: SelectOption) => {
    setTypeFilter(value);
    handleFilterChange();
  };

  const handlePageSizeChange = (value: SelectOption) => {
    setPageSizeOption(value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter(DEFAULT_STATUS);
    setTypeFilter(DEFAULT_TYPE);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    search || statusFilter?.id !== 'all' || typeFilter?.id !== 'all';

  // Stats
  const totalEntries = allWhitelists.reduce(
    (sum, wl) => sum + wl.entries.length,
    0
  );
  const activeWhitelists = allWhitelists.filter(
    (wl) => wl.status === 'active'
  ).length;

  return (
    <PageLayout>
      <PageLayoutTopBar
        endActions={
          <div className="flex items-center gap-3">
            <Button
              asChild
              className="h-7 rounded-none bg-brand-500 px-3 text-xs font-medium text-white hover:bg-brand-600"
            >
              <Link to="/policies/whitelists/new">
                <PlusIcon className="mr-1.5 size-3.5" />
                Create Whitelist
              </Link>
            </Button>
            <div className="h-4 w-px bg-neutral-200" />
            <NotificationButton />
          </div>
        }
      >
        <PageLayoutTopBarTitle>Whitelists</PageLayoutTopBarTitle>
        <span className="text-xs text-neutral-400">
          {activeWhitelists} active whitelists
        </span>
      </PageLayoutTopBar>
      <PageLayoutContent containerClassName="py-4">
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-px bg-neutral-200">
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Total Whitelists
              </p>
              <p className="mt-1 text-lg font-semibold text-neutral-900 tabular-nums">
                {allWhitelists.length}
              </p>
            </div>
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Active
              </p>
              <p className="mt-1 text-lg font-semibold text-positive-600 tabular-nums">
                {activeWhitelists}
              </p>
            </div>
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Total Entries
              </p>
              <p className="mt-1 text-lg font-semibold text-neutral-900 tabular-nums">
                {totalEntries}
              </p>
            </div>
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Pending Review
              </p>
              <p className="mt-1 text-lg font-semibold text-warning-600 tabular-nums">
                {allWhitelists.filter((wl) => wl.status === 'pending').length}
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
                  placeholder="Search whitelists..."
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

              {/* Type Filter */}
              <FilterSelect
                options={TYPE_OPTIONS}
                value={typeFilter}
                onChange={handleTypeChange}
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
              {filteredWhitelists.length}{' '}
              {filteredWhitelists.length === 1 ? 'result' : 'results'}
            </span>
          </div>

          {/* Whitelists Table */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
              <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                Whitelists
              </h2>
              <div className="flex items-center gap-2">
                <ListChecksIcon className="size-4 text-brand-500" />
                <span className="text-xs text-neutral-500">
                  Approved addresses for transactions
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
                    Type
                  </th>
                  <th className="px-3 py-2 font-medium text-neutral-500">
                    Entries
                  </th>
                  <th className="px-3 py-2 font-medium text-neutral-500">
                    Status
                  </th>
                  <th className="px-3 py-2 font-medium text-neutral-500">
                    Approved By
                  </th>
                  <th className="px-3 py-2 font-medium text-neutral-500">
                    Updated
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-neutral-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {paginatedWhitelists.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-neutral-500"
                    >
                      No whitelists found matching your filters.
                    </td>
                  </tr>
                ) : (
                  paginatedWhitelists.map((whitelist) => (
                    <tr
                      key={whitelist.id}
                      className="cursor-pointer hover:bg-neutral-50"
                      onClick={() =>
                        navigate({
                          to: '/policies/whitelists/$whitelistId',
                          params: { whitelistId: whitelist.id },
                        })
                      }
                    >
                      <td className="px-3 py-2">
                        <div>
                          <p className="font-medium text-neutral-900">
                            {whitelist.name}
                          </p>
                          <p className="mt-0.5 max-w-xs truncate text-[10px] text-neutral-400">
                            {whitelist.description}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          {whitelist.type === 'global' ? (
                            <GlobeIcon className="size-3 text-neutral-400" />
                          ) : (
                            <KeyIcon className="size-3 text-neutral-400" />
                          )}
                          <span className="text-neutral-600">
                            {whitelist.type === 'global'
                              ? 'Global'
                              : whitelist.vaultName}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-neutral-900 tabular-nums">
                            {whitelist.entries.length}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            {
                              whitelist.entries.filter(
                                (e) => e.type === 'address'
                              ).length
                            }{' '}
                            addresses,{' '}
                            {
                              whitelist.entries.filter(
                                (e) => e.type === 'contract'
                              ).length
                            }{' '}
                            contracts
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
                            getStatusStyles(whitelist.status)
                          )}
                        >
                          {getStatusIcon(whitelist.status)}
                          {whitelist.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {whitelist.approvedBy &&
                        whitelist.approvedBy.length > 0 ? (
                          <div className="flex items-center gap-1">
                            <div className="flex -space-x-1">
                              {whitelist.approvedBy
                                .slice(0, 3)
                                .map((name, idx) => (
                                  <div
                                    key={idx}
                                    className="flex size-5 items-center justify-center rounded-full bg-neutral-200 text-[8px] font-medium text-neutral-600 ring-1 ring-white"
                                    title={name}
                                  >
                                    {name
                                      .split(' ')
                                      .map((n) => n[0])
                                      .join('')}
                                  </div>
                                ))}
                            </div>
                            {whitelist.approvedBy.length > 3 && (
                              <span className="text-[10px] text-neutral-400">
                                +{whitelist.approvedBy.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-neutral-600 tabular-nums">
                        {whitelist.updatedAt}
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
                              className="cursor-pointer rounded-none text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate({
                                  to: '/policies/whitelists/$whitelistId',
                                  params: { whitelistId: whitelist.id },
                                });
                              }}
                            >
                              <EyeIcon className="mr-2 size-3" />
                              View Details
                            </DropdownMenuItem>
                            {whitelist.status === 'active' && (
                              <DropdownMenuItem
                                className="cursor-pointer rounded-none text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate({
                                    to: '/policies/whitelists/$whitelistId/edit',
                                    params: { whitelistId: whitelist.id },
                                  });
                                }}
                              >
                                <EditIcon className="mr-2 size-3" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {whitelist.status === 'active' ? (
                              <DropdownMenuItem
                                className="cursor-pointer rounded-none text-xs text-negative-600"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <XCircleIcon className="mr-2 size-3" />
                                Revoke
                              </DropdownMenuItem>
                            ) : whitelist.status === 'pending' ? (
                              <DropdownMenuItem
                                className="cursor-pointer rounded-none text-xs text-positive-600"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <CheckIcon className="mr-2 size-3" />
                                Approve
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {filteredWhitelists.length > 0 && (
              <div className="flex items-center justify-between border-t border-neutral-200 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">
                    Rows per page:
                  </span>
                  <FilterSelect
                    options={PAGE_SIZE_OPTIONS}
                    value={pageSizeOption}
                    onChange={handlePageSizeChange}
                    className="w-16"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <span className="mr-2 text-xs text-neutral-500">
                    {startIndex + 1}-
                    {Math.min(endIndex, filteredWhitelists.length)} of{' '}
                    {filteredWhitelists.length}
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
