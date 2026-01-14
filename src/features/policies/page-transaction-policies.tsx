import { Link, useNavigate } from '@tanstack/react-router';
import {
  AlertTriangleIcon,
  ArrowRightLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ClockIcon,
  FileTextIcon,
  GlobeIcon,
  KeyIcon,
  MoreHorizontalIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  PlusIcon,
  SearchIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  UsersIcon,
  XIcon,
  ZapIcon,
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

import { FilterSelect } from '@/features/shared/components/filter-select';
import { getStatusStyles } from '@/features/shared/lib/status-styles';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
} from '@/layout/shell';

import {
  allTransactionPolicies,
  formatApprovalRequirement,
  formatSpendingLimit,
  type PolicyStatus,
} from './data/transaction-policies';

type SelectOption = { id: string; label: string };

const STATUS_OPTIONS: SelectOption[] = [
  { id: 'all', label: 'All Status' },
  { id: 'active', label: 'Active' },
  { id: 'pending', label: 'Pending' },
  { id: 'draft', label: 'Draft' },
  { id: 'disabled', label: 'Disabled' },
];

const SCOPE_OPTIONS: SelectOption[] = [
  { id: 'all', label: 'All Scopes' },
  { id: 'global', label: 'Global' },
  { id: 'vault', label: 'Vault' },
  { id: 'address', label: 'Address' },
];

const PAGE_SIZE_OPTIONS: SelectOption[] = [
  { id: '5', label: '5' },
  { id: '10', label: '10' },
  { id: '25', label: '25' },
];

const getStatusIcon = (status: PolicyStatus) => {
  switch (status) {
    case 'active':
      return <PlayCircleIcon className="size-3" />;
    case 'pending':
      return <ClockIcon className="size-3" />;
    case 'draft':
      return <FileTextIcon className="size-3" />;
    case 'disabled':
      return <PauseCircleIcon className="size-3" />;
  }
};

const getApprovalTypeIcon = (type: string) => {
  switch (type) {
    case 'threshold':
      return <UsersIcon className="size-3" />;
    case 'unanimous':
      return <ShieldCheckIcon className="size-3" />;
    case 'any':
      return <ZapIcon className="size-3" />;
    case 'tiered':
      return <ShieldAlertIcon className="size-3" />;
    default:
      return <UsersIcon className="size-3" />;
  }
};

const getPriorityLabel = (priority: number) => {
  if (priority === 0) return 'Critical';
  if (priority === 1) return 'High';
  if (priority <= 3) return 'Medium';
  return 'Low';
};

const getPriorityStyles = (priority: number) => {
  if (priority === 0) return 'bg-negative-100 text-negative-700';
  if (priority === 1) return 'bg-warning-100 text-warning-700';
  if (priority <= 3) return 'bg-neutral-100 text-neutral-600';
  return 'bg-neutral-50 text-neutral-400';
};

const DEFAULT_STATUS = STATUS_OPTIONS[0]!;
const DEFAULT_SCOPE = SCOPE_OPTIONS[0]!;
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[1]!;

