import { Link } from '@tanstack/react-router';
import { AlertTriangleIcon, ClockIcon } from 'lucide-react';

import { type RiskLevel } from '@/features/compliance';

import { RiskBadge } from './risk-badge';

interface AttentionItem {
  id: string;
  transactionHash: string;
  amount: string;
  token: string;
  riskLevel: RiskLevel;
  waitingTime: string;
  isAutoEscalated: boolean;
}

interface RequiresAttentionProps {
  items: AttentionItem[];
}

export const RequiresAttention = ({ items }: RequiresAttentionProps) => {
  return (
    <div className="border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-3 py-2">
        <h3 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
          Requires Attention
        </h3>
      </div>
      <div className="divide-y divide-neutral-100">
        {items.map((item) => (
          <Link
            key={item.id}
            to="/compliance/transactions/$id"
            params={{ id: item.id }}
            className="flex items-center gap-3 px-3 py-2 hover:bg-neutral-50"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-neutral-900">
                  {item.transactionHash.slice(0, 10)}...
                </span>
                {item.isAutoEscalated && (
                  <AlertTriangleIcon className="size-3.5 text-warning-500" />
                )}
              </div>
              <div className="text-[10px] text-neutral-500 tabular-nums">
                {item.amount} {item.token}
              </div>
            </div>
            <RiskBadge level={item.riskLevel} />
            <div className="flex items-center gap-1 text-[10px] text-neutral-500 tabular-nums">
              <ClockIcon className="size-3" />
              {item.waitingTime}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
