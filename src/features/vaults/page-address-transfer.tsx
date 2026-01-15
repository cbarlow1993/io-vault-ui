import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { ChevronDownIcon, SendIcon } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';

import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
} from '@/layout/shell';

import { type ChainId, chains, getChainById } from './data/addresses';
import { getVaultById } from './data/vaults';

// =============================================================================
// Chain ID Mapping (short form to full ChainId)
// =============================================================================

const chainIdMap: Record<string, ChainId> = {
  eth: 'ethereum',
  btc: 'bitcoin',
  sol: 'solana',
  xrp: 'xrp',
  arb: 'arbitrum',
  polygon: 'polygon',
  base: 'base',
  op: 'optimism',
  avax: 'avalanche',
  ethereum: 'ethereum',
  bitcoin: 'bitcoin',
  solana: 'solana',
  arbitrum: 'arbitrum',
  optimism: 'optimism',
  avalanche: 'avalanche',
};

const getChainByIdOrShort = (chain: string) => {
  const resolvedId = chainIdMap[chain.toLowerCase()];
  if (resolvedId) {
    return getChainById(resolvedId);
  }
  return chains.find((c) => c.symbol.toLowerCase() === chain.toLowerCase());
};

// =============================================================================
// Fee Configuration by Chain Type
// =============================================================================

type FeeLevel = 'low' | 'medium' | 'high' | 'custom';

type ChainFeeConfig = {
  unit: string;
  unitLabel: string;
  low: number;
  medium: number;
  high: number;
  hasNonce: boolean;
  nonceLabel?: string;
  hasMemo: boolean;
  memoLabel?: string;
  memoPlaceholder?: string;
};

const getChainFeeConfig = (chainId: string): ChainFeeConfig => {
  const id = chainId.toLowerCase();

  // Bitcoin - uses sats/vB
  if (id === 'bitcoin' || id === 'btc') {
    return {
      unit: 'sats/vB',
      unitLabel: 'sats/vB',
      low: 5,
      medium: 15,
      high: 30,
      hasNonce: false,
      hasMemo: false,
    };
  }

  // Solana - uses priority fee in micro-lamports per compute unit
  if (id === 'solana' || id === 'sol') {
    return {
      unit: 'microLamports',
      unitLabel: 'micro-lamports/CU',
      low: 1000,
      medium: 10000,
      high: 100000,
      hasNonce: false,
      hasMemo: true,
      memoLabel: 'Memo',
      memoPlaceholder: 'Add a memo for this transfer',
    };
  }

  // XRP - uses drops (1 XRP = 1,000,000 drops)
  if (id === 'xrp') {
    return {
      unit: 'drops',
      unitLabel: 'drops',
      low: 10,
      medium: 12,
      high: 20,
      hasNonce: true,
      nonceLabel: 'Sequence',
      hasMemo: true,
      memoLabel: 'Destination Tag',
      memoPlaceholder: 'Enter destination tag (optional)',
    };
  }

  // EVM chains (Ethereum, Arbitrum, Polygon, Base, Optimism, Avalanche) - uses gwei
  return {
    unit: 'gwei',
    unitLabel: 'gwei',
    low: 10,
    medium: 25,
    high: 50,
    hasNonce: true,
    nonceLabel: 'Nonce',
    hasMemo: true,
    memoLabel: 'Note',
    memoPlaceholder: 'Add a note for this transfer',
  };
};

const formatFeeEstimate = (chainId: string, feeValue: number): string => {
  const id = chainId.toLowerCase();

  if (id === 'bitcoin' || id === 'btc') {
    // Assuming ~140 vBytes for a typical transaction
    const sats = feeValue * 140;
    const btc = sats / 100000000;
    return `~${sats.toLocaleString()} sats (~${btc.toFixed(8)} BTC)`;
  }

  if (id === 'solana' || id === 'sol') {
    // Assuming ~200,000 compute units
    const lamports = (feeValue * 200000) / 1000000;
    const sol = lamports / 1000000000;
    return `~${lamports.toLocaleString()} lamports (~${sol.toFixed(9)} SOL)`;
  }

  if (id === 'xrp') {
    const xrp = feeValue / 1000000;
    return `~${feeValue} drops (~${xrp.toFixed(6)} XRP)`;
  }

  // EVM chains
  // Assuming ~21,000 gas for a simple transfer
  const gasUsed = 21000;
  const gweiCost = feeValue * gasUsed;
  const ethCost = gweiCost / 1000000000;
  return `~${gweiCost.toLocaleString()} gwei (~${ethCost.toFixed(6)} ETH)`;
};

