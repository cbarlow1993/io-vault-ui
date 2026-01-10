import { createFileRoute } from '@tanstack/react-router';

import { PageSettingsGovernancePending } from '@/features/treasury-6-demo/page-settings-governance-pending';

export const Route = createFileRoute('/_app/settings/governance/pending')({
  component: PageSettingsGovernancePending,
});
