import { Link, useParams } from '@tanstack/react-router';
import {
  AlertTriangleIcon,
  CheckIcon,
  ClockIcon,
  EditIcon,
  HistoryIcon,
  LockIcon,
  PlusIcon,
  RotateCcwIcon,
  SendIcon,
  ShieldCheckIcon,
  TrashIcon,
  UserIcon,
  XCircleIcon,
  XIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/tailwind/utils';

import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
} from '@/layout/treasury-6';

import {
  getWhitelistById,
  type WhitelistChange,
  type WhitelistChangeType,
  type WhitelistEntry,
  type WhitelistStatus,
} from './data/whitelists';

// Change types that represent actual edits/modifications and significant workflow events
const EDIT_CHANGE_TYPES: WhitelistChangeType[] = [
  'created',
  'name_updated',
  'description_updated',
  'entry_added',
  'entry_removed',
  'entry_updated',
  'submitted_for_approval', // Workflow event: draft -> pending
  'approvals_reset', // Workflow event: all approvals dismissed due to edit
];

// Mock required approvers for demo (in real app, this would come from the policy config)
const REQUIRED_APPROVERS = ['Alice Chen', 'Bob Martinez', 'Charlie Kim'];

const getStatusStyles = (status: WhitelistStatus) => {
  switch (status) {
    case 'active':
      return 'bg-positive-100 text-positive-700';
    case 'draft':
      return 'bg-brand-100 text-brand-700';
    case 'pending':
      return 'bg-warning-100 text-warning-700';
    case 'superseded':
      return 'bg-neutral-100 text-neutral-500';
    case 'expired':
      return 'bg-neutral-100 text-neutral-500';
    case 'revoked':
      return 'bg-negative-100 text-negative-600';
  }
};

const getStatusIcon = (status: WhitelistStatus) => {
  switch (status) {
    case 'active':
      return <ShieldCheckIcon className="size-3.5" />;
    case 'draft':
      return <EditIcon className="size-3.5" />;
    case 'pending':
      return <ClockIcon className="size-3.5" />;
    case 'superseded':
      return <HistoryIcon className="size-3.5" />;
    case 'expired':
      return <XCircleIcon className="size-3.5" />;
    case 'revoked':
      return <XIcon className="size-3.5" />;
  }
};

const getChangeTypeIcon = (type: WhitelistChangeType) => {
  switch (type) {
    case 'created':
    case 'entry_added':
      return <PlusIcon className="size-3.5" />;
    case 'name_updated':
    case 'description_updated':
    case 'entry_updated':
      return <EditIcon className="size-3.5" />;
    case 'entry_removed':
      return <TrashIcon className="size-3.5" />;
    case 'submitted_for_approval':
      return <SendIcon className="size-3.5" />;
    case 'approvals_reset':
      return <AlertTriangleIcon className="size-3.5" />;
    default:
      return <HistoryIcon className="size-3.5" />;
  }
};

