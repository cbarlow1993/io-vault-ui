import { Link, useNavigate, useParams } from '@tanstack/react-router';
import {
  ArrowLeftIcon,
  BuildingIcon,
  CheckIcon,
  ChevronDownIcon,
  PlusIcon,
  TrashIcon,
  UserIcon,
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
  NotificationButton,
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/treasury-6';

import {
  allIdentities,
  getIdentityById,
  isCorporateIdentity,
  isIndividualIdentity,
  type BankAccount,
  type IdentityType,
  type WalletAddress,
} from './data/identities';

type FormBankAccount = Omit<BankAccount, 'id'> & { id: string };
type FormWalletAddress = Omit<WalletAddress, 'id'> & { id: string };

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
  { id: 'corporate', label: 'Corporate' },
  { id: 'individual', label: 'Individual' },
];

const CURRENCY_OPTIONS: SelectOption[] = [
  { id: 'USD', label: 'USD' },
  { id: 'EUR', label: 'EUR' },
  { id: 'GBP', label: 'GBP' },
  { id: 'CHF', label: 'CHF' },
  { id: 'SGD', label: 'SGD' },
  { id: 'HKD', label: 'HKD' },
];

const CHAIN_OPTIONS: SelectOption[] = [
  { id: 'Ethereum', label: 'Ethereum' },
  { id: 'Bitcoin', label: 'Bitcoin' },
  { id: 'Polygon', label: 'Polygon' },
  { id: 'Solana', label: 'Solana' },
];

type IdentityFormProps = {
  mode: 'create' | 'edit';
  identityId?: string;
};

