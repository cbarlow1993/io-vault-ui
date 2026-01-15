import { createFileRoute } from '@tanstack/react-router';

import { PageSettingsBackups } from '@/features/settings/page-settings-backups';

export const Route = createFileRoute('/_app/global/backups')({
  component: PageSettingsBackups,
});
