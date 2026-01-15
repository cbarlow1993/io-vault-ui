import { Link, useNavigate, useParams } from '@tanstack/react-router';
import {
  ArrowLeftIcon,
  BuildingIcon,
  CheckIcon,
  ChevronDownIcon,
  MinusIcon,
  PlusIcon,
  ServerIcon,
  SmartphoneIcon,
  TrashIcon,
  UserIcon,
  XIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  allIdentities,
  type CorporateIdentity,
  getIdentityById,
  type IndividualIdentity,
  isCorporateIdentity,
} from '@/features/identities/data/identities';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/shell';

import {
  type AvailableSigner,
  availableSigners,
  type DeviceType,
  getVaultById,
  type Signer,
} from './data/vaults';

type FormSigner = {
  id: string;
  name: string;
  owner: string;
  deviceType: DeviceType;
  version: string;
  votingPower: number;
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

type VaultFormProps = {
  mode: 'create' | 'edit';
  vaultId?: string;
};

const VaultFormContent = ({ mode, vaultId }: VaultFormProps) => {
  const navigate = useNavigate();
  const vault = vaultId ? getVaultById(vaultId) : undefined;

  // Form state
  const [name, setName] = useState(vault?.name ?? '');
  const [threshold, setThreshold] = useState(vault?.threshold ?? 2);
  const [allowDerivedAddresses, setAllowDerivedAddresses] = useState(false);
  const [selectedIdentityId, setSelectedIdentityId] = useState<
    string | undefined
  >(vault?.identityId);
  const [selectedSigners, setSelectedSigners] = useState<FormSigner[]>(
    vault?.signers.map((s) => ({
      id: s.id,
      name: s.name,
      owner: s.owner,
      deviceType: s.deviceType,
      version: s.version,
      votingPower: s.votingPower,
    })) ?? []
  );

  // Get the selected identity details
  const selectedIdentity = selectedIdentityId
    ? getIdentityById(selectedIdentityId)
    : undefined;

  // Available signers that aren't already selected
  const availableToAdd = useMemo(() => {
    const selectedIds = new Set(selectedSigners.map((s) => s.id));
    return availableSigners.filter((s) => !selectedIds.has(s.id));
  }, [selectedSigners]);

  // Calculate total voting power
  const totalVotingPower = useMemo(() => {
    return selectedSigners.reduce((sum, s) => sum + s.votingPower, 0);
  }, [selectedSigners]);

  // Validation
  const isValid = useMemo(() => {
    if (!name.trim()) return false;
    if (selectedSigners.length === 0) return false;
    if (threshold < 1) return false;
    if (threshold > totalVotingPower) return false;
    return true;
  }, [name, selectedSigners, threshold, totalVotingPower]);

  const handleAddSigner = (signer: AvailableSigner) => {
    setSelectedSigners((prev) => [
      ...prev,
      {
        ...signer,
        votingPower: 1,
      },
    ]);
  };

  const handleRemoveSigner = (signerId: string) => {
    setSelectedSigners((prev) => prev.filter((s) => s.id !== signerId));
  };

  const handleVotingPowerChange = (signerId: string, delta: number) => {
    setSelectedSigners((prev) =>
      prev.map((s) => {
        if (s.id === signerId) {
          const newPower = Math.max(1, s.votingPower + delta);
          return { ...s, votingPower: newPower };
        }
        return s;
      })
    );
  };

  const handleSubmit = () => {
    // In a real app, this would submit to an API
    console.log('Submitting vault:', {
      name,
      threshold,
      signers: selectedSigners,
      identityId: selectedIdentityId,
      allowDerivedAddresses:
        mode === 'create' ? allowDerivedAddresses : undefined,
    });
    // Navigate back to the vault list or detail page
    if (mode === 'edit' && vaultId) {
      navigate({ to: '/vaults/$vaultId', params: { vaultId } });
    } else {
      navigate({ to: '/vaults' });
    }
  };

  const handleCancel = () => {
    if (mode === 'edit' && vaultId) {
      navigate({ to: '/vaults/$vaultId', params: { vaultId } });
    } else {
      navigate({ to: '/vaults' });
    }
  };

  if (mode === 'edit' && !vault) {
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

  return (
    <PageLayout>
      <PageLayoutTopBar
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              className="h-7 rounded-none border-neutral-300 px-3 text-xs font-medium"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!isValid}
              data-testid="vault-submit-button"
              className={cn(
                'h-7 rounded-none px-3 text-xs font-medium',
                isValid
                  ? 'bg-brand-500 text-white hover:bg-brand-600'
                  : 'cursor-not-allowed bg-neutral-200 text-neutral-400'
              )}
            >
              {mode === 'create' ? 'Create Vault' : 'Request Reshare'}
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="flex size-6 items-center justify-center text-neutral-400 hover:text-neutral-900"
          >
            <ArrowLeftIcon className="size-4" />
          </button>
          <PageLayoutTopBarTitle>
            {mode === 'create' ? 'Create Vault' : 'Reshare Vault'}
          </PageLayoutTopBarTitle>
        </div>
      </PageLayoutTopBar>
      <PageLayoutContent containerClassName="py-4">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Mode description */}
          {mode === 'edit' && (
            <div className="border border-warning-200 bg-warning-50 p-4">
              <p className="text-xs font-medium text-warning-800">
                Reshare Request
              </p>
              <p className="mt-1 text-xs text-warning-700">
                Modifying signers or threshold requires approval from existing
                vault signers. Once submitted, all current signers will be
                notified to approve this change.
              </p>
            </div>
          )}

          {/* Vault Name */}
          <div className="border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-4 py-3">
              <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                Vault Name
              </h2>
            </div>
            <div className="p-4">
              {mode === 'create' ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter vault name"
                  data-testid="vault-name-input"
                  className="h-9 w-full border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                />
              ) : (
                <div>
                  <p className="text-sm font-medium text-neutral-900">{name}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Vault name cannot be changed during reshare
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Linked Identity (Optional) */}
          <div className="border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-4 py-3">
              <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                Linked Identity
              </h2>
              <p className="mt-0.5 text-[11px] text-neutral-500">
                Optionally associate this vault with a counterparty identity
              </p>
            </div>
            <div className="p-4">
              {selectedIdentity ? (
                <div className="flex items-center justify-between border border-neutral-200 bg-neutral-50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center bg-neutral-200">
                      {isCorporateIdentity(selectedIdentity) ? (
                        <BuildingIcon className="size-4 text-neutral-600" />
                      ) : (
                        <UserIcon className="size-4 text-neutral-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        {selectedIdentity.name}
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        {isCorporateIdentity(selectedIdentity)
                          ? 'Corporate'
                          : 'Individual'}{' '}
                        · {selectedIdentity.kycStatus}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedIdentityId(undefined)}
                    className="flex size-6 items-center justify-center text-neutral-400 hover:text-neutral-600"
                  >
                    <XIcon className="size-4" />
                  </button>
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex h-9 w-full items-center justify-between border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-500 hover:border-neutral-300"
                    >
                      <span>Select an identity (optional)</span>
                      <ChevronDownIcon className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="max-h-64 w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto rounded-none p-0"
                  >
                    {allIdentities.map((identity) => (
                      <DropdownMenuItem
                        key={identity.id}
                        onClick={() => setSelectedIdentityId(identity.id)}
                        className="cursor-pointer rounded-none px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          {isCorporateIdentity(identity) ? (
                            <BuildingIcon className="size-4 text-neutral-500" />
                          ) : (
                            <UserIcon className="size-4 text-neutral-500" />
                          )}
                          <div className="flex-1">
                            <p className="text-xs font-medium text-neutral-900">
                              {identity.name}
                            </p>
                            <p className="text-[10px] text-neutral-500">
                              {isCorporateIdentity(identity)
                                ? 'Corporate'
                                : 'Individual'}{' '}
                              · {identity.kycStatus}
                            </p>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Allow Derived Addresses (Create mode only) */}
          {mode === 'create' && (
            <div className="border border-neutral-200 bg-white">
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                    Allow Derived Addresses
                  </h2>
                  <p className="mt-0.5 text-[11px] text-neutral-500">
                    Enable generation of multiple addresses from this vault
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={allowDerivedAddresses}
                  onClick={() =>
                    setAllowDerivedAddresses(!allowDerivedAddresses)
                  }
                  className={cn(
                    'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none',
                    allowDerivedAddresses ? 'bg-brand-500' : 'bg-neutral-200'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none block size-4 rounded-full bg-white shadow-lg ring-0 transition-transform',
                      allowDerivedAddresses ? 'translate-x-4' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Threshold Section */}
          <div className="border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-4 py-3">
              <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                Signing Threshold
              </h2>
              <p className="mt-0.5 text-[11px] text-neutral-500">
                Minimum voting power required to sign transactions
              </p>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setThreshold((t) => Math.max(1, t - 1))}
                    disabled={threshold <= 1}
                    className={cn(
                      'flex size-8 items-center justify-center border border-neutral-200',
                      threshold <= 1
                        ? 'cursor-not-allowed bg-neutral-50 text-neutral-300'
                        : 'bg-white text-neutral-600 hover:bg-neutral-50'
                    )}
                  >
                    <MinusIcon className="size-4" />
                  </button>
                  <span className="inline-flex h-8 min-w-12 items-center justify-center border border-neutral-200 bg-neutral-50 px-3 font-mono text-sm font-semibold text-neutral-900 tabular-nums">
                    {threshold}
                  </span>
                  <button
                    type="button"
                    onClick={() => setThreshold((t) => t + 1)}
                    className="flex size-8 items-center justify-center border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                  >
                    <PlusIcon className="size-4" />
                  </button>
                </div>
                <div className="text-xs text-neutral-500">
                  {totalVotingPower > 0 ? (
                    threshold <= totalVotingPower ? (
                      <span className="text-positive-600">
                        <CheckIcon className="mr-1 inline-block size-3.5" />
                        Valid threshold ({threshold} of {totalVotingPower} total
                        voting power)
                      </span>
                    ) : (
                      <span className="text-warning-600">
                        Threshold exceeds current voting power - add more
                        signers
                      </span>
                    )
                  ) : (
                    <span>Select signers below to validate threshold</span>
                  )}
                </div>
              </div>
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
                  Select devices to participate in threshold signing
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="h-7 rounded-none bg-brand-500 px-3 text-xs font-medium text-white hover:bg-brand-600"
                    disabled={availableToAdd.length === 0}
                    data-testid="vault-add-signer-button"
                  >
                    <PlusIcon className="mr-1.5 size-3.5" />
                    Add Signer
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="max-h-64 w-64 overflow-y-auto rounded-none p-0"
                >
                  {availableToAdd.map((signer) => (
                    <DropdownMenuItem
                      key={signer.id}
                      onClick={() => handleAddSigner(signer)}
                      className="cursor-pointer rounded-none px-3 py-2"
                      data-testid={`vault-signer-option-${signer.id}`}
                    >
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(signer.deviceType)}
                        <div className="flex-1">
                          <p className="text-xs font-medium text-neutral-900">
                            {signer.name}
                          </p>
                          <p className="text-[10px] text-neutral-500">
                            {getDeviceLabel(signer.deviceType)} · {signer.owner}
                          </p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  {availableToAdd.length === 0 && (
                    <div className="px-3 py-4 text-center text-xs text-neutral-500">
                      No more signers available
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {selectedSigners.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-neutral-500">No signers added yet</p>
                <p className="mt-1 text-xs text-neutral-400">
                  Add at least one signer to create the vault
                </p>
              </div>
            ) : (
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
                    <th className="px-4 py-2 text-center font-medium text-neutral-500">
                      Voting Power
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-neutral-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {selectedSigners.map((signer) => (
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
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleVotingPowerChange(signer.id, -1)
                            }
                            disabled={signer.votingPower <= 1}
                            className={cn(
                              'flex size-6 items-center justify-center border border-neutral-200',
                              signer.votingPower <= 1
                                ? 'cursor-not-allowed bg-neutral-50 text-neutral-300'
                                : 'bg-white text-neutral-600 hover:bg-neutral-50'
                            )}
                          >
                            <MinusIcon className="size-3" />
                          </button>
                          <span className="inline-flex h-6 min-w-8 items-center justify-center border border-neutral-200 bg-neutral-50 px-2 font-mono text-[11px] font-semibold text-neutral-900 tabular-nums">
                            {signer.votingPower}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleVotingPowerChange(signer.id, 1)
                            }
                            className="flex size-6 items-center justify-center border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                          >
                            <PlusIcon className="size-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveSigner(signer.id)}
                          className="rounded p-1 text-neutral-400 hover:bg-negative-50 hover:text-negative-600"
                        >
                          <TrashIcon className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Summary row */}
            {selectedSigners.length > 0 && (
              <div className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50 px-4 py-2">
                <span className="text-xs text-neutral-600">
                  {selectedSigners.length}{' '}
                  {selectedSigners.length === 1 ? 'signer' : 'signers'}
                </span>
                <span className="text-xs font-medium text-neutral-900">
                  Total Voting Power: {totalVotingPower}
                </span>
              </div>
            )}
          </div>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};

// Create vault page component
export const PageVaultCreate = () => {
  return <VaultFormContent mode="create" />;
};

// Edit (reshare) vault page component
export const PageVaultEdit = () => {
  const { vaultId } = useParams({ from: '/_app/vaults/$vaultId/edit' });
  return <VaultFormContent mode="edit" vaultId={vaultId} />;
};
