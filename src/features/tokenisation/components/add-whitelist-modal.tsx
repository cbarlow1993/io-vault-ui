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

export function AddWhitelistModal({ open, onOpenChange, tokenId }: Props) {
  const [address, setAddress] = useState('');
  const [label, setLabel] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In real app, call API to add address to whitelist
    console.log('Adding to whitelist:', {
      tokenId,
      address,
      label,
      expiryDate,
    });
    onOpenChange(false);
    setAddress('');
    setLabel('');
    setExpiryDate('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-none border-neutral-200 p-0">
        <DialogHeader className="border-b border-neutral-200 px-6 py-4">
          <DialogTitle className="text-base font-semibold">
            Add to Whitelist
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-500">
            Add an address to the token whitelist to allow it to receive tokens.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-4">
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
                className="h-9 w-full border border-neutral-200 bg-neutral-50 px-3 font-mono text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-terminal-400 focus:outline-none"
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
                placeholder="e.g., Institutional Investor"
                className="h-9 w-full border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-terminal-400 focus:outline-none"
              />
            </div>

            {/* Expiry Date */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                Expiry Date (optional)
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="h-9 w-full border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 focus:border-terminal-400 focus:outline-none"
              />
              <p className="mt-1 text-[10px] text-neutral-400">
                Leave blank for no expiry
              </p>
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
              className="h-8 rounded-none bg-terminal-500 text-xs hover:bg-terminal-600"
            >
              Add to Whitelist
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
