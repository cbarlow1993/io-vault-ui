import { Link, useParams } from '@tanstack/react-router';
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  ChevronRightIcon,
  CopyIcon,
  PlusIcon,
  WalletIcon,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

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
} from '@/layout/treasury-6';

import {
  chains,
  getAddressesByVaultId,
  getAddressTotalBalance,
  getChainById,
  type Address,
  type ChainId,
} from './data/addresses';
import { getVaultById } from './data/vaults';

const ChainBadge = ({ chainId }: { chainId: ChainId }) => {
  const chain = getChainById(chainId);
  if (!chain) return null;

  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
      style={{ backgroundColor: chain.color }}
    >
      {chain.symbol}
    </span>
  );
};

const AddressRow = ({
  address,
  vaultId,
}: {
  address: Address;
  vaultId: string;
}) => {
  const chain = getChainById(address.chainId);
  const totalBalance = getAddressTotalBalance(address);
  const visibleAssets = address.assets.filter((a) => !a.isSpam && !a.isHidden);

  // Recent transaction summary
  const recentTx = address.transactions[0];
  const pendingCount = address.transactions.filter(
    (tx) => tx.status === 'pending'
  ).length;

  const handleCopyAddress = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(address.address);
    toast.success('Address copied to clipboard');
  };

  return (
    <Link
      to="/vaults/$vaultId/addresses/$addressId"
      params={{ vaultId, addressId: address.id }}
      className="flex items-center gap-4 border-b border-neutral-100 px-4 py-3 hover:bg-neutral-50"
    >
      {/* Chain indicator */}
      <div
        className="flex size-10 items-center justify-center rounded-full"
        style={{ backgroundColor: `${chain?.color}15` }}
      >
        <WalletIcon className="size-5" style={{ color: chain?.color }} />
      </div>

      {/* Address info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-900">
            {address.alias ?? `${chain?.name} Address`}
          </span>
          <ChainBadge chainId={address.chainId} />
          {address.type === 'derived' && (
            <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
              HD
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="max-w-[200px] truncate font-mono text-xs text-neutral-500">
            {address.address}
          </span>
          <button
            type="button"
            onClick={handleCopyAddress}
            className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <CopyIcon className="size-3" />
          </button>
        </div>
      </div>

      {/* Assets count */}
      <div className="text-right">
        <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
          Assets
        </p>
        <p className="text-sm text-neutral-900 tabular-nums">
          {visibleAssets.length}
        </p>
      </div>

      {/* Balance */}
      <div className="w-36 text-right">
        <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
          Balance
        </p>
        <p className="text-sm font-medium text-neutral-900 tabular-nums">
          {totalBalance}
        </p>
      </div>

      {/* Recent activity */}
      <div className="w-40">
        {pendingCount > 0 ? (
          <div className="flex items-center gap-1.5 rounded bg-warning-50 px-2 py-1">
            <span className="size-1.5 animate-pulse rounded-full bg-warning-500" />
            <span className="text-xs font-medium text-warning-700">
              {pendingCount} pending
            </span>
          </div>
        ) : recentTx ? (
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            {recentTx.direction === 'inbound' ? (
              <ArrowDownIcon className="size-3 text-positive-500" />
            ) : (
              <ArrowUpIcon className="size-3 text-negative-500" />
            )}
            <span className="truncate">{recentTx.timestamp.split(' ')[0]}</span>
          </div>
        ) : (
          <span className="text-xs text-neutral-400">No activity</span>
        )}
      </div>

      <ChevronRightIcon className="size-4 text-neutral-400" />
    </Link>
  );
};

