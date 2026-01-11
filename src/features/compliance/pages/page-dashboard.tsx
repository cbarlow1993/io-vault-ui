import {
  NotificationButton,
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/treasury-6';

import { DashboardMetrics } from '../components/dashboard-metrics';
import { RecentActivity } from '../components/recent-activity';
import { RequiresAttention } from '../components/requires-attention';
import {
  mockDashboardMetrics,
  mockRecentActivities,
  mockAttentionItems,
} from '../data/mock-dashboard';

export const PageComplianceDashboard = () => {
  return (
    <PageLayout>
      <PageLayoutTopBar
        endActions={
          <div className="flex items-center gap-3">
            <NotificationButton />
          </div>
        }
      >
        <PageLayoutTopBarTitle>Compliance</PageLayoutTopBarTitle>
        <span className="text-xs text-neutral-400">
          Transaction monitoring & risk assessment
        </span>
      </PageLayoutTopBar>
      <PageLayoutContent containerClassName="py-4">
        <div className="space-y-4">
          <DashboardMetrics {...mockDashboardMetrics} />

          <div className="grid grid-cols-2 gap-4">
            <RecentActivity activities={mockRecentActivities} />
            <RequiresAttention items={mockAttentionItems} />
          </div>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
