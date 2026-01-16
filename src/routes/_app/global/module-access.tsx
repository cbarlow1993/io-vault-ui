import { createFileRoute } from '@tanstack/react-router';

import { PageSettingsModuleAccess } from '@/features/settings/page-settings-module-access';

export const Route = createFileRoute('/_app/global/module-access')({
  component: PageSettingsModuleAccess,
});
