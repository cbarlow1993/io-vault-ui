import { ArrowDownIcon, ArrowRightIcon, ArrowUpIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { OnboardingChecklist } from '@/features/shared/components/onboarding-checklist';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
} from '@/layout/shell';

const formatCurrency = (value: number, compact = false) => {
  if (compact && Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatNumber = (value: number, decimals = 2) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

const formatMetricValue = (metric: {
  value: number;
  isRatio?: boolean;
  isCount?: boolean;
}) => {
  if (metric.isRatio) return formatNumber(metric.value);
  if (metric.isCount) return metric.value;
  return formatCurrency(metric.value, true);
};

const summaryMetrics = [
  { label: 'Total Assets', value: 156789432, change: 2.34 },
  { label: 'Liabilities', value: 23456789, change: -0.87 },
  { label: 'Net Position', value: 133332643, change: 3.21 },
  { label: 'Liquidity Ratio', value: 1.45, change: 0.12, isRatio: true },
  { label: 'Pending', value: 8, change: -2, isCount: true },
  { label: 'Due Today', value: 3, change: 1, isCount: true },
];

const positions = [
  {
    ccy: 'USD',
    balance: 45678923,
    available: 42500000,
    pending: 3178923,
    change: 2.34,
  },
  {
    ccy: 'EUR',
    balance: 23456789,
    available: 21000000,
    pending: 2456789,
    change: -0.87,
  },
  {
    ccy: 'GBP',
    balance: 12345678,
    available: 11500000,
    pending: 845678,
    change: 1.23,
  },
  {
    ccy: 'CHF',
    balance: 8765432,
    available: 8000000,
    pending: 765432,
    change: 0.56,
  },
  {
    ccy: 'JPY',
    balance: 987654321,
    available: 950000000,
    pending: 37654321,
    change: -1.45,
  },
  {
    ccy: 'SGD',
    balance: 5432109,
    available: 5000000,
    pending: 432109,
    change: 0.12,
  },
];

const fxRates = [
  { pair: 'EUR/USD', rate: 1.0847, change: 0.11 },
  { pair: 'GBP/USD', rate: 1.2634, change: -0.18 },
  { pair: 'USD/JPY', rate: 149.23, change: 0.23 },
  { pair: 'USD/CHF', rate: 0.8812, change: -0.09 },
  { pair: 'AUD/USD', rate: 0.6543, change: 0.23 },
];

const recentTransactions = [
  {
    id: 'TXN-001',
    time: '14:32',
    type: 'OUT',
    counterparty: 'Acme Corporation',
    amount: -2500000,
    status: 'completed',
  },
  {
    id: 'TXN-002',
    time: '14:28',
    type: 'FX',
    counterparty: 'EUR → USD',
    amount: 1850000,
    status: 'completed',
  },
  {
    id: 'TXN-003',
    time: '14:15',
    type: 'IN',
    counterparty: 'Global Industries',
    amount: 3200000,
    status: 'pending',
  },
  {
    id: 'TXN-004',
    time: '14:02',
    type: 'OUT',
    counterparty: 'Tech Solutions',
    amount: -750000,
    status: 'completed',
  },
  {
    id: 'TXN-005',
    time: '13:48',
    type: 'FX',
    counterparty: 'USD → GBP',
    amount: -1200000,
    status: 'completed',
  },
  {
    id: 'TXN-006',
    time: '13:32',
    type: 'IN',
    counterparty: 'Nordic Finance',
    amount: 890000,
    status: 'completed',
  },
  {
    id: 'TXN-007',
    time: '13:15',
    type: 'OUT',
    counterparty: 'Pacific Trading',
    amount: -450000,
    status: 'completed',
  },
  {
    id: 'TXN-008',
    time: '12:58',
    type: 'IN',
    counterparty: 'Eastern Bank',
    amount: 2100000,
    status: 'pending',
  },
];

const pendingApprovals = [
  {
    id: 'APR-001',
    type: 'Payment',
    amount: 5000000,
    priority: 'high',
    requestor: 'M. Smith',
  },
  {
    id: 'APR-002',
    type: 'FX Trade',
    amount: 2000000,
    priority: 'high',
    requestor: 'J. Chen',
  },
  {
    id: 'APR-003',
    type: 'Payment',
    amount: 1250000,
    priority: 'medium',
    requestor: 'A. Kumar',
  },
  {
    id: 'APR-004',
    type: 'Transfer',
    amount: 800000,
    priority: 'low',
    requestor: 'S. Wilson',
  },
];

const cashFlow = [
  { period: 'Today', inflow: 6190000, outflow: 4900000, net: 1290000 },
  { period: 'Tomorrow', inflow: 3200000, outflow: 2100000, net: 1100000 },
  { period: 'This Week', inflow: 15400000, outflow: 12800000, net: 2600000 },
  { period: 'This Month', inflow: 45000000, outflow: 38000000, net: 7000000 },
];

const getStatusClass = (status: string) => {
  return status === 'completed' ? 'text-positive-600' : 'text-warning-600';
};

const getPriorityClass = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'bg-negative-100 text-negative-700';
    case 'medium':
      return 'bg-warning-100 text-warning-700';
    default:
      return 'bg-neutral-100 text-neutral-600';
  }
};

