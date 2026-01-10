import { createFileRoute } from '@tanstack/react-router';

import { PageSettingsTeamDetail } from '@/features/treasury-6-demo/page-settings-teams';

export const Route = createFileRoute('/_app/settings/teams/$teamId')({
  component: PageSettingsTeamDetail,
});
