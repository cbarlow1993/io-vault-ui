import { Link, useParams } from '@tanstack/react-router';
import {
  CheckCircleIcon,
  ClockIcon,
  CopyIcon,
  MinusIcon,
  PlusIcon,
  ServerIcon,
  SmartphoneIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';

import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
} from '@/layout/treasury-6';

import {
  getPendingOperationById,
  type DeviceType,
  type PendingOperation,
  type ReshareSignerState,
  type SignatureContext,
} from './data/vaults';

const getDeviceIcon = (deviceType: DeviceType) => {
  switch (deviceType) {
    case 'server':
      return <ServerIcon className="size-4 text-neutral-500" />;
    case 'ios':
    case 'android':
      return <SmartphoneIcon className="size-4 text-neutral-500" />;
  }
};

const getDeviceLabel = (deviceType: DeviceType) => {
  switch (deviceType) {
    case 'server':
      return 'Server';
    case 'ios':
      return 'iOS';
    case 'android':
      return 'Android';
  }
};

const getTransactionTypeLabel = (type: SignatureContext['transactionType']) => {
  switch (type) {
    case 'transfer':
      return 'Transfer';
    case 'swap':
      return 'Swap';
    case 'contract':
      return 'Contract Interaction';
    case 'stake':
      return 'Staking';
    case 'withdraw':
      return 'Withdrawal';
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

// Signature context section
const SignatureContextSection = ({
  context,
}: {
  context: SignatureContext;
}) => {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-neutral-900">
          Transaction Details
        </h3>
      </div>
      <div className="space-y-4 p-4">
        {/* Summary row */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="mb-1 text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
              Type
            </p>
            <p className="text-sm text-neutral-900">
              {getTransactionTypeLabel(context.transactionType)}
            </p>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
              Chain
            </p>
            <p className="text-sm text-neutral-900">{context.chain}</p>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
              Asset
            </p>
            <p className="text-sm text-neutral-900">{context.asset}</p>
          </div>
        </div>

        {/* Amount */}
        <div className="border-t border-neutral-100 pt-4">
          <p className="mb-1 text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
            Amount
          </p>
          <p className="text-xl font-semibold text-neutral-900">
            {context.amount} {context.asset}
          </p>
          <p className="text-sm text-neutral-500">{context.amountUsd}</p>
        </div>

        {/* Addresses */}
        <div className="space-y-3 border-t border-neutral-100 pt-4">
          <div>
            <p className="mb-1 text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
              From
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate bg-neutral-50 px-2 py-1 font-mono text-xs text-neutral-700">
                {context.fromAddress}
              </code>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(context.fromAddress, 'From address')
                }
                className="p-1.5 hover:bg-neutral-100"
              >
                <CopyIcon className="size-3.5 text-neutral-400" />
              </button>
            </div>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
              To
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate bg-neutral-50 px-2 py-1 font-mono text-xs text-neutral-700">
                {context.toAddress}
              </code>
              <button
                type="button"
                onClick={() => copyToClipboard(context.toAddress, 'To address')}
                className="p-1.5 hover:bg-neutral-100"
              >
                <CopyIcon className="size-3.5 text-neutral-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Additional details */}
        <div className="grid grid-cols-2 gap-4 border-t border-neutral-100 pt-4">
          {context.gasEstimate && (
            <div>
              <p className="mb-1 text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Gas Estimate
              </p>
              <p className="text-sm text-neutral-900">{context.gasEstimate}</p>
            </div>
          )}
          {context.nonce !== undefined && (
            <div>
              <p className="mb-1 text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Nonce
              </p>
              <p className="text-sm text-neutral-900">{context.nonce}</p>
            </div>
          )}
        </div>

        {/* Memo */}
        {context.memo && (
          <div className="border-t border-neutral-100 pt-4">
            <p className="mb-1 text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
              Memo
            </p>
            <p className="text-sm text-neutral-700">{context.memo}</p>
          </div>
        )}

        {/* Raw data */}
        {context.data && (
          <div className="border-t border-neutral-100 pt-4">
            <p className="mb-1 text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
              Raw Data
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate bg-neutral-50 px-2 py-1 font-mono text-xs text-neutral-600">
                {context.data}
              </code>
              <button
                type="button"
                onClick={() => copyToClipboard(context.data!, 'Raw data')}
                className="p-1.5 hover:bg-neutral-100"
              >
                <CopyIcon className="size-3.5 text-neutral-400" />
              </button>
            </div>
          </div>
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

// Reshare context section
const ReshareContextSection = ({
  operation,
}: {
  operation: PendingOperation;
}) => {
  const context = operation.reshareContext;
  if (!context) return null;

  return (
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
          <p className="text-sm text-neutral-700">{context.reason}</p>
        </div>

        {/* Summary of changes */}
        <div className="border-t border-neutral-100 pt-4">
          <p className="mb-3 text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
            Summary of Changes
          </p>
          <div className="flex flex-wrap gap-2">
            {context.thresholdChanged && (
              <span className="bg-blue-100 text-blue-700 px-2 py-1 text-xs">
                Threshold: {context.beforeState.threshold} →{' '}
                {context.afterState.threshold}
              </span>
            )}
            {context.addedSigners.length > 0 && (
              <span className="bg-emerald-100 text-emerald-700 px-2 py-1 text-xs">
                +{context.addedSigners.length} signer
                {context.addedSigners.length > 1 ? 's' : ''}
              </span>
            )}
            {context.removedSigners.length > 0 && (
              <span className="bg-red-100 text-red-700 px-2 py-1 text-xs">
                -{context.removedSigners.length} signer
                {context.removedSigners.length > 1 ? 's' : ''}
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
                  Threshold: {context.beforeState.threshold} of{' '}
                  {context.beforeState.signers.length}
                </span>
              </div>
              <div className="space-y-2">
                {context.beforeState.signers.map((signer) => (
                  <SignerCard
                    key={signer.id}
                    signer={signer}
                    status={
                      context.removedSigners.includes(signer.id)
                        ? 'removed'
                        : 'unchanged'
                    }
                  />
                ))}
              </div>
            </div>

            {/* After */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                  After
                </span>
                <span className="text-xs text-neutral-500">
                  Threshold: {context.afterState.threshold} of{' '}
                  {context.afterState.signers.length}
                </span>
              </div>
              <div className="space-y-2">
                {context.afterState.signers.map((signer) => (
                  <SignerCard
                    key={signer.id}
                    signer={signer}
                    status={
                      context.addedSigners.includes(signer.id)
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
  );
};

export const PageOperationDetail = () => {
  const { operationId } = useParams({ from: '/_app/operations/$operationId' });
  const operation = getPendingOperationById(operationId);

  if (!operation) {
    return (
      <PageLayout>
        <PageLayoutTopBar
          breadcrumbs={[
            { label: 'Vaults', href: '/vaults' },
            { label: 'Operation Not Found' },
          ]}
        />
        <PageLayoutContent containerClassName="py-8">
          <div className="text-center text-neutral-500">
            <p className="text-sm">
              The requested operation could not be found.
            </p>
            <Link
              to="/vaults"
              className="mt-4 inline-block text-sm text-neutral-900 hover:underline"
            >
              Return to vaults
            </Link>
          </div>
        </PageLayoutContent>
      </PageLayout>
    );
  }

  const approvedCount = operation.approvals.filter((a) => a.approved).length;
  const isReady = approvedCount >= operation.threshold;

  return (
    <PageLayout>
      <PageLayoutTopBar
        breadcrumbs={[
          { label: 'Vaults', href: '/vaults' },
          {
            label: operation.vaultName,
            href: `/vaults/${operation.vaultId}`,
          },
          {
            label:
              operation.type === 'signature'
                ? 'Signature Request'
                : 'Reshare Request',
          },
        ]}
        actions={
          <>
            <Button
              variant="secondary"
              className="h-7 rounded-none border-neutral-300 px-3 text-xs font-medium"
            >
              Cancel Request
            </Button>
            {isReady && (
              <Button className="h-7 rounded-none bg-brand-500 px-3 text-xs font-medium text-white hover:bg-brand-600">
                Execute{' '}
                {operation.type === 'signature' ? 'Transaction' : 'Reshare'}
              </Button>
            )}
          </>
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
                    isReady
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  )}
                >
                  {isReady ? 'Ready to Execute' : 'Awaiting Approvals'}
                </span>
              </div>
              <div>
                <p className="mb-0.5 text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                  Requested By
                </p>
                <p className="text-sm text-neutral-900">
                  {operation.requestedBy}
                </p>
              </div>
              <div>
                <p className="mb-0.5 text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                  Requested At
                </p>
                <p className="text-sm text-neutral-900">
                  {operation.requestedAt}
                </p>
              </div>
              {operation.expiresAt && (
                <div>
                  <p className="mb-0.5 text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                    Expires At
                  </p>
                  <p className="text-sm text-neutral-900">
                    {operation.expiresAt}
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
                {approvedCount} of {operation.threshold} required (
                {operation.approvals.length} total signers)
              </span>
            </div>
            <div className="px-4 py-3">
              <ProgressBar
                current={approvedCount}
                total={operation.threshold}
              />
              <div className="mt-3">
                {operation.approvals.map((approval) => (
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

          {/* Signature context */}
          {operation.type === 'signature' && operation.signatureContext && (
            <SignatureContextSection context={operation.signatureContext} />
          )}

          {/* Reshare context */}
          {operation.type === 'reshare' && operation.reshareContext && (
            <ReshareContextSection operation={operation} />
          )}
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
