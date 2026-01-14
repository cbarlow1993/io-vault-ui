import { Link, useParams } from '@tanstack/react-router';
import {
  AlertTriangleIcon,
  CheckIcon,
  ClockIcon,
  CoinsIcon,
  DollarSignIcon,
  EditIcon,
  HistoryIcon,
  LinkIcon,
  LockIcon,
  PlusIcon,
  RotateCcwIcon,
  SendIcon,
  ShieldCheckIcon,
  ShieldXIcon,
  TrashIcon,
  UserIcon,
  UsersIcon,
  XIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  type PolicyChange,
  type PolicyChangeType,
  type PolicyVersionStatus,
  type SpendingLimit,
} from './data/transaction-policies';

// Change types that represent actual edits/modifications and significant workflow events
const EDIT_CHANGE_TYPES: PolicyChangeType[] = [
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
];

// Mock required approvers for demo (in real app, this would come from the policy config)
const REQUIRED_APPROVERS = ['Alice Chen', 'Bob Martinez', 'Charlie Kim'];

const getStatusIcon = (status: PolicyVersionStatus) => {
  switch (status) {
    case 'active':
      return <ShieldCheckIcon className="size-3.5" />;
    case 'draft':
      return <EditIcon className="size-3.5" />;
    case 'pending':
      return <ClockIcon className="size-3.5" />;
    case 'superseded':
      return <HistoryIcon className="size-3.5" />;
  }
};

