import { createFileRoute } from '@tanstack/react-router';

import { PageComplianceDashboard } from '@/features/compliance/pages/page-dashboard';

export const Route = createFileRoute('/_app/compliance/')({
  component: PageComplianceDashboard,
});
