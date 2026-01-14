import { createFileRoute, redirect } from '@tanstack/react-router';
import { auth } from '@clerk/tanstack-react-start/server';

import { envClient } from '@/env/client';
import { PageSettingsBilling } from '@/features/settings/page-settings-billing';
import { ChargebeeProvider } from '@/lib/chargebee';

function BillingPageWithProvider() {
  return (
    <ChargebeeProvider>
      <PageSettingsBilling />
    </ChargebeeProvider>
  );
}

export const Route = createFileRoute('/_app/settings/billing')({
  beforeLoad: ({ context }) => {
    console.log('context', context);

    if (!envClient.VITE_ENABLE_CHARGEBEE_BILLING) {
      throw redirect({ to: '/settings/members' });
    }
  },
  component: BillingPageWithProvider,
  loader: async ({ context }) => {
    console.log('context', context);
    console.log('bahh');
    const { isAuthenticated, userId } = await auth();
    console.log('isAuthenticated', isAuthenticated);
    console.log('userId', userId);
  },
});
