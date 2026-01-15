import {
  ArrowLeftIcon,
  CloudIcon,
  ExternalLinkIcon,
  SmartphoneIcon,
} from 'lucide-react';
import { useState } from 'react';
import QRCode from 'react-qr-code';

import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type SignerTypeOption = 'ios' | 'android' | 'virtual';

const APP_STORE_URL = 'https://apps.apple.com/app/io-vault/id1234567890';
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.iofinnet.vault';
const DOCS_URL = 'https://docs.iofinnet.com/virtual-signer';

type SignerOption = {
  id: SignerTypeOption;
  title: string;
  description: string;
  icon: React.ReactNode;
};

const SIGNER_OPTIONS: SignerOption[] = [
  {
    id: 'ios',
    title: 'iOS',
    description: 'Use your iPhone or iPad as a signer',
    icon: <SmartphoneIcon className="size-5" />,
  },
  {
    id: 'android',
    title: 'Android',
    description: 'Use your Android device as a signer',
    icon: <SmartphoneIcon className="size-5" />,
  },
  {
    id: 'virtual',
    title: 'Virtual',
    description: 'Deploy a cloud-hosted virtual signer',
    icon: <CloudIcon className="size-5" />,
  },
];

const IOSInstructions = () => {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-neutral-600">
          Download the IO Vault app from the App Store and follow the in-app
          instructions to register your device.
        </p>
      </div>

      {/* QR Code */}
      <div className="flex justify-center">
        <div className="border border-neutral-200 bg-white p-4">
          <QRCode
            value={APP_STORE_URL}
            size={160}
            level="M"
            bgColor="#ffffff"
            fgColor="#171717"
          />
        </div>
      </div>

      <p className="text-center text-xs text-neutral-500">
        Scan with your iPhone camera to download
      </p>

      {/* Direct Link */}
      <div className="flex justify-center">
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ExternalLinkIcon className="size-4" />
          Open in App Store
        </a>
      </div>

      {/* Steps */}
      <div className="border-t border-neutral-200 pt-4">
        <h4 className="mb-3 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
          Setup Steps
        </h4>
        <ol className="space-y-2 text-sm text-neutral-600">
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center bg-neutral-100 text-xs font-medium text-neutral-600">
              1
            </span>
            <span>Download and install IO Vault from the App Store</span>
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center bg-neutral-100 text-xs font-medium text-neutral-600">
              2
            </span>
            <span>Open the app and select "Register as Signer"</span>
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center bg-neutral-100 text-xs font-medium text-neutral-600">
              3
            </span>
            <span>Scan the organization QR code when prompted</span>
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center bg-neutral-100 text-xs font-medium text-neutral-600">
              4
            </span>
            <span>Complete biometric setup and name your device</span>
          </li>
        </ol>
      </div>
    </div>
  );
};

const AndroidInstructions = () => {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-neutral-600">
          Download the IO Vault app from Google Play and follow the in-app
          instructions to register your device.
        </p>
      </div>

      {/* QR Code */}
      <div className="flex justify-center">
        <div className="border border-neutral-200 bg-white p-4">
          <QRCode
            value={PLAY_STORE_URL}
            size={160}
            level="M"
            bgColor="#ffffff"
            fgColor="#171717"
          />
        </div>
      </div>

      <p className="text-center text-xs text-neutral-500">
        Scan with your Android camera to download
      </p>

      {/* Direct Link */}
      <div className="flex justify-center">
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ExternalLinkIcon className="size-4" />
          Open in Google Play
        </a>
      </div>

      {/* Steps */}
      <div className="border-t border-neutral-200 pt-4">
        <h4 className="mb-3 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
          Setup Steps
        </h4>
        <ol className="space-y-2 text-sm text-neutral-600">
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center bg-neutral-100 text-xs font-medium text-neutral-600">
              1
            </span>
            <span>Download and install IO Vault from Google Play</span>
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center bg-neutral-100 text-xs font-medium text-neutral-600">
              2
            </span>
            <span>Open the app and select "Register as Signer"</span>
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center bg-neutral-100 text-xs font-medium text-neutral-600">
              3
            </span>
            <span>Scan the organization QR code when prompted</span>
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center bg-neutral-100 text-xs font-medium text-neutral-600">
              4
            </span>
            <span>Complete biometric setup and name your device</span>
          </li>
        </ol>
      </div>
    </div>
  );
};

