// Whitelist status
// - draft: Version is being edited, not yet submitted for approval
// - pending: Submitted for approval, can be edited but edits reset all approvals
// - active: Fully approved and is the current master version (immutable)
// - superseded: Previously active, replaced by a newer version (immutable)
// - revoked: Manually revoked
// - expired: Expired based on configured expiration date
export type WhitelistStatus =
  | 'draft'
  | 'pending'
  | 'active'
  | 'superseded'
  | 'revoked'
  | 'expired';

// Whitelist entry type
export type WhitelistEntryType = 'address' | 'entity' | 'contract';

// Change type for audit trail
export type WhitelistChangeType =
  | 'created'
  | 'name_updated'
  | 'description_updated'
  | 'entry_added'
  | 'entry_removed'
  | 'entry_updated'
  | 'status_changed'
  | 'submitted_for_approval' // Draft submitted for approval
  | 'approved'
  | 'approvals_reset' // Approvals dismissed due to edit during pending state
  | 'revoked'
  | 'expired';

// Individual change record for audit trail
export type WhitelistChange = {
  id: string;
  type: WhitelistChangeType;
  description: string;
  changedBy: string;
  changedByEmail?: string;
  changedAt: string;
  previousValue?: string;
  newValue?: string;
  metadata?: Record<string, string>;
};

// Version snapshot
export type WhitelistVersion = {
  version: number;
  createdAt: string;
  createdBy: string;
  changes: WhitelistChange[];
  status: WhitelistStatus;
  requiredApprovals?: number; // Number of approvals needed
  approvedBy?: string[];
  approvedAt?: string;
  activatedAt?: string; // When this version became the main/current version
  comment?: string;
};

// Individual whitelist entry
export type WhitelistEntry = {
  id: string;
  address: string;
  label: string;
  chain: string;
  type: WhitelistEntryType;
  addedAt: string;
  addedBy: string;
};

