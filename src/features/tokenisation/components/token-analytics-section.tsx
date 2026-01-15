import { useMemo, useState } from 'react';

import { cn } from '@/lib/tailwind/utils';

import { HolderGrowthChart } from './charts/holder-growth-chart';
import { SupplyChart } from './charts/supply-chart';
import { TransactionVolumeChart } from './charts/transaction-volume-chart';
import { generateTokenAnalytics } from '../data/mock-data';

type Props = {
  tokenId: string;
};

type TimeRange = '30d' | '90d' | 'all';

const TIME_RANGES: { id: TimeRange; label: string }[] = [
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: 'all', label: 'All' },
];

const getDaysToShow = (range: TimeRange, totalDays: number): number => {
  if (range === '30d') return 30;
  if (range === '90d') return 90;
  return totalDays;
};

export function TokenAnalyticsSection({ tokenId }: Props) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const analytics = useMemo(() => generateTokenAnalytics(tokenId), [tokenId]);

  const filteredData = useMemo(() => {
    const daysToShow = getDaysToShow(timeRange, analytics.supplyHistory.length);

    return {
      supplyHistory: analytics.supplyHistory.slice(-daysToShow),
      transactionVolume: analytics.transactionVolume.slice(-daysToShow),
      holderGrowth: analytics.holderGrowth.slice(-daysToShow),
    };
  }, [analytics, timeRange]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
          Analytics
        </h3>
        <div className="flex">
          {TIME_RANGES.map((range) => (
            <button
              key={range.id}
              type="button"
              onClick={() => setTimeRange(range.id)}
              className={cn(
                'border px-3 py-1 text-xs font-medium transition-colors',
                timeRange === range.id
                  ? 'border-terminal-300 bg-terminal-50 text-terminal-700'
                  : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 hover:text-neutral-700',
                range.id === '30d' && 'rounded-l',
                range.id === 'all' && 'rounded-r',
                range.id !== '30d' && '-ml-px'
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <SupplyChart data={filteredData.supplyHistory} />
        <TransactionVolumeChart data={filteredData.transactionVolume} />
      </div>

      <HolderGrowthChart data={filteredData.holderGrowth} />
    </div>
  );
}
