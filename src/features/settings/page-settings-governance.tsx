import { Link } from '@tanstack/react-router';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  MinusIcon,
  PlusIcon,
  ShieldCheckIcon,
  UsersIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { formatDateTime } from '@/lib/date/format';
import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';

import { getStatusIcon } from '@/features/shared/lib/status-icons';
import { getStatusStyles } from '@/features/shared/lib/status-styles';

import { SettingsLayout } from './components/settings-layout';
import {
  availableGovernedActions,
  getGovernanceVoters,
  type GovernanceActionCategory,
  governanceCategoryLabels,
  governanceConfig,
  governanceRequests,
  type GovernedAction,
} from './data/settings';

// Initial values for change detection
const initialEnabled = governanceConfig.enabled;
const initialThreshold = governanceConfig.threshold;
const initialGovernedActions = availableGovernedActions;

export const PageSettingsGovernance = () => {
  const voters = getGovernanceVoters();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [threshold, setThreshold] = useState(initialThreshold);
  const [expandedCategories, setExpandedCategories] = useState<
    GovernanceActionCategory[]
  >(['members', 'workspaces', 'security']);
  const [governedActions, setGovernedActions] = useState<GovernedAction[]>(
    initialGovernedActions
  );

  // Check if any changes have been made
  const hasChanges = useMemo(() => {
    if (enabled !== initialEnabled) return true;
    if (threshold !== initialThreshold) return true;

    // Check if any action's enabled state has changed
    return governedActions.some((action) => {
      const initial = initialGovernedActions.find((a) => a.id === action.id);
      return initial && action.enabled !== initial.enabled;
    });
  }, [enabled, threshold, governedActions]);

  const handleCancel = () => {
    setEnabled(initialEnabled);
    setThreshold(initialThreshold);
    setGovernedActions(initialGovernedActions);
    toast.info('Changes discarded');
  };

  // Recent activity - last 5 requests
  const recentActivity = governanceRequests.slice(0, 5);

  const toggleCategory = (category: GovernanceActionCategory) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const toggleAction = (actionId: string) => {
    setGovernedActions((prev) =>
      prev.map((action) =>
        action.id === actionId
          ? { ...action, enabled: !action.enabled }
          : action
      )
    );
  };

  const getActionsByCategory = (category: GovernanceActionCategory) => {
    return governedActions.filter((a) => a.category === category);
  };

  const getEnabledCount = (category: GovernanceActionCategory) => {
    return governedActions.filter((a) => a.category === category && a.enabled)
      .length;
  };

  const handleSave = () => {
    // In a real app, this would need quorum approval if governance is already enabled
    if (governanceConfig.enabled) {
      toast.info('Changes require quorum approval', {
        description: 'A governance request has been created for these changes',
      });
    } else {
      toast.success('Governance settings saved');
    }
  };

  const categories: GovernanceActionCategory[] = [
    'members',
    'workspaces',
    'security',
  ];

  return (
    <SettingsLayout
      title="Governance"
      description="Configure approval requirements for sensitive actions"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleCancel}
            className={cn(
              'h-8 rounded-none px-4 text-xs font-medium transition-all',
              hasChanges
                ? 'border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                : 'cursor-not-allowed border-transparent text-neutral-400 opacity-50'
            )}
            disabled={!hasChanges}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="h-8 rounded-none bg-brand-500 px-4 text-xs font-medium text-white hover:bg-brand-600"
          >
            Save Changes
          </Button>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Enable/Disable Governance */}
        <div className="border border-neutral-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-full bg-brand-50">
                <ShieldCheckIcon className="size-5 text-brand-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">
                  Governance Approval
                </h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Require approval from multiple admins for sensitive actions
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={cn(
                'relative h-6 w-11 rounded-full transition-colors',
                enabled ? 'bg-brand-500' : 'bg-neutral-200'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform',
                  enabled && 'translate-x-5'
                )}
              />
            </button>
          </div>
        </div>

        {enabled && (
          <>
            {/* Threshold Configuration */}
            <div className="border border-neutral-200">
              <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
                <h2 className="text-sm font-semibold text-neutral-900">
                  Approval Threshold
                </h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Set the minimum number of approvals required
                </p>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setThreshold((t) => Math.max(1, t - 1))}
                      disabled={threshold <= 1}
                      className={cn(
                        'flex size-8 items-center justify-center border border-neutral-200',
                        threshold <= 1
                          ? 'cursor-not-allowed bg-neutral-50 text-neutral-300'
                          : 'bg-white text-neutral-600 hover:bg-neutral-50'
                      )}
                    >
                      <MinusIcon className="size-4" />
                    </button>
                    <span className="inline-flex h-8 min-w-12 items-center justify-center border-y border-neutral-200 bg-neutral-50 px-3 font-mono text-sm font-semibold text-neutral-900 tabular-nums">
                      {threshold}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setThreshold((t) => Math.min(voters.length, t + 1))
                      }
                      disabled={threshold >= voters.length}
                      className={cn(
                        'flex size-8 items-center justify-center border border-neutral-200',
                        threshold >= voters.length
                          ? 'cursor-not-allowed bg-neutral-50 text-neutral-300'
                          : 'bg-white text-neutral-600 hover:bg-neutral-50'
                      )}
                    >
                      <PlusIcon className="size-4" />
                    </button>
                  </div>
                  <span className="text-sm text-neutral-600">of</span>
                  <span className="text-sm font-semibold text-neutral-900">
                    {voters.length}
                  </span>
                  <span className="text-sm text-neutral-600">
                    admins/owners must approve
                  </span>
                </div>

                {/* Voters List */}
                <div className="mt-6">
                  <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
                    <UsersIcon className="size-3.5" />
                    Eligible Voters ({voters.length})
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {voters.map((voter) => (
                      <div
                        key={voter.id}
                        className="flex items-center gap-2 rounded-none border border-neutral-200 bg-white px-3 py-1.5"
                      >
                        <div className="flex size-5 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-medium text-neutral-600">
                          {voter.name.charAt(0)}
                        </div>
                        <span className="text-xs font-medium text-neutral-700">
                          {voter.name}
                        </span>
                        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 capitalize">
                          {voter.platformRole}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Governed Actions by Category */}
            <div className="border border-neutral-200">
              <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
                <h2 className="text-sm font-semibold text-neutral-900">
                  Governed Actions
                </h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Select which actions require multi-party approval
                </p>
              </div>
              <div className="divide-y divide-neutral-100">
                {categories.map((category) => {
                  const actions = getActionsByCategory(category);
                  const enabledCount = getEnabledCount(category);
                  const isExpanded = expandedCategories.includes(category);

                  return (
                    <div key={category}>
                      {/* Category Header */}
                      <button
                        type="button"
                        onClick={() => toggleCategory(category)}
                        className="flex w-full items-center justify-between px-6 py-4 hover:bg-neutral-50"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDownIcon className="size-4 text-neutral-400" />
                          ) : (
                            <ChevronRightIcon className="size-4 text-neutral-400" />
                          )}
                          <span className="text-sm font-medium text-neutral-900">
                            {governanceCategoryLabels[category]}
                          </span>
                        </div>
                        <span className="text-xs text-neutral-500">
                          {enabledCount} of {actions.length} enabled
                        </span>
                      </button>

                      {/* Category Actions */}
                      {isExpanded && (
                        <div className="border-t border-neutral-100 bg-neutral-50/50">
                          {actions.map((action) => (
                            <div
                              key={action.id}
                              className="flex items-center justify-between border-b border-neutral-100 px-6 py-3 last:border-b-0"
                            >
                              <div className="pl-7">
                                <p className="text-sm font-medium text-neutral-800">
                                  {action.name}
                                </p>
                                <p className="mt-0.5 text-xs text-neutral-500">
                                  {action.description}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleAction(action.id)}
                                className={cn(
                                  'relative h-5 w-9 rounded-full transition-colors',
                                  action.enabled
                                    ? 'bg-brand-500'
                                    : 'bg-neutral-200'
                                )}
                              >
                                <span
                                  className={cn(
                                    'absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform',
                                    action.enabled && 'translate-x-4'
                                  )}
                                />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="border border-neutral-200">
              <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-6 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-neutral-900">
                    Recent Activity
                  </h2>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Latest governance decisions
                  </p>
                </div>
                <Link
                  to="/global/governance/pending"
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  View all →
                </Link>
              </div>
              <div className="divide-y divide-neutral-100">
                {recentActivity.length === 0 ? (
                  <div className="px-6 py-8 text-center">
                    <p className="text-sm text-neutral-500">
                      No governance activity yet
                    </p>
                  </div>
                ) : (
                  recentActivity.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between px-6 py-4"
                    >
                      <div className="flex items-center gap-4">
                        {getStatusIcon(request.status)}
                        <div>
                          <p className="text-sm font-medium text-neutral-900">
                            {request.actionLabel}
                          </p>
                          <p className="mt-0.5 text-xs text-neutral-500">
                            Requested by {request.requestedByName} •{' '}
                            {formatDateTime(request.requestedAt).full}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span
                            className={cn(
                              'inline-block rounded px-2 py-0.5 text-xs font-medium capitalize',
                              getStatusStyles(request.status)
                            )}
                          >
                            {request.status}
                          </span>
                          {request.status === 'pending' && (
                            <p className="mt-1 text-xs text-neutral-500">
                              {request.votes.length}/{request.threshold} votes
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Info Banner */}
            {governanceConfig.enabled && (
              <div className="flex items-start gap-3 border border-brand-200 bg-brand-50 px-4 py-3">
                <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-brand-600" />
                <p className="text-xs text-brand-700">
                  <span className="font-medium">Note:</span> Since governance is
                  already enabled, any changes to these settings will require
                  approval from {threshold} admin(s) before taking effect.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </SettingsLayout>
  );
};