// Whitelist definition
// Versioning workflow:
// 1. A new whitelist starts with a draft version (v1, status: 'draft')
// 2. When ready, user submits draft for approval (status: 'pending')
// 3. During pending, edits are allowed but reset all existing approvals
// 4. Once fully approved, version becomes 'active' (immutable)
// 5. To edit an active whitelist, a new draft version is created
// 6. When new version becomes active, previous active becomes 'superseded'
export type Whitelist = {
  id: string;
  name: string;
  description: string;
  status: WhitelistStatus;
  type: 'global' | 'vault-specific';
  vaultId?: string;
  vaultName?: string;
  entries: WhitelistEntry[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  approvedBy?: string[];
  expiresAt?: string;
  // Versioning
  currentVersion: number; // The active/master version number
  draftVersion?: number; // The draft version number (if one exists)
  versions: WhitelistVersion[];
};

// Sample whitelist entries
const exchangeEntries: WhitelistEntry[] = [
  {
    id: 'entry-1',
    address: '0x28C6c06298d514Db089934071355E5743bf21d60',
    label: 'Binance Hot Wallet 1',
    chain: 'Ethereum',
    type: 'address',
    addedAt: '2024-11-15',
    addedBy: 'Alice Chen',
  },
  {
    id: 'entry-2',
    address: '0x21a31Ee1afC51d94C2eFcCAa2092aD1028285549',
    label: 'Binance Hot Wallet 2',
    chain: 'Ethereum',
    type: 'address',
    addedAt: '2024-11-15',
    addedBy: 'Alice Chen',
  },
  {
    id: 'entry-3',
    address: '0xDFd5293D8e347dFe59E90eFd55b2956a1343963d',
    label: 'Coinbase Prime',
    chain: 'Ethereum',
    type: 'address',
    addedAt: '2024-10-20',
    addedBy: 'Bob Martinez',
  },
  {
    id: 'entry-4',
    address: '0x503828976D22510aad0201ac7EC88293211D23Da',
    label: 'Coinbase Custody',
    chain: 'Ethereum',
    type: 'address',
    addedAt: '2024-10-20',
    addedBy: 'Bob Martinez',
  },
];

const defiEntries: WhitelistEntry[] = [
  {
    id: 'entry-5',
    address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    label: 'Uniswap V2 Router',
    chain: 'Ethereum',
    type: 'contract',
    addedAt: '2024-09-10',
    addedBy: 'Charlie Kim',
  },
  {
    id: 'entry-6',
    address: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    label: 'Uniswap V3 Router',
    chain: 'Ethereum',
    type: 'contract',
    addedAt: '2024-09-10',
    addedBy: 'Charlie Kim',
  },
  {
    id: 'entry-7',
    address: '0x1111111254EEB25477B68fb85Ed929f73A960582',
    label: '1inch Router v5',
    chain: 'Ethereum',
    type: 'contract',
    addedAt: '2024-09-12',
    addedBy: 'Charlie Kim',
  },
  {
    id: 'entry-8',
    address: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
    label: 'Aave V3 Pool',
    chain: 'Ethereum',
    type: 'contract',
    addedAt: '2024-09-15',
    addedBy: 'Diana Ross',
  },
];

const counterpartyEntries: WhitelistEntry[] = [
  {
    id: 'entry-9',
    address: '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41',
    label: 'Circle Treasury',
    chain: 'Ethereum',
    type: 'entity',
    addedAt: '2024-08-05',
    addedBy: 'Eve Johnson',
  },
  {
    id: 'entry-10',
    address: '0x5754284f345afc66a98fbb0a0afe71e0f007b949',
    label: 'Fireblocks Omnibus',
    chain: 'Ethereum',
    type: 'entity',
    addedAt: '2024-08-10',
    addedBy: 'Eve Johnson',
  },
  {
    id: 'entry-11',
    address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    label: 'BitGo Custody BTC',
    chain: 'Bitcoin',
    type: 'entity',
    addedAt: '2024-07-20',
    addedBy: 'Frank Lee',
  },
];

const polygonEntries: WhitelistEntry[] = [
  {
    id: 'entry-12',
    address: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
    label: 'QuickSwap Router',
    chain: 'Polygon',
    type: 'contract',
    addedAt: '2024-10-01',
    addedBy: 'Grace Wang',
  },
  {
    id: 'entry-13',
    address: '0x1a8e035C24dF4DfDAFc7c9E9cB1E89E1f14E9a21',
    label: 'Polygon Bridge',
    chain: 'Polygon',
    type: 'contract',
    addedAt: '2024-10-01',
    addedBy: 'Grace Wang',
  },
];

// All whitelists
export const allWhitelists: Whitelist[] = [
  {
    id: 'wl-1',
    name: 'Approved Exchanges',
    description:
      'Whitelisted centralized exchange addresses for trading operations',
    status: 'active',
    type: 'global',
    entries: exchangeEntries,
    createdAt: '2024-10-15',
    createdBy: 'Alice Chen',
    updatedAt: '2025-01-08',
    approvedBy: ['Alice Chen', 'Bob Martinez', 'Charlie Kim'],
    currentVersion: 3,
    draftVersion: 4, // A new draft version is being prepared
    versions: [
      {
        version: 1,
        createdAt: '2024-10-15T09:00:00Z',
        createdBy: 'Alice Chen',
        status: 'superseded', // Was active, then replaced by v2
        approvedBy: ['Alice Chen', 'Bob Martinez', 'Charlie Kim'],
        approvedAt: '2024-10-16T14:00:00Z',
        activatedAt: '2024-10-16T14:00:00Z',
        comment: 'Initial whitelist creation',
        changes: [
          {
            id: 'chg-1-1',
            type: 'created',
            description: 'Whitelist created',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-10-15T09:00:00Z',
          },
          {
            id: 'chg-1-2',
            type: 'entry_added',
            description: 'Added Binance Hot Wallet 1',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-10-15T09:05:00Z',
            newValue: '0x28C6c06298d514Db089934071355E5743bf21d60',
          },
          {
            id: 'chg-1-3',
            type: 'entry_added',
            description: 'Added Binance Hot Wallet 2',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-10-15T09:06:00Z',
            newValue: '0x21a31Ee1afC51d94C2eFcCAa2092aD1028285549',
          },
          {
            id: 'chg-1-4',
            type: 'submitted_for_approval',
            description: 'Submitted for approval',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-10-15T10:00:00Z',
          },
          {
            id: 'chg-1-5',
            type: 'approved',
            description: 'Whitelist approved by Alice Chen',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-10-16T09:00:00Z',
          },
          {
            id: 'chg-1-6',
            type: 'approved',
            description: 'Whitelist approved by Bob Martinez',
            changedBy: 'Bob Martinez',
            changedByEmail: 'bob.martinez@company.com',
            changedAt: '2024-10-16T11:00:00Z',
          },
          {
            id: 'chg-1-7',
            type: 'approved',
            description: 'Whitelist approved by Charlie Kim',
            changedBy: 'Charlie Kim',
            changedByEmail: 'charlie.kim@company.com',
            changedAt: '2024-10-16T14:00:00Z',
          },
        ],
      },
      {
        version: 2,
        createdAt: '2024-10-20T14:30:00Z',
        createdBy: 'Bob Martinez',
        status: 'superseded', // Was active, then replaced by v3
        approvedBy: ['Alice Chen', 'Bob Martinez', 'Charlie Kim'],
        approvedAt: '2024-10-22T16:00:00Z',
        activatedAt: '2024-10-22T16:00:00Z',
        comment: 'Added Coinbase addresses',
        changes: [
          {
            id: 'chg-2-1',
            type: 'entry_added',
            description: 'Added Coinbase Prime',
            changedBy: 'Bob Martinez',
            changedByEmail: 'bob.martinez@company.com',
            changedAt: '2024-10-20T14:30:00Z',
            newValue: '0xDFd5293D8e347dFe59E90eFd55b2956a1343963d',
          },
          {
            id: 'chg-2-2',
            type: 'entry_added',
            description: 'Added Coinbase Custody',
            changedBy: 'Bob Martinez',
            changedByEmail: 'bob.martinez@company.com',
            changedAt: '2024-10-20T14:31:00Z',
            newValue: '0x503828976D22510aad0201ac7EC88293211D23Da',
          },
          {
            id: 'chg-2-3',
            type: 'submitted_for_approval',
            description: 'Submitted for approval',
            changedBy: 'Bob Martinez',
            changedByEmail: 'bob.martinez@company.com',
            changedAt: '2024-10-20T15:00:00Z',
          },
          {
            id: 'chg-2-4',
            type: 'approved',
            description: 'Whitelist approved by Alice Chen',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-10-21T09:00:00Z',
          },
          {
            id: 'chg-2-5',
            type: 'approved',
            description: 'Whitelist approved by Bob Martinez',
            changedBy: 'Bob Martinez',
            changedByEmail: 'bob.martinez@company.com',
            changedAt: '2024-10-22T10:00:00Z',
          },
          {
            id: 'chg-2-6',
            type: 'approved',
            description: 'Whitelist approved by Charlie Kim',
            changedBy: 'Charlie Kim',
            changedByEmail: 'charlie.kim@company.com',
            changedAt: '2024-10-22T16:00:00Z',
          },
        ],
      },
      {
        version: 3,
        createdAt: '2024-11-15T10:00:00Z',
        createdBy: 'Alice Chen',
        status: 'active',
        approvedBy: ['Alice Chen', 'Bob Martinez', 'Charlie Kim'],
        approvedAt: '2024-11-15T16:00:00Z',
        activatedAt: '2024-11-15T16:00:00Z',
        comment: 'Approved for production use',
        changes: [
          {
            id: 'chg-3-1',
            type: 'name_updated',
            description: 'Updated whitelist name for clarity',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-11-15T10:00:00Z',
            previousValue: 'Exchange Addresses',
            newValue: 'Approved Exchanges',
          },
          {
            id: 'chg-3-2',
            type: 'submitted_for_approval',
            description: 'Submitted for approval',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-11-15T10:30:00Z',
          },
          {
            id: 'chg-3-3',
            type: 'approved',
            description: 'Whitelist approved by Alice Chen',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-11-15T11:00:00Z',
          },
          {
            id: 'chg-3-4',
            type: 'approved',
            description: 'Whitelist approved by Bob Martinez',
            changedBy: 'Bob Martinez',
            changedByEmail: 'bob.martinez@company.com',
            changedAt: '2024-11-15T13:30:00Z',
          },
          {
            id: 'chg-3-5',
            type: 'approved',
            description: 'Whitelist approved by Charlie Kim',
            changedBy: 'Charlie Kim',
            changedByEmail: 'charlie.kim@company.com',
            changedAt: '2024-11-15T16:00:00Z',
          },
          {
            id: 'chg-3-6',
            type: 'status_changed',
            description: 'Status changed from pending to active',
            changedBy: 'System',
            changedAt: '2024-11-15T16:00:00Z',
            previousValue: 'pending',
            newValue: 'active',
          },
        ],
      },
      {
        version: 4,
        createdAt: '2025-01-08T09:00:00Z',
        createdBy: 'Diana Ross',
        status: 'draft', // New draft version being prepared
        comment: 'Adding Kraken exchange addresses',
        changes: [
          {
            id: 'chg-4-1',
            type: 'entry_added',
            description: 'Added Kraken Hot Wallet',
            changedBy: 'Diana Ross',
            changedByEmail: 'diana.ross@company.com',
            changedAt: '2025-01-08T09:00:00Z',
            newValue: '0x2910543Af39abA0Cd09dBb2D50200b3E800A63D2',
          },
          {
            id: 'chg-4-2',
            type: 'entry_added',
            description: 'Added Kraken Cold Storage',
            changedBy: 'Diana Ross',
            changedByEmail: 'diana.ross@company.com',
            changedAt: '2025-01-08T09:15:00Z',
            newValue: '0x53d284357ec70cE289D6D64134DfAc8E511c8a3D',
          },
        ],
      },
    ],
  },
  {
    id: 'wl-2',
    name: 'DeFi Protocols',
    description:
      'Verified smart contract addresses for decentralized finance operations',
    status: 'active',
    type: 'global',
    entries: defiEntries,
    createdAt: '2024-09-10',
    createdBy: 'Charlie Kim',
    updatedAt: '2024-09-15',
    approvedBy: ['Charlie Kim', 'Diana Ross'],
    currentVersion: 2,
    versions: [
      {
        version: 1,
        createdAt: '2024-09-10T08:00:00Z',
        createdBy: 'Charlie Kim',
        status: 'superseded', // Was active, then replaced by v2
        approvedBy: ['Charlie Kim', 'Diana Ross', 'Alice Chen'],
        approvedAt: '2024-09-12T16:00:00Z',
        activatedAt: '2024-09-12T16:00:00Z',
        comment: 'Initial DeFi protocol whitelist',
        changes: [
          {
            id: 'chg-defi-1-1',
            type: 'created',
            description: 'Whitelist created',
            changedBy: 'Charlie Kim',
            changedByEmail: 'charlie.kim@company.com',
            changedAt: '2024-09-10T08:00:00Z',
          },
          {
            id: 'chg-defi-1-2',
            type: 'entry_added',
            description: 'Added Uniswap V2 Router',
            changedBy: 'Charlie Kim',
            changedByEmail: 'charlie.kim@company.com',
            changedAt: '2024-09-10T08:10:00Z',
            newValue: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
          },
          {
            id: 'chg-defi-1-3',
            type: 'entry_added',
            description: 'Added Uniswap V3 Router',
            changedBy: 'Charlie Kim',
            changedByEmail: 'charlie.kim@company.com',
            changedAt: '2024-09-10T08:11:00Z',
            newValue: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
          },
          {
            id: 'chg-defi-1-4',
            type: 'entry_added',
            description: 'Added 1inch Router v5',
            changedBy: 'Charlie Kim',
            changedByEmail: 'charlie.kim@company.com',
            changedAt: '2024-09-12T10:00:00Z',
            newValue: '0x1111111254EEB25477B68fb85Ed929f73A960582',
          },
          {
            id: 'chg-defi-1-5',
            type: 'submitted_for_approval',
            description: 'Submitted for approval',
            changedBy: 'Charlie Kim',
            changedByEmail: 'charlie.kim@company.com',
            changedAt: '2024-09-12T11:00:00Z',
          },
          {
            id: 'chg-defi-1-6',
            type: 'approved',
            description: 'Whitelist approved by Charlie Kim',
            changedBy: 'Charlie Kim',
            changedByEmail: 'charlie.kim@company.com',
            changedAt: '2024-09-12T12:00:00Z',
          },
          {
            id: 'chg-defi-1-7',
            type: 'approved',
            description: 'Whitelist approved by Diana Ross',
            changedBy: 'Diana Ross',
            changedByEmail: 'diana.ross@company.com',
            changedAt: '2024-09-12T14:00:00Z',
          },
          {
            id: 'chg-defi-1-8',
            type: 'approved',
            description: 'Whitelist approved by Alice Chen',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-09-12T16:00:00Z',
          },
        ],
      },
      {
        version: 2,
        createdAt: '2024-09-15T14:00:00Z',
        createdBy: 'Diana Ross',
        status: 'active',
        approvedBy: ['Charlie Kim', 'Diana Ross', 'Alice Chen'],
        approvedAt: '2024-09-15T17:00:00Z',
        activatedAt: '2024-09-15T17:00:00Z',
        comment: 'Added Aave and approved',
        changes: [
          {
            id: 'chg-defi-2-1',
            type: 'entry_added',
            description: 'Added Aave V3 Pool',
            changedBy: 'Diana Ross',
            changedByEmail: 'diana.ross@company.com',
            changedAt: '2024-09-15T14:00:00Z',
            newValue: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
          },
          {
            id: 'chg-defi-2-2',
            type: 'submitted_for_approval',
            description: 'Submitted for approval',
            changedBy: 'Diana Ross',
            changedByEmail: 'diana.ross@company.com',
            changedAt: '2024-09-15T14:30:00Z',
          },
          {
            id: 'chg-defi-2-3',
            type: 'approved',
            description: 'Whitelist approved by Charlie Kim',
            changedBy: 'Charlie Kim',
            changedByEmail: 'charlie.kim@company.com',
            changedAt: '2024-09-15T15:30:00Z',
          },
          {
            id: 'chg-defi-2-4',
            type: 'approved',
            description: 'Whitelist approved by Diana Ross',
            changedBy: 'Diana Ross',
            changedByEmail: 'diana.ross@company.com',
            changedAt: '2024-09-15T16:00:00Z',
          },
          {
            id: 'chg-defi-2-5',
            type: 'approved',
            description: 'Whitelist approved by Alice Chen',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-09-15T17:00:00Z',
          },
          {
            id: 'chg-defi-2-6',
            type: 'status_changed',
            description: 'Status changed from pending to active',
            changedBy: 'System',
            changedAt: '2024-09-15T17:00:00Z',
            previousValue: 'pending',
            newValue: 'active',
          },
        ],
      },
    ],
  },
  {
    id: 'wl-3',
    name: 'Institutional Counterparties',
    description: 'Approved institutional custody and treasury addresses',
    status: 'active',
    type: 'global',
    entries: counterpartyEntries,
    createdAt: '2024-07-20',
    createdBy: 'Eve Johnson',
    updatedAt: '2024-08-10',
    approvedBy: ['Eve Johnson', 'Frank Lee', 'Alice Chen'],
    currentVersion: 2,
    versions: [
      {
        version: 1,
        createdAt: '2024-07-20T11:00:00Z',
        createdBy: 'Eve Johnson',
        status: 'pending',
        comment: 'Initial institutional counterparty list',
        changes: [
          {
            id: 'chg-inst-1-1',
            type: 'created',
            description: 'Whitelist created',
            changedBy: 'Eve Johnson',
            changedByEmail: 'eve.johnson@company.com',
            changedAt: '2024-07-20T11:00:00Z',
          },
          {
            id: 'chg-inst-1-2',
            type: 'entry_added',
            description: 'Added BitGo Custody BTC',
            changedBy: 'Frank Lee',
            changedByEmail: 'frank.lee@company.com',
            changedAt: '2024-07-20T14:00:00Z',
            newValue: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
          },
        ],
      },
      {
        version: 2,
        createdAt: '2024-08-10T09:00:00Z',
        createdBy: 'Eve Johnson',
        status: 'active',
        approvedBy: ['Eve Johnson', 'Frank Lee', 'Alice Chen'],
        approvedAt: '2024-08-10T18:00:00Z',
        activatedAt: '2024-08-10T18:00:00Z',
        comment: 'Added Circle and Fireblocks, approved for production',
        changes: [
          {
            id: 'chg-inst-2-1',
            type: 'entry_added',
            description: 'Added Circle Treasury',
            changedBy: 'Eve Johnson',
            changedByEmail: 'eve.johnson@company.com',
            changedAt: '2024-08-05T10:00:00Z',
            newValue: '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41',
          },
          {
            id: 'chg-inst-2-2',
            type: 'entry_added',
            description: 'Added Fireblocks Omnibus',
            changedBy: 'Eve Johnson',
            changedByEmail: 'eve.johnson@company.com',
            changedAt: '2024-08-10T09:00:00Z',
            newValue: '0x5754284f345afc66a98fbb0a0afe71e0f007b949',
          },
          {
            id: 'chg-inst-2-3',
            type: 'approved',
            description: 'Whitelist approved by Eve Johnson',
            changedBy: 'Eve Johnson',
            changedByEmail: 'eve.johnson@company.com',
            changedAt: '2024-08-10T12:00:00Z',
          },
          {
            id: 'chg-inst-2-4',
            type: 'approved',
            description: 'Whitelist approved by Frank Lee',
            changedBy: 'Frank Lee',
            changedByEmail: 'frank.lee@company.com',
            changedAt: '2024-08-10T14:00:00Z',
          },
          {
            id: 'chg-inst-2-5',
            type: 'approved',
            description: 'Whitelist approved by Alice Chen',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-08-10T18:00:00Z',
          },
          {
            id: 'chg-inst-2-6',
            type: 'status_changed',
            description: 'Status changed from pending to active',
            changedBy: 'System',
            changedAt: '2024-08-10T18:00:00Z',
            previousValue: 'pending',
            newValue: 'active',
          },
        ],
      },
    ],
  },
  {
    id: 'wl-4',
    name: 'Treasury Operations Vault',
    description: 'Vault-specific whitelist for treasury management operations',
    status: 'active',
    type: 'vault-specific',
    vaultId: 'vault-1',
    vaultName: 'Treasury Operations',
    entries: [...exchangeEntries.slice(0, 2), ...defiEntries.slice(0, 2)],
    createdAt: '2024-11-01',
    createdBy: 'Bob Martinez',
    updatedAt: '2024-11-10',
    approvedBy: ['Bob Martinez', 'Alice Chen'],
    currentVersion: 2,
    versions: [
      {
        version: 1,
        createdAt: '2024-11-01T10:00:00Z',
        createdBy: 'Bob Martinez',
        status: 'pending',
        comment: 'Initial treasury vault whitelist',
        changes: [
          {
            id: 'chg-treas-1-1',
            type: 'created',
            description: 'Whitelist created for Treasury Operations vault',
            changedBy: 'Bob Martinez',
            changedByEmail: 'bob.martinez@company.com',
            changedAt: '2024-11-01T10:00:00Z',
          },
          {
            id: 'chg-treas-1-2',
            type: 'entry_added',
            description: 'Added Binance Hot Wallet 1',
            changedBy: 'Bob Martinez',
            changedByEmail: 'bob.martinez@company.com',
            changedAt: '2024-11-01T10:15:00Z',
            newValue: '0x28C6c06298d514Db089934071355E5743bf21d60',
          },
          {
            id: 'chg-treas-1-3',
            type: 'entry_added',
            description: 'Added Binance Hot Wallet 2',
            changedBy: 'Bob Martinez',
            changedByEmail: 'bob.martinez@company.com',
            changedAt: '2024-11-01T10:16:00Z',
            newValue: '0x21a31Ee1afC51d94C2eFcCAa2092aD1028285549',
          },
        ],
      },
      {
        version: 2,
        createdAt: '2024-11-10T09:00:00Z',
        createdBy: 'Bob Martinez',
        status: 'active',
        approvedBy: ['Bob Martinez', 'Alice Chen'],
        approvedAt: '2024-11-10T15:00:00Z',
        activatedAt: '2024-11-10T15:00:00Z',
        comment: 'Added DeFi protocols and approved',
        changes: [
          {
            id: 'chg-treas-2-1',
            type: 'entry_added',
            description: 'Added Uniswap V2 Router',
            changedBy: 'Bob Martinez',
            changedByEmail: 'bob.martinez@company.com',
            changedAt: '2024-11-10T09:00:00Z',
            newValue: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
          },
          {
            id: 'chg-treas-2-2',
            type: 'entry_added',
            description: 'Added Uniswap V3 Router',
            changedBy: 'Bob Martinez',
            changedByEmail: 'bob.martinez@company.com',
            changedAt: '2024-11-10T09:01:00Z',
            newValue: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
          },
          {
            id: 'chg-treas-2-3',
            type: 'approved',
            description: 'Whitelist approved by Bob Martinez',
            changedBy: 'Bob Martinez',
            changedByEmail: 'bob.martinez@company.com',
            changedAt: '2024-11-10T12:00:00Z',
          },
          {
            id: 'chg-treas-2-4',
            type: 'approved',
            description: 'Whitelist approved by Alice Chen',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-11-10T15:00:00Z',
          },
          {
            id: 'chg-treas-2-5',
            type: 'status_changed',
            description: 'Status changed from pending to active',
            changedBy: 'System',
            changedAt: '2024-11-10T15:00:00Z',
            previousValue: 'pending',
            newValue: 'active',
          },
        ],
      },
    ],
  },
  {
    id: 'wl-5',
    name: 'Polygon Operations',
    description: 'Approved addresses for Polygon L2 transactions',
    status: 'pending',
    type: 'global',
    entries: polygonEntries,
    createdAt: '2024-10-01',
    createdBy: 'Grace Wang',
    updatedAt: '2025-01-09',
    currentVersion: 1,
    versions: [
      {
        version: 1,
        createdAt: '2024-10-01T16:00:00Z',
        createdBy: 'Grace Wang',
        status: 'pending',
        requiredApprovals: 3,
        approvedBy: ['Grace Wang'], // Only 1 of 3 required approvals (after reset)
        comment:
          'Polygon L2 whitelist - awaiting approval (approvals were reset after edit)',
        changes: [
          {
            id: 'chg-poly-1-1',
            type: 'created',
            description: 'Whitelist created',
            changedBy: 'Grace Wang',
            changedByEmail: 'grace.wang@company.com',
            changedAt: '2024-10-01T16:00:00Z',
          },
          {
            id: 'chg-poly-1-2',
            type: 'entry_added',
            description: 'Added QuickSwap Router',
            changedBy: 'Grace Wang',
            changedByEmail: 'grace.wang@company.com',
            changedAt: '2024-10-01T16:10:00Z',
            newValue: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
          },
          {
            id: 'chg-poly-1-3',
            type: 'entry_added',
            description: 'Added Polygon Bridge',
            changedBy: 'Grace Wang',
            changedByEmail: 'grace.wang@company.com',
            changedAt: '2024-10-01T16:11:00Z',
            newValue: '0x1a8e035C24dF4DfDAFc7c9E9cB1E89E1f14E9a21',
          },
          {
            id: 'chg-poly-1-4',
            type: 'submitted_for_approval',
            description: 'Submitted for approval',
            changedBy: 'Grace Wang',
            changedByEmail: 'grace.wang@company.com',
            changedAt: '2024-10-01T17:00:00Z',
          },
          // First round of approvals
          {
            id: 'chg-poly-1-5',
            type: 'approved',
            description: 'Whitelist approved by Grace Wang',
            changedBy: 'Grace Wang',
            changedByEmail: 'grace.wang@company.com',
            changedAt: '2024-10-02T09:00:00Z',
          },
          {
            id: 'chg-poly-1-6',
            type: 'approved',
            description: 'Whitelist approved by Alice Chen',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-10-02T11:00:00Z',
          },
          // Edit made while pending - resets all approvals
          {
            id: 'chg-poly-1-7',
            type: 'entry_added',
            description: 'Added SushiSwap Router',
            changedBy: 'Grace Wang',
            changedByEmail: 'grace.wang@company.com',
            changedAt: '2025-01-09T10:00:00Z',
            newValue: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
          },
          {
            id: 'chg-poly-1-8',
            type: 'approvals_reset',
            description: 'All approvals dismissed due to edit while pending',
            changedBy: 'System',
            changedAt: '2025-01-09T10:00:00Z',
            metadata: {
              resetBy: 'Grace Wang',
              previousApprovals: 'Grace Wang, Alice Chen',
              reason: 'Content modified after approvals were given',
            },
          },
          // Re-approval in progress
          {
            id: 'chg-poly-1-9',
            type: 'approved',
            description: 'Whitelist approved by Grace Wang',
            changedBy: 'Grace Wang',
            changedByEmail: 'grace.wang@company.com',
            changedAt: '2025-01-09T10:30:00Z',
          },
        ],
      },
    ],
  },
  {
    id: 'wl-6',
    name: 'Legacy Exchange List',
    description: 'Deprecated exchange whitelist - migrated to new format',
    status: 'revoked',
    type: 'global',
    entries: exchangeEntries.slice(0, 2),
    createdAt: '2024-05-01',
    createdBy: 'System Admin',
    updatedAt: '2024-10-15',
    currentVersion: 2,
    versions: [
      {
        version: 1,
        createdAt: '2024-05-01T00:00:00Z',
        createdBy: 'System Admin',
        status: 'active',
        approvedBy: ['System Admin'],
        approvedAt: '2024-05-01T00:00:00Z',
        comment: 'Legacy system import',
        changes: [
          {
            id: 'chg-leg-1-1',
            type: 'created',
            description: 'Whitelist imported from legacy system',
            changedBy: 'System Admin',
            changedAt: '2024-05-01T00:00:00Z',
          },
        ],
      },
      {
        version: 2,
        createdAt: '2024-10-15T08:00:00Z',
        createdBy: 'Alice Chen',
        status: 'revoked',
        comment: 'Deprecated - replaced by Approved Exchanges whitelist',
        changes: [
          {
            id: 'chg-leg-2-1',
            type: 'revoked',
            description: 'Whitelist revoked - migrated to new format',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-10-15T08:00:00Z',
            metadata: { reason: 'Replaced by wl-1 (Approved Exchanges)' },
          },
          {
            id: 'chg-leg-2-2',
            type: 'status_changed',
            description: 'Status changed from active to revoked',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-10-15T08:00:00Z',
            previousValue: 'active',
            newValue: 'revoked',
          },
        ],
      },
    ],
  },
  {
    id: 'wl-7',
    name: 'Q4 Trading Partners',
    description: 'Temporary whitelist for Q4 trading operations',
    status: 'expired',
    type: 'vault-specific',
    vaultId: 'vault-2',
    vaultName: 'Trading Vault',
    entries: counterpartyEntries.slice(0, 2),
    createdAt: '2024-10-01',
    createdBy: 'Frank Lee',
    updatedAt: '2024-12-31',
    expiresAt: '2024-12-31',
    approvedBy: ['Frank Lee', 'Eve Johnson'],
    currentVersion: 2,
    versions: [
      {
        version: 1,
        createdAt: '2024-10-01T09:00:00Z',
        createdBy: 'Frank Lee',
        status: 'pending',
        comment: 'Temporary Q4 trading whitelist',
        changes: [
          {
            id: 'chg-q4-1-1',
            type: 'created',
            description: 'Whitelist created with Q4 2024 expiration',
            changedBy: 'Frank Lee',
            changedByEmail: 'frank.lee@company.com',
            changedAt: '2024-10-01T09:00:00Z',
            metadata: { expiresAt: '2024-12-31' },
          },
          {
            id: 'chg-q4-1-2',
            type: 'entry_added',
            description: 'Added Circle Treasury',
            changedBy: 'Frank Lee',
            changedByEmail: 'frank.lee@company.com',
            changedAt: '2024-10-01T09:10:00Z',
            newValue: '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41',
          },
          {
            id: 'chg-q4-1-3',
            type: 'entry_added',
            description: 'Added Fireblocks Omnibus',
            changedBy: 'Frank Lee',
            changedByEmail: 'frank.lee@company.com',
            changedAt: '2024-10-01T09:11:00Z',
            newValue: '0x5754284f345afc66a98fbb0a0afe71e0f007b949',
          },
        ],
      },
      {
        version: 2,
        createdAt: '2024-12-31T23:59:59Z',
        createdBy: 'System',
        status: 'expired',
        comment: 'Whitelist expired per configured expiration date',
        changes: [
          {
            id: 'chg-q4-2-1',
            type: 'expired',
            description: 'Whitelist expired automatically',
            changedBy: 'System',
            changedAt: '2024-12-31T23:59:59Z',
          },
          {
            id: 'chg-q4-2-2',
            type: 'status_changed',
            description: 'Status changed from active to expired',
            changedBy: 'System',
            changedAt: '2024-12-31T23:59:59Z',
            previousValue: 'active',
            newValue: 'expired',
          },
        ],
      },
    ],
  },
];

// Helper functions
export const getWhitelistById = (id: string): Whitelist | undefined => {
  return allWhitelists.find((wl) => wl.id === id);
};

export const getWhitelistsByStatus = (status: WhitelistStatus): Whitelist[] => {
  return allWhitelists.filter((wl) => wl.status === status);
};

export const getWhitelistsByType = (
  type: 'global' | 'vault-specific'
): Whitelist[] => {
  return allWhitelists.filter((wl) => wl.type === type);
};

export const getTotalEntries = (): number => {
  return allWhitelists.reduce((sum, wl) => sum + wl.entries.length, 0);
};

export const getAvailableChains = (): string[] => {
  const chains = new Set<string>();
  allWhitelists.forEach((wl) => {
    wl.entries.forEach((entry) => chains.add(entry.chain));
  });
  return Array.from(chains).sort();
};
