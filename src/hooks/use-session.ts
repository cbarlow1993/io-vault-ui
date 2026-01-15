'use client';

import {
  useAuth,
  useOrganization,
  useOrganizationList,
  useUser,
} from '@clerk/tanstack-react-start';

import type { AuthSessionData, UseSessionResult } from '@/lib/auth/types';

/**
 * Hook for accessing the current auth session.
 * Uses Clerk for authentication.
 *
 * @example
 * function UserProfile() {
 *   const { data: session, isPending, error } = useSession();
 *
 *   if (isPending) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (!session) return <div>Not logged in</div>;
 *
 *   return <div>Hello, {session.user.name}</div>;
 * }
 */
export function useSession(): UseSessionResult {
  const { isLoaded: authLoaded, userId, sessionId } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const { organization } = useOrganization();
  const { userMemberships } = useOrganizationList();

  const isPending = !authLoaded || !userLoaded;

  if (isPending || !userId || !user) {
    return {
      data: null,
      isPending,
      error: null,
      refetch: async () => {},
    };
  }

  const currentMembership = userMemberships?.data?.find(
    (m) => m.organization.id === organization?.id
  );

  const sessionData: AuthSessionData = {
    user: {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress || '',
      name: user.fullName,
      image: user.imageUrl,
      emailVerified:
        user.emailAddresses.some(
          (e) => e.verification?.status === 'verified'
        ) ?? false,
      role: (user.publicMetadata?.role as 'user' | 'admin') || 'user',
      organizationId: organization?.id || null,
      organizationRole: currentMembership?.role || null,
      onboardedAt: user.publicMetadata?.onboardedAt
        ? new Date(user.publicMetadata.onboardedAt as string)
        : null,
      metadata: user.publicMetadata as Record<string, unknown>,
    },
    session: {
      id: sessionId || '',
      userId: user.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  };

  return {
    data: sessionData,
    isPending: false,
    error: null,
    refetch: async () => {},
  };
}

/**
 * Clear the session cache. No-op in Clerk mode since Clerk manages its own state.
 */
export function clearSessionCache(): void {
  // No-op: Clerk manages its own session state
}
