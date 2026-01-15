import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  FlameIcon,
  InfoIcon,
  Loader2Icon,
  WalletIcon,
} from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';

import { MOCK_TOKENS } from './data/mock-data';

type Props = {
  tokenId: string;
  onBack?: () => void;
};

type BurnStep = 'form' | 'review' | 'pending' | 'success' | 'error';

export function PageTokenBurn({ tokenId, onBack }: Props) {
  const token = MOCK_TOKENS.find((t) => t.id === tokenId);

  const [step, setStep] = useState<BurnStep>('form');
  const [amount, setAmount] = useState('');
  const [fromAddress, setFromAddress] = useState('');
  const [memo, setMemo] = useState('');
  const [confirmText, setConfirmText] = useState('');

  if (!token) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-sm text-neutral-500">Token not found</p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('review');
  };

  const handleConfirm = () => {
    setStep('pending');
    // Simulate transaction
    setTimeout(() => {
      setStep('success');
    }, 3000);
  };

  const handleReset = () => {
    setStep('form');
    setAmount('');
    setFromAddress('');
    setMemo('');
    setConfirmText('');
  };

  const confirmRequired = `BURN ${token.symbol}`;
  const isConfirmValid = confirmText === confirmRequired;

  // Success state
  if (step === 'success') {
    return (
      <div className="mx-auto max-w-xl py-12">
        <div className="border-card p-8 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-positive-100">
            <CheckCircle2Icon className="size-8 text-positive-600" />
          </div>
          <h2 className="text-lg font-semibold text-neutral-900">
            Tokens Burned Successfully
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            {amount} {token.symbol} has been permanently destroyed.
          </p>

          <div className="mt-6 space-y-3 text-left">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2 text-xs">
              <span className="text-neutral-500">Amount Burned</span>
              <span className="font-medium text-negative-600">
                -{amount} {token.symbol}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2 text-xs">
              <span className="text-neutral-500">From Address</span>
              <span className="font-mono text-neutral-900">
                {fromAddress.slice(0, 10)}...{fromAddress.slice(-8)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-500">Transaction Hash</span>
              <span className="font-mono text-terminal-600">0x9c4d...8f1e</span>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <Button
              variant="secondary"
              onClick={handleReset}
              className="h-9 flex-1 rounded-none text-xs"
            >
              Burn More
            </Button>
            <Button
              onClick={onBack}
              className="h-9 flex-1 rounded-none bg-terminal-500 text-xs hover:bg-terminal-600"
            >
              Back to Token
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Pending state
  if (step === 'pending') {
    return (
      <div className="mx-auto max-w-xl py-12">
        <div className="border-card p-8 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center">
            <Loader2Icon className="size-10 animate-spin text-negative-500" />
          </div>
          <h2 className="text-lg font-semibold text-neutral-900">
            Processing Burn Transaction
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            Please wait while we burn your tokens. This may take a few moments.
          </p>

          <div className="mt-6 space-y-2">
            <div className="h-1 overflow-hidden bg-neutral-100">
              <div className="h-full w-2/3 animate-pulse bg-negative-500" />
            </div>
            <p className="text-xs text-neutral-500">
              Waiting for blockchain confirmation...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Review state
  if (step === 'review') {
    const newSupply = (
      parseFloat(token.totalSupply.replace(/,/g, '')) -
      parseFloat(amount.replace(/,/g, ''))
    ).toLocaleString();

    return (
      <div className="mx-auto max-w-xl">
        <div className="border-card">
          {/* Header */}
          <div className="border-b border-neutral-200 bg-negative-50/50 px-6 py-4">
            <h2 className="text-base font-semibold text-neutral-900">
              Review Burn Operation
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              Please review the details below. This action is irreversible.
            </p>
          </div>

          {/* Details */}
          <div className="space-y-4 p-6">
            {/* Token Info */}
            <div className="flex items-center gap-3 rounded bg-neutral-50 p-3">
              <div className="flex size-10 items-center justify-center rounded bg-negative-100">
                <FlameIcon className="size-5 text-negative-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {token.name}
                </p>
                <p className="text-xs text-neutral-500">
                  {token.symbol} · {token.standard}
                </p>
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">Burn Amount</span>
                <span className="font-semibold text-negative-600">
                  -{amount} {token.symbol}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">Current Supply</span>
                <span className="text-neutral-900">{token.totalSupply}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">New Supply</span>
                <span className="font-semibold text-neutral-900">
                  {newSupply}
                </span>
              </div>
            </div>

            <div className="h-px bg-neutral-200" />

            {/* From Address */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-neutral-700">
                Burn From Address
              </p>
              <div className="flex items-center gap-2 rounded bg-neutral-50 p-2">
                <WalletIcon className="size-4 text-neutral-400" />
                <span className="font-mono text-xs text-neutral-900">
                  {fromAddress}
                </span>
              </div>
            </div>

            {/* Memo */}
            {memo && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-neutral-700">Memo</p>
                <p className="text-xs text-neutral-600">{memo}</p>
              </div>
            )}

            {/* Warning */}
            <div className="flex items-start gap-2 rounded border border-negative-200 bg-negative-50 p-3">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-negative-600" />
              <div className="text-xs text-negative-800">
                <p className="font-semibold">Warning: Irreversible Action</p>
                <p className="mt-0.5">
                  Burning tokens will permanently destroy them and reduce the
                  total supply. This operation cannot be undone.
                </p>
              </div>
            </div>

            {/* Confirmation */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                Type{' '}
                <span className="font-mono text-negative-600">
                  {confirmRequired}
                </span>{' '}
                to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={confirmRequired}
                className="h-10 w-full border-input px-3 font-mono text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-negative-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 border-t border-neutral-200 px-6 py-4">
            <Button
              variant="secondary"
              onClick={() => setStep('form')}
              className="h-9 flex-1 rounded-none text-xs"
            >
              Back to Edit
            </Button>
            <Button
              onClick={handleConfirm}
              className="h-9 flex-1 rounded-none bg-negative-500 text-xs hover:bg-negative-600"
              disabled={!isConfirmValid}
            >
              Confirm & Burn
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="mx-auto max-w-xl">
      {/* Back Button */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-4 flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-700"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to Token
        </button>
      )}

      <div className="border-card">
        {/* Header */}
        <div className="border-b border-neutral-200 bg-gradient-to-r from-negative-50 to-transparent px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded bg-negative-100">
              <FlameIcon className="size-5 text-negative-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                Burn {token.symbol}
              </h2>
              <p className="text-xs text-neutral-500">
                Permanently destroy tokens and reduce supply
              </p>
            </div>
          </div>
        </div>

        {/* Token Summary */}
        <div className="grid grid-cols-3 gap-4 border-b border-neutral-200 bg-neutral-50 px-6 py-3">
          <div>
            <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
              Current Supply
            </p>
            <p className="mt-0.5 font-mono text-sm font-semibold text-neutral-900">
              {token.totalSupply}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
              Holders
            </p>
            <p className="mt-0.5 font-mono text-sm font-semibold text-neutral-900">
              {token.holdersCount}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
              Standard
            </p>
            <p className="mt-0.5 text-sm font-semibold text-neutral-900">
              {token.standard}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 p-6">
            {/* Amount */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                Amount to Burn <span className="text-negative-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-10 w-full border-input pr-16 pl-3 font-mono text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-negative-400 focus:outline-none"
                  required
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium text-neutral-500">
                  {token.symbol}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-neutral-400">
                Enter the amount of tokens to burn
              </p>
            </div>

            {/* From Address */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                Burn From Address <span className="text-negative-500">*</span>
              </label>
              <input
                type="text"
                value={fromAddress}
                onChange={(e) => setFromAddress(e.target.value)}
                placeholder="0x..."
                className="h-10 w-full border-input px-3 font-mono text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-negative-400 focus:outline-none"
                required
              />
              <p className="mt-1 text-[10px] text-neutral-400">
                The wallet address to burn tokens from
              </p>
            </div>

            {/* Memo */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                Memo (Optional)
              </label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="Add a note for this operation..."
                rows={2}
                className="w-full border-input px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-negative-400 focus:outline-none"
              />
            </div>

            {/* Warning Info */}
            <div className="flex items-start gap-2 rounded border border-negative-200 bg-negative-50 p-3">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-negative-600" />
              <div className="text-xs text-negative-800">
                <p className="font-medium">Destructive Action</p>
                <p className="mt-0.5 text-negative-700">
                  Burning tokens permanently removes them from circulation. This
                  action cannot be reversed. Make sure you understand the
                  implications before proceeding.
                </p>
              </div>
            </div>

            {/* Info */}
            <div className="flex items-start gap-2 rounded bg-neutral-100 p-3">
              <InfoIcon className="mt-0.5 size-4 shrink-0 text-neutral-500" />
              <div className="text-xs text-neutral-600">
                <p className="font-medium">About Burning</p>
                <p className="mt-0.5">
                  Burning is commonly used to reduce supply, remove tokens from
                  compromised wallets, or fulfill redemption obligations.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 border-t border-neutral-200 px-6 py-4">
            {onBack && (
              <Button
                type="button"
                variant="secondary"
                onClick={onBack}
                className="h-9 rounded-none text-xs"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              className={cn(
                'h-9 rounded-none bg-negative-500 text-xs hover:bg-negative-600',
                onBack ? 'flex-1' : 'w-full'
              )}
              disabled={!amount || !fromAddress}
            >
              Review Burn
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
