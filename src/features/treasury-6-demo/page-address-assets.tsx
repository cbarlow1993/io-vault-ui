import { Link, useParams } from '@tanstack/react-router';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  CopyIcon,
  ExternalLinkIcon,
  EyeOffIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  PlusIcon,
  QrCodeIcon,
  SendIcon,
  XCircleIcon,
  XIcon,
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
  Breadcrumbs,
  NotificationButton,
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
} from '@/layout/treasury-6';

import {
  allAddresses,
  chains,
  getChainById,
  type Asset,
  type Chain,
  type ChainId,
  type Transaction,
} from './data/addresses';
import {
  getPendingOperationsByVaultId,
  getVaultById,
  type Signature,
} from './data/vaults';

// =============================================================================
// Filter Select Component
// =============================================================================

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

type SelectOption = { id: string; label: string };

const PAGE_SIZE_OPTIONS: SelectOption[] = [
  { id: '5', label: '5' },
  { id: '10', label: '10' },
  { id: '25', label: '25' },
  { id: '50', label: '50' },
];

const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[1]!; // Default to 10

// =============================================================================
// Chain ID Mapping (short form to full ChainId)
// =============================================================================

const chainIdMap: Record<string, ChainId> = {
  eth: 'ethereum',
  btc: 'bitcoin',
  sol: 'solana',
  xrp: 'xrp',
  arb: 'arbitrum',
  polygon: 'polygon',
  base: 'base',
  op: 'optimism',
  avax: 'avalanche',
  // Also support full IDs
  ethereum: 'ethereum',
  bitcoin: 'bitcoin',
  solana: 'solana',
  arbitrum: 'arbitrum',
  optimism: 'optimism',
  avalanche: 'avalanche',
};

const resolveChainId = (chain: string): ChainId | undefined => {
  return chainIdMap[chain.toLowerCase()];
};

// Get chain data by short or full ID
const getChainByIdOrShort = (chain: string): Chain | undefined => {
  const resolvedId = resolveChainId(chain);
  if (resolvedId) {
    return getChainById(resolvedId);
  }
  // Fallback: try to find by symbol
  return chains.find((c) => c.symbol.toLowerCase() === chain.toLowerCase());
};

// =============================================================================
// Mock Asset Generator (for addresses not in sample data)
// =============================================================================

