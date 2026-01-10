import { Link } from '@tanstack/react-router';
import {
  BuildingIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  UserIcon,
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
  allIdentities,
  type Identity,
  type IdentityType,
  type KycStatus,
} from './data/identities';

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

const TYPE_OPTIONS: SelectOption[] = [
  { id: 'all', label: 'All Types' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'individual', label: 'Individual' },
];

const KYC_STATUS_OPTIONS: SelectOption[] = [
  { id: 'all', label: 'All Status' },
  { id: 'verified', label: 'Verified' },
  { id: 'pending', label: 'Pending' },
  { id: 'expired', label: 'Expired' },
  { id: 'rejected', label: 'Rejected' },
];

const PAGE_SIZE_OPTIONS_SELECT: SelectOption[] = [
  { id: '5', label: '5' },
  { id: '10', label: '10' },
  { id: '25', label: '25' },
  { id: '50', label: '50' },
];

const getKycStatusStyles = (status: KycStatus) => {
  switch (status) {
    case 'verified':
      return 'bg-positive-100 text-positive-700';
    case 'pending':
      return 'bg-warning-100 text-warning-700';
    case 'expired':
      return 'bg-neutral-100 text-neutral-500';
    case 'rejected':
      return 'bg-negative-100 text-negative-700';
  }
};

const getTypeStyles = (type: IdentityType) => {
  switch (type) {
    case 'corporate':
      return 'bg-blue-100 text-blue-700';
    case 'individual':
      return 'bg-purple-100 text-purple-700';
  }
};

const DEFAULT_TYPE = TYPE_OPTIONS[0]!;
const DEFAULT_KYC_STATUS = KYC_STATUS_OPTIONS[0]!;
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS_SELECT[0]!;

