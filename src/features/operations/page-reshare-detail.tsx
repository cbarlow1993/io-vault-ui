import { Link, useParams } from '@tanstack/react-router';
import {
  CheckCircleIcon,
  ClockIcon,
  MinusIcon,
  PlusIcon,
  RefreshCwIcon,
  ServerIcon,
  SmartphoneIcon,
  XCircleIcon,
} from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';

import type { DeviceType } from '@/features/vaults/data/vaults';
import { getVaultById } from '@/features/vaults/data/vaults';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
} from '@/layout/shell';

// =============================================================================
// Types
// =============================================================================

type ReshareStatus = 'completed' | 'pending' | 'failed';

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
  'reshare-1': {
    id: 'reshare-1',
    status: 'completed',
    initiatedAt: '2024-03-01 09:00',
    completedAt: '2024-03-01 09:15',
    initiatedBy: 'Alice Johnson',
    reason: 'Add new signer for enhanced security',
    threshold: 3,
    beforeState: {
      threshold: 4,
      signers: [
        {
          id: 's1',
          name: 'Main Server',
          owner: 'Operations',
          deviceType: 'virtual',
          votingPower: 2,
        },
        {
          id: 's2',
          name: "Alice's iPhone",
          owner: 'Alice Johnson',
          deviceType: 'ios',
          votingPower: 1,
        },
        {
          id: 's3',
          name: "Bob's Android",
          owner: 'Bob Smith',
          deviceType: 'android',
          votingPower: 1,
        },
      ],
    },
    afterState: {
      threshold: 5,
      signers: [
        {
          id: 's1',
          name: 'Main Server',
          owner: 'Operations',
          deviceType: 'virtual',
          votingPower: 2,
        },
        {
          id: 's2',
          name: "Alice's iPhone",
          owner: 'Alice Johnson',
          deviceType: 'ios',
          votingPower: 1,
        },
        {
          id: 's3',
          name: "Bob's Android",
          owner: 'Bob Smith',
          deviceType: 'android',
          votingPower: 1,
        },
        {
          id: 's4',
          name: "Carol's iPhone",
          owner: 'Carol Davis',
          deviceType: 'ios',
          votingPower: 1,
        },
      ],
    },
    addedSigners: ['s4'],
    removedSigners: [],
    approvals: [
      {
        signerId: 's1',
        signerName: 'Main Server',
        approved: true,
        approvedAt: '2024-03-01 09:05',
      },
      {
        signerId: 's2',
        signerName: "Alice's iPhone",
        approved: true,
        approvedAt: '2024-03-01 09:10',
      },
      {
        signerId: 's3',
        signerName: "Bob's Android",
        approved: true,
        approvedAt: '2024-03-01 09:15',
      },
    ],
  },
  'reshare-2': {
    id: 'reshare-2',
    status: 'pending',
    initiatedAt: '2024-02-15 14:30',
    completedAt: null,
    initiatedBy: 'Bob Smith',
    reason: 'Update threshold for compliance requirements',
    threshold: 3,
    beforeState: {
      threshold: 3,
      signers: [
        {
          id: 's1',
          name: 'Main Server',
          owner: 'Operations',
          deviceType: 'virtual',
          votingPower: 2,
        },
        {
          id: 's2',
          name: "Alice's iPhone",
          owner: 'Alice Johnson',
          deviceType: 'ios',
          votingPower: 1,
        },
        {
          id: 's3',
          name: "Bob's Android",
          owner: 'Bob Smith',
          deviceType: 'android',
          votingPower: 1,
        },
      ],
    },
    afterState: {
      threshold: 4,
      signers: [
        {
          id: 's1',
          name: 'Main Server',
          owner: 'Operations',
          deviceType: 'virtual',
          votingPower: 2,
        },
        {
          id: 's2',
          name: "Alice's iPhone",
          owner: 'Alice Johnson',
          deviceType: 'ios',
          votingPower: 1,
        },
        {
          id: 's3',
          name: "Bob's Android",
          owner: 'Bob Smith',
          deviceType: 'android',
          votingPower: 1,
        },
      ],
    },
    addedSigners: [],
    removedSigners: [],
    approvals: [
      {
        signerId: 's1',
        signerName: 'Main Server',
        approved: true,
        approvedAt: '2024-02-15 14:35',
      },
      { signerId: 's2', signerName: "Alice's iPhone", approved: false },
      {
        signerId: 's3',
        signerName: "Bob's Android",
        approved: true,
        approvedAt: '2024-02-15 14:40',
      },
    ],
  },
  'reshare-3': {
    id: 'reshare-3',
    status: 'failed',
    initiatedAt: '2024-01-20 11:00',
    completedAt: '2024-01-20 11:30',
    initiatedBy: 'Carol Davis',
    reason: 'Remove inactive signer',
    threshold: 2,
    beforeState: {
      threshold: 3,
      signers: [
        {
          id: 's1',
          name: 'Main Server',
          owner: 'Operations',
          deviceType: 'virtual',
          votingPower: 2,
        },
        {
          id: 's2',
          name: "Alice's iPhone",
          owner: 'Alice Johnson',
          deviceType: 'ios',
          votingPower: 1,
        },
        {
          id: 's5',
          name: "Dave's Server",
          owner: 'Dave Wilson',
          deviceType: 'virtual',
          votingPower: 1,
        },
      ],
    },
    afterState: {
      threshold: 3,
      signers: [
        {
          id: 's1',
          name: 'Main Server',
          owner: 'Operations',
          deviceType: 'virtual',
          votingPower: 2,
        },
        {
          id: 's2',
          name: "Alice's iPhone",
          owner: 'Alice Johnson',
          deviceType: 'ios',
          votingPower: 1,
        },
      ],
    },
    addedSigners: [],
    removedSigners: ['s5'],
    approvals: [
      {
        signerId: 's1',
        signerName: 'Main Server',
        approved: true,
        approvedAt: '2024-01-20 11:05',
      },
      { signerId: 's2', signerName: "Alice's iPhone", approved: false },
      { signerId: 's5', signerName: "Dave's Server", approved: false },
    ],
  },
  'reshare-4': {
    id: 'reshare-4',
    status: 'completed',
    initiatedAt: '2023-12-10 16:00',
    completedAt: '2023-12-10 16:20',
    initiatedBy: 'Operations',
    reason: 'Initial vault configuration',
    threshold: 3,
    beforeState: {
      threshold: 0,
      signers: [],
    },
    afterState: {
      threshold: 3,
      signers: [
        {
          id: 's1',
          name: 'Main Server',
          owner: 'Operations',
          deviceType: 'virtual',
          votingPower: 2,
        },
        {
          id: 's2',
          name: "Alice's iPhone",
          owner: 'Alice Johnson',
          deviceType: 'ios',
          votingPower: 1,
        },
      ],
    },
    addedSigners: ['s1', 's2'],
    removedSigners: [],
    approvals: [
      {
        signerId: 's1',
        signerName: 'Main Server',
        approved: true,
        approvedAt: '2023-12-10 16:10',
      },
      {
        signerId: 's2',
        signerName: "Alice's iPhone",
        approved: true,
        approvedAt: '2023-12-10 16:20',
      },
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
    case 'pending':
      return <ClockIcon className="size-5 text-warning-600" />;
    case 'failed':
      return <XCircleIcon className="size-5 text-negative-600" />;
  }
};

