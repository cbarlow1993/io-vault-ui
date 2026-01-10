// Policy status
export type PolicyStatus = 'active' | 'pending' | 'disabled' | 'draft';

// Approval rule types
export type ApprovalType = 'threshold' | 'unanimous' | 'any' | 'tiered';

// Time window for limits
export type TimeWindow = 'per-transaction' | 'daily' | 'weekly' | 'monthly';

// Approval requirement
export type ApprovalRequirement = {
  minApprovers: number;
  totalApprovers: number;
  approverGroups?: string[];
  timeoutHours?: number;
};

// Spending limit
export type SpendingLimit = {
  amount: string;
  currency: string;
  timeWindow: TimeWindow;
};

// Time restriction
export type TimeRestriction = {
  allowedDays: number[]; // 0-6, Sunday = 0
  startHour: number; // 0-23
  endHour: number; // 0-23
  timezone: string;
};

// Asset restriction
export type AssetRestriction = {
  allowedAssets?: string[];
  blockedAssets?: string[];
  allowedChains?: string[];
  blockedChains?: string[];
};

// Transaction policy
export type TransactionPolicy = {
  id: string;
  name: string;
  description: string;
  status: PolicyStatus;
  priority: number; // Lower = higher priority
  scope: 'global' | 'vault' | 'address';
  vaultId?: string;
  vaultName?: string;
  addressId?: string;

  // Policy rules
  approvalType: ApprovalType;
  approvalRequirement: ApprovalRequirement;
  spendingLimits?: SpendingLimit[];
  timeRestrictions?: TimeRestriction;
  assetRestrictions?: AssetRestriction;
  whitelistRequired: boolean;
  whitelistIds?: string[];

  // Metadata
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  activatedAt?: string;
  lastTriggered?: string;
  triggerCount: number;
};

