import { Link } from '@tanstack/react-router';
import {
  BuildingIcon,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  ExternalLinkIcon,
  LinkIcon,
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
  type AddressBookEntry,
  getAllAddressBookEntries,
  getAvailableChains,
  getIdentitiesForLinking,
  getIdentityAddresses,
  getStandaloneAddressEntries,
} from './data/address-book';

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

const DEFAULT_TYPE_FILTER = TYPE_FILTER_OPTIONS[0]!;
const DEFAULT_CHAIN_FILTER = CHAIN_FILTER_OPTIONS[0]!;

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
    <tr className="border-b border-neutral-100 hover:bg-neutral-50/50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex size-8 items-center justify-center rounded-full',
              entry.identity
                ? entry.identity.type === 'corporate'
                  ? 'bg-blue-100'
                  : 'bg-purple-100'
                : 'bg-neutral-100'
            )}
          >
            {entry.identity ? (
              entry.identity.type === 'corporate' ? (
                <BuildingIcon className="text-blue-600 size-4" />
              ) : (
                <UserIcon className="text-purple-600 size-4" />
              )
            ) : (
              <LinkIcon className="size-4 text-neutral-500" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900">
              {entry.label || 'Unnamed'}
            </p>
            {entry.identity && (
              <Link
                to="/identities/$identityId"
                params={{ identityId: entry.identity.id }}
                className="text-xs text-neutral-500 hover:text-brand-600 hover:underline"
              >
                {entry.identity.displayName ?? entry.identity.name}
              </Link>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <code className="font-mono text-xs text-neutral-700">
            {truncateAddress(entry.address)}
          </code>
          <button
            type="button"
            onClick={() => copyToClipboard(entry.address)}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <CopyIcon className="size-3.5" />
          </button>
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            'rounded px-2 py-0.5 text-xs font-medium',
            getChainColor(entry.chain)
          )}
        >
          {entry.chain}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            'rounded px-2 py-0.5 text-xs font-medium',
            entry.type === 'identity'
              ? 'bg-brand-50 text-brand-700'
              : 'bg-neutral-100 text-neutral-600'
          )}
        >
          {entry.type === 'identity' ? 'Identity' : 'Standalone'}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-neutral-500">
        {new Date(entry.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })}
      </td>
      <td className="px-4 py-3">
        {entry.identity && (
          <Link
            to="/identities/$identityId"
            params={{ identityId: entry.identity.id }}
            className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
          >
            View Identity
            <ExternalLinkIcon className="size-3" />
          </Link>
        )}
      </td>
    </tr>
  );
};

export const PageAddressBook = () => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] =
    useState<FilterSelectOption>(DEFAULT_TYPE_FILTER);
  const [chainFilter, setChainFilter] =
    useState<FilterSelectOption>(DEFAULT_CHAIN_FILTER);
  const [showAddDialog, setShowAddDialog] = useState(false);

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

  const clearFilters = () => {
    setSearch('');
    setTypeFilter(DEFAULT_TYPE_FILTER);
    setChainFilter(DEFAULT_CHAIN_FILTER);
  };

  const hasActiveFilters =
    search.trim() || typeFilter.id !== 'all' || chainFilter.id !== 'all';

  return (
    <PageLayout>
      <PageLayoutTopBar
        endActions={
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowAddDialog(true)}
              className="h-8 rounded-none bg-brand-500 px-3 text-xs font-medium text-white hover:bg-brand-600"
            >
              <PlusIcon className="mr-1.5 size-3.5" />
              Add Address
            </Button>
            <div className="h-4 w-px bg-neutral-200" />
            <NotificationButton />
          </div>
        }
      >
        <PageLayoutTopBarTitle>Address Book</PageLayoutTopBarTitle>
      </PageLayoutTopBar>
      <PageLayoutContent containerClassName="py-4">
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="border border-neutral-200 bg-white p-4">
              <p className="text-xs font-medium text-neutral-500">
                Total Addresses
              </p>
              <p className="mt-1 text-2xl font-semibold text-neutral-900">
                {allAddresses.length}
              </p>
            </div>
            <div className="border border-neutral-200 bg-white p-4">
              <p className="text-xs font-medium text-neutral-500">
                Linked to Identities
              </p>
              <p className="mt-1 text-2xl font-semibold text-brand-600">
                {identityAddresses.length}
              </p>
            </div>
            <div className="border border-neutral-200 bg-white p-4">
              <p className="text-xs font-medium text-neutral-500">Standalone</p>
              <p className="mt-1 text-2xl font-semibold text-neutral-600">
                {standaloneAddresses.length}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center justify-between border border-neutral-200 bg-white p-3">
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <SearchIcon className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search addresses..."
                  className="h-7 w-56 border border-neutral-200 bg-neutral-50 pr-3 pl-8 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                />
              </div>

              {/* Type Filter */}
              <FilterSelect
                options={TYPE_FILTER_OPTIONS}
                value={typeFilter}
                onChange={setTypeFilter}
                className="w-36"
              />

              {/* Chain Filter */}
              <FilterSelect
                options={CHAIN_FILTER_OPTIONS}
                value={chainFilter}
                onChange={setChainFilter}
                className="w-28"
              />

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700"
                >
                  <XIcon className="size-3" />
                  Clear
                </button>
              )}
            </div>

            <p className="text-xs text-neutral-500">
              {filteredAddresses.length} address
              {filteredAddresses.length !== 1 ? 'es' : ''}
            </p>
          </div>

          {/* Table */}
          <div className="border border-neutral-200 bg-white">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600">
                    Label / Identity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600">
                    Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600">
                    Chain
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600">
                    Added
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600" />
                </tr>
              </thead>
              <tbody>
                {filteredAddresses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <p className="text-sm text-neutral-500">
                        No addresses found
                      </p>
                      <p className="mt-1 text-xs text-neutral-400">
                        {hasActiveFilters
                          ? 'Try adjusting your filters'
                          : 'Add addresses to your address book'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredAddresses.map((entry) => (
                    <AddressRow key={entry.id} entry={entry} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </PageLayoutContent>

      {/* Add Address Dialog */}
      <AddAddressDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
    </PageLayout>
  );
};
