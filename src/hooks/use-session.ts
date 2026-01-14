'use client';

import {
  useAuth,
  useOrganization,
  useOrganizationList,
  useUser,
} from '@clerk/tanstack-react-start';
import { useCallback, useEffect, useSyncExternalStore } from 'react';

import type { AuthSessionData, UseSessionResult } from '@/lib/auth/types';

import { envClient } from '@/env/client';

/**
 * Shared session state for better-auth mode.
 * Uses a simple store pattern for sharing state across components.
 */
let sessionCache: AuthSessionData | null = null;
let sessionError: Error | null = null;
let isPendingState = true;
const listeners = new Set<() => void>();
let fetchPromise: Promise<void> | null = null;

// Stable snapshot reference to prevent infinite re-renders
let snapshotCache: {
  data: AuthSessionData | null;
  isPending: boolean;
  error: Error | null;
} = {
  data: null,
  isPending: true,
  error: null,
};

function updateSnapshotCache() {
  snapshotCache = {
    data: sessionCache,
    isPending: isPendingState,
    error: sessionError,
  };
}

function notifyListeners() {
  updateSnapshotCache();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshotCache;
}

function getServerSnapshot() {
  return { data: null, isPending: true, error: null };
}

async function fetchSessionFromServer(): Promise<void> {
  if (fetchPromise) return fetchPromise;

  isPendingState = true;
  sessionError = null;
  notifyListeners();

  fetchPromise = (async () => {
    try {
      const response = await fetch('/api/auth/get-session', {
        credentials: 'include',
      });

      if (!response.ok) {
        sessionCache = null;
      } else {
        const data = await response.json();
        if (data.user && data.session) {
          sessionCache = {
            user: {
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
              image: data.user.image,
              emailVerified: data.user.emailVerified,
              role: data.user.role,
              organizationId: data.user.organizationId,
              organizationRole: data.user.organizationRole,
              onboardedAt: data.user.onboardedAt
                ? new Date(data.user.onboardedAt)
                : null,
              metadata: data.user.metadata,
            },
            session: {
              id: data.session.id,
              userId: data.session.userId,
              expiresAt: new Date(data.session.expiresAt),
              token: data.session.token,
            },
          };
        } else {
          sessionCache = null;
        }
      }
    } catch (error) {
      sessionError =
        error instanceof Error ? error : new Error('Failed to fetch session');
      sessionCache = null;
    } finally {
      isPendingState = false;
      fetchPromise = null;
      notifyListeners();
    }
  })();

  return fetchPromise;
}

/**
 * Hook for Clerk session.
 */
function useClerkSession(): UseSessionResult {
  const { isLoaded: authLoaded, userId, sessionId } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const { organization } = useOrganization();
  const { userMemberships } = useOrganizationList();

  const clerkPending = !authLoaded || !userLoaded;

  if (clerkPending || !userId || !user) {
    return {
      data: null,
      isPending: clerkPending,
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
 * Hook for better-auth session.
 */
function useBetterAuthSession(enabled: boolean): UseSessionResult {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Only fetch session when in better-auth mode
  useEffect(() => {
    if (enabled && sessionCache === null && !fetchPromise) {
      fetchSessionFromServer();
    }
  }, [enabled]);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    fetchPromise = null;
    await fetchSessionFromServer();
  }, [enabled]);

  return {
    data: state.data,
    isPending: state.isPending,
    error: state.error,
    refetch,
  };
}

/**
 * Hook for accessing the current auth session.
 * Works with both Clerk and better-auth providers based on VITE_AUTH_MODE.
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
  const authMode = envClient.VITE_AUTH_MODE;
  const isClerkMode = authMode === 'clerk';

  // Both hooks must be called unconditionally to satisfy React's rules of hooks.
  const clerkResult = useClerkSession();
  const betterAuthResult = useBetterAuthSession(!isClerkMode);

  if (isClerkMode) {
    return clerkResult;
  }

  return betterAuthResult;
}

/**
 * Reset the session cache. Useful after sign-out.
 */
export function clearSessionCache(): void {
  sessionCache = null;
  sessionError = null;
  isPendingState = true;
  fetchPromise = null;
  notifyListeners();
}
