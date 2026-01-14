import {
  AlertTriangleIcon,
  ChevronDownIcon,
  SendIcon,
  XIcon,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

import { type Address, type Asset, getChainById } from '../data/addresses';

type TransferFormProps = {
  address: Address;
  assets: Asset[];
  onClose: () => void;
};

export const TransferForm = ({
  address,
  assets,
  onClose,
}: TransferFormProps) => {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(
    assets[0] ?? null
  );
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const chain = getChainById(address.chainId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAsset) {
      toast.error('Please select an asset');
      return;
    }

    if (!recipient) {
      toast.error('Please enter a recipient address');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const maxBalance = parseFloat(selectedAsset.balance.replace(/,/g, ''));
    if (parseFloat(amount) > maxBalance) {
      toast.error('Insufficient balance');
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    toast.success('Transfer initiated', {
      description: `Sending ${amount} ${selectedAsset.symbol} to ${recipient.slice(0, 8)}...${recipient.slice(-6)}`,
    });

    setIsSubmitting(false);
    onClose();
  };

  const handleMaxClick = () => {
    if (selectedAsset) {
      setAmount(selectedAsset.balance.replace(/,/g, ''));
    }
  };

  const estimatedFee = chain?.id === 'bitcoin' ? '~0.0001 BTC' : '~0.002 ETH';
  const estimatedFeeUsd = chain?.id === 'bitcoin' ? '~$9.46' : '~$6.74';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md border border-neutral-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">
              Transfer Assets
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Send from {address.alias ?? 'this address'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-5">
            {/* Asset Selection */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-neutral-700">
                Asset
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex h-10 w-full items-center justify-between border border-neutral-200 bg-white px-3 text-sm hover:bg-neutral-50"
                  >
                    {selectedAsset ? (
                      <div className="flex items-center gap-3">
                        <div className="flex size-6 items-center justify-center rounded-full bg-neutral-100">
                          <span className="text-[10px] font-bold text-neutral-600">
                            {selectedAsset.symbol.slice(0, 2)}
                          </span>
                        </div>
                        <span className="font-medium text-neutral-900">
                          {selectedAsset.symbol}
                        </span>
                        <span className="text-neutral-500">
                          Balance: {selectedAsset.balance}
                        </span>
                      </div>
                    ) : (
                      <span className="text-neutral-500">Select an asset</span>
                    )}
                    <ChevronDownIcon className="size-4 text-neutral-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-[calc(100%-48px)] rounded-none p-0"
                >
                  {assets.map((asset) => (
                    <DropdownMenuItem
                      key={asset.id}
                      onClick={() => setSelectedAsset(asset)}
                      className={cn(
                        'flex items-center justify-between rounded-none px-3 py-2.5',
                        selectedAsset?.id === asset.id && 'bg-neutral-100'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-6 items-center justify-center rounded-full bg-neutral-100">
                          <span className="text-[10px] font-bold text-neutral-600">
                            {asset.symbol.slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-900">
                            {asset.symbol}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {asset.name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-neutral-900 tabular-nums">
                          {asset.balance}
                        </p>
                        <p className="text-xs text-neutral-500 tabular-nums">
                          {asset.balanceUsd}
                        </p>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Recipient Address */}
            <div className="space-y-2">
              <label
                htmlFor="recipient"
                className="text-xs font-medium text-neutral-700"
              >
                Recipient Address
              </label>
              <Input
                id="recipient"
                type="text"
                placeholder={
                  chain?.id === 'bitcoin'
                    ? 'bc1q...'
                    : chain?.id === 'solana'
                      ? 'So1...'
                      : '0x...'
                }
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="h-10 rounded-none border-neutral-200 font-mono text-sm"
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="amount"
                  className="text-xs font-medium text-neutral-700"
                >
                  Amount
                </label>
                {selectedAsset && (
                  <button
                    type="button"
                    onClick={handleMaxClick}
                    className="text-[10px] font-medium tracking-wider text-neutral-500 uppercase hover:text-neutral-900"
                  >
                    MAX
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-10 rounded-none border-neutral-200 pr-16 font-mono text-sm tabular-nums"
                />
                <div className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium text-neutral-500">
                  {selectedAsset?.symbol ?? '—'}
                </div>
              </div>
              {selectedAsset && amount && (
                <p className="text-xs text-neutral-500">
                  ≈ $
                  {(
                    parseFloat(amount || '0') *
                    parseFloat(selectedAsset.priceUsd.replace(/[$,]/g, ''))
                  ).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              )}
            </div>

            {/* Memo */}
            <div className="space-y-2">
              <label
                htmlFor="memo"
                className="text-xs font-medium text-neutral-700"
              >
                Memo{' '}
                <span className="font-normal text-neutral-400">(optional)</span>
              </label>
              <textarea
                id="memo"
                placeholder="Add a note for this transaction"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={2}
                className="w-full resize-none border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
              />
            </div>

            {/* Fee Estimate */}
            <div className="border border-neutral-200 bg-neutral-50 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">Estimated Network Fee</span>
                <div className="text-right">
                  <span className="font-medium text-neutral-900">
                    {estimatedFee}
                  </span>
                  <span className="ml-1 text-neutral-500">
                    {estimatedFeeUsd}
                  </span>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 border border-warning-200 bg-warning-50 p-3">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-warning-600" />
              <p className="text-xs text-warning-700">
                This transfer will require signatures from vault signers. Please
                verify the recipient address carefully.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              className="h-9 flex-1 rounded-none border-neutral-200 text-xs font-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !selectedAsset || !recipient || !amount}
              className="h-9 flex-1 rounded-none bg-brand-500 text-xs font-medium text-white hover:bg-brand-600 disabled:bg-neutral-300"
            >
              {isSubmitting ? (
                'Processing...'
              ) : (
                <>
                  <SendIcon className="mr-1.5 size-3.5" />
                  Initiate Transfer
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
