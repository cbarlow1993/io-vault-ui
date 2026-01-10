import { createFileRoute } from '@tanstack/react-router';

import { PageComplianceReports } from '@/features/compliance/pages/page-reports';

export const Route = createFileRoute('/_app/compliance/reports')({
  component: PageComplianceReports,
});
