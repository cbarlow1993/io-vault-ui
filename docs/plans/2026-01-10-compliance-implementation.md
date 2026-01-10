# Compliance Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a comprehensive compliance module for reviewing crypto transactions with ChainAnalysis, Elliptic, and Scorechain integrations.

**Architecture:** Feature-based module at `src/features/compliance/` with TanStack Router routes under `src/routes/_app/compliance/`. Uses Treasury-6 layout components. ORPC procedures for backend, Prisma for data, Zod for validation.

**Tech Stack:** React 19, TanStack Router, TanStack Query, ORPC, Prisma, Zod, Tailwind CSS, Treasury-6 UI components

---

## Phase 1: Foundation

### Task 1: Add Compliance Permissions

**Files:**
- Modify: `src/features/auth/permissions.ts`

**Step 1: Add compliance statement to permissions**

Add the compliance permissions to the statement object:

```typescript
const statement = {
  ...defaultStatements,
  account: ['read', 'update'],
  apps: ['app', 'manager'],
  book: ['read', 'create', 'update', 'delete'],
  genre: ['read'],
  compliance: ['view', 'reviewL1', 'reviewL2', 'manageWatchlist', 'generateReports', 'configureAlerts', 'manageIntegrations'],
} as const;
```

**Step 2: Update user role**

```typescript
const user = ac.newRole({
  account: ['update'],
  apps: ['app'],
  book: ['read'],
  genre: ['read'],
  compliance: ['view'],
});
```

**Step 3: Update admin role**

```typescript
const admin = ac.newRole({
  ...adminAc.statements,
  account: ['update'],
  apps: ['app', 'manager'],
  book: ['read', 'create', 'update', 'delete'],
  genre: ['read'],
  compliance: ['view', 'reviewL1', 'reviewL2', 'manageWatchlist', 'generateReports', 'configureAlerts', 'manageIntegrations'],
});
```

**Step 4: Commit**

```bash
git add src/features/auth/permissions.ts
git commit -m "feat(compliance): add compliance permissions to RBAC"
```

---

### Task 2: Create Compliance Feature Directory Structure

**Files:**
- Create: `src/features/compliance/index.ts`
- Create: `src/features/compliance/types.ts`
- Create: `src/features/compliance/constants.ts`

**Step 1: Create types file**

```typescript
// src/features/compliance/types.ts
export type TransactionType = 'receive' | 'send' | 'swap';

export type TransactionStatus =
  | 'pending_l1'
  | 'under_l1_review'
  | 'pending_l2'
  | 'under_l2_review'
  | 'approved'
  | 'rejected';

export type RiskLevel = 'low' | 'medium' | 'high' | 'severe';

export type ComplianceProvider = 'chainanalysis' | 'elliptic' | 'scorechain';

export type AlertTrigger =
  | 'transaction_pending'
  | 'transaction_escalated'
  | 'high_risk_detected'
  | 'transaction_approved'
  | 'transaction_rejected'
  | 'watchlist_activity';

export interface ProviderAssessment {
  provider: ComplianceProvider;
  riskScore: number;
  riskLevel: RiskLevel;
  categories: string[];
  flags: string[];
  lastChecked: Date;
}

export interface ComplianceTransaction {
  id: string;
  hash: string;
  type: TransactionType;
  amount: string;
  token: string;
  chain: string;
  fromAddress: string;
  toAddress: string;
  status: TransactionStatus;
  riskLevel: RiskLevel;
  submittedAt: Date;
  reviewerId?: string;
  assessments: ProviderAssessment[];
}

export interface ComplianceAddress {
  id: string;
  address: string;
  chain: string;
  riskLevel: RiskLevel;
  transactionCount: number;
  lastActivity: Date;
  isWatchlisted: boolean;
  assessments: ProviderAssessment[];
}
```

**Step 2: Create constants file**

```typescript
// src/features/compliance/constants.ts
export const TRANSACTION_STATUS_LABELS: Record<string, string> = {
  pending_l1: 'Pending L1',
  under_l1_review: 'Under L1 Review',
  pending_l2: 'Pending L2',
  under_l2_review: 'Under L2 Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const RISK_LEVEL_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  severe: 'Severe',
};

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  receive: 'Receive',
  send: 'Send',
  swap: 'Swap',
};

export const PROVIDER_LABELS: Record<string, string> = {
  chainanalysis: 'ChainAnalysis',
  elliptic: 'Elliptic',
  scorechain: 'Scorechain',
};

export const CHAINS = [
  'ethereum',
  'bitcoin',
  'polygon',
  'arbitrum',
  'optimism',
  'avalanche',
  'solana',
] as const;
```

**Step 3: Create index file**

```typescript
// src/features/compliance/index.ts
export * from './types';
export * from './constants';
```

**Step 4: Commit**

```bash
git add src/features/compliance/
git commit -m "feat(compliance): add types and constants"
```

---

### Task 3: Add Compliance Navigation

**Files:**
- Modify: `src/layout/treasury-6/nav-sidebar.tsx`

**Step 1: Add ShieldAlertIcon import**

Add to the lucide-react imports:

```typescript
import {
  ArrowRightLeftIcon,
  BookUserIcon,
  ChevronRightIcon,
  FingerprintIcon,
  GridIcon,
  KeyIcon,
  ListChecksIcon,
  SettingsIcon,
  ShieldCheckIcon,
  ShieldAlertIcon, // Add this
  UsersIcon,
} from 'lucide-react';
```

**Step 2: Add Compliance to navItems**

Insert before Settings:

```typescript
const navItems: NavItem[] = [
  { title: 'Overview', icon: GridIcon, url: '/overview' },
  {
    title: 'Vaults',
    icon: KeyIcon,
    children: [
      { title: 'Vaults', url: '/vaults', icon: KeyIcon },
      { title: 'Signers', url: '/signers', icon: FingerprintIcon },
    ],
  },
  {
    title: 'Policies',
    icon: ShieldCheckIcon,
    children: [
      { title: 'Whitelists', url: '/policies/whitelists', icon: ListChecksIcon },
      { title: 'Transactions', url: '/policies/transactions', icon: ArrowRightLeftIcon },
    ],
  },
  { title: 'Identities', icon: UsersIcon, url: '/identities' },
  { title: 'Address Book', icon: BookUserIcon, url: '/address-book' },
  { title: 'Compliance', icon: ShieldAlertIcon, url: '/compliance' }, // Add this
  { title: 'Settings', icon: SettingsIcon, url: '/settings' },
];
```

**Step 3: Update isNavItemActive function**

Add `/compliance` to the startsWith check:

```typescript
const isNavItemActive = (itemUrl: string) => {
  if (
    itemUrl === '/settings' ||
    itemUrl === '/identities' ||
    itemUrl === '/vaults' ||
    itemUrl === '/signers' ||
    itemUrl === '/address-book' ||
    itemUrl === '/policies/whitelists' ||
    itemUrl === '/policies/transactions' ||
    itemUrl === '/compliance' // Add this
  ) {
    return pathname.startsWith(itemUrl);
  }
  return pathname === itemUrl;
};
```

