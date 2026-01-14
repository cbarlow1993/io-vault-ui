import { createFileRoute } from '@tanstack/react-router';

import { PageSettingsTeamDetail } from '@/features/settings/page-settings-teams';

export const Route = createFileRoute('/_app/settings/teams/$teamId')({
  component: PageSettingsTeamDetail,
});