// All transaction policies
export const allTransactionPolicies: TransactionPolicy[] = [
  {
    id: 'pol-1',
    name: 'High Value Transfer Policy',
    description:
      'Requires 3-of-5 approval for transactions exceeding $100,000 USD equivalent',
    status: 'active',
    priority: 1,
    scope: 'global',
    approvalType: 'threshold',
    approvalRequirement: {
      minApprovers: 3,
      totalApprovers: 5,
      approverGroups: ['executives', 'treasury-team'],
      timeoutHours: 24,
    },
    spendingLimits: [
      { amount: '100000', currency: 'USD', timeWindow: 'per-transaction' },
    ],
    whitelistRequired: true,
    whitelistIds: ['wl-1', 'wl-3'],
    createdAt: '2024-08-01',
    createdBy: 'Alice Chen',
    updatedAt: '2024-11-01',
    activatedAt: '2024-08-15',
    lastTriggered: '2024-12-28',
    triggerCount: 47,
  },
  {
    id: 'pol-2',
    name: 'Standard Transfer Policy',
    description:
      'Default policy for transactions under $100,000 - requires 2-of-3 approval',
    status: 'active',
    priority: 2,
    scope: 'global',
    approvalType: 'threshold',
    approvalRequirement: {
      minApprovers: 2,
      totalApprovers: 3,
      approverGroups: ['treasury-team'],
      timeoutHours: 12,
    },
    spendingLimits: [
      { amount: '100000', currency: 'USD', timeWindow: 'per-transaction' },
      { amount: '500000', currency: 'USD', timeWindow: 'daily' },
    ],
    whitelistRequired: true,
    whitelistIds: ['wl-1', 'wl-2', 'wl-3'],
    createdAt: '2024-08-01',
    createdBy: 'Alice Chen',
    updatedAt: '2024-10-15',
    activatedAt: '2024-08-15',
    lastTriggered: '2024-12-30',
    triggerCount: 234,
  },
  {
    id: 'pol-3',
    name: 'DeFi Operations Policy',
    description:
      'Specialized policy for DeFi protocol interactions with contract verification',
    status: 'active',
    priority: 3,
    scope: 'global',
    approvalType: 'threshold',
    approvalRequirement: {
      minApprovers: 2,
      totalApprovers: 4,
      approverGroups: ['defi-team', 'treasury-team'],
      timeoutHours: 6,
    },
    spendingLimits: [
      { amount: '50000', currency: 'USD', timeWindow: 'per-transaction' },
      { amount: '200000', currency: 'USD', timeWindow: 'daily' },
    ],
    assetRestrictions: {
      allowedChains: ['Ethereum', 'Polygon', 'Arbitrum'],
    },
    whitelistRequired: true,
    whitelistIds: ['wl-2'],
    createdAt: '2024-09-01',
    createdBy: 'Charlie Kim',
    updatedAt: '2024-11-20',
    activatedAt: '2024-09-10',
    lastTriggered: '2024-12-29',
    triggerCount: 89,
  },
  {
    id: 'pol-4',
    name: 'Treasury Vault Policy',
    description:
      'Vault-specific policy for main treasury operations with business hours restriction',
    status: 'active',
    priority: 1,
    scope: 'vault',
    vaultId: 'vault-1',
    vaultName: 'Treasury Operations',
    approvalType: 'tiered',
    approvalRequirement: {
      minApprovers: 2,
      totalApprovers: 5,
      approverGroups: ['executives', 'treasury-team', 'compliance'],
      timeoutHours: 48,
    },
    spendingLimits: [
      { amount: '250000', currency: 'USD', timeWindow: 'per-transaction' },
      { amount: '1000000', currency: 'USD', timeWindow: 'daily' },
      { amount: '5000000', currency: 'USD', timeWindow: 'weekly' },
    ],
    timeRestrictions: {
      allowedDays: [1, 2, 3, 4, 5], // Mon-Fri
      startHour: 9,
      endHour: 17,
      timezone: 'America/New_York',
    },
    whitelistRequired: true,
    whitelistIds: ['wl-4'],
    createdAt: '2024-10-01',
    createdBy: 'Bob Martinez',
    updatedAt: '2024-12-01',
    activatedAt: '2024-10-15',
    lastTriggered: '2024-12-27',
    triggerCount: 156,
  },
  {
    id: 'pol-5',
    name: 'Emergency Transfer Policy',
    description:
      'Expedited approval for urgent transfers with executive override',
    status: 'active',
    priority: 0,
    scope: 'global',
    approvalType: 'any',
    approvalRequirement: {
      minApprovers: 1,
      totalApprovers: 3,
      approverGroups: ['executives'],
      timeoutHours: 1,
    },
    spendingLimits: [
      { amount: '1000000', currency: 'USD', timeWindow: 'per-transaction' },
    ],
    whitelistRequired: false,
    createdAt: '2024-07-15',
    createdBy: 'System Admin',
    updatedAt: '2024-08-01',
    activatedAt: '2024-07-20',
    lastTriggered: '2024-11-15',
    triggerCount: 3,
  },
  {
    id: 'pol-6',
    name: 'Stablecoin Policy',
    description:
      'Specialized policy for USDC/USDT transfers with reduced approval requirements',
    status: 'active',
    priority: 4,
    scope: 'global',
    approvalType: 'threshold',
    approvalRequirement: {
      minApprovers: 1,
      totalApprovers: 2,
      approverGroups: ['treasury-team'],
      timeoutHours: 4,
    },
    spendingLimits: [
      { amount: '500000', currency: 'USD', timeWindow: 'per-transaction' },
      { amount: '2000000', currency: 'USD', timeWindow: 'daily' },
    ],
    assetRestrictions: {
      allowedAssets: ['USDC', 'USDT', 'DAI', 'BUSD'],
    },
    whitelistRequired: true,
    whitelistIds: ['wl-1', 'wl-3'],
    createdAt: '2024-09-15',
    createdBy: 'Diana Ross',
    updatedAt: '2024-11-10',
    activatedAt: '2024-09-20',
    lastTriggered: '2024-12-30',
    triggerCount: 312,
  },
  {
    id: 'pol-7',
    name: 'Bitcoin Cold Storage Policy',
    description: 'High-security policy for Bitcoin cold storage movements',
    status: 'active',
    priority: 1,
    scope: 'vault',
    vaultId: 'vault-3',
    vaultName: 'BTC Cold Storage',
    approvalType: 'unanimous',
    approvalRequirement: {
      minApprovers: 3,
      totalApprovers: 3,
      approverGroups: ['executives'],
      timeoutHours: 72,
    },
    spendingLimits: [
      { amount: '10000000', currency: 'USD', timeWindow: 'per-transaction' },
      { amount: '10000000', currency: 'USD', timeWindow: 'monthly' },
    ],
    assetRestrictions: {
      allowedAssets: ['BTC'],
      allowedChains: ['Bitcoin'],
    },
    timeRestrictions: {
      allowedDays: [1, 2, 3, 4, 5],
      startHour: 10,
      endHour: 16,
      timezone: 'America/New_York',
    },
    whitelistRequired: true,
    whitelistIds: ['wl-3'],
    createdAt: '2024-06-01',
    createdBy: 'Frank Lee',
    updatedAt: '2024-10-01',
    activatedAt: '2024-06-15',
    lastTriggered: '2024-10-20',
    triggerCount: 8,
  },
  {
    id: 'pol-8',
    name: 'Polygon L2 Draft Policy',
    description: 'Draft policy for Polygon network operations - pending review',
    status: 'draft',
    priority: 5,
    scope: 'global',
    approvalType: 'threshold',
    approvalRequirement: {
      minApprovers: 2,
      totalApprovers: 3,
      approverGroups: ['treasury-team'],
      timeoutHours: 8,
    },
    spendingLimits: [
      { amount: '25000', currency: 'USD', timeWindow: 'per-transaction' },
    ],
    assetRestrictions: {
      allowedChains: ['Polygon'],
    },
    whitelistRequired: true,
    whitelistIds: ['wl-5'],
    createdAt: '2024-12-01',
    createdBy: 'Grace Wang',
    updatedAt: '2024-12-15',
    triggerCount: 0,
  },
  {
    id: 'pol-9',
    name: 'Legacy Trading Policy',
    description: 'Deprecated trading vault policy - replaced by new framework',
    status: 'disabled',
    priority: 10,
    scope: 'vault',
    vaultId: 'vault-2',
    vaultName: 'Trading Vault',
    approvalType: 'threshold',
    approvalRequirement: {
      minApprovers: 1,
      totalApprovers: 2,
      approverGroups: ['trading-team'],
      timeoutHours: 2,
    },
    spendingLimits: [
      { amount: '50000', currency: 'USD', timeWindow: 'per-transaction' },
    ],
    whitelistRequired: false,
    createdAt: '2024-03-01',
    createdBy: 'System Admin',
    updatedAt: '2024-09-01',
    triggerCount: 892,
  },
  {
    id: 'pol-10',
    name: 'Cross-Chain Bridge Policy',
    description:
      'Policy for cross-chain asset bridges with enhanced verification',
    status: 'pending',
    priority: 2,
    scope: 'global',
    approvalType: 'threshold',
    approvalRequirement: {
      minApprovers: 3,
      totalApprovers: 4,
      approverGroups: ['defi-team', 'security-team'],
      timeoutHours: 12,
    },
    spendingLimits: [
      { amount: '100000', currency: 'USD', timeWindow: 'per-transaction' },
      { amount: '500000', currency: 'USD', timeWindow: 'daily' },
    ],
    assetRestrictions: {
      allowedChains: ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism'],
    },
    whitelistRequired: true,
    createdAt: '2024-12-10',
    createdBy: 'Charlie Kim',
    updatedAt: '2024-12-20',
    triggerCount: 0,
  },
];