**Step 4: Commit**

```bash
git add src/layout/treasury-6/nav-sidebar.tsx
git commit -m "feat(compliance): add compliance to navigation"
```

---

### Task 4: Create Compliance Route Structure

**Files:**
- Create: `src/routes/_app/compliance/route.tsx`
- Create: `src/routes/_app/compliance/index.tsx`

**Step 1: Create route layout file**

```typescript
// src/routes/_app/compliance/route.tsx
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/compliance')({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
```

**Step 2: Create dashboard index route**

```typescript
// src/routes/_app/compliance/index.tsx
import { createFileRoute } from '@tanstack/react-router';

import { PageComplianceDashboard } from '@/features/compliance/pages/page-dashboard';

export const Route = createFileRoute('/_app/compliance/')({
  component: PageComplianceDashboard,
});
```

**Step 3: Commit**

```bash
git add src/routes/_app/compliance/
git commit -m "feat(compliance): add compliance route structure"
```

---

### Task 5: Create Dashboard Page Shell

**Files:**
- Create: `src/features/compliance/pages/page-dashboard.tsx`

**Step 1: Create the dashboard page**

```typescript
// src/features/compliance/pages/page-dashboard.tsx
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/treasury-6';

export const PageComplianceDashboard = () => {
  return (
    <PageLayout>
      <PageLayoutTopBar>
        <PageLayoutTopBarTitle>Compliance</PageLayoutTopBarTitle>
      </PageLayoutTopBar>
      <PageLayoutContent>
        <div className="text-neutral-500">
          Compliance dashboard coming soon...
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
```

**Step 2: Verify the route works**

Run: `pnpm dev`
Navigate to: `http://localhost:3000/compliance`
Expected: See "Compliance dashboard coming soon..." message

**Step 3: Commit**

```bash
git add src/features/compliance/pages/
git commit -m "feat(compliance): add dashboard page shell"
```

---

## Phase 2: Dashboard UI

### Task 6: Create Dashboard Metric Cards Component

**Files:**
- Create: `src/features/compliance/components/dashboard-metrics.tsx`

**Step 1: Create the metrics component**

```typescript
// src/features/compliance/components/dashboard-metrics.tsx
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

interface MetricCardProps {
  label: string;
  value: number | string;
  change?: number;
  changeLabel?: string;
}

const MetricCard = ({ label, value, change, changeLabel }: MetricCardProps) => {
  const isPositive = change !== undefined && change >= 0;
  const hasChange = change !== undefined;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="text-sm font-medium text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-neutral-900">{value}</div>
      {hasChange && (
        <div className="mt-1 flex items-center gap-1">
          {isPositive ? (
            <ArrowUpIcon className="h-3 w-3 text-positive-600" />
          ) : (
            <ArrowDownIcon className="h-3 w-3 text-negative-600" />
          )}
          <span
            className={cn(
              'text-xs font-medium',
              isPositive ? 'text-positive-600' : 'text-negative-600'
            )}
          >
            {Math.abs(change)}%
          </span>
          {changeLabel && (
            <span className="text-xs text-neutral-500">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
};

interface DashboardMetricsProps {
  pendingL1: number;
  pendingL2: number;
  avgReviewTime: string;
  approvalRate: number;
  highRiskAlerts: number;
}

export const DashboardMetrics = ({
  pendingL1,
  pendingL2,
  avgReviewTime,
  approvalRate,
  highRiskAlerts,
}: DashboardMetricsProps) => {
  return (
    <div className="grid grid-cols-4 gap-4">
      <MetricCard
        label="Pending Reviews"
        value={pendingL1 + pendingL2}
        changeLabel={`${pendingL1} L1, ${pendingL2} L2`}
      />
      <MetricCard label="Avg Review Time" value={avgReviewTime} />
      <MetricCard label="Approval Rate" value={`${approvalRate}%`} change={2.3} />
      <MetricCard label="High Risk Alerts" value={highRiskAlerts} change={-5} />
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add src/features/compliance/components/
git commit -m "feat(compliance): add dashboard metrics component"
```

---

### Task 7: Create Risk Badge Component

**Files:**
- Create: `src/features/compliance/components/risk-badge.tsx`

**Step 1: Create the risk badge component**

```typescript
// src/features/compliance/components/risk-badge.tsx
import { cn } from '@/lib/tailwind/utils';

import { type RiskLevel, RISK_LEVEL_LABELS } from '@/features/compliance';

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

const riskStyles: Record<RiskLevel, string> = {
  low: 'bg-positive-100 text-positive-700',
  medium: 'bg-warning-100 text-warning-700',
  high: 'bg-negative-100 text-negative-700',
  severe: 'bg-negative-200 text-negative-800',
};

export const RiskBadge = ({ level, className }: RiskBadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        riskStyles[level],
        className
      )}
    >
      {RISK_LEVEL_LABELS[level]}
    </span>
  );
};
```

**Step 2: Commit**

```bash
git add src/features/compliance/components/risk-badge.tsx
git commit -m "feat(compliance): add risk badge component"
```

---

### Task 8: Create Status Badge Component

**Files:**
- Create: `src/features/compliance/components/status-badge.tsx`

**Step 1: Create the status badge component**

```typescript
// src/features/compliance/components/status-badge.tsx
import { cn } from '@/lib/tailwind/utils';

import { type TransactionStatus, TRANSACTION_STATUS_LABELS } from '@/features/compliance';

interface StatusBadgeProps {
  status: TransactionStatus;
  className?: string;
}

const statusStyles: Record<TransactionStatus, string> = {
  pending_l1: 'bg-warning-100 text-warning-700',
  under_l1_review: 'bg-brand-100 text-brand-700',
  pending_l2: 'bg-warning-100 text-warning-700',
  under_l2_review: 'bg-brand-100 text-brand-700',
  approved: 'bg-positive-100 text-positive-700',
  rejected: 'bg-negative-100 text-negative-700',
};

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        statusStyles[status],
        className
      )}
    >
      {TRANSACTION_STATUS_LABELS[status]}
    </span>
  );
};
```

**Step 2: Commit**

```bash
git add src/features/compliance/components/status-badge.tsx
git commit -m "feat(compliance): add status badge component"
```

---

### Task 9: Create Recent Activity Component

**Files:**
- Create: `src/features/compliance/components/recent-activity.tsx`

**Step 1: Create the recent activity component**