export const PageAddresses = () => {
  const { vaultId } = useParams({ from: '/_app/vaults/$vaultId/addresses' });
  const vault = getVaultById(vaultId);
  const addresses = getAddressesByVaultId(vaultId);

  const [filterChain, setFilterChain] = useState<ChainId | 'all'>('all');

  const filteredAddresses =
    filterChain === 'all'
      ? addresses
      : addresses.filter((a) => a.chainId === filterChain);

  // Get unique chains from addresses
  const usedChains = [...new Set(addresses.map((a) => a.chainId))];

  if (!vault) {
    return (
      <PageLayout>
        <PageLayoutTopBar title="Vault Not Found" />
        <PageLayoutContent containerClassName="py-8">
          <div className="text-center">
            <p className="text-neutral-500">
              The requested vault could not be found.
            </p>
            <Link
              to="/vaults"
              className="mt-4 inline-flex items-center gap-2 text-sm text-neutral-900 hover:underline"
            >
              <ArrowLeftIcon className="size-4" />
              Back to Vaults
            </Link>
          </div>
        </PageLayoutContent>
      </PageLayout>
    );
  }

  // Calculate totals
  const totalBalance = addresses.reduce((sum, addr) => {
    const balance = parseFloat(
      getAddressTotalBalance(addr).replace(/[$,]/g, '')
    );
    return sum + balance;
  }, 0);

  return (
    <PageLayout>
      <PageLayoutTopBar
        breadcrumbs={[
          { label: vault.name, href: `/vaults/${vaultId}` },
          { label: 'Addresses' },
        ]}
        actions={
          <Button
            asChild
            className="h-7 rounded-none bg-brand-500 px-3 text-xs font-medium text-white hover:bg-brand-600"
          >
            <Link to="/vaults/$vaultId/addresses/new" params={{ vaultId }}>
              <PlusIcon className="mr-1.5 size-3.5" />
              New Address
            </Link>
          </Button>
        }
      />

      <PageLayoutContent containerClassName="py-4">
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-px bg-neutral-200">
            <div className="bg-white p-4">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Total Addresses
              </p>
              <p className="mt-1 text-2xl font-semibold text-neutral-900 tabular-nums">
                {addresses.length}
              </p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Chains
              </p>
              <p className="mt-1 text-2xl font-semibold text-neutral-900 tabular-nums">
                {usedChains.length}
              </p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Total Balance
              </p>
              <p className="mt-1 text-2xl font-semibold text-neutral-900 tabular-nums">
                $
                {totalBalance.toLocaleString('en-US', {
                  maximumFractionDigits: 0,
                })}
              </p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Pending Txs
              </p>
              <p className="mt-1 text-2xl font-semibold text-neutral-900 tabular-nums">
                {addresses.reduce(
                  (sum, addr) =>
                    sum +
                    addr.transactions.filter((tx) => tx.status === 'pending')
                      .length,
                  0
                )}
              </p>
            </div>
          </div>

          {/* Addresses List */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
              <div>
                <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                  Addresses
                </h2>
                <p className="mt-0.5 text-[11px] text-neutral-500">
                  {filteredAddresses.length} address
                  {filteredAddresses.length !== 1 ? 'es' : ''} on {vault.name}
                </p>
              </div>

              {/* Chain Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex h-7 items-center gap-2 border border-neutral-200 bg-neutral-50 px-2 text-xs hover:bg-neutral-100"
                  >
                    {filterChain === 'all' ? (
                      <span className="text-neutral-600">All Chains</span>
                    ) : (
                      <>
                        <ChainBadge chainId={filterChain} />
                        <span className="text-neutral-600">
                          {getChainById(filterChain)?.name}
                        </span>
                      </>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-none p-0">
                  <DropdownMenuItem
                    onClick={() => setFilterChain('all')}
                    className="rounded-none px-3 py-2 text-xs"
                  >
                    All Chains
                  </DropdownMenuItem>
                  {usedChains.map((chainId) => {
                    const chain = getChainById(chainId);
                    return (
                      <DropdownMenuItem
                        key={chainId}
                        onClick={() => setFilterChain(chainId)}
                        className="flex items-center gap-2 rounded-none px-3 py-2 text-xs"
                      >
                        <ChainBadge chainId={chainId} />
                        {chain?.name}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {filteredAddresses.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <WalletIcon className="mx-auto size-10 text-neutral-300" />
                <p className="mt-3 text-sm font-medium text-neutral-900">
                  No addresses yet
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Create your first address to start receiving funds
                </p>
                <Button
                  asChild
                  className="mt-4 h-8 rounded-none bg-brand-500 px-4 text-xs font-medium text-white hover:bg-brand-600"
                >
                  <Link
                    to="/vaults/$vaultId/addresses/new"
                    params={{ vaultId }}
                  >
                    <PlusIcon className="mr-1.5 size-3.5" />
                    Create Address
                  </Link>
                </Button>
              </div>
            ) : (
              <div>
                {filteredAddresses.map((address) => (
                  <AddressRow
                    key={address.id}
                    address={address}
                    vaultId={vaultId}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