// =============================================================================
// Main Page Component
// =============================================================================

export const PageAddressTransfer = () => {
  const navigate = useNavigate();
  const { vaultId, chain, address } = useParams({
    from: '/_app/treasury/vaults/$vaultId/chain/$chain/addresses/$address/transfer',
  });

  const { asset: selectedAsset } = useSearch({
    from: '/_app/treasury/vaults/$vaultId/chain/$chain/addresses/$address/transfer',
  });

  // Find the chain data
  const chainData = getChainByIdOrShort(chain);
  const feeConfig = chainData ? getChainFeeConfig(chainData.id) : null;

  // Fee state
  const [feeLevel, setFeeLevel] = useState<FeeLevel>('medium');
  const [customFee, setCustomFee] = useState<string>('');
  const [customNonce, setCustomNonce] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Get the current fee value
  const getCurrentFeeValue = (): number => {
    if (!feeConfig) return 0;
    if (feeLevel === 'custom') {
      return parseFloat(customFee) || feeConfig.medium;
    }
    return feeConfig[feeLevel];
  };

  const handleCancel = () => {
    navigate({
      to: '/treasury/vaults/$vaultId/chain/$chain/addresses/$address',
      params: { vaultId, chain, address },
    });
  };

  const handleSubmit = () => {
    // In a real app, this would submit the transfer
    console.log('Creating transfer:', {
      vaultId,
      chain,
      address,
      selectedAsset,
    });
    navigate({
      to: '/treasury/vaults/$vaultId/chain/$chain/addresses/$address',
      params: { vaultId, chain, address },
    });
  };

  // Get vault data for breadcrumbs
  const vault = getVaultById(vaultId);

  if (!chainData) {
    return (
      <PageLayout>
        <PageLayoutTopBar
          breadcrumbs={[
            { label: 'Vaults', href: '/treasury/vaults' },
            { label: vault?.name ?? 'Vault', href: `/vaults/${vaultId}` },
            { label: 'Chain Not Found' },
          ]}
        />
        <PageLayoutContent containerClassName="py-8">
          <div className="text-center">
            <p className="text-neutral-500">Unknown chain: {chain}</p>
          </div>
        </PageLayoutContent>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageLayoutTopBar
        breadcrumbs={[
          { label: 'Vaults', href: '/treasury/vaults' },
          { label: vault?.name ?? 'Vault', href: `/vaults/${vaultId}` },
          {
            label: 'Address',
            href: `/vaults/${vaultId}/chain/${chain}/addresses/${address}`,
          },
          { label: 'Create Transfer' },
        ]}
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              className="h-7 rounded-none border-neutral-300 px-3 text-xs font-medium"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              className="h-7 rounded-none bg-brand-500 px-3 text-xs font-medium text-white hover:bg-brand-600"
            >
              <SendIcon className="mr-1.5 size-3.5" />
              Create Transfer
            </Button>
          </>
        }
      />

      <PageLayoutContent containerClassName="py-4">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Transfer Form Card */}
          <div className="border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-neutral-900">
                Transfer Details
              </h2>
              <p className="mt-1 text-xs text-neutral-500">
                Send assets from this address to another wallet
              </p>
            </div>

            <div className="space-y-4 p-4">
              {/* From Address */}
              <div>
                <label className="block text-xs font-medium text-neutral-700">
                  From Address
                </label>
                <div className="mt-1 flex items-center gap-2 rounded border border-neutral-200 bg-neutral-50 px-3 py-2">
                  <div
                    className="flex size-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: chainData.color }}
                  >
                    {chainData.symbol.slice(0, 2)}
                  </div>
                  <span className="font-mono text-sm text-neutral-700">
                    {address.slice(0, 10)}...{address.slice(-8)}
                  </span>
                </div>
              </div>

              {/* Asset Selection */}
              <div>
                <label className="block text-xs font-medium text-neutral-700">
                  Asset
                </label>
                <select className="mt-1 w-full rounded border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none">
                  {selectedAsset ? (
                    <option value={selectedAsset}>{selectedAsset}</option>
                  ) : (
                    <option value="">Select an asset</option>
                  )}
                  <option value="ETH">ETH - Ethereum</option>
                  <option value="USDC">USDC - USD Coin</option>
                  <option value="USDT">USDT - Tether</option>
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-neutral-700">
                  Amount
                </label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    placeholder="0.00"
                    className="w-full rounded border border-neutral-200 bg-white px-3 py-2 pr-16 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 hover:bg-neutral-200"
                  >
                    MAX
                  </button>
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  Available: 2.4523 ETH ($8,256.12)
                </p>
              </div>

              {/* To Address */}
              <div>
                <label className="block text-xs font-medium text-neutral-700">
                  Recipient Address
                </label>
                <input
                  type="text"
                  placeholder={`Enter ${chainData.name} address`}
                  className="mt-1 w-full rounded border border-neutral-200 bg-white px-3 py-2 font-mono text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              {/* Memo/Note/Destination Tag (chain-specific) */}
              {feeConfig?.hasMemo && (
                <div>
                  <label className="block text-xs font-medium text-neutral-700">
                    {feeConfig.memoLabel}{' '}
                    <span className="font-normal text-neutral-400">
                      (optional)
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder={feeConfig.memoPlaceholder}
                    className="mt-1 w-full rounded border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Fee Selection */}
            {feeConfig && (
              <div className="border-t border-neutral-200 p-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-neutral-700">
                    Network Fee
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
                  >
                    Advanced
                    <ChevronDownIcon
                      className={cn(
                        'size-3.5 transition-transform',
                        showAdvanced && 'rotate-180'
                      )}
                    />
                  </button>
                </div>

                {/* Fee Level Buttons */}
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {(['low', 'medium', 'high', 'custom'] as const).map(
                    (level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setFeeLevel(level)}
                        className={cn(
                          'flex flex-col items-center justify-center border px-3 py-2 text-xs transition-colors',
                          feeLevel === level
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50'
                        )}
                      >
                        <span className="font-medium capitalize">{level}</span>
                        {level !== 'custom' && (
                          <span className="mt-0.5 font-mono text-[10px] text-neutral-500">
                            {feeConfig[level]} {feeConfig.unitLabel}
                          </span>
                        )}
                      </button>
                    )
                  )}
                </div>

                {/* Custom Fee Input */}
                {feeLevel === 'custom' && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-neutral-700">
                      Custom Fee ({feeConfig.unitLabel})
                    </label>
                    <input
                      type="text"
                      value={customFee}
                      onChange={(e) => setCustomFee(e.target.value)}
                      placeholder={`Enter fee in ${feeConfig.unitLabel}`}
                      className="mt-1 w-full rounded border border-neutral-200 bg-white px-3 py-2 font-mono text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                )}

                {/* Advanced Options */}
                {showAdvanced && feeConfig.hasNonce && (
                  <div className="mt-3 border-t border-neutral-100 pt-3">
                    <label className="block text-xs font-medium text-neutral-700">
                      {feeConfig.nonceLabel}{' '}
                      <span className="font-normal text-neutral-400">
                        (optional, leave blank for auto)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={customNonce}
                      onChange={(e) => setCustomNonce(e.target.value)}
                      placeholder={`Enter custom ${feeConfig.nonceLabel?.toLowerCase()}`}
                      className="mt-1 w-full rounded border border-neutral-200 bg-white px-3 py-2 font-mono text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                )}

                {/* Fee Estimate */}
                <div className="mt-3 flex items-center justify-between rounded bg-neutral-50 px-3 py-2 text-xs">
                  <span className="text-neutral-500">
                    Estimated Network Fee
                  </span>
                  <span className="font-medium text-neutral-700">
                    {formatFeeEstimate(
                      chainData?.id ?? '',
                      getCurrentFeeValue()
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
