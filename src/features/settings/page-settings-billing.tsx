import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangleIcon,
  CheckIcon,
  CreditCardIcon,
  DownloadIcon,
  Loader2Icon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useChargebee, type ChargebeeCardElement } from '@/lib/chargebee';
import { orpc } from '@/lib/orpc/client';
import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';
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
import { QuotaCard, QuotaCardSkeleton } from '@/components/ui/quota-card';
import { Skeleton } from '@/components/ui/skeleton';

import type {
  Entitlement,
  Invoice,
  ItemPrice,
  PaymentMethod,
  Plan,
  Subscription,
} from '@/features/billing/schema';

import { SettingsLayout } from './components/settings-layout';

const getCardIcon = (_brand?: string) => {
  // In a real app, you'd use brand-specific icons
  return <CreditCardIcon className="size-5 text-neutral-500" />;
};

const formatCurrency = (amount: number, currencyCode: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(amount / 100); // Chargebee amounts are in cents
};

const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getInvoiceStatusStyles = (status: Invoice['status']) => {
  switch (status) {
    case 'paid':
      return 'bg-positive-50 text-positive-700';
    case 'posted':
    case 'payment_due':
      return 'bg-warning-50 text-warning-700';
    case 'pending':
      return 'bg-neutral-100 text-neutral-600';
    case 'not_paid':
    case 'voided':
      return 'bg-negative-50 text-negative-700';
    default:
      return 'bg-neutral-100 text-neutral-600';
  }
};

const getSubscriptionStatusStyles = (status: Subscription['status']) => {
  switch (status) {
    case 'active':
    case 'in_trial':
      return 'bg-positive-50 text-positive-700';
    case 'non_renewing':
      return 'bg-warning-50 text-warning-700';
    case 'paused':
    case 'future':
      return 'bg-neutral-100 text-neutral-600';
    case 'cancelled':
      return 'bg-negative-50 text-negative-700';
    default:
      return 'bg-neutral-100 text-neutral-600';
  }
};

