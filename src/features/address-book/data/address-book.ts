import {
  allIdentities,
  type Identity,
  type WalletAddress,
} from '@/features/identities/data/identities';

// Standalone address (not linked to an identity)
export type StandaloneAddress = {
  id: string;
  label: string;
  address: string;
  chain: string;
  linkedIdentityId?: string;
  createdAt: string;
};

// Address book entry - unified type for display
export type AddressBookEntry = {
  id: string;
  label: string;
  address: string;
  chain: string;
  type: 'identity' | 'standalone';
  identity?: {
    id: string;
    name: string;
    displayName?: string;
    type: 'corporate' | 'individual';
  };
  createdAt: string;
};

// Sample standalone addresses (addresses created directly, not via identity)
export const standaloneAddresses: StandaloneAddress[] = [
  {
    id: 'standalone-1',
    label: 'Exchange Hot Wallet',
    address: '0xDef1C0ded9bec7F1a1670819833240f027b25EfF',
    chain: 'Ethereum',
    createdAt: '2024-10-15',
  },
  {
    id: 'standalone-2',
    label: 'Binance Deposit',
    address: '0x28C6c06298d514Db089934071355E5743bf21d60',
    chain: 'Ethereum',
    createdAt: '2024-11-01',
  },
  {
    id: 'standalone-3',
    label: 'Cold Storage',
    address: 'bc1q9h7p9vvqfwmyg8n7l0xkc4h5rz9v5xhh5qm4jq',
    chain: 'Bitcoin',
    createdAt: '2024-09-20',
  },
  {
    id: 'standalone-4',
    label: 'Polygon Bridge',
    address: '0x5a51E2ebF8D136926b9cA7b59B60464E7C44d2Eb',
    chain: 'Polygon',
    linkedIdentityId: 'corp-1', // Linked to Acme Corp but created as standalone
    createdAt: '2024-08-10',
  },
];

// Get all addresses linked to identities
export const getIdentityAddresses = (): AddressBookEntry[] => {
  const entries: AddressBookEntry[] = [];

  allIdentities.forEach((identity) => {
    identity.walletAddresses.forEach((wallet) => {
      entries.push({
        id: wallet.id,
        label: wallet.label,
        address: wallet.address,
        chain: wallet.chain,
        type: 'identity',
        identity: {
          id: identity.id,
          name: identity.name,
          displayName: identity.displayName,
          type: identity.type,
        },
        createdAt: wallet.addedAt,
      });
    });
  });

  return entries;
};

// Get all standalone addresses as AddressBookEntry
export const getStandaloneAddressEntries = (): AddressBookEntry[] => {
  return standaloneAddresses.map((addr) => {
    const linkedIdentity = addr.linkedIdentityId
      ? allIdentities.find((i) => i.id === addr.linkedIdentityId)
      : undefined;

    return {
      id: addr.id,
      label: addr.label,
      address: addr.address,
      chain: addr.chain,
      type: 'standalone' as const,
      identity: linkedIdentity
        ? {
            id: linkedIdentity.id,
            name: linkedIdentity.name,
            displayName: linkedIdentity.displayName,
            type: linkedIdentity.type,
          }
        : undefined,
      createdAt: addr.createdAt,
    };
  });
};

// Get all address book entries (both identity-linked and standalone)
export const getAllAddressBookEntries = (): AddressBookEntry[] => {
  return [...getIdentityAddresses(), ...getStandaloneAddressEntries()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

// Get address by ID
export const getAddressById = (id: string): AddressBookEntry | undefined => {
  return getAllAddressBookEntries().find((entry) => entry.id === id);
};

// Get addresses by chain
export const getAddressesByChain = (chain: string): AddressBookEntry[] => {
  return getAllAddressBookEntries().filter((entry) => entry.chain === chain);
};

// Get available chains from all addresses
export const getAvailableChains = (): string[] => {
  const chains = new Set<string>();
  getAllAddressBookEntries().forEach((entry) => chains.add(entry.chain));
  return Array.from(chains).sort();
};

// Get identities for linking (for dropdown)
export const getIdentitiesForLinking = (): {
  id: string;
  name: string;
  type: string;
}[] => {
  return allIdentities.map((identity) => ({
    id: identity.id,
    name: identity.displayName ?? identity.name,
    type: identity.type,
  }));
};

// Get address book entries for a specific identity
export const getAddressBookEntriesByIdentityId = (
  identityId: string
): AddressBookEntry[] => {
  return getAllAddressBookEntries().filter(
    (entry) => entry.identity?.id === identityId
  );
};
