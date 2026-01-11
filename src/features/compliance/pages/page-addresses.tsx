import { Link } from '@tanstack/react-router';
import {
  CheckIcon,
  ChevronDownIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';
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

import { AddressesTable } from '../components/addresses-table';
import { mockAddresses } from '../data/mock-addresses';

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

const TYPE_OPTIONS: FilterSelectOption[] = [
  { id: 'all', label: 'All Addresses' },
  { id: 'internal', label: 'Internal' },
  { id: 'external', label: 'External' },
  { id: 'watchlist', label: 'Watchlist' },
];

const RISK_OPTIONS: FilterSelectOption[] = [
  { id: 'all', label: 'All Risk' },
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'severe', label: 'Severe' },
];

const DEFAULT_TYPE = TYPE_OPTIONS[0]!;
const DEFAULT_RISK = RISK_OPTIONS[0]!;

export const PageComplianceAddresses = () => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterSelectOption | null>(
    DEFAULT_TYPE
  );
  const [riskFilter, setRiskFilter] = useState<FilterSelectOption | null>(
    DEFAULT_RISK
  );

  const filteredAddresses = useMemo(() => {
    return mockAddresses.filter((addr) => {
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          addr.address.toLowerCase().includes(searchLower) ||
          addr.label?.toLowerCase().includes(searchLower) ||
          addr.tags.some((tag) => tag.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      const typeId = typeFilter?.id ?? 'all';
      if (typeId === 'watchlist' && !addr.isWatchlisted) {
        return false;
      }

      const riskId = riskFilter?.id ?? 'all';
      if (riskId !== 'all' && addr.riskLevel !== riskId) {
        return false;
      }

      return true;
    });
  }, [search, typeFilter, riskFilter]);

  const clearFilters = () => {
    setSearch('');
    setTypeFilter(DEFAULT_TYPE);
    setRiskFilter(DEFAULT_RISK);
  };

  const hasActiveFilters =
    search || typeFilter?.id !== 'all' || riskFilter?.id !== 'all';

  return (
    <PageLayout>
      <PageLayoutTopBar
        endActions={
          <div className="flex items-center gap-3">
            <Button className="h-7 rounded-none bg-brand-500 px-3 text-xs font-medium text-white hover:bg-brand-600">
              <PlusIcon className="mr-1.5 size-3.5" />
              Add to Watchlist
            </Button>
            <div className="h-4 w-px bg-neutral-200" />
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
            <span>Addresses</span>
          </div>
        </PageLayoutTopBarTitle>
      </PageLayoutTopBar>
      <PageLayoutContent containerClassName="py-4">
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-px bg-neutral-200">
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Total Addresses
              </p>
              <p className="mt-1 text-lg font-semibold text-neutral-900 tabular-nums">
                {mockAddresses.length}
              </p>
            </div>
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Watchlisted
              </p>
              <p className="mt-1 text-lg font-semibold text-warning-600 tabular-nums">
                {mockAddresses.filter((a) => a.isWatchlisted).length}
              </p>
            </div>
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                High Risk
              </p>
              <p className="mt-1 text-lg font-semibold text-negative-600 tabular-nums">
                {
                  mockAddresses.filter(
                    (a) => a.riskLevel === 'high' || a.riskLevel === 'severe'
                  ).length
                }
              </p>
            </div>
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Low Risk
              </p>
              <p className="mt-1 text-lg font-semibold text-positive-600 tabular-nums">
                {mockAddresses.filter((a) => a.riskLevel === 'low').length}
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
                  placeholder="Search addresses..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-7 w-48 border border-neutral-200 bg-neutral-50 pr-2 pl-7 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                />
              </div>

              {/* Type Filter */}
              <FilterSelect
                options={TYPE_OPTIONS}
                value={typeFilter}
                onChange={setTypeFilter}
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
              {filteredAddresses.length}{' '}
              {filteredAddresses.length === 1 ? 'result' : 'results'}
            </span>
          </div>

          {/* Table */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
              <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                Monitored Addresses
              </h2>
            </div>
            <AddressesTable addresses={filteredAddresses} />
          </div>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
