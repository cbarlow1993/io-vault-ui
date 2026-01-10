import { Link, useParams } from '@tanstack/react-router';
import {
  ArrowLeftIcon,
  BuildingIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ClockIcon,
  CopyIcon,
  KeyIcon,
  PlusIcon,
  RefreshCwIcon,
  ServerIcon,
  SmartphoneIcon,
  UserIcon,
  WalletIcon,
  XCircleIcon,
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
  DialogTrigger,
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
  getAddressesByVaultId,
  getAddressTotalBalance,
  getChainById,
} from './data/addresses';
import { getIdentityById, isCorporateIdentity } from './data/identities';
import {
  getPendingReshareByVaultId,
  getVaultById,
  type DeviceType,
  type Signature,
  type VaultStatus,
} from './data/vaults';

const getStatusStyles = (status: VaultStatus) => {
  switch (status) {
    case 'active':
      return 'bg-positive-100 text-positive-700';
    case 'pending':
      return 'bg-warning-100 text-warning-700';
    case 'revoked':
      return 'bg-neutral-100 text-neutral-500';
  }
};

const getSignatureStatusIcon = (status: Signature['status']) => {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon className="size-4 text-positive-600" />;
    case 'pending':
      return <ClockIcon className="size-4 text-warning-600" />;
    case 'failed':
      return <XCircleIcon className="size-4 text-negative-600" />;
  }
};

const getDeviceIcon = (deviceType: DeviceType) => {
  switch (deviceType) {
    case 'server':
      return <ServerIcon className="size-4 text-neutral-500" />;
    case 'ios':
    case 'android':
      return <SmartphoneIcon className="size-4 text-neutral-500" />;
  }
};

const getDeviceLabel = (deviceType: DeviceType) => {
  switch (deviceType) {
    case 'server':
      return 'Server';
    case 'ios':
      return 'iOS';
    case 'android':
      return 'Android';
  }
};

// Pagination select component
type SelectOption = { id: string; label: string };

