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

// =============================================================================
// VERSIONING TYPES
// =============================================================================

// Policy version status
// - draft: Version is being edited, not yet submitted for approval
// - pending: Submitted for approval, can be edited but edits reset all approvals
// - active: Fully approved and is the current master version (immutable)
// - superseded: Previously active, replaced by a newer version (immutable)
export type PolicyVersionStatus = 'draft' | 'pending' | 'active' | 'superseded';

// Change type for audit trail
export type PolicyChangeType =
  | 'policy_created'
  | 'name_updated'
  | 'description_updated'
  | 'spending_limit_added'
  | 'spending_limit_removed'
  | 'spending_limit_modified'
  | 'velocity_limit_added'
  | 'velocity_limit_removed'
  | 'velocity_limit_modified'
  | 'time_restriction_added'
  | 'time_restriction_removed'
  | 'time_restriction_modified'
  | 'asset_restriction_added'
  | 'asset_restriction_removed'
  | 'asset_restriction_modified'
  | 'approval_requirement_modified'
  | 'whitelist_added'
  | 'whitelist_removed'
  | 'status_changed'
  | 'submitted_for_approval'
  | 'approved'
  | 'approvals_reset';

// Individual change record for audit trail
export type PolicyChange = {
  id: string;
  type: PolicyChangeType;
  description: string;
  changedBy: string;
  changedByEmail?: string;
  changedAt: string;
  previousValue?: string;
  newValue?: string;
  metadata?: Record<string, string>;
};

// Policy rules snapshot for version
export type PolicyRulesSnapshot = {
  approvalType: ApprovalType;
  approvalRequirement: ApprovalRequirement;
  spendingLimits?: SpendingLimit[];
  timeRestrictions?: TimeRestriction;
  assetRestrictions?: AssetRestriction;
  whitelistRequired: boolean;
  whitelistIds?: string[];
};

