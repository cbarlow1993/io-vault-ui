import { Link, useNavigate, useParams } from '@tanstack/react-router';
import {
  AlertTriangleIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ClockIcon,
  CopyIcon,
  EditIcon,
  ExternalLinkIcon,
  FileEditIcon,
  GitBranchIcon,
  GlobeIcon,
  HistoryIcon,
  KeyIcon,
  ListIcon,
  LockIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  SendIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  TrashIcon,
  UserIcon,
  XCircleIcon,
  XIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  FilterSelect,
  type FilterSelectOption,
} from '@/features/shared/components/filter-select';
import { getStatusStyles } from '@/features/shared/lib/status-styles';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
} from '@/layout/shell';

import {
  getWhitelistById,
  type WhitelistChangeType,
  type WhitelistEntry,
  type WhitelistStatus,
} from './data/whitelists';

const getStatusIcon = (status: WhitelistStatus) => {
  switch (status) {
    case 'active':
      return <ShieldCheckIcon className="size-3.5" />;
    case 'draft':
      return <FileEditIcon className="size-3.5" />;
    case 'pending':
      return <ClockIcon className="size-3.5" />;
    case 'superseded':
      return <LockIcon className="size-3.5" />;
    case 'expired':
      return <XCircleIcon className="size-3.5" />;
    case 'revoked':
      return <XIcon className="size-3.5" />;
  }
};

const getEntryTypeStyles = (type: string) => {
  switch (type) {
    case 'address':
      return 'bg-brand-100 text-brand-700';
    case 'contract':
      return 'bg-indigo-100 text-indigo-700';
    case 'entity':
      return 'bg-terminal-100 text-terminal-700';
    default:
      return 'bg-neutral-100 text-neutral-600';
  }
};

const getChangeTypeIcon = (type: WhitelistChangeType) => {
  switch (type) {
    case 'created':
      return <PlusIcon className="size-3.5" />;
    case 'name_updated':
    case 'description_updated':
      return <EditIcon className="size-3.5" />;
    case 'entry_added':
      return <PlusIcon className="size-3.5" />;
    case 'entry_removed':
      return <TrashIcon className="size-3.5" />;
    case 'entry_updated':
      return <EditIcon className="size-3.5" />;
    case 'status_changed':
      return <ShieldAlertIcon className="size-3.5" />;
    case 'submitted_for_approval':
      return <SendIcon className="size-3.5" />;
    case 'approved':
      return <CheckIcon className="size-3.5" />;
    case 'approvals_reset':
      return <AlertTriangleIcon className="size-3.5" />;
    case 'revoked':
      return <XCircleIcon className="size-3.5" />;
    case 'expired':
      return <ClockIcon className="size-3.5" />;
    default:
      return <HistoryIcon className="size-3.5" />;
  }
};

const getChangeTypeStyles = (type: WhitelistChangeType) => {
  switch (type) {
    case 'created':
      return 'bg-brand-100 text-brand-700';
    case 'approved':
      return 'bg-positive-100 text-positive-700';
    case 'entry_added':
      return 'bg-terminal-100 text-terminal-700';
    case 'entry_removed':
    case 'revoked':
      return 'bg-negative-100 text-negative-600';
    case 'status_changed':
    case 'submitted_for_approval':
      return 'bg-warning-100 text-warning-700';
    case 'approvals_reset':
      return 'bg-negative-100 text-negative-600';
    case 'expired':
      return 'bg-neutral-100 text-neutral-500';
    default:
      return 'bg-neutral-100 text-neutral-600';
  }
};

