import { createFileRoute } from '@tanstack/react-router';

import { PageSettingsMembers } from '@/features/treasury-6-demo/page-settings-members';

export const Route = createFileRoute('/_app/settings/members')({
  component: PageSettingsMembers,
});
