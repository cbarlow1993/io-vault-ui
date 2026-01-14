import { useRouter } from '@tanstack/react-router';
import { ReactNode } from 'react';

import { useSession } from '@/hooks/use-session';

import { PageError } from '@/components/errors/page-error';
import { Spinner } from '@/components/ui/spinner';

import { authClient } from '@/features/auth/client';
import { Permission, Role } from '@/features/auth/permissions';

export const GuardAuthenticated = ({
  children,
  permissionApps,
}: {
  children?: ReactNode;
  permissionApps?: Permission['apps'];
}) => {
  const { data: session, isPending, error } = useSession();
  const router = useRouter();

  if (isPending) {
    return <Spinner full className="opacity-60" />;
  }

  if (error) {
    return <PageError type="unknown-auth-error" />;
  }

  if (!session?.user) {
    router.navigate({
      to: '/login',
      replace: true,
      search: {
        redirect: location.href,
      },
    });
    return null;
  }

  // Note: Onboarding is now handled via the onboarding checklist on /overview
  // Users can access the app even if not fully onboarded

  // Unauthorized if the user permission do not match
  if (
    permissionApps &&
    !authClient.admin.checkRolePermission({
      role: session.user.role as Role,
      permission: {
        apps: permissionApps,
      },
    })
  ) {
    return <PageError type="403" />;
  }

  return <>{children}</>;
};
