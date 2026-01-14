// Organization settings data types and sample data

// ============================================================================
// BILLING
// ============================================================================

export type BillingInterval = 'monthly' | 'annual';

export type PlanTier = 'starter' | 'pro' | 'enterprise';

export type Plan = {
  id: PlanTier;
  name: string;
  description: string;
  priceMonthly: number;
  priceAnnual: number;
  features: string[];
  limits: {
    vaults: number;
    members: number;
    workspaces: number;
  };
};

export const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'For small teams getting started',
    priceMonthly: 99,
    priceAnnual: 950,
    features: [
      'Up to 5 vaults',
      'Up to 10 team members',
      '1 workspace',
      'Email support',
      'Basic analytics',
    ],
    limits: { vaults: 5, members: 10, workspaces: 1 },
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For growing organizations',
    priceMonthly: 299,
    priceAnnual: 2870,
    features: [
      'Up to 25 vaults',
      'Up to 50 team members',
      'Up to 5 workspaces',
      'Priority support',
      'Advanced analytics',
      'Audit logs',
      'API access',
    ],
    limits: { vaults: 25, members: 50, workspaces: 5 },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large-scale operations',
    priceMonthly: 799,
    priceAnnual: 7670,
    features: [
      'Unlimited vaults',
      'Unlimited team members',
      'Unlimited workspaces',
      'Dedicated support',
      'Custom analytics',
      'Advanced audit logs',
      'Full API access',
      'SSO / SAML',
      'Custom integrations',
    ],
    limits: { vaults: -1, members: -1, workspaces: -1 }, // -1 = unlimited
  },
];

export const getPlanById = (id: PlanTier): Plan | undefined => {
  return plans.find((plan) => plan.id === id);
};

export type PaymentMethod = {
  id: string;
  type: 'visa' | 'mastercard' | 'amex';
  last4: string;
  expiry: string;
  isDefault: boolean;
};

export type InvoiceStatus = 'paid' | 'pending' | 'failed';

export type Invoice = {
  id: string;
  number: string;
  date: string;
  amount: number;
  status: InvoiceStatus;
  pdfUrl: string;
};

export type BillingInfo = {
  currentPlan: PlanTier;
  billingInterval: BillingInterval;
  nextBillingDate: string;
  paymentMethods: PaymentMethod[];
  invoices: Invoice[];
  usage: {
    vaults: number;
    members: number;
    workspaces: number;
  };
};

// Sample billing data
export const billingInfo: BillingInfo = {
  currentPlan: 'pro',
  billingInterval: 'monthly',
  nextBillingDate: '2026-02-10',
  paymentMethods: [
    {
      id: 'pm-001',
      type: 'visa',
      last4: '4242',
      expiry: '12/27',
      isDefault: true,
    },
    {
      id: 'pm-002',
      type: 'mastercard',
      last4: '8888',
      expiry: '06/26',
      isDefault: false,
    },
  ],
  invoices: [
    {
      id: 'inv-006',
      number: 'INV-2026-006',
      date: '2026-01-01',
      amount: 299,
      status: 'paid',
      pdfUrl: '#',
    },
    {
      id: 'inv-005',
      number: 'INV-2025-005',
      date: '2025-12-01',
      amount: 299,
      status: 'paid',
      pdfUrl: '#',
    },
    {
      id: 'inv-004',
      number: 'INV-2025-004',
      date: '2025-11-01',
      amount: 299,
      status: 'paid',
      pdfUrl: '#',
    },
    {
      id: 'inv-003',
      number: 'INV-2025-003',
      date: '2025-10-01',
      amount: 299,
      status: 'paid',
      pdfUrl: '#',
    },
    {
      id: 'inv-002',
      number: 'INV-2025-002',
      date: '2025-09-01',
      amount: 99,
      status: 'paid',
      pdfUrl: '#',
    },
    {
      id: 'inv-001',
      number: 'INV-2025-001',
      date: '2025-08-01',
      amount: 99,
      status: 'paid',
      pdfUrl: '#',
    },
  ],
  usage: {
    vaults: 12,
    members: 18,
    workspaces: 3,
  },
};

// ============================================================================
// MEMBERS
// ============================================================================

export type MemberStatus = 'active' | 'pending';

// Platform roles - organization-level access
export type PlatformRoleId =
  | 'owner'
  | 'admin'
  | 'billing'
  | 'member'
  | 'auditor';

export type PlatformRole = {
  id: PlatformRoleId;
  name: string;
  description: string;
};

export const platformRoles: PlatformRole[] = [
  {
    id: 'owner',
    name: 'Owner',
    description: 'Full organization access including deletion',
  },
  {
    id: 'admin',
    name: 'Admin',
    description: 'Manage members, teams, and organization settings',
  },
  {
    id: 'billing',
    name: 'Billing',
    description: 'Manage billing, subscriptions, and payments',
  },
  {
    id: 'member',
    name: 'Member',
    description: 'Standard member with workspace access',
  },
  {
    id: 'auditor',
    name: 'Auditor',
    description: 'Read-only access for compliance and audit',
  },
];

export const getPlatformRoleById = (
  id: PlatformRoleId
): PlatformRole | undefined => {
  return platformRoles.find((role) => role.id === id);
};

