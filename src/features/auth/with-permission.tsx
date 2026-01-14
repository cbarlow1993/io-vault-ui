import { ReactNode } from 'react';

import { useSession } from '@/hooks/use-session';

import {
  checkRolePermission,
  type Permission,
  type Role,
} from '@/lib/auth/permissions';

export const WithPermissions = (props: {
  permissions: Permission[];
  children?: ReactNode;
  loadingFallback?: ReactNode;
  fallback?: ReactNode;
}) => {
  const { data: session, isPending } = useSession();
  const userRole = session?.user.role as Role | undefined;

  if (isPending) {
    return props.loadingFallback ?? props.fallback ?? null;
  }

  if (
    !userRole ||
    props.permissions.every(
      (permission) => !checkRolePermission(userRole, permission)
    )
  ) {
    return props.fallback ?? null;
  }

  return props.children;
};