const IdentityFormContent = ({ mode, identityId }: IdentityFormProps) => {
  const navigate = useNavigate();
  const existingIdentity = identityId ? getIdentityById(identityId) : undefined;

  // Determine initial type
  const initialType: IdentityType = existingIdentity?.type ?? 'corporate';
  const initialTypeOption =
    TYPE_OPTIONS.find((o) => o.id === initialType) ?? TYPE_OPTIONS[0]!;

  // Form state
  const [typeOption, setTypeOption] = useState<SelectOption>(initialTypeOption);
  const type = typeOption.id as IdentityType;

  const [name, setName] = useState(existingIdentity?.name ?? '');
  const [displayName, setDisplayName] = useState(
    existingIdentity?.displayName ?? ''
  );

  // Corporate-specific
  const [registrationNumber, setRegistrationNumber] = useState(
    existingIdentity && isCorporateIdentity(existingIdentity)
      ? (existingIdentity.registrationNumber ?? '')
      : ''
  );
  const [jurisdiction, setJurisdiction] = useState(
    existingIdentity && isCorporateIdentity(existingIdentity)
      ? (existingIdentity.jurisdiction ?? '')
      : ''
  );

  // Individual-specific
  const [role, setRole] = useState(
    existingIdentity && isIndividualIdentity(existingIdentity)
      ? (existingIdentity.role ?? '')
      : ''
  );
  const [email, setEmail] = useState(
    existingIdentity && isIndividualIdentity(existingIdentity)
      ? (existingIdentity.email ?? '')
      : ''
  );
  const [phone, setPhone] = useState(
    existingIdentity && isIndividualIdentity(existingIdentity)
      ? (existingIdentity.phone ?? '')
      : ''
  );
  const [linkedCorporateId, setLinkedCorporateId] = useState(
    existingIdentity && isIndividualIdentity(existingIdentity)
      ? (existingIdentity.linkedCorporateId ?? '')
      : ''
  );

  // Bank accounts
  const [bankAccounts, setBankAccounts] = useState<FormBankAccount[]>(
    existingIdentity?.bankAccounts ?? []
  );

  // Wallet addresses
  const [walletAddresses, setWalletAddresses] = useState<FormWalletAddress[]>(
    existingIdentity?.walletAddresses ?? []
  );

  // Available corporates for linking (only for individual type)
  const availableCorporates = useMemo(() => {
    return allIdentities
      .filter((i) => i.type === 'corporate')
      .map((c) => ({
        id: c.id,
        label: c.displayName ?? c.name,
      }));
  }, []);

  const linkedCorporateOption = useMemo(() => {
    if (!linkedCorporateId) return null;
    return availableCorporates.find((c) => c.id === linkedCorporateId) ?? null;
  }, [linkedCorporateId, availableCorporates]);

  // Validation
  const isValid = useMemo(() => {
    if (!name.trim()) return false;
    return true;
  }, [name]);

  // Bank account handlers
  const handleAddBankAccount = () => {
    const newAccount: FormBankAccount = {
      id: `new-bank-${Date.now()}`,
      bankName: '',
      accountName: '',
      accountNumber: '',
      currency: 'USD',
    };
    setBankAccounts((prev) => [...prev, newAccount]);
  };

  const handleRemoveBankAccount = (id: string) => {
    setBankAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleBankAccountChange = (
    id: string,
    field: keyof FormBankAccount,
    value: string
  ) => {
    setBankAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  // Wallet address handlers
  const handleAddWalletAddress = () => {
    const newWallet: FormWalletAddress = {
      id: `new-wallet-${Date.now()}`,
      label: '',
      address: '',
      chain: 'Ethereum',
      addedAt: new Date().toISOString().split('T')[0]!,
    };
    setWalletAddresses((prev) => [...prev, newWallet]);
  };

  const handleRemoveWalletAddress = (id: string) => {
    setWalletAddresses((prev) => prev.filter((w) => w.id !== id));
  };

  const handleWalletAddressChange = (
    id: string,
    field: keyof FormWalletAddress,
    value: string
  ) => {
    setWalletAddresses((prev) =>
      prev.map((w) => (w.id === id ? { ...w, [field]: value } : w))
    );
  };

  const handleSubmit = () => {
    const formData = {
      type,
      name,
      displayName: displayName || undefined,
      ...(type === 'corporate' && {
        registrationNumber: registrationNumber || undefined,
        jurisdiction: jurisdiction || undefined,
      }),
      ...(type === 'individual' && {
        role: role || undefined,
        email: email || undefined,
        phone: phone || undefined,
        linkedCorporateId: linkedCorporateId || undefined,
      }),
      bankAccounts,
      walletAddresses,
    };
    console.log('Submitting identity:', formData);

    if (mode === 'edit' && identityId) {
      navigate({ to: '/identities/$identityId', params: { identityId } });
    } else {
      navigate({ to: '/identities' });
    }
  };

  const handleCancel = () => {
    if (mode === 'edit' && identityId) {
      navigate({ to: '/identities/$identityId', params: { identityId } });
    } else {
      navigate({ to: '/identities' });
    }
  };

  if (mode === 'edit' && !existingIdentity) {
    return (
      <PageLayout>
        <PageLayoutTopBar>
          <PageLayoutTopBarTitle>Identity Not Found</PageLayoutTopBarTitle>
        </PageLayoutTopBar>
        <PageLayoutContent containerClassName="py-8">
          <div className="text-center">
            <p className="text-neutral-500">
              The requested identity could not be found.
            </p>
            <Link
              to="/identities"
              className="mt-4 inline-flex items-center gap-2 text-sm text-neutral-900 hover:underline"
            >
              <ArrowLeftIcon className="size-4" />
              Back to Identities
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
            <div className="h-4 w-px bg-neutral-200" />
            <NotificationButton />
          </div>
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
            {mode === 'create' ? 'Add Identity' : 'Edit Identity'}
          </PageLayoutTopBarTitle>
        </div>
      </PageLayoutTopBar>
      <PageLayoutContent containerClassName="py-4">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Identity Type */}
          <div className="border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-4 py-3">
              <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                Identity Type
              </h2>
            </div>
            <div className="p-4">
              {mode === 'create' ? (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setTypeOption(TYPE_OPTIONS[0]!)}
                    className={cn(
                      'flex flex-1 items-center gap-3 border p-4',
                      type === 'corporate'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-neutral-200 bg-white hover:bg-neutral-50'
                    )}
                  >
                    <div
                      className={cn(
                        'flex size-10 items-center justify-center rounded-full',
                        type === 'corporate' ? 'bg-blue-100' : 'bg-neutral-100'
                      )}
                    >
                      <BuildingIcon
                        className={cn(
                          'size-5',
                          type === 'corporate'
                            ? 'text-blue-600'
                            : 'text-neutral-500'
                        )}
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <p
                        className={cn(
                          'text-sm font-medium',
                          type === 'corporate'
                            ? 'text-blue-900'
                            : 'text-neutral-900'
                        )}
                      >
                        Corporate
                      </p>
                      <p className="text-xs text-neutral-500">
                        Company, organization, or legal entity
                      </p>
                    </div>
                    {type === 'corporate' && (
                      <CheckIcon className="text-blue-600 size-5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeOption(TYPE_OPTIONS[1]!)}
                    className={cn(
                      'flex flex-1 items-center gap-3 border p-4',
                      type === 'individual'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-neutral-200 bg-white hover:bg-neutral-50'
                    )}
                  >
                    <div
                      className={cn(
                        'flex size-10 items-center justify-center rounded-full',
                        type === 'individual'
                          ? 'bg-purple-100'
                          : 'bg-neutral-100'
                      )}
                    >
                      <UserIcon
                        className={cn(
                          'size-5',
                          type === 'individual'
                            ? 'text-purple-600'
                            : 'text-neutral-500'
                        )}
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <p
                        className={cn(
                          'text-sm font-medium',
                          type === 'individual'
                            ? 'text-purple-900'
                            : 'text-neutral-900'
                        )}
                      >
                        Individual
                      </p>
                      <p className="text-xs text-neutral-500">
                        Person or natural individual
                      </p>
                    </div>
                    {type === 'individual' && (
                      <CheckIcon className="text-purple-600 size-5" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex size-8 items-center justify-center rounded-full',
                      type === 'corporate' ? 'bg-blue-100' : 'bg-purple-100'
                    )}
                  >
                    {type === 'corporate' ? (
                      <BuildingIcon className="text-blue-600 size-4" />
                    ) : (
                      <UserIcon className="text-purple-600 size-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 capitalize">
                      {type}
                    </p>
                    <p className="text-xs text-neutral-500">
                      Identity type cannot be changed
                    </p>
                  </div>
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
                  {type === 'corporate' ? 'Legal Name' : 'Full Name'} *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    type === 'corporate'
                      ? 'Enter legal company name'
                      : 'Enter full name'
                  }
                  className="h-9 w-full border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Short name for display (optional)"
                  className="h-9 w-full border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Corporate-specific fields */}
          {type === 'corporate' && (
            <div className="border border-neutral-200 bg-white">
              <div className="border-b border-neutral-200 px-4 py-3">
                <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                  Corporate Details
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-4 p-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    placeholder="e.g., DE-HRB-123456"
                    className="h-9 w-full border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                    Jurisdiction
                  </label>
                  <input
                    type="text"
                    value={jurisdiction}
                    onChange={(e) => setJurisdiction(e.target.value)}
                    placeholder="e.g., Germany"
                    className="h-9 w-full border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Individual-specific fields */}
          {type === 'individual' && (
            <div className="border border-neutral-200 bg-white">
              <div className="border-b border-neutral-200 px-4 py-3">
                <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                  Contact Details
                </h2>
              </div>
              <div className="space-y-4 p-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                    Role / Title
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g., Chief Financial Officer"
                    className="h-9 w-full border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="h-9 w-full border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 555 123 4567"
                      className="h-9 w-full border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                    Linked Organization
                  </label>
                  <FormSelect
                    options={[
                      { id: '', label: 'None' },
                      ...availableCorporates,
                    ]}
                    value={linkedCorporateOption ?? { id: '', label: 'None' }}
                    onChange={(opt) => setLinkedCorporateId(opt.id)}
                    placeholder="Select organization..."
                    className="w-full"
                  />
                  <p className="mt-1 text-xs text-neutral-500">
                    Link this individual to a corporate identity
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bank Accounts */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
              <div>
                <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                  Bank Accounts
                </h2>
                <p className="mt-0.5 text-[11px] text-neutral-500">
                  Add bank accounts for payment processing
                </p>
              </div>
              <Button
                type="button"
                onClick={handleAddBankAccount}
                className="h-7 rounded-none bg-brand-500 px-3 text-xs font-medium text-white hover:bg-brand-600"
              >
                <PlusIcon className="mr-1.5 size-3.5" />
                Add Account
              </Button>
            </div>
            {bankAccounts.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-neutral-500">
                  No bank accounts added
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  Click "Add Account" to add a bank account
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {bankAccounts.map((account, index) => (
                  <div key={account.id} className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-medium text-neutral-700">
                        Account {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBankAccount(account.id)}
                        className="rounded p-1 text-neutral-400 hover:bg-negative-50 hover:text-negative-600"
                      >
                        <TrashIcon className="size-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-[11px] text-neutral-500">
                          Bank Name
                        </label>
                        <input
                          type="text"
                          value={account.bankName}
                          onChange={(e) =>
                            handleBankAccountChange(
                              account.id,
                              'bankName',
                              e.target.value
                            )
                          }
                          placeholder="Bank name"
                          className="h-8 w-full border border-neutral-200 bg-neutral-50 px-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-neutral-500">
                          Account Name
                        </label>
                        <input
                          type="text"
                          value={account.accountName}
                          onChange={(e) =>
                            handleBankAccountChange(
                              account.id,
                              'accountName',
                              e.target.value
                            )
                          }
                          placeholder="Account holder name"
                          className="h-8 w-full border border-neutral-200 bg-neutral-50 px-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-neutral-500">
                          Account Number / IBAN
                        </label>
                        <input
                          type="text"
                          value={account.iban ?? account.accountNumber}
                          onChange={(e) =>
                            handleBankAccountChange(
                              account.id,
                              'accountNumber',
                              e.target.value
                            )
                          }
                          placeholder="Account number or IBAN"
                          className="h-8 w-full border border-neutral-200 bg-neutral-50 px-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-neutral-500">
                          SWIFT / BIC
                        </label>
                        <input
                          type="text"
                          value={account.swiftCode ?? ''}
                          onChange={(e) =>
                            handleBankAccountChange(
                              account.id,
                              'swiftCode',
                              e.target.value
                            )
                          }
                          placeholder="SWIFT code"
                          className="h-8 w-full border border-neutral-200 bg-neutral-50 px-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-neutral-500">
                          Currency
                        </label>
                        <FormSelect
                          options={CURRENCY_OPTIONS}
                          value={
                            CURRENCY_OPTIONS.find(
                              (c) => c.id === account.currency
                            ) ?? null
                          }
                          onChange={(opt) =>
                            handleBankAccountChange(
                              account.id,
                              'currency',
                              opt.id
                            )
                          }
                          className="h-8 w-full text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Wallet Addresses */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
              <div>
                <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                  Wallet Addresses
                </h2>
                <p className="mt-0.5 text-[11px] text-neutral-500">
                  Add crypto wallet addresses for this identity
                </p>
              </div>
              <Button
                type="button"
                onClick={handleAddWalletAddress}
                className="h-7 rounded-none bg-brand-500 px-3 text-xs font-medium text-white hover:bg-brand-600"
              >
                <PlusIcon className="mr-1.5 size-3.5" />
                Add Wallet
              </Button>
            </div>
            {walletAddresses.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-neutral-500">
                  No wallet addresses added
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  Click "Add Wallet" to add a wallet address
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {walletAddresses.map((wallet, index) => {
                  // New wallets have IDs starting with "new-wallet-", existing ones don't
                  const isNewWallet = wallet.id.startsWith('new-wallet-');
                  const isEditable = isNewWallet;

                  return (
                    <div key={wallet.id} className="p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-neutral-700">
                            Wallet {index + 1}
                          </span>
                          {!isEditable && (
                            <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500">
                              Read-only
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveWalletAddress(wallet.id)}
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
                              value={wallet.label}
                              onChange={(e) =>
                                handleWalletAddressChange(
                                  wallet.id,
                                  'label',
                                  e.target.value
                                )
                              }
                              placeholder="e.g., Treasury Wallet"
                              className="h-8 w-full border border-neutral-200 bg-neutral-50 px-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                            />
                          ) : (
                            <div className="flex h-8 items-center border border-neutral-100 bg-neutral-50 px-2 text-xs text-neutral-700">
                              {wallet.label || '—'}
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
                                  (c) => c.id === wallet.chain
                                ) ?? null
                              }
                              onChange={(opt) =>
                                handleWalletAddressChange(
                                  wallet.id,
                                  'chain',
                                  opt.id
                                )
                              }
                              className="h-8 w-full text-xs"
                            />
                          ) : (
                            <div className="flex h-8 items-center border border-neutral-100 bg-neutral-50 px-2 text-xs text-neutral-700">
                              {wallet.chain}
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
                              value={wallet.address}
                              onChange={(e) =>
                                handleWalletAddressChange(
                                  wallet.id,
                                  'address',
                                  e.target.value
                                )
                              }
                              placeholder="0x..."
                              className="h-8 w-full border border-neutral-200 bg-neutral-50 px-2 font-mono text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                            />
                          ) : (
                            <div className="flex h-8 items-center border border-neutral-100 bg-neutral-50 px-2 font-mono text-xs text-neutral-700">
                              {wallet.address}
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
              {mode === 'create' ? 'Create Identity' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};

// Create identity page component
export const PageIdentityCreate = () => {
  return <IdentityFormContent mode="create" />;
};

// Edit identity page component
export const PageIdentityEdit = () => {
  const { identityId } = useParams({
    from: '/_app/identities/$identityId/edit',
  });
  return <IdentityFormContent mode="edit" identityId={identityId} />;
};
