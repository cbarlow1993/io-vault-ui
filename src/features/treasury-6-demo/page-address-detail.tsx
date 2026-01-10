import { Link, useParams } from '@tanstack/react-router';
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  ArrowUpRightIcon,
  BanIcon,
  CheckIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  ExternalLinkIcon,
  FilterIcon,
  SendIcon,
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
  DropdownMenuSeparator,
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
  getAddressById,
  getAddressTotalBalance,
  getChainById,
  type Asset,
  type Transaction,
} from './data/addresses';
import { getIdentityById, isCorporateIdentity } from './data/identities';
import { getVaultById } from './data/vaults';
import { TransferForm } from './components/transfer-form';

// Asset row component
const AssetRow = ({
  asset,
  onMarkSpam,
  onToggleHidden,
}: {
  asset: Asset;
  onMarkSpam: (id: string, isSpam: boolean) => void;
  onToggleHidden: (id: string) => void;
}) => {
  const changeColor =
    asset.change24h > 0
      ? 'text-positive-600'
      : asset.change24h < 0
        ? 'text-negative-600'
        : 'text-neutral-500';

  return (
    <div
      className={cn(
        'flex items-center gap-4 border-b border-neutral-100 px-4 py-3',
        asset.isSpam && 'bg-negative-50/30',
        asset.isHidden && 'opacity-50'
      )}
    >
      {/* Token icon placeholder */}
      <div className="flex size-9 items-center justify-center rounded-full bg-neutral-100">
        <span className="text-xs font-bold text-neutral-600">
          {asset.symbol.slice(0, 2)}
        </span>
      </div>

      {/* Token info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-900">
            {asset.symbol}
          </span>
          {asset.isSpam && (
            <span className="rounded bg-negative-100 px-1.5 py-0.5 text-[10px] font-medium text-negative-700">
              SPAM
            </span>
          )}
          {asset.isHidden && (
            <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
              HIDDEN
            </span>
          )}
        </div>
        <p className="text-xs text-neutral-500">{asset.name}</p>
      </div>

      {/* Balance */}
      <div className="text-right">
        <p className="text-sm font-medium text-neutral-900 tabular-nums">
          {asset.balance}
        </p>
        <p className="text-xs text-neutral-500 tabular-nums">
          {asset.balanceUsd}
        </p>
      </div>

      {/* Price & Change */}
      <div className="w-24 text-right">
        <p className="text-sm text-neutral-900 tabular-nums">
          {asset.priceUsd}
        </p>
        <p className={cn('text-xs tabular-nums', changeColor)}>
          {asset.change24h > 0 ? '+' : ''}
          {asset.change24h.toFixed(2)}%
        </p>
      </div>

      {/* Actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <FilterIcon className="size-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-none p-0">
          <DropdownMenuItem
            onClick={() => onMarkSpam(asset.id, !asset.isSpam)}
            className="flex items-center gap-2 rounded-none px-3 py-2 text-xs"
          >
            {asset.isSpam ? (
              <>
                <CheckIcon className="size-3.5" />
                Mark as Not Spam
              </>
            ) : (
              <>
                <BanIcon className="size-3.5" />
                Mark as Spam
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onToggleHidden(asset.id)}
            className="flex items-center gap-2 rounded-none px-3 py-2 text-xs"
          >
            {asset.isHidden ? (
              <>
                <EyeIcon className="size-3.5" />
                Show Token
              </>
            ) : (
              <>
                <EyeOffIcon className="size-3.5" />
                Hide Token
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

// Transaction row component
const TransactionRow = ({
  transaction,
  chainExplorerUrl,
}: {
  transaction: Transaction;
  chainExplorerUrl: string;
}) => {
  const isInbound = transaction.direction === 'inbound';

  const handleCopyHash = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(transaction.hash);
    toast.success('Transaction hash copied');
  };

  return (
    <div className="flex items-center gap-4 border-b border-neutral-100 px-4 py-3">
      {/* Direction icon */}
      <div
        className={cn(
          'flex size-9 items-center justify-center rounded-full',
          isInbound ? 'bg-positive-50' : 'bg-negative-50'
        )}
      >
        {isInbound ? (
          <ArrowDownIcon className="size-4 text-positive-600" />
        ) : (
          <ArrowUpIcon className="size-4 text-negative-600" />
        )}
      </div>

      {/* Transaction info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-900">
            {isInbound ? 'Received' : 'Sent'} {transaction.asset}
          </span>
          <span
            className={cn(
              'rounded px-1.5 py-0.5 text-[10px] font-medium',
              transaction.status === 'confirmed' &&
                'bg-positive-100 text-positive-700',
              transaction.status === 'pending' &&
                'bg-warning-100 text-warning-700',
              transaction.status === 'failed' &&
                'bg-negative-100 text-negative-700'
            )}
          >
            {transaction.status.toUpperCase()}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="max-w-[160px] truncate font-mono text-[11px] text-neutral-500">
            {transaction.hash}
          </span>
          <button
            type="button"
            onClick={handleCopyHash}
            className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <CopyIcon className="size-3" />
          </button>
          <a
            href={`${chainExplorerUrl}/tx/${transaction.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <ExternalLinkIcon className="size-3" />
          </a>
        </div>
      </div>

      {/* Amount */}
      <div className="text-right">
        <p
          className={cn(
            'text-sm font-medium tabular-nums',
            isInbound ? 'text-positive-600' : 'text-neutral-900'
          )}
        >
          {isInbound ? '+' : '-'}
          {transaction.amount} {transaction.asset}
        </p>
        <p className="text-xs text-neutral-500 tabular-nums">
          {transaction.amountUsd}
        </p>
      </div>

      {/* Timestamp */}
      <div className="w-32 text-right">
        <p className="text-xs text-neutral-500">
          {transaction.timestamp.split(' ')[0]}
        </p>
        <p className="text-[11px] text-neutral-400">
          {transaction.timestamp.split(' ')[1]}
        </p>
      </div>

      {/* Link to signature for outbound */}
      {transaction.signatureId ? (
        <Link
          to="/operations/$operationId"
          params={{ operationId: transaction.signatureId }}
          className="flex items-center gap-1 rounded border border-neutral-200 bg-neutral-50 px-2 py-1 text-[10px] font-medium text-neutral-600 hover:bg-neutral-100"
        >
          Signature
          <ArrowUpRightIcon className="size-3" />
        </Link>
      ) : (
        <div className="w-[72px]" />
      )}
    </div>
  );
};

