import { useRouter, useSearch } from '@tanstack/react-router';
import { useEffect } from 'react';

import { authClient } from '@/features/auth/client';

export const useRedirectAfterLogin = () => {
  const search = useSearch({ strict: false });
  const router = useRouter();
  const session = authClient.useSession();
  const searchRedirect = search.redirect;

  useEffect(() => {
    const exec = () => {
      if (session.isPending || !session.data) {
        return;
      }

      if (searchRedirect) {
        const redirectUrl = new URL(searchRedirect);
        router.navigate({
          replace: true,
          to: redirectUrl.pathname,
          search: Object.fromEntries(redirectUrl.searchParams),
        });
        return;
      }

      // All authenticated users go to overview
      router.navigate({
        replace: true,
        to: '/overview',
      });
    };

    exec();
  }, [searchRedirect, session.isPending, session.data, router]);
};
