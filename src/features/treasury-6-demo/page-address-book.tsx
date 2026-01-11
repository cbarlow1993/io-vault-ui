import { Link } from '@tanstack/react-router';
import {
  BuildingIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  CopyIcon,
  LinkIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  UserIcon,
  XIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

import {
  type AddressBookEntry,
  getAllAddressBookEntries,
  getAvailableChains,
  getIdentitiesForLinking,
  getIdentityAddresses,
  getStandaloneAddressEntries,
} from './data/address-book';
import {
  FilterSelect,
  type FilterSelectOption,
} from './components/filter-select';

const CHAIN_OPTIONS: FilterSelectOption[] = [
  { id: 'Ethereum', label: 'Ethereum' },
  { id: 'Bitcoin', label: 'Bitcoin' },
  { id: 'Polygon', label: 'Polygon' },
  { id: 'Solana', label: 'Solana' },
];

const TYPE_FILTER_OPTIONS: FilterSelectOption[] = [
  { id: 'all', label: 'All Addresses' },
  { id: 'identity', label: 'Linked to Identity' },
  { id: 'standalone', label: 'Standalone' },
];

const CHAIN_FILTER_OPTIONS: FilterSelectOption[] = [
  { id: 'all', label: 'All Chains' },
  ...CHAIN_OPTIONS,
];

const PAGE_SIZE_OPTIONS: FilterSelectOption[] = [
  { id: '5', label: '5' },
  { id: '10', label: '10' },
  { id: '25', label: '25' },
  { id: '50', label: '50' },
];

const DEFAULT_TYPE_FILTER = TYPE_FILTER_OPTIONS[0]!;
const DEFAULT_CHAIN_FILTER = CHAIN_FILTER_OPTIONS[0]!;
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[1]!;

const truncateAddress = (address: string) => {
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success('Address copied to clipboard');
};

const getChainColor = (chain: string) => {
  switch (chain.toLowerCase()) {
    case 'ethereum':
      return 'bg-blue-100 text-blue-700';
    case 'bitcoin':
      return 'bg-orange-100 text-orange-700';
    case 'polygon':
      return 'bg-purple-100 text-purple-700';
    case 'solana':
      return 'bg-green-100 text-green-700';
    default:
      return 'bg-neutral-100 text-neutral-700';
  }
};

// Add Address Dialog
const AddAddressDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressTouched, setAddressTouched] = useState(false);
  const [chain, setChain] = useState<FilterSelectOption | null>(
    CHAIN_OPTIONS[0]!
  );
  const [linkedIdentity, setLinkedIdentity] =
    useState<FilterSelectOption | null>(null);

  const identities = getIdentitiesForLinking();
  const identityOptions: FilterSelectOption[] = [
    { id: '', label: 'None (Standalone)' },
    ...identities.map((i) => ({ id: i.id, label: `${i.name} (${i.type})` })),
  ];

  // Stub address validation based on chain
  const validateAddress = (addr: string, chainId: string): string | null => {
    if (!addr.trim()) {
      return 'Address is required';
    }

    // Stub validation rules per chain
    switch (chainId) {
      case 'Ethereum':
      case 'Polygon':
        if (!addr.startsWith('0x')) {
          return 'Address must start with 0x';
        }
        if (addr.length !== 42) {
          return 'Address must be 42 characters';
        }
        break;
      case 'Bitcoin':
        if (
          !addr.startsWith('bc1') &&
          !addr.startsWith('1') &&
          !addr.startsWith('3')
        ) {
          return 'Invalid Bitcoin address format';
        }
        break;
      case 'Solana':
        if (addr.length < 32 || addr.length > 44) {
          return 'Invalid Solana address length';
        }
        break;
    }

    return null;
  };

  const handleAddressChange = (value: string) => {
    setAddress(value);
    if (addressTouched && chain) {
      setAddressError(validateAddress(value, chain.id));
    }
  };

  const handleAddressBlur = () => {
    setAddressTouched(true);
    if (chain) {
      setAddressError(validateAddress(address, chain.id));
    }
  };

  const handleChainChange = (newChain: FilterSelectOption) => {
    setChain(newChain);
    // Re-validate address when chain changes
    if (addressTouched && address) {
      setAddressError(validateAddress(address, newChain.id));
    }
  };

  const handleSubmit = () => {
    if (!chain) {
      return;
    }

    const error = validateAddress(address, chain.id);
    if (error) {
      setAddressTouched(true);
      setAddressError(error);
      return;
    }

    // In a real app, this would save to the backend
    toast.success('Address added to address book');
    onOpenChange(false);

    // Reset form
    setLabel('');
    setAddress('');
    setAddressError(null);
    setAddressTouched(false);
    setChain(CHAIN_OPTIONS[0]!);
    setLinkedIdentity(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    setLabel('');
    setAddress('');
    setAddressError(null);
    setAddressTouched(false);
    setChain(CHAIN_OPTIONS[0]!);
    setLinkedIdentity(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md rounded-none">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-neutral-900">
            Add New Address
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-500">
            Add a new address to your address book. Optionally link it to an
            existing identity.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-700">
              Chain *
            </label>
            <FilterSelect
              options={CHAIN_OPTIONS}
              value={chain}
              onChange={handleChainChange}
              className="h-9 w-full"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-700">
              Address *
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => handleAddressChange(e.target.value)}
              onBlur={handleAddressBlur}
              placeholder={
                chain?.id === 'Bitcoin'
                  ? 'bc1... or 1... or 3...'
                  : chain?.id === 'Solana'
                    ? 'Base58 address'
                    : '0x...'
              }
              className={cn(
                'h-9 w-full border bg-neutral-50 px-3 font-mono text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none',
                addressError && addressTouched
                  ? 'border-negative-500 focus:border-negative-500'
                  : 'border-neutral-200 focus:border-neutral-400'
              )}
            />
            {addressError && addressTouched && (
              <p className="mt-1 text-xs text-negative-600">{addressError}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-700">
              Label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Exchange Wallet"
              className="h-9 w-full border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-700">
              Link to Identity
            </label>
            <FilterSelect
              options={identityOptions}
              value={linkedIdentity ?? identityOptions[0]!}
              onChange={setLinkedIdentity}
              className="h-9 w-full"
            />
            <p className="mt-1 text-[11px] text-neutral-500">
              Optionally link this address to an existing identity
            </p>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <DialogClose asChild>
            <Button
              variant="secondary"
              className="h-8 rounded-none border-neutral-300 px-4 text-xs font-medium"
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            className="h-8 rounded-none bg-brand-500 px-4 text-xs font-medium text-white hover:bg-brand-600"
          >
            Add Address
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Address Row Component
const AddressRow = ({ entry }: { entry: AddressBookEntry }) => {
  return (
    <tr className="cursor-pointer hover:bg-neutral-50">
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex size-7 items-center justify-center rounded-full',
              entry.identity
                ? entry.identity.type === 'corporate'
                  ? 'bg-blue-100'
                  : 'bg-purple-100'
                : 'bg-neutral-100'
            )}
          >
            {entry.identity ? (
              entry.identity.type === 'corporate' ? (
                <BuildingIcon className="text-blue-600 size-3.5" />
              ) : (
                <UserIcon className="text-purple-600 size-3.5" />
              )
            ) : (
              <LinkIcon className="size-3.5 text-neutral-500" />
            )}
          </div>
          <div>
            <p className="font-medium text-neutral-900">
              {entry.label || 'Unnamed'}
            </p>
            {entry.identity && (
              <p className="text-[10px] text-neutral-400">
                {entry.identity.displayName ?? entry.identity.name}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <code className="font-mono text-neutral-600">
            {truncateAddress(entry.address)}
          </code>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(entry.address);
            }}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <CopyIcon className="size-3" />
          </button>
        </div>
      </td>
      <td className="px-3 py-2">
        <span
          className={cn(
            'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium',
            getChainColor(entry.chain)
          )}
        >
          {entry.chain}
        </span>
      </td>
      <td className="px-3 py-2">
        <span
          className={cn(
            'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium',
            entry.type === 'identity'
              ? 'bg-brand-50 text-brand-700'
              : 'bg-neutral-100 text-neutral-600'
          )}
        >
          {entry.type === 'identity' ? 'Identity' : 'Standalone'}
        </span>
      </td>
      <td className="px-3 py-2 text-neutral-500 tabular-nums">
        {new Date(entry.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })}
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
            {entry.identity && (
              <>
                <DropdownMenuItem
                  asChild
                  className="cursor-pointer rounded-none text-xs"
                >
                  <Link
                    to="/identities/$identityId"
                    params={{ identityId: entry.identity.id }}
                  >
                    View Identity
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem className="cursor-pointer rounded-none text-xs">
              Edit
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

export const PageAddressBook = () => {
  // Filter state
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] =
    useState<FilterSelectOption>(DEFAULT_TYPE_FILTER);
  const [chainFilter, setChainFilter] =
    useState<FilterSelectOption>(DEFAULT_CHAIN_FILTER);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSizeOption, setPageSizeOption] =
    useState<FilterSelectOption>(DEFAULT_PAGE_SIZE);
  const pageSize = Number(pageSizeOption.id);

  // Get data
  const identityAddresses = getIdentityAddresses();
  const standaloneAddresses = getStandaloneAddressEntries();
  const allAddresses = getAllAddressBookEntries();

  // Filter addresses
  const filteredAddresses = useMemo(() => {
    let result = allAddresses;

    // Type filter
    if (typeFilter.id === 'identity') {
      result = result.filter((a) => a.type === 'identity');
    } else if (typeFilter.id === 'standalone') {
      result = result.filter((a) => a.type === 'standalone');
    }

    // Chain filter
    if (chainFilter.id !== 'all') {
      result = result.filter((a) => a.chain === chainFilter.id);
    }

    // Search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.label.toLowerCase().includes(searchLower) ||
          a.address.toLowerCase().includes(searchLower) ||
          a.identity?.name.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [allAddresses, typeFilter, chainFilter, search]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAddresses.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedAddresses = filteredAddresses.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    handleFilterChange();
  };

  const handleTypeChange = (value: FilterSelectOption) => {
    setTypeFilter(value);
    handleFilterChange();
  };

  const handleChainChange = (value: FilterSelectOption) => {
    setChainFilter(value);
    handleFilterChange();
  };

  const handlePageSizeChange = (value: FilterSelectOption) => {
    setPageSizeOption(value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setTypeFilter(DEFAULT_TYPE_FILTER);
    setChainFilter(DEFAULT_CHAIN_FILTER);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    search.trim() || typeFilter.id !== 'all' || chainFilter.id !== 'all';

  return (
    <PageLayout>
      <PageLayoutTopBar
        title="Address Book"
        actions={
          <Button
            onClick={() => setShowAddDialog(true)}
            className="h-7 rounded-none bg-brand-500 px-3 text-xs font-medium text-white hover:bg-brand-600"
          >
            <PlusIcon className="mr-1.5 size-3.5" />
            Add Address
          </Button>
        }
      />
      <PageLayoutContent containerClassName="py-4">
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-px bg-neutral-200">
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Total Addresses
              </p>
              <p className="mt-1 text-lg font-semibold text-neutral-900 tabular-nums">
                {allAddresses.length}
              </p>
            </div>
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Linked to Identities
              </p>
              <p className="mt-1 text-lg font-semibold text-brand-600 tabular-nums">
                {identityAddresses.length}
              </p>
            </div>
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Standalone
              </p>
              <p className="mt-1 text-lg font-semibold text-neutral-600 tabular-nums">
                {standaloneAddresses.length}
              </p>
            </div>
            <div className="bg-white p-3">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Chains
              </p>
              <p className="mt-1 text-lg font-semibold text-neutral-900 tabular-nums">
                {getAvailableChains().length}
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
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search addresses..."
                  className="h-7 w-48 border border-neutral-200 bg-neutral-50 pr-2 pl-7 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                />
              </div>

              {/* Type Filter */}
              <FilterSelect
                options={TYPE_FILTER_OPTIONS}
                value={typeFilter}
                onChange={handleTypeChange}
                className="w-36"
              />

              {/* Chain Filter */}
              <FilterSelect
                options={CHAIN_FILTER_OPTIONS}
                value={chainFilter}
                onChange={handleChainChange}
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
                Address Book
              </h2>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-left">
                  <th className="px-3 py-2 font-medium text-neutral-500">
                    Label / Identity
                  </th>
                  <th className="px-3 py-2 font-medium text-neutral-500">
                    Address
                  </th>
                  <th className="px-3 py-2 font-medium text-neutral-500">
                    Chain
                  </th>
                  <th className="px-3 py-2 font-medium text-neutral-500">
                    Type
                  </th>
                  <th className="px-3 py-2 font-medium text-neutral-500">
                    Added
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-neutral-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {paginatedAddresses.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-8 text-center text-neutral-500"
                    >
                      No addresses found matching your filters.
                    </td>
                  </tr>
                ) : (
                  paginatedAddresses.map((entry) => (
                    <AddressRow key={entry.id} entry={entry} />
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {filteredAddresses.length > 0 && (
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
                    {Math.min(endIndex, filteredAddresses.length)} of{' '}
                    {filteredAddresses.length}
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

      {/* Add Address Dialog */}
      <AddAddressDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
    </PageLayout>
  );
};
