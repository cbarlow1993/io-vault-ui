import {
  CheckIcon,
  CreditCardIcon,
  DownloadIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

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
import { Input } from '@/components/ui/input';

import { SettingsLayout } from './components/settings-layout';
import {
  billingInfo,
  getPlanById,
  plans,
  type BillingInterval,
  type PaymentMethod,
  type PlanTier,
} from './data/settings';

const getCardIcon = (_type: PaymentMethod['type']) => {
  // In a real app, you'd use brand-specific icons
  return <CreditCardIcon className="size-5 text-neutral-500" />;
};

const getStatusStyles = (status: 'paid' | 'pending' | 'failed') => {
  switch (status) {
    case 'paid':
      return 'bg-positive-100 text-positive-700';
    case 'pending':
      return 'bg-warning-100 text-warning-700';
    case 'failed':
      return 'bg-negative-100 text-negative-700';
  }
};

export const PageSettingsBilling = () => {
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(
    billingInfo.billingInterval
  );
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>(
    billingInfo.currentPlan
  );

  const currentPlan = getPlanById(billingInfo.currentPlan);

  const handleChangePlan = () => {
    toast.success('Plan updated successfully', {
      description: `You are now on the ${getPlanById(selectedPlan)?.name} plan`,
    });
    setChangePlanOpen(false);
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Payment method added');
    setAddPaymentOpen(false);
  };

  const handleRemovePayment = (_paymentId: string) => {
    toast.success('Payment method removed');
  };

  const handleSetDefault = (_paymentId: string) => {
    toast.success('Default payment method updated');
  };

  return (
    <SettingsLayout
      title="Billing"
      description="Manage your subscription and payment methods"
    >
      <div className="space-y-8">
        {/* Current Plan */}
        <div className="border border-neutral-200">
          <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-6 py-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                Current Plan
              </h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                Your subscription renews on {billingInfo.nextBillingDate}
              </p>
            </div>
            <Dialog open={changePlanOpen} onOpenChange={setChangePlanOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="secondary"
                  className="h-8 rounded-none border-neutral-300 px-4 text-xs font-medium"
                >
                  Change Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl rounded-none p-0">
                <DialogHeader className="border-b border-neutral-200 px-6 py-4">
                  <DialogTitle className="text-sm font-semibold text-neutral-900">
                    Choose a Plan
                  </DialogTitle>
                  <DialogDescription className="text-xs text-neutral-500">
                    Select the plan that best fits your needs
                  </DialogDescription>
                </DialogHeader>

                {/* Billing Toggle */}
                <div className="flex justify-center border-b border-neutral-200 py-4">
                  <div className="inline-flex rounded-none border border-neutral-200 p-0.5">
                    <button
                      type="button"
                      onClick={() => setBillingInterval('monthly')}
                      className={cn(
                        'px-4 py-1.5 text-xs font-medium transition-colors',
                        billingInterval === 'monthly'
                          ? 'bg-neutral-900 text-white'
                          : 'text-neutral-600 hover:text-neutral-900'
                      )}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingInterval('annual')}
                      className={cn(
                        'px-4 py-1.5 text-xs font-medium transition-colors',
                        billingInterval === 'annual'
                          ? 'bg-neutral-900 text-white'
                          : 'text-neutral-600 hover:text-neutral-900'
                      )}
                    >
                      Annual
                      <span className="ml-1.5 text-positive-600">Save 20%</span>
                    </button>
                  </div>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-3 gap-px bg-neutral-200 p-6">
                  {plans.map((plan) => {
                    const price =
                      billingInterval === 'monthly'
                        ? plan.priceMonthly
                        : plan.priceAnnual;
                    const isCurrentPlan = plan.id === billingInfo.currentPlan;
                    const isSelected = plan.id === selectedPlan;

                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlan(plan.id)}
                        className={cn(
                          'relative bg-white p-5 text-left transition-all',
                          isSelected
                            ? 'ring-2 ring-neutral-900'
                            : 'hover:bg-neutral-50'
                        )}
                      >
                        {isCurrentPlan && (
                          <span className="absolute top-3 right-3 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
                            Current
                          </span>
                        )}
                        <h3 className="text-sm font-semibold text-neutral-900">
                          {plan.name}
                        </h3>
                        <p className="mt-1 text-xs text-neutral-500">
                          {plan.description}
                        </p>
                        <div className="mt-4">
                          <span className="text-2xl font-bold text-neutral-900 tabular-nums">
                            ${price}
                          </span>
                          <span className="text-xs text-neutral-500">
                            /{billingInterval === 'monthly' ? 'mo' : 'yr'}
                          </span>
                        </div>
                        <ul className="mt-4 space-y-2">
                          {plan.features.slice(0, 5).map((feature) => (
                            <li
                              key={feature}
                              className="flex items-center gap-2 text-xs text-neutral-600"
                            >
                              <CheckIcon className="size-3.5 text-positive-600" />
                              {feature}
                            </li>
                          ))}
                          {plan.features.length > 5 && (
                            <li className="text-xs text-neutral-400">
                              +{plan.features.length - 5} more
                            </li>
                          )}
                        </ul>
                        {isSelected && (
                          <div className="absolute right-3 bottom-3">
                            <CheckIcon className="size-5 text-neutral-900" />
                          </div>
                        )}
                      </button>
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
                    disabled={selectedPlan === billingInfo.currentPlan}
                    className="h-8 rounded-none bg-brand-500 px-4 text-xs font-medium text-white hover:bg-brand-600"
                  >
                    {selectedPlan === billingInfo.currentPlan
                      ? 'Current Plan'
                      : `Switch to ${getPlanById(selectedPlan)?.name}`}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex size-12 items-center justify-center rounded-full bg-neutral-100">
                <SparklesIcon className="size-6 text-neutral-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-neutral-900">
                    {currentPlan?.name}
                  </h3>
                  <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 capitalize">
                    {billingInfo.billingInterval}
                  </span>
                </div>
                <p className="mt-1 text-sm text-neutral-500">
                  {currentPlan?.description}
                </p>
                <div className="mt-4 flex gap-6">
                  <div>
                    <p className="text-2xl font-bold text-neutral-900 tabular-nums">
                      $
                      {billingInfo.billingInterval === 'monthly'
                        ? currentPlan?.priceMonthly
                        : currentPlan?.priceAnnual}
                    </p>
                    <p className="text-xs text-neutral-500">
                      per{' '}
                      {billingInfo.billingInterval === 'monthly'
                        ? 'month'
                        : 'year'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Usage Stats */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="border border-neutral-200 p-4">
                <p className="text-xs font-medium tracking-wider text-neutral-400 uppercase">
                  Vaults
                </p>
                <p className="mt-1 text-lg font-semibold text-neutral-900 tabular-nums">
                  {billingInfo.usage.vaults}
                  <span className="text-sm font-normal text-neutral-400">
                    {' '}
                    /{' '}
                    {currentPlan?.limits.vaults === -1
                      ? '∞'
                      : currentPlan?.limits.vaults}
                  </span>
                </p>
                <div className="mt-2 h-1.5 bg-neutral-100">
                  <div
                    className="h-full bg-brand-500"
                    style={{
                      width: `${currentPlan?.limits.vaults === -1 ? 10 : (billingInfo.usage.vaults / currentPlan!.limits.vaults) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div className="border border-neutral-200 p-4">
                <p className="text-xs font-medium tracking-wider text-neutral-400 uppercase">
                  Members
                </p>
                <p className="mt-1 text-lg font-semibold text-neutral-900 tabular-nums">
                  {billingInfo.usage.members}
                  <span className="text-sm font-normal text-neutral-400">
                    {' '}
                    /{' '}
                    {currentPlan?.limits.members === -1
                      ? '∞'
                      : currentPlan?.limits.members}
                  </span>
                </p>
                <div className="mt-2 h-1.5 bg-neutral-100">
                  <div
                    className="h-full bg-brand-500"
                    style={{
                      width: `${currentPlan?.limits.members === -1 ? 10 : (billingInfo.usage.members / currentPlan!.limits.members) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div className="border border-neutral-200 p-4">
                <p className="text-xs font-medium tracking-wider text-neutral-400 uppercase">
                  Workspaces
                </p>
                <p className="mt-1 text-lg font-semibold text-neutral-900 tabular-nums">
                  {billingInfo.usage.workspaces}
                  <span className="text-sm font-normal text-neutral-400">
                    {' '}
                    /{' '}
                    {currentPlan?.limits.workspaces === -1
                      ? '∞'
                      : currentPlan?.limits.workspaces}
                  </span>
                </p>
                <div className="mt-2 h-1.5 bg-neutral-100">
                  <div
                    className="h-full bg-brand-500"
                    style={{
                      width: `${currentPlan?.limits.workspaces === -1 ? 10 : (billingInfo.usage.workspaces / currentPlan!.limits.workspaces) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
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
            <Dialog open={addPaymentOpen} onOpenChange={setAddPaymentOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="secondary"
                  className="h-8 rounded-none border-neutral-300 px-4 text-xs font-medium"
                >
                  <PlusIcon className="mr-1.5 size-3.5" />
                  Add Payment Method
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md rounded-none">
                <DialogHeader>
                  <DialogTitle className="text-sm font-semibold text-neutral-900">
                    Add Payment Method
                  </DialogTitle>
                  <DialogDescription className="text-xs text-neutral-500">
                    Enter your card details below
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddPayment} className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-700">
                      Card Number
                    </label>
                    <Input
                      placeholder="1234 5678 9012 3456"
                      className="h-10 rounded-none border-neutral-200"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-neutral-700">
                        Expiry Date
                      </label>
                      <Input
                        placeholder="MM/YY"
                        className="h-10 rounded-none border-neutral-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-neutral-700">
                        CVC
                      </label>
                      <Input
                        placeholder="123"
                        className="h-10 rounded-none border-neutral-200"
                      />
                    </div>
                  </div>
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
                      className="h-8 rounded-none bg-brand-500 px-4 text-xs font-medium text-white hover:bg-brand-600"
                    >
                      Add Card
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="divide-y divide-neutral-100">
            {billingInfo.paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex items-center gap-4">
                  {getCardIcon(method.type)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-900 capitalize">
                        {method.type}
                      </span>
                      <span className="font-mono text-sm text-neutral-600">
                        •••• {method.last4}
                      </span>
                      {method.isDefault && (
                        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500">
                      Expires {method.expiry}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!method.isDefault && (
                    <Button
                      variant="secondary"
                      onClick={() => handleSetDefault(method.id)}
                      className="h-7 rounded-none border-neutral-200 px-3 text-xs"
                    >
                      Set as Default
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemovePayment(method.id)}
                    className="flex size-7 items-center justify-center text-neutral-400 hover:bg-neutral-100 hover:text-negative-600"
                  >
                    <Trash2Icon className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invoice History */}
        <div className="border border-neutral-200">
          <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
            <h2 className="text-sm font-semibold text-neutral-900">
              Invoice History
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Download past invoices for your records
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs">
                <th className="px-6 py-3 font-medium text-neutral-500">
                  Invoice
                </th>
                <th className="px-6 py-3 font-medium text-neutral-500">Date</th>
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
              {billingInfo.invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-neutral-50">
                  <td className="px-6 py-3 font-medium text-neutral-900">
                    {invoice.number}
                  </td>
                  <td className="px-6 py-3 text-neutral-600">{invoice.date}</td>
                  <td className="px-6 py-3 text-neutral-900 tabular-nums">
                    ${invoice.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={cn(
                        'inline-block rounded px-2 py-0.5 text-xs font-medium capitalize',
                        getStatusStyles(invoice.status)
                      )}
                    >
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      type="button"
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
        </div>
      </div>
    </SettingsLayout>
  );
};
