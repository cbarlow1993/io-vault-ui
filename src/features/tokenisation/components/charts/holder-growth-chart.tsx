import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { HolderGrowthPoint } from '../../data/mock-data';

type Props = {
  data: HolderGrowthPoint[];
};

const formatDate = (date: string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatYAxis = (value: number): string => {
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toString();
};

export function HolderGrowthChart({ data }: Props) {
  return (
    <div className="border-card p-4">
      <h4 className="mb-4 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
        Holder Growth
      </h4>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart
          data={data}
          margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
        >
          <defs>
            <linearGradient id="holderGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            width={40}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e5e5',
              borderRadius: 0,
              fontSize: 12,
            }}
            labelFormatter={formatDate}
            formatter={(value: number) => [value.toLocaleString(), 'Holders']}
          />
          <Area
            type="monotone"
            dataKey="holders"
            stroke="#0d9488"
            strokeWidth={2}
            fill="url(#holderGradient)"
            activeDot={{ r: 4, fill: '#0d9488' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