// Skeleton components for loading states
const CurrentPlanSkeleton = () => (
  <div className="border border-neutral-200">
    <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-6 py-4">
      <div>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-1.5 h-3 w-48" />
      </div>
      <Skeleton className="h-8 w-28" />
    </div>
    <div className="p-6">
      <div className="flex items-start gap-4">
        <Skeleton className="size-12 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="mt-2 h-4 w-64" />
          <div className="mt-4">
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const PaymentMethodsSkeleton = () => (
  <div className="border border-neutral-200">
    <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-6 py-4">
      <div>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-1.5 h-3 w-48" />
      </div>
      <Skeleton className="h-8 w-40" />
    </div>
    <div className="divide-y divide-neutral-100">
      {[1, 2].map((i) => (
        <div key={i} className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Skeleton className="size-5" />
            <div>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-1 h-3 w-24" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="size-7" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const InvoicesSkeleton = () => (
  <div className="border border-neutral-200">
    <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-1.5 h-3 w-56" />
    </div>
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs">
          <th className="px-6 py-3">
            <Skeleton className="h-3 w-16" />
          </th>
          <th className="px-6 py-3">
            <Skeleton className="h-3 w-12" />
          </th>
          <th className="px-6 py-3">
            <Skeleton className="h-3 w-16" />
          </th>
          <th className="px-6 py-3">
            <Skeleton className="h-3 w-14" />
          </th>
          <th className="px-6 py-3">
            <Skeleton className="h-3 w-16" />
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-100">
        {[1, 2, 3].map((i) => (
          <tr key={i}>
            <td className="px-6 py-3">
              <Skeleton className="h-4 w-28" />
            </td>
            <td className="px-6 py-3">
              <Skeleton className="h-4 w-24" />
            </td>
            <td className="px-6 py-3">
              <Skeleton className="h-4 w-16" />
            </td>
            <td className="px-6 py-3">
              <Skeleton className="h-4 w-14" />
            </td>
            <td className="px-6 py-3 text-right">
              <Skeleton className="ml-auto h-4 w-10" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const EntitlementsSkeleton = () => (
  <div className="border border-neutral-200">
    <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-1.5 h-3 w-48" />
    </div>
    <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="border border-neutral-100 p-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-2 h-6 w-16" />
          <Skeleton className="mt-1 h-3 w-20" />
        </div>
      ))}
    </div>
  </div>
);

// Quota section skeleton
const QuotaSectionSkeleton = () => (
  <div className="border border-neutral-200">
    <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-1.5 h-3 w-48" />
    </div>
    <div className="grid gap-4 p-6 sm:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <QuotaCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

// Past-due warning banner
const PastDueBanner = () => (
  <div className="flex items-center gap-3 border border-warning-200 bg-warning-50 px-4 py-3">
    <AlertTriangleIcon className="size-5 text-warning-600" />
    <div className="flex-1">
      <p className="text-sm font-medium text-warning-800">Payment Past Due</p>
      <p className="text-xs text-warning-600">
        Your subscription payment is past due. Please update your payment method
        to avoid service interruption.
      </p>
    </div>
  </div>
);

// Add Payment Method Dialog with Chargebee.js
const AddPaymentMethodDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const queryClient = useQueryClient();
  const cardElementRef = useRef<ChargebeeCardElement | null>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const [cardReady, setCardReady] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const {
    isReady: chargebeeReady,
    isEnabled: chargebeeEnabled,
    createCardElement,
    tokenizeElement,
    isTokenizing,
    tokenizeError,
    clearTokenizeError,
  } = useChargebee();

  const addPaymentMethodMutation = useMutation(
    orpc.billing.addPaymentMethod.mutationOptions({
      onSuccess: () => {
        toast.success('Payment method added');
        queryClient.invalidateQueries({
          queryKey: ['billing', 'paymentMethods'],
        });
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to add payment method');
      },
    })
  );

  // Initialize card element when dialog opens
  useEffect(() => {
    if (!open || !chargebeeReady || !cardContainerRef.current) return;

    let mounted = true;

    async function initCard() {
      try {
        console.log('[Chargebee] Creating card element...');
        const element = await createCardElement({
          style: {
            base: {
              color: '#171717',
              fontSize: '14px',
              fontFamily: 'Inter, system-ui, sans-serif',
            },
            invalid: {
              color: '#dc2626',
            },
          },
        });

        if (!mounted || !cardContainerRef.current) return;

        console.log('[Chargebee] Mounting card element to container...');
        element.mount(cardContainerRef.current);
        cardElementRef.current = element;

        element.on('ready', () => {
          console.log('[Chargebee] Card element ready');
          if (mounted) setCardReady(true);
        });

        element.on('change', (data: unknown) => {
          console.log('[Chargebee] Card element change:', data);
          const changeData = data as { error?: { message: string } };
          if (mounted) {
            setCardError(changeData.error?.message || null);
          }
        });

        element.on('focus', () => {
          console.log('[Chargebee] Card element focused');
        });
      } catch (err) {
        console.error('[Chargebee] Failed to initialize card element:', err);
        if (mounted) {
          setCardError('Failed to initialize card form');
        }
      }
    }

    initCard();

    return () => {
      mounted = false;
      if (cardElementRef.current) {
        cardElementRef.current.unmount();
        cardElementRef.current = null;
      }
      setCardReady(false);
      setCardError(null);
    };
  }, [open, chargebeeReady, createCardElement]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearTokenizeError();

    if (!cardElementRef.current) {
      toast.error('Card form not initialized');
      return;
    }

    const result = await tokenizeElement(cardElementRef.current);
    if (result?.token) {
      addPaymentMethodMutation.mutate({ token: result.token });
    }
  };

  const isSubmitting = isTokenizing || addPaymentMethodMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-none">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-neutral-900">
            Add Payment Method
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-500">
            Enter your card details below
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {!chargebeeEnabled ? (
            <div className="rounded border border-warning-200 bg-warning-50 p-4 text-sm text-warning-700">
              Billing is not enabled. Please contact support.
            </div>
          ) : !chargebeeReady ? (
            <div className="flex items-center justify-center py-8">
              <Loader2Icon className="size-6 animate-spin text-neutral-400" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-700">
                  Card Details
                </label>
                <p className="text-xs text-neutral-500">
                  Enter your card number, expiry date, and CVV
                </p>
                <div
                  ref={cardContainerRef}
                  className={cn(
                    'min-h-[100px] rounded-none border px-3 py-3',
                    // Ensure iframe is visible and interactive
                    '[&_iframe]:!block [&_iframe]:!min-h-[40px] [&_iframe]:!w-full',
                    '[&_*]:!pointer-events-auto',
                    cardError ? 'border-negative-500' : 'border-neutral-200'
                  )}
                />
                {!cardReady && chargebeeReady && (
                  <p className="text-xs text-neutral-500">
                    Initializing card form...
                  </p>
                )}
                {cardError && (
                  <p className="text-xs text-negative-600">{cardError}</p>
                )}
                {tokenizeError && (
                  <p className="text-xs text-negative-600">
                    {tokenizeError.message}
                  </p>
                )}
              </div>
            </>
          )}
          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button
                type="button"
                variant="secondary"
                className="h-8 rounded-none border-neutral-300 px-4 text-xs font-medium"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={!cardReady || isSubmitting || !chargebeeEnabled}
              className="h-8 rounded-none bg-brand-500 px-4 text-xs font-medium text-white hover:bg-brand-600"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2Icon className="size-3.5 animate-spin" />
                  Adding...
                </span>
              ) : (
                'Add Card'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Cancel Subscription Dialog
const CancelSubscriptionDialog = ({
  open,
  onOpenChange,
  subscription,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: Subscription;
}) => {
  const queryClient = useQueryClient();

  const cancelMutation = useMutation(
    orpc.billing.cancelSubscription.mutationOptions({
      onSuccess: () => {
        toast.success(
          'Subscription will be cancelled at the end of your billing period'
        );
        queryClient.invalidateQueries({
          queryKey: ['billing', 'subscription'],
        });
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to cancel subscription');
      },
    })
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-none">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-neutral-900">
            Cancel Subscription
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-500">
            Are you sure you want to cancel your subscription?
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div className="rounded border border-warning-200 bg-warning-50 p-4">
            <p className="text-sm text-warning-800">
              Your subscription will remain active until{' '}
              <span className="font-medium">
                {formatDate(subscription.currentTermEnd)}
              </span>
              . After that, you will lose access to premium features.
            </p>
          </div>
        </div>
        <DialogFooter className="mt-6">
          <DialogClose asChild>
            <Button
              type="button"
              variant="secondary"
              className="h-8 rounded-none border-neutral-300 px-4 text-xs font-medium"
            >
              Keep Subscription
            </Button>
          </DialogClose>
          <Button
            onClick={() => cancelMutation.mutate({})}
            disabled={cancelMutation.isPending}
            className="h-8 rounded-none bg-negative-500 px-4 text-xs font-medium text-white hover:bg-negative-600"
          >
            {cancelMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2Icon className="size-3.5 animate-spin" />
                Cancelling...
              </span>
            ) : (
              'Cancel Subscription'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Helper to format period label
const formatPeriodLabel = (period: number, periodUnit: string) => {
  if (period === 1) {
    return periodUnit.charAt(0).toUpperCase() + periodUnit.slice(1) + 'ly';
  }
  return `Every ${period} ${periodUnit}s`;
};

// Change Plan Dialog
const ChangePlanDialog = ({
  open,
  onOpenChange,
  currentPriceId,
  plans,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPriceId?: string;
  plans: Plan[];
}) => {
  const queryClient = useQueryClient();
  // Track selected price ID (item_price_id), not plan ID
  const [selectedPriceId, setSelectedPriceId] = useState<string | undefined>(
    currentPriceId
  );

  useEffect(() => {
    setSelectedPriceId(currentPriceId);
  }, [currentPriceId, open]);

  const updateSubscriptionMutation = useMutation(
    orpc.billing.updateSubscription.mutationOptions({
      onSuccess: (data) => {
        toast.success('Plan updated successfully', {
          description: `You are now on the ${data.planName} plan`,
        });
        queryClient.invalidateQueries({
          queryKey: ['billing', 'subscription'],
        });
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to update plan');
      },
    })
  );

  const handleChangePlan = () => {
    if (selectedPriceId && selectedPriceId !== currentPriceId) {
      updateSubscriptionMutation.mutate({ planId: selectedPriceId });
    }
  };

  // Find selected plan and price
  const selectedPlan = plans.find((p) =>
    p.prices.some((price) => price.id === selectedPriceId)
  );
  const selectedPrice = selectedPlan?.prices.find(
    (p) => p.id === selectedPriceId
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[80vw] max-w-7xl rounded-none p-0 sm:max-w-[80vw]">
        <DialogHeader className="border-b border-neutral-200 px-6 py-4">
          <DialogTitle className="text-sm font-semibold text-neutral-900">
            Choose a Plan
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-500">
            Select the plan and billing period that best fits your needs
          </DialogDescription>
        </DialogHeader>

        {/* Plans Grid - max 4 columns for readability */}
        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const isPlanSelected = plan.prices.some(
              (p) => p.id === selectedPriceId
            );
            const hasCurrentPrice = plan.prices.some(
              (p) => p.id === currentPriceId
            );

            return (
              <div
                key={plan.id}
                className={cn(
                  'relative flex flex-col border bg-white transition-all',
                  isPlanSelected
                    ? 'border-neutral-900 ring-2 ring-neutral-900'
                    : 'border-neutral-200'
                )}
              >
                {/* Badge (e.g., "Most Popular") */}
                {plan.badge && (
                  <span className="absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-0.5 text-[10px] font-semibold text-white">
                    {plan.badge}
                  </span>
                )}

                {/* Plan header */}
                <div className="border-b border-neutral-100 p-5">
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-semibold text-neutral-900">
                      {plan.name}
                    </h3>
                    {hasCurrentPrice && (
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
                        Current
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {plan.description && (
                    <p className="mt-1 text-xs text-neutral-500">
                      {plan.description}
                    </p>
                  )}
                </div>

                {/* Pricing options */}
                <div className="flex-1 p-4">
                  <p className="mb-3 text-[10px] font-medium tracking-wide text-neutral-400 uppercase">
                    Billing Period
                  </p>
                  <div className="space-y-2">
                    {plan.prices.map((price) => {
                      const isSelected = price.id === selectedPriceId;
                      const isCurrent = price.id === currentPriceId;

                      return (
                        <button
                          key={price.id}
                          type="button"
                          onClick={() => setSelectedPriceId(price.id)}
                          className={cn(
                            'flex w-full items-center justify-between border px-4 py-3 text-left transition-all',
                            isSelected
                              ? 'border-neutral-900 bg-neutral-50'
                              : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'flex size-4 items-center justify-center rounded-full border-2',
                                isSelected
                                  ? 'border-neutral-900 bg-neutral-900'
                                  : 'border-neutral-300'
                              )}
                            >
                              {isSelected && (
                                <div className="size-1.5 rounded-full bg-white" />
                              )}
                            </div>
                            <div>
                              <span className="text-sm font-medium text-neutral-900">
                                {formatPeriodLabel(
                                  price.period,
                                  price.periodUnit
                                )}
                              </span>
                              {isCurrent && (
                                <span className="ml-2 rounded bg-positive-50 px-1.5 py-0.5 text-[10px] font-medium text-positive-700">
                                  Current
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold text-neutral-900 tabular-nums">
                              {formatCurrency(price.price, price.currencyCode)}
                            </span>
                            <span className="text-xs text-neutral-500">
                              /{price.period === 1 ? '' : price.period + ' '}
                              {price.periodUnit}
                              {price.period > 1 ? 's' : ''}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Features list */}
                {plan.features && plan.features.length > 0 && (
                  <div className="border-t border-neutral-100 p-5">
                    <p className="mb-3 text-[10px] font-medium tracking-wide text-neutral-400 uppercase">
                      What's included
                    </p>
                    <ul className="space-y-2">
                      {plan.features.map((feature, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-xs text-neutral-600"
                        >
                          <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-positive-500" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter className="border-t border-neutral-200 px-6 py-4">
          <DialogClose asChild>
            <Button
              variant="secondary"
              className="h-8 rounded-none border-neutral-300 px-4 text-xs font-medium"
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleChangePlan}
            disabled={
              selectedPriceId === currentPriceId ||
              !selectedPriceId ||
              updateSubscriptionMutation.isPending
            }
            className="h-8 rounded-none bg-brand-500 px-4 text-xs font-medium text-white hover:bg-brand-600"
          >
            {updateSubscriptionMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2Icon className="size-3.5 animate-spin" />
                Updating...
              </span>
            ) : !selectedPriceId || selectedPriceId === currentPriceId ? (
              'Current Plan'
            ) : (
              `Switch to ${selectedPlan?.name} (${selectedPrice ? formatPeriodLabel(selectedPrice.period, selectedPrice.periodUnit) : ''})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const PageSettingsBilling = () => {
  const queryClient = useQueryClient();
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  // Fetch subscription
  const {
    data: subscription,
    isLoading: subscriptionLoading,
    error: subscriptionError,
  } = useQuery(orpc.billing.getSubscription.queryOptions({}));

  // Fetch plans
  const { data: plans = [], isLoading: plansLoading } = useQuery(
    orpc.billing.getPlans.queryOptions({})
  );

  // Fetch payment methods
  const { data: paymentMethods = [], isLoading: paymentMethodsLoading } =
    useQuery(orpc.billing.getPaymentMethods.queryOptions({}));

  // Fetch invoices
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery(
    orpc.billing.getInvoices.queryOptions({})
  );

  // Fetch entitlements
  const { data: entitlements = [], isLoading: entitlementsLoading } = useQuery(
    orpc.billing.getEntitlements.queryOptions({})
  );

  // Mutations
  const removePaymentMethodMutation = useMutation(
    orpc.billing.removePaymentMethod.mutationOptions({
      onSuccess: () => {
        toast.success('Payment method removed');
        queryClient.invalidateQueries({
          queryKey: ['billing', 'paymentMethods'],
        });
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to remove payment method');
      },
    })
  );

  const setDefaultPaymentMethodMutation = useMutation(
    orpc.billing.setDefaultPaymentMethod.mutationOptions({
      onSuccess: () => {
        toast.success('Default payment method updated');
        queryClient.invalidateQueries({
          queryKey: ['billing', 'paymentMethods'],
        });
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to update default payment method');
      },
    })
  );

  const reactivateSubscriptionMutation = useMutation(
    orpc.billing.reactivateSubscription.mutationOptions({
      onSuccess: () => {
        toast.success('Subscription reactivated');
        queryClient.invalidateQueries({
          queryKey: ['billing', 'subscription'],
        });
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to reactivate subscription');
      },
    })
  );

  const downloadInvoiceMutation = useMutation(
    orpc.billing.downloadInvoice.mutationOptions({
      onSuccess: (data) => {
        window.open(data.downloadUrl, '_blank');
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to download invoice');
      },
    })
  );

  const handleRemovePayment = (paymentMethodId: string) => {
    removePaymentMethodMutation.mutate({ paymentMethodId });
  };

  const handleSetDefault = (paymentMethodId: string) => {
    setDefaultPaymentMethodMutation.mutate({ paymentMethodId });
  };

  const handleReactivate = () => {
    reactivateSubscriptionMutation.mutate({});
  };

  const handleDownloadInvoice = (invoiceId: string) => {
    downloadInvoiceMutation.mutate({ invoiceId });
  };

  // subscription.planId is actually the item_price_id
  const currentPriceId = subscription?.planId;
  const currentPlan = plans.find((p) =>
    p.prices.some((price) => price.id === currentPriceId)
  );
  const currentPrice = currentPlan?.prices.find((p) => p.id === currentPriceId);
  const isPastDue =
    subscription?.status === 'non_renewing' && subscription?.cancelledAt;
  const isCancellationPending = subscription?.status === 'non_renewing';

  // Show error state
  if (subscriptionError) {
    return (
      <SettingsLayout
        title="Billing"
        description="Manage your subscription and payment methods"
      >
        <div className="flex flex-col items-center justify-center rounded border border-negative-200 bg-negative-50 py-12">
          <AlertTriangleIcon className="size-8 text-negative-500" />
          <p className="mt-4 text-sm font-medium text-negative-700">
            Failed to load billing information
          </p>
          <p className="mt-1 text-xs text-negative-600">
            {subscriptionError.message || 'Please try again later'}
          </p>
          <Button
            variant="secondary"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ['billing'] })
            }
            className="mt-4 h-8 rounded-none border-neutral-300 px-4 text-xs font-medium"
          >
            Retry
          </Button>
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout
      title="Billing"
      description="Manage your subscription and payment methods"
    >
      <div className="space-y-8">
        {/* Past Due Banner */}
        {isPastDue && <PastDueBanner />}

        {/* Current Plan */}
        {subscriptionLoading || plansLoading ? (
          <CurrentPlanSkeleton />
        ) : subscription ? (
          <div className="border border-neutral-200">
            <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-6 py-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">
                  Current Plan
                </h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {subscription.nextBillingAt
                    ? `Your subscription renews on ${formatDate(subscription.nextBillingAt)}`
                    : subscription.currentTermEnd
                      ? `Active until ${formatDate(subscription.currentTermEnd)}`
                      : 'Manage your subscription'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isCancellationPending ? (
                  <Button
                    variant="secondary"
                    onClick={handleReactivate}
                    disabled={reactivateSubscriptionMutation.isPending}
                    className="h-8 rounded-none border-neutral-300 px-4 text-xs font-medium"
                  >
                    {reactivateSubscriptionMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <Loader2Icon className="size-3.5 animate-spin" />
                        Reactivating...
                      </span>
                    ) : (
                      'Reactivate'
                    )}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => setChangePlanOpen(true)}
                      className="h-8 rounded-none border-neutral-300 px-4 text-xs font-medium"
                    >
                      Change Plan
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setCancelOpen(true)}
                      className="h-8 rounded-none border-neutral-300 px-4 text-xs font-medium text-negative-600 hover:text-negative-700"
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex size-12 items-center justify-center rounded-full bg-neutral-100">
                  <SparklesIcon className="size-6 text-neutral-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-neutral-900">
                      {currentPlan?.name || subscription.planName}
                    </h3>
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 text-xs font-medium capitalize',
                        getSubscriptionStatusStyles(subscription.status)
                      )}
                    >
                      {subscription.status.replace('_', ' ')}
                    </span>
                    {isCancellationPending && (
                      <span className="rounded bg-warning-50 px-2 py-0.5 text-xs font-medium text-warning-700">
                        Cancels {formatDate(subscription.currentTermEnd)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-neutral-500">
                    {currentPlan?.description}
                  </p>
                  {currentPrice && (
                    <div className="mt-4">
                      <p className="text-2xl font-bold text-neutral-900 tabular-nums">
                        {formatCurrency(
                          currentPrice.price,
                          currentPrice.currencyCode
                        )}
                      </p>
                      <p className="text-xs text-neutral-500">
                        per{' '}
                        {currentPrice.period === 1
                          ? ''
                          : currentPrice.period + ' '}
                        {currentPrice.periodUnit}
                        {currentPrice.period > 1 ? 's' : ''} (
                        {formatPeriodLabel(
                          currentPrice.period,
                          currentPrice.periodUnit
                        )}
                        )
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-neutral-200 p-6">
            <div className="text-center">
              <SparklesIcon className="mx-auto size-8 text-neutral-400" />
              <h3 className="mt-4 text-sm font-semibold text-neutral-900">
                No Active Subscription
              </h3>
              <p className="mt-1 text-xs text-neutral-500">
                Choose a plan to get started
              </p>
              <Button
                onClick={() => setChangePlanOpen(true)}
                className="mt-4 h-8 rounded-none bg-brand-500 px-4 text-xs font-medium text-white hover:bg-brand-600"
              >
                View Plans
              </Button>
            </div>
          </div>
        )}

        {/* Usage Quota */}
        {subscription &&
          (entitlementsLoading ? (
            <QuotaSectionSkeleton />
          ) : (
            (() => {
              // Find entitlements for vaults, transactions, users
              const vaultsEntitlement = entitlements.find((e) =>
                e.featureId.toLowerCase().includes('vault')
              );
              const transactionsEntitlement = entitlements.find((e) =>
                e.featureId.toLowerCase().includes('transaction')
              );
              const usersEntitlement = entitlements.find((e) =>
                e.featureId.toLowerCase().includes('user')
              );

              // TODO: Replace with actual usage data from API
              const vaultsUsed = 3;
              const transactionsUsed = 847;
              const usersUsed = 5;

              const hasQuotaData =
                vaultsEntitlement ||
                transactionsEntitlement ||
                usersEntitlement;

              if (!hasQuotaData) return null;

              return (
                <div className="border border-neutral-200">
                  <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
                    <h2 className="text-sm font-semibold text-neutral-900">
                      Usage
                    </h2>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      Your current usage against plan limits
                    </p>
                  </div>
                  <div className="grid gap-4 p-6 sm:grid-cols-3">
                    {vaultsEntitlement && (
                      <QuotaCard
                        label="Vaults"
                        used={vaultsUsed}
                        limit={vaultsEntitlement.quantity ?? null}
                      />
                    )}
                    {transactionsEntitlement && (
                      <QuotaCard
                        label="Transactions"
                        used={transactionsUsed}
                        limit={transactionsEntitlement.quantity ?? null}
                        unit="/ month"
                      />
                    )}
                    {usersEntitlement && (
                      <QuotaCard
                        label="Users"
                        used={usersUsed}
                        limit={usersEntitlement.quantity ?? null}
                      />
                    )}
                  </div>
                </div>
              );
            })()
          ))}

        {/* Plan Entitlements */}
        {subscription &&
          (entitlementsLoading ? (
            <EntitlementsSkeleton />
          ) : entitlements.length > 0 ? (
            <div className="border border-neutral-200">
              <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
                <h2 className="text-sm font-semibold text-neutral-900">
                  Plan Features
                </h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Features and limits included in your current plan
                </p>
              </div>
              <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
                {entitlements.map((entitlement: Entitlement) => (
                  <div
                    key={entitlement.featureId}
                    className="border border-neutral-100 bg-neutral-50 p-4"
                  >
                    <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">
                      {entitlement.featureName}
                    </p>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold text-neutral-900 tabular-nums">
                        {entitlement.quantity !== undefined
                          ? entitlement.quantity === -1
                            ? '∞'
                            : entitlement.quantity.toLocaleString()
                          : entitlement.value === 'true'
                            ? '✓'
                            : entitlement.value === 'false'
                              ? '✗'
                              : entitlement.value}
                      </span>
                      {entitlement.unit && (
                        <span className="text-sm text-neutral-500">
                          {entitlement.unit}
                        </span>
                      )}
                    </div>
                    {entitlement.quantity === -1 && (
                      <p className="mt-1 text-xs text-neutral-500">Unlimited</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null)}

        {/* Payment Methods */}
        {paymentMethodsLoading ? (
          <PaymentMethodsSkeleton />
        ) : (
          <div className="border border-neutral-200">
            <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-6 py-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">
                  Payment Methods
                </h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Manage your payment methods
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => setAddPaymentOpen(true)}
                className="h-8 rounded-none border-neutral-300 px-4 text-xs font-medium"
              >
                <PlusIcon className="mr-1.5 size-3.5" />
                Add Payment Method
              </Button>
            </div>
            {paymentMethods.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <CreditCardIcon className="mx-auto size-8 text-neutral-300" />
                <p className="mt-2 text-sm text-neutral-500">
                  No payment methods on file
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {paymentMethods.map((method: PaymentMethod) => (
                  <div
                    key={method.id}
                    className="flex items-center justify-between px-6 py-4"
                  >
                    <div className="flex items-center gap-4">
                      {getCardIcon(method.cardBrand)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-neutral-900 capitalize">
                            {method.cardBrand || method.type}
                          </span>
                          {method.cardLast4 && (
                            <span className="font-mono text-sm text-neutral-600">
                              •••• {method.cardLast4}
                            </span>
                          )}
                          {method.isDefault && (
                            <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
                              Default
                            </span>
                          )}
                          {method.status === 'expiring' && (
                            <span className="rounded bg-warning-50 px-1.5 py-0.5 text-[10px] font-medium text-warning-700">
                              Expiring Soon
                            </span>
                          )}
                          {method.status === 'expired' && (
                            <span className="rounded bg-negative-50 px-1.5 py-0.5 text-[10px] font-medium text-negative-700">
                              Expired
                            </span>
                          )}
                        </div>
                        {method.cardExpiryMonth && method.cardExpiryYear && (
                          <p className="text-xs text-neutral-500">
                            Expires {method.cardExpiryMonth}/
                            {method.cardExpiryYear}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!method.isDefault && (
                        <Button
                          variant="secondary"
                          onClick={() => handleSetDefault(method.id)}
                          disabled={setDefaultPaymentMethodMutation.isPending}
                          className="h-7 rounded-none border-neutral-200 px-3 text-xs"
                        >
                          Set as Default
                        </Button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemovePayment(method.id)}
                        disabled={removePaymentMethodMutation.isPending}
                        className="interactive-icon-button flex size-7 items-center justify-center hover:text-negative-600"
                      >
                        <Trash2Icon className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Invoice History */}
        {invoicesLoading ? (
          <InvoicesSkeleton />
        ) : (
          <div className="border border-neutral-200">
            <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
              <h2 className="text-sm font-semibold text-neutral-900">
                Invoice History
              </h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                Download past invoices for your records
              </p>
            </div>
            {invoices.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-neutral-500">No invoices yet</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs">
                    <th className="px-6 py-3 font-medium text-neutral-500">
                      Invoice
                    </th>
                    <th className="px-6 py-3 font-medium text-neutral-500">
                      Date
                    </th>
                    <th className="px-6 py-3 font-medium text-neutral-500">
                      Amount
                    </th>
                    <th className="px-6 py-3 font-medium text-neutral-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right font-medium text-neutral-500">
                      Download
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {invoices.map((invoice: Invoice) => (
                    <tr key={invoice.id} className="hover-subtle">
                      <td className="px-6 py-3 font-medium text-neutral-900">
                        {invoice.number || invoice.id}
                      </td>
                      <td className="px-6 py-3 text-neutral-600">
                        {formatDate(invoice.date)}
                      </td>
                      <td className="px-6 py-3 text-neutral-900 tabular-nums">
                        {formatCurrency(invoice.total, invoice.currencyCode)}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={cn(
                            'inline-block rounded px-2 py-0.5 text-xs font-medium capitalize',
                            getInvoiceStatusStyles(invoice.status)
                          )}
                        >
                          {invoice.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDownloadInvoice(invoice.id)}
                          disabled={downloadInvoiceMutation.isPending}
                          className="inline-flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900"
                        >
                          <DownloadIcon className="size-3.5" />
                          PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <AddPaymentMethodDialog
        open={addPaymentOpen}
        onOpenChange={setAddPaymentOpen}
      />

      {subscription && (
        <CancelSubscriptionDialog
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          subscription={subscription}
        />
      )}

      <ChangePlanDialog
        open={changePlanOpen}
        onOpenChange={setChangePlanOpen}
        currentPriceId={currentPriceId}
        plans={plans}
      />
    </SettingsLayout>
  );
};
