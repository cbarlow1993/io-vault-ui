import { Activity, ReactNode } from 'react';

import { useSession } from '@/hooks/use-session';

import { PageError } from '@/components/errors/page-error';
import { Spinner } from '@/components/ui/spinner';

import { useRedirectAfterLogin } from '@/features/auth/utils';

export const GuardPublicOnly = ({ children }: { children?: ReactNode }) => {
  const { isPending, error } = useSession();
  useRedirectAfterLogin();

  if (error) {
    return <PageError type="unknown-auth-error" />;
  }

  return (
    <>
      {isPending && <Spinner full />}
      <Activity mode={isPending ? 'hidden' : 'visible'}>{children}</Activity>
    </>
  );
};
