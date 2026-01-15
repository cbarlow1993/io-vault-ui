import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import {
  AlertTriangleIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  XIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { orpc } from '@/lib/orpc/client';
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
  getDeviceIcon,
  getDeviceLabel,
} from '@/features/shared/lib/device-helpers';
import {
  getHealthLabel,
  getHealthStyles,
  getStatusStyles,
} from '@/features/shared/lib/status-styles';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
} from '@/layout/shell';

import { NewSignerModal } from './components/new-signer-modal';
import { RenameSignerModal } from './components/rename-signer-modal';
import { RevokeSignerModal } from './components/revoke-signer-modal';
import { SignerConfigModal } from './components/signer-config-modal';
import {
  getSignerHealthStatus,
  isVersionOutdated,
  LATEST_VERSIONS,
  type RegisteredSigner,
  type SignerType,
} from './data/signers';
import type {
  SignerStatus as SchemaSignerStatus,
  SignerType as SchemaSignerType,
} from './schema';

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

// Columns need to be defined outside the component or memoized to prevent recreation on every render
const createSignerColumns = (
  onConfigClick: (signer: RegisteredSigner) => void,
  onRenameClick: (signer: RegisteredSigner) => void,
  onRevokeClick: (signer: RegisteredSigner) => void
): ColumnDef<RegisteredSigner, unknown>[] => [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const signer = row.original;
      return (
        <div>
          <p className="font-medium text-neutral-900">{signer.name}</p>
          <p className="text-[10px] text-neutral-400">
            {signer.owner} · {signer.deviceInfo}
          </p>
        </div>
      );
    },
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const signer = row.original;
      return (
        <div className="flex items-center gap-2">
          <span className="text-neutral-400">{getDeviceIcon(signer.type)}</span>
          <span className="text-neutral-600">
            {getDeviceLabel(signer.type)}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'version',
    header: 'Version',
    cell: ({ row }) => <VersionBadge signer={row.original} />,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const signer = row.original;
      return (
        <span
          className={cn(
            'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
            getStatusStyles(signer.status)
          )}
        >
          {signer.status}
        </span>
      );
    },
  },
  {
    accessorKey: 'vaultsCount',
    header: 'Vaults',
    cell: ({ row }) => (
      <span className="text-neutral-600 tabular-nums">
        {row.original.vaultsCount}
      </span>
    ),
  },
  {
    id: 'lastSeen',
    header: 'Last Seen',
    cell: ({ row }) => <HealthIndicator signer={row.original} />,
  },
  {
    id: 'actions',
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => {
      const signer = row.original;
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
            <DropdownMenuContent align="end" className="w-40 rounded-none">
              <DropdownMenuItem
                asChild
                className="cursor-pointer rounded-none text-xs"
              >
                <Link
                  to="/treasury/signers/$signerId"
                  params={{ signerId: signer.id }}
                >
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onConfigClick(signer)}
                className="cursor-pointer rounded-none text-xs"
              >
                <SettingsIcon className="mr-2 size-3.5" />
                View Config
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onRenameClick(signer)}
                className="cursor-pointer rounded-none text-xs"
              >
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onRevokeClick(signer)}
                className="cursor-pointer rounded-none text-xs text-negative-600"
                disabled={signer.status === 'revoked'}
              >
                Revoke Signer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];

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

  // Fetch signers from API
  const {
    data: signersData,
    isLoading,
    isError,
    refetch,
  } = useQuery(
    orpc.signers.list.queryOptions({
      limit: 50, // Fetch enough for client-side pagination initially
      status:
        statusFilter?.id !== 'all'
          ? (statusFilter?.id as SchemaSignerStatus)
          : undefined,
      type:
        typeFilter?.id !== 'all'
          ? (typeFilter?.id as SchemaSignerType)
          : undefined,
      search: search || undefined,
    })
  );

  // Use fetched data or empty array while loading
  // Data is already filtered server-side by status, type, and search (name/owner)
  const filteredSigners = signersData?.data ?? [];

  // Memoize columns to prevent recreation on every render
  const columns = useMemo(
    () =>
      createSignerColumns(
        setConfigModalSigner,
        setRenameModalSigner,
        setRevokeModalSigner
      ),
    []
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const handleStatusChange = (value: SelectOption) => {
    setStatusFilter(value);
  };

  const handleTypeChange = (value: SelectOption) => {
    setTypeFilter(value);
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter(DEFAULT_STATUS);
    setTypeFilter(DEFAULT_TYPE);
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
                {isLoading ? '—' : filteredSigners.length}
              </p>
            </div>
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                iOS
              </p>
              <p className="mt-1 text-lg font-semibold text-neutral-900 tabular-nums">
                {isLoading
                  ? '—'
                  : filteredSigners.filter((s) => s.type === 'ios').length}
              </p>
            </div>
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Android
              </p>
              <p className="mt-1 text-lg font-semibold text-neutral-900 tabular-nums">
                {isLoading
                  ? '—'
                  : filteredSigners.filter((s) => s.type === 'android').length}
              </p>
            </div>
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Virtual
              </p>
              <p className="mt-1 text-lg font-semibold text-neutral-900 tabular-nums">
                {isLoading
                  ? '—'
                  : filteredSigners.filter((s) => s.type === 'virtual').length}
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
          <DataTable
            columns={columns}
            data={filteredSigners}
            getRowId={(row) => row.id}
            onRowClick={(row) =>
              navigate({
                to: '/treasury/signers/$signerId',
                params: { signerId: row.id },
              })
            }
            pageSizeOptions={[5, 10, 25, 50]}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
          />
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