// Workspace roles - workspace-level access
export type WorkspaceRoleId =
  | 'owner'
  | 'admin'
  | 'operator'
  | 'signer'
  | 'viewer';

export type Member = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  platformRole: PlatformRoleId;
  status: MemberStatus;
  joinedAt: string;
  workspaceIds: string[];
};

// ============================================================================
// TEAMS
// ============================================================================

export type Team = {
  id: string;
  name: string;
  description?: string;
  memberIds: string[];
  createdAt: string;
  createdBy: string;
};

// Sample teams
export const teams: Team[] = [
  {
    id: 'team-001',
    name: 'Treasury Operations',
    description: 'Day-to-day treasury management and operations',
    memberIds: ['member-001', 'member-002', 'member-003', 'member-005'],
    createdAt: '2025-02-01',
    createdBy: 'Sarah Chen',
  },
  {
    id: 'team-002',
    name: 'Risk & Compliance',
    description: 'Risk assessment and regulatory compliance',
    memberIds: ['member-002', 'member-004', 'member-006'],
    createdAt: '2025-03-01',
    createdBy: 'Sarah Chen',
  },
  {
    id: 'team-003',
    name: 'Executive Leadership',
    description: 'Senior leadership oversight',
    memberIds: ['member-001', 'member-002'],
    createdAt: '2025-01-20',
    createdBy: 'Sarah Chen',
  },
];

export const getTeamById = (id: string): Team | undefined => {
  return teams.find((team) => team.id === id);
};

export const getTeamMembers = (teamId: string): Member[] => {
  const team = getTeamById(teamId);
  if (!team) return [];
  return members.filter((member) => team.memberIds.includes(member.id));
};

// ============================================================================
// WORKSPACE ROLES (for permission matrix)
// ============================================================================

// Alias for backward compatibility
export type RoleId = WorkspaceRoleId;

export type PermissionCategory =
  | 'organization'
  | 'workspaces'
  | 'vaults'
  | 'addresses'
  | 'operations'
  | 'identities';

export type Permission = {
  id: string;
  name: string;
  category: PermissionCategory;
};

export const permissions: Permission[] = [
  // Organization
  { id: 'org.billing.view', name: 'View billing', category: 'organization' },
  {
    id: 'org.billing.manage',
    name: 'Manage billing',
    category: 'organization',
  },
  {
    id: 'org.members.invite',
    name: 'Invite members',
    category: 'organization',
  },
  {
    id: 'org.members.remove',
    name: 'Remove members',
    category: 'organization',
  },
  {
    id: 'org.settings.manage',
    name: 'Manage org settings',
    category: 'organization',
  },
  // Workspaces
  { id: 'ws.create', name: 'Create workspaces', category: 'workspaces' },
  { id: 'ws.edit', name: 'Edit workspace settings', category: 'workspaces' },
  { id: 'ws.delete', name: 'Delete workspaces', category: 'workspaces' },
  {
    id: 'ws.members.manage',
    name: 'Manage workspace members',
    category: 'workspaces',
  },
  // Vaults
  { id: 'vault.view', name: 'View vaults', category: 'vaults' },
  { id: 'vault.create', name: 'Create vaults', category: 'vaults' },
  { id: 'vault.edit', name: 'Edit vaults', category: 'vaults' },
  { id: 'vault.archive', name: 'Archive vaults', category: 'vaults' },
  // Addresses
  { id: 'addr.view', name: 'View addresses', category: 'addresses' },
  { id: 'addr.create', name: 'Create addresses', category: 'addresses' },
  { id: 'addr.transfer', name: 'Initiate transfers', category: 'addresses' },
  // Operations
  { id: 'ops.view', name: 'View operations', category: 'operations' },
  { id: 'ops.initiate', name: 'Initiate operations', category: 'operations' },
  { id: 'ops.sign', name: 'Sign/approve operations', category: 'operations' },
  { id: 'ops.cancel', name: 'Cancel operations', category: 'operations' },
  // Identities
  { id: 'id.view', name: 'View identities', category: 'identities' },
  { id: 'id.create', name: 'Create identities', category: 'identities' },
  { id: 'id.edit', name: 'Edit identities', category: 'identities' },
  { id: 'id.verify', name: 'Verify identities', category: 'identities' },
];

export type WorkspaceRole = {
  id: WorkspaceRoleId;
  name: string;
  description: string;
  permissionIds: string[];
};

// Alias for backward compatibility
export type Role = WorkspaceRole;

export const roles: Role[] = [
  {
    id: 'owner',
    name: 'Owner',
    description: 'Full access including billing and organization deletion',
    permissionIds: permissions.map((p) => p.id), // All permissions
  },
  {
    id: 'admin',
    name: 'Admin',
    description: 'Manage workspace settings, members, and all resources',
    permissionIds: permissions
      .filter(
        (p) => !['org.billing.manage', 'org.settings.manage'].includes(p.id)
      )
      .map((p) => p.id),
  },
  {
    id: 'operator',
    name: 'Operator',
    description: 'Create vaults, addresses, and initiate transfers',
    permissionIds: [
      'org.billing.view',
      'vault.view',
      'vault.create',
      'vault.edit',
      'addr.view',
      'addr.create',
      'addr.transfer',
      'ops.view',
      'ops.initiate',
      'id.view',
      'id.create',
      'id.edit',
    ],
  },
  {
    id: 'signer',
    name: 'Signer',
    description: 'Approve and sign pending operations',
    permissionIds: [
      'vault.view',
      'addr.view',
      'ops.view',
      'ops.sign',
      'id.view',
    ],
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to all resources',
    permissionIds: ['vault.view', 'addr.view', 'ops.view', 'id.view'],
  },
];