const formatDateTime = (isoString: string) => {
  const date = new Date(isoString);
  return {
    date: date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    time: date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
};

type SelectOption = { id: string; label: string };

const TYPE_OPTIONS: SelectOption[] = [
  { id: 'all', label: 'All Types' },
  { id: 'address', label: 'Address' },
  { id: 'contract', label: 'Contract' },
  { id: 'entity', label: 'Entity' },
];

const CHAIN_OPTIONS: SelectOption[] = [
  { id: 'all', label: 'All Chains' },
  { id: 'Ethereum', label: 'Ethereum' },
  { id: 'Bitcoin', label: 'Bitcoin' },
  { id: 'Polygon', label: 'Polygon' },
];

const PAGE_SIZE_OPTIONS: SelectOption[] = [
  { id: '5', label: '5' },
  { id: '10', label: '10' },
  { id: '25', label: '25' },
];

const DEFAULT_TYPE = TYPE_OPTIONS[0]!;
const DEFAULT_CHAIN = CHAIN_OPTIONS[0]!;
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[1]!;

export const PageWhitelistDetail = () => {
  const { whitelistId } = useParams({
    from: '/_app/treasury/policies/whitelists/$whitelistId/',
  });
  const navigate = useNavigate();
  const whitelist = getWhitelistById(whitelistId);

  // Tab state
  const [activeTab, setActiveTab] = useState<'entries' | 'history'>('entries');

  // Dialog states
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [deleteEntryDialogOpen, setDeleteEntryDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<WhitelistEntry | null>(
    null
  );

  // Version history state
  const [selectedVersionFilter, setSelectedVersionFilter] = useState<
    number | null
  >(null);

  // Entry filter state
  const [entrySearch, setEntrySearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<SelectOption | null>(
    DEFAULT_TYPE
  );
  const [chainFilter, setChainFilter] = useState<SelectOption | null>(
    DEFAULT_CHAIN
  );

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSizeOption, setPageSizeOption] = useState<SelectOption | null>(
    DEFAULT_PAGE_SIZE
  );
  const pageSize = pageSizeOption ? Number(pageSizeOption.id) : 10;

  // Computed version info
  const draftVersion = useMemo(() => {
    if (!whitelist?.versions) return null;
    return whitelist.versions.find((v) => v.status === 'draft') ?? null;
  }, [whitelist]);

  const activeVersion = useMemo(() => {
    if (!whitelist?.versions) return null;
    return whitelist.versions.find((v) => v.status === 'active') ?? null;
  }, [whitelist]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    if (!whitelist) return [];
    return whitelist.entries.filter((entry) => {
      // Search filter
      if (entrySearch) {
        const searchLower = entrySearch.toLowerCase();
        const matchesSearch =
          entry.label.toLowerCase().includes(searchLower) ||
          entry.address.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Type filter
      const typeId = typeFilter?.id ?? 'all';
      if (typeId !== 'all' && entry.type !== typeId) {
        return false;
      }

      // Chain filter
      const chainId = chainFilter?.id ?? 'all';
      if (chainId !== 'all' && entry.chain !== chainId) {
        return false;
      }

      return true;
    });
  }, [whitelist, entrySearch, typeFilter, chainFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredEntries.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedEntries = filteredEntries.slice(startIndex, endIndex);

  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard');
  };

  const handleRevoke = () => {
    toast.success('Whitelist revoked successfully');
    setRevokeDialogOpen(false);
    navigate({ to: '/treasury/policies/whitelists' });
  };

  const handleDeleteEntry = () => {
    if (entryToDelete) {
      toast.success(`Entry "${entryToDelete.label}" removed`);
      setDeleteEntryDialogOpen(false);
      setEntryToDelete(null);
    }
  };

  const clearFilters = () => {
    setEntrySearch('');
    setTypeFilter(DEFAULT_TYPE);
    setChainFilter(DEFAULT_CHAIN);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    entrySearch || typeFilter?.id !== 'all' || chainFilter?.id !== 'all';

  if (!whitelist) {
    return (
      <PageLayout>
        <PageLayoutTopBar
          breadcrumbs={[
            { label: 'Whitelists', href: '/treasury/policies/whitelists' },
            { label: 'Not Found' },
          ]}
        />
        <PageLayoutContent containerClassName="py-8">
          <div className="text-center">
            <p className="text-neutral-500">
              The requested whitelist could not be found.
            </p>
            <Link
              to="/treasury/policies/whitelists"
              className="mt-4 inline-block text-sm text-brand-500 hover:underline"
            >
              Back to Whitelists
            </Link>
          </div>
        </PageLayoutContent>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageLayoutTopBar
        breadcrumbs={[
          { label: 'Whitelists', href: '/treasury/policies/whitelists' },
          { label: whitelist.name },
        ]}
        status={
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
              getStatusStyles(whitelist.status)
            )}
          >
            {getStatusIcon(whitelist.status)}
            {whitelist.status}
          </span>
        }
        actions={
          whitelist.status === 'active' ? (
            <Button
              asChild
              variant="secondary"
              className="h-7 rounded-none px-3 text-xs font-medium"
            >
              <Link
                to="/treasury/policies/whitelists/$whitelistId/edit"
                params={{ whitelistId }}
              >
                <EditIcon className="mr-1.5 size-3.5" />
                Edit
              </Link>
            </Button>
          ) : undefined
        }
      />
      <PageLayoutContent containerClassName="py-4">
        <div className="space-y-6">
          {/* Pending approval banner */}
          {whitelist.status === 'pending' && (
            <div className="flex items-center justify-between border border-warning-200 bg-warning-50 p-4">
              <div className="flex items-center gap-3">
                <ClockIcon className="size-5 text-warning-600" />
                <div>
                  <p className="text-sm font-medium text-warning-800">
                    Pending Approval
                  </p>
                  <p className="text-xs text-warning-600">
                    This whitelist is awaiting approval from authorized signers.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  className="h-7 rounded-none px-3 text-xs font-medium"
                >
                  Approve
                </Button>
                <Button
                  variant="ghost"
                  className="h-7 rounded-none px-3 text-xs font-medium text-negative-600"
                >
                  Reject
                </Button>
              </div>
            </div>
          )}

          {/* Draft version in progress banner */}
          {draftVersion && whitelist.status === 'active' && (
            <div className="flex items-center justify-between border border-brand-200 bg-brand-50 p-4">
              <div className="flex items-center gap-3">
                <FileEditIcon className="size-5 text-brand-600" />
                <div>
                  <p className="text-sm font-medium text-brand-900">
                    Draft Version in Progress
                  </p>
                  <p className="text-xs text-brand-700">
                    Version {draftVersion.version} is being prepared. The
                    current active version (v{activeVersion?.version}) remains
                    in effect.
                  </p>
                </div>
              </div>
              <Button
                asChild
                variant="secondary"
                className="h-7 rounded-none border-brand-300 bg-white px-3 text-xs font-medium text-brand-700 hover:bg-brand-50"
              >
                <Link
                  to="/treasury/policies/whitelists/$whitelistId/versions/$versionNumber"
                  params={{
                    whitelistId,
                    versionNumber: String(draftVersion.version),
                  }}
                >
                  <EditIcon className="mr-1.5 size-3.5" />
                  Continue Editing Draft
                </Link>
              </Button>
            </div>
          )}

          {/* Info Grid */}
          <div className="grid grid-cols-4 gap-px bg-neutral-200">
            <div className="bg-white p-4">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Type
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                {whitelist.type === 'global' ? (
                  <GlobeIcon className="size-4 text-neutral-500" />
                ) : (
                  <KeyIcon className="size-4 text-neutral-500" />
                )}
                <span className="text-sm font-medium text-neutral-900 capitalize">
                  {whitelist.type === 'global' ? 'Global' : whitelist.vaultName}
                </span>
              </div>
            </div>
            <div className="col-span-2 bg-white p-4">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Description
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-neutral-600">
                {whitelist.description}
              </p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Last Updated
              </p>
              <div className="mt-1">
                <p className="text-sm font-medium text-neutral-900 tabular-nums">
                  {whitelist.updatedAt}
                </p>
                <p className="text-[10px] text-neutral-400">
                  Created {whitelist.createdAt}
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border border-neutral-200 bg-white">
            {/* Tab Headers */}
            <div className="flex border-b border-neutral-200">
              <button
                type="button"
                onClick={() => setActiveTab('entries')}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium transition-colors',
                  activeTab === 'entries'
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                )}
              >
                <ListIcon className="size-4" />
                Whitelisted Entries
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums',
                    activeTab === 'entries'
                      ? 'bg-brand-100 text-brand-700'
                      : 'bg-neutral-100 text-neutral-600'
                  )}
                >
                  {whitelist.entries.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium transition-colors',
                  activeTab === 'history'
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                )}
              >
                <HistoryIcon className="size-4" />
                Change History
                {whitelist.versions && (
                  <div className="flex items-center gap-1">
                    {activeVersion && (
                      <span
                        className={cn(
                          'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                          'bg-positive-100 text-positive-700'
                        )}
                      >
                        v{activeVersion.version}
                      </span>
                    )}
                    {draftVersion && (
                      <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">
                        draft
                      </span>
                    )}
                  </div>
                )}
              </button>
            </div>

            {/* Tab Content: Entries */}
            {activeTab === 'entries' && (
              <>
                {/* Filter Bar */}
                <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50 px-4 py-2">
                  <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                      <SearchIcon className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="text"
                        placeholder="Search entries..."
                        value={entrySearch}
                        onChange={(e) => {
                          setEntrySearch(e.target.value);
                          handleFilterChange();
                        }}
                        className="h-7 w-40 border border-neutral-200 bg-white pr-2 pl-7 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                      />
                    </div>

                    {/* Type Filter */}
                    <FilterSelect
                      options={TYPE_OPTIONS}
                      value={typeFilter}
                      onChange={(v) => {
                        setTypeFilter(v);
                        handleFilterChange();
                      }}
                      className="w-28"
                    />

                    {/* Chain Filter */}
                    <FilterSelect
                      options={CHAIN_OPTIONS}
                      value={chainFilter}
                      onChange={(v) => {
                        setChainFilter(v);
                        handleFilterChange();
                      }}
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

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-neutral-500">
                      {filteredEntries.length}{' '}
                      {filteredEntries.length === 1 ? 'entry' : 'entries'}
                    </span>
                    {whitelist.status === 'active' && (
                      <Button className="h-7 rounded-none bg-brand-500 px-3 text-xs font-medium text-white hover:bg-brand-600">
                        <PlusIcon className="mr-1.5 size-3.5" />
                        Add Entry
                      </Button>
                    )}
                  </div>
                </div>

                {/* Entries Table */}
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-neutral-100 bg-neutral-50 text-left">
                      <th className="px-4 py-2 font-medium text-neutral-500">
                        Label
                      </th>
                      <th className="px-4 py-2 font-medium text-neutral-500">
                        Address
                      </th>
                      <th className="px-4 py-2 font-medium text-neutral-500">
                        Type
                      </th>
                      <th className="px-4 py-2 font-medium text-neutral-500">
                        Chain
                      </th>
                      <th className="px-4 py-2 font-medium text-neutral-500">
                        Added
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-neutral-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {paginatedEntries.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-neutral-500"
                        >
                          No entries found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      paginatedEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-neutral-50">
                          <td className="px-4 py-2">
                            <span className="font-medium text-neutral-900">
                              {entry.label}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <code className="font-mono text-[11px] text-neutral-600">
                                {entry.address.slice(0, 10)}...
                                {entry.address.slice(-8)}
                              </code>
                              <button
                                type="button"
                                onClick={() => handleCopyAddress(entry.address)}
                                className="text-neutral-400 hover:text-neutral-600"
                              >
                                <CopyIcon className="size-3" />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={cn(
                                'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
                                getEntryTypeStyles(entry.type)
                              )}
                            >
                              {entry.type}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-neutral-600">
                            {entry.chain}
                          </td>
                          <td className="px-4 py-2">
                            <div>
                              <p className="text-neutral-600 tabular-nums">
                                {entry.addedAt}
                              </p>
                              <p className="text-[10px] text-neutral-400">
                                by {entry.addedBy}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right">
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
                                className="w-36 rounded-none"
                              >
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleCopyAddress(entry.address)
                                  }
                                  className="cursor-pointer rounded-none text-xs"
                                >
                                  <CopyIcon className="mr-2 size-3" />
                                  Copy Address
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer rounded-none text-xs">
                                  <ExternalLinkIcon className="mr-2 size-3" />
                                  View on Explorer
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEntryToDelete(entry);
                                    setDeleteEntryDialogOpen(true);
                                  }}
                                  className="cursor-pointer rounded-none text-xs text-negative-600"
                                >
                                  <TrashIcon className="mr-2 size-3" />
                                  Remove
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
                {filteredEntries.length > 0 && (
                  <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-500">
                        Rows per page:
                      </span>
                      <FilterSelect
                        options={PAGE_SIZE_OPTIONS}
                        value={pageSizeOption}
                        onChange={(v) => {
                          setPageSizeOption(v);
                          setCurrentPage(1);
                        }}
                        className="w-16"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="mr-2 text-xs text-neutral-500">
                        {startIndex + 1}-
                        {Math.min(endIndex, filteredEntries.length)} of{' '}
                        {filteredEntries.length}
                      </span>

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

                      <button
                        type="button"
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
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
              </>
            )}

            {/* Tab Content: Change History */}
            {activeTab === 'history' &&
              whitelist.versions &&
              whitelist.versions.length > 0 && (
                <>
                  {/* History Controls */}
                  <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50 px-4 py-2">
                    <div className="flex items-center gap-2">
                      <GitBranchIcon className="size-4 text-neutral-500" />
                      <span className="text-xs text-neutral-600">
                        {whitelist.versions.length} versions
                        {activeVersion && (
                          <> • Active: v{activeVersion.version}</>
                        )}
                        {draftVersion && (
                          <span className="text-brand-600">
                            {' '}
                            • Draft: v{draftVersion.version}
                          </span>
                        )}
                      </span>
                    </div>
                    <FilterSelect
                      options={[
                        { id: 'all', label: 'All Versions' },
                        ...whitelist.versions.map((v) => ({
                          id: String(v.version),
                          label: `Version ${v.version}`,
                        })),
                      ]}
                      value={
                        selectedVersionFilter === null
                          ? { id: 'all', label: 'All Versions' }
                          : {
                              id: String(selectedVersionFilter),
                              label: `Version ${selectedVersionFilter}`,
                            }
                      }
                      onChange={(v) =>
                        setSelectedVersionFilter(
                          v.id === 'all' ? null : Number(v.id)
                        )
                      }
                      className="w-32"
                    />
                  </div>

                  {/* Version List */}
                  <div className="max-h-[500px] divide-y divide-neutral-100 overflow-y-auto">
                    {whitelist.versions
                      .filter(
                        (v) =>
                          selectedVersionFilter === null ||
                          v.version === selectedVersionFilter
                      )
                      .sort((a, b) => b.version - a.version)
                      .map((version) => {
                        const { date: versionDate, time: versionTime } =
                          formatDateTime(version.createdAt);
                        const isActive = version.status === 'active';
                        const isDraft = version.status === 'draft';
                        const isPending = version.status === 'pending';

                        // Version circle styles based on status
                        const getVersionCircleStyles = () => {
                          if (isActive)
                            return 'bg-positive-100 text-positive-700';
                          if (isDraft) return 'bg-brand-100 text-brand-700';
                          if (isPending)
                            return 'bg-warning-100 text-warning-700';
                          return 'bg-neutral-100 text-neutral-600';
                        };

                        return (
                          <Link
                            key={version.version}
                            to="/treasury/policies/whitelists/$whitelistId/versions/$versionNumber"
                            params={{
                              whitelistId,
                              versionNumber: String(version.version),
                            }}
                            className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-neutral-50"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                                  getVersionCircleStyles()
                                )}
                              >
                                v{version.version}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-neutral-900">
                                    Version {version.version}
                                  </span>
                                  <span
                                    className={cn(
                                      'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
                                      getStatusStyles(version.status)
                                    )}
                                  >
                                    {getStatusIcon(version.status)}
                                    {version.status}
                                  </span>
                                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                                    {version.changes.length}{' '}
                                    {version.changes.length === 1
                                      ? 'change'
                                      : 'changes'}
                                  </span>
                                </div>
                                <div className="mt-0.5 flex items-center gap-2 text-xs text-neutral-500">
                                  <span>Created by {version.createdBy}</span>
                                  <span>•</span>
                                  <span>
                                    {versionDate} at {versionTime}
                                  </span>
                                </div>
                                {version.comment && (
                                  <p className="mt-1 text-xs text-neutral-500 italic">
                                    "{version.comment}"
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {/* Show approval avatars for active/superseded versions */}
                              {(version.status === 'active' ||
                                version.status === 'superseded') &&
                                version.approvedBy &&
                                version.approvedBy.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    {version.approvedBy
                                      .slice(0, 3)
                                      .map((name, idx) => (
                                        <div
                                          key={idx}
                                          className="flex size-6 items-center justify-center rounded-full bg-positive-100 text-[10px] font-medium text-positive-700"
                                          title={name}
                                        >
                                          {name
                                            .split(' ')
                                            .map((n) => n[0])
                                            .join('')}
                                        </div>
                                      ))}
                                    {version.approvedBy.length > 3 && (
                                      <span className="text-[10px] text-neutral-400">
                                        +{version.approvedBy.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}
                              {/* Show pending approval indicator for pending versions */}
                              {version.status === 'pending' &&
                                version.requiredApprovals && (
                                  <div className="flex items-center gap-1 text-[10px] text-warning-600">
                                    <ClockIcon className="size-3" />
                                    <span>
                                      {version.approvedBy?.length ?? 0}/
                                      {version.requiredApprovals} approved
                                    </span>
                                  </div>
                                )}
                              {/* Show draft indicator */}
                              {version.status === 'draft' && (
                                <span className="text-[10px] text-brand-600">
                                  Not submitted
                                </span>
                              )}
                              <ChevronRightIcon className="size-4 text-neutral-400" />
                            </div>
                          </Link>
                        );
                      })}
                  </div>
                </>
              )}
          </div>

          {/* Actions */}
          {whitelist.status === 'active' && (
            <div className="flex justify-end">
              <Dialog
                open={revokeDialogOpen}
                onOpenChange={setRevokeDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 rounded-none px-3 text-xs font-medium text-negative-600 hover:bg-negative-50 hover:text-negative-700"
                  >
                    <XCircleIcon className="mr-1.5 size-3.5" />
                    Revoke Whitelist
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-none sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Revoke Whitelist</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to revoke "{whitelist.name}"? This
                      action cannot be undone and all entries will be removed
                      from approved addresses.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setRevokeDialogOpen(false)}
                      className="rounded-none"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleRevoke}
                      className="rounded-none bg-negative-600 text-white hover:bg-negative-700"
                    >
                      Revoke Whitelist
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </PageLayoutContent>

      {/* Delete Entry Dialog */}
      <Dialog
        open={deleteEntryDialogOpen}
        onOpenChange={setDeleteEntryDialogOpen}
      >
        <DialogContent className="rounded-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove "{entryToDelete?.label}" from this
              whitelist?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="secondary"
              onClick={() => setDeleteEntryDialogOpen(false)}
              className="rounded-none"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteEntry}
              className="rounded-none bg-negative-600 text-white hover:bg-negative-700"
            >
              Remove Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};