// Version snapshot
export type PolicyVersion = {
  version: number;
  createdAt: string;
  createdBy: string;
  changes: PolicyChange[];
  status: PolicyVersionStatus;
  requiredApprovals?: number;
  approvedBy?: string[];
  approvedAt?: string;
  activatedAt?: string;
  comment?: string;
  // Snapshot of policy rules at this version
  rules: PolicyRulesSnapshot;
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

  // Policy rules (current active version)
  approvalType: ApprovalType;
  approvalRequirement: ApprovalRequirement;
  spendingLimits?: SpendingLimit[];
  timeRestrictions?: TimeRestriction;
  assetRestrictions?: AssetRestriction;
  whitelistRequired: boolean;
  whitelistIds?: string[];

  // Versioning
  currentVersion: number;
  draftVersion?: number;
  versions: PolicyVersion[];

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
    currentVersion: 2,
    draftVersion: 3, // Has a draft version being prepared
    versions: [
      {
        version: 1,
        createdAt: '2024-08-01T09:00:00Z',
        createdBy: 'Alice Chen',
        status: 'superseded',
        approvedBy: ['Alice Chen', 'Bob Martinez', 'Charlie Kim'],
        approvedAt: '2024-08-10T14:00:00Z',
        activatedAt: '2024-08-10T14:00:00Z',
        comment: 'Initial high value transfer policy',
        rules: {
          approvalType: 'threshold',
          approvalRequirement: {
            minApprovers: 2,
            totalApprovers: 4,
            approverGroups: ['executives'],
            timeoutHours: 48,
          },
          spendingLimits: [
            { amount: '50000', currency: 'USD', timeWindow: 'per-transaction' },
          ],
          whitelistRequired: true,
          whitelistIds: ['wl-1'],
        },
        changes: [
          {
            id: 'chg-pol1-1-1',
            type: 'policy_created',
            description: 'Policy created',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-08-01T09:00:00Z',
          },
          {
            id: 'chg-pol1-1-2',
            type: 'spending_limit_added',
            description: 'Added $50,000 per-transaction limit',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-08-01T09:15:00Z',
            newValue: '$50,000 per transaction',
          },
          {
            id: 'chg-pol1-1-3',
            type: 'submitted_for_approval',
            description: 'Submitted for approval',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-08-05T10:00:00Z',
          },
          {
            id: 'chg-pol1-1-4',
            type: 'approved',
            description: 'Policy approved by Alice Chen',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-08-08T11:00:00Z',
          },
          {
            id: 'chg-pol1-1-5',
            type: 'approved',
            description: 'Policy approved by Bob Martinez',
            changedBy: 'Bob Martinez',
            changedByEmail: 'bob.martinez@company.com',
            changedAt: '2024-08-09T14:00:00Z',
          },
          {
            id: 'chg-pol1-1-6',
            type: 'approved',
            description: 'Policy approved by Charlie Kim',
            changedBy: 'Charlie Kim',
            changedByEmail: 'charlie.kim@company.com',
            changedAt: '2024-08-10T14:00:00Z',
          },
        ],
      },
      {
        version: 2,
        createdAt: '2024-10-15T10:00:00Z',
        createdBy: 'Alice Chen',
        status: 'active',
        approvedBy: ['Alice Chen', 'Bob Martinez', 'Charlie Kim'],
        approvedAt: '2024-11-01T16:00:00Z',
        activatedAt: '2024-11-01T16:00:00Z',
        comment: 'Increased limits and added treasury team approvers',
        rules: {
          approvalType: 'threshold',
          approvalRequirement: {
            minApprovers: 3,
            totalApprovers: 5,
            approverGroups: ['executives', 'treasury-team'],
            timeoutHours: 24,
          },
          spendingLimits: [
            {
              amount: '100000',
              currency: 'USD',
              timeWindow: 'per-transaction',
            },
          ],
          whitelistRequired: true,
          whitelistIds: ['wl-1', 'wl-3'],
        },
        changes: [
          {
            id: 'chg-pol1-2-1',
            type: 'spending_limit_modified',
            description:
              'Increased per-transaction limit from $50,000 to $100,000',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-10-15T10:00:00Z',
            previousValue: '$50,000 per transaction',
            newValue: '$100,000 per transaction',
          },
          {
            id: 'chg-pol1-2-2',
            type: 'approval_requirement_modified',
            description: 'Changed approval requirement from 2-of-4 to 3-of-5',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-10-15T10:30:00Z',
            previousValue: '2-of-4 executives',
            newValue: '3-of-5 executives, treasury-team',
          },
          {
            id: 'chg-pol1-2-3',
            type: 'whitelist_added',
            description: 'Added Institutional Counterparties whitelist',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-10-15T11:00:00Z',
            newValue: 'wl-3',
          },
          {
            id: 'chg-pol1-2-4',
            type: 'submitted_for_approval',
            description: 'Submitted for approval',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-10-20T09:00:00Z',
          },
          {
            id: 'chg-pol1-2-5',
            type: 'approved',
            description: 'Policy approved by Alice Chen',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-10-25T10:00:00Z',
          },
          {
            id: 'chg-pol1-2-6',
            type: 'approved',
            description: 'Policy approved by Bob Martinez',
            changedBy: 'Bob Martinez',
            changedByEmail: 'bob.martinez@company.com',
            changedAt: '2024-10-28T14:00:00Z',
          },
          {
            id: 'chg-pol1-2-7',
            type: 'approved',
            description: 'Policy approved by Charlie Kim',
            changedBy: 'Charlie Kim',
            changedByEmail: 'charlie.kim@company.com',
            changedAt: '2024-11-01T16:00:00Z',
          },
          {
            id: 'chg-pol1-2-8',
            type: 'status_changed',
            description: 'Status changed from pending to active',
            changedBy: 'System',
            changedAt: '2024-11-01T16:00:00Z',
            previousValue: 'pending',
            newValue: 'active',
          },
        ],
      },
      {
        version: 3,
        createdAt: '2025-01-08T09:00:00Z',
        createdBy: 'Diana Ross',
        status: 'draft',
        comment: 'Adding daily velocity limit',
        rules: {
          approvalType: 'threshold',
          approvalRequirement: {
            minApprovers: 3,
            totalApprovers: 5,
            approverGroups: ['executives', 'treasury-team'],
            timeoutHours: 24,
          },
          spendingLimits: [
            {
              amount: '100000',
              currency: 'USD',
              timeWindow: 'per-transaction',
            },
            { amount: '500000', currency: 'USD', timeWindow: 'daily' },
          ],
          whitelistRequired: true,
          whitelistIds: ['wl-1', 'wl-3'],
        },
        changes: [
          {
            id: 'chg-pol1-3-1',
            type: 'spending_limit_added',
            description: 'Added $500,000 daily limit',
            changedBy: 'Diana Ross',
            changedByEmail: 'diana.ross@company.com',
            changedAt: '2025-01-08T09:00:00Z',
            newValue: '$500,000 per day',
          },
        ],
      },
    ],
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
    currentVersion: 1,
    versions: [
      {
        version: 1,
        createdAt: '2024-08-01T10:00:00Z',
        createdBy: 'Alice Chen',
        status: 'active',
        approvedBy: ['Alice Chen', 'Bob Martinez'],
        approvedAt: '2024-08-15T11:00:00Z',
        activatedAt: '2024-08-15T11:00:00Z',
        comment: 'Standard transfer policy for routine operations',
        rules: {
          approvalType: 'threshold',
          approvalRequirement: {
            minApprovers: 2,
            totalApprovers: 3,
            approverGroups: ['treasury-team'],
            timeoutHours: 12,
          },
          spendingLimits: [
            {
              amount: '100000',
              currency: 'USD',
              timeWindow: 'per-transaction',
            },
            { amount: '500000', currency: 'USD', timeWindow: 'daily' },
          ],
          whitelistRequired: true,
          whitelistIds: ['wl-1', 'wl-2', 'wl-3'],
        },
        changes: [
          {
            id: 'chg-pol2-1-1',
            type: 'policy_created',
            description: 'Policy created',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-08-01T10:00:00Z',
          },
          {
            id: 'chg-pol2-1-2',
            type: 'submitted_for_approval',
            description: 'Submitted for approval',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-08-10T09:00:00Z',
          },
          {
            id: 'chg-pol2-1-3',
            type: 'approved',
            description: 'Policy approved by Alice Chen',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-08-12T10:00:00Z',
          },
          {
            id: 'chg-pol2-1-4',
            type: 'approved',
            description: 'Policy approved by Bob Martinez',
            changedBy: 'Bob Martinez',
            changedByEmail: 'bob.martinez@company.com',
            changedAt: '2024-08-15T11:00:00Z',
          },
        ],
      },
    ],
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
    currentVersion: 1,
    versions: [
      {
        version: 1,
        createdAt: '2024-09-01T08:00:00Z',
        createdBy: 'Charlie Kim',
        status: 'active',
        approvedBy: ['Charlie Kim', 'Diana Ross', 'Alice Chen'],
        approvedAt: '2024-09-10T15:00:00Z',
        activatedAt: '2024-09-10T15:00:00Z',
        comment: 'DeFi operations policy with chain restrictions',
        rules: {
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
        },
        changes: [
          {
            id: 'chg-pol3-1-1',
            type: 'policy_created',
            description: 'Policy created for DeFi operations',
            changedBy: 'Charlie Kim',
            changedByEmail: 'charlie.kim@company.com',
            changedAt: '2024-09-01T08:00:00Z',
          },
          {
            id: 'chg-pol3-1-2',
            type: 'asset_restriction_added',
            description:
              'Added chain restrictions: Ethereum, Polygon, Arbitrum',
            changedBy: 'Charlie Kim',
            changedByEmail: 'charlie.kim@company.com',
            changedAt: '2024-09-01T08:30:00Z',
            newValue: 'Ethereum, Polygon, Arbitrum',
          },
          {
            id: 'chg-pol3-1-3',
            type: 'submitted_for_approval',
            description: 'Submitted for approval',
            changedBy: 'Charlie Kim',
            changedByEmail: 'charlie.kim@company.com',
            changedAt: '2024-09-05T10:00:00Z',
          },
          {
            id: 'chg-pol3-1-4',
            type: 'approved',
            description: 'Policy approved by Charlie Kim',
            changedBy: 'Charlie Kim',
            changedByEmail: 'charlie.kim@company.com',
            changedAt: '2024-09-07T11:00:00Z',
          },
          {
            id: 'chg-pol3-1-5',
            type: 'approved',
            description: 'Policy approved by Diana Ross',
            changedBy: 'Diana Ross',
            changedByEmail: 'diana.ross@company.com',
            changedAt: '2024-09-08T14:00:00Z',
          },
          {
            id: 'chg-pol3-1-6',
            type: 'approved',
            description: 'Policy approved by Alice Chen',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-09-10T15:00:00Z',
          },
        ],
      },
    ],
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
    currentVersion: 1,
    versions: [
      {
        version: 1,
        createdAt: '2024-10-01T09:00:00Z',
        createdBy: 'Bob Martinez',
        status: 'active',
        approvedBy: ['Bob Martinez', 'Alice Chen', 'Eve Johnson'],
        approvedAt: '2024-10-15T16:00:00Z',
        activatedAt: '2024-10-15T16:00:00Z',
        comment: 'Treasury vault policy with business hours and tiered limits',
        rules: {
          approvalType: 'tiered',
          approvalRequirement: {
            minApprovers: 2,
            totalApprovers: 5,
            approverGroups: ['executives', 'treasury-team', 'compliance'],
            timeoutHours: 48,
          },
          spendingLimits: [
            {
              amount: '250000',
              currency: 'USD',
              timeWindow: 'per-transaction',
            },
            { amount: '1000000', currency: 'USD', timeWindow: 'daily' },
            { amount: '5000000', currency: 'USD', timeWindow: 'weekly' },
          ],
          timeRestrictions: {
            allowedDays: [1, 2, 3, 4, 5],
            startHour: 9,
            endHour: 17,
            timezone: 'America/New_York',
          },
          whitelistRequired: true,
          whitelistIds: ['wl-4'],
        },
        changes: [
          {
            id: 'chg-pol4-1-1',
            type: 'policy_created',
            description: 'Policy created for Treasury Operations vault',
            changedBy: 'Bob Martinez',
            changedByEmail: 'bob.martinez@company.com',
            changedAt: '2024-10-01T09:00:00Z',
          },
          {
            id: 'chg-pol4-1-2',
            type: 'time_restriction_added',
            description:
              'Added business hours restriction: Mon-Fri 9AM-5PM EST',
            changedBy: 'Bob Martinez',
            changedByEmail: 'bob.martinez@company.com',
            changedAt: '2024-10-01T09:30:00Z',
            newValue: 'Mon-Fri 9:00-17:00 America/New_York',
          },
          {
            id: 'chg-pol4-1-3',
            type: 'submitted_for_approval',
            description: 'Submitted for approval',
            changedBy: 'Bob Martinez',
            changedByEmail: 'bob.martinez@company.com',
            changedAt: '2024-10-05T10:00:00Z',
          },
          {
            id: 'chg-pol4-1-4',
            type: 'approved',
            description: 'Policy approved by Bob Martinez',
            changedBy: 'Bob Martinez',
            changedByEmail: 'bob.martinez@company.com',
            changedAt: '2024-10-10T11:00:00Z',
          },
          {
            id: 'chg-pol4-1-5',
            type: 'approved',
            description: 'Policy approved by Alice Chen',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-10-12T14:00:00Z',
          },
          {
            id: 'chg-pol4-1-6',
            type: 'approved',
            description: 'Policy approved by Eve Johnson',
            changedBy: 'Eve Johnson',
            changedByEmail: 'eve.johnson@company.com',
            changedAt: '2024-10-15T16:00:00Z',
          },
        ],
      },
    ],
  },
  {
    id: 'pol-5',
    name: 'Stablecoin Policy',
    description:
      'Specialized policy for USDC/USDT transfers with reduced approval requirements',
    status: 'pending',
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
    updatedAt: '2025-01-09',
    activatedAt: undefined,
    lastTriggered: undefined,
    triggerCount: 0,
    currentVersion: 1,
    versions: [
      {
        version: 1,
        createdAt: '2024-09-15T11:00:00Z',
        createdBy: 'Diana Ross',
        status: 'pending',
        requiredApprovals: 3,
        approvedBy: ['Diana Ross'], // 1 of 3 approvals (after reset)
        comment: 'Stablecoin policy - awaiting approval after edit',
        rules: {
          approvalType: 'threshold',
          approvalRequirement: {
            minApprovers: 1,
            totalApprovers: 2,
            approverGroups: ['treasury-team'],
            timeoutHours: 4,
          },
          spendingLimits: [
            {
              amount: '500000',
              currency: 'USD',
              timeWindow: 'per-transaction',
            },
            { amount: '2000000', currency: 'USD', timeWindow: 'daily' },
          ],
          assetRestrictions: {
            allowedAssets: ['USDC', 'USDT', 'DAI', 'BUSD'],
          },
          whitelistRequired: true,
          whitelistIds: ['wl-1', 'wl-3'],
        },
        changes: [
          {
            id: 'chg-pol5-1-1',
            type: 'policy_created',
            description: 'Policy created for stablecoin operations',
            changedBy: 'Diana Ross',
            changedByEmail: 'diana.ross@company.com',
            changedAt: '2024-09-15T11:00:00Z',
          },
          {
            id: 'chg-pol5-1-2',
            type: 'asset_restriction_added',
            description: 'Added allowed assets: USDC, USDT, DAI, BUSD',
            changedBy: 'Diana Ross',
            changedByEmail: 'diana.ross@company.com',
            changedAt: '2024-09-15T11:30:00Z',
            newValue: 'USDC, USDT, DAI, BUSD',
          },
          {
            id: 'chg-pol5-1-3',
            type: 'submitted_for_approval',
            description: 'Submitted for approval',
            changedBy: 'Diana Ross',
            changedByEmail: 'diana.ross@company.com',
            changedAt: '2024-09-20T09:00:00Z',
          },
          {
            id: 'chg-pol5-1-4',
            type: 'approved',
            description: 'Policy approved by Diana Ross',
            changedBy: 'Diana Ross',
            changedByEmail: 'diana.ross@company.com',
            changedAt: '2024-09-22T10:00:00Z',
          },
          {
            id: 'chg-pol5-1-5',
            type: 'approved',
            description: 'Policy approved by Alice Chen',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-09-25T14:00:00Z',
          },
          // Edit made while pending - resets approvals
          {
            id: 'chg-pol5-1-6',
            type: 'spending_limit_modified',
            description: 'Increased daily limit from $1,000,000 to $2,000,000',
            changedBy: 'Diana Ross',
            changedByEmail: 'diana.ross@company.com',
            changedAt: '2025-01-09T10:00:00Z',
            previousValue: '$1,000,000 per day',
            newValue: '$2,000,000 per day',
          },
          {
            id: 'chg-pol5-1-7',
            type: 'approvals_reset',
            description: 'All approvals dismissed due to edit while pending',
            changedBy: 'System',
            changedAt: '2025-01-09T10:00:00Z',
            metadata: {
              resetBy: 'Diana Ross',
              previousApprovals: 'Diana Ross, Alice Chen',
              reason: 'Content modified after approvals were given',
            },
          },
          {
            id: 'chg-pol5-1-8',
            type: 'approved',
            description: 'Policy approved by Diana Ross',
            changedBy: 'Diana Ross',
            changedByEmail: 'diana.ross@company.com',
            changedAt: '2025-01-09T10:30:00Z',
          },
        ],
      },
    ],
  },
  {
    id: 'pol-6',
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
    currentVersion: 1,
    versions: [
      {
        version: 1,
        createdAt: '2024-07-15T00:00:00Z',
        createdBy: 'System Admin',
        status: 'active',
        approvedBy: ['System Admin'],
        approvedAt: '2024-07-20T00:00:00Z',
        activatedAt: '2024-07-20T00:00:00Z',
        comment: 'Emergency transfer policy - executive override',
        rules: {
          approvalType: 'any',
          approvalRequirement: {
            minApprovers: 1,
            totalApprovers: 3,
            approverGroups: ['executives'],
            timeoutHours: 1,
          },
          spendingLimits: [
            {
              amount: '1000000',
              currency: 'USD',
              timeWindow: 'per-transaction',
            },
          ],
          whitelistRequired: false,
        },
        changes: [
          {
            id: 'chg-pol6-1-1',
            type: 'policy_created',
            description: 'Emergency policy created by system admin',
            changedBy: 'System Admin',
            changedAt: '2024-07-15T00:00:00Z',
          },
        ],
      },
    ],
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
    currentVersion: 1,
    versions: [
      {
        version: 1,
        createdAt: '2024-06-01T10:00:00Z',
        createdBy: 'Frank Lee',
        status: 'active',
        approvedBy: ['Frank Lee', 'Alice Chen', 'Bob Martinez'],
        approvedAt: '2024-06-15T16:00:00Z',
        activatedAt: '2024-06-15T16:00:00Z',
        comment: 'High-security BTC cold storage policy - unanimous approval',
        rules: {
          approvalType: 'unanimous',
          approvalRequirement: {
            minApprovers: 3,
            totalApprovers: 3,
            approverGroups: ['executives'],
            timeoutHours: 72,
          },
          spendingLimits: [
            {
              amount: '10000000',
              currency: 'USD',
              timeWindow: 'per-transaction',
            },
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
        },
        changes: [
          {
            id: 'chg-pol7-1-1',
            type: 'policy_created',
            description: 'High-security BTC policy created',
            changedBy: 'Frank Lee',
            changedByEmail: 'frank.lee@company.com',
            changedAt: '2024-06-01T10:00:00Z',
          },
          {
            id: 'chg-pol7-1-2',
            type: 'submitted_for_approval',
            description: 'Submitted for approval',
            changedBy: 'Frank Lee',
            changedByEmail: 'frank.lee@company.com',
            changedAt: '2024-06-05T09:00:00Z',
          },
          {
            id: 'chg-pol7-1-3',
            type: 'approved',
            description: 'Policy approved by Frank Lee',
            changedBy: 'Frank Lee',
            changedByEmail: 'frank.lee@company.com',
            changedAt: '2024-06-08T10:00:00Z',
          },
          {
            id: 'chg-pol7-1-4',
            type: 'approved',
            description: 'Policy approved by Alice Chen',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-06-12T14:00:00Z',
          },
          {
            id: 'chg-pol7-1-5',
            type: 'approved',
            description: 'Policy approved by Bob Martinez',
            changedBy: 'Bob Martinez',
            changedByEmail: 'bob.martinez@company.com',
            changedAt: '2024-06-15T16:00:00Z',
          },
        ],
      },
    ],
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
    currentVersion: 1,
    versions: [
      {
        version: 1,
        createdAt: '2024-12-01T14:00:00Z',
        createdBy: 'Grace Wang',
        status: 'draft',
        comment: 'Draft policy for Polygon L2 operations',
        rules: {
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
        },
        changes: [
          {
            id: 'chg-pol8-1-1',
            type: 'policy_created',
            description: 'Draft policy created for Polygon L2',
            changedBy: 'Grace Wang',
            changedByEmail: 'grace.wang@company.com',
            changedAt: '2024-12-01T14:00:00Z',
          },
          {
            id: 'chg-pol8-1-2',
            type: 'asset_restriction_added',
            description: 'Added chain restriction: Polygon only',
            changedBy: 'Grace Wang',
            changedByEmail: 'grace.wang@company.com',
            changedAt: '2024-12-01T14:30:00Z',
            newValue: 'Polygon',
          },
        ],
      },
    ],
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
    currentVersion: 1,
    versions: [
      {
        version: 1,
        createdAt: '2024-03-01T00:00:00Z',
        createdBy: 'System Admin',
        status: 'superseded',
        comment: 'Deprecated - replaced by new policy framework',
        rules: {
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
        },
        changes: [
          {
            id: 'chg-pol9-1-1',
            type: 'policy_created',
            description: 'Legacy trading policy',
            changedBy: 'System Admin',
            changedAt: '2024-03-01T00:00:00Z',
          },
          {
            id: 'chg-pol9-1-2',
            type: 'status_changed',
            description: 'Policy disabled - migrated to new framework',
            changedBy: 'Alice Chen',
            changedByEmail: 'alice.chen@company.com',
            changedAt: '2024-09-01T10:00:00Z',
            previousValue: 'active',
            newValue: 'disabled',
          },
        ],
      },
    ],
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
    currentVersion: 1,
    versions: [
      {
        version: 1,
        createdAt: '2024-12-10T09:00:00Z',
        createdBy: 'Charlie Kim',
        status: 'pending',
        requiredApprovals: 3,
        approvedBy: ['Charlie Kim', 'Diana Ross'],
        comment: 'Cross-chain bridge policy with security team review',
        rules: {
          approvalType: 'threshold',
          approvalRequirement: {
            minApprovers: 3,
            totalApprovers: 4,
            approverGroups: ['defi-team', 'security-team'],
            timeoutHours: 12,
          },
          spendingLimits: [
            {
              amount: '100000',
              currency: 'USD',
              timeWindow: 'per-transaction',
            },
            { amount: '500000', currency: 'USD', timeWindow: 'daily' },
          ],
          assetRestrictions: {
            allowedChains: ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism'],
          },
          whitelistRequired: true,
        },
        changes: [
          {
            id: 'chg-pol10-1-1',
            type: 'policy_created',
            description: 'Cross-chain bridge policy created',
            changedBy: 'Charlie Kim',
            changedByEmail: 'charlie.kim@company.com',
            changedAt: '2024-12-10T09:00:00Z',
          },
          {
            id: 'chg-pol10-1-2',
            type: 'asset_restriction_added',
            description:
              'Added allowed chains: Ethereum, Polygon, Arbitrum, Optimism',
            changedBy: 'Charlie Kim',
            changedByEmail: 'charlie.kim@company.com',
            changedAt: '2024-12-10T09:30:00Z',
            newValue: 'Ethereum, Polygon, Arbitrum, Optimism',
          },
          {
            id: 'chg-pol10-1-3',
            type: 'submitted_for_approval',
            description: 'Submitted for approval',
            changedBy: 'Charlie Kim',
            changedByEmail: 'charlie.kim@company.com',
            changedAt: '2024-12-15T10:00:00Z',
          },
          {
            id: 'chg-pol10-1-4',
            type: 'approved',
            description: 'Policy approved by Charlie Kim',
            changedBy: 'Charlie Kim',
            changedByEmail: 'charlie.kim@company.com',
            changedAt: '2024-12-16T11:00:00Z',
          },
          {
            id: 'chg-pol10-1-5',
            type: 'approved',
            description: 'Policy approved by Diana Ross',
            changedBy: 'Diana Ross',
            changedByEmail: 'diana.ross@company.com',
            changedAt: '2024-12-18T14:00:00Z',
          },
        ],
      },
    ],
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

// Get policy version by number
export const getPolicyVersion = (
  policy: TransactionPolicy,
  versionNumber: number
): PolicyVersion | undefined => {
  return policy.versions.find((v) => v.version === versionNumber);
};

// Get the current active version for a policy
export const getCurrentVersion = (
  policy: TransactionPolicy
): PolicyVersion | undefined => {
  return policy.versions.find((v) => v.status === 'active');
};

// Get the draft version for a policy (if exists)
export const getDraftVersion = (
  policy: TransactionPolicy
): PolicyVersion | undefined => {
  return policy.versions.find((v) => v.status === 'draft');
};

// Check if policy has pending changes
export const hasPendingChanges = (policy: TransactionPolicy): boolean => {
  return policy.versions.some(
    (v) => v.status === 'draft' || v.status === 'pending'
  );
};
