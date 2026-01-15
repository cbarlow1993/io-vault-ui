import { createFileRoute } from '@tanstack/react-router';

import { PageSettingsWorkspaces } from '@/features/settings/page-settings-workspaces';

export const Route = createFileRoute('/_app/settings/workspaces')({
  component: PageSettingsWorkspaces,
});