const generateMockAssets = (chain: Chain): Asset[] => {
  // Generate realistic mock assets based on chain
  const baseAssets: Asset[] = [];

  // Native token
  const nativeTokens: Record<
    string,
    { symbol: string; name: string; price: string; balance: string }
  > = {
    ethereum: {
      symbol: 'ETH',
      name: 'Ethereum',
      price: '$3,368.45',
      balance: '2.4523',
    },
    bitcoin: {
      symbol: 'BTC',
      name: 'Bitcoin',
      price: '$94,560.00',
      balance: '0.1234',
    },
    solana: {
      symbol: 'SOL',
      name: 'Solana',
      price: '$210.00',
      balance: '45.678',
    },
    polygon: {
      symbol: 'MATIC',
      name: 'Polygon',
      price: '$0.45',
      balance: '5,000.00',
    },
    arbitrum: {
      symbol: 'ETH',
      name: 'Ethereum',
      price: '$3,368.45',
      balance: '1.2345',
    },
    base: {
      symbol: 'ETH',
      name: 'Ethereum',
      price: '$3,368.45',
      balance: '0.8765',
    },
    optimism: {
      symbol: 'ETH',
      name: 'Ethereum',
      price: '$3,368.45',
      balance: '0.5432',
    },
    avalanche: {
      symbol: 'AVAX',
      name: 'Avalanche',
      price: '$35.20',
      balance: '125.00',
    },
    xrp: { symbol: 'XRP', name: 'XRP', price: '$2.35', balance: '10,000.00' },
  };

  const native = nativeTokens[chain.id] || {
    symbol: chain.symbol,
    name: chain.name,
    price: '$100.00',
    balance: '10.00',
  };
  const nativeValue =
    parseFloat(native.balance.replace(/,/g, '')) *
    parseFloat(native.price.replace(/[$,]/g, ''));

  baseAssets.push({
    id: `mock-${chain.id}-native`,
    symbol: native.symbol,
    name: native.name,
    balance: native.balance,
    balanceUsd: `$${nativeValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    decimals: 18,
    isSpam: false,
    isHidden: false,
    priceUsd: native.price,
    change24h: parseFloat((Math.random() * 10 - 3).toFixed(2)),
  });

  // Add USDC for EVM chains
  if (
    [
      'ethereum',
      'polygon',
      'arbitrum',
      'base',
      'optimism',
      'avalanche',
    ].includes(chain.id)
  ) {
    const usdcBalance = (Math.random() * 50000 + 1000).toFixed(2);
    baseAssets.push({
      id: `mock-${chain.id}-usdc`,
      symbol: 'USDC',
      name: 'USD Coin',
      contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      balance: parseFloat(usdcBalance).toLocaleString('en-US', {
        minimumFractionDigits: 2,
      }),
      balanceUsd: `$${parseFloat(usdcBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      decimals: 6,
      isSpam: false,
      isHidden: false,
      priceUsd: '$1.00',
      change24h: 0.01,
    });
  }

  return baseAssets;
};

// Generate mock transactions for demo addresses
const generateMockTransactions = (
  address: string,
  chain: Chain,
  vaultId: string
): Transaction[] => {
  const now = new Date();
  const transactions: Transaction[] = [];

  // Get pending operations for this vault that are signature type
  const vaultOperations = getPendingOperationsByVaultId(vaultId).filter(
    (op) => op.type === 'signature'
  );

  // Track which operation index to use for outbound transactions
  let operationIndex = 0;

  // Generate 15-25 mock transactions for pagination demo
  const count = Math.floor(Math.random() * 11) + 15;

  for (let i = 0; i < count; i++) {
    const isInbound = Math.random() > 0.5;
    const daysAgo = Math.floor(Math.random() * 30);
    const hoursAgo = Math.floor(Math.random() * 24);
    const txDate = new Date(
      now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - hoursAgo * 60 * 60 * 1000
    );

    const statuses: Array<'confirmed' | 'pending' | 'failed'> = [
      'confirmed',
      'confirmed',
      'confirmed',
      'confirmed',
      'pending',
      'failed',
    ];
    const randomStatus =
      statuses[Math.floor(Math.random() * statuses.length)] ?? 'confirmed';
    const status: 'confirmed' | 'pending' | 'failed' =
      i === 0 && Math.random() > 0.7 ? 'pending' : randomStatus;

    const amount = (Math.random() * 10).toFixed(4);
    const price =
      chain.id === 'bitcoin' ? 94560 : chain.id === 'ethereum' ? 3368.45 : 100;
    const amountUsd = (parseFloat(amount) * price).toFixed(2);

    const randomAddr = () =>
      `0x${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}`;

    // Only link to signature if we have pending operations for this vault
    let signatureId: string | undefined;
    if (
      !isInbound &&
      vaultOperations.length > 0 &&
      operationIndex < vaultOperations.length
    ) {
      signatureId = vaultOperations[operationIndex]?.id;
      operationIndex++;
    }

    transactions.push({
      id: `mock-tx-${i}`,
      hash: `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`,
      direction: isInbound ? 'inbound' : 'outbound',
      status,
      asset: chain.symbol,
      amount,
      amountUsd: `$${parseFloat(amountUsd).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      from: isInbound ? randomAddr() : address,
      to: isInbound ? address : randomAddr(),
      timestamp: txDate.toISOString().replace('T', ' ').slice(0, 19),
      blockNumber:
        status === 'confirmed'
          ? 19230000 + Math.floor(Math.random() * 10000)
          : undefined,
      fee: (Math.random() * 0.01).toFixed(6),
      feeUsd: `$${(Math.random() * 20).toFixed(2)}`,
      signatureId,
    });
  }

  // Sort by timestamp descending (most recent first)
  return transactions.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
};

// =============================================================================
// Helper Functions
// =============================================================================

const getAddressByAddressAndChain = (address: string, chainParam: string) => {
  const resolvedChainId = resolveChainId(chainParam);
  if (!resolvedChainId) return undefined;

  return allAddresses.find(
    (addr) => addr.address === address && addr.chainId === resolvedChainId
  );
};

const formatChange = (change: number) => {
  const isPositive = change > 0;
  const isNegative = change < 0;
  return {
    value: `${isPositive ? '+' : ''}${change.toFixed(2)}%`,
    color: isPositive
      ? 'text-positive-600'
      : isNegative
        ? 'text-negative-600'
        : 'text-neutral-500',
    icon: isPositive ? ArrowUpIcon : isNegative ? ArrowDownIcon : null,
  };
};

// =============================================================================
// Asset Row Component
// =============================================================================

type AssetRowProps = {
  asset: Asset;
  chainSymbol: string;
  vaultId: string;
  chain: string;
  address: string;
};

const AssetRow = ({
  asset,
  chainSymbol,
  vaultId,
  chain,
  address,
}: AssetRowProps) => {
  const change = formatChange(asset.change24h);
  const isNative = !asset.contractAddress;

  return (
    <tr
      className={cn(
        'border-b border-neutral-100 hover:bg-neutral-50',
        asset.isSpam && 'opacity-50',
        asset.isHidden && 'opacity-50'
      )}
    >
      {/* Asset Info */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600">
            {asset.symbol.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-900">
                {asset.name}
              </span>
              {asset.isSpam && (
                <span className="flex items-center gap-1 rounded bg-warning-100 px-1.5 py-0.5 text-[10px] font-medium text-warning-700">
                  <AlertTriangleIcon className="size-3" />
                  Spam
                </span>
              )}
              {asset.isHidden && (
                <span className="flex items-center gap-1 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
                  <EyeOffIcon className="size-3" />
                  Hidden
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <span>{asset.symbol}</span>
              {isNative ? (
                <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px]">
                  Native
                </span>
              ) : (
                <span className="font-mono text-[10px]">
                  {asset.contractAddress?.slice(0, 8)}...
                  {asset.contractAddress?.slice(-6)}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Balance */}
      <td className="px-4 py-3 text-right">
        <div className="text-sm font-medium text-neutral-900 tabular-nums">
          {asset.balance}
        </div>
        <div className="text-xs text-neutral-500">{asset.symbol}</div>
      </td>

      {/* USD Value */}
      <td className="px-4 py-3 text-right">
        <div className="text-sm font-medium text-neutral-900 tabular-nums">
          {asset.balanceUsd}
        </div>
      </td>

      {/* Price */}
      <td className="px-4 py-3 text-right">
        <div className="text-sm text-neutral-700 tabular-nums">
          {asset.priceUsd}
        </div>
      </td>

      {/* 24h Change */}
      <td className="px-4 py-3 text-right">
        <div
          className={cn(
            'flex items-center justify-end gap-1 text-sm font-medium tabular-nums',
            change.color
          )}
        >
          {change.icon && <change.icon className="size-3" />}
          {change.value}
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <Button
          asChild
          variant="secondary"
          className="h-7 rounded-none px-2.5 text-xs font-medium"
        >
          <Link
            to="/vaults/$vaultId/chain/$chain/addresses/$address/transfer"
            params={{ vaultId, chain, address }}
            search={{ asset: asset.symbol }}
          >
            <SendIcon className="mr-1.5 size-3" />
            Transfer
          </Link>
        </Button>
      </td>
    </tr>
  );
};

// =============================================================================
// Transaction Row Component
// =============================================================================

type TransactionRowProps = {
  transaction: Transaction;
  explorerUrl: string;
  vaultId: string;
};

const TransactionRow = ({
  transaction,
  explorerUrl,
  vaultId,
}: TransactionRowProps) => {
  const isInbound = transaction.direction === 'inbound';

  const statusConfig = {
    confirmed: {
      icon: CheckCircle2Icon,
      color: 'text-positive-600',
      bg: 'bg-positive-50',
      label: 'Confirmed',
    },
    pending: {
      icon: ClockIcon,
      color: 'text-warning-600',
      bg: 'bg-warning-50',
      label: 'Pending',
    },
    failed: {
      icon: XCircleIcon,
      color: 'text-negative-600',
      bg: 'bg-negative-50',
      label: 'Failed',
    },
  };

  const status = statusConfig[transaction.status];
  const StatusIcon = status.icon;

  // Format timestamp
  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return `${diffMins}m ago`;
      }
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <tr className="hover:bg-neutral-50">
      {/* Direction & Status */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex size-8 items-center justify-center rounded-full',
              isInbound ? 'bg-positive-50' : 'bg-neutral-100'
            )}
          >
            {isInbound ? (
              <ArrowDownLeftIcon className="size-4 text-positive-600" />
            ) : (
              <ArrowUpRightIcon className="size-4 text-neutral-600" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-neutral-900">
                {isInbound ? 'Received' : 'Sent'}
              </span>
              <span
                className={cn(
                  'flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium',
                  status.bg,
                  status.color
                )}
              >
                <StatusIcon className="size-3" />
                {status.label}
              </span>
            </div>
            <div className="flex items-center gap-2 text-neutral-500">
              <span>{formatTimestamp(transaction.timestamp)}</span>
              {transaction.blockNumber && (
                <span className="font-mono text-[10px]">
                  Block {transaction.blockNumber.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Amount */}
      <td className="px-3 py-2 text-right">
        <div
          className={cn(
            'font-medium tabular-nums',
            isInbound ? 'text-positive-600' : 'text-neutral-900'
          )}
        >
          {isInbound ? '+' : '-'}
          {transaction.amount} {transaction.asset}
        </div>
        <div className="text-neutral-500">{transaction.amountUsd}</div>
      </td>

      {/* From/To */}
      <td className="px-3 py-2">
        <div className="text-neutral-500">{isInbound ? 'From' : 'To'}</div>
        <div className="flex items-center gap-1">
          <span className="font-mono text-neutral-700">
            {(isInbound ? transaction.from : transaction.to).slice(0, 8)}...
            {(isInbound ? transaction.from : transaction.to).slice(-6)}
          </span>
          <button
            type="button"
            className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            onClick={() =>
              navigator.clipboard.writeText(
                isInbound ? transaction.from : transaction.to
              )
            }
          >
            <CopyIcon className="size-3" />
          </button>
        </div>
      </td>

      {/* Hash */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <span className="font-mono text-neutral-500">
            {transaction.hash.slice(0, 10)}...{transaction.hash.slice(-8)}
          </span>
          <a
            href={`${explorerUrl}/tx/${transaction.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <ExternalLinkIcon className="size-3" />
          </a>
        </div>
      </td>

      {/* Fee */}
      <td className="px-3 py-2 text-right">
        {transaction.fee && (
          <>
            <div className="text-neutral-600 tabular-nums">
              {transaction.fee}
            </div>
            <div className="text-[10px] text-neutral-400">
              {transaction.feeUsd}
            </div>
          </>
        )}
      </td>

      {/* Signature */}
      <td className="px-3 py-2">
        {!isInbound && transaction.signatureId ? (
          <Link
            to="/operations/$operationId"
            params={{ operationId: transaction.signatureId }}
            className="font-medium text-brand-600 hover:text-brand-700 hover:underline"
          >
            {transaction.signatureId}
          </Link>
        ) : (
          <span className="text-neutral-400">—</span>
        )}
      </td>
    </tr>
  );
};

// =============================================================================
// Signature Row Component
// =============================================================================

type SignatureRowProps = {
  signature: Signature;
};

const SignatureRow = ({ signature }: SignatureRowProps) => {
  const statusConfig = {
    completed: {
      icon: CheckCircle2Icon,
      color: 'text-positive-600',
      bg: 'bg-positive-50',
      label: 'Completed',
    },
    pending: {
      icon: ClockIcon,
      color: 'text-warning-600',
      bg: 'bg-warning-50',
      label: 'Pending',
    },
    failed: {
      icon: XCircleIcon,
      color: 'text-negative-600',
      bg: 'bg-negative-50',
      label: 'Failed',
    },
  };

  const status = statusConfig[signature.status];
  const StatusIcon = status.icon;

  return (
    <tr className="hover:bg-neutral-50">
      {/* Status & Description */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex size-8 items-center justify-center rounded-full',
              status.bg
            )}
          >
            <StatusIcon className={cn('size-4', status.color)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-neutral-900">
                {signature.description}
              </span>
              <span
                className={cn(
                  'flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium',
                  status.bg,
                  status.color
                )}
              >
                <StatusIcon className="size-3" />
                {status.label}
              </span>
            </div>
            <div className="text-neutral-500">{signature.signedAt}</div>
          </div>
        </div>
      </td>

      {/* Signature ID */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <Link
            to="/operations/$operationId"
            params={{ operationId: signature.id }}
            className="font-mono text-brand-600 hover:text-brand-700 hover:underline"
          >
            {signature.id}
          </Link>
          <button
            type="button"
            className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            onClick={() => navigator.clipboard.writeText(signature.id)}
          >
            <CopyIcon className="size-3" />
          </button>
        </div>
      </td>

      {/* Signed By */}
      <td className="px-3 py-2 text-neutral-700">{signature.signedBy}</td>

      {/* Action */}
      <td className="px-3 py-2">
        <Link
          to="/operations/$operationId"
          params={{ operationId: signature.id }}
          className="font-medium text-brand-600 hover:text-brand-700 hover:underline"
        >
          View
        </Link>
      </td>
    </tr>
  );
};

// =============================================================================
// Main Page Component
// =============================================================================

type FilterType = 'all' | 'visible' | 'spam' | 'hidden';

export const PageAddressAssets = () => {
  const { vaultId, chain, address } = useParams({
    from: '/_app/vaults/$vaultId/chain/$chain/addresses/$address',
  });

  const [filter, setFilter] = useState<FilterType>('visible');
  const [txPage, setTxPage] = useState(1);
  const [txPageSizeOption, setTxPageSizeOption] = useState<SelectOption | null>(
    DEFAULT_PAGE_SIZE
  );
  const txPageSize = txPageSizeOption ? Number(txPageSizeOption.id) : 10;
  const [sigPage, setSigPage] = useState(1);
  const [sigPageSizeOption, setSigPageSizeOption] =
    useState<SelectOption | null>(DEFAULT_PAGE_SIZE);
  const sigPageSize = sigPageSizeOption ? Number(sigPageSizeOption.id) : 10;
  const [showQrModal, setShowQrModal] = useState(false);

  // Find the chain data (supports both short and full IDs)
  const chainData = getChainByIdOrShort(chain);

  // If chain not found, show error
  if (!chainData) {
    return (
      <PageLayout>
        <PageLayoutTopBar>
          <Breadcrumbs
            items={[
              { label: 'Vaults', href: '/vaults' },
              { label: 'Vault', href: `/vaults/${vaultId}` },
              { label: 'Chain Not Found' },
            ]}
          />
        </PageLayoutTopBar>
        <PageLayoutContent containerClassName="py-8">
          <div className="text-center">
            <p className="text-neutral-500">Unknown chain: {chain}</p>
          </div>
        </PageLayoutContent>
      </PageLayout>
    );
  }

  // Get vault data for signatures
  const vault = getVaultById(vaultId);

  // Find the address data (may not exist in sample data)
  const sampleAddressData = getAddressByAddressAndChain(address, chain);

  // Use sample data if available, otherwise generate mock data for demo
  const addressData = sampleAddressData || {
    id: `demo-${address.slice(0, 8)}`,
    vaultId,
    chainId: chainData.id,
    address,
    type: 'derived' as const,
    derivationPath: undefined,
    alias: undefined,
    createdAt: new Date().toISOString().split('T')[0],
    createdBy: 'Demo',
    assets: generateMockAssets(chainData),
    transactions: generateMockTransactions(address, chainData, vaultId),
  };

  // Filter assets based on selection
  const filteredAssets = addressData.assets.filter((asset) => {
    switch (filter) {
      case 'all':
        return true;
      case 'visible':
        return !asset.isSpam && !asset.isHidden;
      case 'spam':
        return asset.isSpam;
      case 'hidden':
        return asset.isHidden;
      default:
        return true;
    }
  });

  // Calculate totals
  const visibleAssets = addressData.assets.filter(
    (a) => !a.isSpam && !a.isHidden
  );
  const totalBalance = visibleAssets.reduce((sum, asset) => {
    const value = parseFloat(asset.balanceUsd.replace(/[$,]/g, ''));
    return sum + value;
  }, 0);

  const spamCount = addressData.assets.filter((a) => a.isSpam).length;
  const hiddenCount = addressData.assets.filter((a) => a.isHidden).length;

  // Transaction pagination
  const totalTxPages = Math.ceil(addressData.transactions.length / txPageSize);
  const txStartIndex = (txPage - 1) * txPageSize;
  const txEndIndex = txStartIndex + txPageSize;
  const paginatedTransactions = addressData.transactions.slice(
    txStartIndex,
    txEndIndex
  );

  const handleTxPageSizeChange = (value: SelectOption) => {
    setTxPageSizeOption(value);
    setTxPage(1);
  };

  // Signature pagination
  const signatures = vault?.signatures ?? [];
  const totalSigPages = Math.ceil(signatures.length / sigPageSize);
  const sigStartIndex = (sigPage - 1) * sigPageSize;
  const sigEndIndex = sigStartIndex + sigPageSize;
  const paginatedSignatures = signatures.slice(sigStartIndex, sigEndIndex);

  const handleSigPageSizeChange = (value: SelectOption) => {
    setSigPageSizeOption(value);
    setSigPage(1);
  };

  return (
    <PageLayout>
      <PageLayoutTopBar
        endActions={
          <div className="flex items-center gap-3">
            <Button
              asChild
              className="h-7 rounded-none bg-brand-500 px-3 text-xs font-medium text-white hover:bg-brand-600"
            >
              <Link
                to="/vaults/$vaultId/chain/$chain/addresses/$address/transfer"
                params={{ vaultId, chain, address }}
              >
                <PlusIcon className="mr-1.5 size-3.5" />
                Create Transfer
              </Link>
            </Button>
            <div className="h-4 w-px bg-neutral-200" />
            <NotificationButton />
          </div>
        }
      >
        <Breadcrumbs
          items={[
            { label: 'Vaults', href: '/vaults' },
            { label: vault?.name ?? 'Vault', href: `/vaults/${vaultId}` },
            { label: 'Assets' },
          ]}
        />
      </PageLayoutTopBar>

      <PageLayoutContent containerClassName="py-4">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Address Header Card */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
              <div className="flex items-center gap-3">
                <div
                  className="flex size-10 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: chainData.color }}
                >
                  {chainData.symbol.slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-neutral-900">
                      {addressData.alias || 'Unnamed Address'}
                    </span>
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
                      {addressData.type === 'root' ? 'Root' : 'Derived'}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-500">
                    {chainData.name}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-neutral-900 tabular-nums">
                  $
                  {totalBalance.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="text-xs text-neutral-500">
                  {visibleAssets.length} asset
                  {visibleAssets.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-4 py-3">
              <span className="font-mono text-sm text-neutral-700">
                {addressData.address}
              </span>
              <button
                type="button"
                className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                onClick={() =>
                  navigator.clipboard.writeText(addressData.address)
                }
              >
                <CopyIcon className="size-4" />
              </button>
              <button
                type="button"
                className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                onClick={() => setShowQrModal(true)}
              >
                <QrCodeIcon className="size-4" />
              </button>
              <a
                href={`${chainData.explorerUrl}/address/${addressData.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              >
                <ExternalLinkIcon className="size-4" />
              </a>
            </div>

            {addressData.derivationPath && (
              <div className="border-t border-neutral-100 px-4 py-2">
                <span className="text-xs text-neutral-500">
                  Derivation Path:{' '}
                </span>
                <span className="font-mono text-xs text-neutral-700">
                  {addressData.derivationPath}
                </span>
              </div>
            )}
          </div>

          {/* Assets Table */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
              <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                Assets
              </h2>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant={filter === 'visible' ? 'default' : 'ghost'}
                  className={cn(
                    'h-7 rounded-none px-3 text-xs',
                    filter === 'visible'
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  )}
                  onClick={() => setFilter('visible')}
                >
                  Visible ({visibleAssets.length})
                </Button>
                <Button
                  type="button"
                  variant={filter === 'all' ? 'default' : 'ghost'}
                  className={cn(
                    'h-7 rounded-none px-3 text-xs',
                    filter === 'all'
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  )}
                  onClick={() => setFilter('all')}
                >
                  All ({addressData.assets.length})
                </Button>
                {spamCount > 0 && (
                  <Button
                    type="button"
                    variant={filter === 'spam' ? 'default' : 'ghost'}
                    className={cn(
                      'h-7 rounded-none px-3 text-xs',
                      filter === 'spam'
                        ? 'bg-warning-600 text-white'
                        : 'text-warning-600 hover:bg-warning-50'
                    )}
                    onClick={() => setFilter('spam')}
                  >
                    Spam ({spamCount})
                  </Button>
                )}
                {hiddenCount > 0 && (
                  <Button
                    type="button"
                    variant={filter === 'hidden' ? 'default' : 'ghost'}
                    className={cn(
                      'h-7 rounded-none px-3 text-xs',
                      filter === 'hidden'
                        ? 'bg-neutral-600 text-white'
                        : 'text-neutral-600 hover:bg-neutral-100'
                    )}
                    onClick={() => setFilter('hidden')}
                  >
                    Hidden ({hiddenCount})
                  </Button>
                )}
              </div>
            </div>

            {filteredAssets.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-neutral-500">No assets found</p>
                <p className="mt-1 text-xs text-neutral-400">
                  {filter === 'visible'
                    ? 'This address has no visible assets'
                    : filter === 'spam'
                      ? 'No spam tokens detected'
                      : filter === 'hidden'
                        ? 'No hidden assets'
                        : 'This address has no assets'}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs font-medium text-neutral-500">
                    <th className="px-4 py-2">Asset</th>
                    <th className="px-4 py-2 text-right">Balance</th>
                    <th className="px-4 py-2 text-right">Value (USD)</th>
                    <th className="px-4 py-2 text-right">Price</th>
                    <th className="px-4 py-2 text-right">24h</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map((asset) => (
                    <AssetRow
                      key={asset.id}
                      asset={asset}
                      chainSymbol={chainData.symbol}
                      vaultId={vaultId}
                      chain={chain}
                      address={address}
                    />
                  ))}
                </tbody>
              </table>
            )}

            {/* Summary Footer */}
            {filteredAssets.length > 0 && filter === 'visible' && (
              <div className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50 px-4 py-3">
                <span className="text-xs font-medium text-neutral-600">
                  Total Value
                </span>
                <span className="text-sm font-semibold text-neutral-900 tabular-nums">
                  $
                  {totalBalance.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Transaction History */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
              <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                Transaction History
              </h2>
              <span className="text-xs text-neutral-500">
                {addressData.transactions.length} transaction
                {addressData.transactions.length !== 1 ? 's' : ''}
              </span>
            </div>

            {addressData.transactions.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <p className="text-sm text-neutral-500">No transactions yet</p>
                <p className="mt-1 text-xs text-neutral-400">
                  This address has no transaction history
                </p>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50 text-left">
                    <th className="px-3 py-2 font-medium text-neutral-500">
                      Transaction
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-neutral-500">
                      Amount
                    </th>
                    <th className="px-3 py-2 font-medium text-neutral-500">
                      Address
                    </th>
                    <th className="px-3 py-2 font-medium text-neutral-500">
                      Hash
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-neutral-500">
                      Fee
                    </th>
                    <th className="px-3 py-2 font-medium text-neutral-500">
                      Signature
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {paginatedTransactions.map((tx) => (
                    <TransactionRow
                      key={tx.id}
                      transaction={tx}
                      explorerUrl={chainData.explorerUrl}
                      vaultId={vaultId}
                    />
                  ))}
                </tbody>
              </table>
            )}

            {/* Pagination */}
            {addressData.transactions.length > 0 && (
              <div className="flex items-center justify-between border-t border-neutral-200 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">
                    Rows per page:
                  </span>
                  <FilterSelect
                    options={PAGE_SIZE_OPTIONS}
                    value={txPageSizeOption}
                    onChange={handleTxPageSizeChange}
                    className="w-16"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <span className="mr-2 text-xs text-neutral-500">
                    {txStartIndex + 1}-
                    {Math.min(txEndIndex, addressData.transactions.length)} of{' '}
                    {addressData.transactions.length}
                  </span>

                  {/* First page */}
                  <button
                    type="button"
                    onClick={() => setTxPage(1)}
                    disabled={txPage === 1}
                    className={cn(
                      'flex size-7 items-center justify-center border border-neutral-200',
                      txPage === 1
                        ? 'cursor-not-allowed bg-neutral-50 text-neutral-300'
                        : 'bg-white text-neutral-600 hover:bg-neutral-50'
                    )}
                  >
                    <ChevronsLeftIcon className="size-3.5" />
                  </button>

                  {/* Previous page */}
                  <button
                    type="button"
                    onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                    disabled={txPage === 1}
                    className={cn(
                      'flex size-7 items-center justify-center border border-neutral-200',
                      txPage === 1
                        ? 'cursor-not-allowed bg-neutral-50 text-neutral-300'
                        : 'bg-white text-neutral-600 hover:bg-neutral-50'
                    )}
                  >
                    <ChevronLeftIcon className="size-3.5" />
                  </button>

                  {/* Page numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalTxPages }, (_, i) => i + 1)
                      .filter((page) => {
                        // Show first, last, current, and adjacent pages
                        if (page === 1 || page === totalTxPages) return true;
                        if (Math.abs(page - txPage) <= 1) return true;
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
                            onClick={() => setTxPage(item)}
                            className={cn(
                              'flex size-7 items-center justify-center border text-xs',
                              txPage === item
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
                      setTxPage((p) => Math.min(totalTxPages, p + 1))
                    }
                    disabled={txPage === totalTxPages}
                    className={cn(
                      'flex size-7 items-center justify-center border border-neutral-200',
                      txPage === totalTxPages
                        ? 'cursor-not-allowed bg-neutral-50 text-neutral-300'
                        : 'bg-white text-neutral-600 hover:bg-neutral-50'
                    )}
                  >
                    <ChevronRightIcon className="size-3.5" />
                  </button>

                  {/* Last page */}
                  <button
                    type="button"
                    onClick={() => setTxPage(totalTxPages)}
                    disabled={txPage === totalTxPages}
                    className={cn(
                      'flex size-7 items-center justify-center border border-neutral-200',
                      txPage === totalTxPages
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

          {/* Signatures Table */}
          {signatures.length > 0 && (
            <div className="border border-neutral-200 bg-white">
              <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
                <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                  Signatures
                </h2>
                <span className="text-xs text-neutral-500">
                  {signatures.length} signature
                  {signatures.length !== 1 ? 's' : ''}
                </span>
              </div>

              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50 text-left">
                    <th className="px-3 py-2 font-medium text-neutral-500">
                      Signature
                    </th>
                    <th className="px-3 py-2 font-medium text-neutral-500">
                      Signature ID
                    </th>
                    <th className="px-3 py-2 font-medium text-neutral-500">
                      Signed By
                    </th>
                    <th className="px-3 py-2 font-medium text-neutral-500">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {paginatedSignatures.map((signature) => (
                    <SignatureRow key={signature.id} signature={signature} />
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {signatures.length > 0 && (
                <div className="flex items-center justify-between border-t border-neutral-200 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500">
                      Rows per page:
                    </span>
                    <FilterSelect
                      options={PAGE_SIZE_OPTIONS}
                      value={sigPageSizeOption}
                      onChange={handleSigPageSizeChange}
                      className="w-16"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="mr-2 text-xs text-neutral-500">
                      {sigStartIndex + 1}-
                      {Math.min(sigEndIndex, signatures.length)} of{' '}
                      {signatures.length}
                    </span>

                    {/* First page */}
                    <button
                      type="button"
                      onClick={() => setSigPage(1)}
                      disabled={sigPage === 1}
                      className={cn(
                        'flex size-7 items-center justify-center border border-neutral-200',
                        sigPage === 1
                          ? 'cursor-not-allowed bg-neutral-50 text-neutral-300'
                          : 'bg-white text-neutral-600 hover:bg-neutral-50'
                      )}
                    >
                      <ChevronsLeftIcon className="size-3.5" />
                    </button>

                    {/* Previous page */}
                    <button
                      type="button"
                      onClick={() => setSigPage((p) => Math.max(1, p - 1))}
                      disabled={sigPage === 1}
                      className={cn(
                        'flex size-7 items-center justify-center border border-neutral-200',
                        sigPage === 1
                          ? 'cursor-not-allowed bg-neutral-50 text-neutral-300'
                          : 'bg-white text-neutral-600 hover:bg-neutral-50'
                      )}
                    >
                      <ChevronLeftIcon className="size-3.5" />
                    </button>

                    {/* Page numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalSigPages }, (_, i) => i + 1)
                        .filter((page) => {
                          // Show first, last, current, and adjacent pages
                          if (page === 1 || page === totalSigPages) return true;
                          if (Math.abs(page - sigPage) <= 1) return true;
                          return false;
                        })
                        .reduce<(number | 'ellipsis')[]>(
                          (acc, page, idx, arr) => {
                            if (
                              idx > 0 &&
                              page - (arr[idx - 1] as number) > 1
                            ) {
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
                              onClick={() => setSigPage(item)}
                              className={cn(
                                'flex size-7 items-center justify-center border text-xs',
                                sigPage === item
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
                        setSigPage((p) => Math.min(totalSigPages, p + 1))
                      }
                      disabled={sigPage === totalSigPages}
                      className={cn(
                        'flex size-7 items-center justify-center border border-neutral-200',
                        sigPage === totalSigPages
                          ? 'cursor-not-allowed bg-neutral-50 text-neutral-300'
                          : 'bg-white text-neutral-600 hover:bg-neutral-50'
                      )}
                    >
                      <ChevronRightIcon className="size-3.5" />
                    </button>

                    {/* Last page */}
                    <button
                      type="button"
                      onClick={() => setSigPage(totalSigPages)}
                      disabled={sigPage === totalSigPages}
                      className={cn(
                        'flex size-7 items-center justify-center border border-neutral-200',
                        sigPage === totalSigPages
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
          )}
        </div>
      </PageLayoutContent>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowQrModal(false)}
          />

          {/* Modal */}
          <div className="relative z-10 w-full max-w-sm border border-neutral-200 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900">
                Scan Address
              </h3>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col items-center">
              {/* QR Code placeholder - in production, use a QR code library */}
              <div className="flex size-48 items-center justify-center border-2 border-dashed border-neutral-300 bg-neutral-50">
                <div className="text-center">
                  <QrCodeIcon className="mx-auto size-16 text-neutral-400" />
                  <p className="mt-2 text-xs text-neutral-500">QR Code</p>
                </div>
              </div>

              <div className="mt-4 w-full">
                <p className="text-center text-xs text-neutral-500">
                  {chainData.name} Address
                </p>
                <p className="mt-1 text-center font-mono text-xs break-all text-neutral-700">
                  {addressData.address}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(addressData.address);
                }}
                className="mt-4 flex items-center gap-2 rounded border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
              >
                <CopyIcon className="size-3.5" />
                Copy Address
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};
