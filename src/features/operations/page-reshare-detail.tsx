import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import {
  CheckCircleIcon,
  ClockIcon,
  MinusIcon,
  PlusIcon,
  ServerIcon,
  SmartphoneIcon,
  XCircleIcon,
} from 'lucide-react';

import { orpc } from '@/lib/orpc/client';
import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';

import type { DeviceType } from '@/features/vaults/data/vaults';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
} from '@/layout/shell';

// =============================================================================
// Types
// =============================================================================

// Use API status values directly
type ReshareStatus =
  | 'voting'
  | 'signing'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'rejected';

type ReshareSignerState = {
  id: string;
  name: string;
  owner: string;
  deviceType: DeviceType;
  votingPower: number;
};

type ReshareApproval = {
  signerId: string;
  signerName: string;
  approved: boolean;
  approvedAt?: string;
};

type ReshareDetail = {
  id: string;
  status: ReshareStatus;
  initiatedAt: string;
  completedAt: string | null;
  initiatedBy: string;
  reason: string;
  threshold: number;
  beforeState: {
    threshold: number;
    signers: ReshareSignerState[];
  };
  afterState: {
    threshold: number;
    signers: ReshareSignerState[];
  };
  addedSigners: string[];
  removedSigners: string[];
  approvals: ReshareApproval[];
};

// =============================================================================
// Mock Data
// =============================================================================

const mockReshareDetails: Record<string, ReshareDetail> = {
  // Real reshare ID for testing
  '019bc346-6d4f-7129-ab41-8f82cea7a562': {
    id: '019bc346-6d4f-7129-ab41-8f82cea7a562',
    status: 'voting',
    initiatedAt: '2025-01-14 10:00:00',
    completedAt: null,
    initiatedBy: 'M. Smith',
    reason:
      'Adding new team member and adjusting threshold for faster operations',
    threshold: 3,
    beforeState: {
      threshold: 3,
      signers: [
        {
          id: 'signer-004',
          name: 'Treasury Server',
          owner: 'M. Smith',
          deviceType: 'virtual',
          votingPower: 2,
        },
        {
          id: 'signer-005',
          name: "Mike's iPad",
          owner: 'M. Smith',
          deviceType: 'ios',
          votingPower: 1,
        },
        {
          id: 'signer-006',
          name: "John's Pixel",
          owner: 'J. Doe',
          deviceType: 'android',
          votingPower: 1,
        },
        {
          id: 'signer-007',
          name: 'Backup HSM',
          owner: 'A. Kumar',
          deviceType: 'virtual',
          votingPower: 1,
        },
      ],
    },
    afterState: {
      threshold: 2,
      signers: [
        {
          id: 'signer-004',
          name: 'Treasury Server',
          owner: 'M. Smith',
          deviceType: 'virtual',
          votingPower: 2,
        },
        {
          id: 'signer-005',
          name: "Mike's iPad",
          owner: 'M. Smith',
          deviceType: 'ios',
          votingPower: 1,
        },
        {
          id: 'signer-new-001',
          name: "Sarah's iPhone",
          owner: 'S. Chen',
          deviceType: 'ios',
          votingPower: 1,
        },
      ],
    },
    addedSigners: ['signer-new-001'],
    removedSigners: ['signer-006', 'signer-007'],
    approvals: [
      {
        signerId: 'signer-004',
        signerName: 'Treasury Server',
        approved: true,
        approvedAt: '2025-01-14 10:15:00',
      },
      { signerId: 'signer-005', signerName: "Mike's iPad", approved: false },
      { signerId: 'signer-006', signerName: "John's Pixel", approved: false },
      { signerId: 'signer-007', signerName: 'Backup HSM', approved: false },
    ],
  },
};

const getReshareById = (id: string): ReshareDetail | undefined => {
  return mockReshareDetails[id];
};

// =============================================================================
// Helper Components
// =============================================================================

const getDeviceIcon = (deviceType: DeviceType) => {
  switch (deviceType) {
    case 'virtual':
      return <ServerIcon className="size-4 text-neutral-500" />;
    case 'ios':
    case 'android':
      return <SmartphoneIcon className="size-4 text-neutral-500" />;
  }
};

const getDeviceLabel = (deviceType: DeviceType) => {
  switch (deviceType) {
    case 'virtual':
      return 'Virtual';
    case 'ios':
      return 'iOS';
    case 'android':
      return 'Android';
  }
};

