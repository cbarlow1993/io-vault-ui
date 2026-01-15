import { createFileRoute } from '@tanstack/react-router';

import { PageSettingsRoles } from '@/features/settings/page-settings-roles';

export const Route = createFileRoute('/_app/global/roles')({
  component: PageSettingsRoles,
});
