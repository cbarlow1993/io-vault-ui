import { Link } from '@tanstack/react-router';
import { BellIcon, BellRingIcon, SettingsIcon } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/tailwind/utils';

import {
  NotificationButton,
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/shell';

import { RiskBadge } from '../components/risk-badge';

interface Alert {
  id: string;
  type:
    | 'high_risk_transaction'
    | 'watchlist_activity'
    | 'sanctions_match'
    | 'threshold_exceeded';
  title: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'severe';
  timestamp: Date;
  isRead: boolean;
}

const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'high_risk_transaction',
    title: 'High Risk Transaction Detected',
    description: 'Transaction 0x1a2b3c... flagged with risk score 85/100',
    riskLevel: 'high',
    timestamp: new Date(Date.now() - 1800000),
    isRead: false,
  },
  {
    id: '2',
    type: 'watchlist_activity',
    title: 'Watchlist Address Activity',
    description: 'Address 0x9876... received incoming transaction',
    riskLevel: 'medium',
    timestamp: new Date(Date.now() - 3600000),
    isRead: false,
  },
  {
    id: '3',
    type: 'sanctions_match',
    title: 'Potential Sanctions Match',
    description: 'Address 0xfedc... matched OFAC sanctions list',
    riskLevel: 'severe',
    timestamp: new Date(Date.now() - 7200000),
    isRead: true,
  },
  {
    id: '4',
    type: 'threshold_exceeded',
    title: 'Daily Threshold Exceeded',
    description: 'Outgoing transactions exceeded $100,000 daily limit',
    riskLevel: 'medium',
    timestamp: new Date(Date.now() - 86400000),
    isRead: true,
  },
];

const alertTypeLabels: Record<Alert['type'], string> = {
  high_risk_transaction: 'High Risk',
  watchlist_activity: 'Watchlist',
  sanctions_match: 'Sanctions',
  threshold_exceeded: 'Threshold',
};

type FilterType = 'all' | 'unread' | 'high_risk' | 'sanctions';

export const PageComplianceAlerts = () => {
  const [filter, setFilter] = useState<FilterType>('all');
  const unreadCount = mockAlerts.filter((a) => !a.isRead).length;

  const filteredAlerts = mockAlerts.filter((alert) => {
    if (filter === 'unread') return !alert.isRead;
    if (filter === 'high_risk') return alert.type === 'high_risk_transaction';
    if (filter === 'sanctions') return alert.type === 'sanctions_match';
    return true;
  });

  return (
    <PageLayout>
      <PageLayoutTopBar
        endActions={
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex h-7 items-center gap-1.5 border border-neutral-200 bg-neutral-50 px-2 text-xs text-neutral-600 hover:bg-neutral-100"
            >
              <SettingsIcon className="size-3.5" />
              Settings
            </button>
            <div className="h-4 w-px bg-neutral-200" />
            <NotificationButton />
          </div>
        }
      >
        <PageLayoutTopBarTitle>
          <div className="flex items-center gap-2">
            <Link
              to="/compliance"
              className="text-neutral-500 hover:text-neutral-700"
            >
              Compliance
            </Link>
            <span className="text-neutral-400">/</span>
            <span>Alerts</span>
            {unreadCount > 0 && (
              <span className="rounded bg-negative-100 px-1.5 py-0.5 text-[10px] font-medium text-negative-700">
                {unreadCount} new
              </span>
            )}
          </div>
        </PageLayoutTopBarTitle>
      </PageLayoutTopBar>
      <PageLayoutContent containerClassName="py-4">
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center justify-between border border-neutral-200 bg-white px-3 py-2">
            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'all', label: 'All Alerts' },
                  { id: 'unread', label: 'Unread' },
                  { id: 'high_risk', label: 'High Risk' },
                  { id: 'sanctions', label: 'Sanctions' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={cn(
                    'h-7 px-2 text-xs font-medium',
                    filter === item.id
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-neutral-500">
              {filteredAlerts.length}{' '}
              {filteredAlerts.length === 1 ? 'alert' : 'alerts'}
            </span>
          </div>

          {/* Alerts List */}
          <div className="border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-3 py-2">
              <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                Alerts
              </h2>
            </div>
            <div className="divide-y divide-neutral-100">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    'flex items-start justify-between px-3 py-3',
                    !alert.isRead && 'bg-brand-50/50'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'p-1.5',
                        alert.isRead
                          ? 'bg-neutral-100 text-neutral-500'
                          : 'bg-brand-100 text-brand-600'
                      )}
                    >
                      {alert.isRead ? (
                        <BellIcon className="size-3.5" />
                      ) : (
                        <BellRingIcon className="size-3.5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-neutral-900">
                          {alert.title}
                        </span>
                        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">
                          {alertTypeLabels[alert.type]}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-neutral-600">
                        {alert.description}
                      </p>
                      <p className="mt-1 text-[10px] text-neutral-400 tabular-nums">
                        {alert.timestamp.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <RiskBadge level={alert.riskLevel} />
                </div>
              ))}
            </div>
          </div>

          {/* Empty State */}
          {filteredAlerts.length === 0 && (
            <div className="border border-neutral-200 bg-white py-12 text-center">
              <BellIcon className="mx-auto size-8 text-neutral-300" />
              <p className="mt-2 text-xs text-neutral-500">No alerts</p>
              <p className="text-[10px] text-neutral-400">
                You&apos;re all caught up!
              </p>
            </div>
          )}
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
