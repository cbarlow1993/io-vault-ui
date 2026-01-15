import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { ChevronRightIcon, CopyIcon, KeyIcon, LoaderIcon } from 'lucide-react';

import { orpc } from '@/lib/orpc/client';
import { cn } from '@/lib/tailwind/utils';

import { getDeviceIcon } from '@/features/shared/lib/device-helpers';
import { getStatusIcon } from '@/features/shared/lib/status-icons';
import { getStatusStyles } from '@/features/shared/lib/status-styles';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
} from '@/layout/shell';

import {
  getSignerSignatureActivities,
  getSignerVaults,
  type SignerSignatureActivity,
  type SignerVaultSummary,
} from './data/signers';
import type { SignerType } from './schema';

const getVaultStatusStyles = getStatusStyles;

const getSignerTypeLabel = (type: SignerType) => {
  switch (type) {
    case 'virtual':
      return 'Virtual (HSM)';
    case 'ios':
      return 'iOS';
    case 'android':
      return 'Android';
  }
};

export const PageSignerDetail = () => {
  const { signerId } = useParams({ from: '/_app/treasury/signers/$signerId' });

  // Fetch signers from API and filter by ID
  const {
    data: signersData,
    isLoading,
    isError,
  } = useQuery(
    orpc.signers.list.queryOptions({
      limit: 100,
    })
  );

  const signer = signersData?.data.find((s) => s.id === signerId);
  const signerVaults = getSignerVaults(signerId);
  const signatureActivities = getSignerSignatureActivities(signerId);

  // Loading state
  if (isLoading) {
    return (
      <PageLayout>
        <PageLayoutTopBar
          breadcrumbs={[
            { label: 'Signers', href: '/signers' },
            { label: 'Loading...' },
          ]}
        />
        <PageLayoutContent containerClassName="py-8">
          <div className="flex items-center justify-center gap-2 text-neutral-500">
            <LoaderIcon className="size-4 animate-spin" />
            <span>Loading signer details...</span>
          </div>
        </PageLayoutContent>
      </PageLayout>
    );
  }

  // Error or not found state
  if (isError || !signer) {
    return (
      <PageLayout>
        <PageLayoutTopBar
          breadcrumbs={[
            { label: 'Signers', href: '/treasury/signers' },
            { label: 'Not Found' },
          ]}
        />
        <PageLayoutContent containerClassName="py-8">
          <div className="text-center">
            <p className="text-neutral-500">
              {isError
                ? 'Failed to load signer details.'
                : 'The requested signer could not be found.'}
            </p>
            <Link
              to="/treasury/signers"
              className="mt-4 inline-block text-sm text-neutral-900 hover:underline"
            >
              Return to signers
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
          { label: 'Signers', href: '/treasury/signers' },
          { label: signer.name },
        ]}
      />
      <PageLayoutContent containerClassName="py-4">
        <div className="space-y-6">
          {/* Signer Info */}
          <div className="grid grid-cols-4 gap-px bg-neutral-200">
            <div className="bg-white p-4">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Type
              </p>
              <div className="mt-1 flex items-center gap-2">
                {getDeviceIcon(signer.type, {
                  className: 'size-5 text-neutral-500',
                })}
                <span className="text-sm font-medium text-neutral-900">
                  {getSignerTypeLabel(signer.type)}
                </span>
              </div>
            </div>
            <div className="bg-white p-4">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Owner
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-900">
                {signer.owner}
              </p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Registered
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-900">
                {signer.registeredAt}
              </p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Last Seen
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-900">
                {signer.lastSeen ?? 'Never'}
              </p>
            </div>
          </div>

          {/* Device & Version Info */}
          <div className="grid grid-cols-3 gap-px bg-neutral-200">
            <div className="bg-white p-4">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Device Info
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-900">
                {signer.deviceInfo ?? 'N/A'}
              </p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Version
              </p>
              <p className="mt-1 font-mono text-sm font-medium text-neutral-900">
                {signer.version}
              </p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                Vaults Count
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-900">
                {signer.vaultsCount}
              </p>
            </div>
          </div>

          {/* Vaults Section */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <div>
                  <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                    Associated Vaults
                  </h2>
                  <p className="mt-0.5 text-[11px] text-neutral-500">
                    Vaults where this signer is a key holder
                  </p>
                </div>
              </div>
              <span className="text-xs text-neutral-500 tabular-nums">
                {signerVaults.length}{' '}
                {signerVaults.length === 1 ? 'vault' : 'vaults'}
              </span>
            </div>
            {signerVaults.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <KeyIcon className="mx-auto size-8 text-neutral-300" />
                <p className="mt-2 text-sm text-neutral-500">
                  No associated vaults
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  This signer has not been added to any vaults yet
                </p>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50 text-left">
                    <th className="px-4 py-2 font-medium text-neutral-500">
                      Vault Name
                    </th>
                    <th className="px-4 py-2 font-medium text-neutral-500">
                      Threshold
                    </th>
                    <th className="px-4 py-2 font-medium text-neutral-500">
                      Total Signers
                    </th>
                    <th className="px-4 py-2 font-medium text-neutral-500">
                      Status
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-neutral-500">
                      Voting Power
                    </th>
                    <th className="w-8 px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {signerVaults.map((vault) => (
                    <tr key={vault.id} className="group hover:bg-neutral-50">
                      <td className="px-4 py-2.5">
                        <Link
                          to="/treasury/vaults/$vaultId"
                          params={{ vaultId: vault.id }}
                          className="font-medium text-neutral-900 hover:underline"
                        >
                          {vault.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-neutral-600 tabular-nums">
                        {vault.threshold}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-600 tabular-nums">
                        {vault.totalSigners}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize',
                            getVaultStatusStyles(vault.status)
                          )}
                        >
                          {vault.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-neutral-100 px-1.5 font-mono text-[10px] font-semibold text-neutral-700 tabular-nums">
                          {vault.votingPower}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <Link
                          to="/treasury/vaults/$vaultId"
                          params={{ vaultId: vault.id }}
                          className="text-neutral-400 opacity-0 group-hover:opacity-100"
                        >
                          <ChevronRightIcon className="size-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Signature History Section */}
          <div className="border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
              <div>
                <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                  Signature Activity
                </h2>
                <p className="mt-0.5 text-[11px] text-neutral-500">
                  Recent signatures this signer has participated in
                </p>
              </div>
              <span className="text-xs text-neutral-500 tabular-nums">
                {signatureActivities.length}{' '}
                {signatureActivities.length === 1 ? 'signature' : 'signatures'}
              </span>
            </div>
            {signatureActivities.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-neutral-500">
                  No signature activity
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  This signer has not participated in any signatures yet
                </p>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50 text-left">
                    <th className="px-4 py-2 font-medium text-neutral-500">
                      Status
                    </th>
                    <th className="px-4 py-2 font-medium text-neutral-500">
                      Description
                    </th>
                    <th className="px-4 py-2 font-medium text-neutral-500">
                      Vault
                    </th>
                    <th className="px-4 py-2 font-medium text-neutral-500">
                      Hash
                    </th>
                    <th className="px-4 py-2 font-medium text-neutral-500">
                      Curve
                    </th>
                    <th className="px-4 py-2 font-medium text-neutral-500">
                      Signed At
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {signatureActivities.map((sig) => (
                    <tr key={sig.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {getStatusIcon(sig.status)}
                          <span className="text-neutral-600 capitalize">
                            {sig.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-neutral-900">
                        {sig.description}
                      </td>
                      <td className="px-4 py-2.5">
                        <Link
                          to="/treasury/vaults/$vaultId"
                          params={{ vaultId: sig.vaultId }}
                          className="text-neutral-600 hover:text-neutral-900 hover:underline"
                        >
                          {sig.vaultName}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="max-w-[120px] truncate font-mono text-neutral-600">
                            {sig.hash}
                          </span>
                          <button
                            type="button"
                            className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                          >
                            <CopyIcon className="size-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-block rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-neutral-600">
                          {sig.curveUsed}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-neutral-600 tabular-nums">
                        {sig.signedAt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
