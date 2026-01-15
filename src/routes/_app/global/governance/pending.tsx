import { createFileRoute } from '@tanstack/react-router';

import { PageSettingsGovernancePending } from '@/features/settings/page-settings-governance-pending';

export const Route = createFileRoute('/_app/global/governance/pending')({
  component: PageSettingsGovernancePending,
});
