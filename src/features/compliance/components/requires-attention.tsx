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
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-neutral-900">
          Requires Attention
        </h3>
      </div>
      <div className="divide-y divide-neutral-100">
        {items.map((item) => (
          <Link
            key={item.id}
            to="/compliance/transactions/$id"
            params={{ id: item.id }}
            className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-neutral-900">
                  {item.transactionHash.slice(0, 10)}...
                </span>
                {item.isAutoEscalated && (
                  <AlertTriangleIcon className="h-3.5 w-3.5 text-warning-500" />
                )}
              </div>
              <div className="text-xs text-neutral-500">
                {item.amount} {item.token}
              </div>
            </div>
            <RiskBadge level={item.riskLevel} />
            <div className="flex items-center gap-1 text-xs text-neutral-500">
              <ClockIcon className="h-3 w-3" />
              {item.waitingTime}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