export const PageTreasury6Dashboard = () => {
  return (
    <PageLayout>
      <PageLayoutTopBar
        title="Overview"
        actions={
          <>
            <span className="text-xs text-neutral-400">
              Last updated: 14:32:05 UTC
            </span>
            <Button className="h-7 rounded-none bg-brand-500 px-3 text-xs font-medium text-white hover:bg-brand-600">
              New Transfer
            </Button>
          </>
        }
      />
      <PageLayoutContent containerClassName="py-4">
        {/* Main 2/3 - 1/3 Layout */}
        <div className="grid grid-cols-12 gap-4">
          {/* Main Content - 2/3 */}
          <div className="col-span-8 space-y-4">
            {/* Summary Metrics Row */}
            <div className="grid grid-cols-6 gap-px bg-neutral-200">
              {summaryMetrics.map((metric) => (
                <div key={metric.label} className="bg-white p-3">
                  <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
                    {metric.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-neutral-900 tabular-nums">
                    {formatMetricValue(metric)}
                  </p>
                  <p
                    className={`mt-0.5 text-xs tabular-nums ${
                      metric.change >= 0
                        ? 'text-positive-600'
                        : 'text-negative-600'
                    }`}
                  >
                    {metric.change >= 0 ? '+' : ''}
                    {metric.isCount ? metric.change : `${metric.change}%`}
                  </p>
                </div>
              ))}
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-12 gap-4">
              {/* Positions Table - 8 cols */}
              <div className="col-span-8 border border-neutral-200 bg-white">
                <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
                  <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                    Cash Positions
                  </h2>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900"
                  >
                    View all <ArrowRightIcon className="size-3" />
                  </button>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-neutral-100 bg-neutral-50 text-left">
                      <th className="px-3 py-2 font-medium text-neutral-500">
                        CCY
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-neutral-500">
                        Balance
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-neutral-500">
                        Available
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-neutral-500">
                        Pending
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-neutral-500">
                        24h
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {positions.map((pos) => (
                      <tr key={pos.ccy} className="hover:bg-neutral-50">
                        <td className="px-3 py-2 font-semibold text-neutral-900">
                          {pos.ccy}
                        </td>
                        <td className="px-3 py-2 text-right text-neutral-900 tabular-nums">
                          {formatNumber(pos.balance, 0)}
                        </td>
                        <td className="px-3 py-2 text-right text-neutral-600 tabular-nums">
                          {formatNumber(pos.available, 0)}
                        </td>
                        <td className="px-3 py-2 text-right text-neutral-400 tabular-nums">
                          {formatNumber(pos.pending, 0)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right tabular-nums ${pos.change >= 0 ? 'text-positive-600' : 'text-negative-600'}`}
                        >
                          {pos.change >= 0 ? '+' : ''}
                          {pos.change}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Right Column - 4 cols */}
              <div className="col-span-4 space-y-4">
                {/* FX Rates */}
                <div className="border border-neutral-200 bg-white">
                  <div className="border-b border-neutral-200 px-3 py-2">
                    <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                      FX Rates
                    </h2>
                  </div>
                  <div className="divide-y divide-neutral-100">
                    {fxRates.map((rate) => (
                      <div
                        key={rate.pair}
                        className="flex items-center justify-between px-3 py-1.5 text-xs hover:bg-neutral-50"
                      >
                        <span className="font-medium text-neutral-900">
                          {rate.pair}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-neutral-700 tabular-nums">
                            {rate.rate.toFixed(4)}
                          </span>
                          <span
                            className={`w-12 text-right tabular-nums ${rate.change >= 0 ? 'text-positive-600' : 'text-negative-600'}`}
                          >
                            {rate.change >= 0 ? '+' : ''}
                            {rate.change}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cash Flow Forecast */}
                <div className="border border-neutral-200 bg-white">
                  <div className="border-b border-neutral-200 px-3 py-2">
                    <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                      Cash Flow
                    </h2>
                  </div>
                  <div className="divide-y divide-neutral-100">
                    {cashFlow.map((cf) => (
                      <div
                        key={cf.period}
                        className="grid grid-cols-4 gap-2 px-3 py-1.5 text-xs hover:bg-neutral-50"
                      >
                        <span className="font-medium text-neutral-600">
                          {cf.period}
                        </span>
                        <span className="text-right text-positive-600 tabular-nums">
                          <ArrowDownIcon className="mr-0.5 inline size-3" />
                          {formatCurrency(cf.inflow, true)}
                        </span>
                        <span className="text-right text-negative-600 tabular-nums">
                          <ArrowUpIcon className="mr-0.5 inline size-3" />
                          {formatCurrency(cf.outflow, true)}
                        </span>
                        <span
                          className={`text-right font-medium tabular-nums ${cf.net >= 0 ? 'text-neutral-900' : 'text-negative-600'}`}
                        >
                          {formatCurrency(cf.net, true)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Transactions - 8 cols */}
              <div className="col-span-8 border border-neutral-200 bg-white">
                <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
                  <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                    Recent Transactions
                  </h2>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900"
                  >
                    View all <ArrowRightIcon className="size-3" />
                  </button>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-neutral-100 bg-neutral-50 text-left">
                      <th className="px-3 py-2 font-medium text-neutral-500">
                        ID
                      </th>
                      <th className="px-3 py-2 font-medium text-neutral-500">
                        Time
                      </th>
                      <th className="px-3 py-2 font-medium text-neutral-500">
                        Type
                      </th>
                      <th className="px-3 py-2 font-medium text-neutral-500">
                        Counterparty
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-neutral-500">
                        Amount
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-neutral-500">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {recentTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-neutral-50">
                        <td className="px-3 py-1.5 font-mono text-neutral-400">
                          {tx.id}
                        </td>
                        <td className="px-3 py-1.5 text-neutral-500 tabular-nums">
                          {tx.time}
                        </td>
                        <td className="px-3 py-1.5">
                          <span className="inline-block w-8 rounded bg-neutral-100 px-1 py-0.5 text-center text-[10px] font-medium text-neutral-600">
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-neutral-900">
                          {tx.counterparty}
                        </td>
                        <td
                          className={`px-3 py-1.5 text-right tabular-nums ${tx.amount >= 0 ? 'text-positive-600' : 'text-neutral-900'}`}
                        >
                          {tx.amount >= 0 ? '+' : ''}
                          {formatCurrency(tx.amount)}
                        </td>
                        <td
                          className={`px-3 py-1.5 text-right capitalize ${getStatusClass(tx.status)}`}
                        >
                          {tx.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pending Approvals - 4 cols */}
              <div className="col-span-4 border border-neutral-200 bg-white">
                <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
                  <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                    Pending Approvals
                  </h2>
                  <span className="flex size-5 items-center justify-center bg-brand-500 text-[10px] font-semibold text-white">
                    {pendingApprovals.length}
                  </span>
                </div>
                <div className="divide-y divide-neutral-100">
                  {pendingApprovals.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-3 py-2 hover:bg-neutral-50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${getPriorityClass(item.priority)}`}
                          >
                            {item.priority}
                          </span>
                          <span className="text-xs font-medium text-neutral-900">
                            {item.type}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-neutral-500">
                          {formatCurrency(item.amount)} · {item.requestor}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          className="h-6 rounded-none bg-brand-500 px-2 text-[10px] font-medium text-white hover:bg-brand-600"
                        >
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - 1/3 */}
          <div className="col-span-4">
            <OnboardingChecklist />
          </div>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
