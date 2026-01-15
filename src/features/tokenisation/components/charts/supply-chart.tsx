import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { SupplyDataPoint } from '../../data/mock-data';

type Props = {
  data: SupplyDataPoint[];
};

const formatYAxis = (value: number): string => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toString();
};

const formatDate = (date: string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatTooltipValue = (value: number): string => {
  return value.toLocaleString();
};

export function SupplyChart({ data }: Props) {
  return (
    <div className="border-card p-4">
      <h4 className="mb-4 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
        Supply Over Time
      </h4>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5e5e5"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 10, fill: '#737373' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e5e5' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fontSize: 10, fill: '#737373' }}
            tickLine={false}
            axisLine={false}
            width={50}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e5e5',
              borderRadius: 0,
              fontSize: 12,
            }}
            labelFormatter={formatDate}
            formatter={(value: number, name: string) => [
              formatTooltipValue(value),
              name === 'totalSupply' ? 'Total Supply' : 'Circulating',
            ]}
          />
          <Line
            type="monotone"
            dataKey="totalSupply"
            stroke="#14b8a6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#14b8a6' }}
          />
          <Line
            type="monotone"
            dataKey="circulatingSupply"
            stroke="#99f6e4"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#99f6e4' }}
            strokeDasharray="4 4"
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-terminal-500" />
          Total Supply
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 border-b-2 border-dashed border-terminal-300" />
          Circulating
        </span>
      </div>
    </div>
  );
}
