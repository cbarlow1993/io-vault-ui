import {
  CheckCircleIcon,
  CopyIcon,
  GlobeIcon,
  KeyIcon,
  NetworkIcon,
  RefreshCwIcon,
  SettingsIcon,
  ShieldIcon,
  XCircleIcon,
} from 'lucide-react';
import { useState } from 'react';

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

import type { RegisteredSigner } from '../data/signers';

type SignerConfigModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signer: RegisteredSigner | null;
};

const ConfigItem = ({
  label,
  value,
  icon: Icon,
  copyable = false,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  copyable?: boolean;
  mono?: boolean;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof value === 'string') {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        {Icon && <Icon className="size-3.5 shrink-0" />}
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'text-right text-xs text-neutral-900',
            mono && 'font-mono'
          )}
        >
          {value}
        </span>
        {copyable && typeof value === 'string' && (
          <button
            type="button"
            onClick={handleCopy}
            className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            {copied ? (
              <CheckCircleIcon className="size-3 text-positive-600" />
            ) : (
              <CopyIcon className="size-3" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};

const BooleanBadge = ({ value }: { value: boolean }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium',
      value
        ? 'bg-positive-100 text-positive-700'
        : 'bg-neutral-100 text-neutral-500'
    )}
  >
    {value ? (
      <CheckCircleIcon className="size-3" />
    ) : (
      <XCircleIcon className="size-3" />
    )}
    {value ? 'Enabled' : 'Disabled'}
  </span>
);

export const SignerConfigModal = ({
  open,
  onOpenChange,
  signer,
}: SignerConfigModalProps) => {
  if (!signer) return null;

  const { config } = signer;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-none sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center bg-neutral-100">
              <SettingsIcon className="size-5 text-neutral-600" />
            </div>
            <div>
              <DialogTitle className="text-base">{signer.name}</DialogTitle>
              <DialogDescription className="text-xs">
                Signer configuration and settings
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          {/* Public Key Section */}
          <div className="border-b border-neutral-100 py-3">
            <h4 className="mb-2 flex items-center gap-2 text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
              <KeyIcon className="size-3" />
              Public Key
            </h4>
            <div className="flex items-center gap-2 bg-neutral-50 p-2">
              <code className="flex-1 truncate font-mono text-[11px] text-neutral-700">
                {config.publicKey}
              </code>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(config.publicKey)}
                className="rounded p-1 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-600"
              >
                <CopyIcon className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Cryptography Section */}
          <div className="border-b border-neutral-100 py-3">
            <h4 className="mb-2 flex items-center gap-2 text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
              <ShieldIcon className="size-3" />
              Cryptography
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {config.supportedCurves.map((curve) => (
                <span
                  key={curve}
                  className="inline-block border border-brand-200 bg-brand-50 px-2 py-0.5 font-mono text-[10px] font-medium text-brand-700"
                >
                  {curve}
                </span>
              ))}
            </div>
          </div>

          {/* Networks Section */}
          <div className="border-b border-neutral-100 py-3">
            <h4 className="mb-2 flex items-center gap-2 text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
              <NetworkIcon className="size-3" />
              Allowed Networks
            </h4>
            {config.allowedNetworks.length === 0 ? (
              <p className="text-xs text-neutral-400 italic">
                No networks configured
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {config.allowedNetworks.map((network) => (
                  <span
                    key={network}
                    className="inline-block bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-700 capitalize"
                  >
                    {network}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* API Endpoint (if virtual) */}
          {config.apiEndpoint && (
            <div className="border-b border-neutral-100 py-3">
              <h4 className="mb-2 flex items-center gap-2 text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
                <GlobeIcon className="size-3" />
                API Endpoint
              </h4>
              <div className="flex items-center gap-2 bg-neutral-50 p-2">
                <code className="flex-1 truncate font-mono text-[11px] text-neutral-700">
                  {config.apiEndpoint}
                </code>
                <button
                  type="button"
                  onClick={() =>
                    navigator.clipboard.writeText(config.apiEndpoint!)
                  }
                  className="rounded p-1 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-600"
                >
                  <CopyIcon className="size-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Settings Section */}
          <div className="border-b border-neutral-100 py-3">
            <h4 className="mb-2 flex items-center gap-2 text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
              <SettingsIcon className="size-3" />
              Settings
            </h4>
            <div className="divide-y divide-neutral-50">
              <ConfigItem
                label="Auto Approve"
                value={<BooleanBadge value={config.autoApprove} />}
              />
              <ConfigItem
                label="Notifications"
                value={<BooleanBadge value={config.notificationsEnabled} />}
              />
              <ConfigItem
                label="Backup"
                value={<BooleanBadge value={config.backupEnabled} />}
              />
              {config.maxDailySignatures !== undefined && (
                <ConfigItem
                  label="Max Daily Signatures"
                  value={config.maxDailySignatures.toLocaleString()}
                  mono
                />
              )}
            </div>
          </div>

          {/* Sync Info */}
          <div className="py-3">
            <h4 className="mb-2 flex items-center gap-2 text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
              <RefreshCwIcon className="size-3" />
              Sync Status
            </h4>
            <ConfigItem label="Last Sync" value={config.lastSyncAt} mono />
          </div>
        </div>

        <DialogFooter className="border-t border-neutral-200 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            className="h-8 rounded-none border-neutral-200 px-4 text-xs"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
