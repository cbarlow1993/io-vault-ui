import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  FilterIcon,
  HistoryIcon,
  InfoIcon,
  KeyIcon,
  PlusIcon,
  ServerIcon,
  SettingsIcon,
  SmartphoneIcon,
  WalletIcon,
  XCircleIcon,
} from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
} from '@/layout/shell';

// Mock data for prototypes
const mockVault = {
  id: 'vault-001',
  name: 'Treasury Vault Alpha',
  status: 'active' as const,
  threshold: 2,
  totalSigners: 3,
  createdAt: 'Jan 15, 2024',
  createdBy: 'John Smith',
  lastUsed: '2 hours ago',
  identityName: 'Acme Corporation',
  identityType: 'Corporate',
  identityStatus: 'Verified',
  curves: [
    { type: 'ECDSA', curve: 'secp256k1' },
    { type: 'EdDSA', curve: 'ed25519' },
  ],
  signers: [
    { id: '1', name: 'Server-1', type: 'server', owner: 'System', power: 2 },
    { id: '2', name: 'John Phone', type: 'ios', owner: 'J. Smith', power: 1 },
    {
      id: '3',
      name: 'Backup Device',
      type: 'android',
      owner: 'J. Smith',
      power: 1,
    },
  ],
};

const mockAssets = [
  {
    chain: 'Ethereum',
    chainColor: '#627EEA',
    address: '0x7a3b8c9d2e1f4a5b6c7d8e9f0a1b2c3d4e5f6a7b',
    tokens: [
      { symbol: 'ETH', balance: '12.5000', usd: '$41,250.00' },
      { symbol: 'USDC', balance: '3,500.00', usd: '$3,500.00' },
      { symbol: 'LINK', balance: '120.00', usd: '$480.50' },
    ],
    totalUsd: '$45,230.50',
  },
  {
    chain: 'Polygon',
    chainColor: '#8247E5',
    address: '0x9c4d7e8f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
    tokens: [
      { symbol: 'MATIC', balance: '1,250.00', usd: '$890.00' },
      { symbol: 'USDC', balance: '11,210.00', usd: '$11,210.00' },
    ],
    totalUsd: '$12,100.00',
  },
  {
    chain: 'Arbitrum',
    chainColor: '#28A0F0',
    address: '0x2e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f',
    tokens: [{ symbol: 'ETH', balance: '2.1500', usd: '$8,450.25' }],
    totalUsd: '$8,450.25',
  },
];

const mockSignatures = [
  {
    id: '1',
    status: 'pending' as const,
    description: '500 USDC → 0x9d4e...',
    chain: 'Polygon',
    time: 'Just now',
    signaturesCount: 1,
    signaturesNeeded: 2,
    hash: '0x8f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c',
    signers: ['Server-1'],
  },
  {
    id: '2',
    status: 'completed' as const,
    description: '12.5 ETH → 0x8f2a...',
    chain: 'Ethereum',
    time: '2h ago',
    hash: '0x3b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e',
    signers: ['Server-1', 'John Phone'],
  },
  {
    id: '3',
    status: 'completed' as const,
    description: 'USDC Approval → Uniswap',
    chain: 'Polygon',
    time: '5h ago',
    hash: '0x4c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f',
    signers: ['Server-1', 'Backup Device'],
  },
  {
    id: '4',
    status: 'completed' as const,
    description: 'swap() on 0x3b7c...',
    chain: 'Arbitrum',
    time: '1d ago',
    hash: '0x5d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a',
    signers: ['Server-1', 'John Phone'],
  },
  {
    id: '5',
    status: 'completed' as const,
    description: 'mint() on 0x4c8d...',
    chain: 'Ethereum',
    time: '1d ago',
    hash: '0x6e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b',
    signers: ['Server-1', 'Backup Device'],
  },
  {
    id: '6',
    status: 'failed' as const,
    description: 'Failed transfer attempt',
    chain: 'Ethereum',
    time: '2d ago',
    hash: '0x7f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c',
    signers: ['Server-1'],
  },
];

