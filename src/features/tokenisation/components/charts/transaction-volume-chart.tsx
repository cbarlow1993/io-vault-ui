import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { TransactionVolumePoint } from '../../data/mock-data';

type Props = {
  data: TransactionVolumePoint[];
};

const formatDate = (date: string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export function TransactionVolumeChart({ data }: Props) {
  return (
    <div className="border-card p-4">
      <h4 className="mb-4 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
        Transaction Volume
      </h4>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
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
            tick={{ fontSize: 10, fill: '#737373' }}
            tickLine={false}
            axisLine={false}
            width={30}
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
            formatter={(value: number, name: string) => {
              const labels: Record<string, string> = {
                mints: 'Mints',
                burns: 'Burns',
                transfers: 'Transfers',
              };
              return [value, labels[name] || name];
            }}
          />
          <Bar
            dataKey="mints"
            stackId="a"
            fill="#22c55e"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="burns"
            stackId="a"
            fill="#ef4444"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="transfers"
            stackId="a"
            fill="#6b7280"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 bg-positive-500" />
          Mints
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 bg-negative-500" />
          Burns
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 bg-neutral-500" />
          Transfers
        </span>
      </div>
    </div>
  );
}
