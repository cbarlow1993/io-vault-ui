import { Link, useParams } from '@tanstack/react-router';
import {
  ArrowLeftIcon,
  BanknoteIcon,
  BuildingIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  CopyIcon,
  FileTextIcon,
  KeyIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  UserIcon,
  WalletIcon,
} from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';

import {
  NotificationButton,
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/treasury-6';

import {
  getIdentityById,
  getLinkedContacts,
  getLinkedCorporate,
  isCorporateIdentity,
  isIndividualIdentity,
  type Identity,
  type IndividualIdentity,
  type KycEvent,
  type KycStatus,
} from './data/identities';
import { getVaultsByIdentityId, type Vault } from './data/vaults';

const getKycStatusStyles = (status: KycStatus) => {
  switch (status) {
    case 'verified':
      return 'bg-positive-100 text-positive-700';
    case 'pending':
      return 'bg-warning-100 text-warning-700';
    case 'expired':
      return 'bg-neutral-100 text-neutral-500';
    case 'rejected':
      return 'bg-negative-100 text-negative-700';
  }
};

const getTypeStyles = (type: 'corporate' | 'individual') => {
  switch (type) {
    case 'corporate':
      return 'bg-blue-100 text-blue-700';
    case 'individual':
      return 'bg-purple-100 text-purple-700';
  }
};

const getKycEventIcon = (action: KycEvent['action']) => {
  switch (action) {
    case 'submitted':
      return <FileTextIcon className="text-blue-500 size-4" />;
    case 'verified':
      return <ClockIcon className="size-4 text-positive-500" />;
    case 'expired':
      return <ClockIcon className="size-4 text-neutral-400" />;
    case 'rejected':
      return <ClockIcon className="size-4 text-negative-500" />;
    case 'renewed':
      return <ClockIcon className="size-4 text-positive-500" />;
    case 'document_added':
      return <FileTextIcon className="text-blue-500 size-4" />;
  }
};

export const PageIdentityDetail = () => {
  const { identityId } = useParams({ from: '/_app/identities/$identityId' });
  const identity = getIdentityById(identityId);

  // Expandable sections state
  const [contactsExpanded, setContactsExpanded] = useState(false);
  const [vaultsExpanded, setVaultsExpanded] = useState(true);
  const [bankAccountsExpanded, setBankAccountsExpanded] = useState(true);
  const [walletAddressesExpanded, setWalletAddressesExpanded] = useState(true);
  const [kycHistoryExpanded, setKycHistoryExpanded] = useState(true);

  // Pagination state
  const ITEMS_PER_PAGE = 5;
  const [contactsPage, setContactsPage] = useState(1);
  const [vaultsPage, setVaultsPage] = useState(1);
  const [bankAccountsPage, setBankAccountsPage] = useState(1);
  const [walletAddressesPage, setWalletAddressesPage] = useState(1);
  const [kycHistoryPage, setKycHistoryPage] = useState(1);

  if (!identity) {
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

  const displayName = identity.displayName ?? identity.name;
  const TypeIcon = identity.type === 'corporate' ? BuildingIcon : UserIcon;

  // Get linked data
  const linkedContacts = isCorporateIdentity(identity)
    ? getLinkedContacts(identity.id)
    : [];
  const linkedCorporate = isIndividualIdentity(identity)
    ? getLinkedCorporate(identity.id)
    : undefined;
  const linkedVaults = getVaultsByIdentityId(identity.id);

  return (
    <PageLayout>
      <PageLayoutTopBar
        endActions={
          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="secondary"
              className="h-7 rounded-none border-neutral-300 px-3 text-xs font-medium"
            >
              <Link
                to="/identities/$identityId/edit"
                params={{ identityId: identity.id }}
              >
                Edit
              </Link>
            </Button>
            <div className="h-4 w-px bg-neutral-200" />
            <NotificationButton />
          </div>
        }
      >
        <div className="flex items-center gap-3">
          <Link
            to="/identities"
            className="flex size-6 items-center justify-center text-neutral-400 hover:text-neutral-900"
          >
            <ArrowLeftIcon className="size-4" />
          </Link>
          <div
            className={cn(
              'flex size-7 items-center justify-center rounded-full',
              identity.type === 'corporate' ? 'bg-blue-100' : 'bg-purple-100'
            )}
          >
            <TypeIcon
              className={cn(
                'size-3.5',
                identity.type === 'corporate'
                  ? 'text-blue-600'
                  : 'text-purple-600'
              )}
            />
          </div>
          <PageLayoutTopBarTitle>{displayName}</PageLayoutTopBarTitle>
          <span
            className={cn(
              'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
              getTypeStyles(identity.type)
            )}
          >
            {identity.type}
          </span>
          <span
            className={cn(
              'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
              getKycStatusStyles(identity.kycStatus)
            )}
          >
            {identity.kycStatus}
          </span>
        </div>
      </PageLayoutTopBar>
      <PageLayoutContent containerClassName="py-4">
        <div className="space-y-6">
          {/* Identity Info */}
          <div className="grid grid-cols-4 gap-px bg-neutral-200">
            <div className="bg-white p-4">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                {identity.type === 'corporate' ? 'Jurisdiction' : 'Role'}
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-900">
                {isCorporateIdentity(identity)
                  ? (identity.jurisdiction ?? '—')
                  : isIndividualIdentity(identity)
                    ? (identity.role ?? '—')
                    : '—'}
              </p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                KYC Status
              </p>
              <p className="mt-1 flex items-center gap-2">
                <span
                  className={cn(
                    'inline-block rounded px-1.5 py-0.5 text-xs font-medium capitalize',
                    getKycStatusStyles(identity.kycStatus)
                  )}
                >
                  {identity.kycStatus}
                </span>
              </p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Verified Date
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-900 tabular-nums">
                {identity.kycVerifiedAt ?? '—'}
              </p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Expires
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-900 tabular-nums">
                {identity.kycExpiresAt ?? '—'}
              </p>
            </div>
          </div>

          {/* Corporate-specific: Registration Number */}
          {isCorporateIdentity(identity) && identity.registrationNumber && (
            <div className="border border-neutral-200 bg-white p-4">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Registration Number
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-mono text-sm text-neutral-900">
                  {identity.registrationNumber}
                </span>
                <button
                  type="button"
                  className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                >
                  <CopyIcon className="size-3" />
                </button>
              </div>
            </div>
          )}

          {/* Individual-specific: Contact Info */}
          {isIndividualIdentity(identity) &&
            (identity.email || identity.phone) && (
              <div className="grid grid-cols-2 gap-px bg-neutral-200">
                {identity.email && (
                  <div className="flex items-center gap-3 bg-white p-4">
                    <MailIcon className="size-4 text-neutral-400" />
                    <div>
                      <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                        Email
                      </p>
                      <p className="mt-0.5 text-sm text-neutral-900">
                        {identity.email}
                      </p>
                    </div>
                  </div>
                )}
                {identity.phone && (
                  <div className="flex items-center gap-3 bg-white p-4">
                    <PhoneIcon className="size-4 text-neutral-400" />
                    <div>
                      <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                        Phone
                      </p>
                      <p className="mt-0.5 text-sm text-neutral-900">
                        {identity.phone}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

          {/* Individual-specific: Linked Corporate */}
          {isIndividualIdentity(identity) && linkedCorporate && (
            <div className="border border-neutral-200 bg-white">
              <div className="border-b border-neutral-200 px-4 py-3">
                <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                  Linked Organization
                </h2>
              </div>
              <Link
                to="/identities/$identityId"
                params={{ identityId: linkedCorporate.id }}
                className="flex items-center gap-3 p-4 hover:bg-neutral-50"
              >
                <div className="bg-blue-100 flex size-8 items-center justify-center rounded-full">
                  <BuildingIcon className="text-blue-600 size-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-900">
                    {linkedCorporate.displayName ?? linkedCorporate.name}
                  </p>
                  {linkedCorporate.jurisdiction && (
                    <p className="text-xs text-neutral-500">
                      {linkedCorporate.jurisdiction}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
                    getKycStatusStyles(linkedCorporate.kycStatus)
                  )}
                >
                  {linkedCorporate.kycStatus}
                </span>
                <ChevronRightIcon className="size-4 text-neutral-400" />
              </Link>
            </div>
          )}

          {/* Corporate-specific: Linked Contacts */}
          {isCorporateIdentity(identity) && linkedContacts.length > 0 && (
            <CollapsibleSection
              title="Linked Contacts"
              description="Individuals linked to this organization"
              count={linkedContacts.length}
              countLabel="contact"
              expanded={contactsExpanded}
              onToggle={() => setContactsExpanded(!contactsExpanded)}
            >
              <div className="divide-y divide-neutral-100">
                {linkedContacts
                  .slice(
                    (contactsPage - 1) * ITEMS_PER_PAGE,
                    contactsPage * ITEMS_PER_PAGE
                  )
                  .map((contact) => (
                    <LinkedContactRow key={contact.id} contact={contact} />
                  ))}
              </div>
              {linkedContacts.length > ITEMS_PER_PAGE && (
                <Pagination
                  currentPage={contactsPage}
                  totalItems={linkedContacts.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setContactsPage}
                />
              )}
            </CollapsibleSection>
          )}

          {/* Linked Vaults */}
          {linkedVaults.length > 0 && (
            <CollapsibleSection
              title="Linked Vaults"
              description="Vaults linked to this identity"
              count={linkedVaults.length}
              countLabel="vault"
              expanded={vaultsExpanded}
              onToggle={() => setVaultsExpanded(!vaultsExpanded)}
            >
              <div className="divide-y divide-neutral-100">
                {linkedVaults
                  .slice(
                    (vaultsPage - 1) * ITEMS_PER_PAGE,
                    vaultsPage * ITEMS_PER_PAGE
                  )
                  .map((vault) => (
                    <LinkedVaultRow key={vault.id} vault={vault} />
                  ))}
              </div>
              {linkedVaults.length > ITEMS_PER_PAGE && (
                <Pagination
                  currentPage={vaultsPage}
                  totalItems={linkedVaults.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setVaultsPage}
                />
              )}
            </CollapsibleSection>
          )}

          {/* Bank Accounts */}
          <CollapsibleSection
            title="Bank Accounts"
            description="Registered bank accounts for this identity"
            count={identity.bankAccounts.length}
            countLabel="account"
            expanded={bankAccountsExpanded}
            onToggle={() => setBankAccountsExpanded(!bankAccountsExpanded)}
            emptyState={
              identity.bankAccounts.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <BanknoteIcon className="mx-auto size-8 text-neutral-300" />
                  <p className="mt-2 text-sm text-neutral-500">
                    No bank accounts
                  </p>
                  <p className="text-xs text-neutral-400">
                    No bank accounts have been added to this identity
                  </p>
                </div>
              ) : undefined
            }
          >
            {identity.bankAccounts.length > 0 && (
              <>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-neutral-100 bg-neutral-50 text-left">
                      <th className="px-4 py-2 font-medium text-neutral-500">
                        Bank
                      </th>
                      <th className="px-4 py-2 font-medium text-neutral-500">
                        Account Name
                      </th>
                      <th className="px-4 py-2 font-medium text-neutral-500">
                        Account Number
                      </th>
                      <th className="px-4 py-2 font-medium text-neutral-500">
                        SWIFT/BIC
                      </th>
                      <th className="px-4 py-2 font-medium text-neutral-500">
                        Currency
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {identity.bankAccounts
                      .slice(
                        (bankAccountsPage - 1) * ITEMS_PER_PAGE,
                        bankAccountsPage * ITEMS_PER_PAGE
                      )
                      .map((account) => (
                        <tr key={account.id} className="hover:bg-neutral-50">
                          <td className="px-4 py-2.5 font-medium text-neutral-900">
                            {account.bankName}
                          </td>
                          <td className="px-4 py-2.5 text-neutral-600">
                            {account.accountName}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-neutral-600">
                                {account.iban ?? account.accountNumber}
                              </span>
                              <button
                                type="button"
                                className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                              >
                                <CopyIcon className="size-3" />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-neutral-500">
                            {account.swiftCode ?? '—'}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="inline-block rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
                              {account.currency}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {identity.bankAccounts.length > ITEMS_PER_PAGE && (
                  <Pagination
                    currentPage={bankAccountsPage}
                    totalItems={identity.bankAccounts.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setBankAccountsPage}
                  />
                )}
              </>
            )}
          </CollapsibleSection>

          {/* Wallet Addresses */}
          <CollapsibleSection
            title="Wallet Addresses"
            description="Crypto wallet addresses for this identity"
            count={identity.walletAddresses.length}
            countLabel="wallet"
            expanded={walletAddressesExpanded}
            onToggle={() =>
              setWalletAddressesExpanded(!walletAddressesExpanded)
            }
            emptyState={
              identity.walletAddresses.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <WalletIcon className="mx-auto size-8 text-neutral-300" />
                  <p className="mt-2 text-sm text-neutral-500">
                    No wallet addresses
                  </p>
                  <p className="text-xs text-neutral-400">
                    No wallet addresses have been added to this identity
                  </p>
                </div>
              ) : undefined
            }
          >
            {identity.walletAddresses.length > 0 && (
              <>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-neutral-100 bg-neutral-50 text-left">
                      <th className="px-4 py-2 font-medium text-neutral-500">
                        Label
                      </th>
                      <th className="px-4 py-2 font-medium text-neutral-500">
                        Address
                      </th>
                      <th className="px-4 py-2 font-medium text-neutral-500">
                        Chain
                      </th>
                      <th className="px-4 py-2 font-medium text-neutral-500">
                        Added
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {identity.walletAddresses
                      .slice(
                        (walletAddressesPage - 1) * ITEMS_PER_PAGE,
                        walletAddressesPage * ITEMS_PER_PAGE
                      )
                      .map((wallet) => (
                        <tr key={wallet.id} className="hover:bg-neutral-50">
                          <td className="px-4 py-2.5 font-medium text-neutral-900">
                            {wallet.label}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="max-w-[280px] truncate font-mono text-neutral-600">
                                {wallet.address}
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
                            <span className="inline-block rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
                              {wallet.chain}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-neutral-500 tabular-nums">
                            {wallet.addedAt}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {identity.walletAddresses.length > ITEMS_PER_PAGE && (
                  <Pagination
                    currentPage={walletAddressesPage}
                    totalItems={identity.walletAddresses.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setWalletAddressesPage}
                  />
                )}
              </>
            )}
          </CollapsibleSection>

          {/* KYC History */}
          <CollapsibleSection
            title="KYC History"
            description="Verification events and audit trail"
            count={identity.kycHistory.length}
            countLabel="event"
            expanded={kycHistoryExpanded}
            onToggle={() => setKycHistoryExpanded(!kycHistoryExpanded)}
            emptyState={
              identity.kycHistory.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <CalendarIcon className="mx-auto size-8 text-neutral-300" />
                  <p className="mt-2 text-sm text-neutral-500">
                    No KYC history
                  </p>
                  <p className="text-xs text-neutral-400">
                    No verification events have been recorded
                  </p>
                </div>
              ) : undefined
            }
          >
            {identity.kycHistory.length > 0 && (
              <>
                <div className="divide-y divide-neutral-100">
                  {identity.kycHistory
                    .slice(
                      (kycHistoryPage - 1) * ITEMS_PER_PAGE,
                      kycHistoryPage * ITEMS_PER_PAGE
                    )
                    .map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 px-4 py-3"
                      >
                        <div className="mt-0.5">
                          {getKycEventIcon(event.action)}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-neutral-900">
                            {event.description}
                          </p>
                          <div className="mt-1 flex items-center gap-3 text-[11px] text-neutral-500">
                            <span className="tabular-nums">{event.date}</span>
                            <span>by {event.performedBy}</span>
                            {event.documentRef && (
                              <span className="font-mono text-neutral-400">
                                {event.documentRef}
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className={cn(
                            'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
                            event.action === 'verified' ||
                              event.action === 'renewed'
                              ? 'bg-positive-100 text-positive-700'
                              : event.action === 'rejected'
                                ? 'bg-negative-100 text-negative-700'
                                : event.action === 'expired'
                                  ? 'bg-neutral-100 text-neutral-500'
                                  : 'bg-blue-100 text-blue-700'
                          )}
                        >
                          {event.action.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                </div>
                {identity.kycHistory.length > ITEMS_PER_PAGE && (
                  <Pagination
                    currentPage={kycHistoryPage}
                    totalItems={identity.kycHistory.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setKycHistoryPage}
                  />
                )}
              </>
            )}
          </CollapsibleSection>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};

// Linked contact row component
const LinkedContactRow = ({ contact }: { contact: IndividualIdentity }) => {
  return (
    <Link
      to="/identities/$identityId"
      params={{ identityId: contact.id }}
      className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50"
    >
      <div className="bg-purple-100 flex size-8 items-center justify-center rounded-full">
        <UserIcon className="text-purple-600 size-4" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-neutral-900">{contact.name}</p>
        {contact.role && (
          <p className="text-xs text-neutral-500">{contact.role}</p>
        )}
      </div>
      {contact.email && (
        <span className="text-xs text-neutral-400">{contact.email}</span>
      )}
      <span
        className={cn(
          'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
          getKycStatusStyles(contact.kycStatus)
        )}
      >
        {contact.kycStatus}
      </span>
      <ChevronRightIcon className="size-4 text-neutral-400" />
    </Link>
  );
};

// Linked vault row component
const LinkedVaultRow = ({ vault }: { vault: Vault }) => {
  const getVaultStatusStyles = (status: Vault['status']) => {
    switch (status) {
      case 'active':
        return 'bg-positive-100 text-positive-700';
      case 'pending':
        return 'bg-warning-100 text-warning-700';
      case 'revoked':
        return 'bg-neutral-100 text-neutral-500';
    }
  };

  return (
    <Link
      to="/vaults/$vaultId"
      params={{ vaultId: vault.id }}
      className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50"
    >
      <div className="flex size-8 items-center justify-center rounded-full bg-neutral-100">
        <KeyIcon className="size-4 text-neutral-600" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-neutral-900">{vault.name}</p>
        <p className="text-xs text-neutral-500">
          {vault.threshold}/{vault.signers.length} signers
        </p>
      </div>
      <span className="text-xs text-neutral-400">{vault.createdAt}</span>
      <span
        className={cn(
          'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
          getVaultStatusStyles(vault.status)
        )}
      >
        {vault.status}
      </span>
      <ChevronRightIcon className="size-4 text-neutral-400" />
    </Link>
  );
};

// Collapsible section component
type CollapsibleSectionProps = {
  title: string;
  description: string;
  count: number;
  countLabel: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  emptyState?: React.ReactNode;
};

const CollapsibleSection = ({
  title,
  description,
  count,
  countLabel,
  expanded,
  onToggle,
  children,
  emptyState,
}: CollapsibleSectionProps) => {
  return (
    <div className="border border-neutral-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-neutral-50"
      >
        <div>
          <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
            {title}
          </h2>
          <p className="mt-0.5 text-[11px] text-neutral-500">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-500">
            {count} {countLabel}
            {count !== 1 ? 's' : ''}
          </span>
          <ChevronDownIcon
            className={cn(
              'size-4 text-neutral-400 transition-transform',
              expanded && 'rotate-180'
            )}
          />
        </div>
      </button>
      {expanded && <>{emptyState || children}</>}
    </div>
  );
};

// Pagination component
type PaginationProps = {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
};

const Pagination = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
}: PaginationProps) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-2">
      <span className="text-xs text-neutral-500">
        Showing {startItem}-{endItem} of {totalItems}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex size-7 items-center justify-center text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-neutral-400"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <span className="px-2 text-xs text-neutral-600">
          {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex size-7 items-center justify-center text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-neutral-400"
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>
    </div>
  );
};