const FilterSelect = <T extends SelectOption>({
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

const PAGE_SIZE_OPTIONS: SelectOption[] = [
  { id: '5', label: '5' },
  { id: '10', label: '10' },
  { id: '25', label: '25' },
  { id: '50', label: '50' },
];

const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0]!;

export const PageVaultDetail = () => {
  const { vaultId } = useParams({ from: '/_app/vaults/$vaultId' });
  const vault = getVaultById(vaultId);
  const pendingReshare = getPendingReshareByVaultId(vaultId);
  const linkedIdentity = vault?.identityId
    ? getIdentityById(vault.identityId)
    : undefined;
  const vaultAddresses = getAddressesByVaultId(vaultId);

  // Signature pagination state
  const [sigCurrentPage, setSigCurrentPage] = useState(1);
  const [sigPageSizeOption, setSigPageSizeOption] =
    useState<SelectOption | null>(DEFAULT_PAGE_SIZE);
  const sigPageSize = sigPageSizeOption ? Number(sigPageSizeOption.id) : 5;

  // Signature pagination logic
  const sigTotalPages = useMemo(
    () => Math.ceil((vault?.signatures.length ?? 0) / sigPageSize),
    [vault?.signatures.length, sigPageSize]
  );
  const sigStartIndex = (sigCurrentPage - 1) * sigPageSize;
  const sigEndIndex = sigStartIndex + sigPageSize;
  const paginatedSignatures = useMemo(
    () => vault?.signatures.slice(sigStartIndex, sigEndIndex) ?? [],
    [vault?.signatures, sigStartIndex, sigEndIndex]
  );

  const handleSigPageSizeChange = (value: SelectOption) => {
    setSigPageSizeOption(value);
    setSigCurrentPage(1);
  };

  // Cancel reshare dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const handleCancelReshare = () => {
    // In a real app, this would call an API to cancel the reshare request
    console.log('Cancel reshare request:', pendingReshare?.id);
    setCancelDialogOpen(false);
    toast.success('Reshare request cancelled successfully');
  };

  if (!vault) {
    return (
      <PageLayout>
        <PageLayoutTopBar>
          <PageLayoutTopBarTitle>Vault Not Found</PageLayoutTopBarTitle>
        </PageLayoutTopBar>
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

  return (
    <PageLayout>
      <PageLayoutTopBar
        endActions={
          <div className="flex items-center gap-3">
            <NotificationButton />
            {vault.status === 'active' && !pendingReshare && (
              <Button
                asChild
                variant="secondary"
                className="h-7 rounded-none border-neutral-300 px-3 text-xs font-medium"
              >
                <Link to="/vaults/$vaultId/edit" params={{ vaultId: vault.id }}>
                  <RefreshCwIcon className="mr-1.5 size-3.5" />
                  Reshare
                </Link>
              </Button>
            )}
            <Button className="h-7 rounded-none bg-brand-500 px-3 text-xs font-medium text-white hover:bg-brand-600">
              <KeyIcon className="mr-1.5 size-3.5" />
              Sign Message
            </Button>
          </div>
        }
      >
        <div className="flex items-center gap-3">
          <Link
            to="/vaults"
            className="flex size-6 items-center justify-center text-neutral-400 hover:text-neutral-900"
          >
            <ArrowLeftIcon className="size-4" />
          </Link>
          <PageLayoutTopBarTitle>{vault.name}</PageLayoutTopBarTitle>
          <span
            className={cn(
              'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
              getStatusStyles(vault.status)
            )}
          >
            {vault.status}
          </span>
        </div>
      </PageLayoutTopBar>
      <PageLayoutContent containerClassName="py-4">
        <div className="space-y-6">
          {/* Pending Reshare Banner */}
          {pendingReshare && (
            <div className="border border-warning-200 bg-warning-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <ClockIcon className="size-4 text-warning-600" />
                    <p className="text-xs font-medium text-warning-800">
                      Pending Reshare Request
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-warning-700">
                    Requested by {pendingReshare.requestedBy} on{' '}
                    {pendingReshare.requestedAt}
                  </p>
                  <p className="mt-2 text-xs text-warning-700">
                    Approvals:{' '}
                    {pendingReshare.approvals.filter((a) => a.approved).length}{' '}
                    of {pendingReshare.approvals.length} signers
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-warning-700">
                    New Threshold:{' '}
                    <span className="font-semibold">
                      {pendingReshare.newThreshold}
                    </span>
                  </span>
                  <span className="text-xs text-warning-700">
                    New Signers:{' '}
                    <span className="font-semibold">
                      {pendingReshare.newSigners.length}
                    </span>
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-2">
                  {pendingReshare.approvals.map((approval) => {
                    const signer = vault.signers.find(
                      (s) => s.id === approval.signerId
                    );
                    return (
                      <div
                        key={approval.signerId}
                        className={cn(
                          'flex items-center gap-1 rounded px-2 py-1 text-[10px]',
                          approval.approved
                            ? 'bg-positive-100 text-positive-700'
                            : 'bg-warning-100 text-warning-700'
                        )}
                      >
                        {approval.approved ? (
                          <CheckCircleIcon className="size-3" />
                        ) : (
                          <ClockIcon className="size-3" />
                        )}
                        <span>{signer?.name ?? 'Unknown'}</span>
                      </div>
                    );
                  })}
                </div>
                <Dialog
                  open={cancelDialogOpen}
                  onOpenChange={setCancelDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="secondary"
                      className="h-7 rounded-none border-warning-300 bg-white px-3 text-xs font-medium text-warning-700 hover:bg-warning-100 hover:text-warning-800"
                    >
                      <XCircleIcon className="mr-1.5 size-3.5" />
                      Cancel Request
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md rounded-none">
                    <DialogHeader>
                      <DialogTitle className="text-sm font-semibold text-neutral-900">
                        Cancel Reshare Request
                      </DialogTitle>
                      <DialogDescription className="text-xs text-neutral-500">
                        Are you sure you want to cancel this reshare request?
                        This action cannot be undone and all pending approvals
                        will be discarded.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 sm:justify-end">
                      <DialogClose asChild>
                        <Button
                          variant="secondary"
                          className="h-8 rounded-none border-neutral-300 px-4 text-xs font-medium"
                        >
                          Keep Request
                        </Button>
                      </DialogClose>
                      <Button
                        className="h-8 rounded-none bg-negative-600 px-4 text-xs font-medium text-white hover:bg-negative-700"
                        onClick={handleCancelReshare}
                      >
                        Cancel Request
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          )}

          {/* Vault Info */}
          <div className="grid grid-cols-3 gap-px bg-neutral-200">
            <div className="bg-white p-4">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Created
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-900">
                {vault.createdAt}
              </p>
              <p className="text-xs text-neutral-500">by {vault.createdBy}</p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Last Used
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-900">
                {vault.lastUsed ?? 'Never'}
              </p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Total Signatures
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-900">
                {vault.signatures.length}
              </p>
            </div>
          </div>

          {/* Linked Identity */}
          {linkedIdentity && (
            <div className="border border-neutral-200 bg-white">
              <div className="border-b border-neutral-200 px-4 py-3">
                <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                  Linked Identity
                </h2>
              </div>
              <Link
                to="/identities/$identityId"
                params={{ identityId: linkedIdentity.id }}
                className="flex items-center gap-3 p-4 hover:bg-neutral-50"
              >
                <div
                  className={cn(
                    'flex size-8 items-center justify-center rounded-full',
                    isCorporateIdentity(linkedIdentity)
                      ? 'bg-blue-100'
                      : 'bg-purple-100'
                  )}
                >
                  {isCorporateIdentity(linkedIdentity) ? (
                    <BuildingIcon className="text-blue-600 size-4" />
                  ) : (
                    <UserIcon className="text-purple-600 size-4" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-900">
                    {linkedIdentity.displayName ?? linkedIdentity.name}
                  </p>
                  <p className="text-xs text-neutral-500 capitalize">
                    {linkedIdentity.type}
                  </p>
                </div>
                <span
                  className={cn(
                    'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
                    linkedIdentity.kycStatus === 'verified'
                      ? 'bg-positive-100 text-positive-700'
                      : linkedIdentity.kycStatus === 'pending'
                        ? 'bg-warning-100 text-warning-700'
                        : linkedIdentity.kycStatus === 'expired'
                          ? 'bg-neutral-100 text-neutral-500'
                          : 'bg-negative-100 text-negative-700'
                  )}
                >
                  {linkedIdentity.kycStatus}
                </span>
                <ChevronRightIcon className="size-4 text-neutral-400" />
              </Link>
            </div>
          )}

          {/* Addresses Section */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <WalletIcon className="size-4 text-neutral-500" />
                <div>
                  <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                    Addresses
                  </h2>
                  <p className="mt-0.5 text-[11px] text-neutral-500">
                    Blockchain addresses derived from this vault
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  asChild
                  variant="secondary"
                  className="h-7 rounded-none border-neutral-300 px-3 text-xs font-medium"
                >
                  <Link
                    to="/vaults/$vaultId/addresses/new"
                    params={{ vaultId }}
                  >
                    <PlusIcon className="mr-1.5 size-3.5" />
                    New Address
                  </Link>
                </Button>
                {vaultAddresses.length > 0 && (
                  <Link
                    to="/vaults/$vaultId/addresses"
                    params={{ vaultId }}
                    className="flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-neutral-900"
                  >
                    View All
                    <ChevronRightIcon className="size-3.5" />
                  </Link>
                )}
              </div>
            </div>
            {vaultAddresses.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <WalletIcon className="mx-auto size-8 text-neutral-300" />
                <p className="mt-2 text-sm text-neutral-500">
                  No addresses yet
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  Create an address to start receiving funds on this vault
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {vaultAddresses.slice(0, 3).map((addr) => {
                  const chain = getChainById(addr.chainId);
                  const totalBalance = getAddressTotalBalance(addr);
                  return (
                    <Link
                      key={addr.id}
                      to="/vaults/$vaultId/addresses/$addressId"
                      params={{ vaultId, addressId: addr.id }}
                      className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex size-8 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${chain?.color}20` }}
                        >
                          <span
                            className="text-[10px] font-bold"
                            style={{ color: chain?.color }}
                          >
                            {chain?.symbol.slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-neutral-900">
                              {addr.address.slice(0, 6)}...
                              {addr.address.slice(-4)}
                            </span>
                            {addr.alias && (
                              <span className="text-xs text-neutral-500">
                                {addr.alias}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-neutral-500">
                            <span>{chain?.name}</span>
                            <span className="text-neutral-300">•</span>
                            <span className="capitalize">{addr.type}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-neutral-900 tabular-nums">
                          {totalBalance}
                        </span>
                        <ChevronRightIcon className="size-4 text-neutral-400" />
                      </div>
                    </Link>
                  );
                })}
                {vaultAddresses.length > 3 && (
                  <Link
                    to="/vaults/$vaultId/addresses"
                    params={{ vaultId }}
                    className="flex items-center justify-center gap-1 px-4 py-2.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                  >
                    View all {vaultAddresses.length} addresses
                    <ChevronRightIcon className="size-3.5" />
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Curves Section */}
          <div className="border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-4 py-3">
              <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                Cryptographic Curves
              </h2>
              <p className="mt-0.5 text-[11px] text-neutral-500">
                This vault contains 2 key pairs for multi-chain signing
              </p>
            </div>
            <div className="grid grid-cols-2 gap-px bg-neutral-200">
              {vault.curves.map((curve, index) => (
                <div key={index} className="bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-block rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-neutral-600">
                        {curve.type}
                      </span>
                      <span className="font-mono text-xs text-neutral-600">
                        {curve.curve}
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-400">
                      Curve {index + 1}
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div>
                      <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                        Fingerprint
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className="font-mono text-xs text-neutral-900">
                          {curve.fingerprint}
                        </span>
                        <button
                          type="button"
                          className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                        >
                          <CopyIcon className="size-3" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                        Public Key
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className="max-w-[200px] truncate font-mono text-xs text-neutral-600">
                          {curve.publicKey}
                        </span>
                        <button
                          type="button"
                          className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                        >
                          <CopyIcon className="size-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Signers Section */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
              <div>
                <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                  MPC Signers
                </h2>
                <p className="mt-0.5 text-[11px] text-neutral-500">
                  Distributed key holders for threshold signing
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                  Threshold
                </p>
                <p className="text-sm font-semibold text-neutral-900 tabular-nums">
                  {vault.threshold}
                </p>
              </div>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-left">
                  <th className="px-4 py-2 font-medium text-neutral-500">
                    Device
                  </th>
                  <th className="px-4 py-2 font-medium text-neutral-500">
                    Name
                  </th>
                  <th className="px-4 py-2 font-medium text-neutral-500">
                    Owner
                  </th>
                  <th className="px-4 py-2 font-medium text-neutral-500">
                    Version
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-neutral-500">
                    Voting Power
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {vault.signers.map((signer) => (
                  <tr key={signer.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(signer.deviceType)}
                        <span className="text-neutral-600">
                          {getDeviceLabel(signer.deviceType)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-neutral-900">
                      {signer.name}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">
                      {signer.owner}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-neutral-500">
                        {signer.version}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-neutral-100 px-1.5 font-mono text-[10px] font-semibold text-neutral-700 tabular-nums">
                        {signer.votingPower}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Signatures Section */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
              <div>
                <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                  Signature History
                </h2>
                <p className="mt-0.5 text-[11px] text-neutral-500">
                  All cryptographic signatures produced by this vault
                </p>
              </div>
              <span className="text-xs text-neutral-500 tabular-nums">
                {vault.signatures.length}{' '}
                {vault.signatures.length === 1 ? 'signature' : 'signatures'}
              </span>
            </div>
            {vault.signatures.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-neutral-500">No signatures yet</p>
                <p className="mt-1 text-xs text-neutral-400">
                  This vault has not been used to sign any messages
                </p>
              </div>
            ) : (
              <>
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
                        Hash
                      </th>
                      <th className="px-4 py-2 font-medium text-neutral-500">
                        Curve
                      </th>
                      <th className="px-4 py-2 font-medium text-neutral-500">
                        Signed At
                      </th>
                      <th className="px-4 py-2 font-medium text-neutral-500">
                        Signed By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {paginatedSignatures.map((sig) => (
                      <tr key={sig.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            {getSignatureStatusIcon(sig.status)}
                            <span className="text-neutral-600 capitalize">
                              {sig.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 font-medium text-neutral-900">
                          {sig.description}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="max-w-[120px] truncate font-mono text-neutral-600">
                              {sig.hash}
                            </span>
                            <button
                              type="button"
                              className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                            >
                              <CopyIcon className="size-3" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="inline-block rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-neutral-600">
                            {sig.curveUsed}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-neutral-600 tabular-nums">
                          {sig.signedAt}
                        </td>
                        <td className="px-4 py-2.5 text-neutral-600">
                          {sig.signedBy}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
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
                      {Math.min(sigEndIndex, vault.signatures.length)} of{' '}
                      {vault.signatures.length}
                    </span>

                    {/* First page */}
                    <button
                      type="button"
                      onClick={() => setSigCurrentPage(1)}
                      disabled={sigCurrentPage === 1}
                      className={cn(
                        'flex size-7 items-center justify-center border border-neutral-200',
                        sigCurrentPage === 1
                          ? 'cursor-not-allowed bg-neutral-50 text-neutral-300'
                          : 'bg-white text-neutral-600 hover:bg-neutral-50'
                      )}
                    >
                      <ChevronsLeftIcon className="size-3.5" />
                    </button>

                    {/* Previous page */}
                    <button
                      type="button"
                      onClick={() =>
                        setSigCurrentPage((p) => Math.max(1, p - 1))
                      }
                      disabled={sigCurrentPage === 1}
                      className={cn(
                        'flex size-7 items-center justify-center border border-neutral-200',
                        sigCurrentPage === 1
                          ? 'cursor-not-allowed bg-neutral-50 text-neutral-300'
                          : 'bg-white text-neutral-600 hover:bg-neutral-50'
                      )}
                    >
                      <ChevronLeftIcon className="size-3.5" />
                    </button>

                    {/* Page numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: sigTotalPages }, (_, i) => i + 1)
                        .filter((page) => {
                          if (page === 1 || page === sigTotalPages) return true;
                          if (Math.abs(page - sigCurrentPage) <= 1) return true;
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
                              onClick={() => setSigCurrentPage(item)}
                              className={cn(
                                'flex size-7 items-center justify-center border text-xs',
                                sigCurrentPage === item
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
                        setSigCurrentPage((p) => Math.min(sigTotalPages, p + 1))
                      }
                      disabled={sigCurrentPage === sigTotalPages}
                      className={cn(
                        'flex size-7 items-center justify-center border border-neutral-200',
                        sigCurrentPage === sigTotalPages
                          ? 'cursor-not-allowed bg-neutral-50 text-neutral-300'
                          : 'bg-white text-neutral-600 hover:bg-neutral-50'
                      )}
                    >
                      <ChevronRightIcon className="size-3.5" />
                    </button>

                    {/* Last page */}
                    <button
                      type="button"
                      onClick={() => setSigCurrentPage(sigTotalPages)}
                      disabled={sigCurrentPage === sigTotalPages}
                      className={cn(
                        'flex size-7 items-center justify-center border border-neutral-200',
                        sigCurrentPage === sigTotalPages
                          ? 'cursor-not-allowed bg-neutral-50 text-neutral-300'
                          : 'bg-white text-neutral-600 hover:bg-neutral-50'
                      )}
                    >
                      <ChevronsRightIcon className="size-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
