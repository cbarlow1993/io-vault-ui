import { createFileRoute } from '@tanstack/react-router';

import { PageSettingsGovernance } from '@/features/settings/page-settings-governance';

export const Route = createFileRoute('/_app/settings/governance/')({
  component: PageSettingsGovernance,
});