```typescript
// src/features/compliance/components/recent-activity.tsx
import { CheckCircleIcon, XCircleIcon, ArrowUpIcon, MessageSquareIcon } from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

type ActivityType = 'approved' | 'rejected' | 'escalated' | 'note_added';

interface Activity {
  id: string;
  type: ActivityType;
  transactionHash: string;
  actor: string;
  timestamp: Date;
}

interface RecentActivityProps {
  activities: Activity[];
}

const activityConfig: Record<ActivityType, { icon: typeof CheckCircleIcon; label: string; color: string }> = {
  approved: { icon: CheckCircleIcon, label: 'Approved', color: 'text-positive-600' },
  rejected: { icon: XCircleIcon, label: 'Rejected', color: 'text-negative-600' },
  escalated: { icon: ArrowUpIcon, label: 'Escalated', color: 'text-warning-600' },
  note_added: { icon: MessageSquareIcon, label: 'Note Added', color: 'text-neutral-600' },
};

export const RecentActivity = ({ activities }: RecentActivityProps) => {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-neutral-900">Recent Activity</h3>
      </div>
      <div className="divide-y divide-neutral-100">
        {activities.map((activity) => {
          const config = activityConfig[activity.type];
          const Icon = config.icon;
          return (
            <div key={activity.id} className="flex items-center gap-3 px-4 py-3">
              <Icon className={cn('h-4 w-4', config.color)} />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-neutral-900">
                  <span className="font-medium">{activity.actor}</span>{' '}
                  <span className="text-neutral-500">{config.label.toLowerCase()}</span>{' '}
                  <span className="font-mono text-xs">{activity.transactionHash.slice(0, 10)}...</span>
                </div>
              </div>
              <div className="text-xs text-neutral-500">
                {activity.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add src/features/compliance/components/recent-activity.tsx
git commit -m "feat(compliance): add recent activity component"
```

---

### Task 10: Create Requires Attention Component

**Files:**
- Create: `src/features/compliance/components/requires-attention.tsx`

**Step 1: Create the requires attention component**

```typescript
// src/features/compliance/components/requires-attention.tsx
import { Link } from '@tanstack/react-router';
import { AlertTriangleIcon, ClockIcon } from 'lucide-react';

import { RiskBadge } from './risk-badge';
import { type RiskLevel } from '@/features/compliance';

interface AttentionItem {
  id: string;
  transactionHash: string;
  amount: string;
  token: string;
  riskLevel: RiskLevel;
  waitingTime: string;
  isAutoEscalated: boolean;
}

interface RequiresAttentionProps {
  items: AttentionItem[];
}

export const RequiresAttention = ({ items }: RequiresAttentionProps) => {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-neutral-900">Requires Attention</h3>
      </div>
      <div className="divide-y divide-neutral-100">
        {items.map((item) => (
          <Link
            key={item.id}
            to="/compliance/transactions/$id"
            params={{ id: item.id }}
            className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-neutral-900">
                  {item.transactionHash.slice(0, 10)}...
                </span>
                {item.isAutoEscalated && (
                  <AlertTriangleIcon className="h-3.5 w-3.5 text-warning-500" />
                )}
              </div>
              <div className="text-xs text-neutral-500">
                {item.amount} {item.token}
              </div>
            </div>
            <RiskBadge level={item.riskLevel} />
            <div className="flex items-center gap-1 text-xs text-neutral-500">
              <ClockIcon className="h-3 w-3" />
              {item.waitingTime}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add src/features/compliance/components/requires-attention.tsx
git commit -m "feat(compliance): add requires attention component"
```

---

### Task 11: Assemble Dashboard with Mock Data

**Files:**
- Modify: `src/features/compliance/pages/page-dashboard.tsx`
- Create: `src/features/compliance/data/mock-dashboard.ts`

**Step 1: Create mock data file**

```typescript
// src/features/compliance/data/mock-dashboard.ts
import { type RiskLevel } from '@/features/compliance';

export const mockDashboardMetrics = {
  pendingL1: 12,
  pendingL2: 3,
  avgReviewTime: '4.2h',
  approvalRate: 87,
  highRiskAlerts: 5,
};

export const mockRecentActivities = [
  { id: '1', type: 'approved' as const, transactionHash: '0x1a2b3c4d5e6f...', actor: 'John D.', timestamp: new Date() },
  { id: '2', type: 'escalated' as const, transactionHash: '0x2b3c4d5e6f7a...', actor: 'Sarah M.', timestamp: new Date(Date.now() - 15 * 60000) },
  { id: '3', type: 'rejected' as const, transactionHash: '0x3c4d5e6f7a8b...', actor: 'John D.', timestamp: new Date(Date.now() - 45 * 60000) },
  { id: '4', type: 'note_added' as const, transactionHash: '0x4d5e6f7a8b9c...', actor: 'Mike R.', timestamp: new Date(Date.now() - 60 * 60000) },
  { id: '5', type: 'approved' as const, transactionHash: '0x5e6f7a8b9c0d...', actor: 'Sarah M.', timestamp: new Date(Date.now() - 90 * 60000) },
];

export const mockAttentionItems = [
  { id: '1', transactionHash: '0xabc123def456...', amount: '125.5', token: 'ETH', riskLevel: 'high' as RiskLevel, waitingTime: '2h 15m', isAutoEscalated: true },
  { id: '2', transactionHash: '0xdef456abc789...', amount: '50,000', token: 'USDC', riskLevel: 'medium' as RiskLevel, waitingTime: '1h 45m', isAutoEscalated: false },
  { id: '3', transactionHash: '0x789abc123def...', amount: '2.3', token: 'BTC', riskLevel: 'severe' as RiskLevel, waitingTime: '45m', isAutoEscalated: true },
  { id: '4', transactionHash: '0x456def789abc...', amount: '10,000', token: 'USDT', riskLevel: 'low' as RiskLevel, waitingTime: '30m', isAutoEscalated: false },
];
```

**Step 2: Update dashboard page**

```typescript
// src/features/compliance/pages/page-dashboard.tsx
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/treasury-6';

import { DashboardMetrics } from '../components/dashboard-metrics';
import { RecentActivity } from '../components/recent-activity';
import { RequiresAttention } from '../components/requires-attention';
import {
  mockDashboardMetrics,
  mockRecentActivities,
  mockAttentionItems,
} from '../data/mock-dashboard';

export const PageComplianceDashboard = () => {
  return (
    <PageLayout>
      <PageLayoutTopBar>
        <PageLayoutTopBarTitle>Compliance</PageLayoutTopBarTitle>
      </PageLayoutTopBar>
      <PageLayoutContent>
        <div className="space-y-6">
          <DashboardMetrics {...mockDashboardMetrics} />

          <div className="grid grid-cols-2 gap-6">
            <RecentActivity activities={mockRecentActivities} />
            <RequiresAttention items={mockAttentionItems} />
          </div>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
```

**Step 3: Verify the dashboard**

Run: `pnpm dev`
Navigate to: `http://localhost:3000/compliance`
Expected: See metrics cards, recent activity, and requires attention sections

**Step 4: Commit**

```bash
git add src/features/compliance/
git commit -m "feat(compliance): assemble dashboard with mock data"
```

---

## Phase 3: Transactions List

### Task 12: Create Transactions Route

**Files:**
- Create: `src/routes/_app/compliance/transactions/index.tsx`
- Create: `src/routes/_app/compliance/transactions/route.tsx`

**Step 1: Create route layout**

```typescript
// src/routes/_app/compliance/transactions/route.tsx
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/compliance/transactions')({
  component: () => <Outlet />,
});
```

