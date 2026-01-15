import { AlertTriangleIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tokenId: string;
};

export function AddBlocklistModal({ open, onOpenChange, tokenId }: Props) {
  const [address, setAddress] = useState('');
  const [label, setLabel] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In real app, call API to add address to blocklist
    console.log('Adding to blocklist:', { tokenId, address, label, reason });
    onOpenChange(false);
    setAddress('');
    setLabel('');
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-none border-neutral-200 p-0">
        <DialogHeader className="border-b border-neutral-200 px-6 py-4">
          <DialogTitle className="text-base font-semibold">
            Block Address
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-500">
            Add an address to the blocklist to prevent token transfers.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-4">
            {/* Warning */}
            <div className="flex items-start gap-2 bg-negative-50 p-3">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-negative-500" />
              <p className="text-xs text-negative-700">
                Blocking an address will immediately prevent it from sending or
                receiving this token. Existing balances will be frozen.
              </p>
            </div>

            {/* Address */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                Wallet Address <span className="text-negative-500">*</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="0x..."
                className="h-9 w-full border border-neutral-200 bg-neutral-50 px-3 font-mono text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                required
              />
            </div>

            {/* Label */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                Label (optional)
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., Sanctioned Entity"
                className="h-9 w-full border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                Reason <span className="text-negative-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this address is being blocked..."
                rows={3}
                className="w-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                required
              />
            </div>
          </div>

          <DialogFooter className="border-t border-neutral-200 px-6 py-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              className="h-8 rounded-none text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-8 rounded-none bg-negative-500 text-xs hover:bg-negative-600"
            >
              Block Address
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
