import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

interface MetricCardProps {
  label: string;
  value: number | string;
  change?: number;
  changeLabel?: string;
}

const MetricCard = ({ label, value, change, changeLabel }: MetricCardProps) => {
  const isPositive = change !== undefined && change >= 0;
  const hasChange = change !== undefined;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="text-sm font-medium text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-neutral-900">
        {value}
      </div>
      {hasChange && (
        <div className="mt-1 flex items-center gap-1">
          {isPositive ? (
            <ArrowUpIcon className="h-3 w-3 text-positive-600" />
          ) : (
            <ArrowDownIcon className="h-3 w-3 text-negative-600" />
          )}
          <span
            className={cn(
              'text-xs font-medium',
              isPositive ? 'text-positive-600' : 'text-negative-600'
            )}
          >
            {Math.abs(change)}%
          </span>
          {changeLabel && (
            <span className="text-xs text-neutral-500">{changeLabel}</span>
          )}
        </div>
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
    <div className="grid grid-cols-4 gap-4">
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
      />
      <MetricCard label="High Risk Alerts" value={highRiskAlerts} change={-5} />
    </div>
  );
};
