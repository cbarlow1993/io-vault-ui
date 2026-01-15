import { AlertTriangleIcon } from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { getSignerVaults, type RegisteredSigner } from '../data/signers';

type RevokeSignerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signer: RegisteredSigner | null;
  onRevoke?: (signerId: string) => void;
};

export const RevokeSignerModal = ({
  open,
  onOpenChange,
  signer,
  onRevoke,
}: RevokeSignerModalProps) => {
  const affectedVaults = signer ? getSignerVaults(signer.id) : [];

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleRevoke = () => {
    if (signer) {
      onRevoke?.(signer.id);
      handleClose();
    }
  };

  if (!signer) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md rounded-none sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center bg-negative-100">
              <AlertTriangleIcon className="size-5 text-negative-600" />
            </div>
            <div>
              <DialogTitle className="text-base text-negative-700">
                Revoke Signer
              </DialogTitle>
              <DialogDescription className="text-xs">
                This action cannot be undone
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-neutral-700">
            Are you sure you want to revoke{' '}
            <span className="font-semibold text-neutral-900">
              {signer.name}
            </span>
            ?
          </p>

          {affectedVaults.length > 0 && (
            <div className="border border-warning-200 bg-warning-50 p-3">
              <p className="mb-2 text-xs font-semibold text-warning-800">
                Warning: This signer is used in {affectedVaults.length}{' '}
                {affectedVaults.length === 1 ? 'vault' : 'vaults'}
              </p>
              <ul className="space-y-1">
                {affectedVaults.map((vault) => (
                  <li
                    key={vault.id}
                    className="flex items-center justify-between text-xs text-warning-700"
                  >
                    <span>{vault.name}</span>
                    <span className="tabular-nums">
                      {vault.threshold} of {vault.totalSigners} signers
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] text-warning-600">
                Revoking this signer may affect the signing threshold of these
                vaults.
              </p>
            </div>
          )}

          <div className="border border-neutral-200 bg-neutral-50 p-3">
            <h4 className="mb-2 text-xs font-semibold text-neutral-700">
              Signer Details
            </h4>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between">
                <dt className="text-neutral-500">Owner</dt>
                <dd className="text-neutral-900">{signer.owner}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Type</dt>
                <dd className="text-neutral-900 capitalize">{signer.type}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Registered</dt>
                <dd className="text-neutral-900">{signer.registeredAt}</dd>
              </div>
            </dl>
          </div>
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
            type="button"
            onClick={handleRevoke}
            className={cn(
              'h-8 rounded-none px-4 text-xs text-white',
              'bg-negative-600 hover:bg-negative-700'
            )}
          >
            Revoke Signer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