const totalAssetsUsd = '$65,780.75';
const totalSignatures = 47;
const pendingSignatures = 1;

// Helper components
const StatusBadge = ({
  status,
}: {
  status: 'active' | 'pending' | 'revoked';
}) => (
  <span
    className={cn(
      'inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase',
      status === 'active' && 'bg-positive-100 text-positive-700',
      status === 'pending' && 'bg-warning-100 text-warning-700',
      status === 'revoked' && 'bg-neutral-100 text-neutral-500'
    )}
  >
    {status}
  </span>
);

const SignatureStatusIcon = ({
  status,
}: {
  status: 'completed' | 'pending' | 'failed';
}) => {
  if (status === 'completed')
    return <CheckCircleIcon className="size-4 text-positive-600" />;
  if (status === 'pending')
    return <ClockIcon className="size-4 text-warning-600" />;
  return <XCircleIcon className="size-4 text-negative-600" />;
};

const DeviceIcon = ({ type }: { type: string }) => {
  if (type === 'server')
    return <ServerIcon className="size-4 text-neutral-500" />;
  return <SmartphoneIcon className="size-4 text-neutral-500" />;
};

// =============================================================================
// LAYOUT 6: Asset-First with Activity Feed
// =============================================================================
const Layout6AssetFirst = () => {
  return (
    <div className="space-y-4 py-5">
      {/* Total Value Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-semibold text-neutral-900 tabular-nums">
            {totalAssetsUsd}
          </p>
          <p className="text-sm text-neutral-500">Total Assets</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-neutral-600">
          <span>
            <span className="font-medium text-neutral-900">
              {mockVault.threshold}
            </span>
            /{mockVault.totalSigners} threshold
          </span>
          <span>
            <span className="font-medium text-neutral-900">
              {mockVault.signers.length}
            </span>{' '}
            signers
          </span>
        </div>
      </div>

      {/* Assets by Chain */}
      <div className="border border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
            Assets by Chain
          </h2>
          <Button
            variant="secondary"
            className="h-7 rounded-none border-neutral-300 px-3 text-xs font-medium"
          >
            <PlusIcon className="mr-1.5 size-3.5" />
            New Address
          </Button>
        </div>
        <div className="divide-y divide-neutral-100">
          {mockAssets.map((asset) => (
            <div key={asset.chain} className="px-4 py-3">
              {/* Chain Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${asset.chainColor}20` }}
                  >
                    <span
                      className="text-[10px] font-bold"
                      style={{ color: asset.chainColor }}
                    >
                      {asset.chain.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900">
                      {asset.chain}
                    </p>
                    <p className="font-mono text-xs text-neutral-500">
                      {asset.address.slice(0, 6)}...{asset.address.slice(-4)}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-neutral-900 tabular-nums">
                  {asset.totalUsd}
                </p>
              </div>
              {/* Token List */}
              <div className="mt-2 ml-11 space-y-1">
                {asset.tokens.map((token) => (
                  <div
                    key={token.symbol}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-400">├─</span>
                      <span className="font-medium text-neutral-700">
                        {token.symbol}
                      </span>
                      <span className="text-neutral-500 tabular-nums">
                        {token.balance}
                      </span>
                    </div>
                    <span className="text-neutral-600 tabular-nums">
                      {token.usd}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Signatures */}
      <div className="border border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
            Recent Signatures
          </h2>
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-neutral-900"
          >
            View All
            <ChevronRightIcon className="size-3.5" />
          </button>
        </div>
        <div className="divide-y divide-neutral-100">
          {mockSignatures.slice(0, 4).map((sig) => (
            <div
              key={sig.id}
              className="flex items-center justify-between px-4 py-2.5"
            >
              <div className="flex items-center gap-3">
                <SignatureStatusIcon status={sig.status} />
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    {sig.description}
                  </p>
                  <p className="text-xs text-neutral-500">{sig.chain}</p>
                </div>
              </div>
              <span className="text-xs text-neutral-500 tabular-nums">
                {sig.time}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Vault Details Footer */}
      <div className="flex items-center justify-between rounded border border-neutral-200 bg-neutral-50 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-neutral-600">
          <InfoIcon className="size-4" />
          <span>Vault Details</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-neutral-500">
          <span>Curves: {mockVault.curves.length}</span>
          <span>·</span>
          <span>Identity: {mockVault.identityName}</span>
          <ChevronRightIcon className="size-4 text-neutral-400" />
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// LAYOUT 7: Split View - Assets Left, Signatures Right
// =============================================================================
const Layout7SplitView = () => {
  const [selectedAsset, setSelectedAsset] = useState(mockAssets[0]);

  return (
    <div className="py-5">
      {/* Stats Bar */}
      <div className="mb-4 flex items-center justify-between text-sm">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-2xl font-semibold text-neutral-900 tabular-nums">
              {totalAssetsUsd}
            </span>
            <span className="ml-2 text-neutral-500">total</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-neutral-600">
          <span>{totalSignatures} signatures</span>
          <span>·</span>
          <span>
            {mockVault.threshold}/{mockVault.totalSigners} threshold
          </span>
        </div>
      </div>

      {/* Split Panel */}
      <div className="flex gap-4">
        {/* Left Panel - Assets */}
        <div className="w-1/2 border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
            <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
              Assets
            </h2>
            <Button
              variant="secondary"
              className="h-6 rounded-none border-neutral-300 px-2 text-[10px] font-medium"
            >
              <PlusIcon className="mr-1 size-3" />
              New
            </Button>
          </div>
          <div className="max-h-[500px] divide-y divide-neutral-100 overflow-y-auto">
            {mockAssets.map((asset) => (
              <button
                key={asset.chain}
                type="button"
                onClick={() => setSelectedAsset(asset)}
                className={cn(
                  'flex w-full items-center justify-between px-4 py-3 text-left transition-colors',
                  selectedAsset?.chain === asset.chain
                    ? 'bg-brand-50'
                    : 'hover:bg-neutral-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${asset.chainColor}20` }}
                  >
                    <span
                      className="text-[10px] font-bold"
                      style={{ color: asset.chainColor }}
                    >
                      {asset.chain.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      {asset.chain}
                    </p>
                    <p className="font-mono text-[10px] text-neutral-500">
                      {asset.address.slice(0, 6)}...{asset.address.slice(-4)}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-neutral-900 tabular-nums">
                  {asset.totalUsd}
                </p>
              </button>
            ))}
          </div>
          {/* Secondary Info */}
          <div className="border-t border-neutral-200 px-4 py-2">
            <div className="flex items-center gap-4 text-xs text-neutral-500">
              <button
                type="button"
                className="flex items-center gap-1 hover:text-neutral-700"
              >
                <SettingsIcon className="size-3" />
                Signers
              </button>
              <button
                type="button"
                className="flex items-center gap-1 hover:text-neutral-700"
              >
                <KeyIcon className="size-3" />
                Curves
              </button>
              <button
                type="button"
                className="flex items-center gap-1 hover:text-neutral-700"
              >
                <InfoIcon className="size-3" />
                Identity
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Signatures */}
        <div className="w-1/2 border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
            <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
              Signatures
            </h2>
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700"
            >
              <FilterIcon className="size-3" />
              Filter
            </button>
          </div>
          <div className="max-h-[500px] divide-y divide-neutral-100 overflow-y-auto">
            {mockSignatures.map((sig) => (
              <div key={sig.id} className="px-4 py-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <SignatureStatusIcon status={sig.status} />
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        {sig.description}
                      </p>
                      <p className="text-xs text-neutral-500">{sig.chain}</p>
                      {sig.status === 'pending' && (
                        <div className="mt-1.5">
                          <div className="mb-1 h-1.5 w-24 overflow-hidden rounded-full bg-neutral-200">
                            <div
                              className="h-full bg-warning-500"
                              style={{
                                width: `${((sig.signaturesCount || 0) / (sig.signaturesNeeded || 1)) * 100}%`,
                              }}
                            />
                          </div>
                          <p className="text-[10px] text-neutral-500">
                            {sig.signaturesCount}/{sig.signaturesNeeded}{' '}
                            signatures
                          </p>
                        </div>
                      )}
                      {sig.status === 'completed' && (
                        <p className="mt-1 text-[10px] text-neutral-400">
                          Signed by {sig.signers.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-neutral-500 tabular-nums">
                    {sig.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-neutral-200 px-4 py-2">
            <button
              type="button"
              className="text-xs font-medium text-neutral-600 hover:text-neutral-900"
            >
              Load More...
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// LAYOUT 9: Tabbed with Quick Stats Bar
// =============================================================================
const Layout9TabbedQuickStats = () => {
  const [activeTab, setActiveTab] = useState<
    'assets' | 'signatures' | 'details'
  >('assets');

  return (
    <div className="py-5">
      {/* Persistent Stats Bar */}
      <div className="mb-4 flex items-center gap-1 border border-neutral-200 bg-white p-1">
        <div className="flex flex-1 items-center justify-center gap-2 border-r border-neutral-200 py-2">
          <span className="text-lg font-semibold text-neutral-900 tabular-nums">
            {totalAssetsUsd}
          </span>
          <span className="text-xs text-neutral-500">assets</span>
        </div>
        <div className="flex flex-1 items-center justify-center gap-2 border-r border-neutral-200 py-2">
          <span className="text-lg font-semibold text-neutral-900 tabular-nums">
            {totalSignatures}
          </span>
          <span className="text-xs text-neutral-500">signed</span>
        </div>
        <div className="flex flex-1 items-center justify-center gap-2 border-r border-neutral-200 py-2">
          <span className="text-lg font-semibold text-warning-600 tabular-nums">
            {pendingSignatures}
          </span>
          <span className="text-xs text-neutral-500">pending</span>
        </div>
        <div className="flex flex-1 items-center justify-center gap-2 py-2">
          <span className="text-lg font-semibold text-neutral-900 tabular-nums">
            {mockVault.threshold}/{mockVault.totalSigners}
          </span>
          <span className="text-xs text-neutral-500">threshold</span>
        </div>
      </div>

      {/* Tab Container */}
      <div className="border border-neutral-200 bg-white">
        {/* Tab Headers */}
        <div className="flex border-b border-neutral-200">
          <button
            type="button"
            onClick={() => setActiveTab('assets')}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium transition-colors',
              activeTab === 'assets'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            )}
          >
            <WalletIcon className="size-4" />
            Assets
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums',
                activeTab === 'assets'
                  ? 'bg-brand-100 text-brand-700'
                  : 'bg-neutral-100 text-neutral-600'
              )}
            >
              {mockAssets.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('signatures')}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium transition-colors',
              activeTab === 'signatures'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            )}
          >
            <HistoryIcon className="size-4" />
            Signatures
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums',
                activeTab === 'signatures'
                  ? 'bg-brand-100 text-brand-700'
                  : 'bg-neutral-100 text-neutral-600'
              )}
            >
              {totalSignatures}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium transition-colors',
              activeTab === 'details'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            )}
          >
            <SettingsIcon className="size-4" />
            Details
          </button>
        </div>

        {/* Assets Tab */}
        {activeTab === 'assets' && (
          <>
            <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50 px-4 py-2">
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex h-7 items-center gap-1 border border-neutral-200 bg-white px-2 text-xs"
                    >
                      All Chains
                      <ChevronDownIcon className="size-3 text-neutral-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="rounded-none">
                    <DropdownMenuItem className="rounded-none text-xs">
                      All Chains
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-none text-xs">
                      Ethereum
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-none text-xs">
                      Polygon
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-none text-xs">
                      Arbitrum
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Button
                variant="secondary"
                className="h-7 rounded-none border-neutral-300 px-3 text-xs font-medium"
              >
                <PlusIcon className="mr-1.5 size-3.5" />
                New Address
              </Button>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-left">
                  <th className="px-4 py-2 font-medium text-neutral-500">
                    Chain
                  </th>
                  <th className="px-4 py-2 font-medium text-neutral-500">
                    Address
                  </th>
                  <th className="px-4 py-2 font-medium text-neutral-500">
                    Tokens
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-neutral-500">
                    Value
                  </th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {mockAssets.map((asset) => (
                  <tr key={asset.chain} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex size-6 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${asset.chainColor}20` }}
                        >
                          <span
                            className="text-[8px] font-bold"
                            style={{ color: asset.chainColor }}
                          >
                            {asset.chain.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-neutral-900">
                          {asset.chain}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-neutral-600">
                        {asset.address.slice(0, 6)}...{asset.address.slice(-4)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {asset.tokens.length}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-neutral-900 tabular-nums">
                      {asset.totalUsd}
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRightIcon className="size-4 text-neutral-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Quick View: Pending Signatures */}
            <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-neutral-700">
                  Quick View: Pending Signatures ({pendingSignatures})
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('signatures')}
                  className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700"
                >
                  View All
                  <ChevronRightIcon className="size-3" />
                </button>
              </div>
              {pendingSignatures > 0 && mockSignatures[0] && (
                <div className="mt-2 flex items-center justify-between rounded border border-warning-200 bg-warning-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="size-4 text-warning-600" />
                    <span className="text-sm text-neutral-900">
                      {mockSignatures[0].description}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {mockSignatures[0].chain}
                    </span>
                    <span className="rounded bg-warning-100 px-1.5 py-0.5 text-[10px] font-medium text-warning-700">
                      {mockSignatures[0].signaturesCount}/
                      {mockSignatures[0].signaturesNeeded} sigs
                    </span>
                  </div>
                  <Button className="h-6 rounded-none bg-brand-600 px-3 text-[10px] font-medium text-white hover:bg-brand-700">
                    Sign
                  </Button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Signatures Tab */}
        {activeTab === 'signatures' && (
          <>
            <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50 px-4 py-2">
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex h-7 items-center gap-1 border border-neutral-200 bg-white px-2 text-xs"
                    >
                      All Status
                      <ChevronDownIcon className="size-3 text-neutral-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="rounded-none">
                    <DropdownMenuItem className="rounded-none text-xs">
                      All Status
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-none text-xs">
                      Pending
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-none text-xs">
                      Completed
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-none text-xs">
                      Failed
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex h-7 items-center gap-1 border border-neutral-200 bg-white px-2 text-xs"
                    >
                      All Chains
                      <ChevronDownIcon className="size-3 text-neutral-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="rounded-none">
                    <DropdownMenuItem className="rounded-none text-xs">
                      All Chains
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-none text-xs">
                      Ethereum
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-none text-xs">
                      Polygon
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-none text-xs">
                      Arbitrum
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-left">
                  <th className="px-4 py-2 font-medium text-neutral-500">
                    Status
                  </th>
                  <th className="px-4 py-2 font-medium text-neutral-500">
                    Description
                  </th>
                  <th className="px-4 py-2 font-medium text-neutral-500">
                    Chain
                  </th>
                  <th className="px-4 py-2 font-medium text-neutral-500">
                    Date
                  </th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {mockSignatures.map((sig) => (
                  <tr key={sig.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <SignatureStatusIcon status={sig.status} />
                        <span className="text-neutral-600 capitalize">
                          {sig.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-neutral-900">
                      {sig.description}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{sig.chain}</td>
                    <td className="px-4 py-3 text-neutral-500 tabular-nums">
                      {sig.time}
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRightIcon className="size-4 text-neutral-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Quick View: Top Assets */}
            <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-neutral-700">
                  Quick View: Top Assets
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('assets')}
                  className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700"
                >
                  View All
                  <ChevronRightIcon className="size-3" />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-3 text-sm">
                {mockAssets.map((asset) => (
                  <span key={asset.chain} className="text-neutral-600">
                    <span className="font-medium text-neutral-900">
                      {asset.chain}
                    </span>{' '}
                    {asset.totalUsd}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="divide-y divide-neutral-100">
            {/* Identity */}
            <div className="px-4 py-4">
              <h3 className="text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
                Linked Identity
              </h3>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 flex size-8 items-center justify-center rounded-full">
                    <span className="text-blue-600 text-xs font-bold">AC</span>
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900">
                      {mockVault.identityName}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {mockVault.identityType} · {mockVault.identityStatus}
                    </p>
                  </div>
                </div>
                <ChevronRightIcon className="size-4 text-neutral-400" />
              </div>
            </div>
            {/* Curves */}
            <div className="px-4 py-4">
              <h3 className="text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
                Cryptographic Curves
              </h3>
              <div className="mt-2 flex gap-3">
                {mockVault.curves.map((curve) => (
                  <div
                    key={curve.type}
                    className="rounded border border-neutral-200 px-3 py-2"
                  >
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-neutral-600">
                      {curve.type}
                    </span>
                    <span className="ml-2 font-mono text-xs text-neutral-600">
                      {curve.curve}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {/* Signers */}
            <div className="px-4 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
                  MPC Signers
                </h3>
                <span className="text-xs text-neutral-500">
                  Threshold: {mockVault.threshold}/{mockVault.totalSigners}
                </span>
              </div>
              <div className="mt-2 space-y-2">
                {mockVault.signers.map((signer) => (
                  <div
                    key={signer.id}
                    className="flex items-center justify-between rounded border border-neutral-200 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <DeviceIcon type={signer.type} />
                      <span className="font-medium text-neutral-900">
                        {signer.name}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {signer.owner}
                      </span>
                    </div>
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-neutral-700 tabular-nums">
                      {signer.power}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================
export const PageVaultDetailLayouts = () => {
  const [currentLayout, setCurrentLayout] = useState<'6' | '7' | '9'>('6');

  return (
    <PageLayout>
      <PageLayoutTopBar
        breadcrumbs={[
          { label: 'Vaults', href: '/vaults' },
          { label: mockVault.name },
        ]}
        status={<StatusBadge status={mockVault.status} />}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                className="h-8 rounded-none border-neutral-300 px-3 text-xs font-medium"
              >
                Actions
                <ChevronDownIcon className="ml-1.5 size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-none">
              <DropdownMenuItem className="rounded-none text-xs">
                Reshare Keys
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-none text-xs">
                Edit Vault
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-none text-xs text-negative-600">
                Revoke Vault
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <PageLayoutContent>
        {/* Layout Switcher */}
        <div className="mt-4 flex items-center justify-center gap-2 rounded border border-dashed border-brand-300 bg-brand-50 p-3">
          <span className="text-xs font-medium text-brand-700">
            Layout Prototype:
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setCurrentLayout('6')}
              className={cn(
                'rounded px-3 py-1.5 text-xs font-medium transition-colors',
                currentLayout === '6'
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-neutral-700 hover:bg-neutral-100'
              )}
            >
              #6 Asset-First
            </button>
            <button
              type="button"
              onClick={() => setCurrentLayout('7')}
              className={cn(
                'rounded px-3 py-1.5 text-xs font-medium transition-colors',
                currentLayout === '7'
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-neutral-700 hover:bg-neutral-100'
              )}
            >
              #7 Split View
            </button>
            <button
              type="button"
              onClick={() => setCurrentLayout('9')}
              className={cn(
                'rounded px-3 py-1.5 text-xs font-medium transition-colors',
                currentLayout === '9'
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-neutral-700 hover:bg-neutral-100'
              )}
            >
              #9 Tabbed + Stats
            </button>
          </div>
        </div>

        {/* Render Selected Layout */}
        {currentLayout === '6' && <Layout6AssetFirst />}
        {currentLayout === '7' && <Layout7SplitView />}
        {currentLayout === '9' && <Layout9TabbedQuickStats />}
      </PageLayoutContent>
    </PageLayout>
  );
};
