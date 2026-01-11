import { Link } from '@tanstack/react-router';
import { CheckIcon, ChevronDownIcon, SearchIcon, XIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

import { cn } from '@/lib/tailwind/utils';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  NotificationButton,
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/treasury-6';

import { TransactionsTable } from '../components/transactions-table';
import { mockTransactions } from '../data/mock-transactions';

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

const STATUS_OPTIONS: FilterSelectOption[] = [
  { id: 'all', label: 'All Status' },
  { id: 'pending_l1', label: 'Pending L1' },
  { id: 'pending_l2', label: 'Pending L2' },
  { id: 'under_l1_review', label: 'Under L1 Review' },
  { id: 'under_l2_review', label: 'Under L2 Review' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

const RISK_OPTIONS: FilterSelectOption[] = [
  { id: 'all', label: 'All Risk' },
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'severe', label: 'Severe' },
];

const DEFAULT_STATUS = STATUS_OPTIONS[0]!;
const DEFAULT_RISK = RISK_OPTIONS[0]!;

export const PageComplianceTransactions = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterSelectOption | null>(
    DEFAULT_STATUS
  );
  const [riskFilter, setRiskFilter] = useState<FilterSelectOption | null>(
    DEFAULT_RISK
  );

  const filteredTransactions = useMemo(() => {
    return mockTransactions.filter((tx) => {
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          tx.hash.toLowerCase().includes(searchLower) ||
          tx.toAddress?.toLowerCase().includes(searchLower) ||
          tx.fromAddress?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      const statusId = statusFilter?.id ?? 'all';
      if (statusId !== 'all' && tx.status !== statusId) {
        return false;
      }

      const riskId = riskFilter?.id ?? 'all';
      if (riskId !== 'all' && tx.riskLevel !== riskId) {
        return false;
      }

      return true;
    });
  }, [search, statusFilter, riskFilter]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter(DEFAULT_STATUS);
    setRiskFilter(DEFAULT_RISK);
  };

  const hasActiveFilters =
    search || statusFilter?.id !== 'all' || riskFilter?.id !== 'all';

  return (
    <PageLayout>
      <PageLayoutTopBar
        endActions={
          <div className="flex items-center gap-3">
            <NotificationButton />
          </div>
        }
      >
        <PageLayoutTopBarTitle>
          <div className="flex items-center gap-2">
            <Link
              to="/compliance"
              className="text-neutral-500 hover:text-neutral-700"
            >
              Compliance
            </Link>
            <span className="text-neutral-400">/</span>
            <span>Transactions</span>
          </div>
        </PageLayoutTopBarTitle>
      </PageLayoutTopBar>
      <PageLayoutContent containerClassName="py-4">
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center justify-between border border-neutral-200 bg-white px-3 py-2">
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <SearchIcon className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-7 w-48 border border-neutral-200 bg-neutral-50 pr-2 pl-7 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                />
              </div>

              {/* Status Filter */}
              <FilterSelect
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={setStatusFilter}
                className="w-32"
              />

              {/* Risk Filter */}
              <FilterSelect
                options={RISK_OPTIONS}
                value={riskFilter}
                onChange={setRiskFilter}
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
              {filteredTransactions.length}{' '}
              {filteredTransactions.length === 1 ? 'result' : 'results'}
            </span>
          </div>

          {/* Table */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
              <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                Transactions
              </h2>
            </div>
            <TransactionsTable transactions={filteredTransactions} />
          </div>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
