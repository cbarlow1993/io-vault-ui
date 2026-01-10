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
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h4 className="font-semibold text-neutral-900">Timeline</h4>
      <div className="mt-4 space-y-4">
        {events.map((event, index) => {
          const config = eventConfig[event.type];
          const Icon = config.icon;
          const isLast = index === events.length - 1;

          return (
            <div key={event.id} className="relative flex gap-3">
              {!isLast && (
                <div className="absolute top-6 left-[11px] h-full w-px bg-neutral-200" />
              )}
              <div
                className={cn(
                  'relative z-10 rounded-full bg-white p-1',
                  config.color
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 pb-4">
                <div className="text-sm text-neutral-900">
                  {config.label}
                  {event.actor && (
                    <span className="text-neutral-500"> by {event.actor}</span>
                  )}
                </div>
                {event.message && (
                  <div className="mt-1 text-sm text-neutral-600">
                    {event.message}
                  </div>
                )}
                <div className="mt-1 text-xs text-neutral-400">
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