**Step 2: Create index route**

```typescript
// src/routes/_app/compliance/transactions/index.tsx
import { createFileRoute } from '@tanstack/react-router';

import { PageComplianceTransactions } from '@/features/compliance/pages/page-transactions';

export const Route = createFileRoute('/_app/compliance/transactions/')({
  component: PageComplianceTransactions,
});
```

**Step 3: Commit**

```bash
git add src/routes/_app/compliance/transactions/
git commit -m "feat(compliance): add transactions route"
```

---

### Task 13: Create Transactions Table Component

**Files:**
- Create: `src/features/compliance/components/transactions-table.tsx`

**Step 1: Create the table component**

```typescript
// src/features/compliance/components/transactions-table.tsx
import { Link } from '@tanstack/react-router';

import { RiskBadge } from './risk-badge';
import { StatusBadge } from './status-badge';
import { type ComplianceTransaction, TRANSACTION_TYPE_LABELS } from '@/features/compliance';

interface TransactionsTableProps {
  transactions: ComplianceTransaction[];
}

export const TransactionsTable = ({ transactions }: TransactionsTableProps) => {
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50">
            <th className="px-4 py-3 text-left font-medium text-neutral-600">Transaction Hash</th>
            <th className="px-4 py-3 text-left font-medium text-neutral-600">Type</th>
            <th className="px-4 py-3 text-left font-medium text-neutral-600">Amount</th>
            <th className="px-4 py-3 text-left font-medium text-neutral-600">Wallet</th>
            <th className="px-4 py-3 text-left font-medium text-neutral-600">Chain</th>
            <th className="px-4 py-3 text-left font-medium text-neutral-600">Risk</th>
            <th className="px-4 py-3 text-left font-medium text-neutral-600">Status</th>
            <th className="px-4 py-3 text-left font-medium text-neutral-600">Submitted</th>
            <th className="px-4 py-3 text-left font-medium text-neutral-600">Reviewer</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {transactions.map((tx) => (
            <tr key={tx.id} className="hover:bg-neutral-50">
              <td className="px-4 py-3">
                <Link
                  to="/compliance/transactions/$id"
                  params={{ id: tx.id }}
                  className="font-mono text-brand-600 hover:underline"
                >
                  {tx.hash.slice(0, 10)}...{tx.hash.slice(-6)}
                </Link>
              </td>
              <td className="px-4 py-3 text-neutral-900">
                {TRANSACTION_TYPE_LABELS[tx.type]}
              </td>
              <td className="px-4 py-3 font-medium text-neutral-900">
                {tx.amount} {tx.token}
              </td>
              <td className="px-4 py-3">
                <span className="font-mono text-xs text-neutral-600">
                  {tx.type === 'receive' ? tx.fromAddress : tx.toAddress}
                </span>
              </td>
              <td className="px-4 py-3 capitalize text-neutral-600">{tx.chain}</td>
              <td className="px-4 py-3">
                <RiskBadge level={tx.riskLevel} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={tx.status} />
              </td>
              <td className="px-4 py-3 text-neutral-500">
                {tx.submittedAt.toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-neutral-600">
                {tx.reviewerId || 'Unassigned'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add src/features/compliance/components/transactions-table.tsx
git commit -m "feat(compliance): add transactions table component"
```

---

### Task 14: Create Transactions Page

**Files:**
- Create: `src/features/compliance/pages/page-transactions.tsx`
- Create: `src/features/compliance/data/mock-transactions.ts`

**Step 1: Create mock transactions data**

```typescript
// src/features/compliance/data/mock-transactions.ts
import { type ComplianceTransaction } from '@/features/compliance';

export const mockTransactions: ComplianceTransaction[] = [
  {
    id: '1',
    hash: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef12',
    type: 'send',
    amount: '125.5',
    token: 'ETH',
    chain: 'ethereum',
    fromAddress: '0xSender1234567890abcdef1234567890abcdef12',
    toAddress: '0xReceiver234567890abcdef1234567890abcdef12',
    status: 'pending_l1',
    riskLevel: 'high',
    submittedAt: new Date(),
    assessments: [],
  },
  {
    id: '2',
    hash: '0x2b3c4d5e6f7890abcdef1234567890abcdef1234',
    type: 'receive',
    amount: '50000',
    token: 'USDC',
    chain: 'polygon',
    fromAddress: '0xExternal34567890abcdef1234567890abcdef12',
    toAddress: '0xOurWallet4567890abcdef1234567890abcdef12',
    status: 'under_l1_review',
    riskLevel: 'medium',
    submittedAt: new Date(Date.now() - 3600000),
    reviewerId: 'John D.',
    assessments: [],
  },
  {
    id: '3',
    hash: '0x3c4d5e6f7890abcdef1234567890abcdef123456',
    type: 'swap',
    amount: '2.3',
    token: 'BTC',
    chain: 'bitcoin',
    fromAddress: '0xOurBTC567890abcdef1234567890abcdef123456',
    toAddress: '0xOurETH67890abcdef1234567890abcdef1234567',
    status: 'pending_l2',
    riskLevel: 'severe',
    submittedAt: new Date(Date.now() - 7200000),
    assessments: [],
  },
  {
    id: '4',
    hash: '0x4d5e6f7890abcdef1234567890abcdef12345678',
    type: 'send',
    amount: '10000',
    token: 'USDT',
    chain: 'ethereum',
    fromAddress: '0xOurWallet890abcdef1234567890abcdef1234567',
    toAddress: '0xVendor7890abcdef1234567890abcdef123456789',
    status: 'approved',
    riskLevel: 'low',
    submittedAt: new Date(Date.now() - 86400000),
    reviewerId: 'Sarah M.',
    assessments: [],
  },
  {
    id: '5',
    hash: '0x5e6f7890abcdef1234567890abcdef1234567890',
    type: 'receive',
    amount: '75000',
    token: 'DAI',
    chain: 'arbitrum',
    fromAddress: '0xClient890abcdef1234567890abcdef12345678901',
    toAddress: '0xOurArb90abcdef1234567890abcdef123456789012',
    status: 'rejected',
    riskLevel: 'high',
    submittedAt: new Date(Date.now() - 172800000),
    reviewerId: 'John D.',
    assessments: [],
  },
];
```

**Step 2: Create transactions page**

```typescript
// src/features/compliance/pages/page-transactions.tsx
import { Link } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/treasury-6';

import { TransactionsTable } from '../components/transactions-table';
import { mockTransactions } from '../data/mock-transactions';

export const PageComplianceTransactions = () => {
  return (
    <PageLayout>
      <PageLayoutTopBar>
        <PageLayoutTopBarTitle>
          <div className="flex items-center gap-2">
            <Link to="/compliance" className="text-neutral-500 hover:text-neutral-700">
              Compliance
            </Link>
            <span className="text-neutral-400">/</span>
            <span>Transactions</span>
          </div>
        </PageLayoutTopBarTitle>
      </PageLayoutTopBar>
      <PageLayoutContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">All</Button>
            <Button variant="ghost" size="sm">Pending L1</Button>
            <Button variant="ghost" size="sm">Pending L2</Button>
            <Button variant="ghost" size="sm">Under Review</Button>
            <Button variant="ghost" size="sm">Approved</Button>
            <Button variant="ghost" size="sm">Rejected</Button>
          </div>
          <TransactionsTable transactions={mockTransactions} />
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
```