export const PageTransactionPolicies = () => {
  const navigate = useNavigate();

  // Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SelectOption | null>(
    DEFAULT_STATUS
  );
  const [scopeFilter, setScopeFilter] = useState<SelectOption | null>(
    DEFAULT_SCOPE
  );

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSizeOption, setPageSizeOption] = useState<SelectOption | null>(
    DEFAULT_PAGE_SIZE
  );
  const pageSize = pageSizeOption ? Number(pageSizeOption.id) : 10;

  // Filter logic
  const filteredPolicies = useMemo(() => {
    return allTransactionPolicies.filter((policy) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          policy.name.toLowerCase().includes(searchLower) ||
          policy.description.toLowerCase().includes(searchLower) ||
          policy.createdBy.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      const statusId = statusFilter?.id ?? 'all';
      if (statusId !== 'all' && policy.status !== statusId) {
        return false;
      }

      // Scope filter
      const scopeId = scopeFilter?.id ?? 'all';
      if (scopeId !== 'all' && policy.scope !== scopeId) {
        return false;
      }

      return true;
    });
  }, [search, statusFilter, scopeFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredPolicies.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedPolicies = filteredPolicies.slice(startIndex, endIndex);

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

  const handleScopeChange = (value: SelectOption) => {
    setScopeFilter(value);
    handleFilterChange();
  };

  const handlePageSizeChange = (value: SelectOption) => {
    setPageSizeOption(value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter(DEFAULT_STATUS);
    setScopeFilter(DEFAULT_SCOPE);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    search || statusFilter?.id !== 'all' || scopeFilter?.id !== 'all';

  // Stats
  const activePolicies = allTransactionPolicies.filter(
    (p) => p.status === 'active'
  ).length;
  const totalTriggers = allTransactionPolicies.reduce(
    (sum, p) => sum + p.triggerCount,
    0
  );

  return (
    <PageLayout>
      <PageLayoutTopBar
        title="Transaction Policies"
        actions={
          <Button className="h-7 rounded-none bg-brand-500 px-3 text-xs font-medium text-white hover:bg-brand-600">
            <PlusIcon className="mr-1.5 size-3.5" />
            Create Policy
          </Button>
        }
      />
      <PageLayoutContent containerClassName="py-4">
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-5 gap-px bg-neutral-200">
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Total Policies
              </p>
              <p className="mt-1 text-lg font-semibold text-neutral-900 tabular-nums">
                {allTransactionPolicies.length}
              </p>
            </div>
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Active
              </p>
              <p className="mt-1 text-lg font-semibold text-positive-600 tabular-nums">
                {activePolicies}
              </p>
            </div>
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Pending Approval
              </p>
              <p className="mt-1 text-lg font-semibold text-warning-600 tabular-nums">
                {
                  allTransactionPolicies.filter((p) => p.status === 'pending')
                    .length
                }
              </p>
            </div>
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Total Triggers
              </p>
              <p className="mt-1 text-lg font-semibold text-neutral-900 tabular-nums">
                {totalTriggers.toLocaleString()}
              </p>
            </div>
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Drafts
              </p>
              <p className="mt-1 text-lg font-semibold text-neutral-500 tabular-nums">
                {
                  allTransactionPolicies.filter((p) => p.status === 'draft')
                    .length
                }
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
                  placeholder="Search policies..."
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

              {/* Scope Filter */}
              <FilterSelect
                options={SCOPE_OPTIONS}
                value={scopeFilter}
                onChange={handleScopeChange}
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
              {filteredPolicies.length}{' '}
              {filteredPolicies.length === 1 ? 'result' : 'results'}
            </span>
          </div>

          {/* Policies Table */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
              <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                Transaction Policies
              </h2>
              <div className="flex items-center gap-2">
                <ArrowRightLeftIcon className="size-4 text-brand-500" />
                <span className="text-xs text-neutral-500">
                  Rules governing transaction approvals
                </span>
              </div>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-left">
                  <th className="px-3 py-2 font-medium text-neutral-500">
                    Policy
                  </th>
                  <th className="px-3 py-2 font-medium text-neutral-500">
                    Scope
                  </th>
                  <th className="px-3 py-2 font-medium text-neutral-500">
                    Approval
                  </th>
                  <th className="px-3 py-2 font-medium text-neutral-500">
                    Limits
                  </th>
                  <th className="px-3 py-2 font-medium text-neutral-500">
                    Status
                  </th>
                  <th className="px-3 py-2 font-medium text-neutral-500">
                    Triggers
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-neutral-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {paginatedPolicies.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-neutral-500"
                    >
                      No policies found matching your filters.
                    </td>
                  </tr>
                ) : (
                  paginatedPolicies.map((policy) => {
                    // Check if policy has a draft version in progress
                    const hasDraftVersion = policy.versions?.some(
                      (v) => v.status === 'draft'
                    );
                    // Check if policy has a pending version awaiting approval
                    const hasPendingVersion = policy.versions?.some(
                      (v) => v.status === 'pending'
                    );

                    return (
                      <tr
                        key={policy.id}
                        className="group cursor-pointer hover:bg-neutral-50"
                        onClick={() => {
                          navigate({
                            to: '/policies/transactions/$policyId',
                            params: { policyId: policy.id },
                          });
                        }}
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-start gap-2">
                            <span
                              className={cn(
                                'mt-0.5 inline-flex rounded px-1 py-0.5 text-[9px] font-bold uppercase',
                                getPriorityStyles(policy.priority)
                              )}
                            >
                              {getPriorityLabel(policy.priority)}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-neutral-900">
                                  {policy.name}
                                </p>
                                {hasDraftVersion && (
                                  <span className="inline-flex items-center gap-0.5 rounded bg-brand-100 px-1 py-0.5 text-[9px] font-medium text-brand-700">
                                    <FileTextIcon className="size-2.5" />
                                    Draft
                                  </span>
                                )}
                                {hasPendingVersion && (
                                  <span className="inline-flex items-center gap-0.5 rounded bg-warning-100 px-1 py-0.5 text-[9px] font-medium text-warning-700">
                                    <ClockIcon className="size-2.5" />
                                    Pending
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 max-w-[200px] truncate text-[10px] text-neutral-400">
                                {policy.description}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            {policy.scope === 'global' ? (
                              <GlobeIcon className="size-3 text-neutral-400" />
                            ) : (
                              <KeyIcon className="size-3 text-neutral-400" />
                            )}
                            <div className="flex flex-col">
                              <span className="text-neutral-600 capitalize">
                                {policy.scope}
                              </span>
                              {policy.vaultName && (
                                <span className="text-[10px] text-neutral-400">
                                  {policy.vaultName}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              {getApprovalTypeIcon(policy.approvalType)}
                              <span className="font-mono text-xs font-medium text-neutral-900">
                                {formatApprovalRequirement(
                                  policy.approvalRequirement
                                )}
                              </span>
                            </div>
                            <span className="text-[10px] text-neutral-400 capitalize">
                              {policy.approvalType}
                              {policy.approvalRequirement.timeoutHours && (
                                <span className="ml-1">
                                  · {policy.approvalRequirement.timeoutHours}h
                                  timeout
                                </span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {policy.spendingLimits &&
                          policy.spendingLimits.length > 0 ? (
                            <div className="flex flex-col gap-0.5">
                              {policy.spendingLimits
                                .slice(0, 2)
                                .map((limit, idx) => (
                                  <span
                                    key={idx}
                                    className="font-mono text-[10px] text-neutral-600"
                                  >
                                    {formatSpendingLimit(limit)}
                                  </span>
                                ))}
                              {policy.spendingLimits.length > 2 && (
                                <span className="text-[10px] text-neutral-400">
                                  +{policy.spendingLimits.length - 2} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-neutral-400">No limits</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
                              getStatusStyles(policy.status)
                            )}
                          >
                            {getStatusIcon(policy.status)}
                            {policy.status}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col">
                            <span className="font-mono text-neutral-900 tabular-nums">
                              {policy.triggerCount.toLocaleString()}
                            </span>
                            {policy.lastTriggered && (
                              <span className="text-[10px] text-neutral-400">
                                Last: {policy.lastTriggered}
                              </span>
                            )}
                          </div>
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
                                  to="/policies/transactions/$policyId"
                                  params={{ policyId: policy.id }}
                                >
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                asChild
                                className="cursor-pointer rounded-none text-xs"
                              >
                                <Link
                                  to="/policies/transactions/$policyId/versions/$versionNumber"
                                  params={{
                                    policyId: policy.id,
                                    versionNumber: String(
                                      hasDraftVersion
                                        ? (policy.versions?.find(
                                            (v) => v.status === 'draft'
                                          )?.version ?? policy.currentVersion)
                                        : policy.currentVersion
                                    ),
                                  }}
                                >
                                  {hasDraftVersion
                                    ? 'Edit Draft'
                                    : 'View Current Version'}
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                asChild
                                className="cursor-pointer rounded-none text-xs"
                              >
                                <Link
                                  to="/policies/transactions/$policyId"
                                  params={{ policyId: policy.id }}
                                  search={{ tab: 'history' }}
                                >
                                  View History
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {policy.status === 'active' ? (
                                <DropdownMenuItem className="cursor-pointer rounded-none text-xs text-warning-600">
                                  Disable
                                </DropdownMenuItem>
                              ) : policy.status === 'disabled' ? (
                                <DropdownMenuItem className="cursor-pointer rounded-none text-xs text-positive-600">
                                  Enable
                                </DropdownMenuItem>
                              ) : policy.status === 'draft' ? (
                                <DropdownMenuItem className="cursor-pointer rounded-none text-xs text-positive-600">
                                  Submit for Review
                                </DropdownMenuItem>
                              ) : policy.status === 'pending' ? (
                                <DropdownMenuItem className="cursor-pointer rounded-none text-xs text-positive-600">
                                  Approve
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {filteredPolicies.length > 0 && (
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
                    {Math.min(endIndex, filteredPolicies.length)} of{' '}
                    {filteredPolicies.length}
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