const getChangeTypeIcon = (type: PolicyChangeType) => {
  switch (type) {
    case 'policy_created':
    case 'spending_limit_added':
    case 'velocity_limit_added':
    case 'time_restriction_added':
    case 'asset_restriction_added':
    case 'whitelist_added':
      return <PlusIcon className="size-3.5" />;
    case 'name_updated':
    case 'description_updated':
    case 'spending_limit_modified':
    case 'velocity_limit_modified':
    case 'time_restriction_modified':
    case 'asset_restriction_modified':
    case 'approval_requirement_modified':
      return <EditIcon className="size-3.5" />;
    case 'spending_limit_removed':
    case 'velocity_limit_removed':
    case 'time_restriction_removed':
    case 'asset_restriction_removed':
    case 'whitelist_removed':
      return <TrashIcon className="size-3.5" />;
    case 'submitted_for_approval':
      return <SendIcon className="size-3.5" />;
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
    case 'name_updated':
    case 'description_updated':
    case 'spending_limit_modified':
    case 'velocity_limit_modified':
    case 'time_restriction_modified':
    case 'asset_restriction_modified':
    case 'approval_requirement_modified':
      return 'bg-indigo-100 text-indigo-700';
    case 'submitted_for_approval':
      return 'bg-brand-100 text-brand-700';
    case 'approvals_reset':
      return 'bg-warning-100 text-warning-700';
    default:
      return 'bg-neutral-100 text-neutral-600';
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
    full: date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
};

const formatChangeType = (type: PolicyChangeType): string => {
  switch (type) {
    case 'policy_created':
      return 'Created';
    case 'name_updated':
      return 'Name Updated';
    case 'description_updated':
      return 'Description Updated';
    case 'spending_limit_added':
      return 'Spending Limit Added';
    case 'spending_limit_removed':
      return 'Spending Limit Removed';
    case 'spending_limit_modified':
      return 'Spending Limit Modified';
    case 'velocity_limit_added':
      return 'Velocity Limit Added';
    case 'velocity_limit_removed':
      return 'Velocity Limit Removed';
    case 'velocity_limit_modified':
      return 'Velocity Limit Modified';
    case 'time_restriction_added':
      return 'Time Restriction Added';
    case 'time_restriction_removed':
      return 'Time Restriction Removed';
    case 'time_restriction_modified':
      return 'Time Restriction Modified';
    case 'asset_restriction_added':
      return 'Asset Restriction Added';
    case 'asset_restriction_removed':
      return 'Asset Restriction Removed';
    case 'asset_restriction_modified':
      return 'Asset Restriction Modified';
    case 'approval_requirement_modified':
      return 'Approval Modified';
    case 'whitelist_added':
      return 'Whitelist Added';
    case 'whitelist_removed':
      return 'Whitelist Removed';
    case 'status_changed':
      return 'Status Changed';
    case 'submitted_for_approval':
      return 'Submitted';
    case 'approved':
      return 'Approved';
    case 'approvals_reset':
      return 'Approvals Reset';
    default:
      return type;
  }
};

const formatTimeWindow = (window: string): string => {
  switch (window) {
    case 'per-transaction':
      return 'Per Transaction';
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
    default:
      return window;
  }
};

const formatDays = (days: number[]): string => {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days.map((d) => dayNames[d]).join(', ');
};

const formatHour = (hour: number): string => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:00 ${period}`;
};

export const PageTransactionPolicyVersionDetail = () => {
  const { policyId, versionNumber } = useParams({
    from: '/_app/policies/transactions/$policyId/versions/$versionNumber/',
  });
  const policy = getPolicyById(policyId);
  const version = policy?.versions.find(
    (v) => v.version === Number(versionNumber)
  );

  if (!policy || !version) {
    return (
      <PageLayout>
        <PageLayoutTopBar
          breadcrumbs={[
            { label: 'Transaction Policies', href: '/policies/transactions' },
            { label: policyId, href: `/policies/transactions/${policyId}` },
            { label: 'Version Not Found' },
          ]}
        />
        <PageLayoutContent containerClassName="py-8">
          <div className="text-center">
            <p className="text-neutral-500">
              The requested version could not be found.
            </p>
            <Link
              to="/policies/transactions/$policyId"
              params={{ policyId }}
              className="mt-4 inline-block text-sm text-brand-500 hover:underline"
            >
              Back to Policy
            </Link>
          </div>
        </PageLayoutContent>
      </PageLayout>
    );
  }

  const { date: createdDate, time: createdTime } = formatDateTime(
    version.createdAt
  );
  const isCurrentVersion = version.version === policy.currentVersion;

  // Filter changes to only show edits/adds (not approval workflow changes)
  const editChanges = useMemo(() => {
    return version.changes.filter((change) =>
      EDIT_CHANGE_TYPES.includes(change.type)
    );
  }, [version.changes]);

  // Extract approval information from changes
  const approvalChanges = useMemo(() => {
    return version.changes.filter((change) => change.type === 'approved');
  }, [version.changes]);

  // Determine who has approved and who is pending
  const approvedApprovers = version.approvedBy ?? [];
  const pendingApprovers = useMemo(() => {
    return REQUIRED_APPROVERS.filter(
      (name) => !approvedApprovers.includes(name)
    );
  }, [approvedApprovers]);

  const isDraft = version.status === 'draft';
  const isPending = version.status === 'pending';
  const rules = version.rules;

  // State for confirmation dialogs
  const [limitToDelete, setLimitToDelete] = useState<SpendingLimit | null>(
    null
  );
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  return (
    <PageLayout>
      <PageLayoutTopBar
        breadcrumbs={[
          { label: 'Transaction Policies', href: '/policies/transactions' },
          {
            label: policy.name,
            href: `/policies/transactions/${policyId}`,
          },
          { label: `Version ${version.version}` },
        ]}
        status={
          <>
            {isCurrentVersion && (
              <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">
                Current
              </span>
            )}
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
                getStatusStyles(version.status)
              )}
            >
              {getStatusIcon(version.status)}
              {version.status}
            </span>
          </>
        }
        actions={
          isDraft ? (
            <>
              {/* Reset Draft - clears all edits and bases on previous version */}
              <Button
                variant="secondary"
                className="h-7 rounded-none border-neutral-300 px-3 text-xs font-medium"
                onClick={() => setShowResetDialog(true)}
              >
                <RotateCcwIcon className="mr-1.5 size-3.5" />
                Reset Draft
              </Button>
              {/* Cancel - discards unsaved changes */}
              <Button
                variant="secondary"
                className="h-7 rounded-none border-neutral-300 px-3 text-xs font-medium"
                onClick={() => setShowCancelDialog(true)}
              >
                <XIcon className="mr-1.5 size-3.5" />
                Cancel
              </Button>
              {/* Submit for Approval - primary CTA */}
              <Button className="h-7 rounded-none bg-brand-500 px-3 text-xs font-medium text-white hover:bg-brand-600">
                <SendIcon className="mr-1.5 size-3.5" />
                Submit for Approval
              </Button>
            </>
          ) : undefined
        }
      />
      <PageLayoutContent containerClassName="py-4">
        <div className="space-y-6">
          {/* Version Summary */}
          <div className="border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
              <h2 className="text-sm font-semibold text-neutral-900">
                Version Summary
              </h2>
            </div>
            <div className="grid grid-cols-4 gap-px bg-neutral-200">
              <div className="bg-white p-4">
                <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                  Version
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <div
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                      isCurrentVersion
                        ? 'bg-brand-100 text-brand-700'
                        : 'bg-neutral-100 text-neutral-600'
                    )}
                  >
                    v{version.version}
                  </div>
                  <span className="text-sm font-medium text-neutral-900">
                    of {policy.versions.length}
                  </span>
                </div>
              </div>
              <div className="bg-white p-4">
                <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                  Created
                </p>
                <div className="mt-1">
                  <p className="text-sm font-medium text-neutral-900 tabular-nums">
                    {createdDate}
                  </p>
                  <p className="text-[10px] text-neutral-500">
                    at {createdTime}
                  </p>
                </div>
              </div>
              <div className="bg-white p-4">
                <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                  Created By
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex size-6 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-medium text-neutral-600">
                    {version.createdBy
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                  <span className="text-sm font-medium text-neutral-900">
                    {version.createdBy}
                  </span>
                </div>
              </div>
              <div className="bg-white p-4">
                <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                  Changes
                </p>
                <p className="mt-1 text-sm font-medium text-neutral-900">
                  {editChanges.length}{' '}
                  {editChanges.length === 1 ? 'change' : 'changes'}
                </p>
              </div>
            </div>
            {version.comment && (
              <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-3">
                <p className="text-xs text-neutral-600 italic">
                  "{version.comment}"
                </p>
              </div>
            )}
          </div>

          {/* Version Status Banner */}
          {version.status === 'draft' && (
            <div className="flex items-center gap-3 border border-brand-200 bg-brand-50 px-4 py-3">
              <EditIcon className="size-5 text-brand-600" />
              <div>
                <p className="text-sm font-medium text-brand-900">
                  Draft Version
                </p>
                <p className="text-xs text-brand-700">
                  This version is in draft mode and can be freely edited. Submit
                  for approval when ready.
                </p>
              </div>
            </div>
          )}
          {version.status === 'pending' && (
            <div className="flex items-center gap-3 border border-warning-200 bg-warning-50 px-4 py-3">
              <AlertTriangleIcon className="size-5 text-warning-600" />
              <div>
                <p className="text-sm font-medium text-warning-900">
                  Pending Approval
                </p>
                <p className="text-xs text-warning-700">
                  This version is awaiting approval. Editing will reset all
                  existing approvals.
                </p>
              </div>
            </div>
          )}
          {(version.status === 'active' || version.status === 'superseded') && (
            <div className="flex items-center gap-3 border border-neutral-200 bg-neutral-50 px-4 py-3">
              <LockIcon className="size-5 text-neutral-500" />
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {version.status === 'active'
                    ? 'Active Version'
                    : 'Superseded Version'}
                </p>
                <p className="text-xs text-neutral-600">
                  {version.status === 'active'
                    ? 'This is the current active version. It cannot be edited. Create a new draft to make changes.'
                    : 'This version was previously active but has been replaced. It cannot be edited.'}
                </p>
              </div>
            </div>
          )}

          {/* Policy Rules */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">
                  Policy Rules
                </h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Rules and restrictions for this policy version
                </p>
              </div>
            </div>

            <div className="divide-y divide-neutral-100">
              {/* Approval Requirements */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-brand-100">
                      <UsersIcon className="size-5 text-brand-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        Approval Requirements
                      </p>
                      <p className="text-xs text-neutral-500">
                        {rules.approvalType === 'threshold'
                          ? 'Threshold approval'
                          : rules.approvalType === 'unanimous'
                            ? 'Unanimous approval'
                            : rules.approvalType === 'any'
                              ? 'Any approver'
                              : 'Tiered approval'}
                      </p>
                    </div>
                  </div>
                  {isDraft && (
                    <Button
                      variant="secondary"
                      className="h-7 rounded-none border-neutral-200 px-3 text-xs font-medium"
                    >
                      <EditIcon className="mr-1.5 size-3.5" />
                      Edit
                    </Button>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-4 rounded bg-neutral-50 p-3">
                  <div>
                    <p className="text-[10px] font-medium text-neutral-400 uppercase">
                      Required
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-neutral-900">
                      {formatApprovalRequirement(rules.approvalRequirement)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-neutral-400 uppercase">
                      Approver Groups
                    </p>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {rules.approvalRequirement.approverGroups?.map(
                        (group) => (
                          <span
                            key={group}
                            className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-700"
                          >
                            {group}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-neutral-400 uppercase">
                      Timeout
                    </p>
                    <p className="mt-0.5 text-sm text-neutral-700">
                      {rules.approvalRequirement.timeoutHours} hours
                    </p>
                  </div>
                </div>
              </div>

              {/* Spending Limits */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-terminal-100">
                      <DollarSignIcon className="size-5 text-terminal-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        Spending Limits
                      </p>
                      <p className="text-xs text-neutral-500">
                        {rules.spendingLimits?.length || 0} limit
                        {(rules.spendingLimits?.length || 0) !== 1
                          ? 's'
                          : ''}{' '}
                        configured
                      </p>
                    </div>
                  </div>
                  {isDraft && (
                    <Button className="h-7 rounded-none bg-brand-500 px-3 text-xs font-medium text-white hover:bg-brand-600">
                      <PlusIcon className="mr-1.5 size-3.5" />
                      Add Limit
                    </Button>
                  )}
                </div>
                {rules.spendingLimits && rules.spendingLimits.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {rules.spendingLimits.map((limit, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded bg-neutral-50 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-full bg-terminal-100 text-xs font-medium text-terminal-700">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-neutral-900">
                              {formatSpendingLimit(limit)}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {formatTimeWindow(limit.timeWindow)}
                            </p>
                          </div>
                        </div>
                        {isDraft && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="secondary"
                              size="icon"
                              className="size-7 rounded-none border-neutral-200"
                            >
                              <EditIcon className="size-3.5" />
                            </Button>
                            <Button
                              variant="secondary"
                              size="icon"
                              className="size-7 rounded-none border-neutral-200 text-neutral-400 hover:border-negative-300 hover:bg-negative-50 hover:text-negative-600"
                              onClick={() => setLimitToDelete(limit)}
                            >
                              <TrashIcon className="size-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded bg-neutral-50 p-4 text-center text-sm text-neutral-500">
                    No spending limits configured
                  </div>
                )}
              </div>

              {/* Time Restrictions */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-100">
                      <ClockIcon className="size-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        Time Restrictions
                      </p>
                      <p className="text-xs text-neutral-500">
                        {rules.timeRestrictions
                          ? 'Restricted to specific hours'
                          : 'No time restrictions'}
                      </p>
                    </div>
                  </div>
                  {isDraft && !rules.timeRestrictions && (
                    <Button className="h-7 rounded-none bg-brand-500 px-3 text-xs font-medium text-white hover:bg-brand-600">
                      <PlusIcon className="mr-1.5 size-3.5" />
                      Add Restriction
                    </Button>
                  )}
                  {isDraft && rules.timeRestrictions && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        className="h-7 rounded-none border-neutral-200 px-3 text-xs font-medium"
                      >
                        <EditIcon className="mr-1.5 size-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        className="h-7 rounded-none border-neutral-200 px-3 text-xs font-medium text-neutral-400 hover:border-negative-300 hover:bg-negative-50 hover:text-negative-600"
                      >
                        <TrashIcon className="mr-1.5 size-3.5" />
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
                {rules.timeRestrictions && (
                  <div className="mt-3 grid grid-cols-3 gap-4 rounded bg-neutral-50 p-3">
                    <div>
                      <p className="text-[10px] font-medium text-neutral-400 uppercase">
                        Allowed Days
                      </p>
                      <p className="mt-0.5 text-sm text-neutral-900">
                        {formatDays(rules.timeRestrictions.allowedDays)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-neutral-400 uppercase">
                        Time Window
                      </p>
                      <p className="mt-0.5 text-sm text-neutral-900">
                        {formatHour(rules.timeRestrictions.startHour)} -{' '}
                        {formatHour(rules.timeRestrictions.endHour)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-neutral-400 uppercase">
                        Timezone
                      </p>
                      <p className="mt-0.5 text-sm text-neutral-900">
                        {rules.timeRestrictions.timezone}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Asset Restrictions */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-warning-100">
                      <CoinsIcon className="size-5 text-warning-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        Asset Restrictions
                      </p>
                      <p className="text-xs text-neutral-500">
                        {rules.assetRestrictions
                          ? 'Restricted to specific assets/chains'
                          : 'No asset restrictions'}
                      </p>
                    </div>
                  </div>
                  {isDraft && !rules.assetRestrictions && (
                    <Button className="h-7 rounded-none bg-brand-500 px-3 text-xs font-medium text-white hover:bg-brand-600">
                      <PlusIcon className="mr-1.5 size-3.5" />
                      Add Restriction
                    </Button>
                  )}
                  {isDraft && rules.assetRestrictions && (
                    <Button
                      variant="secondary"
                      className="h-7 rounded-none border-neutral-200 px-3 text-xs font-medium"
                    >
                      <EditIcon className="mr-1.5 size-3.5" />
                      Edit
                    </Button>
                  )}
                </div>
                {rules.assetRestrictions && (
                  <div className="mt-3 space-y-3 rounded bg-neutral-50 p-3">
                    {rules.assetRestrictions.allowedAssets &&
                      rules.assetRestrictions.allowedAssets.length > 0 && (
                        <div>
                          <p className="text-[10px] font-medium text-neutral-400 uppercase">
                            Allowed Assets
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {rules.assetRestrictions.allowedAssets.map(
                              (asset) => (
                                <span
                                  key={asset}
                                  className="rounded bg-terminal-100 px-1.5 py-0.5 text-[10px] font-medium text-terminal-700"
                                >
                                  {asset}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    {rules.assetRestrictions.blockedAssets &&
                      rules.assetRestrictions.blockedAssets.length > 0 && (
                        <div>
                          <p className="text-[10px] font-medium text-neutral-400 uppercase">
                            Blocked Assets
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {rules.assetRestrictions.blockedAssets.map(
                              (asset) => (
                                <span
                                  key={asset}
                                  className="rounded bg-negative-100 px-1.5 py-0.5 text-[10px] font-medium text-negative-700"
                                >
                                  {asset}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    {rules.assetRestrictions.allowedChains &&
                      rules.assetRestrictions.allowedChains.length > 0 && (
                        <div>
                          <p className="text-[10px] font-medium text-neutral-400 uppercase">
                            Allowed Chains
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {rules.assetRestrictions.allowedChains.map(
                              (chain) => (
                                <span
                                  key={chain}
                                  className="rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-700"
                                >
                                  {chain}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    {rules.assetRestrictions.blockedChains &&
                      rules.assetRestrictions.blockedChains.length > 0 && (
                        <div>
                          <p className="text-[10px] font-medium text-neutral-400 uppercase">
                            Blocked Chains
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {rules.assetRestrictions.blockedChains.map(
                              (chain) => (
                                <span
                                  key={chain}
                                  className="rounded bg-negative-100 px-1.5 py-0.5 text-[10px] font-medium text-negative-700"
                                >
                                  {chain}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* Whitelist Requirements */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex size-10 items-center justify-center rounded-lg',
                        rules.whitelistRequired
                          ? 'bg-positive-100'
                          : 'bg-neutral-100'
                      )}
                    >
                      {rules.whitelistRequired ? (
                        <ShieldCheckIcon className="size-5 text-positive-600" />
                      ) : (
                        <ShieldXIcon className="size-5 text-neutral-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        Whitelist Requirements
                      </p>
                      <p className="text-xs text-neutral-500">
                        {rules.whitelistRequired
                          ? 'Recipients must be whitelisted'
                          : 'No whitelist requirement'}
                      </p>
                    </div>
                  </div>
                  {isDraft && (
                    <Button
                      variant="secondary"
                      className="h-7 rounded-none border-neutral-200 px-3 text-xs font-medium"
                    >
                      <EditIcon className="mr-1.5 size-3.5" />
                      Edit
                    </Button>
                  )}
                </div>
                {rules.whitelistRequired &&
                  rules.whitelistIds &&
                  rules.whitelistIds.length > 0 && (
                    <div className="mt-3 rounded bg-neutral-50 p-3">
                      <p className="text-[10px] font-medium text-neutral-400 uppercase">
                        Linked Whitelists
                      </p>
                      <div className="mt-2 space-y-2">
                        {rules.whitelistIds.map((wlId) => (
                          <div
                            key={wlId}
                            className="flex items-center justify-between rounded bg-white p-2"
                          >
                            <div className="flex items-center gap-2">
                              <LinkIcon className="size-3.5 text-neutral-400" />
                              <span className="text-xs font-medium text-neutral-700">
                                {wlId}
                              </span>
                            </div>
                            {isDraft && (
                              <Button
                                variant="secondary"
                                size="icon"
                                className="size-6 rounded-none border-neutral-200 text-neutral-400 hover:border-negative-300 hover:bg-negative-50 hover:text-negative-600"
                              >
                                <XIcon className="size-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                      {isDraft && (
                        <Button
                          variant="secondary"
                          className="mt-2 h-7 w-full rounded-none border-dashed border-neutral-300 text-xs font-medium text-neutral-500 hover:border-brand-300 hover:text-brand-600"
                        >
                          <PlusIcon className="mr-1.5 size-3.5" />
                          Add Whitelist
                        </Button>
                      )}
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* Approval Information - Only show for pending, active, and superseded statuses */}
          {version.status !== 'draft' && (
            <div className="border border-neutral-200 bg-white">
              <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-neutral-900">
                    Approval Status
                  </h2>
                  <span
                    className={cn(
                      'rounded px-2 py-0.5 text-[10px] font-medium',
                      version.status === 'active' ||
                        version.status === 'superseded'
                        ? 'bg-positive-100 text-positive-700'
                        : version.status === 'pending'
                          ? 'bg-warning-100 text-warning-700'
                          : 'bg-neutral-100 text-neutral-600'
                    )}
                  >
                    {approvedApprovers.length} of {REQUIRED_APPROVERS.length}{' '}
                    approved
                  </span>
                </div>
              </div>
              <div className="divide-y divide-neutral-100">
                {/* Approvers List */}
                <div className="p-4">
                  <div className="space-y-3">
                    {/* Approved */}
                    {approvedApprovers.map((name) => {
                      const approvalChange = approvalChanges.find(
                        (c) => c.changedBy === name
                      );
                      const approvalTime = approvalChange
                        ? formatDateTime(approvalChange.changedAt)
                        : null;

                      return (
                        <div
                          key={name}
                          className="flex items-center justify-between rounded-lg bg-positive-50 px-3 py-2"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 items-center justify-center rounded-full bg-positive-100 text-xs font-medium text-positive-700">
                              {name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-positive-800">
                                {name}
                              </p>
                              {approvalTime && (
                                <p className="text-[10px] text-positive-600">
                                  Approved {approvalTime.date} at{' '}
                                  {approvalTime.time}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 rounded-full bg-positive-100 px-2 py-1">
                            <CheckIcon className="size-3.5 text-positive-600" />
                            <span className="text-xs font-medium text-positive-700">
                              Approved
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Pending - only show for pending status */}
                    {version.status === 'pending' &&
                      pendingApprovers.map((name) => (
                        <div
                          key={name}
                          className="flex items-center justify-between rounded-lg bg-warning-50 px-3 py-2"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 items-center justify-center rounded-full bg-warning-100 text-xs font-medium text-warning-700">
                              {name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-warning-800">
                                {name}
                              </p>
                              <p className="text-[10px] text-warning-600">
                                Awaiting approval
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 rounded-full bg-warning-100 px-2 py-1">
                            <ClockIcon className="size-3.5 text-warning-600" />
                            <span className="text-xs font-medium text-warning-700">
                              Pending
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Activation Date */}
                {version.activatedAt && (
                  <div className="bg-neutral-50 p-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheckIcon className="size-4 text-positive-500" />
                      <span className="text-xs text-neutral-600">
                        Activated on{' '}
                        <span className="font-medium text-neutral-900">
                          {formatDateTime(version.activatedAt).full}
                        </span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Change History Timeline */}
          <div className="border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
              <h2 className="text-sm font-semibold text-neutral-900">
                Changes
              </h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                Edits and modifications made in this version
              </p>
            </div>
            <div className="divide-y divide-neutral-100">
              {editChanges.length === 0 ? (
                <div className="px-4 py-8 text-center text-neutral-500">
                  No changes recorded for this version.
                </div>
              ) : (
                editChanges.map((change, idx) => {
                  const { date, time } = formatDateTime(change.changedAt);
                  const isLast = idx === editChanges.length - 1;

                  return (
                    <div
                      key={change.id}
                      className="relative flex gap-4 px-4 py-4"
                    >
                      {/* Timeline connector */}
                      <div className="flex flex-col items-center">
                        <div
                          className={cn(
                            'flex size-8 shrink-0 items-center justify-center rounded-full',
                            getChangeTypeStyles(change.type)
                          )}
                        >
                          {getChangeTypeIcon(change.type)}
                        </div>
                        {!isLast && (
                          <div className="mt-2 h-full w-px bg-neutral-200" />
                        )}
                      </div>

                      {/* Change content */}
                      <div className="flex-1 pb-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span
                              className={cn(
                                'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium',
                                getChangeTypeStyles(change.type)
                              )}
                            >
                              {formatChangeType(change.type)}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-neutral-500 tabular-nums">
                              {date}
                            </p>
                            <p className="text-[10px] text-neutral-400 tabular-nums">
                              {time}
                            </p>
                          </div>
                        </div>
                        <p className="mt-1 text-sm text-neutral-900">
                          {change.description}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <UserIcon className="size-3 text-neutral-400" />
                          <span className="text-xs text-neutral-500">
                            {change.changedBy}
                          </span>
                          {change.changedByEmail && (
                            <>
                              <span className="text-neutral-300">•</span>
                              <span className="text-xs text-neutral-400">
                                {change.changedByEmail}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Value changes */}
                        {(change.previousValue || change.newValue) && (
                          <div className="mt-3 rounded bg-neutral-50 p-3">
                            {change.previousValue && (
                              <div className="flex items-start gap-2">
                                <span className="text-[10px] font-medium text-neutral-400 uppercase">
                                  From:
                                </span>
                                <code className="flex-1 font-mono text-[11px] break-all text-negative-600">
                                  {change.previousValue}
                                </code>
                              </div>
                            )}
                            {change.newValue && (
                              <div className="mt-1 flex items-start gap-2">
                                <span className="text-[10px] font-medium text-neutral-400 uppercase">
                                  To:
                                </span>
                                <code className="flex-1 font-mono text-[11px] break-all text-positive-600">
                                  {change.newValue}
                                </code>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Metadata */}
                        {change.metadata &&
                          Object.keys(change.metadata).length > 0 && (
                            <div className="mt-2">
                              {Object.entries(change.metadata).map(
                                ([key, value]) => (
                                  <div
                                    key={key}
                                    className="text-xs text-neutral-500"
                                  >
                                    <span className="font-medium capitalize">
                                      {key}:
                                    </span>{' '}
                                    {value}
                                  </div>
                                )
                              )}
                            </div>
                          )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </PageLayoutContent>

      {/* Remove Spending Limit Confirmation Dialog */}
      <Dialog
        open={limitToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setLimitToDelete(null);
        }}
      >
        <DialogContent className="max-w-md rounded-none sm:max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center bg-negative-100">
                <AlertTriangleIcon className="size-5 text-negative-600" />
              </div>
              <div>
                <DialogTitle className="text-base text-negative-700">
                  Remove Spending Limit
                </DialogTitle>
                <DialogDescription className="text-xs">
                  This will remove the limit from this version
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-neutral-700">
              Are you sure you want to remove this spending limit?
            </p>

            {limitToDelete && (
              <div className="border border-neutral-200 bg-neutral-50 p-3">
                <h4 className="mb-2 text-xs font-semibold text-neutral-700">
                  Limit Details
                </h4>
                <dl className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Amount</dt>
                    <dd className="font-semibold text-neutral-900">
                      {formatSpendingLimit(limitToDelete)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Period</dt>
                    <dd className="text-neutral-900">
                      {formatTimeWindow(limitToDelete.timeWindow)}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-neutral-200 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setLimitToDelete(null)}
              className="h-8 rounded-none border-neutral-200 px-4 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                // TODO: Implement limit removal
                console.log('Removing limit:', limitToDelete);
                setLimitToDelete(null);
              }}
              className={cn(
                'h-8 rounded-none px-4 text-xs text-white',
                'bg-negative-600 hover:bg-negative-700'
              )}
            >
              Remove Limit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Draft Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-md rounded-none sm:max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center bg-warning-100">
                <AlertTriangleIcon className="size-5 text-warning-600" />
              </div>
              <div>
                <DialogTitle className="text-base text-warning-700">
                  Cancel Draft
                </DialogTitle>
                <DialogDescription className="text-xs">
                  All unsaved changes will be lost
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-neutral-700">
              Are you sure you want to cancel this draft? All changes since your
              last save will be discarded.
            </p>
          </div>

          <DialogFooter className="border-t border-neutral-200 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCancelDialog(false)}
              className="h-8 rounded-none border-neutral-200 px-4 text-xs"
            >
              Keep Editing
            </Button>
            <Button
              type="button"
              onClick={() => {
                // TODO: Implement cancel
                console.log('Cancelling draft');
                setShowCancelDialog(false);
              }}
              className={cn(
                'h-8 rounded-none px-4 text-xs text-white',
                'bg-warning-600 hover:bg-warning-700'
              )}
            >
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Draft Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="max-w-md rounded-none sm:max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center bg-warning-100">
                <RotateCcwIcon className="size-5 text-warning-600" />
              </div>
              <div>
                <DialogTitle className="text-base text-warning-700">
                  Reset Draft
                </DialogTitle>
                <DialogDescription className="text-xs">
                  This will revert all changes in this draft
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-neutral-700">
              Are you sure you want to reset this draft? All changes will be
              reverted to match the current active version.
            </p>
          </div>

          <DialogFooter className="border-t border-neutral-200 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowResetDialog(false)}
              className="h-8 rounded-none border-neutral-200 px-4 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                // TODO: Implement reset
                console.log('Resetting draft');
                setShowResetDialog(false);
              }}
              className={cn(
                'h-8 rounded-none px-4 text-xs text-white',
                'bg-warning-600 hover:bg-warning-700'
              )}
            >
              Reset Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};