**Step 3: Verify the transactions page**

Run: `pnpm dev`
Navigate to: `http://localhost:3000/compliance/transactions`
Expected: See transactions table with mock data

**Step 4: Commit**

```bash
git add src/features/compliance/
git commit -m "feat(compliance): add transactions list page"
```

---

## Phase 4: Transaction Detail

### Task 15: Create Transaction Detail Route

**Files:**
- Create: `src/routes/_app/compliance/transactions/$id.tsx`

**Step 1: Create the route**

```typescript
// src/routes/_app/compliance/transactions/$id.tsx
import { createFileRoute } from '@tanstack/react-router';

import { PageComplianceTransactionDetail } from '@/features/compliance/pages/page-transaction-detail';

export const Route = createFileRoute('/_app/compliance/transactions/$id')({
  component: PageComplianceTransactionDetail,
});
```

**Step 2: Commit**

```bash
git add src/routes/_app/compliance/transactions/\$id.tsx
git commit -m "feat(compliance): add transaction detail route"
```

---

### Task 16: Create Provider Assessment Card Component

**Files:**
- Create: `src/features/compliance/components/provider-assessment-card.tsx`

**Step 1: Create the component**

```typescript
// src/features/compliance/components/provider-assessment-card.tsx
import { RiskBadge } from './risk-badge';
import { type ProviderAssessment, PROVIDER_LABELS } from '@/features/compliance';

interface ProviderAssessmentCardProps {
  assessment: ProviderAssessment;
}

export const ProviderAssessmentCard = ({ assessment }: ProviderAssessmentCardProps) => {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-neutral-900">
          {PROVIDER_LABELS[assessment.provider]}
        </h4>
        <RiskBadge level={assessment.riskLevel} />
      </div>

      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-neutral-900">{assessment.riskScore}</span>
        <span className="text-sm text-neutral-500">/ 100</span>
      </div>

      {assessment.categories.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-medium text-neutral-500">Risk Categories</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {assessment.categories.map((category) => (
              <span
                key={category}
                className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700"
              >
                {category}
              </span>
            ))}
          </div>
        </div>
      )}

      {assessment.flags.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-medium text-neutral-500">Flags</div>
          <div className="mt-1 space-y-1">
            {assessment.flags.map((flag) => (
              <div key={flag} className="text-xs text-negative-600">
                • {flag}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-neutral-400">
        Last checked: {assessment.lastChecked.toLocaleString()}
      </div>
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add src/features/compliance/components/provider-assessment-card.tsx
git commit -m "feat(compliance): add provider assessment card component"
```

---

### Task 17: Create Transaction Timeline Component

**Files:**
- Create: `src/features/compliance/components/transaction-timeline.tsx`

**Step 1: Create the component**

```typescript
// src/features/compliance/components/transaction-timeline.tsx
import { CheckCircleIcon, ClockIcon, MessageSquareIcon, ArrowUpIcon, XCircleIcon } from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

type TimelineEventType = 'submitted' | 'claimed' | 'note' | 'escalated' | 'approved' | 'rejected';

interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  actor?: string;
  message?: string;
  timestamp: Date;
}

interface TransactionTimelineProps {
  events: TimelineEvent[];
}

const eventConfig: Record<TimelineEventType, { icon: typeof ClockIcon; color: string; label: string }> = {
  submitted: { icon: ClockIcon, color: 'text-neutral-500', label: 'Submitted for review' },
  claimed: { icon: CheckCircleIcon, color: 'text-brand-600', label: 'Claimed for review' },
  note: { icon: MessageSquareIcon, color: 'text-neutral-600', label: 'Note added' },
  escalated: { icon: ArrowUpIcon, color: 'text-warning-600', label: 'Escalated to L2' },
  approved: { icon: CheckCircleIcon, color: 'text-positive-600', label: 'Approved' },
  rejected: { icon: XCircleIcon, color: 'text-negative-600', label: 'Rejected' },
};

export const TransactionTimeline = ({ events }: TransactionTimelineProps) => {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h4 className="font-semibold text-neutral-900">Timeline</h4>
      <div className="mt-4 space-y-4">
        {events.map((event, index) => {
          const config = eventConfig[event.type];
          const Icon = config.icon;
          const isLast = index === events.length - 1;

          return (
            <div key={event.id} className="relative flex gap-3">
              {!isLast && (
                <div className="absolute left-[11px] top-6 h-full w-px bg-neutral-200" />
              )}
              <div className={cn('relative z-10 rounded-full bg-white p-1', config.color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 pb-4">
                <div className="text-sm text-neutral-900">
                  {config.label}
                  {event.actor && (
                    <span className="text-neutral-500"> by {event.actor}</span>
                  )}
                </div>
                {event.message && (
                  <div className="mt-1 text-sm text-neutral-600">{event.message}</div>
                )}
                <div className="mt-1 text-xs text-neutral-400">
                  {event.timestamp.toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add src/features/compliance/components/transaction-timeline.tsx
git commit -m "feat(compliance): add transaction timeline component"
```

---

### Task 18: Create Transaction Detail Page

**Files:**
- Create: `src/features/compliance/pages/page-transaction-detail.tsx`
- Create: `src/features/compliance/data/mock-transaction-detail.ts`

**Step 1: Create mock data**

```typescript
// src/features/compliance/data/mock-transaction-detail.ts
import { type ComplianceTransaction, type ProviderAssessment } from '@/features/compliance';

export const mockTransactionDetail: ComplianceTransaction = {
  id: '1',
  hash: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890',
  type: 'send',
  amount: '125.5',
  token: 'ETH',
  chain: 'ethereum',
  fromAddress: '0xSender1234567890abcdef1234567890abcdef1234567890abcdef12345678',
  toAddress: '0xReceiver234567890abcdef1234567890abcdef1234567890abcdef1234567',
  status: 'pending_l1',
  riskLevel: 'high',
  submittedAt: new Date(Date.now() - 7200000),
  assessments: [
    {
      provider: 'chainanalysis',
      riskScore: 72,
      riskLevel: 'high',
      categories: ['Mixer', 'Gambling'],
      flags: ['Associated with known mixer service', 'High velocity transactions'],
      lastChecked: new Date(),
    },
    {
      provider: 'elliptic',
      riskScore: 65,
      riskLevel: 'medium',
      categories: ['Exchange', 'DeFi'],
      flags: ['Indirect exposure to sanctioned entity'],
      lastChecked: new Date(),
    },
  ],
};

export const mockTimelineEvents = [
  { id: '1', type: 'submitted' as const, timestamp: new Date(Date.now() - 7200000) },
  { id: '2', type: 'note' as const, actor: 'Mike R.', message: 'Counterparty is a known exchange address', timestamp: new Date(Date.now() - 3600000) },
];
```

