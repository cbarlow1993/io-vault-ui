import { Link, useNavigate, useParams } from '@tanstack/react-router';
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  GlobeIcon,
  PlusIcon,
  TrashIcon,
  VaultIcon,
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
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/treasury-6';

import {
  getWhitelistById,
  type WhitelistEntry,
  type WhitelistEntryType,
} from './data/whitelists';

type FormWhitelistEntry = Omit<WhitelistEntry, 'addedAt' | 'addedBy'> & {
  isNew?: boolean;
};

// Select component
type SelectOption = { id: string; label: string };

const FormSelect = <T extends SelectOption>({
  options,
  value,
  onChange,
  placeholder,
  className,
}: {
  options: readonly T[];
  value: T | null;
  onChange: (value: T) => void;
  placeholder?: string;
  className?: string;
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-9 items-center justify-between gap-2 border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 hover:bg-neutral-100 focus:border-neutral-400 focus:outline-none',
            !value && 'text-neutral-400',
            className
          )}
        >
          <span className="truncate">
            {value?.label ?? placeholder ?? 'Select...'}
          </span>
          <ChevronDownIcon className="size-4 shrink-0 text-neutral-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[200px] rounded-none p-0"
      >
        {options.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={() => onChange(option)}
            className="flex cursor-pointer items-center justify-between gap-2 rounded-none px-3 py-2 text-sm"
          >
            <span>{option.label}</span>
            {value?.id === option.id && (
              <CheckIcon className="size-4 text-neutral-900" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const TYPE_OPTIONS: SelectOption[] = [
  { id: 'global', label: 'Global' },
  { id: 'vault-specific', label: 'Vault-Specific' },
];

const ENTRY_TYPE_OPTIONS: SelectOption[] = [
  { id: 'address', label: 'Address' },
  { id: 'entity', label: 'Entity' },
  { id: 'contract', label: 'Contract' },
];

const CHAIN_OPTIONS: SelectOption[] = [
  { id: 'Ethereum', label: 'Ethereum' },
  { id: 'Bitcoin', label: 'Bitcoin' },
  { id: 'Polygon', label: 'Polygon' },
  { id: 'Solana', label: 'Solana' },
  { id: 'Arbitrum', label: 'Arbitrum' },
  { id: 'Optimism', label: 'Optimism' },
  { id: 'Base', label: 'Base' },
  { id: 'Avalanche', label: 'Avalanche' },
];

// Mock vaults for selection
const VAULT_OPTIONS: SelectOption[] = [
  { id: 'vault-1', label: 'Treasury Operations' },
  { id: 'vault-2', label: 'Trading Vault' },
  { id: 'vault-3', label: 'Cold Storage' },
  { id: 'vault-4', label: 'DeFi Operations' },
];

type WhitelistFormProps = {
  mode: 'create' | 'edit';
  whitelistId?: string;
};

const WhitelistFormContent = ({ mode, whitelistId }: WhitelistFormProps) => {
  const navigate = useNavigate();
  const existingWhitelist = whitelistId
    ? getWhitelistById(whitelistId)
    : undefined;

  // Determine initial type
  const initialType = existingWhitelist?.type ?? 'global';
  const initialTypeOption =
    TYPE_OPTIONS.find((o) => o.id === initialType) ?? TYPE_OPTIONS[0]!;

  // Form state
  const [typeOption, setTypeOption] = useState<SelectOption>(initialTypeOption);
  const whitelistType = typeOption.id as 'global' | 'vault-specific';

  const [name, setName] = useState(existingWhitelist?.name ?? '');
  const [description, setDescription] = useState(
    existingWhitelist?.description ?? ''
  );

  // Vault selection for vault-specific whitelists
  const [vaultId, setVaultId] = useState(existingWhitelist?.vaultId ?? '');
  const selectedVault = useMemo(() => {
    return VAULT_OPTIONS.find((v) => v.id === vaultId) ?? null;
  }, [vaultId]);

  // Entries
  const [entries, setEntries] = useState<FormWhitelistEntry[]>(
    existingWhitelist?.entries.map((e) => ({ ...e, isNew: false })) ?? []
  );

  // Validation
  const isValid = useMemo(() => {
    if (!name.trim()) return false;
    if (whitelistType === 'vault-specific' && !vaultId) return false;
    return true;
  }, [name, whitelistType, vaultId]);

  // Entry handlers
  const handleAddEntry = () => {
    const newEntry: FormWhitelistEntry = {
      id: `new-entry-${Date.now()}`,
      address: '',
      label: '',
      chain: 'Ethereum',
      type: 'address',
      isNew: true,
    };
    setEntries((prev) => [...prev, newEntry]);
  };

  const handleRemoveEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleEntryChange = (
    id: string,
    field: keyof FormWhitelistEntry,
    value: string
  ) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const handleSubmit = () => {
    const formData = {
      name,
      description: description || undefined,
      type: whitelistType,
      ...(whitelistType === 'vault-specific' && {
        vaultId,
        vaultName: selectedVault?.label,
      }),
      entries: entries.map(({ isNew, ...entry }) => entry),
    };
    console.log('Submitting whitelist:', formData);

    if (mode === 'edit' && whitelistId) {
      navigate({
        to: '/policies/whitelists/$whitelistId',
        params: { whitelistId },
      });
    } else {
      navigate({ to: '/policies/whitelists' });
    }
  };

  const handleCancel = () => {
    if (mode === 'edit' && whitelistId) {
      navigate({
        to: '/policies/whitelists/$whitelistId',
        params: { whitelistId },
      });
    } else {
      navigate({ to: '/policies/whitelists' });
    }
  };

  if (mode === 'edit' && !existingWhitelist) {
    return (
      <PageLayout>
        <PageLayoutTopBar title="Whitelist Not Found" />
        <PageLayoutContent containerClassName="py-8">
          <div className="text-center">
            <p className="text-neutral-500">
              The requested whitelist could not be found.
            </p>
            <Link
              to="/policies/whitelists"
              className="mt-4 inline-flex items-center gap-2 text-sm text-neutral-900 hover:underline"
            >
              <ArrowLeftIcon className="size-4" />
              Back to Whitelists
            </Link>
          </div>
        </PageLayoutContent>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageLayoutTopBar>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="flex size-6 items-center justify-center text-neutral-400 hover:text-neutral-900"
          >
            <ArrowLeftIcon className="size-4" />
          </button>
          <PageLayoutTopBarTitle>
            {mode === 'create' ? 'Create Whitelist' : 'Edit Whitelist'}
          </PageLayoutTopBarTitle>
        </div>
      </PageLayoutTopBar>
      <PageLayoutContent containerClassName="py-4">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Whitelist Type */}
          <div className="border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-4 py-3">
              <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                Whitelist Scope
              </h2>
            </div>
            <div className="p-4">
              {mode === 'create' ? (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setTypeOption(TYPE_OPTIONS[0]!);
                      setVaultId('');
                    }}
                    className={cn(
                      'flex flex-1 items-center gap-3 border p-4',
                      whitelistType === 'global'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-neutral-200 bg-white hover:bg-neutral-50'
                    )}
                  >
                    <div
                      className={cn(
                        'flex size-10 items-center justify-center rounded-full',
                        whitelistType === 'global'
                          ? 'bg-blue-100'
                          : 'bg-neutral-100'
                      )}
                    >
                      <GlobeIcon
                        className={cn(
                          'size-5',
                          whitelistType === 'global'
                            ? 'text-blue-600'
                            : 'text-neutral-500'
                        )}
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <p
                        className={cn(
                          'text-sm font-medium',
                          whitelistType === 'global'
                            ? 'text-blue-900'
                            : 'text-neutral-900'
                        )}
                      >
                        Global
                      </p>
                      <p className="text-xs text-neutral-500">
                        Applies to all vaults organization-wide
                      </p>
                    </div>
                    {whitelistType === 'global' && (
                      <CheckIcon className="text-blue-600 size-5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeOption(TYPE_OPTIONS[1]!)}
                    className={cn(
                      'flex flex-1 items-center gap-3 border p-4',
                      whitelistType === 'vault-specific'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-neutral-200 bg-white hover:bg-neutral-50'
                    )}
                  >
                    <div
                      className={cn(
                        'flex size-10 items-center justify-center rounded-full',
                        whitelistType === 'vault-specific'
                          ? 'bg-purple-100'
                          : 'bg-neutral-100'
                      )}
                    >
                      <VaultIcon
                        className={cn(
                          'size-5',
                          whitelistType === 'vault-specific'
                            ? 'text-purple-600'
                            : 'text-neutral-500'
                        )}
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <p
                        className={cn(
                          'text-sm font-medium',
                          whitelistType === 'vault-specific'
                            ? 'text-purple-900'
                            : 'text-neutral-900'
                        )}
                      >
                        Vault-Specific
                      </p>
                      <p className="text-xs text-neutral-500">
                        Applies to a specific vault only
                      </p>
                    </div>
                    {whitelistType === 'vault-specific' && (
                      <CheckIcon className="text-purple-600 size-5" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex size-8 items-center justify-center rounded-full',
                      whitelistType === 'global'
                        ? 'bg-blue-100'
                        : 'bg-purple-100'
                    )}
                  >
                    {whitelistType === 'global' ? (
                      <GlobeIcon className="text-blue-600 size-4" />
                    ) : (
                      <VaultIcon className="text-purple-600 size-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      {whitelistType === 'global' ? 'Global' : 'Vault-Specific'}
                    </p>
                    <p className="text-xs text-neutral-500">
                      Whitelist scope cannot be changed
                    </p>
                  </div>
                </div>
              )}

              {/* Vault selection for vault-specific type */}
              {whitelistType === 'vault-specific' && mode === 'create' && (
                <div className="mt-4 border-t border-neutral-100 pt-4">
                  <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                    Select Vault *
                  </label>
                  <FormSelect
                    options={VAULT_OPTIONS}
                    value={selectedVault}
                    onChange={(opt) => setVaultId(opt.id)}
                    placeholder="Select a vault..."
                    className="w-full"
                  />
                </div>
              )}

              {/* Show linked vault for edit mode */}
              {whitelistType === 'vault-specific' &&
                mode === 'edit' &&
                existingWhitelist?.vaultName && (
                  <div className="mt-4 border-t border-neutral-100 pt-4">
                    <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                      Linked Vault
                    </label>
                    <div className="flex h-9 items-center border border-neutral-100 bg-neutral-50 px-3 text-sm text-neutral-700">
                      {existingWhitelist.vaultName}
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">
                      Vault assignment cannot be changed
                    </p>
                  </div>
                )}
            </div>
          </div>

          {/* Basic Information */}
          <div className="border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-4 py-3">
              <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                Basic Information
              </h2>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                  Whitelist Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter a descriptive name"
                  className="h-9 w-full border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the purpose of this whitelist"
                  rows={3}
                  className="w-full resize-none border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Whitelist Entries */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
              <div>
                <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                  Whitelisted Addresses
                </h2>
                <p className="mt-0.5 text-[11px] text-neutral-500">
                  Add addresses that are approved for transactions
                </p>
              </div>
              <Button
                type="button"
                onClick={handleAddEntry}
                className="h-7 rounded-none bg-brand-500 px-3 text-xs font-medium text-white hover:bg-brand-600"
              >
                <PlusIcon className="mr-1.5 size-3.5" />
                Add Entry
              </Button>
            </div>
            {entries.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-neutral-500">No entries added</p>
                <p className="mt-1 text-xs text-neutral-400">
                  Click "Add Entry" to add whitelisted addresses
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {entries.map((entry, index) => {
                  const isEditable = entry.isNew === true;

                  return (
                    <div key={entry.id} className="p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-neutral-700">
                            Entry {index + 1}
                          </span>
                          {!isEditable && (
                            <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500">
                              Existing
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveEntry(entry.id)}
                          className="rounded p-1 text-neutral-400 hover:bg-negative-50 hover:text-negative-600"
                        >
                          <TrashIcon className="size-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-[11px] text-neutral-500">
                            Label
                          </label>
                          {isEditable ? (
                            <input
                              type="text"
                              value={entry.label}
                              onChange={(e) =>
                                handleEntryChange(
                                  entry.id,
                                  'label',
                                  e.target.value
                                )
                              }
                              placeholder="e.g., Coinbase Custody"
                              className="h-8 w-full border border-neutral-200 bg-neutral-50 px-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                            />
                          ) : (
                            <div className="flex h-8 items-center border border-neutral-100 bg-neutral-50 px-2 text-xs text-neutral-700">
                              {entry.label || '—'}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] text-neutral-500">
                            Type
                          </label>
                          {isEditable ? (
                            <FormSelect
                              options={ENTRY_TYPE_OPTIONS}
                              value={
                                ENTRY_TYPE_OPTIONS.find(
                                  (t) => t.id === entry.type
                                ) ?? null
                              }
                              onChange={(opt) =>
                                handleEntryChange(
                                  entry.id,
                                  'type',
                                  opt.id as WhitelistEntryType
                                )
                              }
                              className="h-8 w-full text-xs"
                            />
                          ) : (
                            <div className="flex h-8 items-center border border-neutral-100 bg-neutral-50 px-2 text-xs text-neutral-700 capitalize">
                              {entry.type}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] text-neutral-500">
                            Chain
                          </label>
                          {isEditable ? (
                            <FormSelect
                              options={CHAIN_OPTIONS}
                              value={
                                CHAIN_OPTIONS.find(
                                  (c) => c.id === entry.chain
                                ) ?? null
                              }
                              onChange={(opt) =>
                                handleEntryChange(entry.id, 'chain', opt.id)
                              }
                              className="h-8 w-full text-xs"
                            />
                          ) : (
                            <div className="flex h-8 items-center border border-neutral-100 bg-neutral-50 px-2 text-xs text-neutral-700">
                              {entry.chain}
                            </div>
                          )}
                        </div>
                        <div className="col-span-2">
                          <label className="mb-1 block text-[11px] text-neutral-500">
                            Address
                          </label>
                          {isEditable ? (
                            <input
                              type="text"
                              value={entry.address}
                              onChange={(e) =>
                                handleEntryChange(
                                  entry.id,
                                  'address',
                                  e.target.value
                                )
                              }
                              placeholder="0x..."
                              className="h-8 w-full border border-neutral-200 bg-neutral-50 px-2 font-mono text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                            />
                          ) : (
                            <div className="flex h-8 items-center border border-neutral-100 bg-neutral-50 px-2 font-mono text-xs text-neutral-700">
                              {entry.address}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-neutral-200 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              className="h-9 rounded-none border-neutral-300 px-4 text-sm font-medium"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!isValid}
              className={cn(
                'h-9 rounded-none px-4 text-sm font-medium',
                isValid
                  ? 'bg-brand-500 text-white hover:bg-brand-600'
                  : 'cursor-not-allowed bg-neutral-200 text-neutral-400'
              )}
            >
              {mode === 'create' ? 'Create Whitelist' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};

// Create whitelist page component
export const PageWhitelistCreate = () => {
  return <WhitelistFormContent mode="create" />;
};

// Edit whitelist page component
export const PageWhitelistEdit = () => {
  const { whitelistId } = useParams({
    from: '/_app/policies/whitelists/$whitelistId/edit',
  });
  return <WhitelistFormContent mode="edit" whitelistId={whitelistId} />;
};