export const getRoleById = (id: RoleId): Role | undefined => {
  return roles.find((role) => role.id === id);
};

export const roleHasPermission = (
  roleId: RoleId,
  permissionId: string
): boolean => {
  const role = getRoleById(roleId);
  return role?.permissionIds.includes(permissionId) ?? false;
};

// ============================================================================
// WORKSPACES
// ============================================================================

export type WorkspaceStatus = 'active' | 'archived';

// Team assignment to a workspace - all team members inherit this role
export type WorkspaceTeam = {
  teamId: string;
  role: WorkspaceRoleId;
  addedAt: string;
};

// Individual member override or direct assignment
// If isOverride is true, this overrides a team-inherited role
export type WorkspaceMember = {
  memberId: string;
  role: WorkspaceRoleId;
  addedAt: string;
  isOverride?: boolean; // true if overriding a team-inherited role
};

export type Workspace = {
  id: string;
  name: string;
  description?: string;
  status: WorkspaceStatus;
  teams: WorkspaceTeam[]; // Teams assigned to this workspace
  members: WorkspaceMember[]; // Direct members or individual overrides
  createdAt: string;
  createdBy: string;
  stats: {
    vaults: number;
    addresses: number;
    totalBalance: string;
  };
};

// Sample workspaces
export const workspaces: Workspace[] = [
  {
    id: 'ws-001',
    name: 'Production Treasury',
    description: 'Main production environment for treasury operations',
    status: 'active',
    teams: [
      { teamId: 'team-001', role: 'operator', addedAt: '2025-02-15' }, // Treasury Operations team
    ],
    members: [
      { memberId: 'member-001', role: 'owner', addedAt: '2025-01-15' },
      {
        memberId: 'member-002',
        role: 'admin',
        addedAt: '2025-02-20',
        isOverride: true,
      }, // Override from team-001 (operator -> admin)
      { memberId: 'member-004', role: 'signer', addedAt: '2025-03-15' }, // Direct member
      { memberId: 'member-006', role: 'viewer', addedAt: '2025-04-20' }, // Direct member
    ],
    createdAt: '2025-01-15',
    createdBy: 'Sarah Chen',
    stats: { vaults: 8, addresses: 24, totalBalance: '$2,450,000' },
  },
  {
    id: 'ws-002',
    name: 'Sandbox',
    description: 'Testing and development environment',
    status: 'active',
    teams: [
      { teamId: 'team-002', role: 'operator', addedAt: '2025-03-15' }, // Risk & Compliance team
    ],
    members: [
      { memberId: 'member-001', role: 'owner', addedAt: '2025-02-01' },
      {
        memberId: 'member-006',
        role: 'admin',
        addedAt: '2025-04-25',
        isOverride: true,
      }, // Override from team-002 (operator -> admin)
    ],
    createdAt: '2025-02-01',
    createdBy: 'Sarah Chen',
    stats: { vaults: 3, addresses: 8, totalBalance: '$50,000' },
  },
  {
    id: 'ws-003',
    name: 'Client: Acme Corp',
    description: 'Dedicated workspace for Acme Corp treasury management',
    status: 'active',
    teams: [
      { teamId: 'team-003', role: 'viewer', addedAt: '2025-06-01' }, // Executive Leadership team
    ],
    members: [
      {
        memberId: 'member-001',
        role: 'owner',
        addedAt: '2025-06-01',
        isOverride: true,
      }, // Override from team-003 (viewer -> owner)
      { memberId: 'member-004', role: 'signer', addedAt: '2025-06-05' }, // Direct member
    ],
    createdAt: '2025-06-01',
    createdBy: 'Sarah Chen',
    stats: { vaults: 2, addresses: 6, totalBalance: '$890,000' },
  },
];

export const getWorkspaceById = (id: string): Workspace | undefined => {
  return workspaces.find((ws) => ws.id === id);
};

// Extended workspace member type with source information
export type EffectiveWorkspaceMember = Member & {
  workspaceRole: WorkspaceRoleId;
  source: 'direct' | 'team' | 'override';
  sourceTeamId?: string; // If source is 'team' or 'override', the team this came from
  inheritedRole?: WorkspaceRoleId; // If source is 'override', the original team-inherited role
};

/**
 * Get all effective members of a workspace, accounting for:
 * - Team assignments (all team members inherit the team's workspace role)
 * - Direct member assignments
 * - Individual overrides (a member can have a different role than their team assignment)
 *
 * Priority:
 * 1. Direct members (not part of any assigned team) are included directly
 * 2. Team members inherit the team's role unless they have an override
 * 3. Overrides take precedence over team-inherited roles
 */
