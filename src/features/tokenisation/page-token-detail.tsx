import { Link, useParams } from '@tanstack/react-router';
import {
  ArrowDownIcon,
  ArrowRightLeftIcon,
  ArrowUpIcon,
  BanIcon,
  CheckCircleIcon,
  CircleDotIcon,
  ClipboardCopyIcon,
  CoinsIcon,
  ExternalLinkIcon,
  MoreHorizontalIcon,
  PauseCircleIcon,
  ShieldCheckIcon,
  UsersIcon,
} from 'lucide-react';
import { useState } from 'react';

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
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
} from '@/layout/shell';

import { TokenAnalyticsSection } from './components/token-analytics-section';
import { TokenBlocklistTab } from './components/token-blocklist-tab';
import { TokenHoldersTab } from './components/token-holders-tab';
import { TokenTransactionsTab } from './components/token-transactions-tab';
import { TokenWhitelistTab } from './components/token-whitelist-tab';
import { MOCK_TOKENS } from './data/mock-data';
import type { TokenStatus } from './schema';

type TabId =
  | 'overview'
  | 'transactions'
  | 'holders'
  | 'whitelist'
  | 'blocklist';

const TABS: { id: TabId; label: string; icon: typeof CoinsIcon }[] = [
  { id: 'overview', label: 'Overview', icon: CoinsIcon },
  { id: 'transactions', label: 'Transactions', icon: ArrowRightLeftIcon },
  { id: 'holders', label: 'Holders', icon: UsersIcon },
  { id: 'whitelist', label: 'Whitelist', icon: ShieldCheckIcon },
  { id: 'blocklist', label: 'Blocklist', icon: BanIcon },
];

const getStatusStyles = (status: TokenStatus) => {
  switch (status) {
    case 'active':
      return 'bg-positive-100 text-positive-700';
    case 'paused':
      return 'bg-warning-100 text-warning-700';
    case 'deprecated':
      return 'bg-neutral-100 text-neutral-500';
  }
};

const formatSupply = (supply: string, decimals: number): string => {
  const value = BigInt(supply);
  const divisor = BigInt(10 ** decimals);
  const integerPart = value / divisor;
  return integerPart.toLocaleString();
};

const truncateAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const PageTokenDetail = () => {
  const { tokenId } = useParams({
    from: '/_app/tokenisation/tokens/$tokenId/',
  });
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [copied, setCopied] = useState(false);

  // Find token (in real app, this would be an API call)
  const token = MOCK_TOKENS.find((t) => t.id === tokenId);

  if (!token) {
    return (
      <PageLayout>
        <PageLayoutTopBar title="Token Not Found" />
        <PageLayoutContent>
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-neutral-500">Token not found</p>
            <Link
              to="/tokenisation/tokens"
              className="mt-4 text-terminal-600 hover:underline"
            >
              Back to Tokens
            </Link>
          </div>
        </PageLayoutContent>
      </PageLayout>
    );
  }

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(token.contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PageLayout>
      <PageLayoutTopBar
        title={token.name}
        breadcrumbs={[
          { label: 'Tokens', href: '/tokenisation/tokens' },
          { label: token.symbol },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="secondary"
              className="h-7 rounded-none border-neutral-200 px-3 text-xs"
            >
              <Link
                to="/tokenisation/tokens/$tokenId/burn"
                params={{ tokenId: token.id }}
              >
                <ArrowDownIcon className="mr-1.5 size-3.5 text-negative-500" />
                Burn
              </Link>
            </Button>
            <Button
              asChild
              className="h-7 rounded-none bg-terminal-500 px-3 text-xs font-medium text-white hover:bg-terminal-600"
            >
              <Link
                to="/tokenisation/tokens/$tokenId/mint"
                params={{ tokenId: token.id }}
              >
                <ArrowUpIcon className="mr-1.5 size-3.5" />
                Mint
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  className="size-7 rounded-none border-neutral-200 p-0"
                >
                  <MoreHorizontalIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 rounded-none">
                <DropdownMenuItem className="cursor-pointer rounded-none text-xs">
                  {token.isPaused ? 'Unpause Token' : 'Pause Token'}
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer rounded-none text-xs">
                  Transfer Ownership
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer rounded-none text-xs text-negative-600">
                  Deprecate Token
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />
      <PageLayoutContent containerClassName="py-4">
        <div className="space-y-4">
          {/* Token Header Card */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-start gap-6 p-4">
              {/* Token Icon */}
              <div className="flex size-16 shrink-0 items-center justify-center bg-gradient-to-br from-terminal-400 to-terminal-600 text-xl font-bold text-white shadow-lg">
                {token.symbol.slice(0, 2)}
              </div>

              {/* Token Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold text-neutral-900">
                    {token.name}
                  </h1>
                  <span className="font-mono text-sm text-terminal-600">
                    {token.symbol}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium capitalize',
                      getStatusStyles(token.status)
                    )}
                  >
                    {token.status === 'active' && (
                      <CircleDotIcon className="size-3" />
                    )}
                    {token.status === 'paused' && (
                      <PauseCircleIcon className="size-3" />
                    )}
                    {token.status}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-4 text-xs text-neutral-500">
                  <span className="inline-flex items-center gap-1.5 border border-terminal-200 bg-terminal-50 px-2 py-1 font-mono text-terminal-700">
                    {token.standard}
                  </span>
                  <span>{token.chainName}</span>
                  <span className="flex items-center gap-1">
                    <span className="font-mono text-neutral-400">
                      {truncateAddress(token.contractAddress)}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyAddress}
                      className="text-neutral-400 hover:text-neutral-600"
                    >
                      {copied ? (
                        <CheckCircleIcon className="size-3.5 text-positive-500" />
                      ) : (
                        <ClipboardCopyIcon className="size-3.5" />
                      )}
                    </button>
                    <a
                      href={`https://etherscan.io/address/${token.contractAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-400 hover:text-terminal-600"
                    >
                      <ExternalLinkIcon className="size-3.5" />
                    </a>
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-5 gap-px border-t border-neutral-200 bg-neutral-200">
              <div className="bg-white p-3">
                <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                  Total Supply
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-neutral-900 tabular-nums">
                  {formatSupply(token.totalSupply, token.decimals)}
                </p>
              </div>
              <div className="bg-white p-3">
                <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                  Circulating
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-neutral-900 tabular-nums">
                  {formatSupply(token.circulatingSupply, token.decimals)}
                </p>
              </div>
              <div className="bg-white p-3">
                <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                  Holders
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-terminal-600 tabular-nums">
                  {token.holdersCount.toLocaleString()}
                </p>
              </div>
              <div className="bg-white p-3">
                <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                  Transfers
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-neutral-900 tabular-nums">
                  {token.transfersCount.toLocaleString()}
                </p>
              </div>
              <div className="bg-white p-3">
                <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                  Decimals
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-neutral-900 tabular-nums">
                  {token.decimals}
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-neutral-200 bg-white">
            <div className="flex">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const TabIcon = tab.icon;
                // Hide whitelist/blocklist tabs if not enabled
                if (tab.id === 'whitelist' && !token.hasWhitelist) return null;
                if (tab.id === 'blocklist' && !token.hasBlocklist) return null;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                      isActive
                        ? 'border-terminal-500 text-terminal-600'
                        : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700'
                    )}
                  >
                    <TabIcon className="size-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {activeTab === 'overview' && <TokenOverviewTab token={token} />}
            {activeTab === 'transactions' && (
              <TokenTransactionsTab tokenId={token.id} />
            )}
            {activeTab === 'holders' && <TokenHoldersTab tokenId={token.id} />}
            {activeTab === 'whitelist' && (
              <TokenWhitelistTab tokenId={token.id} />
            )}
            {activeTab === 'blocklist' && (
              <TokenBlocklistTab tokenId={token.id} />
            )}
          </div>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};

// Overview Tab Component
function TokenOverviewTab({ token }: { token: (typeof MOCK_TOKENS)[0] }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Token Properties */}
      <div className="border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-4 py-3">
          <h3 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
            Token Properties
          </h3>
        </div>
        <div className="divide-y divide-neutral-100">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs text-neutral-500">Transferable</span>
            <span
              className={cn(
                'text-xs font-medium',
                token.isTransferable ? 'text-positive-600' : 'text-negative-600'
              )}
            >
              {token.isTransferable ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs text-neutral-500">Paused</span>
            <span
              className={cn(
                'text-xs font-medium',
                token.isPaused ? 'text-warning-600' : 'text-neutral-600'
              )}
            >
              {token.isPaused ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs text-neutral-500">Whitelist Enabled</span>
            <span
              className={cn(
                'text-xs font-medium',
                token.hasWhitelist ? 'text-terminal-600' : 'text-neutral-400'
              )}
            >
              {token.hasWhitelist ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs text-neutral-500">Blocklist Enabled</span>
            <span
              className={cn(
                'text-xs font-medium',
                token.hasBlocklist ? 'text-terminal-600' : 'text-neutral-400'
              )}
            >
              {token.hasBlocklist ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>

      {/* Deployment Info */}
      <div className="border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-4 py-3">
          <h3 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
            Deployment Info
          </h3>
        </div>
        <div className="divide-y divide-neutral-100">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs text-neutral-500">Deployed By</span>
            <span className="text-xs font-medium text-neutral-900">
              {token.deployedBy}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs text-neutral-500">Deployed At</span>
            <span className="text-xs font-medium text-neutral-900 tabular-nums">
              {token.deployedAt}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs text-neutral-500">Chain</span>
            <span className="text-xs font-medium text-neutral-900">
              {token.chainName} (ID: {token.chainId})
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs text-neutral-500">Contract</span>
            <span className="font-mono text-xs text-neutral-600">
              {truncateAddress(token.contractAddress)}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="col-span-2 border border-neutral-200 bg-white p-4">
        <h3 className="mb-4 text-xs font-semibold tracking-wider text-neutral-900 uppercase">
          Quick Actions
        </h3>
        <div className="grid grid-cols-4 gap-3">
          <Link
            to="/tokenisation/tokens/$tokenId/mint"
            params={{ tokenId: token.id }}
            className="flex flex-col items-center gap-2 border border-neutral-200 p-4 transition-colors hover:border-terminal-300 hover:bg-terminal-50"
          >
            <ArrowUpIcon className="size-6 text-terminal-500" />
            <span className="text-xs font-medium text-neutral-700">
              Mint Tokens
            </span>
          </Link>
          <Link
            to="/tokenisation/tokens/$tokenId/burn"
            params={{ tokenId: token.id }}
            className="flex flex-col items-center gap-2 border border-neutral-200 p-4 transition-colors hover:border-negative-300 hover:bg-negative-50"
          >
            <ArrowDownIcon className="size-6 text-negative-500" />
            <span className="text-xs font-medium text-neutral-700">
              Burn Tokens
            </span>
          </Link>
          <button
            type="button"
            className="flex flex-col items-center gap-2 border border-neutral-200 p-4 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
          >
            <ShieldCheckIcon className="size-6 text-indigo-500" />
            <span className="text-xs font-medium text-neutral-700">
              Add to Whitelist
            </span>
          </button>
          <button
            type="button"
            className="flex flex-col items-center gap-2 border border-neutral-200 p-4 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
          >
            <BanIcon className="size-6 text-neutral-400" />
            <span className="text-xs font-medium text-neutral-700">
              Block Address
            </span>
          </button>
        </div>
      </div>

      {/* Analytics */}
      <div className="col-span-2">
        <TokenAnalyticsSection tokenId={token.id} />
      </div>
    </div>
  );
}
