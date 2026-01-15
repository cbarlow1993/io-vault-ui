import { Link, useParams } from '@tanstack/react-router';
import {
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
  type AddressBookEntry,
  getAddressBookEntriesByIdentityId,
} from '@/features/address-book/data/address-book';
import { getStatusStyles } from '@/features/shared/lib/status-styles';
import {
  getVaultsByIdentityId,
  type Vault,
} from '@/features/vaults/data/vaults';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
} from '@/layout/shell';

import {
  getIdentityById,
  getLinkedContacts,
  getLinkedCorporate,
  type Identity,
  type IndividualIdentity,
  isCorporateIdentity,
  isIndividualIdentity,
  type KycEvent,
  type KycStatus,
} from './data/identities';

// Tab types
type TabType = 'accounts' | 'profile';

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
  const { identityId } = useParams({
    from: '/_app/compliance/identities/$identityId',
  });
  const identity = getIdentityById(identityId);

  // Tab state - accounts is the default/landing tab
  const [activeTab, setActiveTab] = useState<TabType>('accounts');

  // Expandable sections state
  const [contactsExpanded, setContactsExpanded] = useState(false);
  const [vaultsExpanded, setVaultsExpanded] = useState(true);
  const [bankAccountsExpanded, setBankAccountsExpanded] = useState(true);
  const [walletAddressesExpanded, setWalletAddressesExpanded] = useState(true);
  const [kycHistoryExpanded, setKycHistoryExpanded] = useState(true);
  const [addressBookExpanded, setAddressBookExpanded] = useState(true);

  // Pagination state
  const ITEMS_PER_PAGE = 5;
  const [contactsPage, setContactsPage] = useState(1);
  const [vaultsPage, setVaultsPage] = useState(1);
  const [bankAccountsPage, setBankAccountsPage] = useState(1);
  const [walletAddressesPage, setWalletAddressesPage] = useState(1);
  const [kycHistoryPage, setKycHistoryPage] = useState(1);
  const [addressBookPage, setAddressBookPage] = useState(1);

  if (!identity) {
    return (
      <PageLayout>
        <PageLayoutTopBar
          breadcrumbs={[
            { label: 'Identities', href: '/compliance/identities' },
            { label: 'Not Found' },
          ]}
        />
        <PageLayoutContent containerClassName="py-8">
          <div className="text-center">
            <p className="text-neutral-500">
              The requested identity could not be found.
            </p>
            <Link
              to="/compliance/identities"
              className="mt-4 inline-block text-sm text-neutral-900 hover:underline"
            >
              Return to identities
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
  const addressBookEntries = getAddressBookEntriesByIdentityId(identity.id);

  return (
    <PageLayout>
      <PageLayoutTopBar
        breadcrumbs={[
          { label: 'Identities', href: '/compliance/identities' },
          { label: displayName },
        ]}
        actions={
          <Button
            asChild
            variant="secondary"
            className="h-7 rounded-none border-neutral-300 px-3 text-xs font-medium"
          >
            <Link
              to="/compliance/identities/$identityId/edit"
              params={{ identityId: identity.id }}
            >
              Edit
            </Link>
          </Button>
        }
      />
      <PageLayoutContent containerClassName="py-0">
        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-200 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('accounts')}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium transition-colors',
              activeTab === 'accounts'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            )}
          >
            <KeyIcon className="size-3.5" />
            <span>Accounts</span>
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums',
                activeTab === 'accounts'
                  ? 'bg-brand-100 text-brand-700'
                  : 'bg-neutral-100 text-neutral-600'
              )}
            >
              {linkedVaults.length + addressBookEntries.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium transition-colors',
              activeTab === 'profile'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            )}
          >
            <UserIcon className="size-3.5" />
            <span>Profile</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="py-4">
          {activeTab === 'accounts' && (
            <div className="space-y-6">
              {/* Linked Vaults */}
              <CollapsibleSection
                title="Vaults"
                description="Vaults assigned to this identity"
                count={linkedVaults.length}
                countLabel="vault"
                expanded={vaultsExpanded}
                onToggle={() => setVaultsExpanded(!vaultsExpanded)}
                emptyState={
                  linkedVaults.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <KeyIcon className="mx-auto size-8 text-neutral-300" />
                      <p className="mt-2 text-sm text-neutral-500">
                        No linked vaults
                      </p>
                      <p className="text-xs text-neutral-400">
                        This identity is not linked to any vaults
                      </p>
                    </div>
                  ) : undefined
                }
              >
                {linkedVaults.length > 0 && (
                  <>
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
                  </>
                )}
              </CollapsibleSection>

              {/* Address Book Entries */}
              <CollapsibleSection
                title="Address Book"
                description="Saved addresses linked to this identity"
                count={addressBookEntries.length}
                countLabel="address"
                expanded={addressBookExpanded}
                onToggle={() => setAddressBookExpanded(!addressBookExpanded)}
                emptyState={
                  addressBookEntries.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <MapPinIcon className="mx-auto size-8 text-neutral-300" />
                      <p className="mt-2 text-sm text-neutral-500">
                        No address book entries
                      </p>
                      <p className="text-xs text-neutral-400">
                        No addresses have been linked to this identity
                      </p>
                    </div>
                  ) : undefined
                }
              >
                {addressBookEntries.length > 0 && (
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
                            Type
                          </th>
                          <th className="px-4 py-2 font-medium text-neutral-500">
                            Added
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {addressBookEntries
                          .slice(
                            (addressBookPage - 1) * ITEMS_PER_PAGE,
                            addressBookPage * ITEMS_PER_PAGE
                          )
                          .map((entry) => (
                            <tr key={entry.id} className="hover:bg-neutral-50">
                              <td className="px-4 py-2.5 font-medium text-neutral-900">
                                {entry.label}
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="max-w-[280px] truncate font-mono text-neutral-600">
                                    {entry.address}
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
                                  {entry.chain}
                                </span>
                              </td>
                              <td className="px-4 py-2.5">
                                <span
                                  className={cn(
                                    'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
                                    entry.type === 'identity'
                                      ? 'bg-purple-100 text-purple-700'
                                      : 'bg-blue-100 text-blue-700'
                                  )}
                                >
                                  {entry.type}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-neutral-500 tabular-nums">
                                {entry.createdAt}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {addressBookEntries.length > ITEMS_PER_PAGE && (
                      <Pagination
                        currentPage={addressBookPage}
                        totalItems={addressBookEntries.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                        onPageChange={setAddressBookPage}
                      />
                    )}
                  </>
                )}
              </CollapsibleSection>
            </div>
          )}

          {activeTab === 'profile' && (
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
                    to="/compliance/identities/$identityId"
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
            </div>
          )}
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};

// Linked contact row component
const LinkedContactRow = ({ contact }: { contact: IndividualIdentity }) => {
  return (
    <Link
      to="/compliance/identities/$identityId"
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
  return (
    <Link
      to="/treasury/vaults/$vaultId"
      params={{ vaultId: vault.id }}
      className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50"
    >
      <div className="flex size-8 items-center justify-center rounded-full bg-neutral-100">
        <KeyIcon className="size-4 text-neutral-600" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-neutral-900">{vault.name}</p>
        <p className="text-xs text-neutral-500">Threshold: {vault.threshold}</p>
      </div>
      <span className="text-xs text-neutral-400">{vault.createdAt}</span>
      <span
        className={cn(
          'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
          getStatusStyles(vault.status)
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
