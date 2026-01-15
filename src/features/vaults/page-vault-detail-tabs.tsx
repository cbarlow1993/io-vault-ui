import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import {
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ChevronUpIcon,
  ClockIcon,
  CopyIcon,
  HistoryIcon,
  InfoIcon,
  KeyIcon,
  PlusIcon,
  SearchIcon,
  ServerIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  UsersIcon,
  XCircleIcon,
  XIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { formatDateTimeNumeric } from '@/lib/date/format';
import { orpc } from '@/lib/orpc/client';
import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';
import {
  Dialog,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  allIdentities,
  getIdentityById,
  type Identity,
  isCorporateIdentity,
} from '@/features/identities/data/identities';
import {
  FilterSelect,
  type FilterSelectOption,
} from '@/features/shared/components/filter-select';
import { getStatusIcon } from '@/features/shared/lib/status-icons';
import {
  Breadcrumbs,
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
} from '@/layout/shell';

import type { DeviceType, Signer, VaultCurve } from './data/vaults';
import type { ReshareStatus, SignatureItem } from './schema';

// =============================================================================
// Pagination Types
// =============================================================================

type PaginationStyle =
  | 'none'
  | 'show-more'
  | 'pagination'
  | 'virtual-scroll'
  | 'collapse-summary';

const PAGINATION_STYLES: {
  value: PaginationStyle;
  label: string;
  description: string;
}[] = [
  { value: 'none', label: 'No Pagination', description: 'Show all addresses' },
  {
    value: 'show-more',
    label: 'Show More',
    description: 'Load more incrementally',
  },
  {
    value: 'pagination',
    label: 'Page Controls',
    description: 'Previous/Next navigation',
  },
  {
    value: 'virtual-scroll',
    label: 'Virtual Scroll',
    description: 'Scroll within fixed height',
  },
  {
    value: 'collapse-summary',
    label: 'Collapse Summary',
    description: 'Show count, expand to see',
  },
];

const ADDRESSES_PER_PAGE = 5;

// =============================================================================
// Mock Data - 3-Tier Tree Structure for Address Derivations
// Structure: Chain → Account → Address (m/44'/coin'/account'/change/index)
// =============================================================================

// Helper to generate mock addresses for testing pagination
const generateMockAddresses = (
  accountPrefix: string,
  count: number,
  type: 'deposit' | 'cold' | 'hot' = 'deposit'
): DerivedAddress[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${accountPrefix}-0-${i}`,
    address: `0x${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 8)}`,
    alias: i === 0 ? 'Primary' : i < 3 ? `Wallet ${i + 1}` : null,
    change: (i % 5 === 4 ? 1 : 0) as 0 | 1,
    index: i,
    balance: `$${(Math.random() * 10000).toFixed(2)}`,
    type,
  }));
};

type DerivedAddress = {
  id: string;
  address: string;
  alias: string | null;
  change: 0 | 1; // 0 = external/receive, 1 = internal/change
  index: number;
  balance: string;
  type: 'deposit' | 'cold' | 'hot';
};

type AccountDerivation = {
  id: string;
  accountIndex: number;
  label: string;
  derivationPath: string; // e.g., m/44'/60'/0'
  identityId: string | null; // Links to an Identity (corporate or individual)
  addresses: DerivedAddress[];
};

type ChainDerivation = {
  id: string;
  chainId: string;
  chainName: string;
  chainIcon?: string; // Optional icon/emoji
  chainColor: string;
  coinType: number; // BIP-44 coin type (60 for ETH, 0 for BTC, etc.)
  accounts: AccountDerivation[];
};

// Flat chain list (chains are now top-level, curve removed)
const mockChains: ChainDerivation[] = [
  {
    id: 'chain-eth',
    chainId: 'eth',
    chainName: 'Ethereum',
    chainIcon: 'Ξ',
    chainColor: '#627EEA',
    coinType: 60,
    accounts: [
      {
        id: 'eth-account-0',
        accountIndex: 0,
        label: 'Treasury',
        derivationPath: "m/44'/60'/0'",
        identityId: 'corp-1', // Acme Corporation
        // 15 addresses for pagination testing
        addresses: generateMockAddresses('eth-0', 15, 'deposit'),
      },
      {
        id: 'eth-account-1',
        accountIndex: 1,
        label: 'DeFi Operations',
        derivationPath: "m/44'/60'/1'",
        identityId: 'ind-2', // Sarah Johnson - Treasury Manager
        addresses: [
          {
            id: 'eth-1-0-0',
            address: '0x3333444455556666777788889999aaaabbbbcccc',
            alias: 'Uniswap',
            change: 0,
            index: 0,
            balance: '$1,200.00',
            type: 'hot',
          },
          {
            id: 'eth-1-0-1',
            address: '0x4444555566667777888899990000aaaabbbbdddd',
            alias: 'Aave',
            change: 0,
            index: 1,
            balance: '$3,800.00',
            type: 'hot',
          },
        ],
      },
    ],
  },
  {
    id: 'chain-btc',
    chainId: 'btc',
    chainName: 'Bitcoin',
    chainIcon: '₿',
    chainColor: '#F7931A',
    coinType: 0,
    accounts: [
      {
        id: 'btc-account-0',
        accountIndex: 0,
        label: 'Cold Storage',
        derivationPath: "m/44'/0'/0'",
        identityId: 'corp-1', // Acme Corporation
        // 12 addresses for pagination testing
        addresses: generateMockAddresses('btc-0', 12, 'cold'),
      },
      {
        id: 'btc-account-1',
        accountIndex: 1,
        label: 'Hot Wallet',
        derivationPath: "m/44'/0'/1'",
        identityId: 'ind-1', // Michael Smith - CFO
        addresses: [
          {
            id: 'btc-1-0-0',
            address: 'bc1qhot1234567890abcdefghijklmnopqrstuvwx',
            alias: 'BTC Hot',
            change: 0,
            index: 0,
            balance: '$800.00',
            type: 'hot',
          },
        ],
      },
    ],
  },
  {
    id: 'chain-polygon',
    chainId: 'polygon',
    chainName: 'Polygon',
    chainIcon: '⬡',
    chainColor: '#8247E5',
    coinType: 60,
    accounts: [
      {
        id: 'polygon-account-0',
        accountIndex: 0,
        label: 'Operations',
        derivationPath: "m/44'/60'/0'",
        identityId: 'corp-2', // Global Industries Ltd
        addresses: [
          {
            id: 'polygon-0-0-0',
            address: '0x9876543210fedcba9876543210fedcba98765432',
            alias: 'Polygon Main',
            change: 0,
            index: 0,
            balance: '$300.00',
            type: 'deposit',
          },
        ],
      },
    ],
  },
  {
    id: 'chain-sol',
    chainId: 'sol',
    chainName: 'Solana',
    chainIcon: '◎',
    chainColor: '#14F195',
    coinType: 501,
    accounts: [
      {
        id: 'sol-account-0',
        accountIndex: 0,
        label: 'Trading',
        derivationPath: "m/44'/501'/0'",
        identityId: 'ind-4', // Emily Watson - Independent Trader
        addresses: [
          {
            id: 'sol-0-0-0',
            address: '7abcdefghijklmnopqrstuvwxyz123456789ABCDEF',
            alias: 'SOL Main',
            change: 0,
            index: 0,
            balance: '$3,500.00',
            type: 'deposit',
          },
          {
            id: 'sol-0-0-1',
            address: '8bcdefghijklmnopqrstuvwxyz123456789ABCDEFG',
            alias: 'SOL Staking',
            change: 0,
            index: 1,
            balance: '$2,100.00',
            type: 'deposit',
          },
        ],
      },
    ],
  },
];

// Mock data for vault details
const mockSigners: Signer[] = [
  {
    id: 'signer-1',
    name: 'Alice Mobile',
    deviceType: 'ios',
    owner: 'Alice Johnson',
    votingPower: 1,
    version: '2.4.1',
  },
  {
    id: 'signer-2',
    name: 'Bob Mobile',
    deviceType: 'android',
    owner: 'Bob Smith',
    votingPower: 1,
    version: '2.4.0',
  },
  {
    id: 'signer-3',
    name: 'Co-signer Server',
    deviceType: 'virtual',
    owner: 'System',
    votingPower: 1,
    version: '3.1.0',
  },
];

const mockCurves: VaultCurve[] = [
  {
    type: 'ECDSA',
    curve: 'secp256k1',
    fingerprint: '0x1a2b3c4d',
    publicKey:
      '0x04a5c3b2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3',
  },
  {
    type: 'EdDSA',
    curve: 'ed25519',
    fingerprint: '0x5e6f7a8b',
    publicKey: 'ed25519:9xyz8wvu7tsr6qpo5nml4kji3hgf2edc1ba0zy9xw8vuts7rqp6o',
  },
];

const mockVaultConfig = {
  threshold: 5,
  totalSigners: 3,
  createdAt: '2024-01-15 10:30',
  lastActivity: '2024-03-10 14:32',
  allowDerivedAddresses: true,
};

// Mock reshares data
type Reshare = {
  id: string;
  status: 'completed' | 'pending' | 'failed';
  initiatedAt: string;
  completedAt: string | null;
  initiatedBy: string;
  reason: string;
  newThreshold: number;
  previousThreshold: number;
  participantsCount: number;
};

const mockReshares: Reshare[] = [
  {
    id: 'reshare-1',
    status: 'completed',
    initiatedAt: '2024-03-01 09:00',
    completedAt: '2024-03-01 09:15',
    initiatedBy: 'Alice Johnson',
    reason: 'Add new signer',
    newThreshold: 5,
    previousThreshold: 4,
    participantsCount: 3,
  },
  {
    id: 'reshare-2',
    status: 'completed',
    initiatedAt: '2024-02-15 14:30',
    completedAt: '2024-02-15 14:45',
    initiatedBy: 'Bob Smith',
    reason: 'Remove compromised device',
    newThreshold: 4,
    previousThreshold: 4,
    participantsCount: 3,
  },
  {
    id: 'reshare-3',
    status: 'pending',
    initiatedAt: '2024-03-10 16:00',
    completedAt: null,
    initiatedBy: 'Alice Johnson',
    reason: 'Increase threshold',
    newThreshold: 6,
    previousThreshold: 5,
    participantsCount: 3,
  },
  {
    id: 'reshare-4',
    status: 'failed',
    initiatedAt: '2024-01-20 11:00',
    completedAt: '2024-01-20 11:30',
    initiatedBy: 'Bob Smith',
    reason: 'Key rotation',
    newThreshold: 4,
    previousThreshold: 4,
    participantsCount: 2,
  },
];

// =============================================================================
// Helper Components
// =============================================================================

const getReshareStatusIcon = (status: ReshareStatus) => {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon className="size-4 text-positive-600" />;
    case 'voting':
    case 'signing':
      return <ClockIcon className="size-4 text-warning-600" />;
    case 'failed':
    case 'rejected':
    case 'expired':
      return <XCircleIcon className="size-4 text-negative-600" />;
  }
};

const getDeviceIcon = (deviceType: DeviceType) => {
  switch (deviceType) {
    case 'virtual':
      return <ServerIcon className="size-4 text-neutral-500" />;
    case 'ios':
    case 'android':
      return <SmartphoneIcon className="size-4 text-neutral-500" />;
  }
};

const getAddressTypeStyles = (type: DerivedAddress['type']) => {
  switch (type) {
    case 'cold':
      return 'bg-blue-100 text-blue-700';
    case 'hot':
      return 'bg-orange-100 text-orange-700';
    case 'deposit':
      return 'bg-neutral-100 text-neutral-600';
  }
};

// Stats calculation (3-tier traversal: chain → account → address)
const getTotalAddresses = () => {
  return mockChains.reduce(
    (acc, chain) =>
      acc +
      chain.accounts.reduce(
        (accountAcc, account) => accountAcc + account.addresses.length,
        0
      ),
    0
  );
};

const getTotalBalance = () => {
  const total = mockChains.reduce(
    (acc, chain) =>
      acc +
      chain.accounts.reduce(
        (accountAcc, account) =>
          accountAcc +
          account.addresses.reduce((addrAcc, addr) => {
            const num = parseFloat(addr.balance.replace(/[$,]/g, ''));
            return addrAcc + num;
          }, 0),
        0
      ),
    0
  );
  return `$${total.toLocaleString()}`;
};

type TabType = 'addresses' | 'details' | 'signatures';

// =============================================================================
// Address Row Component (extracted for reuse in pagination)
// =============================================================================

type AddressRowProps = {
  addr: DerivedAddress;
  addrIndex: number;
  account: AccountDerivation;
  isLast: boolean;
  getAddressTypeStyles: (type: string) => string;
  vaultId: string;
  chainId: string;
};

const AddressRow = ({
  addr,
  addrIndex,
  account,
  isLast,
  getAddressTypeStyles,
  vaultId,
  chainId,
}: AddressRowProps) => (
  <Link
    to="/treasury/vaults/$vaultId/chain/$chain/addresses/$address"
    params={{ vaultId, chain: chainId, address: addr.address }}
    className="group flex cursor-pointer items-center gap-3 py-2 pr-4 pl-28 hover:bg-neutral-50"
  >
    {/* Tree connector */}
    <div className="relative flex size-4 items-center justify-center">
      <div className="absolute -top-3 left-1/2 h-3 w-px -translate-x-1/2 bg-neutral-200" />
      {!isLast && (
        <div className="absolute top-1/2 left-1/2 h-5 w-px -translate-x-1/2 bg-neutral-200" />
      )}
      <div className="size-1.5 rounded-full bg-neutral-300" />
    </div>

    <div className="flex flex-1 items-center gap-3">
      <span className="font-mono text-[9px] text-neutral-400">
        {account.derivationPath}/{addr.change}/{addr.index}
      </span>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-neutral-900">
            {addr.address}
          </span>
          <button
            type="button"
            className="rounded p-0.5 text-neutral-400 opacity-0 group-hover:opacity-100 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <CopyIcon className="size-3" />
          </button>
          {addr.alias && (
            <span className="text-[10px] text-neutral-500">{addr.alias}</span>
          )}
        </div>
      </div>
      <span
        className={cn(
          'rounded px-1.5 py-0.5 text-[9px] font-medium capitalize',
          getAddressTypeStyles(addr.type)
        )}
      >
        {addr.type}
      </span>
      <span className="w-20 text-right font-mono text-[11px] font-medium text-neutral-900 tabular-nums">
        {addr.balance}
      </span>
    </div>
  </Link>
);

// =============================================================================
// Addresses Secured Content - 3-Tier Tree View
// Chain → Account → Address (m/44'/coin'/account'/change/index)
// =============================================================================

// =============================================================================
// New Account Dialog Component
// =============================================================================

type NewAccountFormState = {
  chainId: string | null;
  label: string;
  identityId: string | null;
};

type NewAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const NewAccountDialog = ({ open, onOpenChange }: NewAccountDialogProps) => {
  const [formState, setFormState] = useState<NewAccountFormState>({
    chainId: null,
    label: '',
    identityId: null,
  });

  // Get selected chain for info display
  const selectedChain = mockChains.find((c) => c.id === formState.chainId);

  // Calculate next account index based on selected chain
  const nextAccountIndex = selectedChain ? selectedChain.accounts.length : 0;

  // Build the derivation path preview
  const getDerivationPathPreview = () => {
    if (!selectedChain) return "m/44'/...";
    return `m/44'/${selectedChain.coinType}'/${nextAccountIndex}'`;
  };

  // Reset form when dialog closes
  const handleClose = () => {
    setFormState({
      chainId: null,
      label: '',
      identityId: null,
    });
    onOpenChange(false);
  };

  // Handle chain selection
  const handleChainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value || null;
    setFormState((prev) => ({
      ...prev,
      chainId: value,
    }));
  };

  // Handle identity selection
  const handleIdentityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value || null;
    setFormState((prev) => ({
      ...prev,
      identityId: value,
    }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would call an API to create the account
    console.log('Creating account with:', {
      chain: selectedChain?.chainName,
      label: formState.label,
      identityId: formState.identityId,
      derivationPath: getDerivationPathPreview(),
      accountIndex: nextAccountIndex,
    });
    handleClose();
  };

  const isFormValid = formState.chainId && formState.label.trim().length > 0;

  // Common select styling
  const selectClassName =
    'h-9 w-full appearance-none border border-neutral-200 bg-white px-3 pr-8 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none disabled:bg-neutral-50 disabled:text-neutral-400';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md rounded-none sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Create New Account</DialogTitle>
          <DialogDescription className="text-xs">
            Add a new account under a chain. Each account can hold multiple
            addresses and be linked to an identity.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Chain Selection */}
            <div>
              <label
                htmlFor="new-account-chain-select"
                className="mb-1.5 block text-xs font-medium text-neutral-500"
              >
                Chain
              </label>
              <div className="relative">
                <select
                  id="new-account-chain-select"
                  value={formState.chainId ?? ''}
                  onChange={handleChainChange}
                  className={selectClassName}
                >
                  <option value="">Select a chain...</option>
                  {mockChains.map((chain) => (
                    <option key={chain.id} value={chain.id}>
                      {chain.chainIcon} {chain.chainName}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-neutral-400" />
              </div>
            </div>

            {/* Account Label */}
            <div>
              <label
                htmlFor="account-label-input"
                className="mb-1.5 block text-xs font-medium text-neutral-500"
              >
                Account Label
              </label>
              <input
                id="account-label-input"
                type="text"
                value={formState.label}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, label: e.target.value }))
                }
                placeholder="e.g., Treasury, Operations, Trading"
                className="h-9 w-full border border-neutral-200 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
              />
            </div>

            {/* Identity Selection (Optional) */}
            <div>
              <label
                htmlFor="identity-select"
                className="mb-1.5 block text-xs font-medium text-neutral-500"
              >
                Link to Identity{' '}
                <span className="text-neutral-400">(optional)</span>
              </label>
              <div className="relative">
                <select
                  id="identity-select"
                  value={formState.identityId ?? ''}
                  onChange={handleIdentityChange}
                  className={selectClassName}
                >
                  <option value="">No identity linked</option>
                  {allIdentities.map((identity) => (
                    <option key={identity.id} value={identity.id}>
                      {isCorporateIdentity(identity) ? '🏢' : '👤'}{' '}
                      {identity.name}
                      {identity.displayName ? ` (${identity.displayName})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-neutral-400" />
              </div>
              <p className="mt-1.5 text-[10px] text-neutral-400">
                Linking an identity helps with compliance tracking and KYC
                requirements.
              </p>
            </div>

            {/* Derivation Path Preview */}
            <div className="border border-neutral-200 bg-neutral-50 p-3">
              <div className="mb-1 text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
                Derivation Path
              </div>
              <div className="flex items-center gap-2">
                <KeyIcon className="size-4 text-neutral-400" />
                <span className="font-mono text-sm font-medium text-neutral-900">
                  {getDerivationPathPreview()}
                </span>
              </div>
              {selectedChain && (
                <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
                  <div
                    className="flex size-4 items-center justify-center"
                    style={{ backgroundColor: `${selectedChain.chainColor}20` }}
                  >
                    <span
                      className="text-[8px] font-bold"
                      style={{ color: selectedChain.chainColor }}
                    >
                      {selectedChain.chainIcon ||
                        selectedChain.chainId.slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                  <span>{selectedChain.chainName}</span>
                  <span className="text-neutral-300">→</span>
                  <span>Account #{nextAccountIndex}</span>
                  {selectedChain.accounts.length > 0 && (
                    <span className="text-neutral-400">
                      ({selectedChain.accounts.length} existing)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-t border-neutral-200 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              className="h-8 rounded-none border-neutral-200 px-4 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid}
              className="h-8 rounded-none bg-brand-500 px-4 text-xs text-white hover:bg-brand-600 disabled:bg-neutral-200 disabled:text-neutral-400"
            >
              <PlusIcon className="mr-1.5 size-3.5" />
              Create Account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// =============================================================================
// Derive Address Dialog Component
// =============================================================================

type DeriveAddressFormState = {
  chainId: string | null;
  accountId: string | null;
  addressType: 'deposit' | 'cold' | 'hot';
  alias: string;
};

const ADDRESS_TYPE_OPTIONS = [
  { id: 'deposit', label: 'Deposit' },
  { id: 'cold', label: 'Cold Storage' },
  { id: 'hot', label: 'Hot Wallet' },
] as const;

type DeriveAddressDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DeriveAddressDialog = ({
  open,
  onOpenChange,
}: DeriveAddressDialogProps) => {
  const [formState, setFormState] = useState<DeriveAddressFormState>({
    chainId: null,
    accountId: null,
    addressType: 'deposit',
    alias: '',
  });

  // Get selected chain
  const selectedChain = mockChains.find((c) => c.id === formState.chainId);

  // Get selected account for derivation path preview
  const selectedAccount = selectedChain?.accounts.find(
    (a) => a.id === formState.accountId
  );

  // Calculate next address index based on selected account
  const nextAddressIndex = selectedAccount
    ? selectedAccount.addresses.length
    : 0;

  // Build the full derivation path preview
  const getDerivationPathPreview = () => {
    if (!selectedAccount) return "m/44'/...";
    return `${selectedAccount.derivationPath}/0/${nextAddressIndex}`;
  };

  // Reset form when dialog closes
  const handleClose = () => {
    setFormState({
      chainId: null,
      accountId: null,
      addressType: 'deposit',
      alias: '',
    });
    onOpenChange(false);
  };

  // Handle chain selection - reset account when chain changes
  const handleChainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value || null;
    setFormState((prev) => ({
      ...prev,
      chainId: value,
      accountId: null, // Reset account when chain changes
    }));
  };

  // Handle account selection
  const handleAccountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value || null;
    setFormState((prev) => ({
      ...prev,
      accountId: value,
    }));
  };

  // Handle address type selection
  const handleAddressTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormState((prev) => ({
      ...prev,
      addressType: e.target.value as 'deposit' | 'cold' | 'hot',
    }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would call an API to derive the address
    console.log('Deriving address with:', {
      chain: selectedChain?.chainName,
      account: selectedAccount?.label,
      derivationPath: getDerivationPathPreview(),
      addressType: formState.addressType,
      alias: formState.alias || null,
    });
    handleClose();
  };

  const isFormValid = formState.chainId && formState.accountId;

  // Common select styling
  const selectClassName =
    'h-9 w-full appearance-none border border-neutral-200 bg-white px-3 pr-8 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none disabled:bg-neutral-50 disabled:text-neutral-400';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md rounded-none sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Derive New Address</DialogTitle>
          <DialogDescription className="text-xs">
            Generate a new address from your vault&apos;s HD wallet using the
            BIP-44 derivation path.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Chain Selection */}
            <div>
              <label
                htmlFor="chain-select"
                className="mb-1.5 block text-xs font-medium text-neutral-500"
              >
                Chain
              </label>
              <div className="relative">
                <select
                  id="chain-select"
                  value={formState.chainId ?? ''}
                  onChange={handleChainChange}
                  className={selectClassName}
                >
                  <option value="">Select a chain...</option>
                  {mockChains.map((chain) => (
                    <option key={chain.id} value={chain.id}>
                      {chain.chainIcon} {chain.chainName}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-neutral-400" />
              </div>
            </div>

            {/* Account Selection */}
            <div>
              <label
                htmlFor="account-select"
                className="mb-1.5 block text-xs font-medium text-neutral-500"
              >
                Account
              </label>
              <div className="relative">
                <select
                  id="account-select"
                  value={formState.accountId ?? ''}
                  onChange={handleAccountChange}
                  disabled={!formState.chainId}
                  className={selectClassName}
                >
                  <option value="">
                    {formState.chainId
                      ? 'Select an account...'
                      : 'Select a chain first'}
                  </option>
                  {selectedChain?.accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.label} ({acc.derivationPath})
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-neutral-400" />
              </div>
            </div>

            {/* Address Type */}
            <div>
              <label
                htmlFor="type-select"
                className="mb-1.5 block text-xs font-medium text-neutral-500"
              >
                Address Type
              </label>
              <div className="relative">
                <select
                  id="type-select"
                  value={formState.addressType}
                  onChange={handleAddressTypeChange}
                  className={selectClassName}
                >
                  {ADDRESS_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-neutral-400" />
              </div>
            </div>

            {/* Alias (Optional) */}
            <div>
              <label
                htmlFor="alias-input"
                className="mb-1.5 block text-xs font-medium text-neutral-500"
              >
                Alias <span className="text-neutral-400">(optional)</span>
              </label>
              <input
                id="alias-input"
                type="text"
                value={formState.alias}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, alias: e.target.value }))
                }
                placeholder="e.g., Payroll, Trading, Customer Deposits"
                className="h-9 w-full border border-neutral-200 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
              />
            </div>

            {/* Derivation Path Preview */}
            <div className="border border-neutral-200 bg-neutral-50 p-3">
              <div className="mb-1 text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
                Derivation Path
              </div>
              <div className="flex items-center gap-2">
                <KeyIcon className="size-4 text-neutral-400" />
                <span className="font-mono text-sm font-medium text-neutral-900">
                  {getDerivationPathPreview()}
                </span>
              </div>
              {selectedChain && (
                <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
                  <div
                    className="flex size-4 items-center justify-center"
                    style={{ backgroundColor: `${selectedChain.chainColor}20` }}
                  >
                    <span
                      className="text-[8px] font-bold"
                      style={{ color: selectedChain.chainColor }}
                    >
                      {selectedChain.chainIcon ||
                        selectedChain.chainId.slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                  <span>{selectedChain.chainName}</span>
                  {selectedAccount && (
                    <>
                      <span className="text-neutral-300">→</span>
                      <span>{selectedAccount.label}</span>
                      <span className="text-neutral-300">→</span>
                      <span>Address #{nextAddressIndex}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-t border-neutral-200 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              className="h-8 rounded-none border-neutral-200 px-4 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid}
              className="h-8 rounded-none bg-brand-500 px-4 text-xs text-white hover:bg-brand-600 disabled:bg-neutral-200 disabled:text-neutral-400"
            >
              <PlusIcon className="mr-1.5 size-3.5" />
              Derive Address
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// =============================================================================
// Addresses Secured Content - 3-Tier Tree View
// Chain → Account → Address (m/44'/coin'/account'/change/index)
// =============================================================================

type AddressesTreeContentProps = {
  vaultId: string;
};

const AddressesTreeContent = ({ vaultId }: AddressesTreeContentProps) => {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [isDeriveDialogOpen, setIsDeriveDialogOpen] = useState(false);
  const [isNewAccountDialogOpen, setIsNewAccountDialogOpen] = useState(false);

  // Expand/collapse state
  const [expandedChains, setExpandedChains] = useState<string[]>(
    mockChains.map((ch) => ch.id)
  );
  const [expandedAccounts, setExpandedAccounts] = useState<string[]>(
    mockChains.flatMap((ch) => ch.accounts.map((acc) => acc.id))
  );

  // Pagination state
  const [paginationStyle, setPaginationStyle] =
    useState<PaginationStyle>('collapse-summary');
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>(
    {}
  ); // For show-more and collapse-summary
  const [currentPages, setCurrentPages] = useState<Record<string, number>>({}); // For pagination

  // Search filter function
  const filterBySearch = (chains: ChainDerivation[]): ChainDerivation[] => {
    if (!searchQuery.trim()) return chains;

    const query = searchQuery.toLowerCase();

    return chains
      .map((chain) => {
        // Filter accounts that match or have matching addresses/identities
        const filteredAccounts = chain.accounts
          .map((account) => {
            // Check if account matches
            const accountMatches =
              account.label.toLowerCase().includes(query) ||
              account.derivationPath.toLowerCase().includes(query);

            // Check identity match
            const identity = account.identityId
              ? getIdentityById(account.identityId)
              : null;
            const identityMatches = identity
              ? identity.name.toLowerCase().includes(query) ||
                (identity.displayName?.toLowerCase().includes(query) ?? false)
              : false;

            // Filter addresses that match
            const filteredAddresses = account.addresses.filter(
              (addr) =>
                addr.address.toLowerCase().includes(query) ||
                (addr.alias?.toLowerCase().includes(query) ?? false)
            );

            // Include account if it matches or has matching addresses/identity
            if (
              accountMatches ||
              identityMatches ||
              filteredAddresses.length > 0
            ) {
              return {
                ...account,
                addresses:
                  filteredAddresses.length > 0
                    ? filteredAddresses
                    : account.addresses,
              };
            }
            return null;
          })
          .filter((acc): acc is AccountDerivation => acc !== null);

        // Check if chain name matches
        const chainMatches = chain.chainName.toLowerCase().includes(query);

        // Include chain if it matches or has matching accounts
        if (chainMatches || filteredAccounts.length > 0) {
          return {
            ...chain,
            accounts:
              filteredAccounts.length > 0 ? filteredAccounts : chain.accounts,
          };
        }
        return null;
      })
      .filter((chain): chain is ChainDerivation => chain !== null);
  };

  // Filtered chains based on search
  const filteredChains = filterBySearch(mockChains);

  // Get visible count for an account (default to ADDRESSES_PER_PAGE)
  const getVisibleCount = (accountId: string) =>
    visibleCounts[accountId] ?? ADDRESSES_PER_PAGE;

  // Get current page for an account (default to 1)
  const getCurrentPage = (accountId: string) => currentPages[accountId] ?? 1;

  // Show more addresses for an account
  const showMore = (accountId: string, totalAddresses: number) => {
    setVisibleCounts((prev) => ({
      ...prev,
      [accountId]: Math.min(
        (prev[accountId] ?? ADDRESSES_PER_PAGE) + ADDRESSES_PER_PAGE,
        totalAddresses
      ),
    }));
  };

  // Collapse back to default count
  const collapseToDefault = (accountId: string) => {
    setVisibleCounts((prev) => ({
      ...prev,
      [accountId]: ADDRESSES_PER_PAGE,
    }));
  };

  // Go to next/previous page
  const goToPage = (accountId: string, page: number, totalPages: number) => {
    setCurrentPages((prev) => ({
      ...prev,
      [accountId]: Math.max(1, Math.min(page, totalPages)),
    }));
  };

  const toggleChain = (chainId: string) => {
    setExpandedChains((prev) =>
      prev.includes(chainId)
        ? prev.filter((id) => id !== chainId)
        : [...prev, chainId]
    );
  };

  const toggleAccount = (accountId: string) => {
    setExpandedAccounts((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };

  // Count addresses for a chain (across all accounts)
  const getChainAddressCount = (chain: ChainDerivation) =>
    chain.accounts.reduce((acc, account) => acc + account.addresses.length, 0);

  // Get identity type icon/badge
  const getIdentityTypeBadge = (identity: Identity) => {
    if (isCorporateIdentity(identity)) {
      return (
        <span className="flex size-5 items-center justify-center rounded bg-brand-100 text-[9px] font-bold text-brand-600">
          ORG
        </span>
      );
    }
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-neutral-200 text-[9px] font-bold text-neutral-600">
        {identity.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)}
      </span>
    );
  };

  // Get total address count across all chains
  const getTotalAddressCount = () =>
    mockChains.reduce((acc, chain) => acc + getChainAddressCount(chain), 0);

  return (
    <>
      {/* Header with Search */}
      <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50 px-4 py-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <SearchIcon className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search addresses..."
                // value={search}
                // onChange={(e) => handleSearchChange(e.target.value)}
                className="h-7 w-100 border border-neutral-200 bg-white pr-2 pl-7 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="h-7 rounded-none border-neutral-300 px-3 text-xs font-medium"
            onClick={() => setIsNewAccountDialogOpen(true)}
          >
            <PlusIcon className="mr-1.5 size-3.5" />
            New Account
          </Button>
          <Button
            variant="secondary"
            className="h-7 rounded-none border-neutral-300 px-3 text-xs font-medium"
            onClick={() => setIsDeriveDialogOpen(true)}
          >
            <PlusIcon className="mr-1.5 size-3.5" />
            Derive Address
          </Button>
        </div>
      </div>

      {/* New Account Dialog */}
      <NewAccountDialog
        open={isNewAccountDialogOpen}
        onOpenChange={setIsNewAccountDialogOpen}
      />

      {/* Derive Address Dialog */}
      <DeriveAddressDialog
        open={isDeriveDialogOpen}
        onOpenChange={setIsDeriveDialogOpen}
      />

      {/* Tree View */}
      <div className="divide-y divide-neutral-100">
        {/* No Results State */}
        {filteredChains.length === 0 && searchQuery && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <SearchIcon className="size-8 text-neutral-300" />
            <p className="mt-3 text-sm font-medium text-neutral-600">
              No results found
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              No chains, accounts, or addresses match &quot;{searchQuery}&quot;
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-4 rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-200"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Level 1: Chains (top level) */}
        {filteredChains.map((chain) => (
          <div key={chain.id}>
            <button
              type="button"
              onClick={() => toggleChain(chain.id)}
              className="flex w-full items-center gap-3 px-4 py-3 hover:bg-neutral-50"
            >
              <div className="flex size-6 items-center justify-center">
                {expandedChains.includes(chain.id) ? (
                  <ChevronDownIcon className="size-4 text-neutral-400" />
                ) : (
                  <ChevronRightIcon className="size-4 text-neutral-400" />
                )}
              </div>
              <div
                className="flex size-8 items-center justify-center rounded-full"
                style={{ backgroundColor: `${chain.chainColor}20` }}
              >
                <span
                  className="text-sm font-bold"
                  style={{ color: chain.chainColor }}
                >
                  {chain.chainIcon || chain.chainId.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-900">
                    {chain.chainName}
                  </span>
                  <span className="font-mono text-xs text-neutral-500">
                    m/44&apos;/{chain.coinType}&apos;
                  </span>
                </div>
              </div>
              <span className="text-xs text-neutral-500">
                {chain.accounts.length} accounts · {getChainAddressCount(chain)}{' '}
                addresses
              </span>
            </button>

            {/* Level 2: Accounts */}
            {expandedChains.includes(chain.id) && (
              <div className="border-t border-neutral-100 bg-neutral-50/50">
                {chain.accounts.map((account) => (
                  <div key={account.id}>
                    <button
                      type="button"
                      onClick={() => toggleAccount(account.id)}
                      className="flex w-full items-center gap-3 py-2.5 pr-4 pl-14 hover:bg-neutral-100"
                    >
                      <div className="flex size-4 items-center justify-center">
                        {expandedAccounts.includes(account.id) ? (
                          <ChevronDownIcon className="size-3 text-neutral-400" />
                        ) : (
                          <ChevronRightIcon className="size-3 text-neutral-400" />
                        )}
                      </div>
                      <div className="flex size-5 items-center justify-center rounded bg-neutral-200 text-[9px] font-bold text-neutral-600">
                        {account.accountIndex}
                      </div>
                      <div className="flex flex-1 items-center gap-3 text-left">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium text-neutral-800">
                              {account.label}
                            </span>
                            <span className="font-mono text-[10px] text-neutral-400">
                              {account.derivationPath}
                            </span>
                          </div>
                          {/* Identity Badge */}
                          {account.identityId &&
                            (() => {
                              const identity = getIdentityById(
                                account.identityId
                              );
                              if (!identity) return null;
                              return (
                                <div className="mt-1 flex items-center gap-2">
                                  {getIdentityTypeBadge(identity)}
                                  <span className="text-[10px] font-medium text-neutral-700">
                                    {identity.displayName || identity.name}
                                  </span>
                                  {isCorporateIdentity(identity) &&
                                    identity.jurisdiction && (
                                      <span className="text-[9px] text-neutral-400">
                                        {identity.jurisdiction}
                                      </span>
                                    )}
                                </div>
                              );
                            })()}
                        </div>
                      </div>
                      <span className="text-[10px] text-neutral-500">
                        {account.addresses.length} addr
                      </span>
                    </button>

                    {/* Level 3: Addresses with Pagination */}
                    {expandedAccounts.includes(account.id) &&
                      (() => {
                        const totalAddresses = account.addresses.length;
                        const totalPages = Math.ceil(
                          totalAddresses / ADDRESSES_PER_PAGE
                        );
                        const currentPage = getCurrentPage(account.id);
                        const visibleCount = getVisibleCount(account.id);

                        // Determine which addresses to show based on pagination style
                        let addressesToShow: DerivedAddress[] = [];
                        let showPaginationControls = false;

                        switch (paginationStyle) {
                          case 'none':
                            addressesToShow = account.addresses;
                            break;
                          case 'show-more':
                            addressesToShow = account.addresses.slice(
                              0,
                              visibleCount
                            );
                            showPaginationControls =
                              visibleCount < totalAddresses;
                            break;
                          case 'pagination':
                            const startIdx =
                              (currentPage - 1) * ADDRESSES_PER_PAGE;
                            addressesToShow = account.addresses.slice(
                              startIdx,
                              startIdx + ADDRESSES_PER_PAGE
                            );
                            showPaginationControls = totalPages > 1;
                            break;
                          case 'virtual-scroll':
                            addressesToShow = account.addresses;
                            break;
                          case 'collapse-summary':
                            // Always show addresses (default 5), with show more/collapse controls
                            addressesToShow = account.addresses.slice(
                              0,
                              visibleCount
                            );
                            showPaginationControls =
                              visibleCount < totalAddresses ||
                              visibleCount > ADDRESSES_PER_PAGE;
                            break;
                        }

                        return (
                          <div className="border-t border-neutral-200/50 bg-white">
                            {/* Virtual Scroll: Wrap in scrollable container */}
                            {paginationStyle === 'virtual-scroll' ? (
                              <div className="max-h-48 overflow-y-auto">
                                {addressesToShow.map((addr, addrIndex) => (
                                  <AddressRow
                                    key={addr.id}
                                    addr={addr}
                                    addrIndex={addrIndex}
                                    account={account}
                                    isLast={
                                      addrIndex === addressesToShow.length - 1
                                    }
                                    getAddressTypeStyles={getAddressTypeStyles}
                                    vaultId={vaultId}
                                    chainId={chain.chainId}
                                  />
                                ))}
                              </div>
                            ) : (
                              <>
                                {/* Regular address list */}
                                {addressesToShow.map((addr, addrIndex) => (
                                  <AddressRow
                                    key={addr.id}
                                    addr={addr}
                                    addrIndex={addrIndex}
                                    account={account}
                                    isLast={
                                      addrIndex ===
                                        addressesToShow.length - 1 &&
                                      !showPaginationControls
                                    }
                                    getAddressTypeStyles={getAddressTypeStyles}
                                    vaultId={vaultId}
                                    chainId={chain.chainId}
                                  />
                                ))}
                              </>
                            )}

                            {/* Show More Button */}
                            {paginationStyle === 'show-more' &&
                              showPaginationControls && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    showMore(account.id, totalAddresses)
                                  }
                                  className="flex w-full items-center justify-center gap-2 border-t border-neutral-100 py-2 text-[11px] font-medium text-brand-600 hover:bg-brand-50"
                                >
                                  <PlusIcon className="size-3.5" />
                                  Show{' '}
                                  {Math.min(
                                    ADDRESSES_PER_PAGE,
                                    totalAddresses - visibleCount
                                  )}{' '}
                                  more
                                  <span className="text-neutral-400">
                                    ({visibleCount} of {totalAddresses})
                                  </span>
                                </button>
                              )}

                            {/* Pagination Controls */}
                            {paginationStyle === 'pagination' &&
                              showPaginationControls && (
                                <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-2 pl-28">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      goToPage(
                                        account.id,
                                        currentPage - 1,
                                        totalPages
                                      )
                                    }
                                    disabled={currentPage === 1}
                                    className={cn(
                                      'flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium',
                                      currentPage === 1
                                        ? 'cursor-not-allowed text-neutral-300'
                                        : 'text-neutral-600 hover:bg-neutral-100'
                                    )}
                                  >
                                    <ChevronLeftIcon className="size-3" />
                                    Previous
                                  </button>
                                  <div className="flex items-center gap-1">
                                    {Array.from(
                                      { length: totalPages },
                                      (_, i) => i + 1
                                    ).map((page) => (
                                      <button
                                        key={page}
                                        type="button"
                                        onClick={() =>
                                          goToPage(account.id, page, totalPages)
                                        }
                                        className={cn(
                                          'flex size-6 items-center justify-center rounded text-[10px] font-medium',
                                          currentPage === page
                                            ? 'bg-brand-100 text-brand-700'
                                            : 'text-neutral-500 hover:bg-neutral-100'
                                        )}
                                      >
                                        {page}
                                      </button>
                                    ))}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      goToPage(
                                        account.id,
                                        currentPage + 1,
                                        totalPages
                                      )
                                    }
                                    disabled={currentPage === totalPages}
                                    className={cn(
                                      'flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium',
                                      currentPage === totalPages
                                        ? 'cursor-not-allowed text-neutral-300'
                                        : 'text-neutral-600 hover:bg-neutral-100'
                                    )}
                                  >
                                    Next
                                    <ChevronRightIcon className="size-3" />
                                  </button>
                                </div>
                              )}

                            {/* Collapse Summary: Show more / Collapse controls */}
                            {paginationStyle === 'collapse-summary' &&
                              showPaginationControls && (
                                <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-2 pl-28">
                                  {/* Show Collapse button when showing more than default */}
                                  {visibleCount > ADDRESSES_PER_PAGE ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        collapseToDefault(account.id)
                                      }
                                      className="flex items-center gap-1 text-[10px] font-medium text-neutral-500 hover:text-neutral-700"
                                    >
                                      <ChevronUpIcon className="size-3" />
                                      Collapse
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-neutral-400">
                                      {visibleCount} of {totalAddresses}
                                    </span>
                                  )}
                                  {/* Show "Show more" when there are more addresses */}
                                  {visibleCount < totalAddresses && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        showMore(account.id, totalAddresses)
                                      }
                                      className="flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:text-brand-700"
                                    >
                                      <PlusIcon className="size-3" />
                                      Show{' '}
                                      {Math.min(
                                        ADDRESSES_PER_PAGE,
                                        totalAddresses - visibleCount
                                      )}{' '}
                                      more
                                    </button>
                                  )}
                                </div>
                              )}
                          </div>
                        );
                      })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
};

// =============================================================================
// Signatures Content with Pagination
// =============================================================================

const PAGE_SIZE_OPTIONS: FilterSelectOption[] = [
  { id: '5', label: '5' },
  { id: '10', label: '10' },
  { id: '25', label: '25' },
  { id: '50', label: '50' },
];

const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0]!;

// Map API coseAlgorithm to display-friendly name
const mapCoseAlgorithmToDisplay = (
  algorithm: SignatureItem['coseAlgorithm']
): string => {
  switch (algorithm) {
    case 'eddsa':
    case 'eddsa_blake2b':
      return 'EdDSA';
    case 'es256k':
    case 'eskec256':
      return 'ECDSA';
  }
};

// Get description from signature content type
const getSignatureDescription = (sig: SignatureItem): string => {
  if (sig.contentType === 'application/x-eip712+json') {
    return 'EIP-712 Typed Data';
  }
  if (sig.contentType === 'text/plain') {
    return 'Plain Text Message';
  }
  if (sig.chainId) {
    return `Chain ${sig.chainId} Transaction`;
  }
  return 'Raw Data Signature';
};

// Truncate data hash for display
const truncateDataHash = (
  data: string[],
  signature: string[] | null
): string => {
  // Prefer showing the signature if available, otherwise show the data
  const hashToShow = signature?.[0] ?? data[0] ?? '';
  if (!hashToShow) return '—';
  if (hashToShow.length <= 20) return hashToShow;
  return `${hashToShow.slice(0, 10)}...${hashToShow.slice(-8)}`;
};

type SignaturesContentProps = {
  vaultId: string;
};

const SignaturesContent = ({ vaultId }: SignaturesContentProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSizeOption, setPageSizeOption] =
    useState<FilterSelectOption | null>(DEFAULT_PAGE_SIZE);
  const pageSize = pageSizeOption ? Number(pageSizeOption.id) : 5;

  // Fetch signatures from API
  const {
    data: signaturesData,
    isLoading,
    error,
  } = useQuery(
    orpc.vaults.listSignatures.queryOptions({
      input: { vaultId, limit: 100 },
    })
  );

  const signatures = signaturesData?.data ?? [];

  const totalPages = useMemo(
    () => Math.ceil(signatures.length / pageSize),
    [signatures.length, pageSize]
  );
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedSignatures = useMemo(
    () => signatures.slice(startIndex, endIndex),
    [signatures, startIndex, endIndex]
  );

  const handlePageSizeChange = (value: FilterSelectOption) => {
    setPageSizeOption(value);
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="px-4 py-8 text-center">
        <div className="mx-auto size-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-500" />
        <p className="mt-2 text-sm text-neutral-500">Loading signatures...</p>
      </div>
    );
  }

  if (error) {
    // Check if this is a "vault not active" error
    const errorData = (error as { data?: { errorCode?: string } })?.data;
    const isVaultNotActive = errorData?.errorCode === 'VAULT_NOT_ACTIVE';

    if (isVaultNotActive) {
      return (
        <div className="px-4 py-8 text-center">
          <HistoryIcon className="mx-auto size-8 text-neutral-300" />
          <p className="mt-2 text-sm text-neutral-500">No signatures yet</p>
          <p className="mt-1 text-xs text-neutral-400">
            Signatures will be available once the vault is active
          </p>
        </div>
      );
    }

    return (
      <div className="px-4 py-8 text-center">
        <XCircleIcon className="mx-auto size-8 text-negative-300" />
        <p className="mt-2 text-sm text-negative-500">
          Failed to load signatures
        </p>
        <p className="mt-1 text-xs text-neutral-400">
          {error.message || 'Please try again later'}
        </p>
      </div>
    );
  }

  if (signatures.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <HistoryIcon className="mx-auto size-8 text-neutral-300" />
        <p className="mt-2 text-sm text-neutral-500">No signatures yet</p>
        <p className="mt-1 text-xs text-neutral-400">
          This vault has not been used to sign any messages
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50 px-4 py-2">
        <p className="text-[11px] text-neutral-500">
          All cryptographic signatures produced by this vault
        </p>
        <span className="text-xs text-neutral-500 tabular-nums">
          {signatures.length}{' '}
          {signatures.length === 1 ? 'signature' : 'signatures'}
        </span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-neutral-100 bg-neutral-50 text-left">
            <th className="px-4 py-2 font-medium text-neutral-500">Status</th>
            <th className="px-4 py-2 font-medium text-neutral-500">
              Description
            </th>
            <th className="px-4 py-2 font-medium text-neutral-500">Data</th>
            <th className="px-4 py-2 font-medium text-neutral-500">
              Algorithm
            </th>
            <th className="px-4 py-2 font-medium text-neutral-500">
              Created At
            </th>
            <th className="px-4 py-2 font-medium text-neutral-500">
              Created By
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {paginatedSignatures.map((sig) => (
            <tr key={sig.id} className="hover:bg-neutral-50">
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  {getStatusIcon(sig.status)}
                  <span className="text-neutral-600 capitalize">
                    {sig.status}
                  </span>
                </div>
              </td>
              <td className="px-4 py-2.5 font-medium text-neutral-900">
                {getSignatureDescription(sig)}
              </td>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="max-w-[120px] truncate font-mono text-neutral-600">
                    {truncateDataHash(sig.data, sig.signature)}
                  </span>
                  <button
                    type="button"
                    className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                    onClick={() => {
                      const dataToCopy =
                        sig.signature?.[0] ?? sig.data[0] ?? '';
                      navigator.clipboard.writeText(dataToCopy);
                    }}
                  >
                    <CopyIcon className="size-3" />
                  </button>
                </div>
              </td>
              <td className="px-4 py-2.5">
                <span className="inline-block rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-neutral-600">
                  {mapCoseAlgorithmToDisplay(sig.coseAlgorithm)}
                </span>
              </td>
              <td className="px-4 py-2.5 text-neutral-600 tabular-nums">
                {formatDateTimeNumeric(sig.createdAt)}
              </td>
              <td className="px-4 py-2.5 text-neutral-600">{sig.createdBy}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-neutral-200 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">Rows per page:</span>
          <FilterSelect
            options={PAGE_SIZE_OPTIONS}
            value={pageSizeOption}
            onChange={handlePageSizeChange}
            className="w-16"
          />
        </div>

        <div className="flex items-center gap-1">
          <span className="mr-2 text-xs text-neutral-500">
            {startIndex + 1}-{Math.min(endIndex, signatures.length)} of{' '}
            {signatures.length}
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
              .reduce<(number | 'ellipsis')[]>((acc, page, idx, arr) => {
                if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
                  acc.push('ellipsis');
                }
                acc.push(page);
                return acc;
              }, [])
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
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
    </>
  );
};

// =============================================================================
// Reshares Table Component with Pagination
// =============================================================================

type ResharesTableProps = {
  vaultId: string;
};

const ResharesTable = ({ vaultId }: ResharesTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSizeOption, setPageSizeOption] =
    useState<FilterSelectOption | null>(DEFAULT_PAGE_SIZE);
  const pageSize = pageSizeOption ? Number(pageSizeOption.id) : 5;

  const { data: resharesData, isLoading } = useQuery(
    orpc.vaults.listReshares.queryOptions({
      input: { vaultId },
    })
  );

  const reshares = resharesData?.data ?? [];

  const totalPages = useMemo(
    () => Math.ceil(reshares.length / pageSize),
    [reshares.length, pageSize]
  );
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedReshares = useMemo(
    () => reshares.slice(startIndex, endIndex),
    [reshares, startIndex, endIndex]
  );

  const handlePageSizeChange = (value: FilterSelectOption) => {
    setPageSizeOption(value);
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="border border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50 px-4 py-2">
          <div className="flex items-center gap-2">
            <HistoryIcon className="size-3.5 text-neutral-500" />
            <span className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
              Reshares
            </span>
          </div>
        </div>
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-neutral-500">Loading reshares...</p>
        </div>
      </div>
    );
  }

  if (reshares.length === 0) {
    return (
      <div className="border border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50 px-4 py-2">
          <div className="flex items-center gap-2">
            <HistoryIcon className="size-3.5 text-neutral-500" />
            <span className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
              Reshares
            </span>
          </div>
          <Link to="/treasury/vaults/$vaultId/edit" params={{ vaultId }}>
            <Button
              type="button"
              className="h-7 rounded-none bg-brand-500 px-3 text-xs text-white hover:bg-brand-600"
            >
              Reshare
            </Button>
          </Link>
        </div>
        <div className="px-4 py-8 text-center">
          <HistoryIcon className="mx-auto size-8 text-neutral-300" />
          <p className="mt-2 text-sm text-neutral-500">No reshares yet</p>
          <p className="mt-1 text-xs text-neutral-400">
            This vault has not been reshared
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-neutral-200 bg-white">
      <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50 px-4 py-2">
        <div className="flex items-center gap-2">
          <HistoryIcon className="size-3.5 text-neutral-500" />
          <span className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
            Reshares
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-500 tabular-nums">
            {reshares.length} {reshares.length === 1 ? 'reshare' : 'reshares'}
          </span>
          <Link to="/treasury/vaults/$vaultId/edit" params={{ vaultId }}>
            <Button
              type="button"
              className="h-7 rounded-none bg-brand-500 px-3 text-xs text-white hover:bg-brand-600"
            >
              Reshare
            </Button>
          </Link>
        </div>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-neutral-100 bg-neutral-50 text-left">
            <th className="px-4 py-2 font-medium text-neutral-500">Status</th>
            <th className="px-4 py-2 font-medium text-neutral-500">Memo</th>
            <th className="px-4 py-2 font-medium text-neutral-500">
              Threshold
            </th>
            <th className="px-4 py-2 font-medium text-neutral-500">
              Created At
            </th>
            <th className="px-4 py-2 font-medium text-neutral-500">
              Expires At
            </th>
            <th className="px-4 py-2 font-medium text-neutral-500">
              Created By
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {paginatedReshares.map((reshare) => (
            <Link
              key={reshare.id}
              to="/treasury/vaults/$vaultId/reshares/$reshareId"
              params={{ vaultId, reshareId: reshare.id }}
              className="contents"
            >
              <tr className="cursor-pointer hover:bg-neutral-50">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    {getReshareStatusIcon(reshare.status)}
                    <span className="text-neutral-600 capitalize">
                      {reshare.status}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2.5 font-medium text-neutral-900">
                  {reshare.memo ?? '—'}
                </td>
                <td className="px-4 py-2.5">
                  <span className="font-medium text-neutral-900 tabular-nums">
                    {reshare.threshold}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-neutral-600 tabular-nums">
                  {reshare.createdAt}
                </td>
                <td className="px-4 py-2.5 text-neutral-600 tabular-nums">
                  {reshare.expiresAt}
                </td>
                <td className="px-4 py-2.5 text-neutral-600">
                  {reshare.createdBy}
                </td>
              </tr>
            </Link>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-neutral-200 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">Rows per page:</span>
          <FilterSelect
            options={PAGE_SIZE_OPTIONS}
            value={pageSizeOption}
            onChange={handlePageSizeChange}
            className="w-16"
          />
        </div>

        <div className="flex items-center gap-1">
          <span className="mr-2 text-xs text-neutral-500">
            {startIndex + 1}-{Math.min(endIndex, reshares.length)} of{' '}
            {reshares.length}
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
              .reduce<(number | 'ellipsis')[]>((acc, page, idx, arr) => {
                if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
                  acc.push('ellipsis');
                }
                acc.push(page);
                return acc;
              }, [])
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
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
    </div>
  );
};

// =============================================================================
// Details Content
// =============================================================================

type DetailsContentProps = {
  vaultId: string;
};

const DetailsContent = ({ vaultId }: DetailsContentProps) => {
  const { data: vault } = useQuery(
    orpc.vaults.get.queryOptions({ input: { id: vaultId } })
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Top Row: 50/50 Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left Column: Threshold & Signers */}
        <div className="flex flex-col gap-4">
          {/* Threshold Card */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50 px-4 py-2">
              <UsersIcon className="size-3.5 text-neutral-500" />
              <span className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
                Signing Threshold
              </span>
            </div>
            <div className="flex items-center justify-center py-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-brand-600 tabular-nums">
                  {vault?.threshold ?? '-'}
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  signing power required
                </p>
              </div>
            </div>
            <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-2">
              <div className="flex items-center justify-between text-[10px] text-neutral-400">
                <span>Created: {vault?.createdAt ?? '-'}</span>
                <span>Last Activity: {vault?.lastUsed ?? 'Never'}</span>
              </div>
            </div>
          </div>

          {/* Signers Card */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50 px-4 py-2">
              <span className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
                Signers
              </span>
              <span className="ml-auto text-[10px] text-neutral-400 tabular-nums">
                {vault?.signers.length ?? 0} signers
              </span>
            </div>
            {vault?.signers.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <UsersIcon className="mx-auto size-8 text-neutral-300" />
                <p className="mt-2 text-sm text-neutral-500">No signers</p>
                <p className="mt-1 text-xs text-neutral-400">
                  Signers will be available after the vault is activated
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {vault?.signers.map((signer) => (
                  <div
                    key={signer.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50"
                  >
                    <div className="flex size-8 items-center justify-center rounded-full bg-neutral-100">
                      {getDeviceIcon(signer.deviceType)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-neutral-900">
                          {signer.name}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-neutral-500">
                        <span>{signer.owner}</span>
                        <span className="text-neutral-300">·</span>
                        <span className="capitalize">{signer.deviceType}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium text-brand-700 tabular-nums">
                        {signer.votingPower} Signing Power
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Curves & Derived Addresses */}
        <div className="flex flex-col gap-4">
          {/* Curves Card */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50 px-4 py-2">
              <KeyIcon className="size-3.5 text-neutral-500" />
              <span className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
                Cryptographic Curves
              </span>
              {vault?.status !== 'draft' && (
                <span className="ml-auto text-[10px] text-neutral-400 tabular-nums">
                  {vault?.curves.length ?? mockCurves.length} curves
                </span>
              )}
            </div>
            {vault?.status === 'draft' ? (
              <div className="px-4 py-8 text-center">
                <ClockIcon className="mx-auto size-8 text-warning-400" />
                <p className="mt-2 text-sm font-medium text-neutral-700">
                  Pending Key Generation
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Cryptographic curves will be available once the initial
                  reshare is complete and all signers have participated.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {(vault?.curves ?? mockCurves).map((curve) => (
                  <div key={curve.fingerprint} className="px-4 py-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {curve.type}
                          </span>
                          <span className="font-mono text-xs text-neutral-600">
                            {curve.curve}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                      >
                        <CopyIcon className="size-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-2 rounded bg-neutral-50 px-2 py-1.5">
                      <span className="text-[10px] text-neutral-400">
                        Public Key:
                      </span>
                      <span className="flex-1 truncate font-mono text-[10px] text-neutral-600">
                        {curve.publicKey}
                      </span>
                      <button
                        type="button"
                        className="shrink-0 rounded p-0.5 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-600"
                      >
                        <CopyIcon className="size-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Derived Addresses Setting */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <KeyIcon className="size-3.5 text-neutral-500" />
                <div>
                  <span className="text-xs font-medium text-neutral-900">
                    Derived Addresses
                  </span>
                  <p className="text-[10px] text-neutral-500">
                    Generate multiple addresses from this vault
                  </p>
                </div>
              </div>
              <div
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium',
                  mockVaultConfig.allowDerivedAddresses
                    ? 'bg-positive-100 text-positive-700'
                    : 'bg-neutral-100 text-neutral-500'
                )}
              >
                {mockVaultConfig.allowDerivedAddresses ? (
                  <>
                    <CheckIcon className="size-3" />
                    <span>Enabled</span>
                  </>
                ) : (
                  <>
                    <XIcon className="size-3" />
                    <span>Disabled</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Width: Reshares Table */}
      <ResharesTable vaultId={vaultId} />
    </div>
  );
};

// =============================================================================
// Vault Tabs
// =============================================================================

type VaultTabsProps = {
  vaultId: string;
  initialTab?: TabType;
};

const VaultTabs = ({ vaultId, initialTab }: VaultTabsProps) => {
  const [activeTab, setActiveTab] = useState<TabType>(
    initialTab ?? 'addresses'
  );

  // Fetch signatures count for badge (uses same query as SignaturesContent for deduplication)
  const { data: signaturesData } = useQuery(
    orpc.vaults.listSignatures.queryOptions({
      input: { vaultId, limit: 100 },
    })
  );
  const signaturesCount = signaturesData?.data?.length ?? 0;

  // Sync tab state when URL search param changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as TabType)}
      className="border border-neutral-200 bg-white"
    >
      <TabsList>
        <TabsTrigger
          value="addresses"
          icon={<ShieldCheckIcon className="size-4" />}
          badge={getTotalAddresses()}
        >
          Addresses Secured
        </TabsTrigger>
        <TabsTrigger
          value="signatures"
          icon={<HistoryIcon className="size-4" />}
          badge={signaturesCount}
        >
          Signatures
        </TabsTrigger>
        <TabsTrigger
          value="details"
          icon={<InfoIcon className="size-4" />}
          badge={mockSigners.length}
        >
          Manage
        </TabsTrigger>
      </TabsList>
      <TabsContent value="addresses">
        <AddressesTreeContent vaultId={vaultId} />
      </TabsContent>
      <TabsContent value="signatures">
        <SignaturesContent vaultId={vaultId} />
      </TabsContent>
      <TabsContent value="details">
        <DetailsContent vaultId={vaultId} />
      </TabsContent>
    </Tabs>
  );
};

// =============================================================================
// Main Page Component
// =============================================================================

type PageVaultDetailTabsProps = {
  initialTab?: TabType;
};

export const PageVaultDetailTabs = ({
  initialTab,
}: PageVaultDetailTabsProps) => {
  const params = useParams({ strict: false }) as { vaultId?: string };
  const vaultId = params.vaultId ?? 'vault-1';

  const { data: vault } = useQuery(
    orpc.vaults.get.queryOptions({ input: { id: vaultId } })
  );

  return (
    <PageLayout>
      <PageLayoutTopBar>
        <Breadcrumbs
          items={[
            { label: 'Vaults', href: '/treasury/vaults' },
            { label: vault?.name ?? 'Loading...' },
          ]}
        />
      </PageLayoutTopBar>
      <PageLayoutContent containerClassName="py-0">
        <VaultTabs vaultId={vaultId} initialTab={initialTab} />
      </PageLayoutContent>
    </PageLayout>
  );
};