const getChangeTypeStyles = (type: WhitelistChangeType) => {
  switch (type) {
    case 'created':
      return 'bg-brand-100 text-brand-700';
    case 'entry_added':
      return 'bg-terminal-100 text-terminal-700';
    case 'entry_removed':
      return 'bg-negative-100 text-negative-600';
    case 'name_updated':
    case 'description_updated':
    case 'entry_updated':
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

const formatChangeType = (type: WhitelistChangeType): string => {
  switch (type) {
    case 'created':
      return 'Created';
    case 'name_updated':
      return 'Name Updated';
    case 'description_updated':
      return 'Description Updated';
    case 'entry_added':
      return 'Entry Added';
    case 'entry_removed':
      return 'Entry Removed';
    case 'entry_updated':
      return 'Entry Updated';
    case 'status_changed':
      return 'Status Changed';
    case 'submitted_for_approval':
      return 'Submitted for Approval';
    case 'approved':
      return 'Approved';
    case 'approvals_reset':
      return 'Approvals Reset';
    case 'revoked':
      return 'Revoked';
    case 'expired':
      return 'Expired';
    default:
      return type;
  }
};

export const PageWhitelistVersionDetail = () => {
  const { whitelistId, versionNumber } = useParams({
    from: '/_app/policies/whitelists/$whitelistId/versions/$versionNumber/',
  });
  const whitelist = getWhitelistById(whitelistId);
  const version = whitelist?.versions.find(
    (v) => v.version === Number(versionNumber)
  );

  if (!whitelist || !version) {
    return (
      <PageLayout>
        <PageLayoutTopBar
          breadcrumbs={[
            { label: 'Whitelists', href: '/policies/whitelists' },
            {
              label: whitelistId,
              href: `/policies/whitelists/${whitelistId}`,
            },
            { label: 'Version Not Found' },
          ]}
        />
        <PageLayoutContent containerClassName="py-8">
          <div className="text-center">
            <p className="text-neutral-500">
              The requested version could not be found.
            </p>
            <Link
              to="/policies/whitelists/$whitelistId"
              params={{ whitelistId }}
              className="mt-4 inline-block text-sm text-brand-500 hover:underline"
            >
              Back to Whitelist
            </Link>
          </div>
        </PageLayoutContent>
      </PageLayout>
    );
  }

  const { date: createdDate, time: createdTime } = formatDateTime(
    version.createdAt
  );
  const isCurrentVersion = version.version === whitelist.currentVersion;

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

  // State for delete confirmation dialog
  const [entryToDelete, setEntryToDelete] = useState<WhitelistEntry | null>(
    null
  );

  return (
    <PageLayout>
      <PageLayoutTopBar
        breadcrumbs={[
          { label: 'Whitelists', href: '/policies/whitelists' },
          {
            label: whitelist.name,
            href: `/policies/whitelists/${whitelistId}`,
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
              >
                <RotateCcwIcon className="mr-1.5 size-3.5" />
                Reset Draft
              </Button>
              {/* Cancel - discards unsaved changes */}
              <Button
                variant="secondary"
                className="h-7 rounded-none border-neutral-300 px-3 text-xs font-medium"
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
                    of {whitelist.versions.length}
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

          {/* Whitelist Entries */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">
                  Entries
                </h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {whitelist.entries.length}{' '}
                  {whitelist.entries.length === 1 ? 'address' : 'addresses'} in
                  this whitelist
                </p>
              </div>
              {isDraft && (
                <Button className="h-7 rounded-none bg-brand-500 px-3 text-xs font-medium text-white hover:bg-brand-600">
                  <PlusIcon className="mr-1.5 size-3.5" />
                  Add Entry
                </Button>
              )}
            </div>
            <div className="divide-y divide-neutral-100">
              {whitelist.entries.length === 0 ? (
                <div className="px-4 py-8 text-center text-neutral-500">
                  <p className="text-sm">No entries in this whitelist yet.</p>
                  {isDraft && (
                    <p className="mt-1 text-xs">
                      Click "Add Entry" to add addresses to this whitelist.
                    </p>
                  )}
                </div>
              ) : (
                whitelist.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium',
                          entry.type === 'address'
                            ? 'bg-brand-100 text-brand-700'
                            : entry.type === 'contract'
                              ? 'bg-terminal-100 text-terminal-700'
                              : 'bg-indigo-100 text-indigo-700'
                        )}
                      >
                        {entry.type === 'address'
                          ? 'A'
                          : entry.type === 'contract'
                            ? 'C'
                            : 'E'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-neutral-900">
                            {entry.label}
                          </p>
                          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
                            {entry.chain}
                          </span>
                        </div>
                        <p className="mt-0.5 font-mono text-xs text-neutral-500">
                          {entry.address}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-400">
                        Added by {entry.addedBy}
                      </span>
                      {isDraft && (
                        <Button
                          variant="secondary"
                          size="icon"
                          className="size-7 rounded-none border-neutral-200 text-neutral-400 hover:border-negative-300 hover:bg-negative-50 hover:text-negative-600"
                          onClick={() => setEntryToDelete(entry)}
                        >
                          <TrashIcon className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
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
                        Set as main version on{' '}
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

      {/* Remove Entry Confirmation Dialog */}
      <Dialog
        open={entryToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setEntryToDelete(null);
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
                  Remove Entry
                </DialogTitle>
                <DialogDescription className="text-xs">
                  This action cannot be undone
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-neutral-700">
              Are you sure you want to remove{' '}
              <span className="font-semibold text-neutral-900">
                {entryToDelete?.label}
              </span>{' '}
              from this whitelist?
            </p>

            {entryToDelete && (
              <div className="border border-neutral-200 bg-neutral-50 p-3">
                <h4 className="mb-2 text-xs font-semibold text-neutral-700">
                  Entry Details
                </h4>
                <dl className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Address</dt>
                    <dd className="max-w-[200px] truncate font-mono text-neutral-900">
                      {entryToDelete.address}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Chain</dt>
                    <dd className="text-neutral-900">{entryToDelete.chain}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Added by</dt>
                    <dd className="text-neutral-900">
                      {entryToDelete.addedBy}
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
              onClick={() => setEntryToDelete(null)}
              className="h-8 rounded-none border-neutral-200 px-4 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                // TODO: Implement entry removal
                console.log('Removing entry:', entryToDelete?.id);
                setEntryToDelete(null);
              }}
              className={cn(
                'h-8 rounded-none px-4 text-xs text-white',
                'bg-negative-600 hover:bg-negative-700'
              )}
            >
              Remove Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};
