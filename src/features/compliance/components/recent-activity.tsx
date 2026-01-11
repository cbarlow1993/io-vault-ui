import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowUpIcon,
  MessageSquareIcon,
} from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

type ActivityType = 'approved' | 'rejected' | 'escalated' | 'note_added';

interface Activity {
  id: string;
  type: ActivityType;
  transactionHash: string;
  actor: string;
  timestamp: Date;
}

interface RecentActivityProps {
  activities: Activity[];
}

const activityConfig: Record<
  ActivityType,
  { icon: typeof CheckCircleIcon; label: string; color: string }
> = {
  approved: {
    icon: CheckCircleIcon,
    label: 'Approved',
    color: 'text-positive-600',
  },
  rejected: {
    icon: XCircleIcon,
    label: 'Rejected',
    color: 'text-negative-600',
  },
  escalated: {
    icon: ArrowUpIcon,
    label: 'Escalated',
    color: 'text-warning-600',
  },
  note_added: {
    icon: MessageSquareIcon,
    label: 'Note Added',
    color: 'text-neutral-600',
  },
};

export const RecentActivity = ({ activities }: RecentActivityProps) => {
  return (
    <div className="border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-3 py-2">
        <h3 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
          Recent Activity
        </h3>
      </div>
      <div className="divide-y divide-neutral-100">
        {activities.map((activity) => {
          const config = activityConfig[activity.type];
          const Icon = config.icon;
          return (
            <div
              key={activity.id}
              className="flex items-center gap-3 px-3 py-2"
            >
              <Icon className={cn('size-3.5', config.color)} />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-neutral-900">
                  <span className="font-medium">{activity.actor}</span>{' '}
                  <span className="text-neutral-500">
                    {config.label.toLowerCase()}
                  </span>{' '}
                  <span className="font-mono text-[10px]">
                    {activity.transactionHash.slice(0, 10)}...
                  </span>
                </div>
              </div>
              <div className="text-[10px] text-neutral-500 tabular-nums">
                {activity.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
