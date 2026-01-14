import { ReactNode } from 'react';

import { useSession } from '@/hooks/use-session';

import { authClient } from '@/features/auth/client';
import { Permission, Role } from '@/features/auth/permissions';

export const WithPermissions = (props: {
  permissions: Permission[];
  children?: ReactNode;
  loadingFallback?: ReactNode;
  fallback?: ReactNode;
}) => {
  const { data: session, isPending } = useSession();
  const userRole = session?.user.role;

  if (isPending) {
    return props.loadingFallback ?? props.fallback ?? null;
  }

  if (
    !userRole ||
    props.permissions.every(
      (permission) =>
        !authClient.admin.checkRolePermission({
          role: userRole as Role,
          permission: permission,
        })
    )
  ) {
    return props.fallback ?? null;
  }

  return props.children;
};
