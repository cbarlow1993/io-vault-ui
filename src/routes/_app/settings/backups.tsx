import { createFileRoute } from '@tanstack/react-router';

import { PageSettingsBackups } from '@/features/treasury-6-demo/page-settings-backups';

export const Route = createFileRoute('/_app/settings/backups')({
  component: PageSettingsBackups,
});
