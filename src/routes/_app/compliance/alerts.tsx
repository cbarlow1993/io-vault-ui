import { createFileRoute } from '@tanstack/react-router';

import { PageComplianceAlerts } from '@/features/compliance/pages/page-alerts';

export const Route = createFileRoute('/_app/compliance/alerts')({
  component: PageComplianceAlerts,
});