**Step 2: Create transaction detail page**

```typescript
// src/features/compliance/pages/page-transaction-detail.tsx
import { Link, useParams } from '@tanstack/react-router';
import { CopyIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/treasury-6';

import { ProviderAssessmentCard } from '../components/provider-assessment-card';
import { RiskBadge } from '../components/risk-badge';
import { StatusBadge } from '../components/status-badge';
import { TransactionTimeline } from '../components/transaction-timeline';
import { mockTransactionDetail, mockTimelineEvents } from '../data/mock-transaction-detail';
import { TRANSACTION_TYPE_LABELS } from '@/features/compliance';

export const PageComplianceTransactionDetail = () => {
  const { id } = useParams({ from: '/_app/compliance/transactions/$id' });
  const tx = mockTransactionDetail;

  return (
    <PageLayout>
      <PageLayoutTopBar>
        <PageLayoutTopBarTitle>
          <div className="flex items-center gap-2">
            <Link to="/compliance" className="text-neutral-500 hover:text-neutral-700">
              Compliance
            </Link>
            <span className="text-neutral-400">/</span>
            <Link to="/compliance/transactions" className="text-neutral-500 hover:text-neutral-700">
              Transactions
            </Link>
            <span className="text-neutral-400">/</span>
            <span className="font-mono">{tx.hash.slice(0, 10)}...</span>
          </div>
        </PageLayoutTopBarTitle>
      </PageLayoutTopBar>
      <PageLayoutContent>
        <div className="grid grid-cols-5 gap-6">
          {/* Left Column - 60% */}
          <div className="col-span-3 space-y-6">
            {/* Transaction Summary */}
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <h3 className="font-semibold text-neutral-900">Transaction Summary</h3>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-neutral-500">Type</div>
                  <div className="text-sm font-medium text-neutral-900">
                    {TRANSACTION_TYPE_LABELS[tx.type]}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Amount</div>
                  <div className="text-sm font-medium text-neutral-900">
                    {tx.amount} {tx.token}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Chain</div>
                  <div className="text-sm font-medium capitalize text-neutral-900">{tx.chain}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Submitted</div>
                  <div className="text-sm font-medium text-neutral-900">
                    {tx.submittedAt.toLocaleString()}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-neutral-500">Transaction Hash</div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-neutral-900">{tx.hash}</span>
                    <button className="text-neutral-400 hover:text-neutral-600">
                      <CopyIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-neutral-500">From</div>
                  <div className="font-mono text-sm text-neutral-900">{tx.fromAddress}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-neutral-500">To</div>
                  <div className="font-mono text-sm text-neutral-900">{tx.toAddress}</div>
                </div>
              </div>
            </div>

            {/* Provider Assessments */}
            <div>
              <h3 className="mb-3 font-semibold text-neutral-900">Provider Assessments</h3>
              <div className="grid grid-cols-2 gap-4">
                {tx.assessments.map((assessment) => (
                  <ProviderAssessmentCard key={assessment.provider} assessment={assessment} />
                ))}
              </div>
            </div>

            {/* Timeline */}
            <TransactionTimeline events={mockTimelineEvents} />
          </div>

          {/* Right Column - 40% */}
          <div className="col-span-2 space-y-6">
            {/* Status Card */}
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-neutral-900">Status</h4>
                <StatusBadge status={tx.status} />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-neutral-500">Risk Level:</span>
                <RiskBadge level={tx.riskLevel} />
              </div>
              <div className="mt-4 text-sm text-neutral-500">
                Reviewer: <span className="text-neutral-900">{tx.reviewerId || 'Unassigned'}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <h4 className="font-semibold text-neutral-900">Actions</h4>
              <div className="mt-4 space-y-2">
                <Button className="w-full" variant="default">
                  Approve
                </Button>
                <Button className="w-full" variant="outline">
                  Reject
                </Button>
                <Button className="w-full" variant="ghost">
                  Escalate to L2
                </Button>
              </div>
            </div>

            {/* Notes */}
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <h4 className="font-semibold text-neutral-900">Notes</h4>
              <div className="mt-4">
                <textarea
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Add a note..."
                />
                <Button className="mt-2" size="sm" variant="outline">
                  Add Note
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
```

**Step 3: Verify the transaction detail page**

Run: `pnpm dev`
Navigate to: `http://localhost:3000/compliance/transactions/1`
Expected: See transaction detail with provider assessments and actions

**Step 4: Commit**

```bash
git add src/features/compliance/
git commit -m "feat(compliance): add transaction detail page"
```

---

## Phase 5: Addresses List and Dossier

### Task 19: Create Addresses Routes

**Files:**
- Create: `src/routes/_app/compliance/addresses/route.tsx`
- Create: `src/routes/_app/compliance/addresses/index.tsx`
- Create: `src/routes/_app/compliance/addresses/$id.tsx`

**Step 1: Create route files**

```typescript
// src/routes/_app/compliance/addresses/route.tsx
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/compliance/addresses')({
  component: () => <Outlet />,
});
```

```typescript
// src/routes/_app/compliance/addresses/index.tsx
import { createFileRoute } from '@tanstack/react-router';

import { PageComplianceAddresses } from '@/features/compliance/pages/page-addresses';

export const Route = createFileRoute('/_app/compliance/addresses/')({
  component: PageComplianceAddresses,
});
```

```typescript
// src/routes/_app/compliance/addresses/$id.tsx
import { createFileRoute } from '@tanstack/react-router';

import { PageComplianceAddressDetail } from '@/features/compliance/pages/page-address-detail';

export const Route = createFileRoute('/_app/compliance/addresses/$id')({
  component: PageComplianceAddressDetail,
});
```

**Step 2: Commit**

```bash
git add src/routes/_app/compliance/addresses/
git commit -m "feat(compliance): add addresses routes"
```

---

### Task 20: Create Addresses List Page

**Files:**
- Create: `src/features/compliance/pages/page-addresses.tsx`
- Create: `src/features/compliance/data/mock-addresses.ts`

**Step 1: Create mock addresses data**

```typescript
// src/features/compliance/data/mock-addresses.ts
import { type ComplianceAddress } from '@/features/compliance';

export const mockAddresses: ComplianceAddress[] = [
  {
    id: '1',
    address: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890',
    chain: 'ethereum',
    riskLevel: 'high',
    transactionCount: 47,
    lastActivity: new Date(),
    isWatchlisted: true,
    assessments: [],
  },
  {
    id: '2',
    address: '0x2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef12345678901a',
    chain: 'polygon',
    riskLevel: 'low',
    transactionCount: 123,
    lastActivity: new Date(Date.now() - 86400000),
    isWatchlisted: false,
    assessments: [],
  },
  {
    id: '3',
    address: '0x3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef123456789012ab',
    chain: 'ethereum',
    riskLevel: 'severe',
    transactionCount: 8,
    lastActivity: new Date(Date.now() - 3600000),
    isWatchlisted: true,
    assessments: [],
  },
  {
    id: '4',
    address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    chain: 'bitcoin',
    riskLevel: 'medium',
    transactionCount: 34,
    lastActivity: new Date(Date.now() - 172800000),
    isWatchlisted: false,
    assessments: [],
  },
];
```

