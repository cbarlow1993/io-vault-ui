import {
  CheckCircleIcon,
  ClockIcon,
  MessageSquareIcon,
  ArrowUpIcon,
  XCircleIcon,
} from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

type TimelineEventType =
  | 'submitted'
  | 'claimed'
  | 'note'
  | 'escalated'
  | 'approved'
  | 'rejected';

interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  actor?: string;
  message?: string;
  timestamp: Date;
}

interface TransactionTimelineProps {
  events: TimelineEvent[];
}

const eventConfig: Record<
  TimelineEventType,
  { icon: typeof ClockIcon; color: string; label: string }
> = {
  submitted: {
    icon: ClockIcon,
    color: 'text-neutral-500',
    label: 'Submitted for review',
  },
  claimed: {
    icon: CheckCircleIcon,
    color: 'text-brand-600',
    label: 'Claimed for review',
  },
  note: {
    icon: MessageSquareIcon,
    color: 'text-neutral-600',
    label: 'Note added',
  },
  escalated: {
    icon: ArrowUpIcon,
    color: 'text-warning-600',
    label: 'Escalated to L2',
  },
  approved: {
    icon: CheckCircleIcon,
    color: 'text-positive-600',
    label: 'Approved',
  },
  rejected: {
    icon: XCircleIcon,
    color: 'text-negative-600',
    label: 'Rejected',
  },
};

export const TransactionTimeline = ({ events }: TransactionTimelineProps) => {
  return (
    <div className="border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-3 py-2">
        <h4 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
          Timeline
        </h4>
      </div>
      <div className="space-y-3 p-3">
        {events.map((event, index) => {
          const config = eventConfig[event.type];
          const Icon = config.icon;
          const isLast = index === events.length - 1;

          return (
            <div key={event.id} className="relative flex gap-2">
              {!isLast && (
                <div className="absolute top-5 left-[9px] h-full w-px bg-neutral-200" />
              )}
              <div className={cn('relative z-10 bg-white p-0.5', config.color)}>
                <Icon className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1 pb-3">
                <div className="text-xs text-neutral-900">
                  {config.label}
                  {event.actor && (
                    <span className="text-neutral-500"> by {event.actor}</span>
                  )}
                </div>
                {event.message && (
                  <div className="mt-0.5 text-xs text-neutral-600">
                    {event.message}
                  </div>
                )}
                <div className="mt-0.5 text-[10px] text-neutral-400 tabular-nums">
                  {event.timestamp.toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
