import { Link } from '@tanstack/react-router';
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleIcon,
  KeyIcon,
  LayoutDashboardIcon,
  SkipForwardIcon,
  VaultIcon,
} from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';

type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
  skippable?: boolean;
  status: 'completed' | 'current' | 'pending' | 'skipped';
};

type OnboardingTier = {
  id: string;
  title: string;
  description: string;
  steps: OnboardingStep[];
  status: 'completed' | 'in_progress' | 'locked';
};

const ONBOARDING_TIERS: OnboardingTier[] = [
  {
    id: 'tier-1',
    title: 'Getting Started',
    description: 'Set up your foundation',
    status: 'in_progress',
    steps: [
      {
        id: 'overview',
        title: 'Visit the dashboard',
        description: 'Take a look around your treasury overview',
        icon: <LayoutDashboardIcon className="size-4" />,
        status: 'completed',
      },
      {
        id: 'register-signer',
        title: 'Register a signer',
        description: 'Connect your signing device for secure transactions',
        icon: <KeyIcon className="size-4" />,
        href: '/signers/new',
        skippable: true,
        status: 'current',
      },
      {
        id: 'create-vault',
        title: 'Create your first vault',
        description: 'Set up a vault to start managing your assets',
        icon: <VaultIcon className="size-4" />,
        href: '/vaults/new',
        status: 'pending',
      },
    ],
  },
  {
    id: 'tier-2',
    title: 'Team Setup',
    description: 'Invite team members and configure security',
    status: 'locked',
    steps: [
      {
        id: 'invite-members',
        title: 'Invite team members',
        description: 'Add colleagues to help manage your treasury',
        icon: <CircleIcon className="size-4" />,
        status: 'pending',
      },
      {
        id: 're-share',
        title: 'Conduct a re-share',
        description: 'Redistribute signing keys among team members',
        icon: <CircleIcon className="size-4" />,
        status: 'pending',
      },
    ],
  },
  {
    id: 'tier-3',
    title: 'Security & Backup',
    description: 'Secure your assets with proper backups',
    status: 'locked',
    steps: [
      {
        id: 'backup',
        title: 'Create backups',
        description: 'Ensure your vault keys are safely backed up',
        icon: <CircleIcon className="size-4" />,
        status: 'pending',
      },
    ],
  },
  {
    id: 'tier-4',
    title: 'Organization',
    description: 'Set up identities and address book',
    status: 'locked',
    steps: [
      {
        id: 'identities',
        title: 'Configure identities',
        description: 'Set up identity verification for compliance',
        icon: <CircleIcon className="size-4" />,
        status: 'pending',
      },
      {
        id: 'address-book',
        title: 'Add addresses',
        description: 'Save frequently used addresses',
        icon: <CircleIcon className="size-4" />,
        status: 'pending',
      },
    ],
  },
  {
    id: 'tier-5',
    title: 'Transactions',
    description: 'Start receiving and sending assets',
    status: 'locked',
    steps: [
      {
        id: 'receive',
        title: 'Receive assets',
        description: 'Generate deposit addresses and receive funds',
        icon: <CircleIcon className="size-4" />,
        status: 'pending',
      },
      {
        id: 'send',
        title: 'Send a transaction',
        description: 'Make your first outgoing transfer',
        icon: <CircleIcon className="size-4" />,
        status: 'pending',
      },
    ],
  },
];

const getStatusIcon = (status: OnboardingStep['status']) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2Icon className="size-5 text-positive-500" />;
    case 'skipped':
      return <SkipForwardIcon className="size-5 text-neutral-400" />;
    case 'current':
      return <CircleIcon className="size-5 fill-brand-100 text-brand-500" />;
    default:
      return <CircleIcon className="size-5 text-neutral-300" />;
  }
};

const getTierProgress = (tier: OnboardingTier) => {
  const completed = tier.steps.filter(
    (s) => s.status === 'completed' || s.status === 'skipped'
  ).length;
  return { completed, total: tier.steps.length };
};

export const OnboardingChecklist = ({
  className,
  defaultExpanded = true,
}: {
  className?: string;
  defaultExpanded?: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [expandedTiers, setExpandedTiers] = useState<string[]>(['tier-1']);

  const toggleTier = (tierId: string) => {
    setExpandedTiers((prev) =>
      prev.includes(tierId)
        ? prev.filter((id) => id !== tierId)
        : [...prev, tierId]
    );
  };

  const totalSteps = ONBOARDING_TIERS.reduce(
    (acc, tier) => acc + tier.steps.length,
    0
  );
  const completedSteps = ONBOARDING_TIERS.reduce(
    (acc, tier) =>
      acc +
      tier.steps.filter(
        (s) => s.status === 'completed' || s.status === 'skipped'
      ).length,
    0
  );
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  return (
    <div className={cn('border border-neutral-200 bg-white', className)}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 hover:bg-neutral-50"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-neutral-900">
            Setup Checklist
          </h3>
          <span className="text-xs text-neutral-500">
            {completedSteps} of {totalSteps} completed
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress bar */}
          <div className="h-1.5 w-24 bg-neutral-100">
            <div
              className="h-full bg-brand-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-medium text-neutral-600">
            {progressPercent}%
          </span>
          <ChevronDownIcon
            className={cn(
              'size-4 text-neutral-400 transition-transform',
              isExpanded && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-neutral-200">
          {ONBOARDING_TIERS.map((tier) => {
            const progress = getTierProgress(tier);
            const isTierExpanded = expandedTiers.includes(tier.id);
            const isLocked = tier.status === 'locked';

            return (
              <div
                key={tier.id}
                className={cn('border-b border-neutral-100 last:border-b-0')}
              >
                {/* Tier Header */}
                <button
                  type="button"
                  onClick={() => !isLocked && toggleTier(tier.id)}
                  disabled={isLocked}
                  className={cn(
                    'flex w-full items-center justify-between px-4 py-2.5',
                    isLocked
                      ? 'cursor-not-allowed opacity-50'
                      : 'hover:bg-neutral-50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {isTierExpanded ? (
                      <ChevronDownIcon className="size-4 text-neutral-400" />
                    ) : (
                      <ChevronRightIcon className="size-4 text-neutral-400" />
                    )}
                    <span className="text-xs font-semibold text-neutral-900">
                      {tier.title}
                    </span>
                    {isLocked && (
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                        Locked
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-neutral-500">
                    {progress.completed}/{progress.total}
                  </span>
                </button>

                {/* Tier Steps */}
                {isTierExpanded && !isLocked && (
                  <div className="space-y-1 px-4 pb-3">
                    {tier.steps.map((step) => (
                      <div
                        key={step.id}
                        className={cn(
                          'flex items-start gap-3 rounded p-2',
                          step.status === 'current' && 'bg-brand-50'
                        )}
                      >
                        <div className="mt-0.5">
                          {getStatusIcon(step.status)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'text-sm font-medium',
                                step.status === 'completed' ||
                                  step.status === 'skipped'
                                  ? 'text-neutral-400 line-through'
                                  : 'text-neutral-900'
                              )}
                            >
                              {step.title}
                            </span>
                            {step.skippable && step.status === 'current' && (
                              <button
                                type="button"
                                className="text-xs text-neutral-500 hover:text-neutral-700"
                              >
                                Skip
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-neutral-500">
                            {step.description}
                          </p>
                          {step.status === 'current' && step.href && (
                            <Link to={step.href}>
                              <Button
                                size="sm"
                                className="mt-2 h-7 rounded-none bg-brand-500 px-3 text-xs font-medium text-white hover:bg-brand-600"
                              >
                                Start
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
