import { createFileRoute, redirect } from '@tanstack/react-router';

import { envClient } from '@/env/client';
import { PageSettingsBilling } from '@/features/settings/page-settings-billing';

export const Route = createFileRoute('/_app/settings/billing')({
  beforeLoad: () => {
    if (!envClient.VITE_ENABLE_CHARGEBEE_BILLING) {
      throw redirect({ to: '/settings/members' });
    }
  },
  component: PageSettingsBilling,
});
