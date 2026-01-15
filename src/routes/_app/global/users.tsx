import { createFileRoute } from '@tanstack/react-router';

import { PageSettingsMembers } from '@/features/settings/page-settings-members';

export const Route = createFileRoute('/_app/global/users')({
  component: PageSettingsMembers,
});
