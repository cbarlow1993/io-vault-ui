import { createFileRoute } from '@tanstack/react-router';

import { PageSettingsTeams } from '@/features/settings/page-settings-teams';

export const Route = createFileRoute('/_app/global/teams/')({
  component: PageSettingsTeams,
});