export const getWorkspaceMembers = (
  workspaceId: string
): EffectiveWorkspaceMember[] => {
  const workspace = getWorkspaceById(workspaceId);
  if (!workspace) return [];

  const effectiveMembers: Map<string, EffectiveWorkspaceMember> = new Map();

  // First, add all team members with their inherited roles
  for (const teamAssignment of workspace.teams) {
    const team = getTeamById(teamAssignment.teamId);
    if (!team) continue;

    for (const memberId of team.memberIds) {
      const member = getMemberById(memberId);
      if (!member) continue;

      // Only add if not already present (first team assignment wins)
      if (!effectiveMembers.has(memberId)) {
        effectiveMembers.set(memberId, {
          ...member,
          workspaceRole: teamAssignment.role,
          source: 'team',
          sourceTeamId: teamAssignment.teamId,
        });
      }
    }
  }

  // Then, process direct members and overrides
  for (const wm of workspace.members) {
    const member = getMemberById(wm.memberId);
    if (!member) continue;

    const existingEntry = effectiveMembers.get(wm.memberId);

    if (wm.isOverride && existingEntry?.source === 'team') {
      // This is an override of a team-inherited role
      effectiveMembers.set(wm.memberId, {
        ...member,
        workspaceRole: wm.role,
        source: 'override',
        sourceTeamId: existingEntry.sourceTeamId,
        inheritedRole: existingEntry.workspaceRole,
      });
    } else if (!existingEntry) {
      // Direct member (not in any assigned team)
      effectiveMembers.set(wm.memberId, {
        ...member,
        workspaceRole: wm.role,
        source: 'direct',
      });
    }
  }

  return Array.from(effectiveMembers.values());
};

/**
 * Get the teams assigned to a workspace
 */
export const getWorkspaceTeams = (
  workspaceId: string
): (Team & { workspaceRole: WorkspaceRoleId })[] => {
  const workspace = getWorkspaceById(workspaceId);
  if (!workspace) return [];

  return workspace.teams
    .map((wt) => {
      const team = getTeamById(wt.teamId);
      if (!team) return null;
      return { ...team, workspaceRole: wt.role };
    })
    .filter((t): t is Team & { workspaceRole: WorkspaceRoleId } => t !== null);
};

// ============================================================================
// AUDIT LOG
// ============================================================================

export type AuditActionCategory =
  | 'authentication'
  | 'members'
  | 'teams'
  | 'workspaces'
  | 'vaults'
  | 'operations'
  | 'billing'
  | 'settings';

export type AuditAction =
  // Authentication
  | 'user.login'
  | 'user.logout'
  | 'user.login_failed'
  | 'user.password_changed'
  | 'user.mfa_enabled'
  | 'user.mfa_disabled'
  // Members
  | 'member.invited'
  | 'member.accepted_invite'
  | 'member.removed'
  | 'member.role_changed'
  | 'member.deactivated'
  | 'member.reactivated'
  // Teams
  | 'team.created'
  | 'team.updated'
  | 'team.deleted'
  | 'team.member_added'
  | 'team.member_removed'
  // Workspaces
  | 'workspace.created'
  | 'workspace.updated'
  | 'workspace.deleted'
  | 'workspace.member_added'
  | 'workspace.member_removed'
  | 'workspace.team_added'
  | 'workspace.team_removed'
  // Vaults
  | 'vault.created'
  | 'vault.updated'
  | 'vault.archived'
  // Operations
  | 'operation.initiated'
  | 'operation.approved'
  | 'operation.rejected'
  | 'operation.cancelled'
  | 'operation.completed'
  // Billing
  | 'billing.plan_changed'
  | 'billing.payment_method_added'
  | 'billing.payment_method_removed'
  | 'billing.invoice_paid'
  // Settings
  | 'settings.updated'
  | 'settings.api_key_created'
  | 'settings.api_key_revoked';

export type AuditLogEntry = {
  id: string;
  action: AuditAction;
  category: AuditActionCategory;
  actorId: string; // Member who performed the action
  actorName: string;
  actorEmail: string;
  timestamp: string; // ISO date string
  ipAddress: string;
  userAgent?: string;
  targetType?: string; // e.g., 'member', 'team', 'workspace', 'vault'
  targetId?: string;
  targetName?: string;
  details?: Record<string, unknown>; // Additional context
  status: 'success' | 'failure';
};

