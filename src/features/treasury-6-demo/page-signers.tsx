import { Link, useNavigate } from '@tanstack/react-router';
import {
  AlertTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  ServerIcon,
  SettingsIcon,
  SmartphoneIcon,
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

import { FilterSelect } from './components/filter-select';
import {
  getHealthLabel,
  getHealthStyles,
  getStatusStyles,
} from './lib/status-styles';

import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
} from '@/layout/treasury-6';

import { NewSignerModal } from './components/new-signer-modal';
import { RenameSignerModal } from './components/rename-signer-modal';
import { RevokeSignerModal } from './components/revoke-signer-modal';
import { SignerConfigModal } from './components/signer-config-modal';
import {
  allSigners,
  getSignerHealthStatus,
  isVersionOutdated,
  LATEST_VERSIONS,
  type RegisteredSigner,
  type SignerType,
} from './data/signers';

type SelectOption = { id: string; label: string };

const STATUS_OPTIONS: SelectOption[] = [
  { id: 'all', label: 'All Status' },
  { id: 'active', label: 'Active' },
  { id: 'pending', label: 'Pending' },
  { id: 'revoked', label: 'Revoked' },
];

const TYPE_OPTIONS: SelectOption[] = [
  { id: 'all', label: 'All Types' },
  { id: 'ios', label: 'iOS' },
  { id: 'android', label: 'Android' },
  { id: 'virtual', label: 'Virtual' },
];

const PAGE_SIZE_OPTIONS_SELECT: SelectOption[] = [
  { id: '5', label: '5' },
  { id: '10', label: '10' },
  { id: '25', label: '25' },
  { id: '50', label: '50' },
];

const getTypeIcon = (type: SignerType) => {
  switch (type) {
    case 'ios':
    case 'android':
      return <SmartphoneIcon className="size-4" />;
    case 'virtual':
      return <ServerIcon className="size-4" />;
  }
};

const getTypeLabel = (type: SignerType) => {
  switch (type) {
    case 'ios':
      return 'iOS';
    case 'android':
      return 'Android';
    case 'virtual':
      return 'Virtual';
  }
};

const HealthIndicator = ({ signer }: { signer: RegisteredSigner }) => {
  const health = getSignerHealthStatus(signer);
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn('size-2 rounded-full', getHealthStyles(health))}
        title={getHealthLabel(health)}
      />
      <span className="text-neutral-500">{signer.lastSeen ?? 'Never'}</span>
    </div>
  );
};

const VersionBadge = ({ signer }: { signer: RegisteredSigner }) => {
  const outdated = isVersionOutdated(signer.version, signer.type);
  const latestVersion = LATEST_VERSIONS[signer.type];

  if (outdated) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-neutral-600">v{signer.version}</span>
        <span
          className="inline-flex items-center gap-0.5 bg-warning-100 px-1 py-0.5 text-[9px] font-medium text-warning-700"
          title={`Latest version: v${latestVersion}`}
        >
          <AlertTriangleIcon className="size-2.5" />
          Update
        </span>
      </div>
    );
  }

  return <span className="font-mono text-neutral-600">v{signer.version}</span>;
};

const DEFAULT_STATUS = STATUS_OPTIONS[0]!;
const DEFAULT_TYPE = TYPE_OPTIONS[0]!;
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS_SELECT[1]!;

type PageSignersProps = {
  initialModalOpen?: boolean;
};