const getStatusLabel = (status: ReshareStatus) => {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'pending':
      return 'Pending Approval';
    case 'failed':
      return 'Failed';
  }
};

const getStatusColor = (status: ReshareStatus) => {
  switch (status) {
    case 'completed':
      return 'bg-positive-100 text-positive-700';
    case 'pending':
      return 'bg-warning-100 text-warning-700';
    case 'failed':
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
            isComplete ? 'bg-positive-500' : 'bg-brand-500'
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
            approved ? 'bg-positive-100' : 'bg-neutral-100'
          )}
        >
          {approved ? (
            <CheckCircleIcon className="size-4 text-positive-600" />
          ) : (
            <ClockIcon className="size-4 text-neutral-400" />
          )}
        </div>
        <span className="text-sm text-neutral-900">{signerName}</span>
      </div>
      <div className="text-right">
        {approved ? (
          <div>
            <span className="text-xs font-medium text-positive-600">
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
        status === 'added' && 'border-positive-200 bg-positive-50/50',
        status === 'removed' && 'border-negative-200 bg-negative-50/50',
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
          <span className="flex items-center gap-0.5 bg-positive-100 px-1.5 py-0.5 text-[10px] font-medium text-positive-600">
            <PlusIcon className="size-3" /> Added
          </span>
        )}
        {status === 'removed' && (
          <span className="flex items-center gap-0.5 bg-negative-100 px-1.5 py-0.5 text-[10px] font-medium text-negative-600">
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
    from: '/_app/vaults/$vaultId/reshares/$reshareId',
  });
  const reshare = getReshareById(reshareId);
  const vault = getVaultById(vaultId);

  if (!reshare) {
    return (
      <PageLayout>
        <PageLayoutTopBar
          breadcrumbs={[
            { label: 'Vaults', href: '/vaults' },
            { label: vault?.name ?? 'Vault', href: `/vaults/${vaultId}` },
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
  const isReady = approvedCount >= reshare.threshold;
  const thresholdChanged =
    reshare.beforeState.threshold !== reshare.afterState.threshold;

  return (
    <PageLayout>
      <PageLayoutTopBar
        breadcrumbs={[
          { label: 'Vaults', href: '/vaults' },
          { label: vault?.name ?? 'Vault', href: `/vaults/${vaultId}` },
          { label: 'Reshare Operation' },
        ]}
        actions={
          reshare.status === 'pending' ? (
            <>
              <Button
                variant="secondary"
                className="h-7 rounded-none border-neutral-300 px-3 text-xs font-medium"
              >
                Cancel Request
              </Button>
              {isReady && (
                <Button className="h-7 rounded-none bg-brand-500 px-3 text-xs font-medium text-white hover:bg-brand-600">
                  Execute Reshare
                </Button>
              )}
            </>
          ) : undefined
        }
      />
      <PageLayoutContent containerClassName="py-4">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Status Card */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                {getStatusIcon(reshare.status)}
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    {getStatusLabel(reshare.status)}
                  </h2>
                  <p className="text-sm text-neutral-500">
                    Initiated by {reshare.initiatedBy} on {reshare.initiatedAt}
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  'px-3 py-1 text-xs font-medium capitalize',
                  getStatusColor(reshare.status)
                )}
              >
                {reshare.status}
              </span>
            </div>
            {reshare.status === 'pending' && (
              <div className="border-t border-neutral-100 px-4 py-3">
                <ProgressBar
                  current={approvedCount}
                  total={reshare.threshold}
                />
              </div>
            )}
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
                    <span className="bg-positive-100 px-2 py-1 text-xs text-positive-700">
                      +{reshare.addedSigners.length} signer
                      {reshare.addedSigners.length > 1 ? 's' : ''}
                    </span>
                  )}
                  {reshare.removedSigners.length > 0 && (
                    <span className="bg-negative-100 px-2 py-1 text-xs text-negative-700">
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

          {/* Approvals Card */}
          <div className="border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-900">
                  Approvals
                </h3>
                <span className="text-xs text-neutral-500">
                  {approvedCount} of {reshare.approvals.length} signers approved
                </span>
              </div>
            </div>
            <div className="px-4">
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

          {/* Timeline */}
          <div className="border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-neutral-900">
                Timeline
              </h3>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-6 shrink-0 items-center justify-center bg-neutral-100">
                    <RefreshCwIcon className="size-3 text-neutral-500" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-900">
                      Reshare initiated
                    </p>
                    <p className="text-xs text-neutral-500">
                      {reshare.initiatedAt} by {reshare.initiatedBy}
                    </p>
                  </div>
                </div>
                {reshare.approvals
                  .filter((a) => a.approved)
                  .map((approval) => (
                    <div
                      key={approval.signerId}
                      className="flex items-start gap-3"
                    >
                      <div className="flex size-6 shrink-0 items-center justify-center bg-positive-100">
                        <CheckCircleIcon className="size-3 text-positive-600" />
                      </div>
                      <div>
                        <p className="text-sm text-neutral-900">
                          Approved by {approval.signerName}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {approval.approvedAt}
                        </p>
                      </div>
                    </div>
                  ))}
                {reshare.completedAt && (
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'flex size-6 shrink-0 items-center justify-center',
                        reshare.status === 'completed'
                          ? 'bg-positive-100'
                          : 'bg-negative-100'
                      )}
                    >
                      {reshare.status === 'completed' ? (
                        <CheckCircleIcon className="size-3 text-positive-600" />
                      ) : (
                        <XCircleIcon className="size-3 text-negative-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-neutral-900">
                        Reshare {reshare.status}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {reshare.completedAt}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
