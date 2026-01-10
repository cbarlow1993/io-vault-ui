import { createFileRoute } from '@tanstack/react-router';

import { PageSettingsTeams } from '@/features/treasury-6-demo/page-settings-teams';

export const Route = createFileRoute('/_app/settings/teams/')({
  component: PageSettingsTeams,
});