export const PageSigners = ({ initialModalOpen = false }: PageSignersProps) => {
  const navigate = useNavigate();

  // Modal state
  const [isNewSignerModalOpen, setIsNewSignerModalOpen] =
    useState(initialModalOpen);
  const [renameModalSigner, setRenameModalSigner] =
    useState<RegisteredSigner | null>(null);
  const [revokeModalSigner, setRevokeModalSigner] =
    useState<RegisteredSigner | null>(null);
  const [configModalSigner, setConfigModalSigner] =
    useState<RegisteredSigner | null>(null);

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
  const filteredSigners = useMemo(() => {
    return allSigners.filter((signer) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          signer.name.toLowerCase().includes(searchLower) ||
          signer.owner.toLowerCase().includes(searchLower) ||
          signer.version.toLowerCase().includes(searchLower) ||
          (signer.deviceInfo?.toLowerCase().includes(searchLower) ?? false);
        if (!matchesSearch) return false;
      }

      // Status filter
      const statusId = statusFilter?.id ?? 'all';
      if (statusId !== 'all' && signer.status !== statusId) {
        return false;
      }

      // Type filter
      const typeId = typeFilter?.id ?? 'all';
      if (typeId !== 'all' && signer.type !== typeId) {
        return false;
      }

      return true;
    });
  }, [search, statusFilter, typeFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredSigners.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedSigners = filteredSigners.slice(startIndex, endIndex);

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

  // Modal handlers
  const handleRename = (signerId: string, newName: string) => {
    // In a real app, this would call an API to rename the signer
    console.log(`Renaming signer ${signerId} to ${newName}`);
  };

  const handleRevoke = (signerId: string) => {
    // In a real app, this would call an API to revoke the signer
    console.log(`Revoking signer ${signerId}`);
  };

  return (
    <PageLayout>
      <PageLayoutTopBar
        title="Signers"
        actions={
          <Button
            onClick={() => setIsNewSignerModalOpen(true)}
            className="h-7 rounded-none bg-brand-500 px-3 text-xs font-medium text-white hover:bg-brand-600"
          >
            <PlusIcon className="mr-1.5 size-3.5" />
            New Signer
          </Button>
        }
      />
      <PageLayoutContent containerClassName="py-4">
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-px bg-neutral-200">
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Total Signers
              </p>
              <p className="mt-1 text-lg font-semibold text-neutral-900 tabular-nums">
                {allSigners.length}
              </p>
            </div>
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                iOS
              </p>
              <p className="mt-1 text-lg font-semibold text-neutral-900 tabular-nums">
                {allSigners.filter((s) => s.type === 'ios').length}
              </p>
            </div>
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Android
              </p>
              <p className="mt-1 text-lg font-semibold text-neutral-900 tabular-nums">
                {allSigners.filter((s) => s.type === 'android').length}
              </p>
            </div>
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Virtual
              </p>
              <p className="mt-1 text-lg font-semibold text-neutral-900 tabular-nums">
                {allSigners.filter((s) => s.type === 'virtual').length}
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
                  placeholder="Search signers..."
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
              {filteredSigners.length}{' '}
              {filteredSigners.length === 1 ? 'result' : 'results'}
            </span>
          </div>

          {/* Signers Table */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
              <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                Registered Signers
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
                    Version
                  </th>
                  <th className="px-3 py-2 font-medium text-neutral-500">
                    Status
                  </th>
                  <th className="px-3 py-2 font-medium text-neutral-500">
                    Vaults
                  </th>
                  <th className="px-3 py-2 font-medium text-neutral-500">
                    Last Seen
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-neutral-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {paginatedSigners.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-neutral-500"
                    >
                      No signers found matching your filters.
                    </td>
                  </tr>
                ) : (
                  paginatedSigners.map((signer) => (
                    <tr
                      key={signer.id}
                      onClick={() =>
                        navigate({
                          to: '/signers/$signerId',
                          params: { signerId: signer.id },
                        })
                      }
                      className="cursor-pointer hover:bg-neutral-50"
                    >
                      <td className="px-3 py-2">
                        <p className="font-medium text-neutral-900">
                          {signer.name}
                        </p>
                        <p className="text-[10px] text-neutral-400">
                          {signer.owner} · {signer.deviceInfo}
                        </p>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-neutral-400">
                            {getTypeIcon(signer.type)}
                          </span>
                          <span className="text-neutral-600">
                            {getTypeLabel(signer.type)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <VersionBadge signer={signer} />
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
                            getStatusStyles(signer.status)
                          )}
                        >
                          {signer.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-neutral-600 tabular-nums">
                          {signer.vaultsCount}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <HealthIndicator signer={signer} />
                      </td>
                      <td
                        className="px-3 py-2 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
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
                            <DropdownMenuItem
                              asChild
                              className="cursor-pointer rounded-none text-xs"
                            >
                              <Link
                                to="/signers/$signerId"
                                params={{ signerId: signer.id }}
                              >
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setConfigModalSigner(signer)}
                              className="cursor-pointer rounded-none text-xs"
                            >
                              <SettingsIcon className="mr-2 size-3.5" />
                              View Config
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setRenameModalSigner(signer)}
                              className="cursor-pointer rounded-none text-xs"
                            >
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setRevokeModalSigner(signer)}
                              className="cursor-pointer rounded-none text-xs text-negative-600"
                              disabled={signer.status === 'revoked'}
                            >
                              Revoke Signer
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
            {filteredSigners.length > 0 && (
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
                    {Math.min(endIndex, filteredSigners.length)} of{' '}
                    {filteredSigners.length}
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
                    disabled={currentPage === totalPages || totalPages === 0}
                    className={cn(
                      'flex size-7 items-center justify-center border border-neutral-200',
                      currentPage === totalPages || totalPages === 0
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
                    disabled={currentPage === totalPages || totalPages === 0}
                    className={cn(
                      'flex size-7 items-center justify-center border border-neutral-200',
                      currentPage === totalPages || totalPages === 0
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

      {/* New Signer Modal */}
      <NewSignerModal
        open={isNewSignerModalOpen}
        onOpenChange={setIsNewSignerModalOpen}
      />

      {/* Rename Signer Modal */}
      <RenameSignerModal
        open={renameModalSigner !== null}
        onOpenChange={(open) => !open && setRenameModalSigner(null)}
        signer={renameModalSigner}
        onRename={handleRename}
      />

      {/* Revoke Signer Modal */}
      <RevokeSignerModal
        open={revokeModalSigner !== null}
        onOpenChange={(open) => !open && setRevokeModalSigner(null)}
        signer={revokeModalSigner}
        onRevoke={handleRevoke}
      />

      {/* Signer Config Modal */}
      <SignerConfigModal
        open={configModalSigner !== null}
        onOpenChange={(open) => !open && setConfigModalSigner(null)}
        signer={configModalSigner}
      />
    </PageLayout>
  );
};
