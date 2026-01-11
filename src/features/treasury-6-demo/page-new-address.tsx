import { Link, useNavigate, useParams } from '@tanstack/react-router';
import {
  ArrowLeftIcon,
  CheckIcon,
  InfoIcon,
  PlusIcon,
  XIcon,
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
import { Input } from '@/components/ui/input';

import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/treasury-6';

import { type ChainId, chains } from './data/addresses';
import {
  allIdentities,
  type Identity,
  isCorporateIdentity,
} from './data/identities';
import { getVaultById } from './data/vaults';

type AddressType = 'root' | 'derived';

export const PageNewAddress = () => {
  const { vaultId } = useParams({
    from: '/_app/vaults/$vaultId/addresses/new',
  });
  const navigate = useNavigate();
  const vault = getVaultById(vaultId);

  const [selectedChains, setSelectedChains] = useState<ChainId[]>([]);
  const [addressType, setAddressType] = useState<AddressType>('root');
  const [alias, setAlias] = useState('');
  const [selectedIdentity, setSelectedIdentity] = useState<Identity | null>(
    null
  );
  const [derivationIndex, setDerivationIndex] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleChainToggle = (chainId: ChainId) => {
    setSelectedChains((prev) =>
      prev.includes(chainId)
        ? prev.filter((c) => c !== chainId)
        : [...prev, chainId]
    );
  };

  const handleSelectAllChains = () => {
    if (selectedChains.length === chains.length) {
      setSelectedChains([]);
    } else {
      setSelectedChains(chains.map((c) => c.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedChains.length === 0) {
      toast.error('Please select at least one chain');
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    toast.success(
      `${selectedChains.length} address${selectedChains.length > 1 ? 'es' : ''} created`,
      {
        description: `New ${addressType} addresses on ${vault.name}`,
      }
    );

    setIsSubmitting(false);
    navigate({ to: '/vaults/$vaultId/addresses', params: { vaultId } });
  };

  // Group chains by curve type
  const ecdsaChains = chains.filter((c) => c.curveType === 'ECDSA');
  const eddsaChains = chains.filter((c) => c.curveType === 'EdDSA');

  const getIdentityDisplayName = (identity: Identity) => {
    return identity.name;
  };

  return (
    <PageLayout>
      <PageLayoutTopBar>
        <div className="flex items-center gap-3">
          <Link
            to="/vaults/$vaultId/addresses"
            params={{ vaultId }}
            className="flex size-6 items-center justify-center text-neutral-400 hover:text-neutral-900"
          >
            <ArrowLeftIcon className="size-4" />
          </Link>
          <PageLayoutTopBarTitle>New Address</PageLayoutTopBarTitle>
          <span className="text-sm text-neutral-400">/ {vault.name}</span>
        </div>
      </PageLayoutTopBar>

      <PageLayoutContent containerClassName="py-6">
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-8">
          {/* Chain Selection */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">
                  Select Chains
                </h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Choose which blockchain networks to create addresses on
                </p>
              </div>
              <button
                type="button"
                onClick={handleSelectAllChains}
                className="text-xs font-medium text-neutral-600 hover:text-neutral-900"
              >
                {selectedChains.length === chains.length
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
            </div>

            <div className="p-6">
              {/* ECDSA Chains */}
              <div className="mb-6">
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
                    ECDSA Chains
                  </h3>
                  <div className="group relative">
                    <InfoIcon className="size-3 text-neutral-400" />
                    <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden w-48 -translate-x-1/2 rounded bg-neutral-900 p-2 text-[10px] text-white group-hover:block">
                      ECDSA (Elliptic Curve Digital Signature Algorithm) is used
                      by Bitcoin, Ethereum, and most EVM-compatible chains.
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {ecdsaChains.map((chain) => {
                    const isSelected = selectedChains.includes(chain.id);
                    return (
                      <button
                        key={chain.id}
                        type="button"
                        onClick={() => handleChainToggle(chain.id)}
                        className={cn(
                          'flex items-center gap-3 border p-3 transition-all',
                          isSelected
                            ? 'border-neutral-900 bg-neutral-900'
                            : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50'
                        )}
                      >
                        <div
                          className="flex size-8 items-center justify-center rounded-full"
                          style={{
                            backgroundColor: isSelected
                              ? 'white'
                              : `${chain.color}15`,
                          }}
                        >
                          {isSelected ? (
                            <CheckIcon className="size-4 text-neutral-900" />
                          ) : (
                            <span
                              className="text-xs font-bold"
                              style={{ color: chain.color }}
                            >
                              {chain.symbol.slice(0, 2)}
                            </span>
                          )}
                        </div>
                        <div className="text-left">
                          <p
                            className={cn(
                              'text-sm font-medium',
                              isSelected ? 'text-white' : 'text-neutral-900'
                            )}
                          >
                            {chain.name}
                          </p>
                          <p
                            className={cn(
                              'text-[10px]',
                              isSelected
                                ? 'text-neutral-400'
                                : 'text-neutral-500'
                            )}
                          >
                            {chain.symbol}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* EdDSA Chains */}
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
                    EdDSA Chains
                  </h3>
                  <div className="group relative">
                    <InfoIcon className="size-3 text-neutral-400" />
                    <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden w-48 -translate-x-1/2 rounded bg-neutral-900 p-2 text-[10px] text-white group-hover:block">
                      EdDSA (Edwards-curve Digital Signature Algorithm) is used
                      by Solana, XRP Ledger, and other modern chains.
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {eddsaChains.map((chain) => {
                    const isSelected = selectedChains.includes(chain.id);
                    return (
                      <button
                        key={chain.id}
                        type="button"
                        onClick={() => handleChainToggle(chain.id)}
                        className={cn(
                          'flex items-center gap-3 border p-3 transition-all',
                          isSelected
                            ? 'border-neutral-900 bg-neutral-900'
                            : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50'
                        )}
                      >
                        <div
                          className="flex size-8 items-center justify-center rounded-full"
                          style={{
                            backgroundColor: isSelected
                              ? 'white'
                              : `${chain.color}15`,
                          }}
                        >
                          {isSelected ? (
                            <CheckIcon className="size-4 text-neutral-900" />
                          ) : (
                            <span
                              className="text-xs font-bold"
                              style={{ color: chain.color }}
                            >
                              {chain.symbol.slice(0, 2)}
                            </span>
                          )}
                        </div>
                        <div className="text-left">
                          <p
                            className={cn(
                              'text-sm font-medium',
                              isSelected ? 'text-white' : 'text-neutral-900'
                            )}
                          >
                            {chain.name}
                          </p>
                          <p
                            className={cn(
                              'text-[10px]',
                              isSelected
                                ? 'text-neutral-400'
                                : 'text-neutral-500'
                            )}
                          >
                            {chain.symbol}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {selectedChains.length > 0 && (
              <div className="border-t border-neutral-200 px-6 py-3">
                <div className="flex flex-wrap gap-2">
                  {selectedChains.map((chainId) => {
                    const chain = chains.find((c) => c.id === chainId)!;
                    return (
                      <span
                        key={chainId}
                        className="inline-flex items-center gap-1 rounded-full bg-neutral-100 py-1 pr-1 pl-2 text-xs font-medium text-neutral-700"
                      >
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: chain.color }}
                        />
                        {chain.name}
                        <button
                          type="button"
                          onClick={() => handleChainToggle(chainId)}
                          className="ml-1 rounded-full p-0.5 hover:bg-neutral-200"
                        >
                          <XIcon className="size-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Address Type */}
          <div className="border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-6 py-4">
              <h2 className="text-sm font-semibold text-neutral-900">
                Address Type
              </h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                Choose how the address will be derived from the vault
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 p-6">
              <button
                type="button"
                onClick={() => setAddressType('root')}
                className={cn(
                  'border p-4 text-left transition-all',
                  addressType === 'root'
                    ? 'border-neutral-900 bg-neutral-50'
                    : 'border-neutral-200 hover:border-neutral-300'
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'flex size-5 items-center justify-center rounded-full border-2',
                      addressType === 'root'
                        ? 'border-neutral-900 bg-neutral-900'
                        : 'border-neutral-300'
                    )}
                  >
                    {addressType === 'root' && (
                      <CheckIcon className="size-3 text-white" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-neutral-900">
                    Root Address
                  </span>
                </div>
                <p className="mt-2 text-xs text-neutral-500">
                  The primary address derived directly from the vault's master
                  key. Best for main treasury operations.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setAddressType('derived')}
                className={cn(
                  'border p-4 text-left transition-all',
                  addressType === 'derived'
                    ? 'border-neutral-900 bg-neutral-50'
                    : 'border-neutral-200 hover:border-neutral-300'
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'flex size-5 items-center justify-center rounded-full border-2',
                      addressType === 'derived'
                        ? 'border-neutral-900 bg-neutral-900'
                        : 'border-neutral-300'
                    )}
                  >
                    {addressType === 'derived' && (
                      <CheckIcon className="size-3 text-white" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-neutral-900">
                    HD Derived
                  </span>
                </div>
                <p className="mt-2 text-xs text-neutral-500">
                  Hierarchical deterministic address with a unique derivation
                  path. Ideal for segregating funds.
                </p>
              </button>
            </div>

            {addressType === 'derived' && (
              <div className="border-t border-neutral-200 px-6 py-4">
                <label
                  htmlFor="derivation"
                  className="text-xs font-medium text-neutral-700"
                >
                  Derivation Index
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <code className="text-xs text-neutral-500">
                    m/44'/60'/0'/0/
                  </code>
                  <input
                    id="derivation"
                    type="number"
                    min="0"
                    value={derivationIndex}
                    onChange={(e) => setDerivationIndex(e.target.value)}
                    className="h-8 w-20 border border-neutral-200 bg-white text-center font-mono text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                  />
                </div>
                <p className="mt-1 text-[10px] text-neutral-400">
                  The index determines the unique derivation path for this
                  address
                </p>
              </div>
            )}
          </div>

          {/* Optional Details */}
          <div className="border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-6 py-4">
              <h2 className="text-sm font-semibold text-neutral-900">
                Optional Details
              </h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                Add an alias and link to an identity for better organization
              </p>
            </div>

            <div className="space-y-4 p-6">
              <div className="space-y-2">
                <label
                  htmlFor="alias"
                  className="text-xs font-medium text-neutral-700"
                >
                  Alias{' '}
                  <span className="font-normal text-neutral-400">
                    (optional)
                  </span>
                </label>
                <Input
                  id="alias"
                  type="text"
                  placeholder="e.g., Treasury Operations, Cold Storage"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  className="h-10 rounded-none border-neutral-200 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-700">
                  Linked Identity{' '}
                  <span className="font-normal text-neutral-400">
                    (optional)
                  </span>
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex h-10 w-full items-center justify-between border border-neutral-200 bg-white px-3 text-sm hover:bg-neutral-50"
                    >
                      {selectedIdentity ? (
                        <span className="text-neutral-900">
                          {getIdentityDisplayName(selectedIdentity)}
                        </span>
                      ) : (
                        <span className="text-neutral-500">
                          Select an identity
                        </span>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-full min-w-[400px] rounded-none p-0"
                  >
                    <DropdownMenuItem
                      onClick={() => setSelectedIdentity(null)}
                      className="rounded-none px-3 py-2 text-xs text-neutral-500"
                    >
                      No identity
                    </DropdownMenuItem>
                    {allIdentities.map((identity) => (
                      <DropdownMenuItem
                        key={identity.id}
                        onClick={() => setSelectedIdentity(identity)}
                        className="flex items-center justify-between rounded-none px-3 py-2 text-xs"
                      >
                        <span className="text-neutral-900">
                          {getIdentityDisplayName(identity)}
                        </span>
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 text-[10px] font-medium',
                            isCorporateIdentity(identity)
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-neutral-100 text-neutral-600'
                          )}
                        >
                          {isCorporateIdentity(identity)
                            ? 'Corporate'
                            : 'Individual'}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Summary & Actions */}
          <div className="border border-neutral-200 bg-neutral-50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  Creating {selectedChains.length} {addressType} address
                  {selectedChains.length !== 1 ? 'es' : ''}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {selectedChains.length === 0
                    ? 'Select at least one chain to continue'
                    : `On ${vault.name} vault`}
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  asChild
                  variant="secondary"
                  className="h-9 rounded-none border-neutral-200 px-4 text-xs font-medium"
                >
                  <Link to="/vaults/$vaultId/addresses" params={{ vaultId }}>
                    Cancel
                  </Link>
                </Button>
                <Button
                  type="submit"
                  disabled={selectedChains.length === 0 || isSubmitting}
                  className="h-9 rounded-none bg-brand-500 px-4 text-xs font-medium text-white hover:bg-brand-600 disabled:bg-neutral-300"
                >
                  {isSubmitting ? (
                    'Creating...'
                  ) : (
                    <>
                      <PlusIcon className="mr-1.5 size-3.5" />
                      Create Address{selectedChains.length > 1 ? 'es' : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </PageLayoutContent>
    </PageLayout>
  );
};
