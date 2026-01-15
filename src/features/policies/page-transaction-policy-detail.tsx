import { Link, useNavigate, useParams } from '@tanstack/react-router';
import {
  AlertTriangleIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  EditIcon,
  FileEditIcon,
  GitBranchIcon,
  GlobeIcon,
  HistoryIcon,
  KeyIcon,
  LockIcon,
  MoreHorizontalIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  PlusIcon,
  SendIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  UsersIcon,
  XCircleIcon,
  XIcon,
  ZapIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  FilterSelect,
  type FilterSelectOption,
} from '@/features/shared/components/filter-select';
import { getStatusStyles } from '@/features/shared/lib/status-styles';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
} from '@/layout/shell';

import {
  formatApprovalRequirement,
  formatSpendingLimit,
  getPolicyById,
  type PolicyChangeType,
  type PolicyStatus,
  type PolicyVersionStatus,
} from './data/transaction-policies';

const getStatusIcon = (status: PolicyStatus | PolicyVersionStatus) => {
  switch (status) {
    case 'active':
      return <ShieldCheckIcon className="size-3.5" />;
    case 'draft':
      return <FileEditIcon className="size-3.5" />;
    case 'pending':
      return <ClockIcon className="size-3.5" />;
    case 'superseded':
      return <LockIcon className="size-3.5" />;
    case 'disabled':
      return <PauseCircleIcon className="size-3.5" />;
  }
};

const getChangeTypeIcon = (type: PolicyChangeType) => {
  switch (type) {
    case 'policy_created':
      return <PlusIcon className="size-3.5" />;
    case 'name_updated':
    case 'description_updated':
    case 'spending_limit_modified':
    case 'velocity_limit_modified':
    case 'time_restriction_modified':
    case 'asset_restriction_modified':
    case 'approval_requirement_modified':
      return <EditIcon className="size-3.5" />;
    case 'spending_limit_added':
    case 'velocity_limit_added':
    case 'time_restriction_added':
    case 'asset_restriction_added':
    case 'whitelist_added':
      return <PlusIcon className="size-3.5" />;
    case 'spending_limit_removed':
    case 'velocity_limit_removed':
    case 'time_restriction_removed':
    case 'asset_restriction_removed':
    case 'whitelist_removed':
      return <XCircleIcon className="size-3.5" />;
    case 'status_changed':
      return <ShieldAlertIcon className="size-3.5" />;
    case 'submitted_for_approval':
      return <SendIcon className="size-3.5" />;
    case 'approved':
      return <CheckIcon className="size-3.5" />;
    case 'approvals_reset':
      return <AlertTriangleIcon className="size-3.5" />;
    default:
      return <HistoryIcon className="size-3.5" />;
  }
};

const getChangeTypeStyles = (type: PolicyChangeType) => {
  switch (type) {
    case 'policy_created':
      return 'bg-brand-100 text-brand-700';
    case 'approved':
      return 'bg-positive-100 text-positive-700';
    case 'spending_limit_added':
    case 'velocity_limit_added':
    case 'time_restriction_added':
    case 'asset_restriction_added':
    case 'whitelist_added':
      return 'bg-terminal-100 text-terminal-700';
    case 'spending_limit_removed':
    case 'velocity_limit_removed':
    case 'time_restriction_removed':
    case 'asset_restriction_removed':
    case 'whitelist_removed':
      return 'bg-negative-100 text-negative-600';
    case 'status_changed':
    case 'submitted_for_approval':
      return 'bg-warning-100 text-warning-700';
    case 'approvals_reset':
      return 'bg-negative-100 text-negative-600';
    default:
      return 'bg-neutral-100 text-neutral-600';
  }
};

const getApprovalTypeIcon = (type: string) => {
  switch (type) {
    case 'threshold':
      return <UsersIcon className="size-4 text-neutral-500" />;
    case 'unanimous':
      return <ShieldCheckIcon className="size-4 text-neutral-500" />;
    case 'any':
      return <ZapIcon className="size-4 text-neutral-500" />;
    case 'tiered':
      return <ShieldAlertIcon className="size-4 text-neutral-500" />;
    default:
      return <UsersIcon className="size-4 text-neutral-500" />;
  }
};