// Helper functions
export const getPolicyById = (id: string): TransactionPolicy | undefined => {
  return allTransactionPolicies.find((p) => p.id === id);
};

export const getPoliciesByStatus = (
  status: PolicyStatus
): TransactionPolicy[] => {
  return allTransactionPolicies.filter((p) => p.status === status);
};

export const getPoliciesByScope = (
  scope: 'global' | 'vault' | 'address'
): TransactionPolicy[] => {
  return allTransactionPolicies.filter((p) => p.scope === scope);
};

export const getActivePolicies = (): TransactionPolicy[] => {
  return allTransactionPolicies.filter((p) => p.status === 'active');
};

export const getTotalTriggerCount = (): number => {
  return allTransactionPolicies.reduce((sum, p) => sum + p.triggerCount, 0);
};

export const formatApprovalRequirement = (req: ApprovalRequirement): string => {
  return `${req.minApprovers}-of-${req.totalApprovers}`;
};

export const formatSpendingLimit = (limit: SpendingLimit): string => {
  const amount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: limit.currency,
    maximumFractionDigits: 0,
  }).format(Number(limit.amount));

  const windowLabels: Record<TimeWindow, string> = {
    'per-transaction': 'per tx',
    daily: '/day',
    weekly: '/week',
    monthly: '/month',
  };

  return `${amount} ${windowLabels[limit.timeWindow]}`;
};
