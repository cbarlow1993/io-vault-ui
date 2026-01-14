import { createFileRoute } from '@tanstack/react-router';

import { PageSettingsTeams } from '@/features/settings/page-settings-teams';

export const Route = createFileRoute('/_app/settings/teams/')({
  component: PageSettingsTeams,
});
