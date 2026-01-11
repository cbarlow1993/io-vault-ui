import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

interface MetricCardProps {
  label: string;
  value: number | string;
  change?: number;
  changeLabel?: string;
  valueClassName?: string;
}

const MetricCard = ({
  label,
  value,
  change,
  changeLabel,
  valueClassName,
}: MetricCardProps) => {
  const isPositive = change !== undefined && change >= 0;
  const hasChange = change !== undefined;

  return (
    <div className="bg-white p-3">
      <p className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 text-lg font-semibold text-neutral-900 tabular-nums',
          valueClassName
        )}
      >
        {value}
      </p>
      {hasChange && (
        <div className="mt-1 flex items-center gap-1">
          {isPositive ? (
            <ArrowUpIcon className="size-2.5 text-positive-600" />
          ) : (
            <ArrowDownIcon className="size-2.5 text-negative-600" />
          )}
          <span
            className={cn(
              'text-[10px] font-medium',
              isPositive ? 'text-positive-600' : 'text-negative-600'
            )}
          >
            {Math.abs(change)}%
          </span>
          {changeLabel && (
            <span className="text-[10px] text-neutral-500">{changeLabel}</span>
          )}
        </div>
      )}
      {!hasChange && changeLabel && (
        <p className="mt-1 text-[10px] text-neutral-400">{changeLabel}</p>
      )}
    </div>
  );
};

interface DashboardMetricsProps {
  pendingL1: number;
  pendingL2: number;
  avgReviewTime: string;
  approvalRate: number;
  highRiskAlerts: number;
}

export const DashboardMetrics = ({
  pendingL1,
  pendingL2,
  avgReviewTime,
  approvalRate,
  highRiskAlerts,
}: DashboardMetricsProps) => {
  return (
    <div className="grid grid-cols-4 gap-px bg-neutral-200">
      <MetricCard
        label="Pending Reviews"
        value={pendingL1 + pendingL2}
        changeLabel={`${pendingL1} L1, ${pendingL2} L2`}
      />
      <MetricCard label="Avg Review Time" value={avgReviewTime} />
      <MetricCard
        label="Approval Rate"
        value={`${approvalRate}%`}
        change={2.3}
        valueClassName="text-positive-600"
      />
      <MetricCard
        label="High Risk Alerts"
        value={highRiskAlerts}
        change={-5}
        valueClassName={highRiskAlerts > 0 ? 'text-negative-600' : undefined}
      />
    </div>
  );
};