**Step 2: Create addresses list page**

```typescript
// src/features/compliance/pages/page-addresses.tsx
import { Link } from '@tanstack/react-router';
import { EyeIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/treasury-6';

import { RiskBadge } from '../components/risk-badge';
import { mockAddresses } from '../data/mock-addresses';

export const PageComplianceAddresses = () => {
  return (
    <PageLayout>
      <PageLayoutTopBar>
        <PageLayoutTopBarTitle>
          <div className="flex items-center gap-2">
            <Link to="/compliance" className="text-neutral-500 hover:text-neutral-700">
              Compliance
            </Link>
            <span className="text-neutral-400">/</span>
            <span>Addresses</span>
          </div>
        </PageLayoutTopBarTitle>
      </PageLayoutTopBar>
      <PageLayoutContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">All</Button>
            <Button variant="ghost" size="sm">Low</Button>
            <Button variant="ghost" size="sm">Medium</Button>
            <Button variant="ghost" size="sm">High</Button>
            <Button variant="ghost" size="sm">Severe</Button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="px-4 py-3 text-left font-medium text-neutral-600">Wallet Address</th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-600">Chain</th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-600">Risk Level</th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-600">Transactions</th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-600">Last Activity</th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-600">Watchlist</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {mockAddresses.map((addr) => (
                  <tr key={addr.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <Link
                        to="/compliance/addresses/$id"
                        params={{ id: addr.id }}
                        className="font-mono text-sm text-brand-600 hover:underline"
                      >
                        {addr.address}
                      </Link>
                    </td>
                    <td className="px-4 py-3 capitalize text-neutral-600">{addr.chain}</td>
                    <td className="px-4 py-3">
                      <RiskBadge level={addr.riskLevel} />
                    </td>
                    <td className="px-4 py-3 text-neutral-900">{addr.transactionCount}</td>
                    <td className="px-4 py-3 text-neutral-500">
                      {addr.lastActivity.toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {addr.isWatchlisted && (
                        <EyeIcon className="h-4 w-4 text-warning-500" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
```

**Step 3: Commit**

```bash
git add src/features/compliance/
git commit -m "feat(compliance): add addresses list page"
```

---

### Task 21: Create Address Dossier Page

**Files:**
- Create: `src/features/compliance/pages/page-address-detail.tsx`

**Step 1: Create the page**

```typescript
// src/features/compliance/pages/page-address-detail.tsx
import { Link, useParams } from '@tanstack/react-router';
import { CopyIcon, EyeIcon, EyeOffIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/treasury-6';

import { ProviderAssessmentCard } from '../components/provider-assessment-card';
import { RiskBadge } from '../components/risk-badge';
import { mockAddresses } from '../data/mock-addresses';

export const PageComplianceAddressDetail = () => {
  const { id } = useParams({ from: '/_app/compliance/addresses/$id' });
  const address = mockAddresses.find((a) => a.id === id) || mockAddresses[0];
  const [isWatchlisted, setIsWatchlisted] = useState(address.isWatchlisted);

  // Mock assessments for the dossier
  const mockAssessments = [
    {
      provider: 'chainanalysis' as const,
      riskScore: 72,
      riskLevel: 'high' as const,
      categories: ['Mixer', 'Gambling'],
      flags: ['Associated with known mixer service'],
      lastChecked: new Date(),
    },
    {
      provider: 'elliptic' as const,
      riskScore: 65,
      riskLevel: 'medium' as const,
      categories: ['Exchange'],
      flags: [],
      lastChecked: new Date(),
    },
  ];

  // Mock counterparties
  const mockCounterparties = [
    { address: '0xabc...def', chain: 'ethereum', riskLevel: 'low' as const, txCount: 12, volume: '45.2 ETH' },
    { address: '0x123...456', chain: 'ethereum', riskLevel: 'high' as const, txCount: 3, volume: '120.5 ETH' },
    { address: '0x789...abc', chain: 'polygon', riskLevel: 'medium' as const, txCount: 8, volume: '10,000 USDC' },
  ];

  return (
    <PageLayout>
      <PageLayoutTopBar>
        <PageLayoutTopBarTitle>
          <div className="flex items-center gap-2">
            <Link to="/compliance" className="text-neutral-500 hover:text-neutral-700">
              Compliance
            </Link>
            <span className="text-neutral-400">/</span>
            <Link to="/compliance/addresses" className="text-neutral-500 hover:text-neutral-700">
              Addresses
            </Link>
            <span className="text-neutral-400">/</span>
            <span className="font-mono">{address.address.slice(0, 10)}...</span>
          </div>
        </PageLayoutTopBarTitle>
      </PageLayoutTopBar>
      <PageLayoutContent>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between rounded-lg border border-neutral-200 bg-white p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg text-neutral-900">{address.address}</span>
                <button className="text-neutral-400 hover:text-neutral-600">
                  <CopyIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs capitalize text-neutral-700">
                  {address.chain}
                </span>
                <RiskBadge level={address.riskLevel} />
              </div>
            </div>
            <Button
              variant={isWatchlisted ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsWatchlisted(!isWatchlisted)}
            >
              {isWatchlisted ? (
                <>
                  <EyeOffIcon className="mr-2 h-4 w-4" />
                  Remove from Watchlist
                </>
              ) : (
                <>
                  <EyeIcon className="mr-2 h-4 w-4" />
                  Add to Watchlist
                </>
              )}
            </Button>
          </div>

          {/* Risk Profile */}
          <div>
            <h3 className="mb-3 font-semibold text-neutral-900">Risk Profile</h3>
            <div className="grid grid-cols-3 gap-4">
              {mockAssessments.map((assessment) => (
                <ProviderAssessmentCard key={assessment.provider} assessment={assessment} />
              ))}
            </div>
          </div>

          {/* Counterparty Analysis */}
          <div>
            <h3 className="mb-3 font-semibold text-neutral-900">Counterparty Analysis</h3>
            <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50">
                    <th className="px-4 py-3 text-left font-medium text-neutral-600">Address</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-600">Chain</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-600">Risk</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-600">Transactions</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-600">Total Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {mockCounterparties.map((cp, i) => (
                    <tr key={i} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 font-mono text-neutral-900">{cp.address}</td>
                      <td className="px-4 py-3 capitalize text-neutral-600">{cp.chain}</td>
                      <td className="px-4 py-3">
                        <RiskBadge level={cp.riskLevel} />
                      </td>
                      <td className="px-4 py-3 text-neutral-900">{cp.txCount}</td>
                      <td className="px-4 py-3 text-neutral-900">{cp.volume}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transaction Patterns */}
          <div>
            <h3 className="mb-3 font-semibold text-neutral-900">Transaction Patterns</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="rounded-lg border border-neutral-200 bg-white p-4">
                <div className="text-sm text-neutral-500">Total Transactions</div>
                <div className="mt-1 text-2xl font-semibold text-neutral-900">{address.transactionCount}</div>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-white p-4">
                <div className="text-sm text-neutral-500">Avg per Day</div>
                <div className="mt-1 text-2xl font-semibold text-neutral-900">2.3</div>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-white p-4">
                <div className="text-sm text-neutral-500">Receive</div>
                <div className="mt-1 text-2xl font-semibold text-neutral-900">28</div>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-white p-4">
                <div className="text-sm text-neutral-500">Send</div>
                <div className="mt-1 text-2xl font-semibold text-neutral-900">19</div>
              </div>
            </div>
          </div>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
```