// Human-readable action labels
export const auditActionLabels: Record<AuditAction, string> = {
  // Authentication
  'user.login': 'User logged in',
  'user.logout': 'User logged out',
  'user.login_failed': 'Login attempt failed',
  'user.password_changed': 'Password changed',
  'user.mfa_enabled': 'MFA enabled',
  'user.mfa_disabled': 'MFA disabled',
  // Members
  'member.invited': 'Member invited',
  'member.accepted_invite': 'Invitation accepted',
  'member.removed': 'Member removed',
  'member.role_changed': 'Member role changed',
  'member.deactivated': 'Member deactivated',
  'member.reactivated': 'Member reactivated',
  // Teams
  'team.created': 'Team created',
  'team.updated': 'Team updated',
  'team.deleted': 'Team deleted',
  'team.member_added': 'Member added to team',
  'team.member_removed': 'Member removed from team',
  // Workspaces
  'workspace.created': 'Workspace created',
  'workspace.updated': 'Workspace updated',
  'workspace.deleted': 'Workspace deleted',
  'workspace.member_added': 'Member added to workspace',
  'workspace.member_removed': 'Member removed from workspace',
  'workspace.team_added': 'Team added to workspace',
  'workspace.team_removed': 'Team removed from workspace',
  // Vaults
  'vault.created': 'Vault created',
  'vault.updated': 'Vault updated',
  'vault.archived': 'Vault archived',
  // Operations
  'operation.initiated': 'Operation initiated',
  'operation.approved': 'Operation approved',
  'operation.rejected': 'Operation rejected',
  'operation.cancelled': 'Operation cancelled',
  'operation.completed': 'Operation completed',
  // Billing
  'billing.plan_changed': 'Plan changed',
  'billing.payment_method_added': 'Payment method added',
  'billing.payment_method_removed': 'Payment method removed',
  'billing.invoice_paid': 'Invoice paid',
  // Settings
  'settings.updated': 'Settings updated',
  'settings.api_key_created': 'API key created',
  'settings.api_key_revoked': 'API key revoked',
};

export const auditCategoryLabels: Record<AuditActionCategory, string> = {
  authentication: 'Authentication',
  members: 'Members',
  teams: 'Teams',
  workspaces: 'Workspaces',
  vaults: 'Vaults',
  operations: 'Operations',
  billing: 'Billing',
  settings: 'Settings',
};

