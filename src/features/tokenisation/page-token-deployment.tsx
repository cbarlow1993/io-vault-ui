import { useNavigate } from '@tanstack/react-router';
import {
  AlertCircleIcon,
  CheckIcon,
  ChevronRightIcon,
  InfoIcon,
  RocketIcon,
} from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';

import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
} from '@/layout/shell';

import { CHAIN_OPTIONS, TOKEN_STANDARD_OPTIONS } from './data/mock-data';
import type { TokenStandard } from './schema';

type DeploymentStep = 'config' | 'features' | 'review';

const STEPS: { id: DeploymentStep; label: string; number: number }[] = [
  { id: 'config', label: 'Token Configuration', number: 1 },
  { id: 'features', label: 'Token Features', number: 2 },
  { id: 'review', label: 'Review & Deploy', number: 3 },
];

export const PageTokenDeployment = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<DeploymentStep>('config');

  // Form state
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [standard, setStandard] = useState<TokenStandard>('ERC-20');
  const [chainId, setChainId] = useState('1');
  const [decimals, setDecimals] = useState('18');
  const [initialSupply, setInitialSupply] = useState('');

  // Features
  const [isMintable, setIsMintable] = useState(true);
  const [isBurnable, setIsBurnable] = useState(true);
  const [isPausable, setIsPausable] = useState(true);
  const [hasWhitelist, setHasWhitelist] = useState(false);
  const [hasBlocklist, setHasBlocklist] = useState(true);

  const [isDeploying, setIsDeploying] = useState(false);

  const handleDeploy = async () => {
    setIsDeploying(true);
    // Simulate deployment
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsDeploying(false);
    navigate({ to: '/tokenisation/deployment' });
  };

  const canProceedToFeatures = name && symbol && standard && chainId;
  const canProceedToReview = canProceedToFeatures;

  const selectedChain = CHAIN_OPTIONS.find((c) => c.id === chainId);

  return (
    <PageLayout>
      <PageLayoutTopBar
        title="Deploy Token"
        breadcrumbs={[
          { label: 'Tokens', href: '/tokenisation/deployment' },
          { label: 'Deploy' },
        ]}
      />
      <PageLayoutContent containerClassName="py-6">
        <div className="mx-auto max-w-3xl">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => {
                const isActive = step.id === currentStep;
                const isCompleted =
                  STEPS.findIndex((s) => s.id === currentStep) > index;

                return (
                  <div key={step.id} className="flex flex-1 items-center">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex size-8 items-center justify-center text-sm font-semibold',
                          isCompleted && 'bg-terminal-500 text-white',
                          isActive &&
                            !isCompleted &&
                            'bg-terminal-100 text-terminal-700 ring-2 ring-terminal-500',
                          !isCompleted &&
                            !isActive &&
                            'bg-neutral-100 text-neutral-400'
                        )}
                      >
                        {isCompleted ? (
                          <CheckIcon className="size-4" />
                        ) : (
                          step.number
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-sm font-medium',
                          isActive ? 'text-neutral-900' : 'text-neutral-400'
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div
                        className={cn(
                          'mx-4 h-px flex-1',
                          isCompleted ? 'bg-terminal-500' : 'bg-neutral-200'
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step Content */}
          <div className="border border-neutral-200 bg-white">
            {/* Step 1: Token Configuration */}
            {currentStep === 'config' && (
              <div>
                <div className="border-b border-neutral-200 px-6 py-4">
                  <h2 className="text-base font-semibold text-neutral-900">
                    Token Configuration
                  </h2>
                  <p className="mt-1 text-xs text-neutral-500">
                    Define the basic properties of your token
                  </p>
                </div>

                <div className="space-y-6 p-6">
                  {/* Token Standard Selection */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-neutral-700">
                      Token Standard
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {TOKEN_STANDARD_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() =>
                            setStandard(option.id as TokenStandard)
                          }
                          className={cn(
                            'flex flex-col items-start border p-4 text-left transition-all',
                            standard === option.id
                              ? 'border-terminal-500 bg-terminal-50 ring-1 ring-terminal-500'
                              : 'border-neutral-200 hover:border-neutral-300'
                          )}
                        >
                          <span className="text-sm font-semibold text-neutral-900">
                            {option.label}
                          </span>
                          <span className="mt-1 text-xs text-neutral-500">
                            {option.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Name & Symbol */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                        Token Name <span className="text-negative-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., My Token"
                        className="h-10 w-full border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-terminal-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                        Symbol <span className="text-negative-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={symbol}
                        onChange={(e) =>
                          setSymbol(e.target.value.toUpperCase())
                        }
                        placeholder="e.g., MTK"
                        maxLength={11}
                        className="h-10 w-full border border-neutral-200 bg-neutral-50 px-3 font-mono text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-terminal-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Chain Selection */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                      Blockchain Network{' '}
                      <span className="text-negative-500">*</span>
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {CHAIN_OPTIONS.map((chain) => (
                        <button
                          key={chain.id}
                          type="button"
                          onClick={() => setChainId(chain.id)}
                          className={cn(
                            'flex flex-col items-center gap-1 border p-3 transition-all',
                            chainId === chain.id
                              ? 'border-terminal-500 bg-terminal-50'
                              : 'border-neutral-200 hover:border-neutral-300'
                          )}
                        >
                          <span className="text-lg">{chain.icon}</span>
                          <span className="text-[10px] font-medium text-neutral-700">
                            {chain.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Decimals & Initial Supply */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                        Decimals
                      </label>
                      <input
                        type="number"
                        value={decimals}
                        onChange={(e) => setDecimals(e.target.value)}
                        min={0}
                        max={18}
                        className="h-10 w-full border border-neutral-200 bg-neutral-50 px-3 font-mono text-sm text-neutral-900 focus:border-terminal-400 focus:outline-none"
                      />
                      <p className="mt-1 text-[10px] text-neutral-400">
                        Standard is 18 for fungible tokens
                      </p>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                        Initial Supply (optional)
                      </label>
                      <input
                        type="text"
                        value={initialSupply}
                        onChange={(e) => setInitialSupply(e.target.value)}
                        placeholder="0"
                        className="h-10 w-full border border-neutral-200 bg-neutral-50 px-3 font-mono text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-terminal-400 focus:outline-none"
                      />
                      <p className="mt-1 text-[10px] text-neutral-400">
                        Tokens to mint on deployment
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end border-t border-neutral-200 px-6 py-4">
                  <Button
                    onClick={() => setCurrentStep('features')}
                    disabled={!canProceedToFeatures}
                    className="h-9 rounded-none bg-terminal-500 px-4 text-sm hover:bg-terminal-600"
                  >
                    Continue
                    <ChevronRightIcon className="ml-1.5 size-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Token Features */}
            {currentStep === 'features' && (
              <div>
                <div className="border-b border-neutral-200 px-6 py-4">
                  <h2 className="text-base font-semibold text-neutral-900">
                    Token Features
                  </h2>
                  <p className="mt-1 text-xs text-neutral-500">
                    Configure the capabilities of your token
                  </p>
                </div>

                <div className="space-y-4 p-6">
                  {/* Feature Toggles */}
                  <FeatureToggle
                    label="Mintable"
                    description="Allow creating new tokens after deployment"
                    checked={isMintable}
                    onChange={setIsMintable}
                  />
                  <FeatureToggle
                    label="Burnable"
                    description="Allow destroying tokens to reduce supply"
                    checked={isBurnable}
                    onChange={setIsBurnable}
                  />
                  <FeatureToggle
                    label="Pausable"
                    description="Allow pausing all token transfers"
                    checked={isPausable}
                    onChange={setIsPausable}
                  />
                  <FeatureToggle
                    label="Whitelist"
                    description="Restrict transfers to whitelisted addresses only"
                    checked={hasWhitelist}
                    onChange={setHasWhitelist}
                    highlight
                  />
                  <FeatureToggle
                    label="Blocklist"
                    description="Prevent specific addresses from transferring tokens"
                    checked={hasBlocklist}
                    onChange={setHasBlocklist}
                  />

                  {/* Info Banner */}
                  {hasWhitelist && (
                    <div className="flex items-start gap-2 bg-terminal-50 p-3">
                      <InfoIcon className="mt-0.5 size-4 shrink-0 text-terminal-500" />
                      <p className="text-xs text-terminal-700">
                        <strong>Whitelist enabled:</strong> Only addresses you
                        explicitly whitelist will be able to receive this token.
                        This is commonly used for security tokens with KYC
                        requirements.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-between border-t border-neutral-200 px-6 py-4">
                  <Button
                    variant="secondary"
                    onClick={() => setCurrentStep('config')}
                    className="h-9 rounded-none text-sm"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setCurrentStep('review')}
                    disabled={!canProceedToReview}
                    className="h-9 rounded-none bg-terminal-500 px-4 text-sm hover:bg-terminal-600"
                  >
                    Continue
                    <ChevronRightIcon className="ml-1.5 size-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Review & Deploy */}
            {currentStep === 'review' && (
              <div>
                <div className="border-b border-neutral-200 px-6 py-4">
                  <h2 className="text-base font-semibold text-neutral-900">
                    Review & Deploy
                  </h2>
                  <p className="mt-1 text-xs text-neutral-500">
                    Confirm your token configuration before deployment
                  </p>
                </div>

                <div className="p-6">
                  {/* Token Preview */}
                  <div className="mb-6 flex items-center gap-4 bg-neutral-50 p-4">
                    <div className="flex size-14 items-center justify-center bg-gradient-to-br from-terminal-400 to-terminal-600 text-lg font-bold text-white shadow-lg">
                      {symbol.slice(0, 2) || 'TK'}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900">
                        {name || 'Token Name'}
                      </h3>
                      <p className="font-mono text-sm text-terminal-600">
                        {symbol || 'SYMBOL'}
                      </p>
                    </div>
                  </div>

                  {/* Configuration Summary */}
                  <div className="mb-6 grid grid-cols-2 gap-4">
                    <div className="border border-neutral-200 p-4">
                      <h4 className="mb-3 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                        Configuration
                      </h4>
                      <dl className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <dt className="text-neutral-500">Standard</dt>
                          <dd className="font-medium text-neutral-900">
                            {standard}
                          </dd>
                        </div>
                        <div className="flex justify-between text-xs">
                          <dt className="text-neutral-500">Network</dt>
                          <dd className="font-medium text-neutral-900">
                            {selectedChain?.label}
                          </dd>
                        </div>
                        <div className="flex justify-between text-xs">
                          <dt className="text-neutral-500">Decimals</dt>
                          <dd className="font-mono font-medium text-neutral-900">
                            {decimals}
                          </dd>
                        </div>
                        <div className="flex justify-between text-xs">
                          <dt className="text-neutral-500">Initial Supply</dt>
                          <dd className="font-mono font-medium text-neutral-900">
                            {initialSupply || '0'}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="border border-neutral-200 p-4">
                      <h4 className="mb-3 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                        Features
                      </h4>
                      <div className="space-y-2">
                        <FeatureStatus label="Mintable" enabled={isMintable} />
                        <FeatureStatus label="Burnable" enabled={isBurnable} />
                        <FeatureStatus label="Pausable" enabled={isPausable} />
                        <FeatureStatus
                          label="Whitelist"
                          enabled={hasWhitelist}
                        />
                        <FeatureStatus
                          label="Blocklist"
                          enabled={hasBlocklist}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="flex items-start gap-2 bg-warning-50 p-3">
                    <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-warning-500" />
                    <div>
                      <p className="text-xs font-medium text-warning-800">
                        This action is irreversible
                      </p>
                      <p className="mt-0.5 text-xs text-warning-700">
                        Once deployed, the token contract cannot be modified.
                        Make sure all settings are correct before proceeding.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between border-t border-neutral-200 px-6 py-4">
                  <Button
                    variant="secondary"
                    onClick={() => setCurrentStep('features')}
                    className="h-9 rounded-none text-sm"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleDeploy}
                    disabled={isDeploying}
                    className="h-9 rounded-none bg-terminal-500 px-6 text-sm hover:bg-terminal-600"
                  >
                    {isDeploying ? (
                      <>
                        <span className="mr-2 size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Deploying...
                      </>
                    ) : (
                      <>
                        <RocketIcon className="mr-1.5 size-4" />
                        Deploy Token
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};

// Feature Toggle Component
function FeatureToggle({
  label,
  description,
  checked,
  onChange,
  highlight,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  highlight?: boolean;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center justify-between border p-4 transition-colors',
        checked && highlight && 'border-terminal-300 bg-terminal-50',
        checked && !highlight && 'border-neutral-300 bg-neutral-50',
        !checked && 'border-neutral-200 hover:border-neutral-300'
      )}
    >
      <div>
        <p className="text-sm font-medium text-neutral-900">{label}</p>
        <p className="text-xs text-neutral-500">{description}</p>
      </div>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <div className="h-6 w-11 rounded-full bg-neutral-200 peer-checked:bg-terminal-500 peer-focus:ring-2 peer-focus:ring-terminal-300" />
        <div className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
      </div>
    </label>
  );
}

// Feature Status Component
function FeatureStatus({
  label,
  enabled,
}: {
  label: string;
  enabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-neutral-500">{label}</span>
      <span
        className={cn(
          'font-medium',
          enabled ? 'text-positive-600' : 'text-neutral-400'
        )}
      >
        {enabled ? 'Enabled' : 'Disabled'}
      </span>
    </div>
  );
}