**Step 2: Verify addresses pages**

Run: `pnpm dev`
Navigate to: `http://localhost:3000/compliance/addresses`
Navigate to: `http://localhost:3000/compliance/addresses/1`
Expected: See addresses list and address dossier

**Step 3: Commit**

```bash
git add src/features/compliance/
git commit -m "feat(compliance): add address dossier page"
```

---

## Phase 6: Reports and Alerts (Stubs)

### Task 22: Create Reports Route and Page Stub

**Files:**
- Create: `src/routes/_app/compliance/reports/index.tsx`
- Create: `src/features/compliance/pages/page-reports.tsx`

**Step 1: Create route**

```typescript
// src/routes/_app/compliance/reports/index.tsx
import { createFileRoute } from '@tanstack/react-router';

import { PageComplianceReports } from '@/features/compliance/pages/page-reports';

export const Route = createFileRoute('/_app/compliance/reports/')({
  component: PageComplianceReports,
});
```

**Step 2: Create page stub**

```typescript
// src/features/compliance/pages/page-reports.tsx
import { Link } from '@tanstack/react-router';
import { FileTextIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/treasury-6';

const reportTemplates = [
  { id: 'transaction-summary', title: 'Transaction Summary', description: 'All transactions with compliance status' },
  { id: 'risk-exposure', title: 'Risk Exposure', description: 'Aggregate risk metrics by chain and level' },
  { id: 'flagged-activity', title: 'Flagged Activity', description: 'Rejected and high-risk transactions' },
  { id: 'audit-trail', title: 'Audit Trail', description: 'Complete reviewer action log' },
];

export const PageComplianceReports = () => {
  return (
    <PageLayout>
      <PageLayoutTopBar>
        <PageLayoutTopBarTitle>
          <div className="flex items-center gap-2">
            <Link to="/compliance" className="text-neutral-500 hover:text-neutral-700">
              Compliance
            </Link>
            <span className="text-neutral-400">/</span>
            <span>Reports</span>
          </div>
        </PageLayoutTopBarTitle>
      </PageLayoutTopBar>
      <PageLayoutContent>
        <div className="space-y-6">
          <h3 className="font-semibold text-neutral-900">Report Templates</h3>
          <div className="grid grid-cols-4 gap-4">
            {reportTemplates.map((template) => (
              <div key={template.id} className="rounded-lg border border-neutral-200 bg-white p-4">
                <FileTextIcon className="h-8 w-8 text-neutral-400" />
                <h4 className="mt-3 font-semibold text-neutral-900">{template.title}</h4>
                <p className="mt-1 text-sm text-neutral-500">{template.description}</p>
                <Button className="mt-4 w-full" variant="outline" size="sm">
                  Generate
                </Button>
              </div>
            ))}
          </div>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
```

**Step 3: Commit**

```bash
git add src/routes/_app/compliance/reports/ src/features/compliance/pages/page-reports.tsx
git commit -m "feat(compliance): add reports page stub"
```

---

### Task 23: Create Alerts Route and Page Stub

**Files:**
- Create: `src/routes/_app/compliance/alerts/index.tsx`
- Create: `src/features/compliance/pages/page-alerts.tsx`

**Step 1: Create route**

```typescript
// src/routes/_app/compliance/alerts/index.tsx
import { createFileRoute } from '@tanstack/react-router';

import { PageComplianceAlerts } from '@/features/compliance/pages/page-alerts';

export const Route = createFileRoute('/_app/compliance/alerts/')({
  component: PageComplianceAlerts,
});
```

**Step 2: Create page stub**

```typescript
// src/features/compliance/pages/page-alerts.tsx
import { Link } from '@tanstack/react-router';
import { BellIcon, SettingsIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/treasury-6';

export const PageComplianceAlerts = () => {
  return (
    <PageLayout>
      <PageLayoutTopBar>
        <PageLayoutTopBarTitle>
          <div className="flex items-center gap-2">
            <Link to="/compliance" className="text-neutral-500 hover:text-neutral-700">
              Compliance
            </Link>
            <span className="text-neutral-400">/</span>
            <span>Alerts</span>
          </div>
        </PageLayoutTopBarTitle>
      </PageLayoutTopBar>
      <PageLayoutContent>
        <div className="space-y-6">
          <div className="flex items-center gap-4 border-b border-neutral-200 pb-4">
            <Button variant="default" size="sm">
              <BellIcon className="mr-2 h-4 w-4" />
              Notifications
            </Button>
            <Button variant="ghost" size="sm">
              <SettingsIcon className="mr-2 h-4 w-4" />
              Alert Rules
            </Button>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
            <BellIcon className="mx-auto h-12 w-12 text-neutral-300" />
            <h3 className="mt-4 font-semibold text-neutral-900">No New Alerts</h3>
            <p className="mt-2 text-sm text-neutral-500">
              When new compliance events occur, they will appear here.
            </p>
          </div>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
```

**Step 3: Verify all routes**

Run: `pnpm dev`
Navigate to: `/compliance`, `/compliance/transactions`, `/compliance/addresses`, `/compliance/reports`, `/compliance/alerts`
Expected: All pages render correctly

**Step 4: Commit**

```bash
git add src/routes/_app/compliance/alerts/ src/features/compliance/pages/page-alerts.tsx
git commit -m "feat(compliance): add alerts page stub"
```

---

### Task 24: Run Tests and Final Verification

**Step 1: Run type check**

Run: `pnpm typecheck`
Expected: No type errors

**Step 2: Run linting**

Run: `pnpm lint`
Expected: No linting errors (or only minor warnings)

**Step 3: Run tests**

Run: `pnpm test`
Expected: All tests pass

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(compliance): complete phase 1-6 of compliance UI"
```

---

## Summary

This plan implements the core compliance UI with:

- **Phase 1:** Foundation (permissions, types, navigation, routes)
- **Phase 2:** Dashboard (metrics, activity, attention items)
- **Phase 3:** Transactions list
- **Phase 4:** Transaction detail with provider assessments
- **Phase 5:** Addresses list and dossier
- **Phase 6:** Reports and alerts stubs

**Not included in this plan (future phases):**
- Backend ORPC procedures and Prisma models
- Integration setup wizard and settings page
- Provider API integrations
- Report generation logic
- Alert notification system
- Webhook configuration
