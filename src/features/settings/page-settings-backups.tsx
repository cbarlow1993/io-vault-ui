import {
  AlertTriangleIcon,
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  KeyIcon,
  PlusIcon,
  ShieldIcon,
  Trash2Icon,
  UploadIcon,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { formatDateTimeLong } from '@/lib/date/format';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { SettingsLayout } from './components/settings-layout';
import { type EncryptionKey, encryptionKey } from './data/settings';

export const PageSettingsBackups = () => {
  const [currentKey, setCurrentKey] = useState<EncryptionKey | null>(
    encryptionKey
  );
  const [generateOpen, setGenerateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [viewKeyOpen, setViewKeyOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [generateConfirmed, setGenerateConfirmed] = useState(false);
  const [removeConfirmed, setRemoveConfirmed] = useState(false);
  const [importValue, setImportValue] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    // Simulate key generation and download
    const privateKeyContent = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF8PbnGy9...
[Generated Private Key Content]
...AQAB
-----END RSA PRIVATE KEY-----`;

    // Create and trigger download
    const blob = new Blob([privateKeyContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-encryption-private-key.pem';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Set the new public key
    setCurrentKey({
      fingerprint: 'SHA256:' + Math.random().toString(36).substring(2, 34),
      configuredAt: new Date().toISOString(),
      configuredBy: 'Current User',
      publicKey: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
[Generated Public Key]
-----END PUBLIC KEY-----`,
    });

    toast.success('Encryption key generated', {
      description: 'Private key has been downloaded. Store it securely.',
    });
    setGenerateOpen(false);
    setGenerateConfirmed(false);
  };

  const handleImport = () => {
    if (!importValue.trim()) {
      toast.error('Please enter a public key');
      return;
    }

    // Validate key format (basic check)
    if (
      !importValue.includes('-----BEGIN') ||
      !importValue.includes('-----END')
    ) {
      toast.error('Invalid key format', {
        description: 'Please enter a valid PEM-encoded public key',
      });
      return;
    }

    setCurrentKey({
      fingerprint: 'SHA256:' + Math.random().toString(36).substring(2, 34),
      configuredAt: new Date().toISOString(),
      configuredBy: 'Current User',
      publicKey: importValue.trim(),
    });

    toast.success('Encryption key imported');
    setImportOpen(false);
    setImportValue('');
  };

  const handleRemove = () => {
    setCurrentKey(null);
    toast.success('Encryption key removed', {
      description: 'Backups will no longer be encrypted',
    });
    setRemoveOpen(false);
    setRemoveConfirmed(false);
  };

  const handleCopyKey = async () => {
    if (currentKey?.publicKey) {
      await navigator.clipboard.writeText(currentKey.publicKey);
      setCopied(true);
      toast.success('Public key copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <SettingsLayout
      title="Backups"
      description="Configure encryption for backup exports"
    >
      <div className="space-y-8">
        {/* Backup Encryption Section */}
        <div className="border border-neutral-200">
          <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
            <h2 className="text-sm font-semibold text-neutral-900">
              Backup Encryption Key
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              All device backups will be encrypted with this key before export
            </p>
          </div>

          {currentKey ? (
            /* Configured State */
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex size-12 items-center justify-center rounded-full bg-positive-100">
                  <ShieldIcon className="size-6 text-positive-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-neutral-900">
                      Encryption Enabled
                    </h3>
                    <span className="rounded bg-positive-100 px-2 py-0.5 text-xs font-medium text-positive-700">
                      Active
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-500">
                    Backups are encrypted with your organisation's public key
                  </p>

                  {/* Key Details */}
                  <div className="mt-4 space-y-3 rounded border border-neutral-200 bg-neutral-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-neutral-500">
                        Key Fingerprint
                      </span>
                      <code className="font-mono text-xs text-neutral-900">
                        {currentKey.fingerprint}
                      </code>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-neutral-500">
                        Configured
                      </span>
                      <span className="text-xs text-neutral-900">
                        {formatDateTimeLong(currentKey.configuredAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-neutral-500">
                        Configured By
                      </span>
                      <span className="text-xs text-neutral-900">
                        {currentKey.configuredBy}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center gap-3">
                    <Dialog open={viewKeyOpen} onOpenChange={setViewKeyOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="secondary"
                          className="h-8 rounded-none border-neutral-300 px-4 text-xs font-medium"
                        >
                          <KeyIcon className="mr-1.5 size-3.5" />
                          View Full Key
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg rounded-none">
                        <DialogHeader>
                          <DialogTitle className="text-sm font-semibold text-neutral-900">
                            Public Encryption Key
                          </DialogTitle>
                          <DialogDescription className="text-xs text-neutral-500">
                            This public key is used to encrypt backup files
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-4">
                          <div className="relative">
                            <pre className="max-h-64 overflow-auto rounded border border-neutral-200 bg-neutral-50 p-4 font-mono text-xs text-neutral-700">
                              {currentKey.publicKey}
                            </pre>
                            <button
                              type="button"
                              onClick={handleCopyKey}
                              className="absolute top-2 right-2 flex items-center gap-1.5 rounded bg-white px-2 py-1 text-xs font-medium text-neutral-600 shadow-sm hover:bg-neutral-50"
                            >
                              {copied ? (
                                <>
                                  <CheckIcon className="size-3.5 text-positive-600" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <CopyIcon className="size-3.5" />
                                  Copy
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                        <DialogFooter className="mt-6">
                          <DialogClose asChild>
                            <Button
                              variant="secondary"
                              className="h-8 rounded-none border-neutral-300 px-4 text-xs font-medium"
                            >
                              Close
                            </Button>
                          </DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    {/* Generate New Key */}
                    <Dialog
                      open={generateOpen}
                      onOpenChange={(open) => {
                        setGenerateOpen(open);
                        if (!open) setGenerateConfirmed(false);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="secondary"
                          className="h-8 rounded-none border-neutral-300 px-4 text-xs font-medium"
                        >
                          Replace Key
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md rounded-none">
                        <DialogHeader>
                          <DialogTitle className="text-sm font-semibold text-neutral-900">
                            Generate New Encryption Key
                          </DialogTitle>
                          <DialogDescription className="text-xs text-neutral-500">
                            A new key pair will be generated. The private key
                            will be downloaded automatically.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-4 space-y-4">
                          <div className="rounded border border-warning-200 bg-warning-50 p-4">
                            <div className="flex gap-3">
                              <AlertTriangleIcon className="size-5 shrink-0 text-warning-600" />
                              <div className="text-xs text-warning-800">
                                <p className="font-medium">Important</p>
                                <p className="mt-1">
                                  This will replace your existing encryption
                                  key. Backups encrypted with the old key will
                                  require the old private key to decrypt.
                                </p>
                              </div>
                            </div>
                          </div>
                          <label className="flex items-start gap-3">
                            <Checkbox
                              checked={generateConfirmed}
                              onCheckedChange={(checked) =>
                                setGenerateConfirmed(checked === true)
                              }
                              className="mt-0.5"
                            />
                            <span className="text-xs text-neutral-700">
                              I understand that I must securely store the
                              private key and that losing it will make encrypted
                              backups unrecoverable.
                            </span>
                          </label>
                        </div>
                        <DialogFooter className="mt-6">
                          <DialogClose asChild>
                            <Button
                              variant="secondary"
                              className="h-8 rounded-none border-neutral-300 px-4 text-xs font-medium"
                            >
                              Cancel
                            </Button>
                          </DialogClose>
                          <Button
                            onClick={handleGenerate}
                            disabled={!generateConfirmed}
                            className="h-8 rounded-none bg-brand-500 px-4 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                          >
                            <DownloadIcon className="mr-1.5 size-3.5" />
                            Generate & Download
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    {/* Remove Key */}
                    <Dialog
                      open={removeOpen}
                      onOpenChange={(open) => {
                        setRemoveOpen(open);
                        if (!open) setRemoveConfirmed(false);
                      }}
                    >
                      <DialogTrigger asChild>
                        <button
                          type="button"
                          className="flex size-8 items-center justify-center text-neutral-400 hover:bg-neutral-100 hover:text-negative-600"
                        >
                          <Trash2Icon className="size-4" />
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md rounded-none">
                        <DialogHeader>
                          <DialogTitle className="text-sm font-semibold text-neutral-900">
                            Remove Encryption Key
                          </DialogTitle>
                          <DialogDescription className="text-xs text-neutral-500">
                            This will disable backup encryption for your
                            organisation.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-4 space-y-4">
                          <div className="rounded border border-negative-200 bg-negative-50 p-4">
                            <div className="flex gap-3">
                              <AlertTriangleIcon className="size-5 shrink-0 text-negative-600" />
                              <div className="text-xs text-negative-800">
                                <p className="font-medium">Warning</p>
                                <p className="mt-1">
                                  Without an encryption key, backup files will
                                  not be encrypted. Previously encrypted backups
                                  will still require the original private key to
                                  decrypt.
                                </p>
                              </div>
                            </div>
                          </div>
                          <label className="flex items-start gap-3">
                            <Checkbox
                              checked={removeConfirmed}
                              onCheckedChange={(checked) =>
                                setRemoveConfirmed(checked === true)
                              }
                              className="mt-0.5"
                            />
                            <span className="text-xs text-neutral-700">
                              I understand that future backups will not be
                              encrypted.
                            </span>
                          </label>
                        </div>
                        <DialogFooter className="mt-6">
                          <DialogClose asChild>
                            <Button
                              variant="secondary"
                              className="h-8 rounded-none border-neutral-300 px-4 text-xs font-medium"
                            >
                              Cancel
                            </Button>
                          </DialogClose>
                          <Button
                            onClick={handleRemove}
                            disabled={!removeConfirmed}
                            className="h-8 rounded-none bg-negative-600 px-4 text-xs font-medium text-white hover:bg-negative-700 disabled:opacity-50"
                          >
                            Remove Key
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="p-8">
              <div className="mx-auto max-w-md text-center">
                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-neutral-100">
                  <ShieldIcon className="size-8 text-neutral-400" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-neutral-900">
                  No Encryption Key Configured
                </h3>
                <p className="mt-2 text-sm text-neutral-500">
                  Configure an encryption key to secure your backup exports.
                  Devices will encrypt backup files with this key before export.
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  {/* Generate Key */}
                  <Dialog
                    open={generateOpen}
                    onOpenChange={(open) => {
                      setGenerateOpen(open);
                      if (!open) setGenerateConfirmed(false);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button className="h-9 rounded-none bg-brand-500 px-4 text-xs font-medium text-white hover:bg-brand-600">
                        <PlusIcon className="mr-1.5 size-3.5" />
                        Generate Key
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md rounded-none">
                      <DialogHeader>
                        <DialogTitle className="text-sm font-semibold text-neutral-900">
                          Generate Encryption Key
                        </DialogTitle>
                        <DialogDescription className="text-xs text-neutral-500">
                          A new RSA key pair will be generated. The private key
                          will be downloaded automatically.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="mt-4 space-y-4">
                        <div className="rounded border border-neutral-200 bg-neutral-50 p-4">
                          <div className="flex gap-3">
                            <KeyIcon className="size-5 shrink-0 text-neutral-600" />
                            <div className="text-xs text-neutral-700">
                              <p className="font-medium">How it works</p>
                              <ul className="mt-2 list-inside list-disc space-y-1 text-neutral-600">
                                <li>A secure RSA key pair will be generated</li>
                                <li>
                                  The private key will download to your device
                                </li>
                                <li>
                                  The public key will be stored for encrypting
                                  backups
                                </li>
                                <li>
                                  Keep your private key safe to decrypt backups
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                        <label className="flex items-start gap-3">
                          <Checkbox
                            checked={generateConfirmed}
                            onCheckedChange={(checked) =>
                              setGenerateConfirmed(checked === true)
                            }
                            className="mt-0.5"
                          />
                          <span className="text-xs text-neutral-700">
                            I understand that I must securely store the private
                            key and that losing it will make encrypted backups
                            unrecoverable.
                          </span>
                        </label>
                      </div>
                      <DialogFooter className="mt-6">
                        <DialogClose asChild>
                          <Button
                            variant="secondary"
                            className="h-8 rounded-none border-neutral-300 px-4 text-xs font-medium"
                          >
                            Cancel
                          </Button>
                        </DialogClose>
                        <Button
                          onClick={handleGenerate}
                          disabled={!generateConfirmed}
                          className="h-8 rounded-none bg-brand-500 px-4 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                        >
                          <DownloadIcon className="mr-1.5 size-3.5" />
                          Generate & Download
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Import Key */}
                  <Dialog
                    open={importOpen}
                    onOpenChange={(open) => {
                      setImportOpen(open);
                      if (!open) setImportValue('');
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="secondary"
                        className="h-9 rounded-none border-neutral-300 px-4 text-xs font-medium"
                      >
                        <UploadIcon className="mr-1.5 size-3.5" />
                        Import Key
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg rounded-none">
                      <DialogHeader>
                        <DialogTitle className="text-sm font-semibold text-neutral-900">
                          Import Public Key
                        </DialogTitle>
                        <DialogDescription className="text-xs text-neutral-500">
                          Paste your PEM-encoded public key below
                        </DialogDescription>
                      </DialogHeader>
                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="text-xs font-medium text-neutral-700">
                            Public Key
                          </label>
                          <textarea
                            value={importValue}
                            onChange={(
                              e: React.ChangeEvent<HTMLTextAreaElement>
                            ) => setImportValue(e.target.value)}
                            placeholder={`-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...
-----END PUBLIC KEY-----`}
                            className="mt-2 h-48 w-full resize-none rounded-none border border-neutral-200 bg-white px-3 py-2 font-mono text-xs focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
                          />
                        </div>
                        <p className="text-xs text-neutral-500">
                          Only the public key is stored. You are responsible for
                          securely storing the corresponding private key.
                        </p>
                      </div>
                      <DialogFooter className="mt-6">
                        <DialogClose asChild>
                          <Button
                            variant="secondary"
                            className="h-8 rounded-none border-neutral-300 px-4 text-xs font-medium"
                          >
                            Cancel
                          </Button>
                        </DialogClose>
                        <Button
                          onClick={handleImport}
                          disabled={!importValue.trim()}
                          className="h-8 rounded-none bg-brand-500 px-4 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                        >
                          Import Key
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </SettingsLayout>
  );
};
