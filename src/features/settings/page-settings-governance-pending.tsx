import { Link } from '@tanstack/react-router';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  XCircleIcon,
  XIcon,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { SettingsLayout } from './components/settings-layout';
import {
  governanceCategoryLabels,
  type GovernanceRequest,
  governanceRequests,
  type GovernanceRequestStatus,
} from './data/settings';

type TabValue = 'pending' | 'approved' | 'rejected';

const StatusIcon = ({ status }: { status: GovernanceRequestStatus }) => {
  switch (status) {
    case 'approved':
      return <CheckCircleIcon className="size-4 text-positive-600" />;
    case 'rejected':
      return <XCircleIcon className="size-4 text-negative-600" />;
    case 'pending':
      return <ClockIcon className="size-4 text-warning-600" />;
  }
};

const getStatusStyles = (status: GovernanceRequestStatus) => {
  switch (status) {
    case 'approved':
      return 'bg-positive-50 text-positive-700';
    case 'rejected':
      return 'bg-negative-50 text-negative-700';
    case 'pending':
      return 'bg-warning-50 text-warning-700';
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
};

const RequestCard = ({
  request,
  onVote,
}: {
  request: GovernanceRequest;
  onVote?: (requestId: string, vote: 'approve' | 'reject') => void;
}) => {
  const isPending = request.status === 'pending';

  return (
    <div className="border border-neutral-200 bg-white">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-neutral-100 px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <StatusIcon status={request.status} />
            <h3 className="text-sm font-semibold text-neutral-900">
              {request.actionLabel}
            </h3>
            <span
              className={cn(
                'rounded px-2 py-0.5 text-xs font-medium capitalize',
                getStatusStyles(request.status)
              )}
            >
              {request.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            {governanceCategoryLabels[request.actionCategory]}
          </p>
        </div>
        <div className="text-right text-xs text-neutral-500">
          <p>Requested {formatRelativeTime(request.requestedAt)}</p>
          {request.resolvedAt && (
            <p>Resolved {formatRelativeTime(request.resolvedAt)}</p>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="px-6 py-4">
        <div className="text-xs text-neutral-500">
          <span className="font-medium text-neutral-700">Requested by:</span>{' '}
          {request.requestedByName}
        </div>

        {/* Request Details */}
        {Object.keys(request.details).length > 0 && (
          <div className="mt-3 rounded border border-neutral-100 bg-neutral-50 p-3">
            <p className="mb-2 text-xs font-medium text-neutral-600">
              Request Details
            </p>
            <div className="space-y-1">
              {Object.entries(request.details).map(([key, value]) => (
                <div key={key} className="flex text-xs">
                  <span className="w-24 shrink-0 text-neutral-500 capitalize">
                    {key.replace(/_/g, ' ')}:
                  </span>
                  <span className="font-mono text-neutral-700">
                    {String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Votes */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-neutral-600">
              Votes ({request.votes.length}/{request.threshold} required)
            </p>
            {isPending && (
              <div className="h-1.5 w-24 bg-neutral-100">
                <div
                  className="h-full bg-brand-500 transition-all"
                  style={{
                    width: `${Math.min(100, (request.votes.length / request.threshold) * 100)}%`,
                  }}
                />
              </div>
            )}
          </div>

          {request.votes.length > 0 && (
            <div className="mt-2 space-y-2">
              {request.votes.map((vote) => (
                <div
                  key={vote.memberId}
                  className="flex items-center justify-between rounded border border-neutral-100 bg-neutral-50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex size-6 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-medium text-neutral-600">
                      {vote.memberName.charAt(0)}
                    </div>
                    <span className="text-xs font-medium text-neutral-700">
                      {vote.memberName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {vote.vote === 'approve' ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-positive-600">
                        <CheckIcon className="size-3" />
                        Approved
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-negative-600">
                        <XIcon className="size-3" />
                        Rejected
                      </span>
                    )}
                    <span className="text-[10px] text-neutral-400">
                      {formatRelativeTime(vote.votedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isPending && request.votes.length === 0 && (
            <p className="mt-2 text-xs text-neutral-400">No votes yet</p>
          )}
        </div>
      </div>

      {/* Actions for pending */}
      {isPending && onVote && (
        <div className="flex items-center justify-end gap-2 border-t border-neutral-100 bg-neutral-50 px-6 py-3">
          <Button
            variant="secondary"
            onClick={() => onVote(request.id, 'reject')}
            className="h-8 rounded-none border-negative-200 px-4 text-xs font-medium text-negative-700 hover:bg-negative-50"
          >
            <XIcon className="mr-1.5 size-3.5" />
            Reject
          </Button>
          <Button
            onClick={() => onVote(request.id, 'approve')}
            className="h-8 rounded-none bg-positive-600 px-4 text-xs font-medium text-white hover:bg-positive-700"
          >
            <CheckIcon className="mr-1.5 size-3.5" />
            Approve
          </Button>
        </div>
      )}
    </div>
  );
};

export const PageSettingsGovernancePending = () => {
  const [activeTab, setActiveTab] = useState<TabValue>('pending');
  const [confirmVote, setConfirmVote] = useState<{
    requestId: string;
    vote: 'approve' | 'reject';
  } | null>(null);

  const pendingRequests = governanceRequests.filter(
    (r) => r.status === 'pending'
  );
  const approvedRequests = governanceRequests.filter(
    (r) => r.status === 'approved'
  );
  const rejectedRequests = governanceRequests.filter(
    (r) => r.status === 'rejected'
  );

  const tabs: { value: TabValue; label: string; count: number }[] = [
    { value: 'pending', label: 'Pending', count: pendingRequests.length },
    { value: 'approved', label: 'Approved', count: approvedRequests.length },
    { value: 'rejected', label: 'Rejected', count: rejectedRequests.length },
  ];

  const currentRequests =
    activeTab === 'pending'
      ? pendingRequests
      : activeTab === 'approved'
        ? approvedRequests
        : rejectedRequests;

  const handleVote = (requestId: string, vote: 'approve' | 'reject') => {
    setConfirmVote({ requestId, vote });
  };

  const handleConfirmVote = () => {
    if (!confirmVote) return;

    toast.success(
      confirmVote.vote === 'approve'
        ? 'Vote recorded: Approved'
        : 'Vote recorded: Rejected'
    );
    setConfirmVote(null);
  };

  const selectedRequest = confirmVote
    ? governanceRequests.find((r) => r.id === confirmVote.requestId)
    : null;

  return (
    <SettingsLayout
      title="Pending Approvals"
      description="Review and vote on governance requests"
      actions={
        <Link
          to="/settings/governance"
          className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to Governance
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex border-b border-neutral-200">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'relative px-4 py-3 text-sm font-medium transition-colors',
                activeTab === tab.value
                  ? 'text-neutral-900'
                  : 'text-neutral-500 hover:text-neutral-700'
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'ml-2 rounded-full px-2 py-0.5 text-xs',
                  activeTab === tab.value
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-600'
                )}
              >
                {tab.count}
              </span>
              {activeTab === tab.value && (
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-neutral-900" />
              )}
            </button>
          ))}
        </div>

        {/* Request List */}
        {currentRequests.length === 0 ? (
          <div className="border border-dashed border-neutral-200 py-12 text-center">
            <StatusIcon status={activeTab} />
            <p className="mt-2 text-sm font-medium text-neutral-600">
              No {activeTab} requests
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              {activeTab === 'pending'
                ? 'All governance requests have been resolved'
                : `No requests have been ${activeTab} yet`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onVote={activeTab === 'pending' ? handleVote : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Confirm Vote Dialog */}
      <Dialog open={!!confirmVote} onOpenChange={() => setConfirmVote(null)}>
        <DialogContent className="max-w-md rounded-none">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-neutral-900">
              Confirm{' '}
              {confirmVote?.vote === 'approve' ? 'Approval' : 'Rejection'}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              {confirmVote?.vote === 'approve'
                ? 'You are about to approve this governance request.'
                : 'You are about to reject this governance request.'}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="mt-4 rounded border border-neutral-100 bg-neutral-50 p-4">
              <p className="text-sm font-medium text-neutral-900">
                {selectedRequest.actionLabel}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Requested by {selectedRequest.requestedByName}
              </p>
              <div className="mt-2 text-xs text-neutral-600">
                Current votes: {selectedRequest.votes.length}/
                {selectedRequest.threshold}
              </div>
            </div>
          )}

          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button
                variant="secondary"
                className="h-8 rounded-none border-neutral-300 px-4 text-xs font-medium"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={handleConfirmVote}
              className={cn(
                'h-8 rounded-none px-4 text-xs font-medium text-white',
                confirmVote?.vote === 'approve'
                  ? 'bg-positive-600 hover:bg-positive-700'
                  : 'bg-negative-600 hover:bg-negative-700'
              )}
            >
              {confirmVote?.vote === 'approve'
                ? 'Confirm Approval'
                : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsLayout>
  );
};