export const PageTreasury6Identities = () => {
  // Filter state
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<SelectOption | null>(
    DEFAULT_TYPE
  );
  const [kycStatusFilter, setKycStatusFilter] = useState<SelectOption | null>(
    DEFAULT_KYC_STATUS
  );

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSizeOption, setPageSizeOption] = useState<SelectOption | null>(
    DEFAULT_PAGE_SIZE
  );
  const pageSize = pageSizeOption ? Number(pageSizeOption.id) : 5;

  // Filter logic
  const filteredIdentities = useMemo(() => {
    return allIdentities.filter((identity) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          identity.name.toLowerCase().includes(searchLower) ||
          (identity.displayName?.toLowerCase().includes(searchLower) ?? false);
        if (!matchesSearch) return false;
      }

      // Type filter
      const typeId = typeFilter?.id ?? 'all';
      if (typeId !== 'all' && identity.type !== typeId) {
        return false;
      }

      // KYC status filter
      const kycStatusId = kycStatusFilter?.id ?? 'all';
      if (kycStatusId !== 'all' && identity.kycStatus !== kycStatusId) {
        return false;
      }

      return true;
    });
  }, [search, typeFilter, kycStatusFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredIdentities.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedIdentities = filteredIdentities.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    handleFilterChange();
  };

  const handleTypeChange = (value: SelectOption) => {
    setTypeFilter(value);
    handleFilterChange();
  };

  const handleKycStatusChange = (value: SelectOption) => {
    setKycStatusFilter(value);
    handleFilterChange();
  };

  const handlePageSizeChange = (value: SelectOption) => {
    setPageSizeOption(value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setTypeFilter(DEFAULT_TYPE);
    setKycStatusFilter(DEFAULT_KYC_STATUS);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    search || typeFilter?.id !== 'all' || kycStatusFilter?.id !== 'all';

  // Stats
  const verifiedCount = allIdentities.filter(
    (i) => i.kycStatus === 'verified'
  ).length;
  const corporateCount = allIdentities.filter(
    (i) => i.type === 'corporate'
  ).length;
  const individualCount = allIdentities.filter(
    (i) => i.type === 'individual'
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
              <Link to="/identities/new">
                <PlusIcon className="mr-1.5 size-3.5" />
                Add Identity
              </Link>
            </Button>
            <div className="h-4 w-px bg-neutral-200" />
            <NotificationButton />
          </div>
        }
      >
        <PageLayoutTopBarTitle>Identities</PageLayoutTopBarTitle>
        <span className="text-xs text-neutral-400">
          {verifiedCount} verified identities
        </span>
      </PageLayoutTopBar>
      <PageLayoutContent containerClassName="py-4">
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-px bg-neutral-200">
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Total Identities
              </p>
              <p className="mt-1 text-lg font-semibold text-neutral-900 tabular-nums">
                {allIdentities.length}
              </p>
            </div>
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Corporate
              </p>
              <p className="text-blue-600 mt-1 text-lg font-semibold tabular-nums">
                {corporateCount}
              </p>
            </div>
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Individual
              </p>
              <p className="text-purple-600 mt-1 text-lg font-semibold tabular-nums">
                {individualCount}
              </p>
            </div>
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Verified
              </p>
              <p className="mt-1 text-lg font-semibold text-positive-600 tabular-nums">
                {verifiedCount}
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
                  placeholder="Search identities..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="h-7 w-48 border border-neutral-200 bg-neutral-50 pr-2 pl-7 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                />
              </div>

              {/* Type Filter */}
              <FilterSelect
                options={TYPE_OPTIONS}
                value={typeFilter}
                onChange={handleTypeChange}
                className="w-28"
              />

              {/* KYC Status Filter */}
              <FilterSelect
                options={KYC_STATUS_OPTIONS}
                value={kycStatusFilter}
                onChange={handleKycStatusChange}
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
              {filteredIdentities.length}{' '}
              {filteredIdentities.length === 1 ? 'result' : 'results'}
            </span>
          </div>

          {/* Identities Table */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
              <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                Identities
              </h2>
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
                    KYC Status
                  </th>
                  <th className="px-3 py-2 font-medium text-neutral-500">
                    Verified Date
                  </th>
                  <th className="px-3 py-2 font-medium text-neutral-500">
                    Expires
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-neutral-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {paginatedIdentities.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-8 text-center text-neutral-500"
                    >
                      No identities found matching your filters.
                    </td>
                  </tr>
                ) : (
                  paginatedIdentities.map((identity) => (
                    <IdentityRow key={identity.id} identity={identity} />
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {filteredIdentities.length > 0 && (
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
                    {startIndex + 1}-
                    {Math.min(endIndex, filteredIdentities.length)} of{' '}
                    {filteredIdentities.length}
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

// Table row component for identity
const IdentityRow = ({ identity }: { identity: Identity }) => {
  const displayName = identity.displayName ?? identity.name;
  const TypeIcon = identity.type === 'corporate' ? BuildingIcon : UserIcon;

  return (
    <tr className="cursor-pointer hover:bg-neutral-50">
      <td className="px-3 py-2">
        <Link
          to="/identities/$identityId"
          params={{ identityId: identity.id }}
          className="block"
        >
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex size-7 items-center justify-center rounded-full',
                identity.type === 'corporate' ? 'bg-blue-100' : 'bg-purple-100'
              )}
            >
              <TypeIcon
                className={cn(
                  'size-3.5',
                  identity.type === 'corporate'
                    ? 'text-blue-600'
                    : 'text-purple-600'
                )}
              />
            </div>
            <div>
              <p className="font-medium text-neutral-900 hover:underline">
                {displayName}
              </p>
              {identity.type === 'individual' && identity.role && (
                <p className="text-[10px] text-neutral-400">{identity.role}</p>
              )}
              {identity.type === 'corporate' && identity.jurisdiction && (
                <p className="text-[10px] text-neutral-400">
                  {identity.jurisdiction}
                </p>
              )}
            </div>
          </div>
        </Link>
      </td>
      <td className="px-3 py-2">
        <Link
          to="/identities/$identityId"
          params={{ identityId: identity.id }}
          className="block"
        >
          <span
            className={cn(
              'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
              getTypeStyles(identity.type)
            )}
          >
            {identity.type}
          </span>
        </Link>
      </td>
      <td className="px-3 py-2">
        <Link
          to="/identities/$identityId"
          params={{ identityId: identity.id }}
          className="block"
        >
          <span
            className={cn(
              'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
              getKycStatusStyles(identity.kycStatus)
            )}
          >
            {identity.kycStatus}
          </span>
        </Link>
      </td>
      <td className="px-3 py-2">
        <Link
          to="/identities/$identityId"
          params={{ identityId: identity.id }}
          className="block text-neutral-600 tabular-nums"
        >
          {identity.kycVerifiedAt ?? '—'}
        </Link>
      </td>
      <td className="px-3 py-2">
        <Link
          to="/identities/$identityId"
          params={{ identityId: identity.id }}
          className="block text-neutral-500 tabular-nums"
        >
          {identity.kycExpiresAt ?? '—'}
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
          <DropdownMenuContent align="end" className="w-40 rounded-none">
            <DropdownMenuItem
              asChild
              className="cursor-pointer rounded-none text-xs"
            >
              <Link
                to="/identities/$identityId"
                params={{ identityId: identity.id }}
              >
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              asChild
              className="cursor-pointer rounded-none text-xs"
            >
              <Link
                to="/identities/$identityId/edit"
                params={{ identityId: identity.id }}
              >
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer rounded-none text-xs text-negative-600">
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
};
