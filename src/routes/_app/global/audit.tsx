import { createFileRoute } from '@tanstack/react-router';

import { PageSettingsAudit } from '@/features/settings/page-settings-audit';

export const Route = createFileRoute('/_app/global/audit')({
  component: PageSettingsAudit,
});