const VirtualInstructions = () => {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-neutral-600">
          Deploy a cloud-hosted virtual signer for automated signing workflows.
          Ideal for server-side integrations and HSM configurations.
        </p>
      </div>

      {/* Info Box */}
      <div className="border border-brand-200 bg-brand-50 p-4">
        <h4 className="mb-2 text-sm font-semibold text-brand-900">
          Virtual Signer Features
        </h4>
        <ul className="space-y-1 text-sm text-brand-800">
          <li>• Hardware Security Module (HSM) integration</li>
          <li>• 24/7 automated signing capabilities</li>
          <li>• API-driven transaction approvals</li>
          <li>• Enterprise-grade security standards</li>
        </ul>
      </div>

      {/* Direct Link */}
      <div className="flex justify-center">
        <a
          href={DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ExternalLinkIcon className="size-4" />
          View Documentation
        </a>
      </div>

      {/* Steps */}
      <div className="border-t border-neutral-200 pt-4">
        <h4 className="mb-3 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
          Setup Steps
        </h4>
        <ol className="space-y-2 text-sm text-neutral-600">
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center bg-neutral-100 text-xs font-medium text-neutral-600">
              1
            </span>
            <span>Review the virtual signer documentation</span>
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center bg-neutral-100 text-xs font-medium text-neutral-600">
              2
            </span>
            <span>Configure your cloud environment (AWS/GCP/Azure)</span>
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center bg-neutral-100 text-xs font-medium text-neutral-600">
              3
            </span>
            <span>Deploy the virtual signer container</span>
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center bg-neutral-100 text-xs font-medium text-neutral-600">
              4
            </span>
            <span>Register with your organization using the API</span>
          </li>
        </ol>
      </div>

      {/* Code snippet */}
      <div className="border-t border-neutral-200 pt-4">
        <h4 className="mb-3 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
          Quick Start
        </h4>
        <pre className="overflow-x-auto rounded-none bg-neutral-900 p-3 text-xs text-neutral-100">
          <code>{`docker pull iofinnet/virtual-signer:latest
docker run -d \\
  -e ORG_ID=your-org-id \\
  -e API_KEY=your-api-key \\
  iofinnet/virtual-signer:latest`}</code>
        </pre>
      </div>
    </div>
  );
};

type NewSignerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const NewSignerModal = ({ open, onOpenChange }: NewSignerModalProps) => {
  const [selectedType, setSelectedType] = useState<SignerTypeOption | null>(
    null
  );

  const handleClose = () => {
    setSelectedType(null);
    onOpenChange(false);
  };

  const handleBack = () => {
    setSelectedType(null);
  };

  const renderContent = () => {
    if (selectedType === 'ios') {
      return <IOSInstructions />;
    }
    if (selectedType === 'android') {
      return <AndroidInstructions />;
    }
    if (selectedType === 'virtual') {
      return <VirtualInstructions />;
    }

    // Type selection view
    return (
      <div className="space-y-3">
        {SIGNER_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setSelectedType(option.id)}
            className={cn(
              'flex w-full items-center gap-4 border border-neutral-200 bg-white p-4 text-left transition-colors hover:border-brand-300 hover:bg-brand-50'
            )}
          >
            <div className="flex size-10 shrink-0 items-center justify-center bg-neutral-100 text-neutral-600">
              {option.icon}
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-neutral-900">
                {option.title}
              </h4>
              <p className="text-xs text-neutral-500">{option.description}</p>
            </div>
          </button>
        ))}
      </div>
    );
  };

  const getTitle = () => {
    if (selectedType === 'ios') return 'iOS Signer Setup';
    if (selectedType === 'android') return 'Android Signer Setup';
    if (selectedType === 'virtual') return 'Virtual Signer Setup';
    return 'Choose Signer Type';
  };

  const getDescription = () => {
    if (selectedType)
      return 'Follow the instructions below to register your signer';
    return 'Select the type of signer you want to register';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md rounded-none sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {selectedType && (
              <button
                type="button"
                onClick={handleBack}
                className="flex size-8 items-center justify-center text-neutral-400 hover:text-neutral-600"
              >
                <ArrowLeftIcon className="size-4" />
              </button>
            )}
            <div>
              <DialogTitle className="text-base">{getTitle()}</DialogTitle>
              <DialogDescription className="text-xs">
                {getDescription()}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-2">{renderContent()}</div>

        {selectedType && (
          <div className="mt-4 flex justify-end border-t border-neutral-200 pt-4">
            <Button
              variant="secondary"
              onClick={handleClose}
              className="h-8 rounded-none border-neutral-200 px-4 text-xs"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
