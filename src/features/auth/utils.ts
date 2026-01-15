import { useRouter, useSearch } from '@tanstack/react-router';
import { useEffect } from 'react';

import { useSession } from '@/hooks/use-session';

export const useRedirectAfterLogin = () => {
  const search = useSearch({ strict: false });
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const searchRedirect = search.redirect;

  useEffect(() => {
    const runRedirect = () => {
      if (isPending || !session) {
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
        to: '/treasury/overview',
      });
    };

    runRedirect();
  }, [searchRedirect, isPending, session, router]);
};
