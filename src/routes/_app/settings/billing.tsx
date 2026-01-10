import { createFileRoute } from '@tanstack/react-router';

import { PageSettingsBilling } from '@/features/treasury-6-demo/page-settings-billing';

export const Route = createFileRoute('/_app/settings/billing')({
  component: PageSettingsBilling,
});
