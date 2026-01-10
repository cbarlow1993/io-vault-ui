import {
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
      <PageLayoutTopBar>
        <PageLayoutTopBarTitle>Compliance</PageLayoutTopBarTitle>
      </PageLayoutTopBar>
      <PageLayoutContent>
        <div className="space-y-6">
          <DashboardMetrics {...mockDashboardMetrics} />

          <div className="grid grid-cols-2 gap-6">
            <RecentActivity activities={mockRecentActivities} />
            <RequiresAttention items={mockAttentionItems} />
          </div>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
