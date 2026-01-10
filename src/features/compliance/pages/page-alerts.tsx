import { Link } from '@tanstack/react-router';
import { BellIcon, BellRingIcon, SettingsIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/treasury-6';

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

export const PageComplianceAlerts = () => {
  const unreadCount = mockAlerts.filter((a) => !a.isRead).length;

  return (
    <PageLayout>
      <PageLayoutTopBar>
        <PageLayoutTopBarTitle>
          <div className="flex items-center gap-2">
            <Link to="/" className="text-neutral-500 hover:text-neutral-700">
              Compliance
            </Link>
            <span className="text-neutral-400">/</span>
            <span>Alerts</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-negative-100 px-2 py-0.5 text-xs font-medium text-negative-700">
                {unreadCount} new
              </span>
            )}
          </div>
        </PageLayoutTopBarTitle>
      </PageLayoutTopBar>
      <PageLayoutContent>
        <div className="space-y-6">
          {/* Alert Settings */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm">
                All Alerts
              </Button>
              <Button variant="ghost" size="sm">
                Unread
              </Button>
              <Button variant="ghost" size="sm">
                High Risk
              </Button>
              <Button variant="ghost" size="sm">
                Sanctions
              </Button>
            </div>
            <Button variant="secondary" size="sm">
              <SettingsIcon className="mr-2 h-4 w-4" />
              Alert Settings
            </Button>
          </div>

          {/* Alerts List */}
          <div className="space-y-3">
            {mockAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg border bg-white p-4 ${
                  alert.isRead
                    ? 'border-neutral-200'
                    : 'border-brand-200 bg-brand-50/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={`rounded-full p-2 ${
                        alert.isRead
                          ? 'bg-neutral-100 text-neutral-500'
                          : 'bg-brand-100 text-brand-600'
                      }`}
                    >
                      {alert.isRead ? (
                        <BellIcon className="h-4 w-4" />
                      ) : (
                        <BellRingIcon className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-900">
                          {alert.title}
                        </span>
                        <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                          {alertTypeLabels[alert.type]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-neutral-600">
                        {alert.description}
                      </p>
                      <p className="mt-2 text-xs text-neutral-400">
                        {alert.timestamp.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <RiskBadge level={alert.riskLevel} />
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {mockAlerts.length === 0 && (
            <div className="rounded-lg border border-neutral-200 bg-white py-12 text-center">
              <BellIcon className="mx-auto h-12 w-12 text-neutral-300" />
              <p className="mt-2 text-neutral-500">No alerts</p>
              <p className="text-sm text-neutral-400">
                You&apos;re all caught up!
              </p>
            </div>
          )}
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