const getStatusIcon = (status: ReshareStatus) => {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon className="size-5 text-positive-600" />;
    case 'voting':
    case 'signing':
      return <ClockIcon className="size-5 text-warning-600" />;
    case 'failed':
    case 'rejected':
    case 'expired':
      return <XCircleIcon className="size-5 text-negative-600" />;
  }
};

const getStatusLabel = (status: ReshareStatus) => {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'voting':
      return 'Pending Approval';
    case 'signing':
      return 'Signing in Progress';
    case 'failed':
      return 'Failed';
    case 'rejected':
      return 'Rejected';
    case 'expired':
      return 'Expired';
  }
};

const getStatusColor = (status: ReshareStatus) => {
  switch (status) {
    case 'completed':
      return 'bg-positive-100 text-positive-700';
    case 'voting':
    case 'signing':
      return 'bg-warning-100 text-warning-700';
    case 'failed':
    case 'rejected':
    case 'expired':
      return 'bg-negative-100 text-negative-700';
  }
};

// Progress bar component
const ProgressBar = ({
  current,
  total,
}: {
  current: number;
  total: number;
}) => {
  const percentage = Math.round((current / total) * 100);
  const isComplete = current >= total;

  return (
    <div className="mt-3">
      <div className="mb-1.5 flex items-center justify-between text-xs text-neutral-500">
        <span>
          {current} of {total} approvals required
        </span>
        <span className="font-medium">{percentage}%</span>
      </div>
      <div className="h-2 w-full bg-neutral-200">
        <div
          className={cn(
            'h-full transition-all duration-500',
            isComplete ? 'bg-emerald-500' : 'bg-brand-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Approval item component
const ApprovalItem = ({
  signerName,
  approved,
  approvedAt,
}: {
  signerName: string;
  approved: boolean;
  approvedAt?: string;
}) => {
  return (
    <div className="flex items-center justify-between border-b border-neutral-100 py-2.5 last:border-0">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex size-8 items-center justify-center',
            approved ? 'bg-emerald-100' : 'bg-neutral-100'
          )}
        >
          {approved ? (
            <CheckCircleIcon className="text-emerald-600 size-4" />
          ) : (
            <ClockIcon className="size-4 text-neutral-400" />
          )}
        </div>
        <span className="text-sm text-neutral-900">{signerName}</span>
      </div>
      <div className="text-right">
        {approved ? (
          <div>
            <span className="text-emerald-600 text-xs font-medium">
              Approved
            </span>
            {approvedAt && (
              <p className="mt-0.5 text-[10px] text-neutral-400">
                {approvedAt}
              </p>
            )}
          </div>
        ) : (
          <span className="text-xs text-neutral-400">Pending</span>
        )}
      </div>
    </div>
  );
};

// Signer card component for reshare comparison
const SignerCard = ({
  signer,
  status,
}: {
  signer: ReshareSignerState;
  status?: 'added' | 'removed' | 'unchanged';
}) => {
  return (
    <div
      className={cn(
        'flex items-center gap-3 border p-3',
        status === 'added' && 'border-emerald-200 bg-emerald-50/50',
        status === 'removed' && 'border-red-200 bg-red-50/50',
        status === 'unchanged' && 'border-neutral-200 bg-white'
      )}
    >
      <div className="flex size-8 items-center justify-center bg-neutral-100">
        {getDeviceIcon(signer.deviceType)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-900">
          {signer.name}
        </p>
        <p className="text-xs text-neutral-500">
          {signer.owner} · {getDeviceLabel(signer.deviceType)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-400">
          Power: {signer.votingPower}
        </span>
        {status === 'added' && (
          <span className="text-emerald-600 bg-emerald-100 flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium">
            <PlusIcon className="size-3" /> Added
          </span>
        )}
        {status === 'removed' && (
          <span className="text-red-600 bg-red-100 flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium">
            <MinusIcon className="size-3" /> Removed
          </span>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// Main Page Component
// =============================================================================

export const PageReshareDetail = () => {
  const { vaultId, reshareId } = useParams({
    from: '/_app/treasury/vaults/$vaultId/reshares/$reshareId',
  });

  // Fetch vault data from API
  const { data: vault } = useQuery(
    orpc.vaults.get.queryOptions({ input: { id: vaultId } })
  );

  // Fetch reshare data from API
  const { data: apiReshare, isLoading: isLoadingReshare } = useQuery(
    orpc.vaults.getReshare.queryOptions({
      input: { vaultId, reshareId },
    })
  );

  // Fetch votes data from API
  const { data: votes, isLoading: isLoadingVotes } = useQuery(
    orpc.vaults.getReshareVotes.queryOptions({
      input: { vaultId, reshareId },
    })
  );

  // Get stubbed data for fields not available from API
  const stubbedReshare = getReshareById(reshareId);

  // Merge API data with stubbed data for unavailable fields
  const reshare: ReshareDetail | undefined = apiReshare
    ? {
        id: apiReshare.id,
        status: apiReshare.status,
        threshold: apiReshare.threshold,
        initiatedAt: apiReshare.createdAt,
        initiatedBy: apiReshare.createdBy,
        reason:
          apiReshare.memo ?? stubbedReshare?.reason ?? 'No reason provided',
        // Keep stubbed data for fields not in API
        completedAt: stubbedReshare?.completedAt ?? null,
        beforeState: stubbedReshare?.beforeState ?? {
          threshold: 0,
          signers: [],
        },
        afterState: stubbedReshare?.afterState ?? {
          threshold: apiReshare.threshold,
          signers: [],
        },
        addedSigners: stubbedReshare?.addedSigners ?? [],
        removedSigners: stubbedReshare?.removedSigners ?? [],
        // Merge API votes with stubbed approvals to show all signers
        approvals: (() => {
          const baseApprovals = stubbedReshare?.approvals ?? [];
          if (!votes || votes.length === 0) return baseApprovals;

          // Create a map of API votes by signerId
          const voteMap = new Map(
            votes.map((vote) => [
              vote.signerId,
              {
                signerId: vote.signerId,
                signerName: vote.signerExternalId ?? vote.signerId,
                approved: vote.result === 'approve',
                approvedAt:
                  vote.result === 'approve' ? vote.votedAt : undefined,
              },
            ])
          );

          // Update stubbed approvals with API vote data, keep pending ones
          return baseApprovals.map((approval) => {
            const apiVote = voteMap.get(approval.signerId);
            return apiVote ?? approval;
          });
        })(),
      }
    : stubbedReshare;

  const isLoading = isLoadingReshare || isLoadingVotes;

  if (isLoading) {
    return (
      <PageLayout>
        <PageLayoutTopBar
          breadcrumbs={[
            { label: 'Vaults', href: '/treasury/vaults' },
            {
              label: vault?.name ?? 'Vault',
              href: `/treasury/vaults/${vaultId}`,
            },
            { label: 'Loading...' },
          ]}
        />
        <PageLayoutContent containerClassName="py-8">
          <div className="text-center text-neutral-500">
            <p className="text-sm">Loading reshare details...</p>
          </div>
        </PageLayoutContent>
      </PageLayout>
    );
  }

  if (!reshare) {
    return (
      <PageLayout>
        <PageLayoutTopBar
          breadcrumbs={[
            { label: 'Vaults', href: '/treasury/vaults' },
            {
              label: vault?.name ?? 'Vault',
              href: `/treasury/vaults/${vaultId}`,
            },
            { label: 'Reshare Not Found' },
          ]}
        />
        <PageLayoutContent containerClassName="py-8">
          <div className="text-center text-neutral-500">
            <p className="text-sm">
              The requested reshare operation could not be found.
            </p>
          </div>
        </PageLayoutContent>
      </PageLayout>
    );
  }

  const approvedCount = reshare.approvals.filter((a) => a.approved).length;
  const thresholdChanged =
    reshare.beforeState.threshold !== reshare.afterState.threshold;

  return (
    <PageLayout>
      <PageLayoutTopBar
        breadcrumbs={[
          { label: 'Vaults', href: '/treasury/vaults' },
          {
            label: vault?.name ?? 'Vault',
            href: `/treasury/vaults/${vaultId}`,
          },
          { label: 'Reshare Request' },
        ]}
        actions={
          reshare.status === 'voting' || reshare.status === 'signing' ? (
            <Button
              variant="secondary"
              className="h-7 rounded-none border-neutral-300 px-3 text-xs font-medium"
            >
              Cancel Request
            </Button>
          ) : undefined
        }
      />

      <PageLayoutContent containerClassName="py-4">
        <div className="mx-auto max-w-4xl space-y-4">
          {/* Request info */}
          <div className="border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-4 py-2.5">
              <h3 className="text-xs font-semibold text-neutral-900">
                Request Information
              </h3>
            </div>
            <div className="grid grid-cols-4 gap-4 px-4 py-3">
              <div>
                <p className="mb-0.5 text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                  Status
                </p>
                <span
                  className={cn(
                    'inline-block px-2 py-0.5 text-xs font-medium',
                    getStatusColor(reshare.status)
                  )}
                >
                  {getStatusLabel(reshare.status)}
                </span>
              </div>
              <div>
                <p className="mb-0.5 text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                  Requested By
                </p>
                <p className="text-sm text-neutral-900">
                  {reshare.initiatedBy}
                </p>
              </div>
              <div>
                <p className="mb-0.5 text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                  Requested At
                </p>
                <p className="text-sm text-neutral-900">
                  {reshare.initiatedAt}
                </p>
              </div>
              {apiReshare?.expiresAt && (
                <div>
                  <p className="mb-0.5 text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                    Expires At
                  </p>
                  <p className="text-sm text-neutral-900">
                    {apiReshare.expiresAt}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Approvals Section */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2.5">
              <h3 className="text-xs font-semibold text-neutral-900">
                Approvals
              </h3>
              <span className="text-[10px] text-neutral-500">
                {approvedCount} of {reshare.threshold} required (
                {reshare.approvals.length} total signers)
              </span>
            </div>
            <div className="px-4 py-3">
              <ProgressBar current={approvedCount} total={reshare.threshold} />
              <div className="mt-3">
                {reshare.approvals.map((approval) => (
                  <ApprovalItem
                    key={approval.signerId}
                    signerName={approval.signerName}
                    approved={approval.approved}
                    approvedAt={approval.approvedAt}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Reshare Details */}
          <div className="border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-neutral-900">
                Reshare Details
              </h3>
            </div>
            <div className="space-y-6 p-4">
              {/* Reason */}
              <div>
                <p className="mb-1 text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                  Reason for Change
                </p>
                <p className="text-sm text-neutral-700">{reshare.reason}</p>
              </div>

              {/* Summary of changes */}
              <div className="border-t border-neutral-100 pt-4">
                <p className="mb-3 text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                  Summary of Changes
                </p>
                <div className="flex flex-wrap gap-2">
                  {thresholdChanged && (
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 text-xs">
                      Threshold: {reshare.beforeState.threshold} →{' '}
                      {reshare.afterState.threshold}
                    </span>
                  )}
                  {reshare.addedSigners.length > 0 && (
                    <span className="bg-emerald-100 text-emerald-700 px-2 py-1 text-xs">
                      +{reshare.addedSigners.length} signer
                      {reshare.addedSigners.length > 1 ? 's' : ''}
                    </span>
                  )}
                  {reshare.removedSigners.length > 0 && (
                    <span className="bg-red-100 text-red-700 px-2 py-1 text-xs">
                      -{reshare.removedSigners.length} signer
                      {reshare.removedSigners.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Before/After comparison */}
              <div className="border-t border-neutral-100 pt-4">
                <div className="grid grid-cols-2 gap-6">
                  {/* Before */}
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                        Before
                      </span>
                      <span className="text-xs text-neutral-500">
                        Threshold: {reshare.beforeState.threshold} of{' '}
                        {reshare.beforeState.signers.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {reshare.beforeState.signers.length === 0 ? (
                        <div className="py-4 text-center text-xs text-neutral-400">
                          No signers (initial setup)
                        </div>
                      ) : (
                        reshare.beforeState.signers.map((signer) => (
                          <SignerCard
                            key={signer.id}
                            signer={signer}
                            status={
                              reshare.removedSigners.includes(signer.id)
                                ? 'removed'
                                : 'unchanged'
                            }
                          />
                        ))
                      )}
                    </div>
                  </div>

                  {/* After */}
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                        After
                      </span>
                      <span className="text-xs text-neutral-500">
                        Threshold: {reshare.afterState.threshold} of{' '}
                        {reshare.afterState.signers.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {reshare.afterState.signers.map((signer) => (
                        <SignerCard
                          key={signer.id}
                          signer={signer}
                          status={
                            reshare.addedSigners.includes(signer.id)
                              ? 'added'
                              : 'unchanged'
                          }
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
