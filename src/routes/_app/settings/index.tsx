import { createFileRoute, redirect } from '@tanstack/react-router';

import { envClient } from '@/env/client';

export const Route = createFileRoute('/_app/settings/')({
  beforeLoad: () => {
    throw redirect({
      to: envClient.VITE_ENABLE_CHARGEBEE_BILLING
        ? '/settings/billing'
        : '/settings/members',
    });
  },
});
