import { createFileRoute } from '@tanstack/react-router';

import { PageSettingsRoles } from '@/features/treasury-6-demo/page-settings-roles';

export const Route = createFileRoute('/_app/settings/roles')({
  component: PageSettingsRoles,
});