// Sample audit log data
export const auditLog: AuditLogEntry[] = [
  {
    id: 'audit-001',
    action: 'user.login',
    category: 'authentication',
    actorId: 'member-001',
    actorName: 'Sarah Chen',
    actorEmail: 'sarah.chen@acme.com',
    timestamp: '2026-01-10T09:15:00Z',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    status: 'success',
  },
  {
    id: 'audit-002',
    action: 'workspace.team_added',
    category: 'workspaces',
    actorId: 'member-001',
    actorName: 'Sarah Chen',
    actorEmail: 'sarah.chen@acme.com',
    timestamp: '2026-01-10T09:20:00Z',
    ipAddress: '192.168.1.100',
    targetType: 'workspace',
    targetId: 'ws-001',
    targetName: 'Production Treasury',
    details: {
      teamId: 'team-001',
      teamName: 'Treasury Operations',
      role: 'operator',
    },
    status: 'success',
  },
  {
    id: 'audit-003',
    action: 'member.role_changed',
    category: 'members',
    actorId: 'member-001',
    actorName: 'Sarah Chen',
    actorEmail: 'sarah.chen@acme.com',
    timestamp: '2026-01-10T09:25:00Z',
    ipAddress: '192.168.1.100',
    targetType: 'member',
    targetId: 'member-002',
    targetName: 'Marcus Johnson',
    details: { previousRole: 'member', newRole: 'admin' },
    status: 'success',
  },
  {
    id: 'audit-004',
    action: 'operation.initiated',
    category: 'operations',
    actorId: 'member-003',
    actorName: 'Elena Rodriguez',
    actorEmail: 'elena.r@acme.com',
    timestamp: '2026-01-10T10:30:00Z',
    ipAddress: '192.168.1.105',
    targetType: 'operation',
    targetId: 'op-456',
    details: {
      type: 'transfer',
      amount: '50,000 USDC',
      destination: '0x1234...5678',
    },
    status: 'success',
  },
  {
    id: 'audit-005',
    action: 'operation.approved',
    category: 'operations',
    actorId: 'member-004',
    actorName: 'David Kim',
    actorEmail: 'david.kim@acme.com',
    timestamp: '2026-01-10T10:45:00Z',
    ipAddress: '192.168.1.110',
    targetType: 'operation',
    targetId: 'op-456',
    details: { signatureIndex: 1, requiredSignatures: 3 },
    status: 'success',
  },
  {
    id: 'audit-006',
    action: 'user.login_failed',
    category: 'authentication',
    actorId: 'member-007',
    actorName: 'Lisa Park',
    actorEmail: 'lisa.park@acme.com',
    timestamp: '2026-01-10T11:00:00Z',
    ipAddress: '203.45.67.89',
    details: { reason: 'Invalid password', attemptCount: 2 },
    status: 'failure',
  },
  {
    id: 'audit-007',
    action: 'team.created',
    category: 'teams',
    actorId: 'member-002',
    actorName: 'Marcus Johnson',
    actorEmail: 'marcus.j@acme.com',
    timestamp: '2026-01-09T14:30:00Z',
    ipAddress: '192.168.1.102',
    targetType: 'team',
    targetId: 'team-003',
    targetName: 'Executive Leadership',
    status: 'success',
  },
  {
    id: 'audit-008',
    action: 'billing.plan_changed',
    category: 'billing',
    actorId: 'member-005',
    actorName: 'Anna Schmidt',
    actorEmail: 'anna.s@acme.com',
    timestamp: '2026-01-09T10:00:00Z',
    ipAddress: '192.168.1.115',
    details: { previousPlan: 'starter', newPlan: 'pro' },
    status: 'success',
  },
  {
    id: 'audit-009',
    action: 'vault.created',
    category: 'vaults',
    actorId: 'member-003',
    actorName: 'Elena Rodriguez',
    actorEmail: 'elena.r@acme.com',
    timestamp: '2026-01-08T16:20:00Z',
    ipAddress: '192.168.1.105',
    targetType: 'vault',
    targetId: 'vault-012',
    targetName: 'ETH Cold Storage',
    details: { workspace: 'Production Treasury', network: 'Ethereum' },
    status: 'success',
  },
  {
    id: 'audit-010',
    action: 'member.invited',
    category: 'members',
    actorId: 'member-001',
    actorName: 'Sarah Chen',
    actorEmail: 'sarah.chen@acme.com',
    timestamp: '2026-01-08T09:15:00Z',
    ipAddress: '192.168.1.100',
    targetType: 'member',
    targetId: 'member-007',
    targetName: 'Lisa Park',
    details: { email: 'lisa.park@acme.com', role: 'member' },
    status: 'success',
  },
  {
    id: 'audit-011',
    action: 'workspace.created',
    category: 'workspaces',
    actorId: 'member-001',
    actorName: 'Sarah Chen',
    actorEmail: 'sarah.chen@acme.com',
    timestamp: '2026-01-07T11:00:00Z',
    ipAddress: '192.168.1.100',
    targetType: 'workspace',
    targetId: 'ws-003',
    targetName: 'Client: Acme Corp',
    status: 'success',
  },
  {
    id: 'audit-012',
    action: 'settings.api_key_created',
    category: 'settings',
    actorId: 'member-002',
    actorName: 'Marcus Johnson',
    actorEmail: 'marcus.j@acme.com',
    timestamp: '2026-01-07T09:30:00Z',
    ipAddress: '192.168.1.102',
    details: { keyName: 'Production API', permissions: ['read', 'write'] },
    status: 'success',
  },
  {
    id: 'audit-013',
    action: 'operation.completed',
    category: 'operations',
    actorId: 'member-001',
    actorName: 'Sarah Chen',
    actorEmail: 'sarah.chen@acme.com',
    timestamp: '2026-01-06T15:45:00Z',
    ipAddress: '192.168.1.100',
    targetType: 'operation',
    targetId: 'op-455',
    details: {
      type: 'transfer',
      amount: '100,000 USDC',
      txHash: '0xabc...def',
    },
    status: 'success',
  },
  {
    id: 'audit-014',
    action: 'user.mfa_enabled',
    category: 'authentication',
    actorId: 'member-004',
    actorName: 'David Kim',
    actorEmail: 'david.kim@acme.com',
    timestamp: '2026-01-06T10:00:00Z',
    ipAddress: '192.168.1.110',
    details: { method: 'authenticator_app' },
    status: 'success',
  },
  {
    id: 'audit-015',
    action: 'team.member_added',
    category: 'teams',
    actorId: 'member-002',
    actorName: 'Marcus Johnson',
    actorEmail: 'marcus.j@acme.com',
    timestamp: '2026-01-05T14:00:00Z',
    ipAddress: '192.168.1.102',
    targetType: 'team',
    targetId: 'team-002',
    targetName: 'Risk & Compliance',
    details: { memberId: 'member-006', memberName: 'James Wilson' },
    status: 'success',
  },
  {
    id: 'audit-016',
    action: 'user.login',
    category: 'authentication',
    actorId: 'member-002',
    actorName: 'Marcus Johnson',
    actorEmail: 'marcus.j@acme.com',
    timestamp: '2026-01-05T08:30:00Z',
    ipAddress: '192.168.1.102',
    status: 'success',
  },
  {
    id: 'audit-017',
    action: 'billing.payment_method_added',
    category: 'billing',
    actorId: 'member-005',
    actorName: 'Anna Schmidt',
    actorEmail: 'anna.s@acme.com',
    timestamp: '2026-01-04T11:20:00Z',
    ipAddress: '192.168.1.115',
    details: { cardType: 'visa', last4: '4242' },
    status: 'success',
  },
  {
    id: 'audit-018',
    action: 'member.deactivated',
    category: 'members',
    actorId: 'member-001',
    actorName: 'Sarah Chen',
    actorEmail: 'sarah.chen@acme.com',
    timestamp: '2026-01-03T16:00:00Z',
    ipAddress: '192.168.1.100',
    targetType: 'member',
    targetId: 'member-008',
    targetName: 'Robert Taylor',
    details: { reason: 'End of employment' },
    status: 'success',
  },
  {
    id: 'audit-019',
    action: 'workspace.member_added',
    category: 'workspaces',
    actorId: 'member-002',
    actorName: 'Marcus Johnson',
    actorEmail: 'marcus.j@acme.com',
    timestamp: '2026-01-03T10:30:00Z',
    ipAddress: '192.168.1.102',
    targetType: 'workspace',
    targetId: 'ws-002',
    targetName: 'Sandbox',
    details: {
      memberId: 'member-006',
      memberName: 'James Wilson',
      role: 'operator',
    },
    status: 'success',
  },
  {
    id: 'audit-020',
    action: 'operation.rejected',
    category: 'operations',
    actorId: 'member-001',
    actorName: 'Sarah Chen',
    actorEmail: 'sarah.chen@acme.com',
    timestamp: '2026-01-02T14:15:00Z',
    ipAddress: '192.168.1.100',
    targetType: 'operation',
    targetId: 'op-450',
    details: { type: 'transfer', reason: 'Suspicious destination address' },
    status: 'success',
  },
];

