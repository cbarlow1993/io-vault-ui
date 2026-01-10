import { createFileRoute } from '@tanstack/react-router';

import { PageSettingsAudit } from '@/features/treasury-6-demo/page-settings-audit';

export const Route = createFileRoute('/_app/settings/audit')({
  component: PageSettingsAudit,
});