const formatDateTime = (isoString: string) => {
  const date = new Date(isoString);
  return {
    date: date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    time: date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
};

const formatTimeRestriction = (
  restriction:
    | {
        allowedDays: number[];
        startHour: number;
        endHour: number;
        timezone: string;
      }
    | undefined
): string => {
  if (!restriction) return 'None';

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = restriction.allowedDays.map((d) => dayNames[d]).join(', ');
  const start = `${restriction.startHour}:00`;
  const end = `${restriction.endHour}:00`;

  return `${days} ${start}-${end} ${restriction.timezone}`;
};

export const PageTransactionPolicyDetail = () => {
  const { policyId } = useParams({
    from: '/_app/treasury/policies/transactions/$policyId/',
  });
  const navigate = useNavigate();
  const policy = getPolicyById(policyId);

  // Tab state
  const [activeTab, setActiveTab] = useState<'rules' | 'history'>('rules');

  // Dialog states
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);

  // Version history state
  const [selectedVersionFilter, setSelectedVersionFilter] = useState<
    number | null
  >(null);

  // Computed version info
  const draftVersion = useMemo(() => {
    if (!policy?.versions) return null;
    return policy.versions.find((v) => v.status === 'draft') ?? null;
  }, [policy]);

  const activeVersion = useMemo(() => {
    if (!policy?.versions) return null;
    return policy.versions.find((v) => v.status === 'active') ?? null;
  }, [policy]);

  const pendingVersion = useMemo(() => {
    if (!policy?.versions) return null;
    return policy.versions.find((v) => v.status === 'pending') ?? null;
  }, [policy]);

  const handleDisable = () => {
    toast.success('Policy disabled successfully');
    setDisableDialogOpen(false);
    navigate({ to: '/treasury/policies/transactions' });
  };

  if (!policy) {
    return (
      <PageLayout>
        <PageLayoutTopBar
          breadcrumbs={[
            {
              label: 'Transaction Policies',
              href: '/treasury/policies/transactions',
            },
            { label: 'Not Found' },
          ]}
        />
        <PageLayoutContent containerClassName="py-8">
          <div className="text-center">
            <p className="text-neutral-500">
              The requested policy could not be found.
            </p>
            <Link
              to="/treasury/policies/transactions"
              className="mt-4 inline-block text-sm text-brand-500 hover:underline"
            >
              Back to Policies
            </Link>
          </div>
        </PageLayoutContent>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageLayoutTopBar
        breadcrumbs={[
          {
            label: 'Transaction Policies',
            href: '/treasury/policies/transactions',
          },
          { label: policy.name },
        ]}
        status={
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
              getStatusStyles(policy.status)
            )}
          >
            {getStatusIcon(policy.status)}
            {policy.status}
          </span>
        }
        actions={
          policy.status === 'active' && !draftVersion ? (
            <Button
              asChild
              variant="secondary"
              className="h-7 rounded-none px-3 text-xs font-medium"
            >
              <Link
                to="/treasury/policies/transactions/$policyId/versions/$versionNumber"
                params={{ policyId, versionNumber: 'new' }}
              >
                <PlusIcon className="mr-1.5 size-3.5" />
                Create New Version
              </Link>
            </Button>
          ) : undefined
        }
      />
      <PageLayoutContent containerClassName="py-4">
        <div className="space-y-6">
          {/* Pending approval banner */}
          {policy.status === 'pending' && (
            <div className="flex items-center justify-between border border-warning-200 bg-warning-50 p-4">
              <div className="flex items-center gap-3">
                <ClockIcon className="size-5 text-warning-600" />
                <div>
                  <p className="text-sm font-medium text-warning-800">
                    Pending Approval
                  </p>
                  <p className="text-xs text-warning-600">
                    This policy is awaiting approval from authorized signers.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  className="h-7 rounded-none px-3 text-xs font-medium"
                >
                  Approve
                </Button>
                <Button
                  variant="ghost"
                  className="h-7 rounded-none px-3 text-xs font-medium text-negative-600"
                >
                  Reject
                </Button>
              </div>
            </div>
          )}

          {/* Draft version in progress banner */}
          {draftVersion && policy.status === 'active' && (
            <div className="flex items-center justify-between border border-brand-200 bg-brand-50 p-4">
              <div className="flex items-center gap-3">
                <FileEditIcon className="size-5 text-brand-600" />
                <div>
                  <p className="text-sm font-medium text-brand-900">
                    Draft Version in Progress
                  </p>
                  <p className="text-xs text-brand-700">
                    Version {draftVersion.version} is being prepared. The
                    current active version (v{activeVersion?.version}) remains
                    in effect.
                  </p>
                </div>
              </div>
              <Button
                asChild
                variant="secondary"
                className="h-7 rounded-none border-brand-300 bg-white px-3 text-xs font-medium text-brand-700 hover:bg-brand-50"
              >
                <Link
                  to="/treasury/policies/transactions/$policyId/versions/$versionNumber"
                  params={{
                    policyId,
                    versionNumber: String(draftVersion.version),
                  }}
                >
                  <EditIcon className="mr-1.5 size-3.5" />
                  Continue Editing Draft
                </Link>
              </Button>
            </div>
          )}

          {/* Info Grid */}
          <div className="grid grid-cols-4 gap-px bg-neutral-200">
            <div className="bg-white p-4">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Scope
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                {policy.scope === 'global' ? (
                  <GlobeIcon className="size-4 text-neutral-500" />
                ) : (
                  <KeyIcon className="size-4 text-neutral-500" />
                )}
                <span className="text-sm font-medium text-neutral-900 capitalize">
                  {policy.scope === 'global'
                    ? 'Global'
                    : (policy.vaultName ?? policy.scope)}
                </span>
              </div>
            </div>
            <div className="col-span-2 bg-white p-4">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Description
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-neutral-600">
                {policy.description}
              </p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Last Updated
              </p>
              <div className="mt-1">
                <p className="text-sm font-medium text-neutral-900 tabular-nums">
                  {policy.updatedAt}
                </p>
                <p className="text-[10px] text-neutral-400">
                  Created {policy.createdAt}
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border border-neutral-200 bg-white">
            {/* Tab Headers */}
            <div className="flex border-b border-neutral-200">
              <button
                type="button"
                onClick={() => setActiveTab('rules')}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium transition-colors',
                  activeTab === 'rules'
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                )}
              >
                <ShieldCheckIcon className="size-4" />
                Policy Rules
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium transition-colors',
                  activeTab === 'history'
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                )}
              >
                <HistoryIcon className="size-4" />
                Version History
                {policy.versions && (
                  <div className="flex items-center gap-1">
                    {activeVersion && (
                      <span
                        className={cn(
                          'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                          'bg-positive-100 text-positive-700'
                        )}
                      >
                        v{activeVersion.version}
                      </span>
                    )}
                    {draftVersion && (
                      <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">
                        draft
                      </span>
                    )}
                  </div>
                )}
              </button>
            </div>

            {/* Tab Content: Rules */}
            {activeTab === 'rules' && (
              <div className="divide-y divide-neutral-100">
                {/* Approval Settings */}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                      Approval Requirements
                    </h3>
                    <span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600 capitalize">
                      {policy.approvalType}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-4">
                    <div className="flex items-center gap-3">
                      {getApprovalTypeIcon(policy.approvalType)}
                      <div>
                        <p className="text-sm font-medium text-neutral-900">
                          {formatApprovalRequirement(
                            policy.approvalRequirement
                          )}
                        </p>
                        <p className="text-[10px] text-neutral-500">
                          Required Approvers
                        </p>
                      </div>
                    </div>
                    {policy.approvalRequirement.approverGroups && (
                      <div>
                        <p className="text-sm font-medium text-neutral-900">
                          {policy.approvalRequirement.approverGroups.join(', ')}
                        </p>
                        <p className="text-[10px] text-neutral-500">
                          Approver Groups
                        </p>
                      </div>
                    )}
                    {policy.approvalRequirement.timeoutHours && (
                      <div>
                        <p className="text-sm font-medium text-neutral-900">
                          {policy.approvalRequirement.timeoutHours}h
                        </p>
                        <p className="text-[10px] text-neutral-500">Timeout</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Spending Limits */}
                <div className="p-4">
                  <h3 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                    Spending Limits
                  </h3>
                  <div className="mt-3">
                    {policy.spendingLimits &&
                    policy.spendingLimits.length > 0 ? (
                      <div className="grid grid-cols-3 gap-4">
                        {policy.spendingLimits.map((limit, idx) => (
                          <div key={idx} className="rounded bg-neutral-50 p-3">
                            <p className="font-mono text-sm font-medium text-neutral-900">
                              {formatSpendingLimit(limit)}
                            </p>
                            <p className="text-[10px] text-neutral-500 capitalize">
                              {limit.timeWindow.replace('-', ' ')}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-neutral-500">
                        No spending limits configured
                      </p>
                    )}
                  </div>
                </div>

                {/* Time Restrictions */}
                <div className="p-4">
                  <h3 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                    Time Restrictions
                  </h3>
                  <div className="mt-3">
                    {policy.timeRestrictions ? (
                      <div className="rounded bg-neutral-50 p-3">
                        <p className="text-sm font-medium text-neutral-900">
                          {formatTimeRestriction(policy.timeRestrictions)}
                        </p>
                        <p className="text-[10px] text-neutral-500">
                          Allowed Trading Hours
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-neutral-500">
                        No time restrictions configured
                      </p>
                    )}
                  </div>
                </div>

                {/* Asset Restrictions */}
                <div className="p-4">
                  <h3 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                    Asset Restrictions
                  </h3>
                  <div className="mt-3">
                    {policy.assetRestrictions ? (
                      <div className="grid grid-cols-2 gap-4">
                        {policy.assetRestrictions.allowedAssets && (
                          <div className="rounded bg-terminal-50 p-3">
                            <p className="text-sm font-medium text-terminal-700">
                              {policy.assetRestrictions.allowedAssets.join(
                                ', '
                              )}
                            </p>
                            <p className="text-[10px] text-terminal-600">
                              Allowed Assets
                            </p>
                          </div>
                        )}
                        {policy.assetRestrictions.allowedChains && (
                          <div className="rounded bg-terminal-50 p-3">
                            <p className="text-sm font-medium text-terminal-700">
                              {policy.assetRestrictions.allowedChains.join(
                                ', '
                              )}
                            </p>
                            <p className="text-[10px] text-terminal-600">
                              Allowed Chains
                            </p>
                          </div>
                        )}
                        {policy.assetRestrictions.blockedAssets && (
                          <div className="rounded bg-negative-50 p-3">
                            <p className="text-sm font-medium text-negative-700">
                              {policy.assetRestrictions.blockedAssets.join(
                                ', '
                              )}
                            </p>
                            <p className="text-[10px] text-negative-600">
                              Blocked Assets
                            </p>
                          </div>
                        )}
                        {policy.assetRestrictions.blockedChains && (
                          <div className="rounded bg-negative-50 p-3">
                            <p className="text-sm font-medium text-negative-700">
                              {policy.assetRestrictions.blockedChains.join(
                                ', '
                              )}
                            </p>
                            <p className="text-[10px] text-negative-600">
                              Blocked Chains
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-neutral-500">
                        No asset restrictions configured
                      </p>
                    )}
                  </div>
                </div>

                {/* Whitelist Requirements */}
                <div className="p-4">
                  <h3 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                    Whitelist Requirements
                  </h3>
                  <div className="mt-3">
                    {policy.whitelistRequired ? (
                      <div className="flex items-center gap-3">
                        <CheckIcon className="size-4 text-positive-600" />
                        <div>
                          <p className="text-sm font-medium text-neutral-900">
                            Whitelist Required
                          </p>
                          {policy.whitelistIds &&
                            policy.whitelistIds.length > 0 && (
                              <p className="text-[10px] text-neutral-500">
                                Linked to {policy.whitelistIds.length}{' '}
                                whitelist(s)
                              </p>
                            )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <XIcon className="size-4 text-neutral-400" />
                        <p className="text-sm text-neutral-500">
                          No whitelist required
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab Content: Version History */}
            {activeTab === 'history' &&
              policy.versions &&
              policy.versions.length > 0 && (
                <>
                  {/* History Controls */}
                  <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50 px-4 py-2">
                    <div className="flex items-center gap-2">
                      <GitBranchIcon className="size-4 text-neutral-500" />
                      <span className="text-xs text-neutral-600">
                        {policy.versions.length} versions
                        {activeVersion && (
                          <> • Active: v{activeVersion.version}</>
                        )}
                        {draftVersion && (
                          <span className="text-brand-600">
                            {' '}
                            • Draft: v{draftVersion.version}
                          </span>
                        )}
                      </span>
                    </div>
                    <FilterSelect
                      options={[
                        { id: 'all', label: 'All Versions' },
                        ...policy.versions.map((v) => ({
                          id: String(v.version),
                          label: `Version ${v.version}`,
                        })),
                      ]}
                      value={
                        selectedVersionFilter === null
                          ? { id: 'all', label: 'All Versions' }
                          : {
                              id: String(selectedVersionFilter),
                              label: `Version ${selectedVersionFilter}`,
                            }
                      }
                      onChange={(v) =>
                        setSelectedVersionFilter(
                          v.id === 'all' ? null : Number(v.id)
                        )
                      }
                      className="w-32"
                    />
                  </div>

                  {/* Version List */}
                  <div className="max-h-[500px] divide-y divide-neutral-100 overflow-y-auto">
                    {policy.versions
                      .filter(
                        (v) =>
                          selectedVersionFilter === null ||
                          v.version === selectedVersionFilter
                      )
                      .sort((a, b) => b.version - a.version)
                      .map((version) => {
                        const { date: versionDate, time: versionTime } =
                          formatDateTime(version.createdAt);
                        const isActive = version.status === 'active';
                        const isDraft = version.status === 'draft';
                        const isPending = version.status === 'pending';

                        // Version circle styles based on status
                        const getVersionCircleStyles = () => {
                          if (isActive)
                            return 'bg-positive-100 text-positive-700';
                          if (isDraft) return 'bg-brand-100 text-brand-700';
                          if (isPending)
                            return 'bg-warning-100 text-warning-700';
                          return 'bg-neutral-100 text-neutral-600';
                        };

                        // Filter to only show edit changes (not approval events)
                        const editChanges = version.changes.filter((c) =>
                          [
                            'policy_created',
                            'name_updated',
                            'description_updated',
                            'spending_limit_added',
                            'spending_limit_removed',
                            'spending_limit_modified',
                            'velocity_limit_added',
                            'velocity_limit_removed',
                            'velocity_limit_modified',
                            'time_restriction_added',
                            'time_restriction_removed',
                            'time_restriction_modified',
                            'asset_restriction_added',
                            'asset_restriction_removed',
                            'asset_restriction_modified',
                            'approval_requirement_modified',
                            'whitelist_added',
                            'whitelist_removed',
                            'submitted_for_approval',
                            'approvals_reset',
                          ].includes(c.type)
                        );

                        return (
                          <Link
                            key={version.version}
                            to="/treasury/policies/transactions/$policyId/versions/$versionNumber"
                            params={{
                              policyId,
                              versionNumber: String(version.version),
                            }}
                            className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-neutral-50"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                                  getVersionCircleStyles()
                                )}
                              >
                                v{version.version}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-neutral-900">
                                    Version {version.version}
                                  </span>
                                  <span
                                    className={cn(
                                      'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
                                      getStatusStyles(version.status)
                                    )}
                                  >
                                    {getStatusIcon(version.status)}
                                    {version.status}
                                  </span>
                                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                                    {editChanges.length}{' '}
                                    {editChanges.length === 1
                                      ? 'change'
                                      : 'changes'}
                                  </span>
                                </div>
                                <div className="mt-0.5 flex items-center gap-2 text-xs text-neutral-500">
                                  <span>Created by {version.createdBy}</span>
                                  <span>•</span>
                                  <span>
                                    {versionDate} at {versionTime}
                                  </span>
                                </div>
                                {version.comment && (
                                  <p className="mt-1 text-xs text-neutral-500 italic">
                                    "{version.comment}"
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {/* Show approval avatars for active/superseded versions */}
                              {(version.status === 'active' ||
                                version.status === 'superseded') &&
                                version.approvedBy &&
                                version.approvedBy.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    {version.approvedBy
                                      .slice(0, 3)
                                      .map((name, idx) => (
                                        <div
                                          key={idx}
                                          className="flex size-6 items-center justify-center rounded-full bg-positive-100 text-[10px] font-medium text-positive-700"
                                          title={name}
                                        >
                                          {name
                                            .split(' ')
                                            .map((n) => n[0])
                                            .join('')}
                                        </div>
                                      ))}
                                    {version.approvedBy.length > 3 && (
                                      <span className="text-[10px] text-neutral-400">
                                        +{version.approvedBy.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}
                              {/* Show pending approval indicator for pending versions */}
                              {version.status === 'pending' &&
                                version.requiredApprovals && (
                                  <div className="flex items-center gap-1 text-[10px] text-warning-600">
                                    <ClockIcon className="size-3" />
                                    <span>
                                      {version.approvedBy?.length ?? 0}/
                                      {version.requiredApprovals} approved
                                    </span>
                                  </div>
                                )}
                              {/* Show draft indicator */}
                              {version.status === 'draft' && (
                                <span className="text-[10px] text-brand-600">
                                  Not submitted
                                </span>
                              )}
                              <ChevronRightIcon className="size-4 text-neutral-400" />
                            </div>
                          </Link>
                        );
                      })}
                  </div>
                </>
              )}
          </div>

          {/* Actions */}
          {policy.status === 'active' && (
            <div className="flex justify-end">
              <Dialog
                open={disableDialogOpen}
                onOpenChange={setDisableDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 rounded-none px-3 text-xs font-medium text-warning-600 hover:bg-warning-50 hover:text-warning-700"
                  >
                    <PauseCircleIcon className="mr-1.5 size-3.5" />
                    Disable Policy
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-none sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Disable Policy</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to disable "{policy.name}"? This
                      will stop the policy from being enforced on transactions.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setDisableDialogOpen(false)}
                      className="rounded-none"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleDisable}
                      className="rounded-none bg-warning-600 text-white hover:bg-warning-700"
                    >
                      Disable Policy
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