// Helper functions for filtering
export const getAuditLogByCategory = (
  category: AuditActionCategory
): AuditLogEntry[] => {
  return auditLog.filter((entry) => entry.category === category);
};

export const getAuditLogByActor = (actorId: string): AuditLogEntry[] => {
  return auditLog.filter((entry) => entry.actorId === actorId);
};

export const getAuditLogByDateRange = (
  startDate: string,
  endDate: string
): AuditLogEntry[] => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return auditLog.filter((entry) => {
    const entryDate = new Date(entry.timestamp);
    return entryDate >= start && entryDate <= end;
  });
};

// ============================================================================
// BACKUP ENCRYPTION
// ============================================================================

export type EncryptionKey = {
  fingerprint: string;
  configuredAt: string;
  configuredBy: string;
  publicKey: string;
};

// Sample encryption key data - set to null to show empty state
export const encryptionKey: EncryptionKey | null = {
  fingerprint: 'SHA256:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
  configuredAt: '2025-12-15T10:30:00Z',
  configuredBy: 'Sarah Chen',
  publicKey: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Z3VS5JJcds3xfn/ygWyF8PbnGy9
6M8bFTqFsVM5qPGBp5k3kD5XnVBhGF0jF8vH2FsNTGb2BOwlJPqR0e5s1QoNQ3gL5C8MwI0n
JqKp5EJpq2HMPABqR4jLJcT1BN3RkPXwsrNCPbLOLhPN8hRiPgU/LO5gXr8vRp3y3D0QKTFD
VnBh5D4p8NMh5GNhpE5G2BQ6UAF3Lg0TrCJPLZnrw/E5aSlMz9CEIuAh0HcYtVBUMB0TFbHi
KR0sZAytM4lz5vjTRJC6P5so8M7Q3QOQ2Gi4M0y3VSQH0WnfPAqlPJ5k2L9VDwXPsYE9aFdE
jPKu2J0Xy8FQZN5qL2LMxQhJLVmFcwIDAQAB
-----END PUBLIC KEY-----`,
};

// ============================================================================
// GOVERNANCE
// ============================================================================

export type GovernanceActionCategory = 'members' | 'workspaces' | 'security';

export type GovernedAction = {
  id: string;
  category: GovernanceActionCategory;
  name: string;
  description: string;
  enabled: boolean;
};

export type GovernanceConfig = {
  enabled: boolean;
  threshold: number;
  governedActions: GovernedAction[];
};

export type GovernanceVote = {
  memberId: string;
  memberName: string;
  vote: 'approve' | 'reject';
  votedAt: string;
};

export type GovernanceRequestStatus = 'pending' | 'approved' | 'rejected';

export type GovernanceRequest = {
  id: string;
  actionId: string;
  actionCategory: GovernanceActionCategory;
  actionLabel: string;
  status: GovernanceRequestStatus;
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  resolvedAt?: string;
  details: Record<string, unknown>;
  votes: GovernanceVote[];
  threshold: number;
};

// All available governable actions
export const availableGovernedActions: GovernedAction[] = [
  // Members
  {
    id: 'member.invite',
    category: 'members',
    name: 'Invite Member',
    description: 'Invite new members to the organization',
    enabled: true,
  },
  {
    id: 'member.remove',
    category: 'members',
    name: 'Remove Member',
    description: 'Remove members from the organization',
    enabled: true,
  },
  {
    id: 'member.role_change',
    category: 'members',
    name: 'Change Role',
    description: "Change a member's platform role",
    enabled: false,
  },
  {
    id: 'member.deactivate',
    category: 'members',
    name: 'Deactivate Member',
    description: 'Deactivate or reactivate member accounts',
    enabled: false,
  },
  // Workspaces
  {
    id: 'workspace.create',
    category: 'workspaces',
    name: 'Create Workspace',
    description: 'Create new workspaces',
    enabled: false,
  },
  {
    id: 'workspace.delete',
    category: 'workspaces',
    name: 'Delete Workspace',
    description: 'Delete existing workspaces',
    enabled: true,
  },
  {
    id: 'workspace.team_assign',
    category: 'workspaces',
    name: 'Assign Team',
    description: 'Add or remove teams from workspaces',
    enabled: false,
  },
  {
    id: 'workspace.member_assign',
    category: 'workspaces',
    name: 'Assign Member',
    description: 'Add or remove individual members from workspaces',
    enabled: false,
  },
  // Security
  {
    id: 'security.encryption_key_configure',
    category: 'security',
    name: 'Configure Encryption Key',
    description: 'Set up or replace backup encryption keys',
    enabled: true,
  },
  {
    id: 'security.encryption_key_remove',
    category: 'security',
    name: 'Remove Encryption Key',
    description: 'Remove backup encryption configuration',
    enabled: true,
  },
  {
    id: 'security.api_key_create',
    category: 'security',
    name: 'Create API Key',
    description: 'Generate new API keys',
    enabled: false,
  },
  {
    id: 'security.api_key_revoke',
    category: 'security',
    name: 'Revoke API Key',
    description: 'Revoke existing API keys',
    enabled: false,
  },
];

// Category labels
export const governanceCategoryLabels: Record<
  GovernanceActionCategory,
  string
> = {
  members: 'Member Management',
  workspaces: 'Workspace Management',
  security: 'Security Settings',
};

// Sample governance configuration
export const governanceConfig: GovernanceConfig = {
  enabled: true,
  threshold: 2,
  governedActions: availableGovernedActions,
};

// Get admins and owners (governance voters)
export const getGovernanceVoters = (): Member[] => {
  return members.filter(
    (m) =>
      (m.platformRole === 'owner' || m.platformRole === 'admin') &&
      m.status === 'active'
  );
};

// Sample governance requests
export const governanceRequests: GovernanceRequest[] = [
  {
    id: 'gov-001',
    actionId: 'member.invite',
    actionCategory: 'members',
    actionLabel: 'Invite Member',
    status: 'pending',
    requestedBy: 'member-003',
    requestedByName: 'Elena Rodriguez',
    requestedAt: '2026-01-10T14:30:00Z',
    details: { email: 'new.hire@acme.com', role: 'member' },
    votes: [
      {
        memberId: 'member-001',
        memberName: 'Sarah Chen',
        vote: 'approve',
        votedAt: '2026-01-10T14:45:00Z',
      },
    ],
    threshold: 2,
  },
  {
    id: 'gov-002',
    actionId: 'workspace.delete',
    actionCategory: 'workspaces',
    actionLabel: 'Delete Workspace',
    status: 'pending',
    requestedBy: 'member-002',
    requestedByName: 'Marcus Johnson',
    requestedAt: '2026-01-10T11:00:00Z',
    details: { workspaceId: 'ws-old', workspaceName: 'Legacy Workspace' },
    votes: [],
    threshold: 2,
  },
  {
    id: 'gov-003',
    actionId: 'security.encryption_key_configure',
    actionCategory: 'security',
    actionLabel: 'Configure Encryption Key',
    status: 'approved',
    requestedBy: 'member-001',
    requestedByName: 'Sarah Chen',
    requestedAt: '2026-01-09T09:00:00Z',
    resolvedAt: '2026-01-09T10:30:00Z',
    details: { action: 'generate_new_key' },
    votes: [
      {
        memberId: 'member-001',
        memberName: 'Sarah Chen',
        vote: 'approve',
        votedAt: '2026-01-09T09:05:00Z',
      },
      {
        memberId: 'member-002',
        memberName: 'Marcus Johnson',
        vote: 'approve',
        votedAt: '2026-01-09T10:30:00Z',
      },
    ],
    threshold: 2,
  },
  {
    id: 'gov-004',
    actionId: 'member.remove',
    actionCategory: 'members',
    actionLabel: 'Remove Member',
    status: 'rejected',
    requestedBy: 'member-002',
    requestedByName: 'Marcus Johnson',
    requestedAt: '2026-01-08T16:00:00Z',
    resolvedAt: '2026-01-08T17:30:00Z',
    details: { memberId: 'member-004', memberName: 'David Kim' },
    votes: [
      {
        memberId: 'member-002',
        memberName: 'Marcus Johnson',
        vote: 'approve',
        votedAt: '2026-01-08T16:05:00Z',
      },
      {
        memberId: 'member-001',
        memberName: 'Sarah Chen',
        vote: 'reject',
        votedAt: '2026-01-08T17:30:00Z',
      },
    ],
    threshold: 2,
  },
  {
    id: 'gov-005',
    actionId: 'member.invite',
    actionCategory: 'members',
    actionLabel: 'Invite Member',
    status: 'approved',
    requestedBy: 'member-001',
    requestedByName: 'Sarah Chen',
    requestedAt: '2026-01-07T10:00:00Z',
    resolvedAt: '2026-01-07T11:15:00Z',
    details: { email: 'lisa.park@acme.com', role: 'member' },
    votes: [
      {
        memberId: 'member-001',
        memberName: 'Sarah Chen',
        vote: 'approve',
        votedAt: '2026-01-07T10:05:00Z',
      },
      {
        memberId: 'member-002',
        memberName: 'Marcus Johnson',
        vote: 'approve',
        votedAt: '2026-01-07T11:15:00Z',
      },
    ],
    threshold: 2,
  },
];

// Helper functions
export const getGovernanceRequestById = (
  id: string
): GovernanceRequest | undefined => {
  return governanceRequests.find((r) => r.id === id);
};

export const getPendingGovernanceRequests = (): GovernanceRequest[] => {
  return governanceRequests.filter((r) => r.status === 'pending');
};

export const getGovernanceRequestHistory = (): GovernanceRequest[] => {
  return governanceRequests.filter((r) => r.status !== 'pending');
};

export const isActionGoverned = (actionId: string): boolean => {
  if (!governanceConfig.enabled) return false;
  const action = governanceConfig.governedActions.find(
    (a) => a.id === actionId
  );
  return action?.enabled ?? false;
};

export const getGovernedActionsByCategory = (
  category: GovernanceActionCategory
): GovernedAction[] => {
  return availableGovernedActions.filter((a) => a.category === category);
};
