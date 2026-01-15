import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  CoinsIcon,
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

type MintStep = 'form' | 'review' | 'pending' | 'success' | 'error';

export function PageTokenMint({ tokenId, onBack }: Props) {
  const token = MOCK_TOKENS.find((t) => t.id === tokenId);

  const [step, setStep] = useState<MintStep>('form');
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [memo, setMemo] = useState('');

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
    setRecipientAddress('');
    setMemo('');
  };

  // Success state
  if (step === 'success') {
    return (
      <div className="mx-auto max-w-xl py-12">
        <div className="border-card p-8 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-positive-100">
            <CheckCircle2Icon className="size-8 text-positive-600" />
          </div>
          <h2 className="text-lg font-semibold text-neutral-900">
            Tokens Minted Successfully
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            {amount} {token.symbol} has been minted to the specified address.
          </p>

          <div className="mt-6 space-y-3 text-left">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2 text-xs">
              <span className="text-neutral-500">Amount</span>
              <span className="font-medium text-neutral-900">
                {amount} {token.symbol}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2 text-xs">
              <span className="text-neutral-500">Recipient</span>
              <span className="font-mono text-neutral-900">
                {recipientAddress.slice(0, 10)}...{recipientAddress.slice(-8)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-500">Transaction Hash</span>
              <span className="font-mono text-terminal-600">0x7f8a...3b2c</span>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <Button
              variant="secondary"
              onClick={handleReset}
              className="h-9 flex-1 rounded-none text-xs"
            >
              Mint More
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
            <Loader2Icon className="size-10 animate-spin text-terminal-500" />
          </div>
          <h2 className="text-lg font-semibold text-neutral-900">
            Processing Transaction
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            Please wait while we mint your tokens. This may take a few moments.
          </p>

          <div className="mt-6 space-y-2">
            <div className="h-1 overflow-hidden bg-neutral-100">
              <div className="h-full w-2/3 animate-pulse bg-terminal-500" />
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
      parseFloat(token.totalSupply.replace(/,/g, '')) +
      parseFloat(amount.replace(/,/g, ''))
    ).toLocaleString();

    return (
      <div className="mx-auto max-w-xl">
        <div className="border-card">
          {/* Header */}
          <div className="border-b border-neutral-200 bg-terminal-50/50 px-6 py-4">
            <h2 className="text-base font-semibold text-neutral-900">
              Review Mint Operation
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              Please review the details below before confirming.
            </p>
          </div>

          {/* Details */}
          <div className="space-y-4 p-6">
            {/* Token Info */}
            <div className="flex items-center gap-3 rounded bg-neutral-50 p-3">
              <div className="flex size-10 items-center justify-center rounded bg-terminal-100">
                <CoinsIcon className="size-5 text-terminal-600" />
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
                <span className="text-neutral-500">Mint Amount</span>
                <span className="font-semibold text-neutral-900">
                  {amount} {token.symbol}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">Current Supply</span>
                <span className="text-neutral-900">{token.totalSupply}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">New Supply</span>
                <span className="font-semibold text-terminal-600">
                  {newSupply}
                </span>
              </div>
            </div>

            <div className="h-px bg-neutral-200" />

            {/* Recipient */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-neutral-700">Recipient</p>
              <div className="flex items-center gap-2 rounded bg-neutral-50 p-2">
                <WalletIcon className="size-4 text-neutral-400" />
                <span className="font-mono text-xs text-neutral-900">
                  {recipientAddress}
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
            <div className="flex items-start gap-2 rounded bg-warning-50 p-3">
              <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-warning-600" />
              <p className="text-xs text-warning-800">
                This action will increase the total supply of {token.symbol}.
                This operation cannot be undone without burning the equivalent
                amount.
              </p>
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
              className="h-9 flex-1 rounded-none bg-terminal-500 text-xs hover:bg-terminal-600"
            >
              Confirm & Mint
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
        <div className="border-b border-neutral-200 bg-gradient-to-r from-terminal-50 to-transparent px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded bg-terminal-100">
              <CoinsIcon className="size-5 text-terminal-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                Mint {token.symbol}
              </h2>
              <p className="text-xs text-neutral-500">
                Create new tokens and add them to circulation
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
                Amount to Mint <span className="text-negative-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-10 w-full border-input pr-16 pl-3 font-mono text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-terminal-400 focus:outline-none"
                  required
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium text-neutral-500">
                  {token.symbol}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-neutral-400">
                Enter the amount of tokens to mint
              </p>
            </div>

            {/* Recipient Address */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                Recipient Address <span className="text-negative-500">*</span>
              </label>
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="0x..."
                className="h-10 w-full border-input px-3 font-mono text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-terminal-400 focus:outline-none"
                required
              />
              <p className="mt-1 text-[10px] text-neutral-400">
                The wallet address that will receive the minted tokens
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
                className="w-full border-input px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-terminal-400 focus:outline-none"
              />
            </div>

            {/* Info */}
            <div className="flex items-start gap-2 rounded bg-terminal-50 p-3">
              <InfoIcon className="mt-0.5 size-4 shrink-0 text-terminal-600" />
              <div className="text-xs text-terminal-800">
                <p className="font-medium">About Minting</p>
                <p className="mt-0.5 text-terminal-700">
                  Minting creates new tokens and increases the total supply.
                  Only authorized addresses can mint tokens.
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
                'h-9 rounded-none bg-terminal-500 text-xs hover:bg-terminal-600',
                onBack ? 'flex-1' : 'w-full'
              )}
              disabled={!amount || !recipientAddress}
            >
              Review Mint
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
