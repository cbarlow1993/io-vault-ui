import { auth } from '@clerk/tanstack-react-start/server';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';

import { ChargebeeProvider } from '@/lib/chargebee';

import { envClient } from '@/env/client';
import { PageSettingsBilling } from '@/features/settings/page-settings-billing';

// Server function to get auth state - auth() only works server-side
const getAuthState = createServerFn({ method: 'GET' }).handler(async () => {
  const { userId } = await auth();
  return { userId, isAuthenticated: !!userId };
});

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
  loader: async () => {
    const { isAuthenticated, userId } = await getAuthState();
    console.log('isAuthenticated', isAuthenticated);
    console.log('userId', userId);
  },
});
