import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import type { RegisteredSigner } from '../data/signers';

type RenameSignerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signer: RegisteredSigner | null;
  onRename?: (signerId: string, newName: string) => void;
};

export const RenameSignerModal = ({
  open,
  onOpenChange,
  signer,
  onRename,
}: RenameSignerModalProps) => {
  const [name, setName] = useState('');

  useEffect(() => {
    if (signer) {
      setName(signer.name);
    }
  }, [signer]);

  const handleClose = () => {
    setName('');
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (signer && name.trim()) {
      onRename?.(signer.id, name.trim());
      handleClose();
    }
  };

  const isValid = name.trim().length > 0 && name.trim() !== signer?.name;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm rounded-none sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Rename Signer</DialogTitle>
          <DialogDescription className="text-xs">
            Enter a new name for this signer
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="py-4">
            <label
              htmlFor="signer-name"
              className="mb-1.5 block text-xs font-medium text-neutral-500"
            >
              Signer Name
            </label>
            <input
              id="signer-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter signer name"
              className="h-9 w-full border border-neutral-200 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
              autoFocus
            />
            {signer && (
              <p className="mt-2 text-[10px] text-neutral-400">
                Current: {signer.name}
              </p>
            )}
          </div>

          <DialogFooter className="border-t border-neutral-200 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              className="h-8 rounded-none border-neutral-200 px-4 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid}
              className="h-8 rounded-none bg-brand-500 px-4 text-xs text-white hover:bg-brand-600 disabled:bg-neutral-200 disabled:text-neutral-400"
            >
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