export const PageAddressDetail = () => {
  const { vaultId, addressId } = useParams({
    from: '/_app/vaults/$vaultId/addresses/$addressId',
  });

  const address = getAddressById(addressId);
  const vault = getVaultById(vaultId);
  const chain = address ? getChainById(address.chainId) : undefined;
  const linkedIdentity = address?.identityId
    ? getIdentityById(address.identityId)
    : undefined;

  // Local state for asset modifications (in real app, this would be server state)
  const [assets, setAssets] = useState(address?.assets ?? []);
  const [showSpam, setShowSpam] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'assets' | 'transactions'>(
    'assets'
  );

  if (!address || !vault) {
    return (
      <PageLayout>
        <PageLayoutTopBar>
          <PageLayoutTopBarTitle>Address Not Found</PageLayoutTopBarTitle>
        </PageLayoutTopBar>
        <PageLayoutContent containerClassName="py-8">
          <div className="text-center">
            <p className="text-neutral-500">
              The requested address could not be found.
            </p>
            <Link
              to="/vaults/$vaultId/addresses"
              params={{ vaultId }}
              className="mt-4 inline-flex items-center gap-2 text-sm text-neutral-900 hover:underline"
            >
              <ArrowLeftIcon className="size-4" />
              Back to Addresses
            </Link>
          </div>
        </PageLayoutContent>
      </PageLayout>
    );
  }

  const totalBalance = getAddressTotalBalance({ ...address, assets });

  // Filter assets based on visibility settings
  const visibleAssets = assets.filter((a) => {
    if (a.isSpam && !showSpam) return false;
    if (a.isHidden && !showHidden) return false;
    return true;
  });

  const spamCount = assets.filter((a) => a.isSpam).length;
  const hiddenCount = assets.filter((a) => a.isHidden).length;

  // Asset actions
  const handleMarkSpam = (assetId: string, isSpam: boolean) => {
    setAssets((prev) =>
      prev.map((a) =>
        a.id === assetId
          ? { ...a, isSpam, isHidden: isSpam ? a.isHidden : false }
          : a
      )
    );
    toast.success(isSpam ? 'Token marked as spam' : 'Token unmarked as spam');
  };

  const handleToggleHidden = (assetId: string) => {
    setAssets((prev) =>
      prev.map((a) => (a.id === assetId ? { ...a, isHidden: !a.isHidden } : a))
    );
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(address.address);
    toast.success('Address copied to clipboard');
  };

  return (
    <PageLayout>
      <PageLayoutTopBar
        endActions={
          <div className="flex items-center gap-3">
            <NotificationButton />
            <Button
              onClick={() => setShowTransferForm(true)}
              className="h-7 rounded-none bg-brand-500 px-3 text-xs font-medium text-white hover:bg-brand-600"
            >
              <SendIcon className="mr-1.5 size-3.5" />
              Transfer
            </Button>
          </div>
        }
      >
        <div className="flex items-center gap-3">
          <Link
            to="/vaults/$vaultId/addresses"
            params={{ vaultId }}
            className="flex size-6 items-center justify-center text-neutral-400 hover:text-neutral-900"
          >
            <ArrowLeftIcon className="size-4" />
          </Link>
          <PageLayoutTopBarTitle>
            {address.alias ?? 'Address Details'}
          </PageLayoutTopBarTitle>
        </div>
      </PageLayoutTopBar>

      <PageLayoutContent containerClassName="py-4">
        <div className="space-y-6">
          {/* Address Header Card */}
          <div className="border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-6 py-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="flex size-14 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${chain?.color}15` }}
                  >
                    <WalletIcon
                      className="size-7"
                      style={{ color: chain?.color }}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-lg font-semibold text-neutral-900">
                        {address.alias ?? `${chain?.name} Address`}
                      </h1>
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                        style={{ backgroundColor: chain?.color }}
                      >
                        {chain?.symbol}
                      </span>
                      {address.type === 'derived' && (
                        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                          HD Derived
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="font-mono text-sm text-neutral-600">
                        {address.address}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyAddress}
                        className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                      >
                        <CopyIcon className="size-3.5" />
                      </button>
                      <a
                        href={`${chain?.explorerUrl}/address/${address.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                      >
                        <ExternalLinkIcon className="size-3.5" />
                      </a>
                    </div>
                    {address.derivationPath && (
                      <p className="mt-1 font-mono text-xs text-neutral-400">
                        {address.derivationPath}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                    Total Balance
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-neutral-900 tabular-nums">
                    {totalBalance}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-4 gap-px bg-neutral-100">
              <div className="bg-white p-4">
                <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                  Vault
                </p>
                <Link
                  to="/vaults/$vaultId"
                  params={{ vaultId }}
                  className="mt-1 text-sm font-medium text-neutral-900 hover:underline"
                >
                  {vault.name}
                </Link>
              </div>
              <div className="bg-white p-4">
                <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                  Chain
                </p>
                <p className="mt-1 text-sm font-medium text-neutral-900">
                  {chain?.name}
                </p>
              </div>
              <div className="bg-white p-4">
                <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                  Type
                </p>
                <p className="mt-1 text-sm font-medium text-neutral-900 capitalize">
                  {address.type}
                </p>
              </div>
              <div className="bg-white p-4">
                <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                  Created
                </p>
                <p className="mt-1 text-sm text-neutral-900">
                  {address.createdAt}
                </p>
              </div>
            </div>

            {/* Linked identity */}
            {linkedIdentity && (
              <Link
                to="/identities/$identityId"
                params={{ identityId: linkedIdentity.id }}
                className="flex items-center justify-between border-t border-neutral-200 px-6 py-3 hover:bg-neutral-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-neutral-100">
                    <span className="text-xs font-bold text-neutral-600">
                      {linkedIdentity.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                      Linked Identity
                    </p>
                    <p className="text-sm font-medium text-neutral-900">
                      {linkedIdentity.name}
                    </p>
                  </div>
                </div>
                <ArrowUpRightIcon className="size-4 text-neutral-400" />
              </Link>
            )}
          </div>

          {/* Tab navigation */}
          <div className="flex gap-px border-b border-neutral-200">
            <button
              type="button"
              onClick={() => setActiveTab('assets')}
              className={cn(
                'px-4 py-2.5 text-xs font-medium transition-colors',
                activeTab === 'assets'
                  ? 'border-b-2 border-neutral-900 text-neutral-900'
                  : 'text-neutral-500 hover:text-neutral-700'
              )}
            >
              Assets ({visibleAssets.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('transactions')}
              className={cn(
                'px-4 py-2.5 text-xs font-medium transition-colors',
                activeTab === 'transactions'
                  ? 'border-b-2 border-neutral-900 text-neutral-900'
                  : 'text-neutral-500 hover:text-neutral-700'
              )}
            >
              Transactions ({address.transactions.length})
            </button>
          </div>

          {/* Assets Tab */}
          {activeTab === 'assets' && (
            <div className="border border-neutral-200 bg-white">
              <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
                <div>
                  <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                    Assets
                  </h2>
                  <p className="mt-0.5 text-[11px] text-neutral-500">
                    {visibleAssets.length} token
                    {visibleAssets.length !== 1 ? 's' : ''} on this address
                  </p>
                </div>

                {/* Filter toggles */}
                <div className="flex items-center gap-2">
                  {spamCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowSpam(!showSpam)}
                      className={cn(
                        'flex items-center gap-1.5 rounded border px-2 py-1 text-[10px] font-medium transition-colors',
                        showSpam
                          ? 'border-negative-200 bg-negative-50 text-negative-700'
                          : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
                      )}
                    >
                      <BanIcon className="size-3" />
                      {showSpam ? 'Hide' : 'Show'} Spam ({spamCount})
                    </button>
                  )}
                  {hiddenCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowHidden(!showHidden)}
                      className={cn(
                        'flex items-center gap-1.5 rounded border px-2 py-1 text-[10px] font-medium transition-colors',
                        showHidden
                          ? 'border-neutral-400 bg-neutral-200 text-neutral-700'
                          : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
                      )}
                    >
                      <EyeOffIcon className="size-3" />
                      {showHidden ? 'Hide' : 'Show'} Hidden ({hiddenCount})
                    </button>
                  )}
                </div>
              </div>

              {visibleAssets.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <WalletIcon className="mx-auto size-10 text-neutral-300" />
                  <p className="mt-3 text-sm font-medium text-neutral-900">
                    No assets found
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {spamCount > 0 || hiddenCount > 0
                      ? 'Toggle filters to see hidden or spam tokens'
                      : 'This address has no token balances'}
                  </p>
                </div>
              ) : (
                <div>
                  {visibleAssets.map((asset) => (
                    <AssetRow
                      key={asset.id}
                      asset={asset}
                      onMarkSpam={handleMarkSpam}
                      onToggleHidden={handleToggleHidden}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="border border-neutral-200 bg-white">
              <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
                <div>
                  <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                    Transactions
                  </h2>
                  <p className="mt-0.5 text-[11px] text-neutral-500">
                    {address.transactions.length} transaction
                    {address.transactions.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {address.transactions.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <ArrowUpIcon className="mx-auto size-10 text-neutral-300" />
                  <p className="mt-3 text-sm font-medium text-neutral-900">
                    No transactions yet
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Transactions will appear here once you send or receive funds
                  </p>
                </div>
              ) : (
                <div>
                  {address.transactions.map((tx) => (
                    <TransactionRow
                      key={tx.id}
                      transaction={tx}
                      chainExplorerUrl={chain?.explorerUrl ?? ''}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Transfer Form Modal */}
        {showTransferForm && (
          <TransferForm
            address={address}
            assets={assets.filter((a) => !a.isSpam && !a.isHidden)}
            onClose={() => setShowTransferForm(false)}
          />
        )}
      </PageLayoutContent>
    </PageLayout>
  );
};
